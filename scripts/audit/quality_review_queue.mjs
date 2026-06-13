import { PrismaClient } from '@prisma/client';
import { writeFile } from 'node:fs/promises';

const prisma = new PrismaClient();

const ACTIVITY_SOURCE_TYPES = ['openalex', 'github', 'youtube', 'exa', 'podcast', 'career'];
const TRUSTED_RELATION_STATUSES = ['trusted', 'confirmed'];
const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };
const SEVERITY_SCORE = { critical: 100, high: 50, medium: 20, low: 8 };

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const snapshot = await loadReviewQueue(options);
  if (options.summaryOutputPath) {
    await writeFile(options.summaryOutputPath, JSON.stringify(buildQueueSummary(snapshot), null, 2));
    console.error(`Wrote queue summary: ${options.summaryOutputPath}`);
  }
  if (options.decisionTemplatePath) {
    await writeFile(options.decisionTemplatePath, JSON.stringify(buildDecisionTemplate(snapshot), null, 2));
    console.error(`Wrote decision template: ${options.decisionTemplatePath}`);
  }
  if (options.reviewPackPath) {
    await writeFile(options.reviewPackPath, JSON.stringify(buildReviewPack(snapshot, options), null, 2));
    console.error(`Wrote review pack: ${options.reviewPackPath}`);
  }

  if (options.format === 'json') {
    console.log(JSON.stringify(snapshot, null, 2));
  } else {
    printTable(snapshot);
  }

  if (options.failOnCritical && snapshot.stats.criticalPeople > 0) {
    process.exitCode = 1;
  }
}

async function loadReviewQueue(options) {
  const since = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000);
  const qaAuditLogReady = await hasTable('QAAuditLog');

  const allItems = [];
  const errors = [];
  let reviewedPeople = 0;
  let batches = 0;
  let offset = options.resumeOffset;
  let exhausted = false;

  while (reviewedPeople < options.maxPeople && allItems.length < options.limit) {
    const take = Math.min(options.batchSize, options.maxPeople - reviewedPeople);
    const people = await loadPeopleBatch(offset, take);
    batches += 1;
    reviewedPeople += people.length;
    offset += people.length;
    if (people.length === 0) {
      exhausted = true;
      break;
    }

    const batch = await loadReviewBatch(people, since, qaAuditLogReady, options);
    allItems.push(...batch.items
      .filter(item => options.severity === 'all' || item.severity === options.severity)
      .filter(item => options.issueType === 'all' || item.issues.some(issue => issue.type === options.issueType)));
    errors.push(...batch.errors);

    if (people.length < take) {
      exhausted = true;
      break;
    }
  }

  const items = allItems
    .sort((left, right) => right.score - left.score || right.person.weeklyViewCount - left.person.weeklyViewCount || left.person.name.localeCompare(right.person.name))
    .slice(0, options.limit);

  return {
    generatedAt: new Date().toISOString(),
    params: {
      limit: options.limit,
      batchSize: options.batchSize,
      maxPeople: options.maxPeople,
      resumeOffset: options.resumeOffset,
      days: options.days,
      staleDays: options.staleDays,
      severity: options.severity,
      issueType: options.issueType,
    },
    scan: {
      batches,
      reviewedPeople,
      nextResumeOffset: offset,
      limitReached: allItems.length >= options.limit,
      completed: exhausted,
      errorCount: errors.length,
    },
    stats: buildStats(reviewedPeople, allItems, errors.length),
    issueBreakdown: buildIssueBreakdown(allItems),
    errors,
    items,
  };
}

async function loadPeopleBatch(skip, take) {
  return prisma.people.findMany({
    where: { status: { in: ['ready', 'active'] } },
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
    skip,
    take,
  });
}

async function loadReviewBatch(people, since, qaAuditLogReady, options) {
  const personIds = people.map(person => person.id);
  if (personIds.length === 0) return { items: [], errors: [] };
  const relationTake = Math.min(options.relationRowLimit, personIds.length * options.relationRowsPerPerson);
  const activityTake = Math.min(options.activityRowLimit, personIds.length * options.activityRowsPerPerson);
  const qaTake = Math.min(options.qaRowLimit, personIds.length * options.qaRowsPerPerson);

  const [relations, recentActivity, qaReviewGroups, qaReviewRows] = await Promise.all([
    prisma.personRelation.findMany({
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
      take: relationTake,
    }),
    prisma.rawPoolItem.findMany({
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
      take: activityTake,
    }),
    qaAuditLogReady
      ? prisma.qAAuditLog.groupBy({
          by: ['personId'],
          where: {
            personId: { in: personIds },
            verdict: 'review',
            createdAt: { gte: since },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    qaAuditLogReady
      ? prisma.qAAuditLog.findMany({
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
          take: qaTake,
        })
      : Promise.resolve([]),
  ]);

  const relationsByPerson = groupRelationsByPerson(relations, new Set(personIds));
  const activityByPerson = groupBy(recentActivity, item => item.personId);
  const qaReviewRowsByPerson = groupBy(qaReviewRows, item => item.personId);
  const qaReviewCountByPerson = new Map();
  for (const group of qaReviewGroups) {
    qaReviewCountByPerson.set(group.personId, group._count._all);
  }

  const items = [];
  const errors = [];
  for (const person of people) {
    try {
      const item = buildReviewItem({
        person,
        relations: relationsByPerson.get(person.id) || [],
        recentActivity: activityByPerson.get(person.id) || [],
        qaReviewCount: qaReviewCountByPerson.get(person.id) || 0,
        qaReviewRows: qaReviewRowsByPerson.get(person.id) || [],
        days: options.days,
        staleDays: options.staleDays,
      });
      if (item.issues.length > 0) items.push(item);
    } catch (error) {
      errors.push({
        personId: person.id,
        personName: person.name,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { items, errors };
}

function buildReviewItem({ person, relations, recentActivity, qaReviewCount, qaReviewRows, days, staleDays }) {
  const issues = [];
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
  ].filter(Boolean);

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
      sample: relationEvidenceMissing.slice(0, 3).map(relationSample),
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
      sample: lowConfidenceTrusted.slice(0, 3).map(relationSample),
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
      sample: needsReviewRelations.slice(0, 3).map(relationSample),
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
      topics: person.topics,
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

async function hasTable(tableName) {
  const rows = await prisma.$queryRaw`
    SELECT to_regclass(${`public."${tableName}"`}) IS NOT NULL AS "exists"
  `;
  return Boolean(rows[0]?.exists);
}

function buildStats(reviewedPeople, items, errorCount = 0) {
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
    acc.total += item.metrics.activeCardCount;
    acc.missing += Math.round(item.metrics.activeCardCount * (1 - item.metrics.cardSourceCoverage));
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
    errorCount,
  };
}

function buildQueueSummary(snapshot) {
  return {
    generatedAt: snapshot.generatedAt,
    params: snapshot.params,
    scan: snapshot.scan,
    stats: snapshot.stats,
    issueBreakdown: snapshot.issueBreakdown,
    itemCount: snapshot.items.length,
    itemIds: snapshot.items.map(item => item.person.id),
    errors: snapshot.errors,
  };
}

function buildIssueBreakdown(items) {
  const byType = new Map();
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

function printTable(snapshot) {
  console.log(`Quality review queue: ${snapshot.generatedAt}`);
  console.log(`reviewed=${snapshot.stats.reviewedPeople} queued=${snapshot.stats.queuedPeople} issues=${snapshot.stats.totalIssues} critical=${snapshot.stats.criticalPeople} high=${snapshot.stats.highPeople}`);
  console.log(`coverage relation=${formatPercent(snapshot.stats.relationEvidenceCoverage)} activity=${formatPercent(snapshot.stats.activitySourceCoverage)} cards=${formatPercent(snapshot.stats.cardSourceCoverage)} qaReviewRows=${snapshot.stats.qaReviewRows}`);

  if (snapshot.issueBreakdown.length > 0) {
    console.table(snapshot.issueBreakdown.map(issue => ({
      type: issue.type,
      severity: issue.severity,
      people: issue.people,
      count: issue.count,
    })));
  }

  if (snapshot.items.length > 0) {
    console.table(snapshot.items.map(item => ({
      severity: item.severity,
      score: item.score,
      person: item.person.name,
      weeklyViews: item.person.weeklyViewCount,
      issues: item.issues.map(issue => issue.label).join(' | '),
    })));
  } else {
    console.log('No queued people for current filters.');
  }
}

function buildDecisionTemplate(snapshot) {
  const decisions = [];
  for (const item of snapshot.items) {
    for (const issue of item.issues) {
      for (const sample of issue.sample) {
        const base = {
          personId: item.person.id,
          personName: item.person.name,
          issueType: issue.type,
          issueLabel: issue.label,
          sampleLabel: sample.label,
          sourceUrl: sample.href || '',
          note: '',
        };

        if (issue.type === 'qa_review_backlog') {
          decisions.push({
            action: 'qa_verdict',
            qaAuditLogId: sample.id,
            verdict: 'review',
            reason: '',
            ...base,
          });
        } else if (
          issue.type === 'missing_relation_evidence'
          || issue.type === 'low_confidence_trusted_relation'
          || issue.type === 'needs_review_relation'
        ) {
          decisions.push({
            action: 'relation_review',
            relationId: sample.id,
            reviewStatus: '',
            confidence: null,
            evidenceUrl: sample.href || '',
            evidenceNote: '',
            description: '',
            ...base,
          });
        } else if (issue.type === 'card_source_gap') {
          decisions.push({
            action: 'card_source',
            cardId: sample.id,
            sourceUrl: '',
            ...base,
          });
        }
      }
    }
  }

  return {
    version: 'quality-review-decisions-v1',
    generatedAt: new Date().toISOString(),
    sourceQueue: {
      generatedAt: snapshot.generatedAt,
      params: snapshot.params,
    },
    instructions: [
      'Edit decisions in this file, then run npm run audit:quality-apply -- --file=<path> for dry-run.',
      'Only pass --execute after reviewing the dry-run output.',
      'Supported qa_verdict verdict values: keep, reject, review, duplicate.',
      'Supported relation_review reviewStatus values: trusted, confirmed, needs_review.',
    ],
    decisions,
  };
}

function buildReviewPack(snapshot, options = {}) {
  const decisionTemplate = buildDecisionTemplate(snapshot);
  const decisionTemplatePath = options.decisionTemplatePath || '<decision-template.json>';
  return {
    version: 'quality-review-pack-v1',
    generatedAt: new Date().toISOString(),
    sourceQueue: {
      generatedAt: snapshot.generatedAt,
      params: snapshot.params,
    },
    artifacts: {
      decisionTemplatePath: options.decisionTemplatePath || null,
      reviewPackPath: options.reviewPackPath || null,
    },
    stats: snapshot.stats,
    issueBreakdown: snapshot.issueBreakdown,
    commands: {
      regenerateQueue: buildQualityReviewCommand(snapshot.params),
      dryRunDecisions: `npm run audit:quality-apply -- --file=${decisionTemplatePath}`,
      applyDecisions: `npm run audit:quality-apply -- --file=${decisionTemplatePath} --execute`,
    },
    reviewItems: snapshot.items.map(item => ({
      person: item.person,
      personUrl: `/person/${item.person.id}`,
      adminUrl: `/admin/quality?severity=${item.severity}`,
      severity: item.severity,
      score: item.score,
      metrics: item.metrics,
      checks: item.issues.map(issue => ({
        issueType: issue.type,
        label: issue.label,
        severity: issue.severity,
        count: issue.count,
        detail: issue.detail,
        suggestedAction: issueSuggestedAction(issue.type),
        acceptance: issueAcceptance(issue.type),
        samples: issue.sample,
      })),
    })),
    decisionTemplate,
    reviewRules: [
      '先处理 critical 和 high，不把 blocked 问题混进 ready 口径。',
      '关系、动态、卡片必须能回源；没有 URL 或证据说明时只保留在复核队列。',
      'decisionTemplate 只能覆盖可结构化回放的 qa_verdict、relation_review、card_source。',
      'missing_profile、stale_profile、thin_recent_activity 需要人工补资料或回填动态后再重新跑队列。',
      '先跑 dry-run，确认 skipped/errors 为 0 或可解释后，再加 --execute。',
    ],
  };
}

function buildQualityReviewCommand(params) {
  const args = [
    'npm run audit:quality-review --',
    `--limit=${params.limit}`,
    `--days=${params.days}`,
    `--stale-days=${params.staleDays}`,
  ];
  if (params.severity !== 'all') args.push(`--severity=${params.severity}`);
  if (params.issueType !== 'all') args.push(`--issue-type=${params.issueType}`);
  return args.join(' ');
}

function issueSuggestedAction(type) {
  const actions = {
    missing_profile: '补当前身份、人物判断文案或头像，并确认来源。',
    stale_profile: '回看身份、机构、代表成果和来源，必要时触发重新抓取。',
    missing_relation_evidence: '为可信关系补 evidenceUrl、evidenceNote 或 description，无法证明则降为 needs_review。',
    low_confidence_trusted_relation: '人工复核关系方向和来源，提高 confidence 或降级为 needs_review。',
    needs_review_relation: '人工判断关系是否成立，确认后改为 confirmed/trusted，不成立则保持 needs_review 或后续清理。',
    missing_activity_source: '补动态 URL/title；无法回源的动态不能进入默认流。',
    thin_recent_activity: '为高访问人物补近 30 天论文、repo、访谈、博客、播客或职位变化。',
    qa_review_backlog: '对 QAAuditLog review 项逐条给 keep/reject/review/duplicate 结论。',
    card_source_gap: '为学习卡片补 sourceUrl；找不到来源的卡片应降权或进入重写队列。',
  };
  return actions[type] || '人工复核并记录结论。';
}

function issueAcceptance(type) {
  const acceptances = {
    missing_profile: '人物页首屏身份、判断文案和头像缺口消失。',
    stale_profile: 'updatedAt 或人工复核记录能证明高访问人物资料已回看。',
    missing_relation_evidence: 'trusted/confirmed 关系证据覆盖率提升，默认图谱不展示无证据可信关系。',
    low_confidence_trusted_relation: '低置信 trusted/confirmed 关系不进入默认图谱，或经证据复核后 confidence 达到 0.75 以上。',
    needs_review_relation: 'needs_review 关系下降，默认可信关系仍只展示 confirmed/trusted 且证据可解释。',
    missing_activity_source: '近 30 天动态来源覆盖率回到 100%。',
    thin_recent_activity: '高访问人物近 30 天有可展示动态，订阅和周报不再为空。',
    qa_review_backlog: 'QAAuditLog verdict=review 数量下降，保留项有明确 reason。',
    card_source_gap: '活跃学习卡片 sourceUrl 覆盖率提升到 80% 以上。',
  };
  return acceptances[type] || '重新跑质量队列后该问题消失或降级。';
}

function groupRelationsByPerson(relations, personIdSet) {
  const grouped = new Map();
  for (const relation of relations) {
    if (personIdSet.has(relation.personId)) addToGroup(grouped, relation.personId, relation);
    if (personIdSet.has(relation.relatedPersonId)) addToGroup(grouped, relation.relatedPersonId, relation);
  }
  return grouped;
}

function groupBy(items, getKey) {
  const grouped = new Map();
  for (const item of items) {
    addToGroup(grouped, getKey(item), item);
  }
  return grouped;
}

function addToGroup(grouped, key, value) {
  const list = grouped.get(key) || [];
  list.push(value);
  grouped.set(key, list);
}

function relationSample(relation) {
  return {
    id: relation.id,
    label: `${relation.relationType} · ${relation.reviewStatus}`,
    detail: `${relation.source} · confidence ${relation.confidence.toFixed(2)}`,
    href: relation.evidenceUrl || null,
  };
}

function formatMaybeScore(value) {
  return typeof value === 'number' ? value.toFixed(2) : '-';
}

function hasRelationEvidence(relation) {
  return Boolean(relation.evidenceUrl || relation.evidenceNote || relation.description);
}

function maxSeverity(issues) {
  return issues.reduce((current, issue) => (
    SEVERITY_RANK[issue.severity] > SEVERITY_RANK[current] ? issue.severity : current
  ), 'low');
}

function isHighVisibility(person) {
  return person.weeklyViewCount > 0 || person.viewCount >= 20 || person.influenceScore >= 70;
}

function ratio(numerator, denominator) {
  if (denominator <= 0) return 1;
  return Number((numerator / denominator).toFixed(4));
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function emptySnapshot(options) {
  return {
    generatedAt: new Date().toISOString(),
    params: {
      limit: options.limit,
      batchSize: options.batchSize,
      maxPeople: options.maxPeople,
      resumeOffset: options.resumeOffset,
      relationRowLimit: options.relationRowLimit,
      activityRowLimit: options.activityRowLimit,
      qaRowLimit: options.qaRowLimit,
      days: options.days,
      staleDays: options.staleDays,
      severity: options.severity,
      issueType: options.issueType,
    },
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
      errorCount: 0,
    },
    scan: {
      batches: 0,
      reviewedPeople: 0,
      nextResumeOffset: options.resumeOffset,
      completed: true,
      errorCount: 0,
    },
    issueBreakdown: [],
    errors: [],
    items: [],
  };
}

function parseArgs(args) {
  const options = {
    limit: 20,
    days: 30,
    staleDays: 90,
    severity: 'all',
    issueType: 'all',
    format: 'table',
    failOnCritical: false,
    decisionTemplatePath: null,
    reviewPackPath: null,
    summaryOutputPath: null,
    relationRowLimit: 600,
    activityRowLimit: 600,
    qaRowLimit: 200,
    relationRowsPerPerson: 60,
    activityRowsPerPerson: 60,
    qaRowsPerPerson: 20,
  };
  options.batchSize = Math.min(80, Math.max(1, options.limit * 4));
  options.maxPeople = Math.max(options.limit * 4, 80);
  options.resumeOffset = 0;

  for (const arg of args) {
    if (arg === '--json') options.format = 'json';
    if (arg === '--fail-on-critical') options.failOnCritical = true;
    if (arg.startsWith('--format=')) {
      const value = arg.slice('--format='.length);
      options.format = value === 'json' ? 'json' : 'table';
    }
    if (arg.startsWith('--decision-template=')) options.decisionTemplatePath = arg.slice('--decision-template='.length);
    if (arg.startsWith('--review-pack=')) options.reviewPackPath = arg.slice('--review-pack='.length);
    if (arg.startsWith('--review-pack-output=')) options.reviewPackPath = arg.slice('--review-pack-output='.length);
    if (arg.startsWith('--summary-output=')) options.summaryOutputPath = arg.slice('--summary-output='.length);
    if (arg.startsWith('--limit=')) options.limit = clampInteger(arg.slice('--limit='.length), 1, 100, options.limit);
    if (arg.startsWith('--batch-size=')) options.batchSize = clampInteger(arg.slice('--batch-size='.length), 1, 100, options.batchSize);
    if (arg.startsWith('--max-people=')) options.maxPeople = clampInteger(arg.slice('--max-people='.length), 1, 1000, options.maxPeople);
    if (arg.startsWith('--resume-offset=')) options.resumeOffset = clampInteger(arg.slice('--resume-offset='.length), 0, 100000, options.resumeOffset);
    if (arg.startsWith('--relation-row-limit=')) options.relationRowLimit = clampInteger(arg.slice('--relation-row-limit='.length), 1, 5000, options.relationRowLimit);
    if (arg.startsWith('--activity-row-limit=')) options.activityRowLimit = clampInteger(arg.slice('--activity-row-limit='.length), 1, 5000, options.activityRowLimit);
    if (arg.startsWith('--qa-row-limit=')) options.qaRowLimit = clampInteger(arg.slice('--qa-row-limit='.length), 1, 2000, options.qaRowLimit);
    if (arg.startsWith('--relation-rows-per-person=')) options.relationRowsPerPerson = clampInteger(arg.slice('--relation-rows-per-person='.length), 1, 500, options.relationRowsPerPerson);
    if (arg.startsWith('--activity-rows-per-person=')) options.activityRowsPerPerson = clampInteger(arg.slice('--activity-rows-per-person='.length), 1, 500, options.activityRowsPerPerson);
    if (arg.startsWith('--qa-rows-per-person=')) options.qaRowsPerPerson = clampInteger(arg.slice('--qa-rows-per-person='.length), 1, 200, options.qaRowsPerPerson);
    if (arg.startsWith('--days=')) options.days = clampInteger(arg.slice('--days='.length), 1, 365, options.days);
    if (arg.startsWith('--stale-days=')) options.staleDays = clampInteger(arg.slice('--stale-days='.length), 7, 730, options.staleDays);
    if (arg.startsWith('--severity=')) options.severity = normalizeSeverity(arg.slice('--severity='.length));
    if (arg.startsWith('--issue-type=')) options.issueType = normalizeIssueType(arg.slice('--issue-type='.length));
  }

  options.batchSize = Math.min(options.batchSize, options.maxPeople);
  options.maxPeople = Math.max(options.limit, options.maxPeople);

  return options;
}

function normalizeSeverity(value) {
  if (value === 'critical' || value === 'high' || value === 'medium' || value === 'low') return value;
  return 'all';
}

function normalizeIssueType(value) {
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

function clampInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
