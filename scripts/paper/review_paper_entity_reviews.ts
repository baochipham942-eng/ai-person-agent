#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
import { writeFile } from 'node:fs/promises';

const prisma = new PrismaClient();
const REVIEW_STATUSES = ['needs_review', 'confirmed', 'rejected'] as const;
const ENTITY_KINDS = ['person', 'organization'] as const;

type ReviewStatus = typeof REVIEW_STATUSES[number];
type EntityKind = typeof ENTITY_KINDS[number];

interface Options {
  limit: number;
  status: ReviewStatus | 'all' | 'open';
  entityKind: EntityKind | 'all';
  format: 'json' | 'table';
  summaryOutputPath: string | null;
  decisionTemplatePath: string | null;
  reviewPackPath: string | null;
  help: boolean;
}

interface QueueItem {
  id: string;
  severity: 'high' | 'medium' | 'low';
  score: number;
  entityName: string;
  entityKind: EntityKind;
  mentionType: string;
  reviewStatus: string;
  matchReason: string;
  confidence: number;
  source: {
    id: string;
    title: string;
    url: string;
    href: string;
    sourceType: string;
    person: {
      id: string;
      name: string;
    };
  };
  candidatePeople: Array<{
    id: string;
    name: string;
    href: string;
    matchReason: string;
    confidence: number;
  }>;
  candidateOrganizations: Array<{
    id: string;
    name: string;
    matchReason: string;
    confidence: number;
  }>;
  confirmedPerson: {
    id: string;
    name: string;
    href: string;
  } | null;
  confirmedOrganization: {
    id: string;
    name: string;
  } | null;
  evidenceQuote: string | null;
  issues: Array<{
    type: string;
    label: string;
    detail: string;
  }>;
  recommendation: 'confirm' | 'review' | 'reject';
}

interface PaperEntityReviewQueueRow {
  id: string;
  entityName: string;
  entityKind: string;
  mentionType: string;
  matchReason: string;
  confidence: number;
  candidatePeople: unknown;
  candidateOrganizations: unknown;
  reviewStatus: string;
  evidenceQuote: string | null;
  updatedAt: Date;
  confirmedPerson: {
    id: string;
    name: string;
  } | null;
  confirmedOrganization: {
    id: string;
    name: string;
  } | null;
  sourceItem: {
    id: string;
    sourceType: string;
    title: string;
    url: string;
    person: {
      id: string;
      name: string;
    };
  };
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const snapshot = await loadReviewQueue(options);
  if (options.summaryOutputPath) {
    await writeFile(options.summaryOutputPath, JSON.stringify(buildSummary(snapshot), null, 2));
    console.error(`Wrote paper entity review summary: ${options.summaryOutputPath}`);
  }
  if (options.decisionTemplatePath) {
    await writeFile(options.decisionTemplatePath, JSON.stringify(buildDecisionTemplate(snapshot), null, 2));
    console.error(`Wrote paper entity decision template: ${options.decisionTemplatePath}`);
  }
  if (options.reviewPackPath) {
    await writeFile(options.reviewPackPath, JSON.stringify(buildReviewPack(snapshot), null, 2));
    console.error(`Wrote paper entity review pack: ${options.reviewPackPath}`);
  }

  if (options.format === 'json') {
    console.log(JSON.stringify(snapshot, null, 2));
  } else {
    printTable(snapshot.items);
  }
}

async function loadReviewQueue(options: Options) {
  const rows = await withNeonWakeup(() => prisma.paperEntityReview.findMany({
    where: {
      ...(options.status === 'all'
        ? {}
        : options.status === 'open'
          ? { reviewStatus: 'needs_review' }
          : { reviewStatus: options.status }),
      ...(options.entityKind === 'all' ? {} : { entityKind: options.entityKind }),
    },
    select: {
      id: true,
      entityName: true,
      entityKind: true,
      mentionType: true,
      matchReason: true,
      confidence: true,
      candidatePeople: true,
      candidateOrganizations: true,
      reviewStatus: true,
      evidenceQuote: true,
      updatedAt: true,
      confirmedPerson: {
        select: {
          id: true,
          name: true,
        },
      },
      confirmedOrganization: {
        select: {
          id: true,
          name: true,
        },
      },
      sourceItem: {
        select: {
          id: true,
          sourceType: true,
          title: true,
          url: true,
          person: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: [
      { reviewStatus: 'asc' },
      { confidence: 'asc' },
      { updatedAt: 'desc' },
    ],
    take: Math.max(options.limit, 1),
  }));

  const items = rows
    .map(row => toQueueItem(row))
    .sort((left, right) => right.score - left.score || left.entityName.localeCompare(right.entityName));

  return {
    generatedAt: new Date().toISOString(),
    params: {
      limit: options.limit,
      status: options.status,
      entityKind: options.entityKind,
    },
    stats: buildStats(items),
    items,
  };
}

function toQueueItem(row: PaperEntityReviewQueueRow): QueueItem {
  const candidatePeople = parseCandidatePeople(row.candidatePeople);
  const candidateOrganizations = parseCandidateOrganizations(row.candidateOrganizations);
  const issues = buildIssues(row, candidatePeople.length, candidateOrganizations.length);
  const severity = issues.some(issue => issue.type === 'no_candidate' || issue.type === 'ambiguous_candidate')
    ? 'high'
    : row.reviewStatus === 'needs_review'
      ? 'medium'
      : 'low';
  const recommendation = recommendedDecision(row, candidatePeople.length, candidateOrganizations.length);

  return {
    id: row.id,
    severity,
    score: scoreItem(row, severity),
    entityName: row.entityName,
    entityKind: normalizeEntityKind(row.entityKind),
    mentionType: row.mentionType,
    reviewStatus: row.reviewStatus,
    matchReason: row.matchReason,
    confidence: row.confidence,
    source: {
      id: row.sourceItem.id,
      title: row.sourceItem.title,
      url: row.sourceItem.url,
      href: `/source/paper/${row.sourceItem.id}`,
      sourceType: row.sourceItem.sourceType,
      person: row.sourceItem.person,
    },
    candidatePeople,
    candidateOrganizations,
    confirmedPerson: row.confirmedPerson ? {
      id: row.confirmedPerson.id,
      name: row.confirmedPerson.name,
      href: `/person/${row.confirmedPerson.id}`,
    } : null,
    confirmedOrganization: row.confirmedOrganization,
    evidenceQuote: row.evidenceQuote,
    issues,
    recommendation,
  };
}

function buildIssues(row: PaperEntityReviewQueueRow, candidatePeopleCount: number, candidateOrganizationsCount: number) {
  const candidateCount = row.entityKind === 'organization' ? candidateOrganizationsCount : candidatePeopleCount;
  const issues = [];
  if (row.reviewStatus === 'needs_review') {
    issues.push({
      type: 'needs_review_status',
      label: '待复核',
      detail: '这条论文实体候选尚未人工确认，不能进入人物或机构结论。',
    });
  }
  if (candidateCount === 0) {
    issues.push({
      type: 'no_candidate',
      label: '无站内候选',
      detail: '当前实体名没有匹配到站内 People 或 Organization，适合保留待复核或拒绝。',
    });
  }
  if (candidateCount > 1) {
    issues.push({
      type: 'ambiguous_candidate',
      label: '多候选',
      detail: `当前实体名匹配到 ${candidateCount} 个站内候选，需要人工选择一个确认对象。`,
    });
  }
  if (row.matchReason.includes('unmatched')) {
    issues.push({
      type: 'unmatched_entity',
      label: '未匹配',
      detail: '脚本未找到强候选，不应自动绑定实体。',
    });
  }
  if (issues.length === 0) {
    issues.push({
      type: 'single_candidate',
      label: '单候选',
      detail: '只有一个站内候选，可快速确认或抽查后确认。',
    });
  }
  return issues;
}

function recommendedDecision(row: PaperEntityReviewQueueRow, candidatePeopleCount: number, candidateOrganizationsCount: number) {
  const candidateCount = row.entityKind === 'organization' ? candidateOrganizationsCount : candidatePeopleCount;
  if (row.reviewStatus === 'rejected') return 'reject';
  if (row.reviewStatus === 'confirmed') return 'confirm';
  return candidateCount === 1 && !row.matchReason.includes('ambiguous') ? 'confirm' : 'review';
}

function scoreItem(row: { reviewStatus: string; confidence: number; matchReason: string }, severity: QueueItem['severity']): number {
  const statusScore = row.reviewStatus === 'needs_review' ? 40 : 5;
  const severityScore = severity === 'high' ? 40 : severity === 'medium' ? 20 : 5;
  const matchScore = row.matchReason.includes('ambiguous') ? 15 : row.matchReason.includes('unmatched') ? 20 : 8;
  return statusScore + severityScore + matchScore + Math.round((1 - row.confidence) * 10);
}

function buildStats(items: QueueItem[]) {
  return {
    total: items.length,
    high: items.filter(item => item.severity === 'high').length,
    medium: items.filter(item => item.severity === 'medium').length,
    low: items.filter(item => item.severity === 'low').length,
    byStatus: countBy(items, item => item.reviewStatus),
    byEntityKind: countBy(items, item => item.entityKind),
    byRecommendation: countBy(items, item => item.recommendation),
  };
}

function buildSummary(snapshot: Awaited<ReturnType<typeof loadReviewQueue>>) {
  return {
    generatedAt: snapshot.generatedAt,
    params: snapshot.params,
    stats: snapshot.stats,
    topItems: snapshot.items.slice(0, 10).map(item => ({
      id: item.id,
      severity: item.severity,
      sourceTitle: item.source.title,
      entityName: item.entityName,
      entityKind: item.entityKind,
      confidence: item.confidence,
      recommendation: item.recommendation,
    })),
  };
}

function buildDecisionTemplate(snapshot: Awaited<ReturnType<typeof loadReviewQueue>>) {
  return {
    generatedAt: snapshot.generatedAt,
    instructions: [
      'Set reviewStatus to confirmed, rejected, or needs_review.',
      'For confirmed person rows, set confirmedPersonId to an existing People id.',
      'For confirmed organization rows, set confirmedOrganizationId to an existing Organization id.',
      'Keep execute=false until the dry-run summary looks right.',
      'Use scripts/paper/apply_paper_entity_review_decisions.ts --file=<path> --execute for writes.',
    ],
    decisions: snapshot.items.map(item => {
      const suggestedPerson = item.entityKind === 'person' && item.candidatePeople.length === 1 ? item.candidatePeople[0] : null;
      const suggestedOrganization = item.entityKind === 'organization' && item.candidateOrganizations.length === 1 ? item.candidateOrganizations[0] : null;
      return {
        action: 'paper_entity_review',
        paperEntityReviewId: item.id,
        rawPoolItemId: item.source.id,
        sourceTitle: item.source.title,
        sourceHref: item.source.href,
        entityName: item.entityName,
        entityKind: item.entityKind,
        mentionType: item.mentionType,
        currentReviewStatus: item.reviewStatus,
        reviewStatus: item.recommendation === 'confirm' ? 'confirmed' : 'needs_review',
        confirmedPersonId: suggestedPerson?.id ?? null,
        confirmedOrganizationId: suggestedOrganization?.id ?? null,
        confidence: item.confidence,
        reason: item.issues.map(issue => issue.label).join('; '),
      };
    }),
  };
}

function buildReviewPack(snapshot: Awaited<ReturnType<typeof loadReviewQueue>>) {
  return {
    generatedAt: snapshot.generatedAt,
    params: snapshot.params,
    stats: snapshot.stats,
    items: snapshot.items.map(item => ({
      id: item.id,
      severity: item.severity,
      source: item.source,
      entityName: item.entityName,
      entityKind: item.entityKind,
      mentionType: item.mentionType,
      reviewStatus: item.reviewStatus,
      confidence: item.confidence,
      matchReason: item.matchReason,
      candidatePeople: item.candidatePeople,
      candidateOrganizations: item.candidateOrganizations,
      confirmedPerson: item.confirmedPerson,
      confirmedOrganization: item.confirmedOrganization,
      evidenceQuote: item.evidenceQuote,
      issues: item.issues,
      suggestedDecision: {
        reviewStatus: item.recommendation === 'confirm' ? 'confirmed' : 'needs_review',
        reason: item.issues.map(issue => issue.detail).join(' '),
      },
    })),
  };
}

function printTable(items: QueueItem[]) {
  if (items.length === 0) {
    console.log('No PaperEntityReview items.');
    return;
  }
  for (const item of items) {
    console.log([
      item.severity.toUpperCase().padEnd(6),
      item.reviewStatus.padEnd(12),
      item.entityKind.padEnd(12),
      item.mentionType.padEnd(14),
      item.confidence.toFixed(2),
      item.entityName.padEnd(28),
      item.source.title,
    ].join('  '));
  }
}

function parseCandidatePeople(value: unknown): QueueItem['candidatePeople'] {
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    const record = asRecord(item);
    const id = stringOrNull(record.id);
    const name = stringOrNull(record.name);
    if (!id || !name) return null;
    return {
      id,
      name,
      href: stringOrNull(record.href) || `/person/${id}`,
      matchReason: stringOrNull(record.matchReason) || 'candidate',
      confidence: numberOrNull(record.confidence) ?? 0.7,
    };
  }).filter((item): item is QueueItem['candidatePeople'][number] => Boolean(item));
}

function parseCandidateOrganizations(value: unknown): QueueItem['candidateOrganizations'] {
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    const record = asRecord(item);
    const id = stringOrNull(record.id);
    const name = stringOrNull(record.name);
    if (!id || !name) return null;
    return {
      id,
      name,
      matchReason: stringOrNull(record.matchReason) || 'candidate',
      confidence: numberOrNull(record.confidence) ?? 0.7,
    };
  }).filter((item): item is QueueItem['candidateOrganizations'][number] => Boolean(item));
}

function normalizeEntityKind(value: string): EntityKind {
  return value === 'organization' ? 'organization' : 'person';
}

function countBy<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

async function withNeonWakeup<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (!isNeonResetError(error)) throw error;
    await prisma.people.count();
    return action();
  }
}

function isNeonResetError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('ECONNRESET')
    || message.includes('Connection terminated unexpectedly')
    || message.includes('fetch failed')
    || message.includes('UND_ERR_SOCKET')
    || message.includes("Can't reach database server")
    || message.includes('P1001');
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    limit: 50,
    status: 'open',
    entityKind: 'all',
    format: 'table',
    summaryOutputPath: null,
    decisionTemplatePath: null,
    reviewPackPath: null,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--format=json') options.format = 'json';
    else if (arg === '--format=table') options.format = 'table';
    else if (arg.startsWith('--limit=')) options.limit = positiveInt(arg.slice('--limit='.length), options.limit);
    else if (arg.startsWith('--status=')) options.status = parseStatus(arg.slice('--status='.length));
    else if (arg.startsWith('--entity-kind=')) options.entityKind = parseEntityKind(arg.slice('--entity-kind='.length));
    else if (arg.startsWith('--summary-output=')) options.summaryOutputPath = nonEmpty(arg.slice('--summary-output='.length));
    else if (arg.startsWith('--decision-template=')) options.decisionTemplatePath = nonEmpty(arg.slice('--decision-template='.length));
    else if (arg.startsWith('--review-pack-output=')) options.reviewPackPath = nonEmpty(arg.slice('--review-pack-output='.length));
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function parseStatus(value: string): Options['status'] {
  if (value === 'all' || value === 'open' || REVIEW_STATUSES.includes(value as ReviewStatus)) return value as Options['status'];
  throw new Error(`Unsupported --status=${value}`);
}

function parseEntityKind(value: string): Options['entityKind'] {
  if (value === 'all' || ENTITY_KINDS.includes(value as EntityKind)) return value as Options['entityKind'];
  throw new Error(`Unsupported --entity-kind=${value}`);
}

function positiveInt(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function nonEmpty(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function printHelp() {
  console.log(`
Usage:
  bunx tsx scripts/paper/review_paper_entity_reviews.ts --limit=50
  bunx tsx scripts/paper/review_paper_entity_reviews.ts --status=all --entity-kind=organization --format=json
  bunx tsx scripts/paper/review_paper_entity_reviews.ts --decision-template=/tmp/paper-entity-decisions.json --review-pack-output=/tmp/paper-entity-review-pack.json

Default mode is read-only and lists open PaperEntityReview rows with reviewStatus=needs_review.
`);
}
