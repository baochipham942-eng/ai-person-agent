#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

const DEFAULT_SOURCE_TYPES = ['exa', 'github', 'x', 'youtube'];
const TRACKING_PARAMS = new Set(['fbclid', 'gclid', 'mc_cid', 'mc_eid', 'igshid', 'ref', 'ref_src']);

loadEnv();

const args = parseArgs(process.argv.slice(2));
const execute = Boolean(args.execute);
const sourceTypes = String(args['source-types'] || DEFAULT_SOURCE_TYPES.join(','))
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const reportPath = String(args.out || 'docs/audit-2026-06/data/rawpool_dedup_report.json');
const archivePath = String(args.archive || 'docs/audit-2026-06/data/rawpool_dedup_archive.json');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const dbShape = {
  hasActivityEvent: await tableExists('ActivityEvent'),
  hasKnowledgeThreadSource: await tableExists('KnowledgeThreadSource'),
};
const rows = await loadRows(dbShape);
const analysis = analyzeRows(rows);

writeJson(reportPath, {
  generatedAt: new Date().toISOString(),
  mode: execute ? 'execute' : 'dry-run',
  sourceTypes,
  dbShape,
  summary: analysis.summary,
  duplicateGroups: analysis.duplicateGroups.map(groupForReport),
  hashUpdates: analysis.hashUpdates.map(updateForReport),
});

writeJson(archivePath, {
  generatedAt: new Date().toISOString(),
  mode: execute ? 'execute' : 'dry-run',
  sourceTypes,
  deletedRows: analysis.rowsToDelete,
});

console.log(JSON.stringify({
  mode: execute ? 'execute' : 'dry-run',
  sourceTypes,
  dbShape,
  summary: analysis.summary,
  reportPath,
  archivePath,
}, null, 2));

if (execute) {
  await applyChanges(analysis);
  console.log(JSON.stringify({ applied: true, summary: analysis.summary }, null, 2));
}

async function loadRows(shape) {
  const rows = await sql`
    SELECT
      raw.id,
      raw."personId",
      people.name AS "personName",
      raw."sourceType",
      raw.url,
      raw."urlHash",
      raw."contentHash",
      raw.title,
      raw.text,
      raw."publishedAt",
      raw.metadata,
      raw."fetchStatus",
      raw."errorCode",
      raw."fetchedAt",
      raw.processed,
      0::int AS "activityRefs",
      0::int AS "knowledgeRefs"
    FROM "RawPoolItem" raw
    JOIN "People" people ON people.id = raw."personId"
    WHERE raw."sourceType" = ANY(${sourceTypes}::text[])
    ORDER BY raw."personId", raw."sourceType", raw.url
  `;

  if (rows.length === 0) return rows;

  const byId = new Map(rows.map((row) => [row.id, row]));
  const ids = [...byId.keys()];

  if (shape.hasActivityEvent) {
    const activityCounts = await sql`
      SELECT "sourceItemId", COUNT(*)::int AS count
      FROM "ActivityEvent"
      WHERE "sourceItemId" = ANY(${ids}::text[])
      GROUP BY "sourceItemId"
    `;
    for (const count of activityCounts) {
      const row = byId.get(count.sourceItemId);
      if (row) row.activityRefs = Number(count.count || 0);
    }
  }

  if (shape.hasKnowledgeThreadSource) {
    const knowledgeCounts = await sql`
      SELECT "rawPoolItemId", COUNT(*)::int AS count
      FROM "KnowledgeThreadSource"
      WHERE "rawPoolItemId" = ANY(${ids}::text[])
      GROUP BY "rawPoolItemId"
    `;
    for (const count of knowledgeCounts) {
      const row = byId.get(count.rawPoolItemId);
      if (row) row.knowledgeRefs = Number(count.count || 0);
    }
  }

  return rows;
}

function analyzeRows(inputRows) {
  const enriched = inputRows.map((row) => {
    const identity = buildIdentity(row);
    return {
      ...row,
      supportKind: identity.supportKind,
      canonicalKey: identity.canonicalKey,
      canonicalUrlHash: identity.urlHash,
      groupKey: [
        row.personId,
        row.sourceType,
        identity.supportKind,
        identity.canonicalKey,
      ].join('\t'),
      textLength: String(row.text || '').length,
    };
  });

  const groups = new Map();
  for (const row of enriched) {
    const group = groups.get(row.groupKey) || [];
    group.push(row);
    groups.set(row.groupKey, group);
  }

  const duplicateGroups = [];
  const rowsToDelete = [];
  const keepIds = new Set();

  for (const groupRows of groups.values()) {
    if (groupRows.length === 1) {
      keepIds.add(groupRows[0].id);
      continue;
    }

    const ranked = [...groupRows].sort(compareKeeper);
    const keeper = ranked[0];
    keepIds.add(keeper.id);
    const drops = ranked.slice(1);
    rowsToDelete.push(...drops.map((row) => ({ ...row, keepRawPoolItemId: keeper.id })));
    duplicateGroups.push({
      personId: keeper.personId,
      personName: keeper.personName,
      sourceType: keeper.sourceType,
      supportKind: keeper.supportKind,
      canonicalKey: keeper.canonicalKey,
      keepRawPoolItemId: keeper.id,
      droppedCount: drops.length,
      rows: ranked,
    });
  }

  const deleteIds = new Set(rowsToDelete.map((row) => row.id));
  const rowsToKeep = enriched.filter((row) => !deleteIds.has(row.id));
  const hashUpdates = rowsToKeep
    .map((row) => ({
      id: row.id,
      personId: row.personId,
      personName: row.personName,
      sourceType: row.sourceType,
      url: row.url,
      oldUrlHash: row.urlHash,
      newUrlHash: row.canonicalUrlHash,
      canonicalKey: row.canonicalKey,
      metadata: {
        ...metadataRecord(row.metadata),
        rawPoolCanonicalKey: row.canonicalKey,
      },
    }))
    .filter((row) => row.oldUrlHash !== row.newUrlHash
      || metadataRecord(inputRows.find((candidate) => candidate.id === row.id)?.metadata).rawPoolCanonicalKey !== row.canonicalKey);

  const bySource = {};
  for (const sourceType of sourceTypes) {
    bySource[sourceType] = {
      rows: enriched.filter((row) => row.sourceType === sourceType).length,
      duplicateGroups: duplicateGroups.filter((group) => group.sourceType === sourceType).length,
      rowsToDelete: rowsToDelete.filter((row) => row.sourceType === sourceType).length,
      hashUpdates: hashUpdates.filter((row) => row.sourceType === sourceType).length,
    };
  }

  const affectedPeople = new Set(rowsToDelete.map((row) => row.personId));

  return {
    rows: enriched,
    duplicateGroups,
    rowsToDelete,
    rowsToKeep,
    hashUpdates,
    summary: {
      scannedRows: enriched.length,
      duplicateGroups: duplicateGroups.length,
      rowsToDelete: rowsToDelete.length,
      affectedPeople: affectedPeople.size,
      hashUpdates: hashUpdates.length,
      bySource,
    },
  };
}

function compareKeeper(a, b) {
  return scoreKeeper(b) - scoreKeeper(a) || a.id.localeCompare(b.id);
}

function scoreKeeper(row) {
  const metadata = metadataRecord(row.metadata);
  const isOfficial = metadata.isOfficial === true || metadata.channelType === 'official';
  const fetchedAt = row.fetchedAt ? new Date(row.fetchedAt).getTime() : 0;
  return (row.activityRefs || 0) * 100000
    + (row.knowledgeRefs || 0) * 10000
    + (row.processed ? 1000 : 0)
    + (row.fetchStatus === 'success' ? 200 : 0)
    + (isOfficial ? 100 : 0)
    + (row.publishedAt ? 10 : 0)
    + Math.min(row.textLength || 0, 20000) / 100
    + fetchedAt / 1e13;
}

async function applyChanges(analysis) {
  await assertNoExternalHashCollisions(analysis);

  const deleteByKeeper = new Map();
  for (const row of analysis.rowsToDelete) {
    const ids = deleteByKeeper.get(row.keepRawPoolItemId) || [];
    ids.push(row.id);
    deleteByKeeper.set(row.keepRawPoolItemId, ids);
  }

  let reassignedActivityRefs = 0;
  let reassignedKnowledgeRefs = 0;

  for (const [keeperId, dropIds] of deleteByKeeper.entries()) {
    for (const dropId of dropIds) {
      if (dbShape.hasActivityEvent) {
        const activityResult = await sql`
          WITH candidate AS (
            SELECT id
            FROM "ActivityEvent"
            WHERE "sourceItemId" = ${dropId}
              AND NOT EXISTS (
                SELECT 1 FROM "ActivityEvent" existing
                WHERE existing."sourceItemId" = ${keeperId}
              )
            LIMIT 1
          )
          UPDATE "ActivityEvent" event
          SET "sourceItemId" = ${keeperId}
          FROM candidate
          WHERE event.id = candidate.id
          RETURNING event.id
        `;
        reassignedActivityRefs += activityResult.length;
      }

      if (dbShape.hasKnowledgeThreadSource) {
        const knowledgeResult = await sql`
          UPDATE "KnowledgeThreadSource" source
          SET "rawPoolItemId" = ${keeperId}
          WHERE source."rawPoolItemId" = ${dropId}
            AND NOT EXISTS (
              SELECT 1
              FROM "KnowledgeThreadSource" existing
              WHERE existing."threadId" = source."threadId"
                AND existing.role = source.role
                AND existing."rawPoolItemId" = ${keeperId}
            )
          RETURNING source.id
        `;
        reassignedKnowledgeRefs += knowledgeResult.length;
      }
    }
  }

  const oldHashToCanonical = new Map();
  for (const row of [...analysis.rowsToKeep, ...analysis.rowsToDelete]) {
    oldHashToCanonical.set(`${row.personId}\t${row.urlHash}`, {
      personId: row.personId,
      oldHash: row.urlHash,
      canonicalHash: row.canonicalUrlHash,
    });
  }

  const auditHashUpdates = [...oldHashToCanonical.values()]
    .filter(({ oldHash, canonicalHash }) => oldHash !== canonicalHash)
    .map(({ personId, oldHash, canonicalHash }) => ({ personId, oldHash, canonicalHash }));

  for (const updates of chunks(auditHashUpdates, 500)) {
    await sql`
      WITH updates AS (
        SELECT *
        FROM jsonb_to_recordset(${JSON.stringify(updates)}::jsonb)
          AS update_map("personId" text, "oldHash" text, "canonicalHash" text)
      )
      UPDATE "QAAuditLog" audit
      SET "urlHash" = updates."canonicalHash"
      FROM updates
      WHERE audit."personId" = updates."personId"
        AND audit."urlHash" = updates."oldHash"
    `;
  }

  const deleteIds = analysis.rowsToDelete.map((row) => row.id);
  if (deleteIds.length > 0) {
    await sql`
      DELETE FROM "RawPoolItem"
      WHERE id = ANY(${deleteIds}::text[])
    `;
  }

  for (const updates of chunks(analysis.hashUpdates, 500)) {
    await sql`
      WITH updates AS (
        SELECT *
        FROM jsonb_to_recordset(${JSON.stringify(updates)}::jsonb)
          AS update_map(id text, "newUrlHash" text, metadata jsonb)
      )
      UPDATE "RawPoolItem"
      SET
        "urlHash" = updates."newUrlHash",
        metadata = updates.metadata
      FROM updates
      WHERE "RawPoolItem".id = updates.id
    `;
  }

  console.log(JSON.stringify({
    reassignedActivityRefs,
    reassignedKnowledgeRefs,
    deletedRawPoolItems: deleteIds.length,
    updatedRawPoolItems: analysis.hashUpdates.length,
  }, null, 2));
}

async function assertNoExternalHashCollisions(analysis) {
  const candidateIds = new Set(analysis.rows.map((row) => row.id));
  const newHashes = [...new Set(analysis.rowsToKeep.map((row) => row.canonicalUrlHash))];
  if (newHashes.length === 0) return;

  const conflicts = [];
  for (const hashChunk of chunks(newHashes, 500)) {
    const matches = await sql`
      SELECT id, "urlHash", "personId", "sourceType", url
      FROM "RawPoolItem"
      WHERE "urlHash" = ANY(${hashChunk}::text[])
    `;
    conflicts.push(...matches.filter((row) => !candidateIds.has(row.id)));
  }

  if (conflicts.length > 0) {
    writeJson(reportPath.replace(/\.json$/, '.hash_conflicts.json'), conflicts);
    throw new Error(`Refusing to execute: ${conflicts.length} external urlHash conflicts`);
  }
}

function groupForReport(group) {
  return {
    personId: group.personId,
    personName: group.personName,
    sourceType: group.sourceType,
    supportKind: group.supportKind,
    canonicalKey: group.canonicalKey,
    keepRawPoolItemId: group.keepRawPoolItemId,
    droppedCount: group.droppedCount,
    rows: group.rows.map((row) => ({
      id: row.id,
      title: row.title,
      url: row.url,
      oldUrlHash: row.urlHash,
      newUrlHash: row.canonicalUrlHash,
      fetchedAt: row.fetchedAt,
      processed: row.processed,
      activityRefs: row.activityRefs,
      knowledgeRefs: row.knowledgeRefs,
      textLength: row.textLength,
    })),
  };
}

function updateForReport(row) {
  return {
    id: row.id,
    personId: row.personId,
    personName: row.personName,
    sourceType: row.sourceType,
    url: row.url,
    oldUrlHash: row.oldUrlHash,
    newUrlHash: row.newUrlHash,
    canonicalKey: row.canonicalKey,
  };
}

function buildIdentity(row) {
  const metadata = metadataRecord(row.metadata);
  const supportKind = row.sourceType === 'youtube' && stringValue(metadata.sourceKind).toLowerCase() === 'youtube_caption'
    ? 'youtube_caption'
    : '';
  const canonicalKey = canonicalRawPoolKey(row.sourceType, row.url, metadata);
  return {
    supportKind,
    canonicalKey,
    urlHash: sha256([row.personId, row.sourceType, supportKind, canonicalKey].join('\t')),
  };
}

function canonicalRawPoolKey(sourceType, url, metadata) {
  const normalizedSourceType = String(sourceType || '').toLowerCase();
  const videoId = videoIdFromMetadataOrUrl(metadata, url);
  if (videoId) return `youtube:${videoId}`;

  if (normalizedSourceType === 'x') {
    const postId = stringValue(metadata.postId) || xPostIdFromUrl(url);
    if (postId) return `x:${postId}`;
  }

  if (normalizedSourceType === 'podcast') {
    const episodeKey = stringValue(metadata.episodeId) || stringValue(metadata.guid);
    if (episodeKey) return `podcast:${episodeKey.toLowerCase()}`;
  }

  if (normalizedSourceType === 'github') {
    const repoKey = githubRepoKey(url);
    if (repoKey) return `github:${repoKey}`;
  }

  return `url:${normalizeUrl(url)}`;
}

function normalizeUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw.startsWith('//') ? `https:${raw}` : raw);
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    parsed.hash = '';

    for (const key of [...parsed.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (lower.startsWith('utm_') || TRACKING_PARAMS.has(lower)) {
        parsed.searchParams.delete(key);
      }
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

function videoIdFromMetadataOrUrl(metadata, url) {
  const fromMetadata = cleanVideoId(stringValue(metadata.videoId));
  if (fromMetadata) return fromMetadata;

  const raw = String(url || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw.startsWith('//') ? `https:${raw}` : raw);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'youtu.be') {
      return cleanVideoId(parsed.pathname.split('/').filter(Boolean)[0] || '');
    }

    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const queryVideo = cleanVideoId(parsed.searchParams.get('v') || '');
      if (queryVideo) return queryVideo;

      const parts = parsed.pathname.split('/').filter(Boolean);
      if (['embed', 'shorts', 'live', 'v'].includes(parts[0]) && parts[1]) {
        return cleanVideoId(parts[1]);
      }
    }
  } catch {
    // Fall through to regex extraction.
  }

  const match = raw.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{6,})/);
  return cleanVideoId(match?.[1] || '');
}

function cleanVideoId(value) {
  const match = String(value || '').match(/[A-Za-z0-9_-]{6,}/);
  return match?.[0] || '';
}

function xPostIdFromUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (!['x.com', 'twitter.com'].includes(host)) return '';
    const parts = parsed.pathname.split('/').filter(Boolean);
    const statusIndex = parts.findIndex((part) => part === 'status' || part === 'statuses');
    return statusIndex >= 0 ? parts[statusIndex + 1] || '' : '';
  } catch {
    const match = String(url || '').match(/(?:x|twitter)\.com\/[^/]+\/status(?:es)?\/(\d+)/i);
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
    const match = String(url || '').match(/github\.com\/([^/\s]+)\/([^/\s?#]+)/i);
    return match ? `${match[1]}/${match[2].replace(/\.git$/i, '')}`.toLowerCase() : '';
  }
}

function metadataRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
}

function stringValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function parseArgs(values) {
  const parsed = {};
  for (const value of values) {
    if (value === '--execute') {
      parsed.execute = true;
      continue;
    }
    const match = value.match(/^--([^=]+)=(.*)$/);
    if (match) parsed[match[1]] = match[2];
  }
  return parsed;
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function tableExists(tableName) {
  const rows = await sql`SELECT to_regclass(${`"${tableName}"`}) AS "tableName"`;
  return Boolean(rows[0]?.tableName);
}

function loadEnv() {
  const mode = process.env.NODE_ENV || 'development';
  for (const filename of ['.env', `.env.${mode}`, '.env.local', `.env.${mode}.local`]) {
    const filePath = path.resolve(process.cwd(), filename);
    if (fs.existsSync(filePath)) {
      dotenv.config({ path: filePath, override: true, quiet: true });
    }
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
