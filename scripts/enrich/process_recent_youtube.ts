import 'dotenv/config';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db/prisma';
import { cleanItems } from '../../lib/agents/clean-orchestrator';
import type { NormalizedItem, PersonContext, SourceType } from '../../lib/datasources/adapter';

type RawYoutubeItem = {
  id: string;
  personId: string;
  sourceType: string;
  url: string;
  urlHash: string;
  contentHash: string;
  title: string;
  text: string;
  publishedAt: Date | null;
  fetchedAt: Date;
  metadata: Prisma.JsonValue | null;
  processed: boolean;
  person: {
    id: string;
    name: string;
    aliases: string[];
    organization: string[];
    occupation: string[];
    topics: string[];
  };
};

type LatestAudit = {
  personId: string;
  urlHash: string;
  verdict: string;
  stage: string;
  aboutPerson: number | null;
  aiRelevant: number | null;
  quality: number | null;
  reason: string | null;
  createdAt: Date;
};

type Options = {
  since: Date;
  execute: boolean;
  summaryOnly: boolean;
  skipAudit: boolean;
  skipMaterialize: boolean;
  includeAudited: boolean;
  markProcessed: boolean;
  limitPeople?: number;
  person?: string;
  semanticConcurrency: number;
  semanticDelayMs: number;
};

type AuditStats = {
  people: number;
  input: number;
  audited: number;
  keep: number;
  review: number;
  reject: number;
  duplicate: number;
  sourceRejected: number;
  l0Rejected: number;
};

const SOURCE_TYPE = 'youtube';

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find(arg => arg.startsWith(prefix))?.slice(prefix.length);
}

function readNumberArg(name: string, fallback: number): number {
  const raw = readArg(name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`--${name} must be a non-negative number`);
  return value;
}

function parseOptions(): Options {
  const sinceRaw = readArg('since');
  const sinceHours = readNumberArg('since-hours', 24);
  const since = sinceRaw ? new Date(sinceRaw) : new Date(Date.now() - sinceHours * 60 * 60 * 1000);
  if (Number.isNaN(since.getTime())) throw new Error(`Invalid --since value: ${sinceRaw}`);

  const limitPeople = readArg('limit-people');
  const parsedLimit = limitPeople ? Number(limitPeople) : undefined;
  if (parsedLimit !== undefined && (!Number.isFinite(parsedLimit) || parsedLimit <= 0)) {
    throw new Error('--limit-people must be a positive number');
  }

  return {
    since,
    execute: process.argv.includes('--execute'),
    summaryOnly: process.argv.includes('--summary-only'),
    skipAudit: process.argv.includes('--skip-audit'),
    skipMaterialize: process.argv.includes('--skip-materialize'),
    includeAudited: process.argv.includes('--include-audited'),
    markProcessed: !process.argv.includes('--no-mark-processed'),
    limitPeople: parsedLimit,
    person: readArg('person'),
    semanticConcurrency: Math.max(1, readNumberArg('semantic-concurrency', 2)),
    semanticDelayMs: readNumberArg('semantic-delay-ms', 1000),
  };
}

function keyFor(personId: string, urlHash: string): string {
  return `${personId}:${urlHash}`;
}

function asRecord(value: Prisma.JsonValue | null): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readConfidence(metadata: Record<string, unknown>): number {
  const raw = metadata.confidence;
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isFinite(value)) return 80;
  return value <= 1 ? value * 100 : value;
}

function removeUnpairedSurrogates(value: string): string {
  let output = '';
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        output += value[index] + value[index + 1];
        index++;
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) continue;
    output += value[index];
  }
  return output;
}

function toNormalizedItem(item: RawYoutubeItem): NormalizedItem {
  const metadata = asRecord(item.metadata);
  return {
    url: item.url,
    urlHash: item.urlHash,
    contentHash: item.contentHash,
    title: item.title,
    text: item.text,
    publishedAt: item.publishedAt,
    sourceType: item.sourceType as SourceType,
    isOfficial: metadata.isOfficial === true,
    confidence: readConfidence(metadata),
    metadata,
  };
}

function toPersonContext(person: RawYoutubeItem['person']): PersonContext {
  return {
    id: person.id,
    name: person.name,
    englishName: person.aliases[0] || person.name,
    aliases: person.aliases || [],
    organizations: person.organization || [],
    occupations: person.occupation || [],
  };
}

function groupByPerson(items: RawYoutubeItem[]): RawYoutubeItem[][] {
  const groups = new Map<string, RawYoutubeItem[]>();
  for (const item of items) {
    const current = groups.get(item.personId) || [];
    current.push(item);
    groups.set(item.personId, current);
  }
  return [...groups.values()].sort((a, b) => a[0].person.name.localeCompare(b[0].person.name));
}

function sanitizeText(value: string | null | undefined): string {
  return removeUnpairedSurrogates(String(value || ''))
    .replace(/\u0000/g, '')
    .replace(/\\x(?![0-9a-fA-F]{2})/g, 'x')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

function sanitizeNullableText(value: string | null | undefined): string | null {
  const sanitized = sanitizeText(value);
  return sanitized.length > 0 ? sanitized : null;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map(value => sanitizeText(value)).filter(Boolean))];
}

function buildSummary(text: string): string | null {
  const normalized = sanitizeText(text).replace(/\s+/g, ' ').trim();
  if (!normalized || normalized === 'null') return null;
  const chars = Array.from(normalized);
  return chars.length > 140 ? `${chars.slice(0, 137).join('')}...` : normalized;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function confidenceFromAudit(audit: LatestAudit | undefined, metadata: Record<string, unknown>): number {
  const scores = [audit?.aboutPerson, audit?.aiRelevant, audit?.quality].filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value)
  );
  if (scores.length > 0) return clamp01(scores.reduce((sum, value) => sum + value, 0) / scores.length);
  const metadataConfidence = readConfidence(metadata);
  return clamp01(metadataConfidence > 1 ? metadataConfidence / 100 : metadataConfidence);
}

function reviewStatusFromConfidence(confidence: number): string {
  return confidence < 0.7 ? 'needs_review' : 'auto';
}

async function loadRecentItems(options: Options): Promise<RawYoutubeItem[]> {
  const where: Prisma.RawPoolItemWhereInput = {
    sourceType: SOURCE_TYPE,
    fetchStatus: 'success',
    fetchedAt: { gte: options.since },
    url: { not: '' },
    title: { not: '' },
    ...(options.person
      ? {
        person: {
          OR: [
            { id: options.person },
            { name: { contains: options.person, mode: 'insensitive' } },
          ],
        },
      }
      : {}),
  };

  const items = await prisma.rawPoolItem.findMany({
    where,
    select: {
      id: true,
      personId: true,
      sourceType: true,
      url: true,
      urlHash: true,
      contentHash: true,
      title: true,
      text: true,
      publishedAt: true,
      fetchedAt: true,
      metadata: true,
      processed: true,
      person: {
        select: {
          id: true,
          name: true,
          aliases: true,
          organization: true,
          occupation: true,
          topics: true,
        },
      },
    },
    orderBy: [{ person: { name: 'asc' } }, { publishedAt: 'desc' }, { fetchedAt: 'desc' }],
  });

  if (!options.limitPeople) return items as RawYoutubeItem[];

  const allowedPeople = new Set(groupByPerson(items as RawYoutubeItem[]).slice(0, options.limitPeople).map(group => group[0].personId));
  return (items as RawYoutubeItem[]).filter(item => allowedPeople.has(item.personId));
}

async function loadLatestAudits(items: RawYoutubeItem[]): Promise<Map<string, LatestAudit>> {
  if (items.length === 0) return new Map();

  const personIds = uniqueStrings(items.map(item => item.personId));
  const urlHashes = uniqueStrings(items.map(item => item.urlHash));
  const rows = await prisma.qAAuditLog.findMany({
    where: {
      sourceType: SOURCE_TYPE,
      personId: { in: personIds },
      urlHash: { in: urlHashes },
    },
    select: {
      personId: true,
      urlHash: true,
      verdict: true,
      stage: true,
      aboutPerson: true,
      aiRelevant: true,
      quality: true,
      reason: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const latest = new Map<string, LatestAudit>();
  for (const row of rows) {
    const key = keyFor(row.personId, row.urlHash);
    if (!latest.has(key)) latest.set(key, row);
  }
  return latest;
}

function verdictCounts(audits: Iterable<LatestAudit>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const audit of audits) counts[audit.verdict] = (counts[audit.verdict] || 0) + 1;
  return counts;
}

async function auditMissingItems(items: RawYoutubeItem[], latestBefore: Map<string, LatestAudit>, options: Options): Promise<AuditStats> {
  const stats: AuditStats = {
    people: 0,
    input: 0,
    audited: 0,
    keep: 0,
    review: 0,
    reject: 0,
    duplicate: 0,
    sourceRejected: 0,
    l0Rejected: 0,
  };

  if (options.skipAudit) return stats;

  const candidateItems = options.includeAudited
    ? items
    : items.filter(item => !latestBefore.has(keyFor(item.personId, item.urlHash)));
  const groups = groupByPerson(candidateItems);
  stats.people = groups.length;
  stats.input = candidateItems.length;

  for (const [index, group] of groups.entries()) {
    const person = group[0].person;
    const normalized = group.map(toNormalizedItem);
    console.log(`[audit ${index + 1}/${groups.length}] ${person.name}: ${normalized.length} youtube items`);

    const result = await cleanItems(normalized, toPersonContext(person), {
      persistAudit: options.execute,
      personId: person.id,
      existingUrlHashes: new Set(),
      simhashThreshold: 3,
    });

    stats.keep += result.semantic?.stats.keep ?? result.stats.approved;
    stats.review += result.semantic?.stats.review ?? result.stats.semanticReview;
    stats.reject += result.semantic?.stats.reject ?? result.stats.semanticRejected;
    stats.duplicate += result.stats.dedupDropped;
    stats.sourceRejected += result.stats.sourceQualityRejected;
    stats.l0Rejected += result.stats.l0Rejected;
    stats.audited += group.length;
  }

  return stats;
}

async function markProcessed(items: RawYoutubeItem[], latestAudits: Map<string, LatestAudit>, options: Options): Promise<number> {
  if (!options.execute || !options.markProcessed) return 0;

  const ids = items
    .filter(item => !item.processed && latestAudits.has(keyFor(item.personId, item.urlHash)))
    .map(item => item.id);
  if (ids.length === 0) return 0;

  const result = await prisma.rawPoolItem.updateMany({
    where: { id: { in: ids } },
    data: { processed: true },
  });
  return result.count;
}

async function materializeKeepItems(
  items: RawYoutubeItem[],
  latestAudits: Map<string, LatestAudit>,
  options: Options
): Promise<{ materializable: number; upserted: number; samples: Array<{ person: string; title: string }> }> {
  if (options.skipMaterialize) return { materializable: 0, upserted: 0, samples: [] };

  const keepItems = items.filter(item => latestAudits.get(keyFor(item.personId, item.urlHash))?.verdict === 'keep');
  const samples = keepItems.slice(0, 5).map(item => ({ person: item.person.name, title: item.title }));

  if (!options.execute) {
    return { materializable: keepItems.length, upserted: 0, samples };
  }

  let upserted = 0;
  let failed = 0;
  for (const item of keepItems) {
    const metadata = asRecord(item.metadata);
    const audit = latestAudits.get(keyFor(item.personId, item.urlHash));
    const confidence = confidenceFromAudit(audit, metadata);
    const metadataTags = Array.isArray(metadata.tags)
      ? metadata.tags.filter((tag): tag is string => typeof tag === 'string')
      : [];

    const eventData = {
      eventType: 'video',
      sourceType: SOURCE_TYPE,
      title: sanitizeText(item.title),
      summary: buildSummary(item.text),
      url: sanitizeText(item.url),
      occurredAt: item.publishedAt || item.fetchedAt,
      detectedAt: item.fetchedAt,
      topics: uniqueStrings([...metadataTags, ...(item.person.topics || [])]).slice(0, 8),
      organizations: uniqueStrings(item.person.organization || []).slice(0, 6),
      confidence,
      evidenceNote: typeof metadata.evidenceNote === 'string' ? sanitizeNullableText(metadata.evidenceNote) : null,
      reviewStatus: reviewStatusFromConfidence(confidence),
      metadata: {
        sourceLabel: 'YouTube',
        rawPoolItemId: item.id,
        qaStage: sanitizeNullableText(audit?.stage),
        qaReason: sanitizeNullableText(audit?.reason),
        qaScores: {
          aboutPerson: audit?.aboutPerson ?? null,
          aiRelevant: audit?.aiRelevant ?? null,
          quality: audit?.quality ?? null,
        },
      },
    } satisfies Omit<Prisma.ActivityEventCreateInput, 'person' | 'sourceItem'>;

    try {
      await prisma.activityEvent.upsert({
        where: { sourceItemId: item.id },
        create: {
          personId: item.personId,
          sourceItemId: item.id,
          ...eventData,
        },
        update: eventData,
      });
      upserted++;
    } catch (error) {
      failed++;
      console.warn(
        `[materialize] failed ${item.person.name} | ${sanitizeText(item.title).slice(0, 100)} | ${item.url}: ${(error as Error).message?.slice(0, 180)}`
      );
    }
  }

  if (failed > 0) console.warn(`[materialize] failed items: ${failed}`);
  return { materializable: keepItems.length, upserted, samples };
}

async function main() {
  const options = parseOptions();
  console.log(`Recent YouTube post-process | since=${options.since.toISOString()} | ${options.execute ? 'execute' : 'dry-run'}${options.summaryOnly ? ' | summary-only' : ''}`);

  const items = await loadRecentItems(options);
  const latestBefore = await loadLatestAudits(items);
  const auditedBefore = items.filter(item => latestBefore.has(keyFor(item.personId, item.urlHash))).length;

  console.log(`Recent youtube items: ${items.length}`);
  console.log(`People: ${groupByPerson(items).length}`);
  console.log(`Audited before: ${auditedBefore}/${items.length}`);
  console.log(`Latest verdicts before: ${JSON.stringify(verdictCounts(latestBefore.values()))}`);

  if (options.summaryOnly || items.length === 0) return;

  const auditStats = await auditMissingItems(items, latestBefore, options);
  const latestAfter = await loadLatestAudits(items);
  const auditedAfter = items.filter(item => latestAfter.has(keyFor(item.personId, item.urlHash))).length;
  const processedMarked = await markProcessed(items, latestAfter, options);
  const materialized = await materializeKeepItems(items, latestAfter, options);

  console.log('\nDone');
  console.log(`Audit input: ${auditStats.input} items across ${auditStats.people} people`);
  console.log(`Audit result: keep=${auditStats.keep}, review=${auditStats.review}, reject=${auditStats.reject}, duplicate=${auditStats.duplicate}, sourceReject=${auditStats.sourceRejected}, l0Reject=${auditStats.l0Rejected}`);
  console.log(`Audited after: ${auditedAfter}/${items.length}`);
  console.log(`Latest verdicts after: ${JSON.stringify(verdictCounts(latestAfter.values()))}`);
  console.log(`Processed marked: ${processedMarked}`);
  console.log(`Activity materializable keep items: ${materialized.materializable}`);
  console.log(`Activity upserted: ${materialized.upserted}`);
  if (materialized.samples.length > 0) {
    console.log('Activity samples:');
    for (const sample of materialized.samples) {
      console.log(`  - ${sample.person}: ${sample.title.slice(0, 100)}`);
    }
  }
}

main()
  .catch(async error => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
