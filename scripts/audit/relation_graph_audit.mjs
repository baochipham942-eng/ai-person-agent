import { PrismaClient } from '@prisma/client';
import { writeFile } from 'node:fs/promises';

const prisma = new PrismaClient();

const READY_STATUS = ['ready', 'active'];
const TRUSTED_RELATION_STATUSES = ['trusted', 'confirmed'];
const DEFAULT_MIN_CONFIDENCE = 0.75;
const DEFAULT_MIN_EVIDENCE_COVERAGE = 0.95;

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
  const snapshot = await buildSnapshot(options);

  if (options.outputPath) {
    await writeFile(options.outputPath, JSON.stringify(snapshot, null, 2));
    console.error(`Wrote relation graph audit: ${options.outputPath}`);
  }

  if (options.format === 'json') {
    console.log(JSON.stringify(snapshot, null, 2));
  } else {
    printTable(snapshot);
  }

  if (options.failOnRisk && snapshot.summary.riskStatus !== 'ready') {
    process.exitCode = 1;
  }

  if (options.failOnThin && snapshot.summary.thinPeople > 0) {
    process.exitCode = 1;
  }
}

async function buildSnapshot(options) {
  const people = await loadPeople(options);
  if (people.length === 0) return emptySnapshot(options);

  const personIds = people.map(person => person.id);
  const relationRows = await prisma.personRelation.findMany({
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
      person: {
        select: {
          id: true,
          name: true,
        },
      },
      relatedPerson: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    take: 5000,
  });

  const relationsByPerson = groupRelationsByPerson(relationRows, new Set(personIds));
  const items = people
    .map(person => buildPersonAuditItem({
      person,
      relations: relationsByPerson.get(person.id) || [],
      minConfidence: options.minConfidence,
      minEvidenceCoverage: options.minEvidenceCoverage,
    }))
    .sort((left, right) => {
      const rank = statusRank(right.status) - statusRank(left.status);
      if (rank !== 0) return rank;
      return right.riskScore - left.riskScore
        || right.person.weeklyViewCount - left.person.weeklyViewCount
        || right.person.influenceScore - left.person.influenceScore
        || left.person.name.localeCompare(right.person.name);
    });

  const uniqueDefaultRelations = uniqueRelations(items.flatMap(item => item.defaultRelations));
  const uniqueLowConfidenceTrusted = uniqueRelations(items.flatMap(item => item.lowConfidenceTrustedRelations));
  const uniqueNeedsReview = uniqueRelations(items.flatMap(item => item.needsReviewRelations));
  const defaultMissingEvidence = uniqueDefaultRelations.filter(relation => !hasEvidence(relation));
  const lowConfidenceDefaultExposure = uniqueDefaultRelations.filter(relation => isLowConfidence(relation, options.minConfidence));
  const defaultEvidenceCoverage = ratio(uniqueDefaultRelations.length - defaultMissingEvidence.length, uniqueDefaultRelations.length);
  const riskStatus = defaultEvidenceCoverage >= options.minEvidenceCoverage && lowConfidenceDefaultExposure.length === 0
    ? 'ready'
    : 'risk';

  return {
    generatedAt: new Date().toISOString(),
    params: {
      limit: options.limit,
      personIds: options.personIds,
      minConfidence: options.minConfidence,
      minEvidenceCoverage: options.minEvidenceCoverage,
    },
    summary: {
      auditedPeople: items.length,
      readyPeople: items.filter(item => item.status === 'ready').length,
      thinPeople: items.filter(item => item.status === 'thin').length,
      riskPeople: items.filter(item => item.status === 'risk').length,
      defaultVisibleRelations: uniqueDefaultRelations.length,
      defaultEvidenceCoverage,
      defaultMissingEvidence: defaultMissingEvidence.length,
      lowConfidenceDefaultExposure: lowConfidenceDefaultExposure.length,
      lowConfidenceTrustedExcluded: uniqueLowConfidenceTrusted.length,
      needsReviewRelations: uniqueNeedsReview.length,
      riskStatus,
    },
    people: items.map(toPublicPersonAuditItem),
    samples: {
      missingEvidence: defaultMissingEvidence.slice(0, 10).map(relation => relationSample(relation)),
      lowConfidenceTrustedExcluded: uniqueLowConfidenceTrusted.slice(0, 10).map(relation => relationSample(relation)),
      needsReview: uniqueNeedsReview.slice(0, 10).map(relation => relationSample(relation)),
    },
  };
}

async function loadPeople(options) {
  const where = options.personIds.length > 0
    ? { id: { in: options.personIds } }
    : { status: { in: READY_STATUS } };

  return prisma.people.findMany({
    where,
    select: {
      id: true,
      name: true,
      currentTitle: true,
      organization: true,
      topics: true,
      influenceScore: true,
      weeklyViewCount: true,
      viewCount: true,
    },
    orderBy: [
      { weeklyViewCount: 'desc' },
      { viewCount: 'desc' },
      { influenceScore: 'desc' },
      { name: 'asc' },
    ],
    take: options.personIds.length > 0 ? options.personIds.length : options.limit,
  });
}

function buildPersonAuditItem({ person, relations, minConfidence, minEvidenceCoverage }) {
  const trustedRelations = relations.filter(isTrustedRelation);
  const defaultRelations = trustedRelations.filter(relation => !isLowConfidence(relation, minConfidence));
  const lowConfidenceTrustedRelations = trustedRelations.filter(relation => isLowConfidence(relation, minConfidence));
  const needsReviewRelations = relations.filter(relation => relation.reviewStatus === 'needs_review');
  const missingEvidenceRelations = defaultRelations.filter(relation => !hasEvidence(relation));
  const lowConfidenceDefaultRelations = defaultRelations.filter(relation => isLowConfidence(relation, minConfidence));
  const evidenceCoverage = ratio(defaultRelations.length - missingEvidenceRelations.length, defaultRelations.length);
  const issues = [];

  if (defaultRelations.length === 0) {
    issues.push({
      type: 'thin_default_graph',
      label: 'No default graph edges',
      detail: 'This high-visibility person has no trusted or confirmed relation above the default confidence threshold.',
      count: 1,
    });
  }

  if (evidenceCoverage < minEvidenceCoverage) {
    issues.push({
      type: 'missing_default_evidence',
      label: 'Default graph evidence gap',
      detail: `${missingEvidenceRelations.length}/${defaultRelations.length} default-visible relations do not have evidenceUrl, evidenceNote, or description.`,
      count: missingEvidenceRelations.length,
    });
  }

  if (lowConfidenceDefaultRelations.length > 0) {
    issues.push({
      type: 'low_confidence_default_exposure',
      label: 'Low confidence relation exposed by default',
      detail: `${lowConfidenceDefaultRelations.length} default-visible relations are below the confidence threshold.`,
      count: lowConfidenceDefaultRelations.length,
    });
  }

  if (lowConfidenceTrustedRelations.length > 0) {
    issues.push({
      type: 'low_confidence_trusted_excluded',
      label: 'Trusted relation excluded by confidence gate',
      detail: `${lowConfidenceTrustedRelations.length} trusted/confirmed relations are hidden from the default graph until review.`,
      count: lowConfidenceTrustedRelations.length,
    });
  }

  if (needsReviewRelations.length > 0) {
    issues.push({
      type: 'needs_review_relation_backlog',
      label: 'Needs review relation backlog',
      detail: `${needsReviewRelations.length} relations are still needs_review and stay out of the default graph.`,
      count: needsReviewRelations.length,
    });
  }

  const hasRisk = evidenceCoverage < minEvidenceCoverage || lowConfidenceDefaultRelations.length > 0;
  const status = hasRisk ? 'risk' : defaultRelations.length === 0 ? 'thin' : 'ready';
  const riskScore = missingEvidenceRelations.length * 20
    + lowConfidenceDefaultRelations.length * 50
    + lowConfidenceTrustedRelations.length * 8
    + needsReviewRelations.length * 3
    + (defaultRelations.length === 0 ? 10 : 0);

  return {
    person,
    status,
    riskScore,
    defaultRelations,
    lowConfidenceTrustedRelations,
    needsReviewRelations,
    metrics: {
      totalRelations: relations.length,
      trustedRelations: trustedRelations.length,
      defaultVisibleRelations: defaultRelations.length,
      defaultEvidenceCoverage: evidenceCoverage,
      defaultMissingEvidence: missingEvidenceRelations.length,
      lowConfidenceDefaultExposure: lowConfidenceDefaultRelations.length,
      lowConfidenceTrustedExcluded: lowConfidenceTrustedRelations.length,
      needsReviewRelations: needsReviewRelations.length,
    },
    issues,
    samples: {
      defaultVisible: defaultRelations.slice(0, 3).map(relation => relationSample(relation, person.id)),
      missingEvidence: missingEvidenceRelations.slice(0, 3).map(relation => relationSample(relation, person.id)),
      lowConfidenceTrustedExcluded: lowConfidenceTrustedRelations.slice(0, 3).map(relation => relationSample(relation, person.id)),
      needsReview: needsReviewRelations.slice(0, 3).map(relation => relationSample(relation, person.id)),
    },
  };
}

function toPublicPersonAuditItem(item) {
  return {
    person: {
      id: item.person.id,
      name: item.person.name,
      currentTitle: item.person.currentTitle,
      organization: item.person.organization,
      topics: item.person.topics,
      influenceScore: item.person.influenceScore,
      weeklyViewCount: item.person.weeklyViewCount,
      viewCount: item.person.viewCount,
    },
    status: item.status,
    riskScore: item.riskScore,
    metrics: item.metrics,
    issues: item.issues,
    samples: item.samples,
  };
}

function groupRelationsByPerson(relations, personIdSet) {
  const grouped = new Map();
  for (const relation of relations) {
    if (personIdSet.has(relation.personId)) addToGroup(grouped, relation.personId, relation);
    if (personIdSet.has(relation.relatedPersonId)) addToGroup(grouped, relation.relatedPersonId, relation);
  }
  return grouped;
}

function addToGroup(grouped, key, value) {
  const list = grouped.get(key) || [];
  list.push(value);
  grouped.set(key, list);
}

function uniqueRelations(relations) {
  const byId = new Map();
  for (const relation of relations) {
    if (!byId.has(relation.id)) byId.set(relation.id, relation);
  }
  return [...byId.values()];
}

function isTrustedRelation(relation) {
  return TRUSTED_RELATION_STATUSES.includes(relation.reviewStatus || '');
}

function isLowConfidence(relation, minConfidence) {
  return typeof relation.confidence === 'number' && relation.confidence < minConfidence;
}

function hasEvidence(relation) {
  return Boolean(relation.evidenceUrl || relation.evidenceNote || relation.description);
}

function relationSample(relation, centerId = null) {
  const otherName = centerId === relation.personId
    ? relation.relatedPerson.name
    : centerId === relation.relatedPersonId
      ? relation.person.name
      : relation.relatedPerson.name;

  return {
    id: relation.id,
    label: centerId
      ? `${otherName} · ${relation.relationType}`
      : `${relation.person.name} -> ${relation.relatedPerson.name} · ${relation.relationType}`,
    reviewStatus: relation.reviewStatus,
    confidence: relation.confidence,
    source: relation.source,
    evidenceUrl: relation.evidenceUrl,
    hasEvidence: hasEvidence(relation),
  };
}

function statusRank(status) {
  if (status === 'risk') return 3;
  if (status === 'thin') return 2;
  return 1;
}

function printTable(snapshot) {
  console.log(`Relation graph audit: ${snapshot.generatedAt}`);
  console.log(`audited=${snapshot.summary.auditedPeople} ready=${snapshot.summary.readyPeople} thin=${snapshot.summary.thinPeople} risk=${snapshot.summary.riskPeople}`);
  console.log(`defaultRelations=${snapshot.summary.defaultVisibleRelations} evidence=${formatPercent(snapshot.summary.defaultEvidenceCoverage)} missingEvidence=${snapshot.summary.defaultMissingEvidence}`);
  console.log(`lowConfidenceDefaultExposure=${snapshot.summary.lowConfidenceDefaultExposure} lowConfidenceTrustedExcluded=${snapshot.summary.lowConfidenceTrustedExcluded} needsReview=${snapshot.summary.needsReviewRelations}`);

  if (snapshot.people.length > 0) {
    console.table(snapshot.people.map(item => ({
      status: item.status,
      person: item.person.name,
      weeklyViews: item.person.weeklyViewCount,
      trusted: item.metrics.trustedRelations,
      defaultVisible: item.metrics.defaultVisibleRelations,
      evidence: formatPercent(item.metrics.defaultEvidenceCoverage),
      lowExcluded: item.metrics.lowConfidenceTrustedExcluded,
      needsReview: item.metrics.needsReviewRelations,
    })));
  }

  if (snapshot.samples.missingEvidence.length > 0) {
    console.log('Missing evidence samples:');
    for (const sample of snapshot.samples.missingEvidence) {
      console.log(`- ${sample.label} (${sample.reviewStatus}, confidence=${formatMaybeScore(sample.confidence)})`);
    }
  }
}

function emptySnapshot(options) {
  return {
    generatedAt: new Date().toISOString(),
    params: {
      limit: options.limit,
      personIds: options.personIds,
      minConfidence: options.minConfidence,
      minEvidenceCoverage: options.minEvidenceCoverage,
    },
    summary: {
      auditedPeople: 0,
      readyPeople: 0,
      thinPeople: 0,
      riskPeople: 0,
      defaultVisibleRelations: 0,
      defaultEvidenceCoverage: 1,
      defaultMissingEvidence: 0,
      lowConfidenceDefaultExposure: 0,
      lowConfidenceTrustedExcluded: 0,
      needsReviewRelations: 0,
      riskStatus: 'ready',
    },
    people: [],
    samples: {
      missingEvidence: [],
      lowConfidenceTrustedExcluded: [],
      needsReview: [],
    },
  };
}

function parseArgs(args) {
  const options = {
    limit: 20,
    format: 'table',
    outputPath: null,
    failOnRisk: false,
    failOnThin: false,
    personIds: [],
    minConfidence: DEFAULT_MIN_CONFIDENCE,
    minEvidenceCoverage: DEFAULT_MIN_EVIDENCE_COVERAGE,
  };

  for (const arg of args) {
    if (arg === '--fail-on-risk') {
      options.failOnRisk = true;
    } else if (arg === '--fail-on-thin') {
      options.failOnThin = true;
    } else if (arg.startsWith('--format=')) {
      const value = arg.slice('--format='.length);
      if (['table', 'json'].includes(value)) options.format = value;
    } else if (arg.startsWith('--output=')) {
      options.outputPath = arg.slice('--output='.length);
    } else if (arg.startsWith('--limit=')) {
      options.limit = clampInteger(arg.slice('--limit='.length), 1, 200, options.limit);
    } else if (arg.startsWith('--person-ids=')) {
      options.personIds = parseList(arg.slice('--person-ids='.length));
    } else if (arg.startsWith('--min-confidence=')) {
      options.minConfidence = clampNumber(arg.slice('--min-confidence='.length), 0, 1, options.minConfidence);
    } else if (arg.startsWith('--min-evidence-coverage=')) {
      options.minEvidenceCoverage = clampNumber(arg.slice('--min-evidence-coverage='.length), 0, 1, options.minEvidenceCoverage);
    }
  }

  return options;
}

function parseList(value) {
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

function ratio(numerator, denominator) {
  if (denominator <= 0) return 1;
  return Number((numerator / denominator).toFixed(4));
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function formatMaybeScore(value) {
  return typeof value === 'number' ? value.toFixed(2) : '-';
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
