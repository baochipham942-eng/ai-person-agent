#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
import { writeFile } from 'node:fs/promises';

const prisma = new PrismaClient();
const REVIEW_STATUSES = ['auto', 'needs_review', 'confirmed', 'rejected'] as const;
const REVIEW_ROLES = ['paper_foundation', 'implementation_source', 'benchmark_source', 'docs_source'] as const;

type ReviewStatus = typeof REVIEW_STATUSES[number];
type ReviewRole = typeof REVIEW_ROLES[number];

interface Options {
  limit: number;
  status: ReviewStatus | 'all' | 'open';
  role: ReviewRole | 'all';
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
  role: string;
  reviewStatus: string;
  matchReason: string;
  confidence: number;
  product: {
    id: string;
    slug: string;
    name: string;
    type: string;
    organizationName: string | null;
    href: string;
  };
  source: {
    id: string;
    sourceType: string;
    title: string;
    url: string;
    href: string;
    publishedAt: string | null;
    person: {
      id: string;
      name: string;
    };
  };
  summary: string | null;
  evidenceQuote: string | null;
  issues: Array<{
    type: string;
    label: string;
    detail: string;
  }>;
  recommendation: 'confirm' | 'review' | 'reject';
}

interface ProductEvidenceQueueRow {
  id: string;
  role: string;
  matchReason: string;
  confidence: number;
  summary: string | null;
  evidenceQuote: string | null;
  reviewStatus: string;
  product: {
    id: string;
    slug: string;
    name: string;
    type: string;
    organizationName: string | null;
  };
  rawPoolItem: {
    id: string;
    sourceType: string;
    title: string;
    url: string;
    publishedAt: Date | null;
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
    console.error(`Wrote product evidence summary: ${options.summaryOutputPath}`);
  }
  if (options.decisionTemplatePath) {
    await writeFile(options.decisionTemplatePath, JSON.stringify(buildDecisionTemplate(snapshot), null, 2));
    console.error(`Wrote product evidence decision template: ${options.decisionTemplatePath}`);
  }
  if (options.reviewPackPath) {
    await writeFile(options.reviewPackPath, JSON.stringify(buildReviewPack(snapshot), null, 2));
    console.error(`Wrote product evidence review pack: ${options.reviewPackPath}`);
  }

  if (options.format === 'json') {
    console.log(JSON.stringify(snapshot, null, 2));
  } else {
    printTable(snapshot.items);
  }
}

async function loadReviewQueue(options: Options) {
  const rows = await withNeonWakeup(() => prisma.productEvidenceSource.findMany({
    where: {
      ...(options.status === 'all'
        ? {}
        : options.status === 'open'
          ? { reviewStatus: { in: ['auto', 'needs_review'] } }
          : { reviewStatus: options.status }),
      ...(options.role === 'all' ? {} : { role: options.role }),
    },
    select: {
      id: true,
      role: true,
      matchReason: true,
      confidence: true,
      summary: true,
      evidenceQuote: true,
      reviewStatus: true,
      updatedAt: true,
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          type: true,
          organizationName: true,
        },
      },
      rawPoolItem: {
        select: {
          id: true,
          sourceType: true,
          title: true,
          url: true,
          publishedAt: true,
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
      { confidence: 'desc' },
      { updatedAt: 'desc' },
    ],
    take: Math.max(options.limit, 1),
  }));

  const items = rows
    .map(row => toQueueItem(row))
    .sort((left, right) => right.score - left.score || left.product.slug.localeCompare(right.product.slug));

  return {
    generatedAt: new Date().toISOString(),
    params: {
      limit: options.limit,
      status: options.status,
      role: options.role,
    },
    stats: buildStats(items),
    items,
  };
}

function toQueueItem(row: ProductEvidenceQueueRow): QueueItem {
  const source = row.rawPoolItem;
  const issues = buildIssues(row);
  const severity = issues.some(issue => issue.type === 'low_confidence' || issue.type === 'broad_title_match')
    ? 'high'
    : issues.some(issue => issue.type === 'auto_status' || issue.type === 'needs_review_status')
      ? 'medium'
      : 'low';
  const recommendation = severity === 'high' ? 'review' : row.reviewStatus === 'confirmed' ? 'confirm' : 'review';
  const sourceHref = source.sourceType === 'openalex' ? `/source/paper/${source.id}` : source.url;

  return {
    id: row.id,
    severity,
    score: scoreItem(row, severity),
    role: row.role,
    reviewStatus: row.reviewStatus,
    matchReason: row.matchReason,
    confidence: row.confidence,
    product: {
      id: row.product.id,
      slug: row.product.slug,
      name: row.product.name,
      type: row.product.type,
      organizationName: row.product.organizationName,
      href: `/work/${row.product.slug}`,
    },
    source: {
      id: source.id,
      sourceType: source.sourceType,
      title: source.title,
      url: source.url,
      href: sourceHref,
      publishedAt: source.publishedAt ? source.publishedAt.toISOString().slice(0, 10) : null,
      person: {
        id: source.person.id,
        name: source.person.name,
      },
    },
    summary: row.summary,
    evidenceQuote: row.evidenceQuote,
    issues,
    recommendation,
  };
}

function buildIssues(row: {
  role: string;
  matchReason: string;
  confidence: number;
  reviewStatus: string;
  rawPoolItem: { sourceType: string; title: string; url: string };
}) {
  const issues = [];
  if (row.reviewStatus === 'auto') {
    issues.push({
      type: 'auto_status',
      label: '自动入库',
      detail: '这条证据由脚本自动匹配，进入页面前应抽样确认。',
    });
  }
  if (row.reviewStatus === 'needs_review') {
    issues.push({
      type: 'needs_review_status',
      label: '待复核',
      detail: '这条证据已被标记为待复核，需要人工决定 confirmed 或 rejected。',
    });
  }
  if (row.confidence < 0.88) {
    issues.push({
      type: 'low_confidence',
      label: '置信度偏低',
      detail: `当前置信度为 ${row.confidence.toFixed(2)}，不足以直接作为强证据。`,
    });
  }
  if (row.matchReason === 'title_mention' && row.rawPoolItem.sourceType === 'github') {
    issues.push({
      type: 'repo_name_match',
      label: '仓库名匹配',
      detail: 'GitHub 来源按仓库名匹配，仍需确认它是官方或代表性实现。',
    });
  }
  if (row.matchReason === 'title_mention' && row.role === 'paper_foundation') {
    issues.push({
      type: 'broad_title_match',
      label: '标题匹配',
      detail: '论文来源来自标题匹配，需要确认它确实是该作品的方法根基。',
    });
  }
  if (issues.length === 0) {
    issues.push({
      type: 'confirmed_signal',
      label: '可快速确认',
      detail: '匹配方式和置信度都较强，适合快速确认或抽查。',
    });
  }
  return issues;
}

function scoreItem(row: { reviewStatus: string; confidence: number; role: string }, severity: QueueItem['severity']): number {
  const statusScore = row.reviewStatus === 'needs_review' ? 40 : row.reviewStatus === 'auto' ? 25 : 5;
  const severityScore = severity === 'high' ? 40 : severity === 'medium' ? 20 : 5;
  const roleScore = row.role === 'paper_foundation' ? 10 : 6;
  return statusScore + severityScore + roleScore + Math.round(row.confidence * 10);
}

function buildStats(items: QueueItem[]) {
  return {
    total: items.length,
    high: items.filter(item => item.severity === 'high').length,
    medium: items.filter(item => item.severity === 'medium').length,
    low: items.filter(item => item.severity === 'low').length,
    byStatus: countBy(items, item => item.reviewStatus),
    byRole: countBy(items, item => item.role),
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
      product: item.product.slug,
      sourceTitle: item.source.title,
      role: item.role,
      confidence: item.confidence,
      recommendation: item.recommendation,
    })),
  };
}

function buildDecisionTemplate(snapshot: Awaited<ReturnType<typeof loadReviewQueue>>) {
  return {
    generatedAt: snapshot.generatedAt,
    instructions: [
      'Set reviewStatus to confirmed, rejected, needs_review, or auto.',
      'Keep execute=false until the dry-run summary looks right.',
      'Use scripts/paper/apply_product_evidence_decisions.ts --file=<path> --execute for writes.',
    ],
    decisions: snapshot.items.map(item => ({
      action: 'product_evidence_review',
      productEvidenceSourceId: item.id,
      productSlug: item.product.slug,
      productName: item.product.name,
      rawPoolItemId: item.source.id,
      sourceTitle: item.source.title,
      role: item.role,
      currentReviewStatus: item.reviewStatus,
      reviewStatus: item.recommendation === 'confirm' ? 'confirmed' : 'needs_review',
      confidence: item.confidence,
      reason: item.issues.map(issue => issue.label).join('; '),
    })),
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
      product: item.product,
      source: item.source,
      role: item.role,
      reviewStatus: item.reviewStatus,
      confidence: item.confidence,
      matchReason: item.matchReason,
      summary: item.summary,
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
    console.log('No ProductEvidenceSource review items.');
    return;
  }
  for (const item of items) {
    console.log([
      item.severity.toUpperCase().padEnd(6),
      item.reviewStatus.padEnd(12),
      item.role.padEnd(22),
      item.product.slug.padEnd(24),
      item.source.sourceType.padEnd(8),
      item.confidence.toFixed(2),
      item.source.title,
    ].join('  '));
  }
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
    role: 'all',
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
    else if (arg.startsWith('--role=')) options.role = parseRole(arg.slice('--role='.length));
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

function parseRole(value: string): Options['role'] {
  if (value === 'all' || REVIEW_ROLES.includes(value as ReviewRole)) return value as Options['role'];
  throw new Error(`Unsupported --role=${value}`);
}

function positiveInt(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function nonEmpty(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function printHelp() {
  console.log(`
Usage:
  bunx tsx scripts/paper/review_product_evidence_sources.ts --limit=50
  bunx tsx scripts/paper/review_product_evidence_sources.ts --status=all --format=json
  bunx tsx scripts/paper/review_product_evidence_sources.ts --decision-template=/tmp/product-evidence-decisions.json --review-pack-output=/tmp/product-evidence-review-pack.json

Default mode is read-only and lists open ProductEvidenceSource rows with reviewStatus=auto or needs_review.
`);
}
