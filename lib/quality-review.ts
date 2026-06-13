import { prisma } from '@/lib/db/prisma';
import { normalizeDirectoryTopics } from '@/lib/person-directory-config';

const ACTIVITY_SOURCE_TYPES = ['openalex', 'github', 'youtube', 'exa', 'podcast', 'career'];
const TRUSTED_RELATION_STATUSES = ['trusted', 'confirmed'];

const SEVERITY_RANK: Record<QualitySeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const SEVERITY_SCORE: Record<QualitySeverity, number> = {
  critical: 100,
  high: 50,
  medium: 20,
  low: 8,
};

export type QualitySeverity = 'critical' | 'high' | 'medium' | 'low';

export type QualityIssueType =
  | 'missing_profile'
  | 'stale_profile'
  | 'missing_relation_evidence'
  | 'low_confidence_trusted_relation'
  | 'needs_review_relation'
  | 'missing_activity_source'
  | 'thin_recent_activity'
  | 'qa_review_backlog'
  | 'card_source_gap';

export interface QualityReviewSample {
  id: string;
  label: string;
  detail?: string | null;
  href?: string | null;
}

export interface QualityReviewIssue {
  key: string;
  type: QualityIssueType;
  label: string;
  severity: QualitySeverity;
  detail: string;
  count: number;
  sample: QualityReviewSample[];
}

export interface QualityReviewItem {
  person: {
    id: string;
    name: string;
    currentTitle: string | null;
    organization: string[];
    topics: string[];
    influenceScore: number;
    weeklyViewCount: number;
    viewCount: number;
    updatedAt: string;
  };
  severity: QualitySeverity;
  score: number;
  issues: QualityReviewIssue[];
  metrics: {
    activeCardCount: number;
    cardSourceCoverage: number;
    trustedRelationCount: number;
    relationEvidenceCoverage: number;
    relationEvidenceMissingCount: number;
    lowConfidenceTrustedCount: number;
    needsReviewRelationCount: number;
    recentActivityCount: number;
    activitySourceCoverage: number;
    activityMissingSourceCount: number;
    qaReviewCount: number;
  };
}

export interface QualityReviewSnapshot {
  generatedAt: string;
  params: {
    limit: number;
    days: number;
    staleDays: number;
    severity: QualitySeverity | 'all';
    issueType: QualityIssueType | 'all';
  };
  stats: {
    reviewedPeople: number;
    queuedPeople: number;
    totalIssues: number;
    criticalPeople: number;
    highPeople: number;
    mediumPeople: number;
    lowPeople: number;
    relationEvidenceCoverage: number;
    activitySourceCoverage: number;
    cardSourceCoverage: number;
    qaReviewRows: number;
  };
  issueBreakdown: Array<{
    type: QualityIssueType;
    label: string;
    severity: QualitySeverity;
    people: number;
    count: number;
  }>;
  items: QualityReviewItem[];
}

type PersonRow = Awaited<ReturnType<typeof loadPeople>>[number];
type RelationRow = Awaited<ReturnType<typeof loadRelations>>[number];
type ActivityRow = Awaited<ReturnType<typeof loadRecentActivity>>[number];
type QaReviewRow = Awaited<ReturnType<typeof loadQaReviewRows>>[number];

export async function fetchQualityReviewQueue(params: {
  limit?: number;
  days?: number;
  staleDays?: number;
  severity?: QualitySeverity | 'all' | null;
  issueType?: QualityIssueType | 'all' | null;
} = {}): Promise<QualityReviewSnapshot> {
  const options = {
    limit: clampInteger(params.limit, 1, 100, 40),
    days: clampInteger(params.days, 1, 365, 30),
    staleDays: clampInteger(params.staleDays, 7, 730, 90),
    severity: normalizeSeverity(params.severity),
    issueType: normalizeIssueType(params.issueType),
  };
  const since = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000);
  const people = await loadPeople(Math.max(options.limit * 4, 80));
  const personIds = people.map(person => person.id);

  if (personIds.length === 0) {
    return emptySnapshot(options);
  }

  const qaAuditLogReady = await hasTable('QAAuditLog');
  const [relations, recentActivity, qaReviewGroups, qaReviewRows] = await Promise.all([
    loadRelations(personIds),
    loadRecentActivity(personIds, since),
    qaAuditLogReady ? loadQaReviewGroups(personIds, since) : Promise.resolve([]),
    qaAuditLogReady ? loadQaReviewRows(personIds, since) : Promise.resolve([]),
  ]);

  const relationsByPerson = groupRelationsByPerson(relations, new Set(personIds));
  const activityByPerson = groupBy(recentActivity, item => item.personId);
  const qaReviewRowsByPerson = groupBy(qaReviewRows, item => item.personId);
  const qaReviewCountByPerson = new Map<string, number>();
  for (const group of qaReviewGroups) {
    qaReviewCountByPerson.set(group.personId, group._count._all);
  }

  const allItems = people
    .map(person => buildReviewItem({
      person,
      relations: relationsByPerson.get(person.id) || [],
      recentActivity: activityByPerson.get(person.id) || [],
      qaReviewCount: qaReviewCountByPerson.get(person.id) || 0,
      qaReviewRows: qaReviewRowsByPerson.get(person.id) || [],
      days: options.days,
      staleDays: options.staleDays,
    }))
    .filter(item => item.issues.length > 0);

  const filteredItems = allItems
    .filter(item => options.severity === 'all' || item.severity === options.severity)
    .filter(item => options.issueType === 'all' || item.issues.some(issue => issue.type === options.issueType))
    .sort((left, right) => right.score - left.score || right.person.weeklyViewCount - left.person.weeklyViewCount || left.person.name.localeCompare(right.person.name))
    .slice(0, options.limit);

  return {
    generatedAt: new Date().toISOString(),
    params: options,
    stats: buildStats(people.length, allItems),
    issueBreakdown: buildIssueBreakdown(allItems),
    items: filteredItems,
  };
}

async function loadPeople(take: number) {
  return prisma.people.findMany({
    where: {
      status: { in: ['ready', 'active'] },
    },
    select: {
      id: true,
      name: true,
      currentTitle: true,
      organization: true,
      topics: true,
      description: true,
      whyImportant: true,
      avatarUrl: true,
      influenceScore: true,
      weeklyViewCount: true,
      viewCount: true,
      updatedAt: true,
      cards: {
        where: { isActive: true },
        select: {
          id: true,
          type: true,
          title: true,
          sourceUrl: true,
        },
      },
    },
    orderBy: [
      { weeklyViewCount: 'desc' },
      { viewCount: 'desc' },
      { influenceScore: 'desc' },
      { name: 'asc' },
    ],
    take,
  });
}

async function loadRelations(personIds: string[]) {
  return prisma.personRelation.findMany({
    where: {
      OR: [
        { personId: { in: personIds } },
        { relatedPersonId: { in: personIds } },
      ],
    },
    select: {
      id: true,
      personId: true,
      relatedPersonId: true,
      relationType: true,
      reviewStatus: true,
      confidence: true,
      evidenceUrl: true,
      evidenceNote: true,
      description: true,
      source: true,
    },
    take: 5000,
  });
}

async function loadRecentActivity(personIds: string[], since: Date) {
  return prisma.rawPoolItem.findMany({
    where: {
      personId: { in: personIds },
      sourceType: { in: ACTIVITY_SOURCE_TYPES },
      fetchStatus: 'success',
      OR: [
        { publishedAt: { gte: since } },
        { fetchedAt: { gte: since } },
      ],
    },
    select: {
      id: true,
      personId: true,
      sourceType: true,
      title: true,
      url: true,
      publishedAt: true,
      fetchedAt: true,
    },
    orderBy: [{ publishedAt: 'desc' }, { fetchedAt: 'desc' }],
    take: 5000,
  });
}

async function loadQaReviewGroups(personIds: string[], since: Date) {
  return prisma.qAAuditLog.groupBy({
    by: ['personId'],
    where: {
      personId: { in: personIds },
      verdict: 'review',
      createdAt: { gte: since },
    },
    _count: { _all: true },
  });
}

async function loadQaReviewRows(personIds: string[], since: Date) {
  return prisma.qAAuditLog.findMany({
    where: {
      personId: { in: personIds },
      verdict: 'review',
      createdAt: { gte: since },
    },
    select: {
      id: true,
      personId: true,
      url: true,
      sourceType: true,
      stage: true,
      verdict: true,
      quality: true,
      reason: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });
}

async function hasTable(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT to_regclass(${`public."${tableName}"`}) IS NOT NULL AS "exists"
  `;
  return Boolean(rows[0]?.exists);
}

function buildReviewItem(params: {
  person: PersonRow;
  relations: RelationRow[];
  recentActivity: ActivityRow[];
  qaReviewCount: number;
  qaReviewRows: QaReviewRow[];
  days: number;
  staleDays: number;
}): QualityReviewItem {
  const { person, relations, recentActivity, qaReviewCount, qaReviewRows, days, staleDays } = params;
  const issues: QualityReviewIssue[] = [];
  const trustedRelations = relations.filter(relation => TRUSTED_RELATION_STATUSES.includes(relation.reviewStatus || ''));
  const relationEvidenceMissing = trustedRelations.filter(relation => !hasRelationEvidence(relation));
  const lowConfidenceTrusted = trustedRelations.filter(relation => typeof relation.confidence === 'number' && relation.confidence < 0.75);
  const needsReviewRelations = relations.filter(relation => relation.reviewStatus === 'needs_review');
  const activityMissingSource = recentActivity.filter(item => !item.url || !item.title);
  const cardsMissingSource = person.cards.filter(card => !card.sourceUrl);
  const staleCutoff = Date.now() - staleDays * 24 * 60 * 60 * 1000;

  const profileGaps = [
    !person.currentTitle && person.organization.length === 0 ? '缺当前身份' : null,
    !person.description && !person.whyImportant ? '缺人物判断文案' : null,
    !person.avatarUrl ? '缺头像' : null,
  ].filter((gap): gap is string => Boolean(gap));

  if (profileGaps.length > 0) {
    issues.push({
      key: `${person.id}:missing-profile`,
      type: 'missing_profile',
      label: '基础资料缺口',
      severity: profileGaps.length >= 2 ? 'medium' : 'low',
      detail: profileGaps.join('、'),
      count: profileGaps.length,
      sample: [],
    });
  }

  if (person.updatedAt.getTime() < staleCutoff) {
    issues.push({
      key: `${person.id}:stale-profile`,
      type: 'stale_profile',
      label: '资料过久未更新',
      severity: isHighVisibility(person) ? 'high' : 'medium',
      detail: `最近更新时间超过 ${staleDays} 天，高访问人物需要优先回看身份和来源。`,
      count: 1,
      sample: [],
    });
  }

  if (relationEvidenceMissing.length > 0) {
    issues.push({
      key: `${person.id}:missing-relation-evidence`,
      type: 'missing_relation_evidence',
      label: '可信关系缺证据',
      severity: 'high',
      detail: `${relationEvidenceMissing.length} 条 trusted/confirmed 关系没有 evidenceUrl、evidenceNote 或 description。`,
      count: relationEvidenceMissing.length,
      sample: relationEvidenceMissing.slice(0, 3).map(relation => relationSample(relation)),
    });
  }

  if (lowConfidenceTrusted.length > 0) {
    issues.push({
      key: `${person.id}:low-confidence-trusted`,
      type: 'low_confidence_trusted_relation',
      label: '可信关系置信度偏低',
      severity: 'medium',
      detail: `${lowConfidenceTrusted.length} 条 trusted/confirmed 关系 confidence 低于 0.75。`,
      count: lowConfidenceTrusted.length,
      sample: lowConfidenceTrusted.slice(0, 3).map(relation => relationSample(relation)),
    });
  }

  if (needsReviewRelations.length > 0) {
    issues.push({
      key: `${person.id}:needs-review-relations`,
      type: 'needs_review_relation',
      label: '关系待人工复核',
      severity: needsReviewRelations.length >= 5 ? 'high' : 'medium',
      detail: `${needsReviewRelations.length} 条关系仍是 needs_review，不应进入默认可信图谱。`,
      count: needsReviewRelations.length,
      sample: needsReviewRelations.slice(0, 3).map(relation => relationSample(relation)),
    });
  }

  if (activityMissingSource.length > 0) {
    issues.push({
      key: `${person.id}:missing-activity-source`,
      type: 'missing_activity_source',
      label: '近期动态缺来源',
      severity: 'critical',
      detail: `${activityMissingSource.length} 条近 ${days} 天动态缺 URL 或标题。`,
      count: activityMissingSource.length,
      sample: activityMissingSource.slice(0, 3).map(item => ({
        id: item.id,
        label: item.title || item.sourceType,
        detail: item.sourceType,
        href: item.url || null,
      })),
    });
  }

  if (isHighVisibility(person) && recentActivity.length === 0) {
    issues.push({
      key: `${person.id}:thin-recent-activity`,
      type: 'thin_recent_activity',
      label: '高关注人物近期动态薄',
      severity: 'medium',
      detail: `近 ${days} 天没有可展示动态，订阅和周报容易变空。`,
      count: 1,
      sample: [],
    });
  }

  if (person.cards.length > 0 && ratio(person.cards.length - cardsMissingSource.length, person.cards.length) < 0.8) {
    issues.push({
      key: `${person.id}:card-source-gap`,
      type: 'card_source_gap',
      label: '学习卡片来源覆盖不足',
      severity: cardsMissingSource.length >= 5 ? 'high' : 'medium',
      detail: `${cardsMissingSource.length}/${person.cards.length} 张活跃卡片缺 sourceUrl。`,
      count: cardsMissingSource.length,
      sample: cardsMissingSource.slice(0, 3).map(card => ({
        id: card.id,
        label: card.title,
        detail: card.type,
        href: null,
      })),
    });
  }

  if (qaReviewCount > 0) {
    issues.push({
      key: `${person.id}:qa-review-backlog`,
      type: 'qa_review_backlog',
      label: '语义清洗待复核',
      severity: qaReviewCount >= 10 ? 'high' : 'medium',
      detail: `近 ${days} 天有 ${qaReviewCount} 条 QAAuditLog verdict=review。`,
      count: qaReviewCount,
      sample: qaReviewRows.slice(0, 3).map(row => ({
        id: row.id,
        label: `${row.sourceType} · ${row.stage} · quality ${formatMaybeScore(row.quality)}`,
        detail: row.reason || row.url,
        href: row.url,
      })),
    });
  }

  const severity = maxSeverity(issues);
  const severityScore = issues.reduce((sum, issue) => sum + SEVERITY_SCORE[issue.severity] * Math.max(1, Math.min(issue.count, 5)), 0);
  const visibilityScore = Math.min(25, person.weeklyViewCount * 0.5) + Math.min(20, person.viewCount * 0.02) + Math.min(20, person.influenceScore * 0.2);
  const score = Number((severityScore + visibilityScore).toFixed(1));

  return {
    person: {
      id: person.id,
      name: person.name,
      currentTitle: person.currentTitle,
      organization: person.organization,
      topics: normalizeDirectoryTopics(person.topics),
      influenceScore: person.influenceScore,
      weeklyViewCount: person.weeklyViewCount,
      viewCount: person.viewCount,
      updatedAt: person.updatedAt.toISOString(),
    },
    severity,
    score,
    issues,
    metrics: {
      activeCardCount: person.cards.length,
      cardSourceCoverage: ratio(person.cards.length - cardsMissingSource.length, person.cards.length),
      trustedRelationCount: trustedRelations.length,
      relationEvidenceCoverage: ratio(trustedRelations.length - relationEvidenceMissing.length, trustedRelations.length),
      relationEvidenceMissingCount: relationEvidenceMissing.length,
      lowConfidenceTrustedCount: lowConfidenceTrusted.length,
      needsReviewRelationCount: needsReviewRelations.length,
      recentActivityCount: recentActivity.length,
      activitySourceCoverage: ratio(recentActivity.length - activityMissingSource.length, recentActivity.length),
      activityMissingSourceCount: activityMissingSource.length,
      qaReviewCount,
    },
  };
}

function buildStats(reviewedPeople: number, items: QualityReviewItem[]): QualityReviewSnapshot['stats'] {
  const relationTotals = items.reduce((acc, item) => {
    acc.trusted += item.metrics.trustedRelationCount;
    acc.missing += item.metrics.relationEvidenceMissingCount;
    return acc;
  }, { trusted: 0, missing: 0 });
  const activityTotals = items.reduce((acc, item) => {
    acc.total += item.metrics.recentActivityCount;
    acc.missing += item.metrics.activityMissingSourceCount;
    return acc;
  }, { total: 0, missing: 0 });
  const cardTotals = items.reduce((acc, item) => {
    const missing = Math.round(item.metrics.activeCardCount * (1 - item.metrics.cardSourceCoverage));
    acc.total += item.metrics.activeCardCount;
    acc.missing += missing;
    return acc;
  }, { total: 0, missing: 0 });

  return {
    reviewedPeople,
    queuedPeople: items.length,
    totalIssues: items.reduce((sum, item) => sum + item.issues.length, 0),
    criticalPeople: items.filter(item => item.severity === 'critical').length,
    highPeople: items.filter(item => item.severity === 'high').length,
    mediumPeople: items.filter(item => item.severity === 'medium').length,
    lowPeople: items.filter(item => item.severity === 'low').length,
    relationEvidenceCoverage: ratio(relationTotals.trusted - relationTotals.missing, relationTotals.trusted),
    activitySourceCoverage: ratio(activityTotals.total - activityTotals.missing, activityTotals.total),
    cardSourceCoverage: ratio(cardTotals.total - cardTotals.missing, cardTotals.total),
    qaReviewRows: items.reduce((sum, item) => sum + item.metrics.qaReviewCount, 0),
  };
}

function buildIssueBreakdown(items: QualityReviewItem[]): QualityReviewSnapshot['issueBreakdown'] {
  const byType = new Map<QualityIssueType, { label: string; severity: QualitySeverity; people: number; count: number }>();
  for (const item of items) {
    for (const issue of item.issues) {
      const current = byType.get(issue.type);
      if (!current) {
        byType.set(issue.type, {
          label: issue.label,
          severity: issue.severity,
          people: 1,
          count: issue.count,
        });
        continue;
      }
      current.people += 1;
      current.count += issue.count;
      if (SEVERITY_RANK[issue.severity] > SEVERITY_RANK[current.severity]) {
        current.severity = issue.severity;
      }
    }
  }

  return [...byType.entries()]
    .map(([type, value]) => ({ type, ...value }))
    .sort((left, right) => SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity] || right.count - left.count);
}

function groupRelationsByPerson(relations: RelationRow[], personIdSet: Set<string>) {
  const grouped = new Map<string, RelationRow[]>();
  for (const relation of relations) {
    if (personIdSet.has(relation.personId)) {
      addToGroup(grouped, relation.personId, relation);
    }
    if (personIdSet.has(relation.relatedPersonId)) {
      addToGroup(grouped, relation.relatedPersonId, relation);
    }
  }
  return grouped;
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    addToGroup(grouped, getKey(item), item);
  }
  return grouped;
}

function addToGroup<T>(grouped: Map<string, T[]>, key: string, value: T) {
  const list = grouped.get(key) || [];
  list.push(value);
  grouped.set(key, list);
}

function relationSample(relation: RelationRow): QualityReviewSample {
  return {
    id: relation.id,
    label: `${relation.relationType} · ${relation.reviewStatus}`,
    detail: `${relation.source} · confidence ${relation.confidence.toFixed(2)}`,
    href: relation.evidenceUrl || null,
  };
}

function formatMaybeScore(value: number | null): string {
  return typeof value === 'number' ? value.toFixed(2) : '-';
}

function hasRelationEvidence(relation: Pick<RelationRow, 'evidenceUrl' | 'evidenceNote' | 'description'>) {
  return Boolean(relation.evidenceUrl || relation.evidenceNote || relation.description);
}

function maxSeverity(issues: QualityReviewIssue[]): QualitySeverity {
  return issues.reduce<QualitySeverity>((current, issue) => (
    SEVERITY_RANK[issue.severity] > SEVERITY_RANK[current] ? issue.severity : current
  ), 'low');
}

function isHighVisibility(person: Pick<PersonRow, 'weeklyViewCount' | 'viewCount' | 'influenceScore'>) {
  return person.weeklyViewCount > 0 || person.viewCount >= 20 || person.influenceScore >= 70;
}

function ratio(numerator: number, denominator: number) {
  if (denominator <= 0) return 1;
  return Number((numerator / denominator).toFixed(4));
}

function clampInteger(value: number | undefined, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value as number)));
}

export function normalizeSeverity(value: QualitySeverity | 'all' | null | undefined): QualitySeverity | 'all' {
  if (value === 'critical' || value === 'high' || value === 'medium' || value === 'low') return value;
  return 'all';
}

export function normalizeIssueType(value: QualityIssueType | 'all' | null | undefined): QualityIssueType | 'all' {
  if (
    value === 'missing_profile'
    || value === 'stale_profile'
    || value === 'missing_relation_evidence'
    || value === 'low_confidence_trusted_relation'
    || value === 'needs_review_relation'
    || value === 'missing_activity_source'
    || value === 'thin_recent_activity'
    || value === 'qa_review_backlog'
    || value === 'card_source_gap'
  ) {
    return value;
  }
  return 'all';
}

function emptySnapshot(options: QualityReviewSnapshot['params']): QualityReviewSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    params: options,
    stats: {
      reviewedPeople: 0,
      queuedPeople: 0,
      totalIssues: 0,
      criticalPeople: 0,
      highPeople: 0,
      mediumPeople: 0,
      lowPeople: 0,
      relationEvidenceCoverage: 1,
      activitySourceCoverage: 1,
      cardSourceCoverage: 1,
      qaReviewRows: 0,
    },
    issueBreakdown: [],
    items: [],
  };
}
