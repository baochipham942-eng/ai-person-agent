import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

const ROOT = process.cwd();
const DEFAULT_INPUT = 'docs/audit-2026-06/data/aihot_candidate_review_worklist.json';
const inputPath = process.argv.find((arg) => arg.startsWith('--input='))?.slice('--input='.length) || DEFAULT_INPUT;
const CHECK_DB = process.argv.includes('--check-db');

const VALID_QUEUES = ['new_organization', 'alias_merge', 'new_person_candidate', 'person_deferred'];
const DISALLOWED_READY_STATUSES = new Set(['ready', 'seed_ready', 'importable', 'approved_for_import']);
const DISALLOWED_STRONG_SOURCE_KINDS = new Set(['x', 'twitter', 'linkedin', 'media', 'media_rewrite', 'aggregator', 'search_page', 'profile_shell']);
const failures = [];

function addFailure(message) {
  failures.push(message);
}

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value || '').trim();
}

function normalizeUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    if (parsed.pathname !== '/') parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    parsed.searchParams.sort();
    return parsed.toString();
  } catch {
    return String(url || '').trim();
  }
}

function rowLabel(row) {
  return row.id || `${row.bucket || 'row'}:${row.name || row.canonicalName || '(unnamed)'}`;
}

function hasValue(value) {
  return Array.isArray(value) ? value.length > 0 : Boolean(text(value));
}

function checkCommon(row, queueName) {
  const label = rowLabel(row);
  if (row.bucket !== queueName) addFailure(`${label}: bucket ${row.bucket || '(missing)'} does not match queue ${queueName}`);
  if (!text(row.reviewStatus)) addFailure(`${label}: reviewStatus is required`);
  if (DISALLOWED_READY_STATUSES.has(text(row.reviewStatus).toLowerCase())) addFailure(`${label}: reviewStatus must not be ${row.reviewStatus}`);
  if (row.importableSeed !== false) addFailure(`${label}: importableSeed must be false`);
  if (!row.evidence?.url) addFailure(`${label}: evidence.url is required`);
  if (!row.evidence?.category) addFailure(`${label}: evidence.category is required`);
  if (!row.evidence?.sourceName) addFailure(`${label}: evidence.sourceName is required`);
  if (!row.evidence?.sourceKind) addFailure(`${label}: evidence.sourceKind is required`);
  if (!row.dbMatches) addFailure(`${label}: dbMatches is required`);
  if (!text(row.duplicateOrAliasDecision)) addFailure(`${label}: duplicateOrAliasDecision is required`);
  if (!text(row.filterReason)) addFailure(`${label}: filterReason is required`);
  if (!text(row.recommendedAction)) addFailure(`${label}: recommendedAction is required`);
}

function checkNewOrganization(row) {
  for (const field of ['name', 'canonicalName']) {
    if (!hasValue(row[field])) addFailure(`${rowLabel(row)}: ${field} is required`);
  }
  if (row.dbMatches?.exactOrganizationMatch) {
    addFailure(`${rowLabel(row)}: exactOrganizationMatch present; should not be new_organization`);
  }
}

function checkAliasMerge(row) {
  if (!hasValue(row.canonicalName)) addFailure(`${rowLabel(row)}: canonicalName is required`);
  if (list(row.aliases).length === 0) addFailure(`${rowLabel(row)}: aliases are required`);
  if (!row.dbMatches?.matchedCanonicalOrganization?.id) {
    addFailure(`${rowLabel(row)}: matchedCanonicalOrganization.id is required`);
  }
}

function checkNewPersonCandidate(row) {
  for (const field of ['name', 'roleCategory', 'organization', 'currentTitle', 'strongSource']) {
    if (!hasValue(row[field])) addFailure(`${rowLabel(row)}: ${field} is required`);
  }
  const kind = text(row.strongSource?.kind).toLowerCase();
  if (DISALLOWED_STRONG_SOURCE_KINDS.has(kind)) addFailure(`${rowLabel(row)}: strongSource.kind cannot be ${row.strongSource.kind}`);
  if (text(row.strongSource?.sourceStrength).toLowerCase() !== 'strong') addFailure(`${rowLabel(row)}: strongSource.sourceStrength must be strong`);
  if (list(row.blockers).length > 0) addFailure(`${rowLabel(row)}: new_person_candidate cannot have blockers`);
}

function checkPersonDeferred(row) {
  if (!hasValue(row.name)) addFailure(`${rowLabel(row)}: name is required`);
  if (list(row.blockers).length === 0) addFailure(`${rowLabel(row)}: blockers are required`);
}

async function loadDbSamples(urls, canonicalOrgIds, newOrgNames) {
  if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
  const sql = neon(process.env.DATABASE_URL);
  const [urlRows, aliasRows, newOrgRows] = await Promise.all([
    urls.length === 0
      ? []
      : sql`
        SELECT 'RawPoolItem' AS table_name, url FROM "RawPoolItem" WHERE url = ANY(${urls}::text[])
        UNION ALL SELECT 'ActivityEvent' AS table_name, url FROM "ActivityEvent" WHERE url = ANY(${urls}::text[])
        UNION ALL SELECT 'Card' AS table_name, "sourceUrl" AS url FROM "Card" WHERE "sourceUrl" = ANY(${urls}::text[])
        UNION ALL SELECT 'QAAuditLog' AS table_name, url FROM "QAAuditLog" WHERE url = ANY(${urls}::text[])
      `,
    canonicalOrgIds.length === 0
      ? []
      : sql`SELECT id, name, "nameZh" FROM "Organization" WHERE id = ANY(${canonicalOrgIds}::text[])`,
    newOrgNames.length === 0
      ? []
      : sql`SELECT id, name, "nameZh" FROM "Organization" WHERE name = ANY(${newOrgNames}::text[]) OR "nameZh" = ANY(${newOrgNames}::text[])`,
  ]);
  return { urlRows, aliasRows, newOrgRows };
}

async function checkDb(payload) {
  const rows = VALID_QUEUES.flatMap(queue => payload.queues[queue]);
  const urls = [...new Set(rows.map(row => row.evidence?.url).filter(Boolean).slice(0, 12))];
  const canonicalOrgIds = [...new Set(payload.queues.alias_merge.map(row => row.dbMatches?.matchedCanonicalOrganization?.id).filter(Boolean))];
  const newOrgNames = payload.queues.new_organization.map(row => row.name).filter(Boolean);
  const samples = await loadDbSamples(urls, canonicalOrgIds, newOrgNames);

  const expectedUrlCounts = new Map();
  for (const row of rows) {
    const url = row.evidence?.url;
    if (!url || expectedUrlCounts.has(url)) continue;
    expectedUrlCounts.set(url, list(row.dbMatches?.exactUrlMatches).length);
  }
  const actualUrlCounts = new Map();
  for (const row of samples.urlRows) {
    actualUrlCounts.set(row.url, (actualUrlCounts.get(row.url) || 0) + 1);
  }
  for (const [url, expected] of expectedUrlCounts.entries()) {
    const actual = actualUrlCounts.get(url) || 0;
    if ((expected > 0) !== (actual > 0)) addFailure(`db url sample mismatch for ${url}: expected=${expected}, actual=${actual}`);
  }

  if (samples.aliasRows.length !== canonicalOrgIds.length) {
    addFailure(`db alias sample mismatch: expected canonical org ids=${canonicalOrgIds.length}, found=${samples.aliasRows.length}`);
  }
  if (samples.newOrgRows.length > 0) {
    addFailure(`db duplicate sample found new_organization exact rows: ${samples.newOrgRows.map(row => row.name).join(', ')}`);
  }

  return {
    sampledEvidenceUrls: urls.length,
    coveredEvidenceUrls: samples.urlRows.length,
    aliasCanonicalRows: samples.aliasRows.length,
    newOrgExactDuplicateRows: samples.newOrgRows.length,
  };
}

async function main() {
  const payload = readJson(inputPath);
  if (payload._meta?.sourceOfTruth !== 'generated_from_aihot_daily_audit_json_and_current_db_readonly') {
    addFailure('_meta.sourceOfTruth must mark generated audit+db output');
  }
  if (payload._meta?.businessDataMutation !== false) addFailure('_meta.businessDataMutation must be false');
  if (payload._meta?.importableSeed !== false) addFailure('_meta.importableSeed must be false');

  for (const queue of VALID_QUEUES) {
    if (!Array.isArray(payload.queues?.[queue])) addFailure(`queues.${queue} must be an array`);
  }

  const seenIds = new Set();
  for (const queue of VALID_QUEUES) {
    for (const row of list(payload.queues?.[queue])) {
      if (!row.id) addFailure(`${rowLabel(row)}: id is required`);
      if (seenIds.has(row.id)) addFailure(`${rowLabel(row)}: duplicate id`);
      seenIds.add(row.id);
      checkCommon(row, queue);
      if (queue === 'new_organization') checkNewOrganization(row);
      if (queue === 'alias_merge') checkAliasMerge(row);
      if (queue === 'new_person_candidate') checkNewPersonCandidate(row);
      if (queue === 'person_deferred') checkPersonDeferred(row);
    }
  }

  let dbSample = null;
  if (CHECK_DB && failures.length === 0) dbSample = await checkDb(payload);

  if (failures.length > 0) {
    console.error('AI HOT candidate review worklist check failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log('AI HOT candidate review worklist check passed:');
  console.log(JSON.stringify({
    input: inputPath,
    counts: payload.summary?.counts,
    dbSample,
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
