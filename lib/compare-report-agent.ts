import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { fetchComparePeople, type ComparePerson } from '@/lib/compare';
import { COMPARE_AGENT_TOOLS, type CompareAgentToolKey } from '@/lib/compare-report';
import { searchTavily, isTavilyConfigured, type TavilySearchResult } from '@/lib/tavily-search';

export const DEFAULT_COMPARE_TOPIC = 'AI 观点、商业路径、安全治理、开放策略、算力基础设施、未来判断';

export const COMPARE_REPORT_STYLE_COMPONENTS = [
  {
    component: 'ReportHero',
    fields: ['title', 'subtitle', 'summary'],
    contract: '说明这份报告在比较谁、围绕什么问题、基于多少资料。标题直接用人物名和报告类型，summary 用一段话交代阅读入口。',
  },
  {
    component: 'VerdictCard',
    fields: ['verdict.headline', 'verdict.body'],
    contract: '给出全篇最核心判断。headline 要像编辑判断，不要写成泛泛概括；body 解释差异来自角色、组织位置、产品路径或公开观点。',
  },
  {
    component: 'CoverageRail',
    fields: ['coverage'],
    contract: '只描述来源覆盖和资料限制，用普通用户能理解的话。不要出现数据库、RawPool、pipeline、agent、verifier 等内部词。',
  },
  {
    component: 'StanceCards',
    fields: ['people[].stanceSummary'],
    contract: '每个人一张短卡，先说身份位置，再说主要关注点或代表成果。每张卡只写一个清楚角度。',
  },
  {
    component: 'ViewpointMatrix',
    fields: ['dimensions'],
    contract: '每个维度必须同时有共同点、差异点和每个人自己的视角。差异要可比较，不要把两个人分别介绍完就结束。',
  },
  {
    component: 'TimelineStrip',
    fields: ['timeline'],
    contract: '只放输入里已有日期或成果年份，用来解释观点或路径如何变化；没有时间证据时宁可少写。',
  },
  {
    component: 'AnalysisCards',
    fields: ['analysisSections'],
    contract: '把长分析拆成 2 到 4 张卡，每张卡围绕一个问题：为什么可比、差异从哪里来、读者该谨慎看哪里。',
  },
  {
    component: 'EvidenceCards',
    fields: ['evidence'],
    contract: '直接复用输入 evidence，不新增来源。excerpt 保留能支撑判断的短摘录。',
  },
] as const;

export const COMPARE_REPORT_STEPS = [
  { step: 'match_people', toolKey: 'people', title: '正在确认人物' },
  { step: 'load_metrics', toolKey: 'metrics', title: '正在整理影响力指标' },
  { step: 'load_relations', toolKey: 'relations', title: '正在检查关系证据' },
  { step: 'load_activity', toolKey: 'activity', title: '正在读取近期动态' },
  { step: 'load_local_context', toolKey: 'profile', title: '正在整理公开资料' },
  { step: 'assess_coverage', toolKey: 'review', title: '正在判断资料覆盖' },
  { step: 'web_search', toolKey: 'search', title: '正在补充近期公开信息' },
  { step: 'build_evidence_pack', toolKey: 'evidence', title: '正在整理关键证据' },
  { step: 'extract_claims', toolKey: 'claims', title: '正在提取观点线索' },
  { step: 'align_dimensions', toolKey: 'compare', title: '正在对齐观点差异' },
  { step: 'generate_report', toolKey: 'report', title: '正在生成分析报告' },
  { step: 'verify_report', toolKey: 'verify', title: '正在检查来源和表述' },
  { step: 'persist_report', toolKey: 'publish', title: '正在保存报告' },
] as const satisfies ReadonlyArray<{
  step: string;
  toolKey: CompareAgentToolKey;
  title: string;
}>;

export type CompareReportStep = typeof COMPARE_REPORT_STEPS[number]['step'];
export type CompareReportRunStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface CompareReportContent {
  title: string;
  subtitle: string;
  summary: string;
  verdict: {
    headline: string;
    body: string;
  };
  people: Array<{
    id: string;
    name: string;
    avatarUrl: string | null;
    currentTitle: string | null;
    stanceSummary: string;
    evidenceCount: number;
  }>;
  dimensions: Array<{
    key: string;
    label: string;
    sharedView: string;
    differences: string;
    personViews: Array<{
      personId: string;
      personName: string;
      view: string;
    }>;
    confidence: 'high' | 'medium' | 'low';
    evidenceIds: string[];
  }>;
  timeline: Array<{
    label: string;
    date: string | null;
    personId: string | null;
    description: string;
    sourceUrl: string | null;
  }>;
  evidence: ReportEvidence[];
  analysisSections: Array<{
    title: string;
    body: string;
  }>;
  coverage: {
    sourceCount: number;
    localSourceCount: number;
    webSourceCount: number;
    limitations: string[];
  };
}

export interface ReportEvidence {
  id: string;
  personId: string;
  personName: string;
  title: string;
  url: string | null;
  sourceType: string;
  publishedAt: string | null;
  excerpt: string;
}

interface LoadedPersonContext {
  id: string;
  name: string;
  aliases: string[];
  avatarUrl: string | null;
  description: string | null;
  currentTitle: string | null;
  organization: string[];
  topics: string[];
  products: ComparePerson['products'];
  comparePerson: ComparePerson;
  cards: Array<{
    id: string;
    title: string;
    content: string;
    sourceUrl: string | null;
    type: string;
  }>;
  rawSources: Array<{
    id: string;
    sourceType: string;
    url: string;
    title: string;
    text: string;
    publishedAt: Date | null;
  }>;
  activityEvents: Array<{
    id: string;
    title: string;
    summary: string | null;
    url: string;
    sourceType: string;
    occurredAt: Date | null;
    detectedAt: Date;
  }>;
}

interface CoverageAssessment {
  localSourceCount: number;
  limitations: string[];
  perPerson: Array<{
    personId: string;
    personName: string;
    sourceCount: number;
    cardCount: number;
    topicCount: number;
    productCount: number;
  }>;
}

interface EvidencePack {
  evidence: ReportEvidence[];
  localSourceCount: number;
  webSourceCount: number;
  webSearchErrors: string[];
}

interface ClaimPack {
  people: Array<{
    personId: string;
    personName: string;
    claims: string[];
  }>;
}

const ReportContentSchema: z.ZodType<CompareReportContent> = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  summary: z.string().min(1),
  verdict: z.object({
    headline: z.string().min(1),
    body: z.string().min(1),
  }),
  people: z.array(z.object({
    id: z.string(),
    name: z.string(),
    avatarUrl: z.string().nullable(),
    currentTitle: z.string().nullable(),
    stanceSummary: z.string(),
    evidenceCount: z.number(),
  })),
  dimensions: z.array(z.object({
    key: z.string(),
    label: z.string(),
    sharedView: z.string(),
    differences: z.string(),
    personViews: z.array(z.object({
      personId: z.string(),
      personName: z.string(),
      view: z.string(),
    })),
    confidence: z.enum(['high', 'medium', 'low']),
    evidenceIds: z.array(z.string()),
  })),
  timeline: z.array(z.object({
    label: z.string(),
    date: z.string().nullable(),
    personId: z.string().nullable(),
    description: z.string(),
    sourceUrl: z.string().nullable(),
  })),
  evidence: z.array(z.object({
    id: z.string(),
    personId: z.string(),
    personName: z.string(),
    title: z.string(),
    url: z.string().nullable(),
    sourceType: z.string(),
    publishedAt: z.string().nullable(),
    excerpt: z.string(),
  })),
  analysisSections: z.array(z.object({
    title: z.string(),
    body: z.string(),
  })),
  coverage: z.object({
    sourceCount: z.number(),
    localSourceCount: z.number(),
    webSourceCount: z.number(),
    limitations: z.array(z.string()),
  }),
});

export async function runCompareReportAgent(reportId: string): Promise<CompareReportContent> {
  const report = await prisma.compareReport.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      title: true,
      topic: true,
      peopleIds: true,
    },
  });

  if (!report) {
    throw new Error(`Compare report not found: ${reportId}`);
  }

  await prisma.compareReport.update({
    where: { id: reportId },
    data: { status: 'running', errorMessage: null },
  });

  try {
    const people = await runStep(reportId, 'match_people', async () => {
      const matched = await fetchComparePeople(report.peopleIds);
      if (matched.length < 2) {
        throw new Error('至少需要 2 位可公开展示的人物。');
      }
      return matched;
    }, `${report.peopleIds.length} 位候选人物`);

    await runStep(reportId, 'load_metrics', async () => {
      return summarizeCompareMetrics(people);
    }, '读取综合影响力、学术、开源和近期热度指标');

    await runStep(reportId, 'load_relations', async () => {
      return summarizeCompareRelations(people);
    }, '检查关系数量、关系证据和置信度');

    await runStep(reportId, 'load_activity', async () => {
      return summarizeCompareActivity(people);
    }, '整理近期动态数量和事件覆盖');

    const contexts = await runStep(reportId, 'load_local_context', async () => {
      return loadPersonContexts(people);
    }, '读取人物资料、观点摘录、来源和近期动态');

    const coverage = await runStep(reportId, 'assess_coverage', async () => {
      return assessSourceCoverage(contexts);
    }, '判断每位人物可用资料是否足够');

    const webResults = await runStep(reportId, 'web_search', async () => {
      return searchPublicContext(contexts, report.topic || DEFAULT_COMPARE_TOPIC);
    }, isTavilyConfigured() ? '使用 Tavily 池补充公开资料' : '未配置 Tavily 池，跳过联网补充');

    const evidencePack = await runStep(reportId, 'build_evidence_pack', async () => {
      return buildEvidencePack(contexts, webResults, coverage);
    }, '合并本地资料和公开搜索结果');

    const claims = await runStep(reportId, 'extract_claims', async () => {
      return extractClaims(contexts, evidencePack);
    }, '提取每位人物可对比的观点线索');

    const dimensions = await runStep(reportId, 'align_dimensions', async () => {
      return alignClaims(contexts, claims, evidencePack);
    }, '按观点维度组织差异和共同点');

    const content = await runStep(reportId, 'generate_report', async () => {
      return generateReportContent({
        title: report.title,
        topic: report.topic || DEFAULT_COMPARE_TOPIC,
        contexts,
        evidencePack,
        coverage,
        dimensions,
      });
    }, '生成普通用户可读的报告');

    const verifiedContent = await runStep(reportId, 'verify_report', async () => {
      return verifyReportContent(content, evidencePack, coverage);
    }, '检查公开表述和来源覆盖');

    await runStep(reportId, 'persist_report', async () => {
      await prisma.compareReport.update({
        where: { id: reportId },
        data: {
          title: verifiedContent.title,
          status: 'completed',
          summary: verifiedContent.summary,
          reportJson: verifiedContent as unknown as Prisma.InputJsonValue,
          sourceSnapshot: buildSourceSnapshot(evidencePack, coverage) as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });
      return true;
    }, '报告已保存');

    return verifiedContent;
  } catch (error) {
    const message = error instanceof Error ? error.message : '报告生成失败';
    await writeReportEvent(reportId, 'generate_report', 'failed', '生成失败', publicErrorMessage(message));
    await prisma.compareReport.update({
      where: { id: reportId },
      data: {
        status: 'failed',
        errorMessage: publicErrorMessage(message),
      },
    });
    throw error;
  }
}

export async function writeReportEvent(
  reportId: string,
  step: CompareReportStep,
  status: 'queued' | 'running' | 'completed' | 'failed',
  title: string,
  message?: string,
  metadata?: Record<string, unknown>
) {
  return prisma.compareReportEvent.create({
    data: {
      reportId,
      step,
      status,
      title,
      message,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

async function runStep<T>(
  reportId: string,
  step: CompareReportStep,
  fn: () => Promise<T>,
  message: string
): Promise<T> {
  const stepMeta = COMPARE_REPORT_STEPS.find(item => item.step === step);
  const title = stepMeta?.title || step;
  const metadata = stepMeta ? { toolKey: stepMeta.toolKey } : undefined;
  await writeReportEvent(reportId, step, 'running', title, message, metadata);

  try {
    const result = await fn();
    await writeReportEvent(reportId, step, 'completed', stepCompletedTitle(title), stepCompletedMessage(step, result), metadata);
    return result;
  } catch (error) {
    const detail = error instanceof Error ? error.message : '处理失败';
    await writeReportEvent(reportId, step, 'failed', stepFailedTitle(title), publicErrorMessage(detail), metadata);
    throw error;
  }
}

async function loadPersonContexts(people: ComparePerson[]): Promise<LoadedPersonContext[]> {
  const ids = people.map(person => person.id);
  const rows = await prisma.people.findMany({
    where: {
      id: { in: ids },
      status: { in: ['ready', 'active'] },
    },
    select: {
      id: true,
      name: true,
      aliases: true,
      avatarUrl: true,
      description: true,
      currentTitle: true,
      organization: true,
      topics: true,
      cards: {
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          content: true,
          sourceUrl: true,
          type: true,
        },
        orderBy: [{ importance: 'desc' }, { updatedAt: 'desc' }],
        take: 8,
      },
      rawPoolItems: {
        where: { fetchStatus: 'success' },
        select: {
          id: true,
          sourceType: true,
          url: true,
          title: true,
          text: true,
          publishedAt: true,
        },
        orderBy: [{ publishedAt: 'desc' }, { fetchedAt: 'desc' }],
        take: 10,
      },
      activityEvents: {
        select: {
          id: true,
          title: true,
          summary: true,
          url: true,
          sourceType: true,
          occurredAt: true,
          detectedAt: true,
        },
        orderBy: [{ occurredAt: 'desc' }, { detectedAt: 'desc' }],
        take: 4,
      },
    },
  });

  const rowById = new Map(rows.map(row => [row.id, row]));
  return people.map(person => {
    const row = rowById.get(person.id);
    return {
      id: person.id,
      name: person.name,
      aliases: row?.aliases || [],
      avatarUrl: person.avatarUrl,
      description: person.description,
      currentTitle: person.currentTitle,
      organization: person.organization,
      topics: person.topics,
      products: person.products,
      comparePerson: person,
      cards: row?.cards || [],
      rawSources: row?.rawPoolItems || [],
      activityEvents: row?.activityEvents || [],
    };
  });
}

function assessSourceCoverage(contexts: LoadedPersonContext[]): CoverageAssessment {
  const perPerson = contexts.map(person => ({
    personId: person.id,
    personName: person.name,
    sourceCount: person.rawSources.length,
    cardCount: person.cards.length,
    topicCount: person.topics.length,
    productCount: person.products.length,
  }));
  const localSourceCount = perPerson.reduce((sum, item) => sum + item.sourceCount + item.cardCount, 0);
  const limitations: string[] = [];

  for (const item of perPerson) {
    if (item.sourceCount + item.cardCount < 4) {
      limitations.push(`${item.personName} 的公开资料覆盖仍偏少，结论会更谨慎。`);
    }
    if (item.topicCount === 0) {
      limitations.push(`${item.personName} 的 AI 话题标签还不完整。`);
    }
    if (item.productCount === 0) {
      limitations.push(`${item.personName} 的代表成果资料还需要补充。`);
    }
  }

  return {
    localSourceCount,
    limitations: uniqueStrings(limitations),
    perPerson,
  };
}

function summarizeCompareMetrics(people: ComparePerson[]) {
  return {
    people: people.length,
    influenceScores: people.map(person => ({ personId: person.id, value: person.influenceScore })),
    citationLeaders: people
      .map(person => ({ personId: person.id, name: person.name, citationCount: person.citationCount, hIndex: person.hIndex }))
      .sort((left, right) => right.citationCount - left.citationCount)
      .slice(0, 3),
    githubLeaders: people
      .map(person => ({ personId: person.id, name: person.name, githubStars: person.githubStars }))
      .sort((left, right) => right.githubStars - left.githubStars)
      .slice(0, 3),
  };
}

function summarizeCompareRelations(people: ComparePerson[]) {
  const totalRelations = people.reduce((sum, person) => sum + person.relationCount, 0);
  const relationsWithEvidence = people.reduce(
    (sum, person) => sum + person.relations.filter(relation => relation.hasEvidence).length,
    0,
  );

  return {
    totalRelations,
    relationsWithEvidence,
    people: people.map(person => ({
      personId: person.id,
      relationCount: person.relationCount,
      visibleRelations: person.relations.length,
      relationsWithEvidence: person.relations.filter(relation => relation.hasEvidence).length,
    })),
  };
}

function summarizeCompareActivity(people: ComparePerson[]) {
  return {
    totalEvents: people.reduce((sum, person) => sum + person.latestEvents.length, 0),
    people: people.map(person => ({
      personId: person.id,
      latestEvents: person.latestEvents.length,
      eventTypes: uniqueStrings(person.latestEvents.map(event => event.eventType)),
    })),
  };
}

async function searchPublicContext(
  contexts: LoadedPersonContext[],
  topic: string
): Promise<Array<{ personId: string; query: string; results: TavilySearchResult[]; error?: string }>> {
  if (!isTavilyConfigured()) {
    return contexts.map(person => ({
      personId: person.id,
      query: '',
      results: [],
      error: '未配置 Tavily 搜索池',
    }));
  }

  const maxSearches = Math.min(Math.max(Number(process.env.COMPARE_REPORT_TAVILY_MAX_CALLS || 30), 1), 30);
  const perPersonLimit = Math.max(1, Math.floor(maxSearches / contexts.length));
  const searches = [];
  for (const person of contexts) {
    const queries = buildTavilyQueries(person, topic).slice(0, perPersonLimit);
    for (const query of queries) {
      if (searches.length >= maxSearches) break;
      searches.push(
        searchTavily(query, { maxResults: 4 })
          .then(results => ({ personId: person.id, query, results }))
          .catch(error => ({
            personId: person.id,
            query,
            results: [],
            error: error instanceof Error ? publicErrorMessage(error.message) : '搜索失败',
          }))
      );
    }
  }

  return Promise.all(searches);
}

function buildTavilyQueries(person: LoadedPersonContext, topic: string): string[] {
  const alias = person.aliases.find(item => /^[a-z][a-z\s.'-]+$/i.test(item));
  const queryName = alias && alias !== person.name ? `${person.name} ${alias}` : person.name;
  const org = person.organization[0] || '';
  const topics = person.topics.slice(0, 4);
  const bases = [
    `${queryName} AI views interview`,
    `${queryName} artificial intelligence strategy interview`,
    `${queryName} AI safety regulation governance`,
    `${queryName} open source AI model strategy`,
    `${queryName} AGI future of AI`,
    `${queryName} AI business product strategy`,
    `${queryName} recent interview AI 2025 2026`,
    `${queryName} ${topic}`,
    org ? `${queryName} ${org} AI strategy` : '',
    person.currentTitle ? `${queryName} ${person.currentTitle} AI` : '',
    ...topics.map(item => `${queryName} ${item} views`),
  ];

  return uniqueStrings(bases)
    .filter(Boolean)
    .map(query => query.slice(0, 280));
}

function buildEvidencePack(
  contexts: LoadedPersonContext[],
  webResults: Array<{ personId: string; query: string; results: TavilySearchResult[]; error?: string }>,
  coverage: CoverageAssessment
): EvidencePack {
  const evidence: ReportEvidence[] = [];
  const seen = new Set<string>();

  for (const person of contexts) {
    for (const source of person.rawSources) {
      addEvidence(evidence, seen, {
        id: `local-${source.id}`,
        personId: person.id,
        personName: person.name,
        title: source.title || publicSourceLabel(source.sourceType),
        url: source.url || null,
        sourceType: publicSourceLabel(source.sourceType),
        publishedAt: source.publishedAt ? source.publishedAt.toISOString() : null,
        excerpt: cleanEvidenceExcerpt(source.text, 260),
      });
    }

    for (const card of person.cards) {
      addEvidence(evidence, seen, {
        id: `card-${card.id}`,
        personId: person.id,
        personName: person.name,
        title: card.title,
        url: card.sourceUrl,
        sourceType: '观点摘录',
        publishedAt: null,
        excerpt: cleanEvidenceExcerpt(card.content, 240),
      });
    }

    for (const event of person.activityEvents) {
      addEvidence(evidence, seen, {
        id: `event-${event.id}`,
        personId: person.id,
        personName: person.name,
        title: event.title,
        url: event.url,
        sourceType: publicSourceLabel(event.sourceType),
        publishedAt: (event.occurredAt || event.detectedAt).toISOString(),
        excerpt: cleanEvidenceExcerpt(event.summary || event.title, 220),
      });
    }
  }

  for (const item of webResults) {
    const person = contexts.find(context => context.id === item.personId);
    if (!person) continue;

    for (const result of item.results) {
      addEvidence(evidence, seen, {
        id: `web-${hashString(result.url)}`,
        personId: person.id,
        personName: person.name,
        title: result.title,
        url: result.url,
        sourceType: '公开网页',
        publishedAt: result.publishedDate,
        excerpt: cleanEvidenceExcerpt(result.text, 280),
      });
    }
  }

  const localSourceCount = coverage.localSourceCount;
  const webSourceCount = webResults.reduce((sum, item) => sum + item.results.length, 0);
  const webSearchErrors = uniqueStrings(webResults.flatMap(item => item.error ? [item.error] : []));

  return {
    evidence: evidence.slice(0, 36),
    localSourceCount,
    webSourceCount,
    webSearchErrors,
  };
}

function extractClaims(contexts: LoadedPersonContext[], evidencePack: EvidencePack): ClaimPack {
  return {
    people: contexts.map(person => {
      const claims = [
        person.description ? `${person.name} 的基本定位：${truncate(person.description, 120)}` : null,
        person.currentTitle ? `${person.name} 当前身份：${person.currentTitle}` : null,
        person.topics.length ? `${person.name} 的主要 AI 话题：${person.topics.slice(0, 5).join('、')}` : null,
        person.products.length ? `${person.name} 的代表成果包括 ${person.products.slice(0, 3).map(product => product.name).join('、')}` : null,
        ...evidencePack.evidence
          .filter(item => item.personId === person.id)
          .slice(0, 3)
          .map(item => `${item.title}：${truncate(item.excerpt, 120)}`),
      ].filter((item): item is string => Boolean(item));

      return {
        personId: person.id,
        personName: person.name,
        claims,
      };
    }),
  };
}

function alignClaims(contexts: LoadedPersonContext[], claims: ClaimPack, evidencePack: EvidencePack): CompareReportContent['dimensions'] {
  const evidenceIds = evidencePack.evidence.slice(0, 8).map(item => item.id);
  const claimByPerson = new Map(claims.people.map(person => [person.personId, person.claims]));
  const sharedTopics = intersection(contexts.map(person => person.topics)).slice(0, 4);

  return [
    {
      key: 'ai_position',
      label: 'AI 立场和关注点',
      sharedView: sharedTopics.length
        ? `共同交集集中在 ${sharedTopics.join('、')}。`
        : '都处在 AI 产业或研究链条中，但公开资料呈现的关注点并不完全重合。',
      differences: contexts.map(person => `${person.name} 更常被资料关联到 ${person.topics.slice(0, 3).join('、') || '个人经历与代表成果'}`).join('；'),
      personViews: contexts.map(person => ({
        personId: person.id,
        personName: person.name,
        view: claimByPerson.get(person.id)?.slice(0, 2).join('；') || `${person.name} 的观点资料仍需补充。`,
      })),
      confidence: evidencePack.evidence.length >= contexts.length * 4 ? 'medium' : 'low',
      evidenceIds,
    },
    {
      key: 'execution_path',
      label: '实现路径',
      sharedView: '都通过组织、产品或研究成果影响 AI 发展。',
      differences: contexts.map(person => {
        const products = person.products.slice(0, 2).map(product => product.name).join('、');
        return `${person.name} 的公开成果锚点${products ? `包括 ${products}` : '仍偏少'}`;
      }).join('；'),
      personViews: contexts.map(person => ({
        personId: person.id,
        personName: person.name,
        view: person.products.length
          ? `代表成果：${person.products.slice(0, 3).map(product => product.name).join('、')}。`
          : '代表成果资料仍需补充。',
      })),
      confidence: 'medium',
      evidenceIds,
    },
    {
      key: 'recent_change',
      label: '近期变化',
      sharedView: '近期公开动态会影响外界对他们路线的判断。',
      differences: contexts.map(person => {
        const latest = person.activityEvents[0];
        return `${person.name}${latest ? `最近的公开线索是 ${latest.title}` : '近期动态资料较少'}`;
      }).join('；'),
      personViews: contexts.map(person => ({
        personId: person.id,
        personName: person.name,
        view: person.activityEvents.slice(0, 2).map(event => event.title).join('；') || '近期动态资料较少。',
      })),
      confidence: evidencePack.webSourceCount > 0 ? 'medium' : 'low',
      evidenceIds,
    },
  ];
}

async function generateReportContent(input: {
  title: string;
  topic: string;
  contexts: LoadedPersonContext[];
  evidencePack: EvidencePack;
  coverage: CoverageAssessment;
  dimensions: CompareReportContent['dimensions'];
}): Promise<CompareReportContent> {
  const fallback = buildFallbackReportContent(input);
  if (!isMimoConfigured()) {
    return fallback;
  }

  try {
    const raw = await callMimo({
      title: input.title,
      topic: input.topic,
      people: input.contexts.map(person => ({
        id: person.id,
        name: person.name,
        currentTitle: person.currentTitle,
        description: person.description,
        topics: person.topics,
        products: person.products,
      })),
      evidence: input.evidencePack.evidence.slice(0, 22),
      dimensions: input.dimensions,
      limitations: [...input.coverage.limitations, ...input.evidencePack.webSearchErrors],
    });

    const parsed = ReportContentSchema.parse(raw);
    return normalizeGeneratedContent(parsed, fallback, input);
  } catch (error) {
    console.warn('[compare-report-agent] MiMo generation failed, using fallback:', error);
    return {
      ...fallback,
      coverage: {
        ...fallback.coverage,
        limitations: uniqueStrings([
          ...fallback.coverage.limitations,
          '模型生成暂时不可用，当前报告先基于已整理资料生成。',
        ]),
      },
    };
  }
}

function verifyReportContent(
  content: CompareReportContent,
  evidencePack: EvidencePack,
  coverage: CoverageAssessment
): CompareReportContent {
  const limitations = uniqueStrings([
    ...content.coverage.limitations,
    ...coverage.limitations,
    ...evidencePack.webSearchErrors,
    evidencePack.evidence.length === 0 ? '当前缺少可展开来源，结论只适合作为导航线索。' : null,
  ].filter((item): item is string => Boolean(item)));

  return sanitizeCompareReportContent({
    ...content,
    title: stripInternalTerms(content.title),
    subtitle: stripInternalTerms(content.subtitle),
    summary: stripInternalTerms(content.summary),
    verdict: {
      headline: stripInternalTerms(content.verdict.headline),
      body: stripInternalTerms(content.verdict.body),
    },
    analysisSections: content.analysisSections.map(section => ({
      title: stripInternalTerms(section.title),
      body: stripInternalTerms(section.body),
    })),
    coverage: {
      sourceCount: evidencePack.evidence.length,
      localSourceCount: evidencePack.localSourceCount,
      webSourceCount: evidencePack.webSourceCount,
      limitations,
    },
  });
}

export function sanitizeCompareReportContent(content: CompareReportContent): CompareReportContent {
  return {
    ...content,
    title: cleanPublicText(content.title),
    subtitle: cleanPublicText(content.subtitle),
    summary: cleanPublicText(content.summary),
    verdict: {
      headline: cleanPublicText(content.verdict.headline),
      body: cleanPublicText(content.verdict.body),
    },
    people: content.people.map(person => ({
      ...person,
      name: cleanPublicText(person.name),
      currentTitle: person.currentTitle ? cleanPublicText(person.currentTitle) : null,
      stanceSummary: cleanPublicText(person.stanceSummary),
    })),
    dimensions: content.dimensions.map(dimension => ({
      ...dimension,
      label: cleanPublicText(dimension.label),
      sharedView: cleanPublicText(dimension.sharedView),
      differences: cleanPublicText(dimension.differences),
      personViews: dimension.personViews.map(view => ({
        ...view,
        personName: cleanPublicText(view.personName),
        view: cleanPublicText(view.view),
      })),
    })),
    timeline: content.timeline.map(item => ({
      ...item,
      label: cleanPublicText(item.label),
      description: cleanPublicText(item.description),
    })),
    evidence: content.evidence.map(item => ({
      ...item,
      personName: cleanPublicText(item.personName),
      title: cleanPublicText(item.title),
      sourceType: publicSourceLabel(item.sourceType),
      excerpt: cleanEvidenceExcerpt(item.excerpt, 280),
    })),
    analysisSections: content.analysisSections.map(section => ({
      title: cleanPublicText(section.title),
      body: cleanPublicText(section.body),
    })),
    coverage: {
      ...content.coverage,
      limitations: uniqueStrings(content.coverage.limitations.map(cleanPublicText)),
    },
  };
}

function buildFallbackReportContent(input: {
  title: string;
  topic: string;
  contexts: LoadedPersonContext[];
  evidencePack: EvidencePack;
  coverage: CoverageAssessment;
  dimensions: CompareReportContent['dimensions'];
}): CompareReportContent {
  const names = input.contexts.map(person => person.name).join(' vs ');
  const localSourceCount = input.evidencePack.localSourceCount;
  const webSourceCount = input.evidencePack.webSourceCount;

  return {
    title: input.title || `${names} 人物对比报告`,
    subtitle: input.topic,
    summary: `${names} 的对比重点在于他们分别通过哪些组织、产品和公开观点影响 AI 方向。当前报告基于 ${localSourceCount + webSourceCount} 条公开资料整理。`,
    verdict: {
      headline: buildVerdictHeadline(input.contexts),
      body: buildVerdictBody(input.contexts),
    },
    people: input.contexts.map(person => ({
      id: person.id,
      name: person.name,
      avatarUrl: person.avatarUrl,
      currentTitle: person.currentTitle,
      stanceSummary: buildPersonStanceSummary(person),
      evidenceCount: input.evidencePack.evidence.filter(item => item.personId === person.id).length,
    })),
    dimensions: input.dimensions,
    timeline: buildTimeline(input.contexts, input.evidencePack),
    evidence: input.evidencePack.evidence.slice(0, 18),
    analysisSections: [
      {
        title: '他们真正可比的地方',
        body: input.contexts.map(person => `${person.name} 的公开资料主要落在 ${person.topics.slice(0, 4).join('、') || '个人履历和代表成果'}。`).join(' '),
      },
      {
        title: '差异从哪里来',
        body: input.contexts.map(person => `${person.name} 的路径锚点是 ${person.currentTitle || person.organization[0] || '公开身份资料'}，代表成果包括 ${person.products.slice(0, 3).map(product => product.name).join('、') || '仍需补充'}。`).join(' '),
      },
      {
        title: '阅读这份报告时要注意',
        body: input.coverage.limitations.length
          ? input.coverage.limitations.join(' ')
          : '当前资料覆盖基本可用，但强判断仍应回到每条公开来源逐一核对。',
      },
    ],
    coverage: {
      sourceCount: input.evidencePack.evidence.length,
      localSourceCount,
      webSourceCount,
      limitations: uniqueStrings([...input.coverage.limitations, ...input.evidencePack.webSearchErrors]),
    },
  };
}

function buildTimeline(contexts: LoadedPersonContext[], evidencePack: EvidencePack): CompareReportContent['timeline'] {
  return evidencePack.evidence
    .filter(item => item.publishedAt)
    .slice(0, 8)
    .map(item => ({
      label: item.personName,
      date: item.publishedAt,
      personId: item.personId,
      description: item.title,
      sourceUrl: item.url,
    }))
    .concat(contexts.flatMap(person => person.products.slice(0, 2).map(product => ({
      label: person.name,
      date: product.year ? String(product.year) : null,
      personId: person.id,
      description: `${product.name}：${product.description}`,
      sourceUrl: product.url || null,
    }))))
    .slice(0, 10);
}

function normalizeGeneratedContent(
  content: CompareReportContent,
  fallback: CompareReportContent,
  input: {
    contexts: LoadedPersonContext[];
    evidencePack: EvidencePack;
    coverage: CoverageAssessment;
  }
): CompareReportContent {
  const knownEvidenceIds = new Set(input.evidencePack.evidence.map(item => item.id));

  return {
    ...fallback,
    ...content,
    people: input.contexts.map(person => {
      const generated = content.people.find(item => item.id === person.id);
      return {
        id: person.id,
        name: person.name,
        avatarUrl: person.avatarUrl,
        currentTitle: person.currentTitle,
        stanceSummary: generated?.stanceSummary || buildPersonStanceSummary(person),
        evidenceCount: input.evidencePack.evidence.filter(item => item.personId === person.id).length,
      };
    }),
    dimensions: content.dimensions.length > 0
      ? content.dimensions.map(dimension => ({
        ...dimension,
        evidenceIds: dimension.evidenceIds.filter(id => knownEvidenceIds.has(id)).slice(0, 6),
      }))
      : fallback.dimensions,
    evidence: input.evidencePack.evidence.slice(0, 18),
    coverage: {
      sourceCount: input.evidencePack.evidence.length,
      localSourceCount: input.evidencePack.localSourceCount,
      webSourceCount: input.evidencePack.webSourceCount,
      limitations: uniqueStrings([
        ...content.coverage.limitations,
        ...input.coverage.limitations,
        ...input.evidencePack.webSearchErrors,
      ]),
    },
  };
}

async function callMimo(task: Record<string, unknown>): Promise<unknown> {
  const apiKey = process.env.XIAOMI_API_KEY;
  if (!apiKey) throw new Error('Missing XIAOMI_API_KEY');

  const baseUrl = (process.env.XIAOMI_API_URL || process.env.XIAOMI_BASE_URL || 'https://token-plan-sgp.xiaomimimo.com/v1').replace(/\/+$/, '');
  const model = process.env.MIMO_MODEL || 'mimo-v2.5-pro';

  const messages = [
    {
      role: 'system',
      content: [
        '你是面向普通用户的人物观点对比报告作者。',
        '页面导航、主站 header、按钮和页面壳由产品代码负责，你只生成报告内容 JSON。',
        '你必须按输入的 styleComponents 填充内容：ReportHero、VerdictCard、CoverageRail、StanceCards、ViewpointMatrix、TimelineStrip、AnalysisCards、EvidenceCards。',
        '只根据输入 evidence 写作，不要编造来源，不要出现 raw item、库、字段、verifier、agent SDK 等内部表达。',
        '语言要自然、有判断，但每个强判断都要能回到 evidenceIds。',
        '只输出 JSON。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        schema: 'CompareReportContent',
        styleComponents: COMPARE_REPORT_STYLE_COMPONENTS,
        requirements: [
          'title/subtitle/summary/verdict 要适合公开页面展示',
          '不要生成主导航、面包屑、按钮、工具栏或页面说明文本',
          '核心判断必须先给结论，再解释原因',
          'dimensions 需要覆盖共同点、差异点和每个人的视角',
          'analysisSections 要拆成短卡片，不要写成一整篇散文',
          'timeline 只使用输入中的时间或成果年份',
          'evidence 直接复用输入 evidence，不要新增不存在的来源',
          'coverage.limitations 要用普通用户能理解的话',
        ],
        task,
      }),
    },
  ];

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0,
      top_p: 0.95,
      max_completion_tokens: 4096,
      thinking: { type: 'disabled' },
      response_format: { type: 'json_object' },
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`MiMo request failed: HTTP ${response.status} ${responseText.slice(0, 240)}`);
  }

  const payload = JSON.parse(responseText) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('MiMo response missing content');
  }

  return extractJsonObject(content);
}

function isMimoConfigured(): boolean {
  return Boolean(process.env.XIAOMI_API_KEY);
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1];
  if (fenced) return JSON.parse(fenced);
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
  throw new Error(`Unable to parse JSON response: ${trimmed.slice(0, 240)}`);
}

function buildSourceSnapshot(evidencePack: EvidencePack, coverage: CoverageAssessment) {
  return {
    generatedAt: new Date().toISOString(),
    searchProvider: 'tavily',
    tools: COMPARE_AGENT_TOOLS,
    localSourceCount: evidencePack.localSourceCount,
    webSourceCount: evidencePack.webSourceCount,
    evidenceCount: evidencePack.evidence.length,
    people: coverage.perPerson,
    sources: evidencePack.evidence.map(item => ({
      id: item.id,
      personId: item.personId,
      title: item.title,
      url: item.url,
      sourceType: item.sourceType,
      publishedAt: item.publishedAt,
    })),
    issues: uniqueStrings([...coverage.limitations, ...evidencePack.webSearchErrors]),
  };
}

function addEvidence(evidence: ReportEvidence[], seen: Set<string>, item: ReportEvidence) {
  const key = item.url || `${item.personId}:${item.title}`;
  if (!key || seen.has(key)) return;
  if (!item.title && !item.excerpt) return;
  seen.add(key);
  evidence.push(item);
}

function buildVerdictHeadline(contexts: LoadedPersonContext[]): string {
  const names = contexts.map(person => person.name).join(' 和 ');
  return `${names} 的差异主要来自角色位置和实现路径`;
}

function buildVerdictBody(contexts: LoadedPersonContext[]): string {
  return contexts
    .map(person => `${person.name} 更容易从 ${person.currentTitle || person.organization[0] || '公开身份'} 和 ${person.topics.slice(0, 3).join('、') || '代表成果'} 来理解。`)
    .join(' ');
}

function buildPersonStanceSummary(person: LoadedPersonContext): string {
  const topics = person.topics.slice(0, 4).join('、');
  const products = person.products.slice(0, 2).map(product => product.name).join('、');
  if (topics && products) return `公开资料显示，这位人物主要围绕 ${topics} 展开影响，代表成果包括 ${products}。`;
  if (topics) return `公开资料显示，这位人物主要关联 ${topics}。`;
  if (products) return `公开资料显示，这位人物的代表成果包括 ${products}。`;
  return '公开资料仍偏基础，需要更多一手访谈或项目来源来判断观点。';
}

function publicSourceLabel(sourceType: string): string {
  const labels: Record<string, string> = {
    exa: '公开网页',
    web: '公开网页',
    x: '社交动态',
    grok: '社交动态',
    youtube: '视频',
    openalex: '论文',
    paper: '论文',
    github: 'GitHub',
    podcast: '播客',
    career: '履历资料',
    official: '官方资料',
  };
  return labels[sourceType] || sourceType;
}

function publicErrorMessage(message: string): string {
  if (/Tavily/i.test(message)) return '公开搜索暂时不可用，已保留本地资料分析。';
  if (/MiMo|XIAOMI/i.test(message)) return '模型生成暂时不可用，已保留任务状态。';
  return stripInternalTerms(message);
}

function stepCompletedTitle(title: string): string {
  return title.replace('正在', '已');
}

function stepFailedTitle(title: string): string {
  return title.replace('正在', '未能');
}

function stepCompletedMessage(step: CompareReportStep, result: unknown): string {
  if (step === 'match_people' && Array.isArray(result)) return `已确认 ${result.length} 位人物。`;
  if (step === 'load_metrics' && isMetricSummary(result)) return `整理了 ${result.people} 位人物的影响力、学术和开源指标。`;
  if (step === 'load_relations' && isRelationSummary(result)) return `读取 ${result.totalRelations} 条关系，其中 ${result.relationsWithEvidence} 条带证据。`;
  if (step === 'load_activity' && isActivitySummary(result)) return `整理了 ${result.totalEvents} 条近期动态。`;
  if (step === 'web_search' && Array.isArray(result)) {
    const count = result.reduce((sum, item) => sum + (Array.isArray(item.results) ? item.results.length : 0), 0);
    return count > 0 ? `补充了 ${count} 条公开资料。` : '没有补充到新的公开资料，将基于已有资料分析。';
  }
  if (step === 'build_evidence_pack' && isEvidencePack(result)) return `整理出 ${result.evidence.length} 条可展开资料。`;
  return '完成。';
}

function isEvidencePack(value: unknown): value is EvidencePack {
  return typeof value === 'object'
    && value !== null
    && Array.isArray((value as EvidencePack).evidence);
}

function isMetricSummary(value: unknown): value is ReturnType<typeof summarizeCompareMetrics> {
  return typeof value === 'object'
    && value !== null
    && typeof (value as ReturnType<typeof summarizeCompareMetrics>).people === 'number';
}

function isRelationSummary(value: unknown): value is ReturnType<typeof summarizeCompareRelations> {
  return typeof value === 'object'
    && value !== null
    && typeof (value as ReturnType<typeof summarizeCompareRelations>).totalRelations === 'number';
}

function isActivitySummary(value: unknown): value is ReturnType<typeof summarizeCompareActivity> {
  return typeof value === 'object'
    && value !== null
    && typeof (value as ReturnType<typeof summarizeCompareActivity>).totalEvents === 'number';
}

function stripInternalTerms(value: string): string {
  return value
    .replace(/\bEvidence quote\s*[:：]\s*/gi, '')
    .replace(/\bSelection reason\s*[:：]/gi, '资料说明：')
    .replace(/\bSource preview\s*[:：]/gi, '资料摘要：')
    .replace(/raw item/gi, '资料')
    .replace(/RawPoolItem/g, '资料')
    .replace(/verifier/gi, '检查')
    .replace(/字段/g, '资料项')
    .replace(/库里/g, '已有资料中')
    .replace(/他\/她/g, '这位人物')
    .trim();
}

function cleanEvidenceExcerpt(value: string, maxLength: number): string {
  const text = cleanMarkupText(value);
  const quote = text.match(/\bEvidence quote\s*[:：]\s*([\s\S]*?)(?=\s*(?:Selection reason|Source preview)\s*[:：]|$)/i)?.[1];
  const withoutMeta = (quote || text)
    .replace(/\bSelection reason\s*[:：][\s\S]*$/i, '')
    .replace(/\bSource preview\s*[:：][\s\S]*$/i, '')
    .replace(/\b资料说明\s*[:：][\s\S]*$/i, '')
    .replace(/\b资料摘要\s*[:：][\s\S]*$/i, '')
    .replace(/\bEvidence quote\s*[:：]\s*/gi, '')
    .replace(/\bPG-\d+\s+target\s*[:：][^。；]+[。；]?/gi, '');
  return truncate(cleanPublicText(withoutMeta), maxLength);
}

function cleanPublicText(value: string): string {
  return cleanMarkupText(stripInternalTerms(value))
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanMarkupText(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;?/g, "'")
    .replace(/&x27;?/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/!\[[^\]]*]\([^)]*$/g, '')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)]\([^)]*$/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/#{1,6}\s*/g, '')
    .replace(/Skip to main content\s*/gi, '')
    .replace(/Skip to footer\s*/gi, '')
    .replace(/\bTry Claude\b\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, maxLength: number): string {
  const clean = cleanText(value);
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1)}…`;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map(item => item.trim()).filter(Boolean))];
}

function intersection(groups: string[][]): string[] {
  if (groups.length === 0) return [];
  const [first, ...rest] = groups.map(group => new Set(group));
  return [...first].filter(item => rest.every(group => group.has(item)));
}

function hashString(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}
