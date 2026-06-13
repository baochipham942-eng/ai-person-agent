import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACTIVITY_SOURCE_TYPES = ['openalex', 'github', 'youtube', 'exa', 'podcast', 'career'];
const TRUSTED_RELATION_STATUSES = ['trusted', 'confirmed'];

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const since = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000);
  const people = await prisma.people.findMany({
    where: {
      status: { in: ['ready', 'active'] },
    },
    select: {
      id: true,
      name: true,
      influenceScore: true,
      viewCount: true,
      weeklyViewCount: true,
    },
    orderBy: [
      { weeklyViewCount: 'desc' },
      { viewCount: 'desc' },
      { influenceScore: 'desc' },
      { name: 'asc' },
    ],
    take: options.limit,
  });

  const sample = [];
  for (const person of people) {
    const [relations, recentActivity] = await Promise.all([
      prisma.personRelation.findMany({
        where: {
          OR: [
            { personId: person.id },
            { relatedPersonId: person.id },
          ],
        },
        select: {
          id: true,
          relationType: true,
          reviewStatus: true,
          confidence: true,
          evidenceUrl: true,
          evidenceNote: true,
          description: true,
        },
        take: 80,
      }),
      prisma.rawPoolItem.findMany({
        where: {
          personId: person.id,
          sourceType: { in: ACTIVITY_SOURCE_TYPES },
          fetchStatus: 'success',
          OR: [
            { publishedAt: { gte: since } },
            { fetchedAt: { gte: since } },
          ],
        },
        select: {
          id: true,
          sourceType: true,
          title: true,
          url: true,
          publishedAt: true,
          fetchedAt: true,
        },
        orderBy: [{ publishedAt: 'desc' }, { fetchedAt: 'desc' }],
        take: options.activityLimit,
      }),
    ]);

    const trustedRelations = relations.filter(relation => TRUSTED_RELATION_STATUSES.includes(relation.reviewStatus || ''));
    const needsReviewRelations = relations.filter(relation => relation.reviewStatus === 'needs_review');
    const relationEvidenceMissing = trustedRelations.filter(relation => !hasRelationEvidence(relation));
    const lowConfidenceTrusted = trustedRelations.filter(relation => typeof relation.confidence === 'number' && relation.confidence < 0.75);
    const activityMissingSource = recentActivity.filter(item => !item.url || !item.title);

    sample.push({
      id: person.id,
      name: person.name,
      weeklyViewCount: person.weeklyViewCount,
      viewCount: person.viewCount,
      influenceScore: person.influenceScore,
      trustedRelationCount: trustedRelations.length,
      needsReviewRelationCount: needsReviewRelations.length,
      relationEvidenceCoverage: ratio(trustedRelations.length - relationEvidenceMissing.length, trustedRelations.length),
      relationEvidenceMissing: relationEvidenceMissing.map(relation => ({
        id: relation.id,
        relationType: relation.relationType,
        reviewStatus: relation.reviewStatus,
        confidence: relation.confidence,
      })),
      lowConfidenceTrusted: lowConfidenceTrusted.map(relation => ({
        id: relation.id,
        relationType: relation.relationType,
        confidence: relation.confidence,
      })),
      recentActivityCount: recentActivity.length,
      activitySourceCoverage: ratio(recentActivity.length - activityMissingSource.length, recentActivity.length),
      activityMissingSource: activityMissingSource.map(item => ({
        id: item.id,
        sourceType: item.sourceType,
        title: item.title,
        url: item.url,
      })),
      recentActivitySourceMix: countBy(recentActivity.map(item => item.sourceType)),
    });
  }

  const totals = sample.reduce((acc, item) => {
    acc.trustedRelations += item.trustedRelationCount;
    acc.relationEvidenceMissing += item.relationEvidenceMissing.length;
    acc.lowConfidenceTrusted += item.lowConfidenceTrusted.length;
    acc.recentActivity += item.recentActivityCount;
    acc.activityMissingSource += item.activityMissingSource.length;
    return acc;
  }, {
    trustedRelations: 0,
    relationEvidenceMissing: 0,
    lowConfidenceTrusted: 0,
    recentActivity: 0,
    activityMissingSource: 0,
  });

  const result = {
    generatedAt: new Date().toISOString(),
    days: options.days,
    sampledPeople: sample.length,
    thresholds: {
      trustedRelationEvidenceCoverageTarget: options.relationEvidenceTarget,
      activitySourceCoverageTarget: 1,
    },
    totals,
    overall: {
      trustedRelationEvidenceCoverage: ratio(totals.trustedRelations - totals.relationEvidenceMissing, totals.trustedRelations),
      activitySourceCoverage: ratio(totals.recentActivity - totals.activityMissingSource, totals.recentActivity),
      passesRelationEvidenceTarget: ratio(totals.trustedRelations - totals.relationEvidenceMissing, totals.trustedRelations) >= options.relationEvidenceTarget,
      passesActivitySourceTarget: totals.activityMissingSource === 0,
    },
    sample,
  };

  console.log(JSON.stringify(result, null, 2));

  if (options.failOnRegression && (!result.overall.passesRelationEvidenceTarget || !result.overall.passesActivitySourceTarget)) {
    process.exitCode = 1;
  }
}

function parseArgs(args) {
  const options = {
    limit: 20,
    days: 30,
    activityLimit: 12,
    relationEvidenceTarget: 0.95,
    failOnRegression: false,
  };

  for (const arg of args) {
    if (arg === '--fail-on-regression') options.failOnRegression = true;
    if (arg.startsWith('--limit=')) options.limit = clampInteger(arg.slice('--limit='.length), 1, 100, options.limit);
    if (arg.startsWith('--days=')) options.days = clampInteger(arg.slice('--days='.length), 1, 365, options.days);
    if (arg.startsWith('--activity-limit=')) options.activityLimit = clampInteger(arg.slice('--activity-limit='.length), 1, 50, options.activityLimit);
    if (arg.startsWith('--relation-evidence-target=')) {
      options.relationEvidenceTarget = clampFloat(arg.slice('--relation-evidence-target='.length), 0, 1, options.relationEvidenceTarget);
    }
  }

  return options;
}

function hasRelationEvidence(relation) {
  return Boolean(relation.evidenceUrl || relation.evidenceNote || relation.description);
}

function ratio(numerator, denominator) {
  if (denominator <= 0) return 1;
  return Number((numerator / denominator).toFixed(4));
}

function countBy(values) {
  const counts = {};
  for (const value of values) {
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function clampFloat(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
