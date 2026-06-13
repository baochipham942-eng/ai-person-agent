import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { computeInfluenceScore, clampScore, type InfluenceScoreResult } from '@/lib/influence-scoring';
import { normalizeProducts } from '@/lib/utils/person-json';
import { getDirectoryTopicAliases, normalizeDirectoryTopics } from '@/lib/person-directory-config';

export type InfluenceCalibrationStatus = 'aligned' | 'review' | 'large_gap';

export interface InfluenceCalibrationItem {
  person: {
    id: string;
    name: string;
    currentTitle: string | null;
    organization: string[];
    topics: string[];
  };
  storedScore: number;
  computedScore: number;
  delta: number;
  absDelta: number;
  status: InfluenceCalibrationStatus;
  scoreResult: InfluenceScoreResult;
  latestAudit: {
    id: string;
    status: string;
    scoreVersion: string;
    previousScore: number;
    computedScore: number;
    appliedScore: number | null;
    reason: string | null;
    createdAt: string;
  } | null;
}

export interface InfluenceCalibrationSnapshot {
  generatedAt: string;
  version: string;
  weights: InfluenceScoreResult['weights'];
  items: InfluenceCalibrationItem[];
  stats: {
    total: number;
    aligned: number;
    review: number;
    largeGap: number;
    averageAbsDelta: number;
  };
}

export async function fetchInfluenceCalibration(params: {
  limit?: number;
  topic?: string | null;
  search?: string | null;
  status?: InfluenceCalibrationStatus | 'all' | null;
} = {}): Promise<InfluenceCalibrationSnapshot> {
  const limit = Math.min(100, Math.max(1, params.limit || 36));
  const statusFilter = params.status && params.status !== 'all' ? params.status : null;
  const where: Prisma.PeopleWhereInput = {
    status: { in: ['ready', 'active'] },
  };

  if (params.topic) where.topics = { hasSome: getDirectoryTopicAliases(params.topic) };
  if (params.search?.trim()) {
    const search = params.search.trim();
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { aliases: { has: search } },
      { currentTitle: { contains: search, mode: 'insensitive' } },
      { organization: { has: search } },
    ];
  }

  const people = await prisma.people.findMany({
    where,
    select: {
      id: true,
      name: true,
      currentTitle: true,
      organization: true,
      topics: true,
      influenceScore: true,
      citationCount: true,
      hIndex: true,
      githubStars: true,
      weeklyViewCount: true,
      products: true,
      cards: {
        where: { isActive: true },
        select: { sourceUrl: true },
      },
      roles: {
        select: { endDate: true },
      },
    },
    orderBy: [{ influenceScore: 'desc' }, { name: 'asc' }],
    take: Math.max(limit * 3, limit),
  });

  const personIds = people.map(person => person.id);
  const sourceTypeGroups = personIds.length > 0
    ? await prisma.rawPoolItem.groupBy({
        by: ['personId', 'sourceType'],
        where: { personId: { in: personIds } },
        _count: true,
      })
    : [];
  const latestAuditRows = personIds.length > 0
    ? await loadLatestInfluenceAudits(personIds)
    : [];

  const sourceTypeCountsByPerson = new Map<string, Record<string, number>>();
  for (const group of sourceTypeGroups) {
    const counts = sourceTypeCountsByPerson.get(group.personId) || {};
    counts[group.sourceType] = group._count;
    sourceTypeCountsByPerson.set(group.personId, counts);
  }

  const latestAuditByPerson = new Map<string, typeof latestAuditRows[number]>();
  for (const audit of latestAuditRows) {
    if (!latestAuditByPerson.has(audit.personId)) {
      latestAuditByPerson.set(audit.personId, audit);
    }
  }

  const allItems = people.map(person => {
    const scoreResult = computeInfluenceScore({
      citationCount: person.citationCount,
      hIndex: person.hIndex,
      githubStars: person.githubStars,
      weeklyViewCount: person.weeklyViewCount,
      sourceTypeCounts: sourceTypeCountsByPerson.get(person.id) || {},
      products: normalizeProducts(person.products),
      personRoles: person.roles,
      cards: person.cards,
    });
    const storedScore = Number(person.influenceScore || 0);
    const computedScore = Number(scoreResult.weightedScore.toFixed(1));
    const delta = Number((computedScore - storedScore).toFixed(1));
    const absDelta = Math.abs(delta);
    const status = classifyDelta(absDelta);
    const latestAudit = latestAuditByPerson.get(person.id) || null;

    return {
      person: {
        id: person.id,
        name: person.name,
        currentTitle: person.currentTitle,
        organization: person.organization,
        topics: normalizeDirectoryTopics(person.topics),
      },
      storedScore,
      computedScore,
      delta,
      absDelta,
      status,
      scoreResult,
      latestAudit: latestAudit ? {
        id: latestAudit.id,
        status: latestAudit.status,
        scoreVersion: latestAudit.scoreVersion,
        previousScore: latestAudit.previousScore,
        computedScore: latestAudit.computedScore,
        appliedScore: latestAudit.appliedScore,
        reason: latestAudit.reason,
        createdAt: latestAudit.createdAt.toISOString(),
      } : null,
    };
  });

  const filteredItems = allItems
    .filter(item => !statusFilter || item.status === statusFilter)
    .sort((left, right) => right.absDelta - left.absDelta || right.storedScore - left.storedScore || left.person.name.localeCompare(right.person.name))
    .slice(0, limit);

  const stats = buildStats(allItems);
  const probe = computeInfluenceScore({});

  return {
    generatedAt: new Date().toISOString(),
    version: probe.version,
    weights: probe.weights,
    items: filteredItems,
    stats,
  };
}

export async function recordInfluenceCalibrationAudit(params: {
  personId: string;
  reason?: string | null;
  reviewer?: string | null;
  status?: 'reviewed' | 'ignored' | 'applied';
  applyScore?: boolean;
  calibratedScore?: number | null;
}) {
  const person = await prisma.people.findUnique({
    where: { id: params.personId },
    select: {
      id: true,
      influenceScore: true,
      citationCount: true,
      hIndex: true,
      githubStars: true,
      weeklyViewCount: true,
      products: true,
      cards: {
        where: { isActive: true },
        select: { sourceUrl: true },
      },
      roles: {
        select: { endDate: true },
      },
    },
  });

  if (!person) {
    throw new Error('Person not found');
  }

  const sourceTypeGroups = await prisma.rawPoolItem.groupBy({
    by: ['sourceType'],
    where: { personId: person.id },
    _count: true,
  });
  const sourceTypeCounts = Object.fromEntries(sourceTypeGroups.map(group => [group.sourceType, group._count]));
  const scoreResult = computeInfluenceScore({
    citationCount: person.citationCount,
    hIndex: person.hIndex,
    githubStars: person.githubStars,
    weeklyViewCount: person.weeklyViewCount,
    sourceTypeCounts,
    products: normalizeProducts(person.products),
    personRoles: person.roles,
    cards: person.cards,
  });

  const computedScore = Number(scoreResult.weightedScore.toFixed(1));
  const appliedScore = params.applyScore
    ? Number(clampScore(params.calibratedScore ?? computedScore).toFixed(1))
    : null;
  const auditStatus = params.applyScore ? 'applied' : params.status || 'reviewed';

  return prisma.$transaction(async tx => {
    if (params.applyScore && appliedScore !== null) {
      await tx.people.update({
        where: { id: person.id },
        data: { influenceScore: appliedScore },
      });
    }

    return tx.influenceScoreAuditLog.create({
      data: {
        personId: person.id,
        scoreVersion: scoreResult.version,
        previousScore: person.influenceScore,
        computedScore,
        appliedScore,
        dimensions: toJsonInput(scoreResult.dimensions),
        signals: toJsonInput(scoreResult.signals),
        weights: toJsonInput(scoreResult.weights),
        status: auditStatus,
        reason: params.reason || null,
        reviewer: params.reviewer || null,
      },
    });
  });
}

function classifyDelta(absDelta: number): InfluenceCalibrationStatus {
  if (absDelta >= 20) return 'large_gap';
  if (absDelta >= 8) return 'review';
  return 'aligned';
}

function buildStats(items: InfluenceCalibrationItem[]): InfluenceCalibrationSnapshot['stats'] {
  const total = items.length;
  const aligned = items.filter(item => item.status === 'aligned').length;
  const review = items.filter(item => item.status === 'review').length;
  const largeGap = items.filter(item => item.status === 'large_gap').length;
  const averageAbsDelta = total > 0
    ? Number((items.reduce((sum, item) => sum + item.absDelta, 0) / total).toFixed(2))
    : 0;

  return { total, aligned, review, largeGap, averageAbsDelta };
}

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function loadLatestInfluenceAudits(personIds: string[]) {
  if (!(await hasInfluenceAuditTable())) {
    return [];
  }

  return prisma.influenceScoreAuditLog.findMany({
    where: { personId: { in: personIds } },
    orderBy: { createdAt: 'desc' },
    take: personIds.length * 5,
  });
}

async function hasInfluenceAuditTable(): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ tableName: string | null }>>`
    SELECT to_regclass('"InfluenceScoreAuditLog"')::text AS "tableName"
  `;
  return Boolean(rows[0]?.tableName);
}
