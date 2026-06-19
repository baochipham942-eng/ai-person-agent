#!/usr/bin/env node
/**
 * Apply reviewed AI HOT existing-person official sources into RawPoolItem.
 *
 * Default mode is read-only. Execute mode is additive and guarded: it only
 * writes to a local DB or a confirmed remote dev/staging DB.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

neonConfig.webSocketConstructor = ws;

const DEFAULT_INPUT = 'docs/audit-2026-06/data/aihot_existing_people_primary_source_enrichment.json';
const ALLOWED_OFFICIALNESS = new Set(['official', 'official_blog', 'company_official', 'github_release', 'paper']);
const MATERIALIZED_SOURCE_TYPE = 'exa';
const MATERIALIZED_SOURCE_KIND = 'official_blog';
const MAX_TEXT_LENGTH = 4000;

main()
  .catch(error => {
    console.error(error?.message || error);
    process.exitCode = 1;
  });

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const db = getDbInfo();
  const rows = readReadyRows(options.input, options.limit);
  const prisma = createPrismaClient(db);

  try {
    const prepared = await prepareRows(prisma, rows);
    const summary = {
      generatedAt: new Date().toISOString(),
      dryRun: !options.execute,
      input: options.input,
      db: safeDbInfo(db),
      reviewedRows: rows.length,
      readyRows: prepared.length,
      wouldCreateRawPoolItems: prepared.filter(row => row.action === 'create').length,
      skipped: prepared.filter(row => row.action !== 'create').length,
      createdRawPoolItems: 0,
      createdAuditLogs: 0,
      rows: prepared.map(rowForReport),
    };

    if (options.execute) {
      assertWritableDb(db, options);
      for (const row of prepared) {
        if (row.action !== 'create') continue;
        const result = await applyPreparedRow(prisma, row);
        summary.createdRawPoolItems += result.rawCreated ? 1 : 0;
        summary.createdAuditLogs += result.auditCreated ? 1 : 0;
      }
    }

    console.log(JSON.stringify(summary, null, 2));
    if (!options.execute) {
      console.log('Dry run only. Re-run with --execute --allow-remote-dev after confirming the target database.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

function parseArgs(argv) {
  const options = {
    input: DEFAULT_INPUT,
    execute: false,
    allowRemoteDev: false,
    limit: 0,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--execute') options.execute = true;
    else if (arg === '--allow-remote-dev') options.allowRemoteDev = true;
    else if (arg.startsWith('--input=')) options.input = arg.slice('--input='.length);
    else if (arg.startsWith('--limit=')) options.limit = positiveInt(arg.slice('--limit='.length), 0);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function readReadyRows(inputPath, limit) {
  const payload = JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8'));
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.rows)
      ? payload.rows
      : Array.isArray(payload.items)
        ? payload.items
        : [];
  const rows = items.filter(row => row?.category === 'ready_to_backfill');
  return limit > 0 ? rows.slice(0, limit) : rows;
}

async function prepareRows(prisma, rows) {
  const personIds = unique(rows.map(row => asString(row.matchedPersonId)).filter(Boolean));
  const people = await prisma.people.findMany({
    where: { id: { in: personIds } },
    select: {
      id: true,
      name: true,
      aliases: true,
      organization: true,
      topics: true,
    },
  });
  const peopleById = new Map(people.map(person => [person.id, person]));
  const payloads = rows.map(row => buildCandidate(row, peopleById.get(asString(row.matchedPersonId))));

  const urlHashes = unique(payloads.map(payload => payload.urlHash));
  const rawConflicts = urlHashes.length > 0
    ? await prisma.rawPoolItem.findMany({
      where: { urlHash: { in: urlHashes } },
      select: { id: true, personId: true, sourceType: true, url: true, urlHash: true },
    })
    : [];
  const rawByHash = new Map(rawConflicts.map(row => [row.urlHash, row]));

  const personScopedRows = personIds.length > 0
    ? await prisma.rawPoolItem.findMany({
      where: {
        personId: { in: personIds },
        sourceType: { in: ['exa', 'official', 'github', 'paper'] },
      },
      select: { id: true, personId: true, sourceType: true, url: true, urlHash: true, title: true },
    })
    : [];
  const canonicalRawByPerson = new Map();
  for (const row of personScopedRows) {
    canonicalRawByPerson.set(`${row.personId}\t${canonicalRawPoolKey({ sourceType: row.sourceType, url: row.url, metadata: null })}`, row);
  }

  const activityRows = personIds.length > 0
    ? await prisma.activityEvent.findMany({
      where: { personId: { in: personIds } },
      select: { id: true, personId: true, url: true, title: true, sourceItemId: true },
    })
    : [];
  const activityByPersonUrl = new Map();
  for (const row of activityRows) {
    activityByPersonUrl.set(`${row.personId}\t${normalizeUrlForRawPool(row.url)}`, row);
  }

  return payloads.map(payload => {
    const issues = validatePayload(payload);
    const hashConflict = rawByHash.get(payload.urlHash);
    const canonicalConflict = canonicalRawByPerson.get(`${payload.personId}\t${payload.canonicalKey}`);
    const activityConflict = activityByPersonUrl.get(`${payload.personId}\t${normalizeUrlForRawPool(payload.url)}`);

    if (hashConflict) issues.push(`rawpool_url_hash_exists:${hashConflict.id}`);
    if (canonicalConflict && canonicalConflict.urlHash !== payload.urlHash) {
      issues.push(`rawpool_canonical_url_exists:${canonicalConflict.id}`);
    }
    if (activityConflict) issues.push(`activity_url_exists:${activityConflict.id}`);

    return {
      ...payload,
      action: issues.length === 0 ? 'create' : 'skip',
      issues,
    };
  });
}

function buildCandidate(row, person) {
  const url = asString(row.canonicalPrimaryUrl);
  const date = asString(row.date);
  const sourceOfficialness = asString(row.sourceOfficialness);
  const metadata = {
    seed: 'aihot-existing-people-ready-backfill-2026-06',
    sourceKind: MATERIALIZED_SOURCE_KIND,
    sourceName: asString(row.discoverySourceName) || null,
    sourceOfficialness,
    sourceNote: 'AI HOT ready_to_backfill official primary source.',
    evidenceNote: `${asString(row.personName)} matched to AI HOT official primary source ${asString(row.eventId)}.`,
    confidence: 0.86,
    tags: unique(['aihot', 'official_source', sourceOfficialness].filter(Boolean)),
    aihotEventId: asString(row.eventId) || null,
    aihotDiscoverySourceUrl: asString(row.discoverySourceUrl) || null,
    aihotDiscoverySourceKind: asString(row.discoverySourceKind) || null,
    aihotDuplicateKey: asString(row.duplicateKey) || null,
    aihotRecommendedAction: asString(row.recommendedAction) || null,
  };
  const identity = buildRawPoolIdentity({
    personId: asString(row.matchedPersonId),
    sourceType: MATERIALIZED_SOURCE_TYPE,
    url,
    metadata,
  });
  const title = asString(row.title);
  const text = compact([
    `AI HOT 官方源补充：${title}`,
    `人物：${asString(row.personName)}`,
    `来源：${metadata.sourceName || sourceOfficialness}`,
    `日期：${date}`,
    `原始事件：${metadata.aihotEventId || ''}`,
  ].filter(Boolean).join('\n'));

  return {
    sourceRow: row,
    person,
    personId: asString(row.matchedPersonId),
    personName: asString(row.personName),
    sourceType: MATERIALIZED_SOURCE_TYPE,
    url,
    urlHash: identity.urlHash,
    canonicalKey: identity.canonicalKey,
    supportKind: identity.supportKind,
    contentHash: contentHash(text),
    title,
    text,
    publishedAt: parseDate(date),
    metadata: {
      ...metadata,
      rawPoolCanonicalKey: identity.canonicalKey,
    },
  };
}

function validatePayload(payload) {
  const issues = [];
  if (!payload.personId) issues.push('missing_person_id');
  if (!payload.person) issues.push('person_not_found');
  if (payload.person && !personNameMatches(payload.person, payload.personName)) {
    issues.push(`person_name_mismatch:${payload.person.name}`);
  }
  if (!payload.url || !/^https?:\/\//i.test(payload.url)) issues.push('invalid_url');
  if (!payload.title) issues.push('missing_title');
  if (!payload.publishedAt) issues.push('missing_or_invalid_date');
  if (!ALLOWED_OFFICIALNESS.has(payload.metadata.sourceOfficialness)) {
    issues.push(`unsupported_officialness:${payload.metadata.sourceOfficialness || 'empty'}`);
  }
  if (isLowAuthorityDiscovery(payload.url)) issues.push('blocked_low_authority_or_social_url');
  return issues;
}

async function applyPreparedRow(prisma, row) {
  const created = await prisma.rawPoolItem.create({
    data: {
      personId: row.personId,
      sourceType: row.sourceType,
      url: row.url,
      urlHash: row.urlHash,
      contentHash: row.contentHash,
      title: row.title,
      text: row.text,
      publishedAt: row.publishedAt,
      metadata: row.metadata,
      fetchStatus: 'success',
      fetchedAt: new Date(),
    },
    select: { id: true },
  });

  const existingAudit = await prisma.qAAuditLog.findFirst({
    where: {
      personId: row.personId,
      urlHash: row.urlHash,
      sourceType: row.sourceType,
      stage: 'L1',
      verdict: 'keep',
    },
    select: { id: true },
  });

  if (existingAudit) return { rawCreated: true, auditCreated: false, rawPoolItemId: created.id };

  await prisma.qAAuditLog.create({
    data: {
      personId: row.personId,
      url: row.url,
      urlHash: row.urlHash,
      sourceType: row.sourceType,
      stage: 'L1',
      verdict: 'keep',
      aboutPerson: 0.92,
      aiRelevant: 0.88,
      quality: 0.86,
      reason: 'AI HOT ready_to_backfill official primary source.',
    },
  });

  return { rawCreated: true, auditCreated: true, rawPoolItemId: created.id };
}

function buildRawPoolIdentity(input) {
  const supportKind = supportKindForRawPool(input.sourceType, input.metadata);
  const canonicalKey = canonicalRawPoolKey(input);
  const urlHash = sha256([
    input.personId,
    input.sourceType,
    supportKind,
    canonicalKey,
  ].join('\t'));

  return { canonicalKey, supportKind, urlHash };
}

function supportKindForRawPool(sourceType, metadata) {
  const sourceKind = stringValue(metadata, 'sourceKind').toLowerCase();
  if (sourceType.toLowerCase() === 'youtube' && sourceKind === 'youtube_caption') return sourceKind;
  return '';
}

function canonicalRawPoolKey(input) {
  const sourceType = String(input.sourceType || '').toLowerCase();
  const url = input.url || '';

  if (sourceType === 'x') {
    const postId = stringValue(input.metadata, 'postId') || xPostIdFromUrl(url);
    if (postId) return `x:${postId}`;
  }

  if (sourceType === 'podcast') {
    const episodeKey = stringValue(input.metadata, 'episodeId') || stringValue(input.metadata, 'guid');
    if (episodeKey) return `podcast:${episodeKey.toLowerCase()}`;
  }

  if (sourceType === 'github') {
    const repoKey = githubRepoKey(url);
    if (repoKey) return `github:${repoKey}`;
  }

  return `url:${normalizeUrlForRawPool(url)}`;
}

function normalizeUrlForRawPool(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw.startsWith('//') ? `https:${raw}` : raw);
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    parsed.hash = '';

    for (const key of [...parsed.searchParams.keys()]) {
      if (isTrackingParam(key)) parsed.searchParams.delete(key);
    }
    parsed.searchParams.sort();

    if (parsed.pathname !== '/') {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    }

    return parsed.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return raw.replace(/\/+$/, '').toLowerCase();
  }
}

function isTrackingParam(key) {
  const lower = String(key || '').toLowerCase();
  return lower.startsWith('utm_')
    || ['fbclid', 'gclid', 'mc_cid', 'mc_eid', 'igshid', 'ref', 'ref_src'].includes(lower);
}

function xPostIdFromUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (!['x.com', 'twitter.com'].includes(host)) return '';
    const parts = parsed.pathname.split('/').filter(Boolean);
    const statusIndex = parts.findIndex(part => part === 'status' || part === 'statuses');
    return statusIndex >= 0 ? parts[statusIndex + 1] || '' : '';
  } catch {
    const match = url.match(/(?:x|twitter)\.com\/[^/]+\/status(?:es)?\/(\d+)/i);
    return match?.[1] || '';
  }
}

function githubRepoKey(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host !== 'github.com') return '';
    const [owner, repo] = parsed.pathname.split('/').filter(Boolean);
    if (!owner || !repo) return '';
    return `${owner}/${repo.replace(/\.git$/i, '')}`.toLowerCase();
  } catch {
    const match = url.match(/github\.com\/([^/\s]+)\/([^/\s?#]+)/i);
    return match ? `${match[1]}/${match[2].replace(/\.git$/i, '')}`.toLowerCase() : '';
  }
}

function isLowAuthorityDiscovery(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return ['x.com', 'twitter.com', 'theverge.com', 'substack.com', 'medium.com', 'reddit.com']
      .some(domain => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return true;
  }
}

function createPrismaClient(db = getDbInfo()) {
  if (db.local) return new PrismaClient();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter: new PrismaNeon(pool) });
}

function getDbInfo() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return { configured: false, host: null, database: null, local: false };
  try {
    const url = new URL(connectionString);
    return {
      configured: true,
      host: url.hostname,
      database: url.pathname.replace(/^\//, '') || null,
      local: ['localhost', '127.0.0.1', '::1'].includes(url.hostname),
    };
  } catch {
    return { configured: true, host: 'unparseable', database: null, local: false };
  }
}

function assertWritableDb(db, options) {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    throw new Error('Refusing to write while NODE_ENV=production or VERCEL is set.');
  }
  if (!db.configured) throw new Error('DATABASE_URL is not configured.');
  if (!db.local && !options.allowRemoteDev) {
    throw new Error(`Refusing to write to remote database host "${db.host}". Re-run with --allow-remote-dev only after confirming this is dev/staging.`);
  }
}

function safeDbInfo(db) {
  return {
    configured: db.configured,
    host: db.host,
    database: db.database,
    local: db.local,
  };
}

function rowForReport(row) {
  return {
    personId: row.personId,
    personName: row.personName,
    dbPersonName: row.person?.name || null,
    action: row.action,
    issues: row.issues,
    title: row.title,
    url: row.url,
    sourceType: row.sourceType,
    urlHash: row.urlHash,
    canonicalKey: row.canonicalKey,
    publishedAt: row.publishedAt?.toISOString() || null,
    aihotEventId: row.metadata.aihotEventId,
  };
}

function personNameMatches(person, expectedName) {
  const expected = normalizeLoose(expectedName);
  const names = [person.name, ...(Array.isArray(person.aliases) ? person.aliases : [])].map(normalizeLoose);
  return names.includes(expected);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function stringValue(metadata, key) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return '';
  const value = metadata[key];
  return typeof value === 'string' ? value.trim() : '';
}

function compact(text) {
  const normalized = String(text || '').replace(/\u0000/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized.length <= MAX_TEXT_LENGTH ? normalized : `${normalized.slice(0, MAX_TEXT_LENGTH - 1)}...`;
}

function unique(values) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
}

function normalizeLoose(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '').trim();
}

function positiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function contentHash(text) {
  return crypto.createHash('md5').update(String(text || '').slice(0, 1000)).digest('hex');
}

function printHelp() {
  console.log(`
Usage:
  node scripts/audit/apply_aihot_existing_people_ready_backfill.mjs
  node scripts/audit/apply_aihot_existing_people_ready_backfill.mjs --execute --allow-remote-dev

Default mode is dry-run. Execute mode refuses production and unconfirmed remote databases.
`);
}
