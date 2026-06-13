import { Prisma, PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaNeon(pool) });

const ACTIVITY_SOURCE_TYPES = ['openalex', 'github', 'youtube', 'exa', 'podcast', 'career'];
const SOURCE_TYPE_CONFIG = {
  openalex: { eventType: 'paper', sourceLabel: 'OpenAlex' },
  github: { eventType: 'github', sourceLabel: 'GitHub' },
  youtube: { eventType: 'video', sourceLabel: 'YouTube' },
  exa: { eventType: 'article', sourceLabel: 'Web' },
  podcast: { eventType: 'podcast', sourceLabel: 'Podcast' },
  career: { eventType: 'role_change', sourceLabel: 'Career' },
  relation: { eventType: 'relation_change', sourceLabel: '关系证据' },
};
const MAX_SCAN_LIMIT = 500;
const DEFAULT_BATCH_SIZE = 100;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const since = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000);
  const summary = {
    dryRun: !options.execute,
    scanned: 0,
    relationsScanned: 0,
    materializable: 0,
    relationMaterializable: 0,
    upserted: 0,
    days: options.days,
    limit: options.limit,
    batchSize: options.batchSize,
    cursor: options.cursor,
    seed: options.seed,
    nextCursor: null,
    sourceTypes: ACTIVITY_SOURCE_TYPES,
    sample: [],
  };

  let cursor = options.cursor;
  while (summary.scanned < options.limit) {
    const batchLimit = Math.min(options.batchSize, options.limit - summary.scanned);
    const rawItems = await fetchRawPoolBatch({ since, cursor, batchLimit, seed: options.seed });
    if (rawItems.length === 0) break;

    const events = rawItems.map(toActivityEventData).filter(Boolean);
    summary.scanned += rawItems.length;
    summary.materializable += events.length;
    summary.nextCursor = rawItems[rawItems.length - 1]?.id || summary.nextCursor;
    cursor = summary.nextCursor;

    for (const event of events) {
      if (summary.sample.length < 3) {
        summary.sample.push({
          sourceItemId: event.sourceItemId,
          personId: event.personId,
          eventType: event.eventType,
          title: event.title,
        });
      }

      if (!options.execute) continue;
      await upsertActivityEvent(event);
      summary.upserted += 1;
    }

    if (rawItems.length < batchLimit) break;
  }

  const relationRows = await fetchRelationBatch({ since, batchLimit: Math.min(options.limit, MAX_SCAN_LIMIT) });
  const relationEvents = relationRows.map(toRelationActivityEventData).filter(Boolean);
  summary.relationsScanned = relationRows.length;
  summary.relationMaterializable = relationEvents.length;
  summary.materializable += relationEvents.length;

  for (const event of relationEvents) {
    if (summary.sample.length < 3) {
      summary.sample.push({
        id: event.id,
        sourceItemId: null,
        personId: event.personId,
        eventType: event.eventType,
        title: event.title,
      });
    }

    if (!options.execute) continue;
    await upsertActivityEvent(event);
    summary.upserted += 1;
  }

  console.log(JSON.stringify(summary, null, 2));

  if (!options.execute) {
    console.log('Dry run only. Re-run with --execute after the ActivityEvent migration is applied.');
  }
}

function fetchRawPoolBatch({ since, cursor, batchLimit, seed }) {
  return prisma.rawPoolItem.findMany({
    where: {
      sourceType: { in: ACTIVITY_SOURCE_TYPES },
      fetchStatus: 'success',
      url: { not: '' },
      title: { not: '' },
      ...(seed ? { metadata: { path: ['seed'], equals: seed } } : {}),
      OR: [
        { publishedAt: { gte: since } },
        { fetchedAt: { gte: since } },
      ],
    },
    select: {
      id: true,
      personId: true,
      sourceType: true,
      url: true,
      title: true,
      text: true,
      publishedAt: true,
      fetchedAt: true,
      metadata: true,
      person: {
        select: {
          topics: true,
          organization: true,
        },
      },
    },
    orderBy: { id: 'asc' },
    take: batchLimit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
}

function fetchRelationBatch({ since, batchLimit }) {
  return prisma.personRelation.findMany({
    where: {
      createdAt: { gte: since },
      reviewStatus: { in: ['trusted', 'confirmed'] },
      OR: [
        { evidenceUrl: { not: null } },
        { evidenceNote: { not: null } },
      ],
    },
    select: {
      id: true,
      personId: true,
      relatedPersonId: true,
      relationType: true,
      description: true,
      source: true,
      confidence: true,
      reviewStatus: true,
      evidenceUrl: true,
      evidenceNote: true,
      createdAt: true,
      person: {
        select: {
          organization: true,
          topics: true,
        },
      },
      relatedPerson: {
        select: {
          name: true,
          organization: true,
          topics: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: batchLimit,
  });
}

function upsertActivityEvent(event) {
  return prisma.activityEvent.upsert({
    where: event.sourceItemId ? { sourceItemId: event.sourceItemId } : { id: event.id },
    create: event,
    update: {
      eventType: event.eventType,
      sourceType: event.sourceType,
      title: event.title,
      summary: event.summary,
      url: event.url,
      occurredAt: event.occurredAt,
      detectedAt: event.detectedAt,
      topics: event.topics,
      organizations: event.organizations,
      confidence: event.confidence,
      evidenceNote: event.evidenceNote,
      reviewStatus: event.reviewStatus,
      metadata: event.metadata,
    },
  });
}

function toActivityEventData(row) {
  if (!row.url || !row.title) return null;
  const sourceConfig = SOURCE_TYPE_CONFIG[row.sourceType] || { eventType: 'article', sourceLabel: row.sourceType };
  const metadata = asRecord(row.metadata);
  const metadataTags = metadata ? toStringArray(metadata.tags) : [];
  const occurredAt = row.publishedAt || row.fetchedAt;

  return {
    personId: row.personId,
    sourceItemId: row.id,
    eventType: sourceConfig.eventType,
    sourceType: row.sourceType,
    title: row.title,
    summary: buildSummary(row.text),
    url: row.url,
    occurredAt,
    detectedAt: row.fetchedAt,
    topics: uniqueStrings([...metadataTags, ...(row.person?.topics || [])]).slice(0, 8),
    organizations: uniqueStrings(row.person?.organization || []).slice(0, 6),
    confidence: readConfidence(metadata),
    evidenceNote: readString(metadata?.evidenceNote) || readString(metadata?.sourceNote),
    reviewStatus: reviewStatusFromConfidence(readConfidence(metadata)),
    metadata: {
      sourceLabel: sourceConfig.sourceLabel,
      rawPoolItemId: row.id,
    },
  };
}

function toRelationActivityEventData(row) {
  const evidenceUrl = readString(row.evidenceUrl);
  const evidenceNote = readString(row.evidenceNote);
  if (!evidenceUrl && !evidenceNote) return null;

  const sourceConfig = SOURCE_TYPE_CONFIG.relation;
  const organizations = uniqueStrings([
    ...(row.person?.organization || []),
    ...(row.relatedPerson?.organization || []),
  ]).slice(0, 6);
  const topics = uniqueStrings([
    ...(row.person?.topics || []),
    ...(row.relatedPerson?.topics || []),
  ]).slice(0, 8);

  return {
    id: `relation:${row.id}:${row.personId}`,
    personId: row.personId,
    sourceItemId: null,
    eventType: sourceConfig.eventType,
    sourceType: 'relation',
    title: `与 ${row.relatedPerson?.name || '关联人物'} 的${relationTypeLabel(row.relationType)}关系已确认`,
    summary: buildSummary(row.description || evidenceNote || ''),
    url: evidenceUrl || `/person/${row.relatedPersonId}?fromRelation=${encodeURIComponent(row.relationType)}`,
    occurredAt: row.createdAt,
    detectedAt: row.createdAt,
    topics,
    organizations,
    confidence: clampConfidence(row.confidence),
    evidenceNote,
    reviewStatus: row.reviewStatus,
    metadata: {
      sourceLabel: row.source === 'wikidata' ? 'Wikidata 关系' : sourceConfig.sourceLabel,
      relationId: row.id,
      relatedPersonId: row.relatedPersonId,
      relationType: row.relationType,
    },
  };
}

function parseArgs(args) {
  const options = {
    execute: false,
    days: 90,
    limit: MAX_SCAN_LIMIT,
    batchSize: DEFAULT_BATCH_SIZE,
    cursor: null,
    seed: null,
  };

  for (const arg of args) {
    if (arg === '--execute') options.execute = true;
    if (arg.startsWith('--days=')) options.days = clampInteger(arg.slice('--days='.length), 1, 365, options.days);
    if (arg.startsWith('--limit=')) options.limit = clampInteger(arg.slice('--limit='.length), 1, MAX_SCAN_LIMIT, options.limit);
    if (arg.startsWith('--batch-size=')) options.batchSize = clampInteger(arg.slice('--batch-size='.length), 1, MAX_SCAN_LIMIT, options.batchSize);
    if (arg.startsWith('--cursor=')) options.cursor = arg.slice('--cursor='.length).trim() || null;
    if (arg.startsWith('--seed=')) options.seed = arg.slice('--seed='.length).trim() || null;
  }

  options.batchSize = Math.min(options.batchSize, options.limit);
  return options;
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function buildSummary(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized || normalized === 'null') return null;
  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized;
}

function asRecord(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value;
}

function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(item => typeof item === 'string' && item.trim().length > 0);
}

function uniqueStrings(values) {
  return [...new Set(values.map(value => String(value).trim()).filter(Boolean))];
}

function readConfidence(metadata) {
  const value = metadata?.confidence;
  if (typeof value === 'number' && Number.isFinite(value)) return clampConfidence(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return clampConfidence(parsed);
  }
  return 0.8;
}

function clampConfidence(value) {
  return Math.min(1, Math.max(0, value));
}

function reviewStatusFromConfidence(confidence) {
  return confidence < 0.7 ? 'needs_review' : 'auto';
}

function relationTypeLabel(value) {
  const labels = {
    advisor: '导师',
    advisee: '学生',
    cofounder: '联创',
    colleague: '同事',
    former_colleague: '前同事',
    collaborator: '合作',
    successor: '前后任',
  };
  return labels[value] || value;
}

function readString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

main()
  .catch(error => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      console.error('ActivityEvent table is missing. Apply the migration before running with --execute.');
      process.exitCode = 1;
      return;
    }
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
