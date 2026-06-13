import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaNeon(pool) });
const TOPIC_REGISTRY = JSON.parse(
  readFileSync(new URL('../../lib/person-directory-topics.json', import.meta.url), 'utf8')
);

const READY_STATUS = ['ready', 'active'];
const ACTIVITY_SOURCE_TYPES = ['openalex', 'github', 'youtube', 'exa', 'podcast', 'career'];
const WORK_SOURCE_TYPES = ['openalex', 'github'];
const REMEDIATION_WEIGHTS = {
  people: 3,
  activity: 2,
  works: 2,
};
const MISSING_KEY_ORDER = ['people', 'activity', 'works'];

const TOPICS = TOPIC_REGISTRY.groups.flatMap(group => group.topics);
const TOPIC_ALIASES = Object.fromEntries(
  TOPIC_REGISTRY.topics.map(topic => [topic.label, topic.aliases || []])
);
const TOPIC_CANONICAL_BY_ALIAS = new Map();

for (const topic of TOPIC_REGISTRY.topics) {
  TOPIC_CANONICAL_BY_ALIAS.set(normalizeTopicKey(topic.label), topic.label);
  for (const alias of topic.aliases || []) {
    TOPIC_CANONICAL_BY_ALIAS.set(normalizeTopicKey(alias), topic.label);
  }
}

const ORGANIZATIONS = [
  'OpenAI', 'Anthropic', 'DeepMind', 'xAI', 'Mistral', 'Cohere',
  'Perplexity', 'Hugging Face', 'DeepSeek', 'Kimi', '智谱AI', '百川智能',
  'MiniMax', '阿里巴巴', '腾讯', '字节跳动', '百度', 'Google',
  'Microsoft', 'Meta', 'Apple', 'Stanford', 'MIT', 'Berkeley', 'CMU',
  '清华大学', '北京大学', 'Nvidia', 'Tesla',
];

const ORGANIZATION_ALIASES = {
  OpenAI: ['OpenAI', 'OpenAI基金会', 'OpenAI Foundation', '开放人工智能基金会'],
  Google: ['Google', '谷歌', '谷歌DeepMind', '谷歌大脑', 'Google Brain', 'Google DeepMind', 'Google Cloud'],
  DeepMind: ['DeepMind', 'Google DeepMind', '谷歌DeepMind'],
  Anthropic: ['Anthropic'],
  Microsoft: ['Microsoft', '微软', '微软研究院', '微软AI', 'Microsoft Research'],
  Meta: ['Meta', 'Facebook', 'Meta AI', 'FAIR', 'FAIR蒙特利尔', '脸书', 'Meta超级智能实验室'],
  Apple: ['Apple', '苹果'],
  Tesla: ['Tesla', '特斯拉', '特斯拉公司', 'Tesla, Inc.'],
  Nvidia: ['Nvidia', 'NVIDIA', '英伟达'],
  'Hugging Face': ['Hugging Face', 'HuggingFace'],
  Cohere: ['Cohere'],
  Mistral: ['Mistral', 'Mistral AI'],
  xAI: ['xAI', 'X.AI'],
  Perplexity: ['Perplexity', 'Perplexity AI'],
  Stanford: ['Stanford', '斯坦福大学', 'Stanford University'],
  MIT: ['MIT', '麻省理工学院', 'Massachusetts Institute of Technology', '思维机器实验室'],
  Berkeley: ['Berkeley', 'UC Berkeley', '加州大学伯克利分校'],
  CMU: ['CMU', '卡内基梅隆大学', 'Carnegie Mellon University'],
  清华大学: ['清华大学', 'Tsinghua', 'Tsinghua University', '清华大学 NLP', '清华大学、智谱AI', '清华大学、生数科技'],
  北京大学: ['北京大学', 'PKU', '北大', '北京大学、智源研究院'],
  DeepSeek: ['DeepSeek', '幻方量化', '深度求索'],
  Kimi: ['Kimi', '月之暗面', 'Moonshot', 'Moonshot AI', '月之暗面 Kimi', '月之暗面（Moonshot AI）'],
  智谱AI: ['智谱AI', 'Zhipu', 'Zhipu AI', '智谱', 'GLM', '清华大学、智谱AI'],
  百川智能: ['百川智能', 'Baichuan'],
  MiniMax: ['MiniMax', 'Minimax'],
  阿里巴巴: ['阿里巴巴', '阿里达摩院', '达摩院', 'Alibaba', '通义'],
  腾讯: ['腾讯', 'Tencent', '腾讯AI Lab'],
  字节跳动: ['字节跳动', 'ByteDance', '豆包'],
  百度: ['百度', 'Baidu', '文心'],
};

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
    console.error(`Wrote entity density audit: ${options.outputPath}`);
  }

  if (options.remediationOutputPath) {
    await writeFile(options.remediationOutputPath, JSON.stringify({
      generatedAt: snapshot.generatedAt,
      days: snapshot.days,
      thresholds: snapshot.thresholds,
      batch: snapshot.batch,
      summary: snapshot.summary,
      remediationQueue: snapshot.remediationQueue,
      remediationBatches: snapshot.remediationBatches,
      nextBatchExecutionList: snapshot.nextBatchExecutionList,
      candidatePackages: snapshot.candidatePackages,
    }, null, 2));
    console.error(`Wrote entity remediation queue: ${options.remediationOutputPath}`);
  }

  if (options.format === 'json') {
    console.log(JSON.stringify(snapshot, null, 2));
  } else {
    printTable(snapshot);
  }

  if (options.failOnThin && snapshot.summary.thinEntityCount > 0) {
    process.exitCode = 1;
  }
}

async function buildSnapshot(options) {
  const since = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000);
  const topics = options.topics.map(topic => auditTopic(topic, since, options));
  const organizations = options.organizations.map(organization => auditOrganization(organization, since, options));
  const [topicItems, organizationItems] = await Promise.all([
    Promise.all(topics),
    Promise.all(organizations),
  ]);
  const items = [...topicItems, ...organizationItems];
  const remediationQueue = buildRemediationQueue(items, options.remediationLimit);
  const remediationBatches = buildRemediationBatches(remediationQueue, options);
  const nextBatchExecutionList = buildNextBatchExecutionList(remediationBatches.nextBatch);
  const candidatePackages = buildCandidatePackages(remediationBatches.nextBatch);

  return {
    generatedAt: new Date().toISOString(),
    days: options.days,
    scope: {
      topicCount: options.topics.length,
      organizationCount: options.organizations.length,
      topics: options.topics,
      organizations: options.organizations,
    },
    batch: {
      batchSize: options.batchSize,
      batchMissingKey: options.batchMissingKey,
      sampleLimit: options.sampleLimit,
      sourceRowLimit: options.sourceRowLimit,
    },
    thresholds: options.thresholds,
    summary: summarize(items, remediationQueue, remediationBatches),
    topics: topicItems,
    organizations: organizationItems,
    remediationQueue,
    remediationBatches,
    nextBatchExecutionList,
    candidatePackages,
  };
}

async function auditTopic(topic, since, options) {
  const personWhere = {
    status: { in: READY_STATUS },
    topics: { hasSome: getTopicAliases(topic) },
  };
  const [peopleCount, activityRows, workRows, topPeople] = await Promise.all([
    prisma.people.count({ where: personWhere }),
    prisma.rawPoolItem.findMany({
      where: buildRawItemWhere(personWhere, ACTIVITY_SOURCE_TYPES, since),
      select: {
        sourceType: true,
        title: true,
        url: true,
      },
      orderBy: [{ publishedAt: 'desc' }, { fetchedAt: 'desc' }],
      take: options.sourceRowLimit,
    }),
    prisma.rawPoolItem.findMany({
      where: buildWorkRawItemWhere(personWhere),
      select: {
        sourceType: true,
        title: true,
        url: true,
      },
      orderBy: [{ publishedAt: 'desc' }, { fetchedAt: 'desc' }],
      take: options.sourceRowLimit,
    }),
    prisma.people.findMany({
      where: personWhere,
      select: {
        name: true,
        influenceScore: true,
      },
      orderBy: [{ influenceScore: 'desc' }, { name: 'asc' }],
      take: 5,
    }),
  ]);

  return buildEntityAuditItem({
    type: 'topic',
    label: topic,
    peopleCount,
    activityRows,
    workRows,
    currentPeopleCount: null,
    alumniPeopleCount: null,
    thresholds: {
      people: options.thresholds.topicPeople,
      activity: options.thresholds.topicActivity,
      works: options.thresholds.topicWorks,
    },
    topPeople,
    sampleLimit: options.sampleLimit,
  });
}

async function auditOrganization(organization, since, options) {
  const aliases = getOrganizationAliases(organization);
  const personWhere = buildOrganizationPersonWhere(organization, aliases);
  const roleWhere = buildOrganizationRoleWhere(aliases);
  const [peopleCount, activityRows, workRows, currentRoles, alumniRoles, topPeople] = await Promise.all([
    prisma.people.count({ where: personWhere }),
    prisma.rawPoolItem.findMany({
      where: buildRawItemWhere(personWhere, ACTIVITY_SOURCE_TYPES, since),
      select: {
        sourceType: true,
        title: true,
        url: true,
      },
      orderBy: [{ publishedAt: 'desc' }, { fetchedAt: 'desc' }],
      take: options.sourceRowLimit,
    }),
    prisma.rawPoolItem.findMany({
      where: buildWorkRawItemWhere(personWhere),
      select: {
        sourceType: true,
        title: true,
        url: true,
      },
      orderBy: [{ publishedAt: 'desc' }, { fetchedAt: 'desc' }],
      take: options.sourceRowLimit,
    }),
    prisma.personRole.findMany({
      where: {
        ...roleWhere,
        endDate: null,
      },
      select: { personId: true },
      take: 1000,
    }),
    prisma.personRole.findMany({
      where: {
        ...roleWhere,
        endDate: { not: null },
      },
      select: { personId: true },
      take: 1000,
    }),
    prisma.people.findMany({
      where: personWhere,
      select: {
        name: true,
        influenceScore: true,
      },
      orderBy: [{ influenceScore: 'desc' }, { name: 'asc' }],
      take: 5,
    }),
  ]);

  return buildEntityAuditItem({
    type: 'organization',
    label: organization,
    peopleCount,
    activityRows,
    workRows,
    currentPeopleCount: uniqueCount(currentRoles.map(role => role.personId)),
    alumniPeopleCount: uniqueCount(alumniRoles.map(role => role.personId)),
    thresholds: {
      people: options.thresholds.organizationPeople,
      activity: options.thresholds.organizationActivity,
      works: options.thresholds.organizationWorks,
    },
    topPeople,
    sampleLimit: options.sampleLimit,
  });
}

function buildEntityAuditItem(params) {
  const activityCount = params.activityRows.length;
  const workCount = params.workRows.length;
  const sourceMix = countBy(params.activityRows.map(row => row.sourceType));
  const workMix = countBy(params.workRows.map(row => row.sourceType));
  const missing = [];

  if (params.peopleCount < params.thresholds.people) {
    missing.push({
      key: 'people',
      current: params.peopleCount,
      target: params.thresholds.people,
      detail: `需要补 ${params.thresholds.people - params.peopleCount} 个相关人物`,
    });
  }
  if (activityCount < params.thresholds.activity) {
    missing.push({
      key: 'activity',
      current: activityCount,
      target: params.thresholds.activity,
      detail: `需要补 ${params.thresholds.activity - activityCount} 条近期动态`,
    });
  }
  if (workCount < params.thresholds.works) {
    missing.push({
      key: 'works',
      current: workCount,
      target: params.thresholds.works,
      detail: `需要补 ${params.thresholds.works - workCount} 个代表论文或项目`,
    });
  }

  return {
    type: params.type,
    label: params.label,
    status: missing.length === 0 ? 'ready' : 'thin',
    metrics: {
      peopleCount: params.peopleCount,
      activityCount,
      workCount,
      currentPeopleCount: params.currentPeopleCount,
      alumniPeopleCount: params.alumniPeopleCount,
      sourceMix,
      workMix,
    },
    thresholds: params.thresholds,
    missing,
    topPeople: params.topPeople.map(person => ({
      name: person.name,
      influenceScore: person.influenceScore,
    })),
    sampleActivity: params.activityRows.slice(0, params.sampleLimit).map(toSampleSource),
    sampleWorks: params.workRows.slice(0, params.sampleLimit).map(toSampleSource),
  };
}

function buildRawItemWhere(personWhere, sourceTypes, since) {
  return {
    sourceType: { in: sourceTypes },
    fetchStatus: 'success',
    url: { not: '' },
    title: { not: '' },
    person: personWhere,
    ...(since && {
      OR: [
        { publishedAt: { gte: since } },
        { fetchedAt: { gte: since } },
      ],
    }),
  };
}

function buildWorkRawItemWhere(personWhere) {
  return {
    fetchStatus: 'success',
    url: { not: '' },
    title: { not: '' },
    person: personWhere,
    OR: [
      { sourceType: { in: WORK_SOURCE_TYPES } },
      { metadata: { path: ['contentDensityLane'], equals: 'works' } },
    ],
  };
}

function buildOrganizationRoleWhere(aliases) {
  return {
    organization: {
      OR: [
        { name: { in: aliases } },
        { nameZh: { in: aliases } },
      ],
    },
    person: {
      status: { in: READY_STATUS },
    },
  };
}

function buildOrganizationPersonWhere(organization, aliases) {
  return {
    status: { in: READY_STATUS },
    OR: [
      { organization: { hasSome: aliases } },
      { currentTitle: { contains: organization, mode: 'insensitive' } },
      {
        roles: {
          some: {
            organization: {
              OR: [
                { name: { in: aliases } },
                { nameZh: { in: aliases } },
              ],
            },
          },
        },
      },
    ],
  };
}

function getOrganizationAliases(organization) {
  return ORGANIZATION_ALIASES[organization] || [organization];
}

function getTopicAliases(topic) {
  const canonical = normalizeTopic(topic);
  return uniqueStrings([
    canonical,
    topic,
    ...(TOPIC_ALIASES[canonical] || []),
  ]);
}

function normalizeTopic(topic) {
  return TOPIC_CANONICAL_BY_ALIAS.get(normalizeTopicKey(topic)) || topic;
}

function normalizeTopicKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '');
}

function summarize(items, remediationQueue = [], remediationBatches = { groups: {}, nextBatch: [] }) {
  const thinItems = items.filter(item => item.status === 'thin');
  return {
    entityCount: items.length,
    readyEntityCount: items.length - thinItems.length,
    thinEntityCount: thinItems.length,
    readyRate: ratio(items.length - thinItems.length, items.length),
    missingByMetric: countBy(thinItems.flatMap(item => item.missing.map(missing => missing.key))),
    remediationCandidateCount: remediationQueue.length,
    remediationBatchCount: Object.values(remediationBatches.groups).filter(group => group.length > 0).length,
    nextBatchCount: remediationBatches.nextBatch.length,
    thinnest: thinItems
      .map(item => ({
        type: item.type,
        label: item.label,
        missing: item.missing.map(missing => missing.key),
        metrics: item.metrics,
      }))
      .slice(0, 8),
  };
}

function buildRemediationQueue(items, limit) {
  return items
    .map((item, index) => ({ item, index }))
    .filter(entry => entry.item.status === 'thin')
    .map(entry => {
      const score = remediationScore(entry.item);
      return {
        stableRankSeed: entry.index,
        entity: {
          type: entry.item.type,
          label: entry.item.label,
          href: entityHref(entry.item),
        },
        priority: remediationPriority(score),
        score,
        primaryMissingKey: primaryMissingKey(entry.item),
        missing: sortMissing(entry.item.missing),
        metrics: entry.item.metrics,
        existingSeeds: {
          topPeople: entry.item.topPeople,
          sourceMix: entry.item.metrics.sourceMix,
          workMix: entry.item.metrics.workMix,
          sampleActivity: entry.item.sampleActivity,
          sampleWorks: entry.item.sampleWorks,
        },
        nextActions: buildRemediationActions(entry.item),
        searchBrief: buildSearchBrief(entry.item),
      };
    })
    .sort(compareQueueItems)
    .slice(0, limit)
    .map((item, index) => ({
      ...item,
      queueRank: index + 1,
    }));
}

function remediationScore(item) {
  return item.missing.reduce((sum, missing) => {
    const gap = Math.max(0, missing.target - missing.current);
    const ratioGap = missing.target > 0 ? gap / missing.target : 0;
    return sum + gap * (REMEDIATION_WEIGHTS[missing.key] || 1) + ratioGap * 10;
  }, 0);
}

function remediationPriority(score) {
  if (score >= 60) return 'critical';
  if (score >= 30) return 'high';
  if (score >= 12) return 'medium';
  return 'low';
}

function primaryMissingKey(item) {
  return sortMissing(item.missing)[0]?.key || null;
}

function sortMissing(missing) {
  return [...missing].sort((left, right) => {
    const leftGap = Math.max(0, left.target - left.current);
    const rightGap = Math.max(0, right.target - right.current);
    const leftWeighted = leftGap * (REMEDIATION_WEIGHTS[left.key] || 1);
    const rightWeighted = rightGap * (REMEDIATION_WEIGHTS[right.key] || 1);
    if (rightWeighted !== leftWeighted) return rightWeighted - leftWeighted;
    return missingKeyIndex(left.key) - missingKeyIndex(right.key);
  });
}

function compareQueueItems(left, right) {
  const scoreDelta = right.score - left.score;
  if (scoreDelta !== 0) return scoreDelta;
  const missingDelta = right.missing.length - left.missing.length;
  if (missingDelta !== 0) return missingDelta;
  const primaryDelta = missingKeyIndex(left.primaryMissingKey) - missingKeyIndex(right.primaryMissingKey);
  if (primaryDelta !== 0) return primaryDelta;
  const typeDelta = left.entity.type.localeCompare(right.entity.type);
  if (typeDelta !== 0) return typeDelta;
  const labelDelta = left.entity.label.localeCompare(right.entity.label, 'zh-Hans-CN');
  if (labelDelta !== 0) return labelDelta;
  return left.stableRankSeed - right.stableRankSeed;
}

function missingKeyIndex(key) {
  const index = MISSING_KEY_ORDER.indexOf(key);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function buildRemediationBatches(queue, options) {
  const groups = Object.fromEntries(MISSING_KEY_ORDER.map(key => [key, []]));

  for (const item of queue) {
    for (const missing of item.missing) {
      groups[missing.key].push(toBatchItem(item, missing.key));
    }
  }

  const selectedKeys = options.batchMissingKey === 'all'
    ? MISSING_KEY_ORDER
    : [options.batchMissingKey];
  const nextBatchCandidates = selectedKeys
    .flatMap(key => groups[key] || [])
    .sort((left, right) => left.queueRank - right.queueRank || missingKeyIndex(left.batchMissingKey) - missingKeyIndex(right.batchMissingKey));
  const nextBatch = uniqueBatchItems(nextBatchCandidates).slice(0, options.batchSize);

  return {
    groups,
    nextBatch,
  };
}

function toBatchItem(item, batchMissingKey) {
  return {
    queueRank: item.queueRank,
    batchMissingKey,
    entity: item.entity,
    priority: item.priority,
    score: Number(item.score.toFixed(1)),
    primaryMissingKey: item.primaryMissingKey,
    missing: item.missing.map(entry => ({
      key: entry.key,
      current: entry.current,
      target: entry.target,
      targetDelta: Math.max(0, entry.target - entry.current),
    })),
    nextActions: item.nextActions.map(action => ({
      type: action.type,
      targetDelta: action.targetDelta,
      sourceTypes: action.sourceTypes || [],
      acceptance: action.acceptance,
    })),
  };
}

function uniqueBatchItems(items) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = `${item.entity.type}:${item.entity.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function buildNextBatchExecutionList(nextBatch) {
  return nextBatch.map((item, index) => ({
    order: index + 1,
    entityType: item.entity.type,
    label: item.entity.label,
    href: item.entity.href,
    priority: item.priority,
    batchMissingKey: item.batchMissingKey,
    primaryMissingKey: item.primaryMissingKey,
    missingKeys: item.missing.map(entry => entry.key),
    targetDeltas: Object.fromEntries(item.missing.map(entry => [entry.key, entry.targetDelta])),
    actionTypes: item.nextActions.map(action => action.type),
    acceptance: item.nextActions.map(action => action.acceptance),
  }));
}

function buildCandidatePackages(nextBatch) {
  const entities = nextBatch.map((item, index) => ({
    order: index + 1,
    entityType: item.entity.type,
    label: item.entity.label,
    href: item.entity.href,
    priority: item.priority,
    primaryMissingKey: item.primaryMissingKey,
    minimalTargets: Object.fromEntries(item.missing.map(entry => [
      entry.key,
      {
        current: entry.current,
        target: entry.target,
        targetDelta: entry.targetDelta,
      },
    ])),
    smallBatches: item.nextActions
      .filter(action => action.targetDelta > 0)
      .map(action => ({
        batchKey: actionTypeToMissingKey(action.type),
        actionType: action.type,
        targetDelta: action.targetDelta,
        sourceTypes: action.sourceTypes || [],
        acceptance: action.acceptance,
      })),
  }));

  return {
    auditCommand: 'npm run audit:entity-density -- --top=8 --batch-size=5 --sample-limit=1 --source-row-limit=40 --output=/tmp/ai-person-entity-density-pg009-first-batch.json --remediation-output=/tmp/ai-person-entity-remediation-pg009-first-batch.json',
    executionPolicy: [
      '只按 nextBatchExecutionList 的 5 个对象推进第一批。',
      'people、activity、works 分开执行；一次只处理一个 small batch。',
      '候选包只负责整理候选和证据，不直接写数据库。',
      '如需补资料，优先使用已有审计输出和少量人工搜索 brief，不跑自动大抓取。',
    ],
    groups: {
      people: entities
        .filter(entity => entity.minimalTargets.people?.targetDelta > 0)
        .map(entity => toCandidateGroupItem(entity, 'people')),
      activity: entities
        .filter(entity => entity.minimalTargets.activity?.targetDelta > 0)
        .map(entity => toCandidateGroupItem(entity, 'activity')),
      works: entities
        .filter(entity => entity.minimalTargets.works?.targetDelta > 0)
        .map(entity => toCandidateGroupItem(entity, 'works')),
    },
    entities,
  };
}

function toCandidateGroupItem(entity, key) {
  const smallBatch = entity.smallBatches.find(batch => batch.batchKey === key);
  return {
    order: entity.order,
    entityType: entity.entityType,
    label: entity.label,
    href: entity.href,
    priority: entity.priority,
    current: entity.minimalTargets[key].current,
    target: entity.minimalTargets[key].target,
    targetDelta: entity.minimalTargets[key].targetDelta,
    actionType: smallBatch?.actionType || null,
    sourceTypes: smallBatch?.sourceTypes || [],
    acceptance: smallBatch?.acceptance || null,
  };
}

function actionTypeToMissingKey(type) {
  if (type === 'person_intake') return 'people';
  if (type === 'activity_backfill') return 'activity';
  if (type === 'work_backfill') return 'works';
  return type;
}

function buildRemediationActions(item) {
  return item.missing.map(missing => {
    if (missing.key === 'people') {
      return {
        type: 'person_intake',
        label: '补相关人物',
        targetDelta: Math.max(0, missing.target - missing.current),
        acceptance: `${item.label} 入口相关人物达到 ${missing.target} 个，且人物状态为 ready 或 active。`,
        guidance: item.type === 'topic'
          ? '优先补有代表论文、开源项目、课程或机构身份的人物；不要只因为文章提到过该话题就打标签。'
          : '优先补创始人、核心研究员、工程负责人、公开代表项目维护者和重要 alumni；需要官方页或可靠来源支持。',
      };
    }

    if (missing.key === 'activity') {
      return {
        type: 'activity_backfill',
        label: '补近期动态',
        targetDelta: Math.max(0, missing.target - missing.current),
        sourceTypes: ACTIVITY_SOURCE_TYPES,
        acceptance: `${item.label} 入口近 365 天可展示动态达到 ${missing.target} 条，每条都有 title、url 和人物归属。`,
        guidance: '优先补论文、GitHub、官方博客、访谈、播客和职位变化；媒体二手内容只作为候选，进入默认流前要能回源。',
      };
    }

    return {
      type: 'work_backfill',
      label: '补代表论文或项目',
      targetDelta: Math.max(0, missing.target - missing.current),
      sourceTypes: WORK_SOURCE_TYPES,
      acceptance: `${item.label} 入口代表论文或项目达到 ${missing.target} 个，并能关联到具体人物。`,
      guidance: '优先 OpenAlex 论文、GitHub repo、官方模型/项目页；避免把泛新闻当代表作品。',
    };
  });
}

function buildSearchBrief(item) {
  const topNames = item.topPeople.map(person => person.name).filter(Boolean);
  const base = item.type === 'topic'
    ? [
        `${item.label} AI key researchers papers GitHub`,
        `${item.label} large language models representative people`,
        `${item.label} survey paper authors open source`,
      ]
    : [
        `${item.label} AI team founders researchers GitHub papers`,
        `${item.label} research blog papers AI`,
        `${item.label} leadership engineering team AI`,
      ];

  return {
    intent: item.type === 'topic'
      ? `把 ${item.label} 从薄话题补成可分享的主题资产。`
      : `把 ${item.label} 从薄机构入口补成有团队、动态和代表作品的机构资产。`,
    queries: topNames.length > 0
      ? [...base, `${item.label} ${topNames.slice(0, 3).join(' ')} papers projects`]
      : base,
    reviewRules: [
      '新增人物必须能解释为什么属于该 topic/org。',
      '新增动态必须有可访问 URL、标题和明确人物归属。',
      '新增代表作品必须能关联到具体人物或机构，不能只靠泛新闻摘要。',
    ],
  };
}

function entityHref(item) {
  return item.type === 'topic'
    ? `/topic/${encodeURIComponent(item.label)}`
    : `/org/${encodeURIComponent(item.label)}`;
}

function parseArgs(args) {
  const options = {
    days: 365,
    format: 'table',
    outputPath: null,
    remediationOutputPath: null,
    remediationLimit: 12,
    batchSize: 5,
    batchMissingKey: 'all',
    sampleLimit: 3,
    sourceRowLimit: 80,
    failOnThin: false,
    topics: TOPICS.slice(0, 10),
    organizations: ORGANIZATIONS.slice(0, 10),
    thresholds: {
      topicPeople: 10,
      topicActivity: 10,
      topicWorks: 5,
      organizationPeople: 5,
      organizationActivity: 5,
      organizationWorks: 5,
    },
  };

  for (const arg of args) {
    if (arg === '--all') {
      options.topics = TOPICS;
      options.organizations = ORGANIZATIONS;
    } else if (arg === '--fail-on-thin') {
      options.failOnThin = true;
    } else if (arg.startsWith('--format=')) {
      const value = arg.slice('--format='.length);
      if (['table', 'json'].includes(value)) options.format = value;
    } else if (arg.startsWith('--output=')) {
      options.outputPath = arg.slice('--output='.length);
    } else if (arg.startsWith('--remediation-output=')) {
      options.remediationOutputPath = arg.slice('--remediation-output='.length);
    } else if (arg.startsWith('--remediation-limit=')) {
      options.remediationLimit = clampInteger(arg.slice('--remediation-limit='.length), 1, 200, options.remediationLimit);
    } else if (arg.startsWith('--top=')) {
      options.remediationLimit = clampInteger(arg.slice('--top='.length), 1, 200, options.remediationLimit);
    } else if (arg.startsWith('--batch-size=')) {
      options.batchSize = clampInteger(arg.slice('--batch-size='.length), 1, 50, options.batchSize);
    } else if (arg.startsWith('--batch-missing=')) {
      const value = arg.slice('--batch-missing='.length);
      if (['all', ...MISSING_KEY_ORDER].includes(value)) options.batchMissingKey = value;
    } else if (arg.startsWith('--sample-limit=')) {
      options.sampleLimit = clampInteger(arg.slice('--sample-limit='.length), 0, 20, options.sampleLimit);
    } else if (arg.startsWith('--source-row-limit=')) {
      options.sourceRowLimit = clampInteger(arg.slice('--source-row-limit='.length), 10, 500, options.sourceRowLimit);
    } else if (arg.startsWith('--days=')) {
      options.days = clampInteger(arg.slice('--days='.length), 1, 3650, options.days);
    } else if (arg.startsWith('--topics=')) {
      options.topics = parseList(arg.slice('--topics='.length), TOPICS);
    } else if (arg.startsWith('--organizations=')) {
      options.organizations = parseList(arg.slice('--organizations='.length), ORGANIZATIONS);
    } else if (arg.startsWith('--topic-people=')) {
      options.thresholds.topicPeople = clampInteger(arg.slice('--topic-people='.length), 0, 1000, options.thresholds.topicPeople);
    } else if (arg.startsWith('--topic-activity=')) {
      options.thresholds.topicActivity = clampInteger(arg.slice('--topic-activity='.length), 0, 1000, options.thresholds.topicActivity);
    } else if (arg.startsWith('--topic-works=')) {
      options.thresholds.topicWorks = clampInteger(arg.slice('--topic-works='.length), 0, 1000, options.thresholds.topicWorks);
    } else if (arg.startsWith('--organization-people=')) {
      options.thresholds.organizationPeople = clampInteger(arg.slice('--organization-people='.length), 0, 1000, options.thresholds.organizationPeople);
    } else if (arg.startsWith('--organization-activity=')) {
      options.thresholds.organizationActivity = clampInteger(arg.slice('--organization-activity='.length), 0, 1000, options.thresholds.organizationActivity);
    } else if (arg.startsWith('--organization-works=')) {
      options.thresholds.organizationWorks = clampInteger(arg.slice('--organization-works='.length), 0, 1000, options.thresholds.organizationWorks);
    }
  }

  return options;
}

function printTable(snapshot) {
  console.log(`Entity density audit (${snapshot.days} days)`);
  console.log(`Ready: ${snapshot.summary.readyEntityCount}/${snapshot.summary.entityCount} (${Math.round(snapshot.summary.readyRate * 100)}%)`);
  console.log('');
  printEntityRows('Topics', snapshot.topics);
  console.log('');
  printEntityRows('Organizations', snapshot.organizations);

  if (snapshot.summary.thinEntityCount > 0) {
    console.log('');
    console.log('Thin entities:');
    for (const item of snapshot.summary.thinnest) {
      console.log(`- ${item.type}:${item.label} missing ${item.missing.join(', ')}`);
    }
  }

  if (snapshot.remediationQueue.length > 0) {
    console.log('');
    console.log('Remediation queue:');
    console.table(snapshot.remediationQueue.map(item => ({
      rank: item.queueRank,
      priority: item.priority,
      score: Number(item.score.toFixed(1)),
      entity: `${item.entity.type}:${item.entity.label}`,
      primary: item.primaryMissingKey,
      missing: item.missing.map(entry => entry.key).join(','),
      actions: item.nextActions.map(action => action.type).join(','),
    })));
  }

  if (snapshot.nextBatchExecutionList.length > 0) {
    console.log('');
    console.log(`Next batch (${snapshot.batch.batchMissingKey}, size ${snapshot.batch.batchSize}):`);
    console.table(snapshot.nextBatchExecutionList.map(item => ({
      order: item.order,
      priority: item.priority,
      entity: `${item.entityType}:${item.label}`,
      batch: item.batchMissingKey,
      primary: item.primaryMissingKey,
      missing: item.missingKeys.join(','),
    })));
  }
}

function printEntityRows(title, items) {
  console.log(title);
  for (const item of items) {
    const mark = item.status === 'ready' ? 'ok' : 'thin';
    const metrics = item.metrics;
    const current = metrics.currentPeopleCount === null ? '' : ` current=${metrics.currentPeopleCount}`;
    const alumni = metrics.alumniPeopleCount === null ? '' : ` alumni=${metrics.alumniPeopleCount}`;
    const missing = item.missing.length > 0 ? ` missing=${item.missing.map(entry => entry.key).join(',')}` : '';
    console.log(`- [${mark}] ${item.label}: people=${metrics.peopleCount} activity=${metrics.activityCount} works=${metrics.workCount}${current}${alumni}${missing}`);
  }
}

function toSampleSource(row) {
  return {
    sourceType: row.sourceType,
    title: row.title,
    url: row.url,
  };
}

function parseList(value, fallback) {
  const list = value.split(',').map(item => item.trim()).filter(Boolean);
  return list.length > 0 ? list : fallback;
}

function uniqueCount(values) {
  return new Set(values.filter(Boolean)).size;
}

function uniqueStrings(values) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
}

function countBy(values) {
  const counts = {};
  for (const value of values) {
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

function ratio(numerator, denominator) {
  if (denominator <= 0) return 1;
  return Number((numerator / denominator).toFixed(4));
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}
