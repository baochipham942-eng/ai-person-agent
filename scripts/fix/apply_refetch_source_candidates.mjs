/**
 * Apply source-backed refetch candidates into RawPoolItem + QAAuditLog.
 *
 * Default is dry-run. This script is additive only: it never deletes old
 * RawPoolItem rows, never rewrites cards, and never mutates People fields.
 *
 * Usage:
 *   node scripts/fix/apply_refetch_source_candidates.mjs
 *   node scripts/fix/apply_refetch_source_candidates.mjs --execute
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const INPUT = getArg('--in')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_exa_mimo.jsonl';
const OUT = getArg('--out')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_apply_log.json';
const ARCHIVE = getArg('--archive')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_apply_archive.json';
const REPORT_OUT = getArg('--report-out')
  || 'docs/audit-2026-06/REFETCH_SOURCE_APPLY.md';
const EXECUTE = process.argv.includes('--execute');
const INCLUDE_BLOCKED = process.argv.includes('--include-blocked');
const INCLUDE_LOW_AUTHORITY = process.argv.includes('--include-low-authority-sources');
const DECISION_FILTER = (getArg('--decisions') || 'replace_source,augment_source')
  .split(',')
  .map((decision) => decision.trim())
  .filter(Boolean);
const LIMIT = numberArg('--limit', 0);
const MIN_TEXT = numberArg('--min-text', 80);

loadExtraEnv();

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

const LOW_AUTHORITY_HOSTS = [
  'wikipedia.org',
  'medium.com',
  'substack.com',
  'zhihu.com',
  'towardsdatascience.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'xcancel.com',
  'facebook.com',
  'instagram.com',
  'reddit.com',
  'news.ycombinator.com',
  'scholar.google.',
  'paperswithcode.com',
];

const AUXILIARY_LOW_AUTHORITY_BLOCKER = 'replacement_contains_auxiliary_low_authority_source';

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function numberArg(name, fallback) {
  const raw = getArg(name);
  if (raw === '0') return 0;
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function loadExtraEnv() {
  for (const file of [
    path.join(os.homedir(), '.code-agent/.env'),
    path.resolve('.env'),
    path.resolve('.env.local'),
  ]) {
    try {
      const parsed = dotenv.parse(fs.readFileSync(file));
      for (const [key, value] of Object.entries(parsed)) {
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      // Optional env file.
    }
  }
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function compact(text, max = 1200) {
  const value = String(text || '').replace(/\u0000/g, ' ').replace(/\s+/g, ' ').trim();
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function canonicalUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

function isLowAuthorityHost(host) {
  const value = String(host || '').toLowerCase();
  return LOW_AUTHORITY_HOSTS.some((domain) => value.includes(domain));
}

function sourceTypeFor(source) {
  const host = hostOf(source.url);
  const url = String(source.url || '').toLowerCase();
  if (/youtube\.com|youtu\.be/.test(host)) return 'youtube';
  if (/podcasts\.apple\.com|spotify\.com|soundcloud\.com|podcasts?/.test(host)) return 'podcast';
  if (/github\.com|gist\.github\.com/.test(host)) return 'github';
  if (/arxiv\.org|openreview\.net|aclanthology\.org|mlanthology\.org|dl\.acm\.org|proceedings\.neurips\.cc|papers\.nips\.cc/.test(host)) return 'paper';
  if (/\.edu$|\.ac\.|stanford\.edu|mit\.edu|tsinghua\.edu\.cn|umontreal\.ca|nyu\.edu|mcgill\.ca/.test(host)) return 'official';
  if (/openai\.com|anthropic\.com|deepmind\.google|research\.google|blog\.google|ai\.meta\.com|microsoft\.com|nvidia\.com|cohere\.com|mistral\.ai|baai\.ac\.cn/.test(host)) return 'official';
  if (url.includes('/paper/') || url.includes('/abs/')) return 'paper';
  return 'exa';
}

function findCandidate(row, source) {
  const selected = canonicalUrl(source.url);
  return (row.search?.candidates || []).find((candidate) => canonicalUrl(candidate.url) === selected) || null;
}

function sourceText(row, source, candidate) {
  const parts = [
    source.evidenceQuote ? `Evidence quote: ${source.evidenceQuote}` : '',
    source.reason ? `Selection reason: ${source.reason}` : '',
    candidate?.textPreview ? `Source preview: ${candidate.textPreview}` : '',
    row.rationale ? `MiMo rationale: ${row.rationale}` : '',
    row.remediation?.evidenceRequirements?.length
      ? `Evidence requirements: ${row.remediation.evidenceRequirements.join(' | ')}`
      : '',
    row.remediation?.sourceQueries?.length
      ? `Source queries: ${row.remediation.sourceQueries.join(' | ')}`
      : '',
  ].filter(Boolean);
  return compact(parts.join('\n'), 7000);
}

function allowedBlockers(row) {
  const blockers = Array.isArray(row.blockers) ? row.blockers : [];
  if (INCLUDE_BLOCKED) return blockers;
  return blockers.filter((blocker) => blocker !== AUXILIARY_LOW_AUTHORITY_BLOCKER);
}

function buildApplyCandidates(rows) {
  const selected = [];
  const skipped = [];

  for (const row of rows) {
    if (!DECISION_FILTER.includes(row.decision)) {
      skipped.push(skip(row, null, 'decision_not_selected'));
      continue;
    }
    if (!row.personId || !row.person) {
      skipped.push(skip(row, null, 'missing_person'));
      continue;
    }

    const hardBlockers = allowedBlockers(row);
    if (hardBlockers.length > 0) {
      skipped.push(skip(row, null, 'blocked', { blockers: hardBlockers }));
      continue;
    }

    const sources = Array.isArray(row.selectedSources) ? row.selectedSources : [];
    if (!sources.length) {
      skipped.push(skip(row, null, 'no_selected_sources'));
      continue;
    }

    for (const source of sources) {
      const host = source.host || hostOf(source.url);
      if (!source.url || !/^https?:\/\//i.test(source.url)) {
        skipped.push(skip(row, source, 'invalid_url'));
        continue;
      }
      if (!INCLUDE_LOW_AUTHORITY && isLowAuthorityHost(host)) {
        skipped.push(skip(row, source, 'low_authority_source'));
        continue;
      }

      const candidate = findCandidate(row, source);
      const text = sourceText(row, source, candidate);
      if (text.length < MIN_TEXT) {
        skipped.push(skip(row, source, 'text_too_short', { textLength: text.length }));
        continue;
      }

      const canonical = canonicalUrl(source.url);
      selected.push({
        claimId: row.claimId,
        personId: row.personId,
        person: row.person,
        decision: row.decision,
        confidence: Number(row.confidence) || 0,
        url: canonical,
        urlHash: sha256(`${row.personId}:${canonical}`),
        contentHash: sha256(text),
        sourceType: sourceTypeFor({ ...source, url: canonical }),
        title: compact(source.title || candidate?.title || row.target?.objectLabel || canonical, 300),
        text,
        selectedHost: hostOf(canonical),
        reason: source.reason || '',
        evidenceQuote: source.evidenceQuote || null,
        metadata: {
          appliedFrom: 'refetch_source_remediation',
          claimId: row.claimId,
          decision: row.decision,
          confidence: Number(row.confidence) || 0,
          reviewer: row.reviewer || null,
          reviewedAt: row.reviewedAt || null,
          searchProvider: row.search?.provider || null,
          originalSource: row.originalSource || null,
          remediation: row.remediation || null,
          target: row.target || null,
          selectedReason: source.reason || null,
          evidenceQuote: source.evidenceQuote || null,
          candidateAuthorityScore: candidate?.authorityScore ?? null,
          candidateAuthoritySignals: candidate?.authoritySignals || [],
          candidatePublishedDate: candidate?.publishedDate || null,
          candidateAuthor: candidate?.author || null,
          blockers: row.blockers || [],
        },
      });
    }
  }

  const byKey = new Map();
  for (const item of selected) {
    const existing = byKey.get(item.urlHash);
    if (!existing || item.confidence > existing.confidence || item.text.length > existing.text.length) {
      byKey.set(item.urlHash, item);
    }
  }

  const deduped = [...byKey.values()]
    .sort((a, b) => a.person.localeCompare(b.person) || a.sourceType.localeCompare(b.sourceType) || a.title.localeCompare(b.title));
  return {
    selected: LIMIT > 0 ? deduped.slice(0, LIMIT) : deduped,
    skipped,
    dedupedTotal: deduped.length,
  };
}

function skip(row, source, reason, extra = {}) {
  return {
    claimId: row?.claimId || null,
    personId: row?.personId || null,
    person: row?.person || null,
    decision: row?.decision || null,
    sourceUrl: source?.url || null,
    sourceHost: source?.host || (source?.url ? hostOf(source.url) : null),
    reason,
    ...extra,
  };
}

function countBy(rows, getKey) {
  return rows.reduce((acc, row) => {
    const key = getKey(row) || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function topEntries(counts, limit = 25) {
  return Object.fromEntries(
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit),
  );
}

async function loadExisting(urlHashes) {
  if (!urlHashes.length) return [];
  return await sql`
    SELECT
      raw.id,
      raw."personId",
      p.name AS person,
      raw.url,
      raw."urlHash",
      raw."sourceType",
      raw.title,
      EXISTS (
        SELECT 1
        FROM "QAAuditLog" qa
        WHERE qa."personId" = raw."personId"
          AND qa."urlHash" = raw."urlHash"
          AND qa.verdict = ${'keep'}
      ) AS "hasKeepAudit"
    FROM "RawPoolItem" raw
    JOIN "People" p ON p.id = raw."personId"
    WHERE raw."urlHash" = ANY(${urlHashes}::text[])
    ORDER BY p.name ASC, raw.title ASC
  `;
}

async function upsertItem(item, existingByHash) {
  const existing = existingByHash.get(item.urlHash);

  if (!EXECUTE) {
    return {
      rawAction: existing ? 'would_update_raw' : 'would_insert_raw',
      auditAction: existing?.hasKeepAudit ? 'keep_audit_exists' : 'would_insert_keep_audit',
    };
  }

  await sql`
    INSERT INTO "RawPoolItem" (
      id, "personId", "sourceType", url, "urlHash", "contentHash", title, text,
      "publishedAt", metadata, "fetchStatus", "fetchedAt", processed
    )
    VALUES (
      ${crypto.randomUUID()}, ${item.personId}, ${item.sourceType}, ${item.url}, ${item.urlHash}, ${item.contentHash},
      ${item.title}, ${item.text}, ${null}, ${JSON.stringify(item.metadata)}::jsonb, ${'success'}, NOW(), ${false}
    )
    ON CONFLICT ("urlHash") DO UPDATE
    SET title = EXCLUDED.title,
        text = EXCLUDED.text,
        metadata = EXCLUDED.metadata,
        "contentHash" = EXCLUDED."contentHash",
        "fetchStatus" = EXCLUDED."fetchStatus",
        "fetchedAt" = EXCLUDED."fetchedAt"
  `;

  if (!existing?.hasKeepAudit) {
    await sql`
      INSERT INTO "QAAuditLog" (
        id, "personId", url, "urlHash", "sourceType", stage, verdict,
        "aboutPerson", "aiRelevant", quality, reason
      )
      VALUES (
        ${crypto.randomUUID()}, ${item.personId}, ${item.url}, ${item.urlHash}, ${item.sourceType}, ${'L1'}, ${'keep'},
        ${0.9}, ${0.88}, ${0.78},
        ${`source-backed refetch apply: ${item.decision}; claimId=${item.claimId}; MiMo confidence=${item.confidence}`}
      )
    `;
  }

  return {
    rawAction: existing ? 'updated_raw' : 'inserted_raw',
    auditAction: existing?.hasKeepAudit ? 'keep_audit_exists' : 'inserted_keep_audit',
  };
}

function table(rows, columns) {
  const header = `| ${columns.map((col) => col.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((col) => String(col.value(row) ?? '').replace(/\n/g, '<br>').replace(/\|/g, '\\|')).join(' | ')} |`);
  return [header, divider, ...body].join('\n');
}

function writeReport(summary, appliedRows) {
  const lines = [
    '# Refetch Source Apply',
    '',
    `Generated at: ${summary.generatedAt}`,
    `Mode: ${summary.mode}`,
    `Input: ${summary.input}`,
    '',
    '## Counts',
    '',
    table([
      { metric: 'input rows', value: summary.inputRows },
      { metric: 'eligible source rows', value: summary.eligibleSourceRows },
      { metric: 'selected source rows', value: summary.selectedSourceRows },
      { metric: 'skipped source/decision rows', value: summary.skippedRows },
      { metric: 'existing RawPoolItems', value: summary.existingRawPoolItems },
      { metric: 'raw inserted', value: summary.rawInserted },
      { metric: 'raw updated', value: summary.rawUpdated },
      { metric: 'keep audits inserted', value: summary.keepAuditsInserted },
      { metric: 'keep audits already existed', value: summary.keepAuditsExisting },
    ], [
      { label: 'Metric', value: (row) => row.metric },
      { label: 'Value', value: (row) => row.value },
    ]),
    '',
    '## Decisions',
    '',
    table(Object.entries(summary.byDecision).map(([decision, count]) => ({ decision, count })), [
      { label: 'Decision', value: (row) => row.decision },
      { label: 'Count', value: (row) => row.count },
    ]),
    '',
    '## Source Types',
    '',
    table(Object.entries(summary.bySourceType).map(([sourceType, count]) => ({ sourceType, count })), [
      { label: 'Source type', value: (row) => row.sourceType },
      { label: 'Count', value: (row) => row.count },
    ]),
    '',
    '## Top Hosts',
    '',
    table(Object.entries(summary.topHosts).map(([host, count]) => ({ host, count })), [
      { label: 'Host', value: (row) => row.host },
      { label: 'Count', value: (row) => row.count },
    ]),
    '',
    '## Sample Applied Rows',
    '',
    table(appliedRows.slice(0, 50), [
      { label: 'Person', value: (row) => row.person },
      { label: 'Decision', value: (row) => row.decision },
      { label: 'Type', value: (row) => row.sourceType },
      { label: 'Title', value: (row) => compact(row.title, 80) },
      { label: 'Host', value: (row) => row.selectedHost },
      { label: 'Raw', value: (row) => row.rawAction },
      { label: 'Audit', value: (row) => row.auditAction },
    ]),
    '',
    '## Safety',
    '',
    '- Additive only: this script does not delete existing RawPoolItem rows.',
    '- It does not rewrite representative works, cards, roles, products, or People fields.',
    '- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.',
    '',
  ];
  fs.writeFileSync(REPORT_OUT, `${lines.join('\n')}\n`);
}

async function main() {
  const rows = readJsonl(INPUT);
  const { selected, skipped, dedupedTotal } = buildApplyCandidates(rows);
  const existing = await loadExisting(selected.map((item) => item.urlHash));
  const existingByHash = new Map(existing.map((row) => [row.urlHash, row]));

  const appliedRows = [];
  for (const item of selected) {
    const actions = await upsertItem(item, existingByHash);
    appliedRows.push({ ...item, ...actions });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: EXECUTE ? 'execute' : 'dry-run',
    input: INPUT,
    archive: ARCHIVE,
    report: REPORT_OUT,
    filters: {
      decisions: DECISION_FILTER,
      includeBlocked: INCLUDE_BLOCKED,
      includeLowAuthoritySources: INCLUDE_LOW_AUTHORITY,
      limit: LIMIT,
      minText: MIN_TEXT,
    },
    inputRows: rows.length,
    eligibleSourceRows: dedupedTotal,
    selectedSourceRows: selected.length,
    skippedRows: skipped.length,
    existingRawPoolItems: existing.length,
    rawInserted: appliedRows.filter((row) => row.rawAction === 'inserted_raw' || row.rawAction === 'would_insert_raw').length,
    rawUpdated: appliedRows.filter((row) => row.rawAction === 'updated_raw' || row.rawAction === 'would_update_raw').length,
    keepAuditsInserted: appliedRows.filter((row) => row.auditAction === 'inserted_keep_audit' || row.auditAction === 'would_insert_keep_audit').length,
    keepAuditsExisting: appliedRows.filter((row) => row.auditAction === 'keep_audit_exists').length,
    byDecision: countBy(appliedRows, (row) => row.decision),
    bySourceType: countBy(appliedRows, (row) => row.sourceType),
    topPeople: topEntries(countBy(appliedRows, (row) => row.person), 30),
    topHosts: topEntries(countBy(appliedRows, (row) => row.selectedHost), 30),
    skipReasons: topEntries(countBy(skipped, (row) => row.reason), 30),
  };

  const archivePayload = {
    generatedAt: new Date().toISOString(),
    summary,
    existing,
    appliedRows,
    skippedRows: skipped,
  };

  fs.mkdirSync(path.dirname(ARCHIVE), { recursive: true });
  fs.writeFileSync(ARCHIVE, `${JSON.stringify(archivePayload, null, 2)}\n`);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify({ generatedAt: new Date().toISOString(), summary }, null, 2)}\n`);
  writeReport(summary, appliedRows);

  console.log(JSON.stringify({
    out: OUT,
    archive: ARCHIVE,
    reportOut: REPORT_OUT,
    summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
