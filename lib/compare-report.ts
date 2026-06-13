import type { ComparePerson } from '@/lib/compare';

export const COMPARE_AGENT_TOOLS = [
  {
    key: 'people',
    label: '选人',
    description: '确认 2 到 3 位可公开展示的人物，并保留 URL 可分享的选择结果。',
  },
  {
    key: 'profile',
    label: '资料',
    description: '读取人物身份、简介、话题、代表成果和已有观点摘录。',
  },
  {
    key: 'metrics',
    label: '指标',
    description: '整理综合影响力、论文引用、H-index、GitHub stars 和近期热度。',
  },
  {
    key: 'activity',
    label: '动态',
    description: '读取人物近期公开事件，避免对比只停留在长期静态画像。',
  },
  {
    key: 'relations',
    label: '关系',
    description: '检查人物关系、关系类型、置信度和可用证据。',
  },
  {
    key: 'search',
    label: '搜索',
    description: '按人物和主题补充近期公开信息，未配置搜索池时保守跳过。',
  },
  {
    key: 'evidence',
    label: '证据',
    description: '合并本地资料、公开搜索、动态和观点摘录，形成可展开证据包。',
  },
  {
    key: 'claims',
    label: '观点',
    description: '从证据中提取可比较的定位、路径、成果和近期变化线索。',
  },
  {
    key: 'compare',
    label: '对齐',
    description: '把人物线索对齐到共同维度，区分共同点、差异点和资料限制。',
  },
  {
    key: 'review',
    label: '审查',
    description: '检查资料覆盖、来源结构、关系证据、近期动态和可比性风险。',
  },
  {
    key: 'report',
    label: '报告',
    description: '基于审查后的数据生成可分享的人物对比结论和证据缺口。',
  },
  {
    key: 'verify',
    label: '校验',
    description: '清理内部表达，确认强判断有证据或限制说明。',
  },
  {
    key: 'publish',
    label: '保存',
    description: '保存公开报告、生成进度和来源快照，供分享页回读。',
  },
] as const;

export type CompareAgentToolKey = typeof COMPARE_AGENT_TOOLS[number]['key'];
export type CompareReviewSeverity = 'low' | 'medium' | 'high';
export type ComparePersonReviewStatus = 'ready' | 'limited' | 'review_needed';
export type CompareReportStatus = 'ready' | 'limited' | 'insufficient';

export interface CompareReviewIssue {
  key: string;
  severity: CompareReviewSeverity;
  label: string;
  detail: string;
}

export interface ComparePersonReview {
  personId: string;
  personName: string;
  status: ComparePersonReviewStatus;
  coverageScore: number;
  evidenceCounts: {
    totalSources: number;
    sourceTypes: number;
    products: number;
    topics: number;
    latestEvents: number;
    relations: number;
    relationsWithEvidence: number;
  };
  issues: CompareReviewIssue[];
}

export interface CompareReviewResult {
  status: CompareReportStatus;
  averageCoverageScore: number;
  people: ComparePersonReview[];
  issues: CompareReviewIssue[];
}

export interface CompareReportDimension {
  key: 'positioning' | 'influence' | 'academic' | 'open_source' | 'momentum' | 'evidence';
  label: string;
  summary: string;
  leaderId?: string;
  leaderName?: string;
}

export interface CompareReport {
  generatedAt: string;
  status: CompareReportStatus;
  selectedCount: number;
  tools: typeof COMPARE_AGENT_TOOLS;
  headline: string;
  executiveSummary: string[];
  analysis: {
    common: string[];
    differences: string[];
  };
  review: CompareReviewResult;
  dimensions: CompareReportDimension[];
  nextActions: string[];
}

export function reviewComparePeople(people: ComparePerson[]): CompareReviewResult {
  const personReviews = people.map(reviewComparePerson);
  const averageCoverageScore = personReviews.length > 0
    ? Math.round(personReviews.reduce((sum, item) => sum + item.coverageScore, 0) / personReviews.length)
    : 0;
  const issues = personReviews.flatMap(person => person.issues.map(issue => ({
    ...issue,
    key: `${person.personId}:${issue.key}`,
  })));

  return {
    status: reportStatusFromReview(personReviews, averageCoverageScore, people.length),
    averageCoverageScore,
    people: personReviews,
    issues,
  };
}

export function generateCompareReport(people: ComparePerson[]): CompareReport {
  const review = reviewComparePeople(people);
  const dimensions = buildDimensions(people, review);

  return {
    generatedAt: new Date().toISOString(),
    status: review.status,
    selectedCount: people.length,
    tools: COMPARE_AGENT_TOOLS,
    headline: buildHeadline(people),
    executiveSummary: buildExecutiveSummary(people, review, dimensions),
    analysis: buildAnalysis(people, review),
    review,
    dimensions,
    nextActions: buildNextActions(people, review),
  };
}

function reviewComparePerson(person: ComparePerson): ComparePersonReview {
  const sourceCounts = Object.values(person.sourceCounts);
  const totalSources = sourceCounts.reduce((sum, count) => sum + count, 0);
  const sourceTypes = sourceCounts.filter(count => count > 0).length;
  const relationsWithEvidence = person.relations.filter(relation => relation.hasEvidence).length;
  const issues: CompareReviewIssue[] = [];

  if (!person.description) {
    issues.push({
      key: 'missing_description',
      severity: 'medium',
      label: '缺少人物简介',
      detail: '报告只能依赖职位、话题和指标，人物定位会偏薄。',
    });
  }

  if (totalSources === 0) {
    issues.push({
      key: 'missing_sources',
      severity: 'high',
      label: '缺少可追溯来源',
      detail: '没有成功抓取的来源支撑，对比结论只能作为占位。',
    });
  } else if (totalSources < 3) {
    issues.push({
      key: 'thin_sources',
      severity: 'medium',
      label: '来源数量偏少',
      detail: `当前只有 ${totalSources} 条成功来源，适合先补核心论文、项目或访谈。`,
    });
  }

  if (sourceTypes === 1 && totalSources > 0) {
    issues.push({
      key: 'single_source_type',
      severity: 'low',
      label: '来源类型单一',
      detail: '单一来源会让跨人物比较偏向某一种影响力。',
    });
  }

  if (person.topics.length === 0) {
    issues.push({
      key: 'missing_topics',
      severity: 'medium',
      label: '缺少话题标签',
      detail: '无法判断人物在哪些 AI 方向上可比。',
    });
  }

  if (person.products.length === 0) {
    issues.push({
      key: 'missing_products',
      severity: 'medium',
      label: '缺少代表贡献',
      detail: '报告无法列出可读的成果锚点。',
    });
  }

  if (person.relationCount > 0 && relationsWithEvidence === 0) {
    issues.push({
      key: 'missing_relation_evidence',
      severity: 'high',
      label: '关系缺少证据',
      detail: '关系网络可以展示，但不适合支撑强结论。',
    });
  }

  if (person.latestEvents.length === 0) {
    issues.push({
      key: 'missing_recent_activity',
      severity: 'low',
      label: '缺少近期动态',
      detail: '最近变化模块会呈现空态，报告更偏长期画像。',
    });
  }

  const coverageScore = scoreCoverage({
    hasProfile: Boolean(person.description || person.currentTitle),
    totalSources,
    sourceTypes,
    products: person.products.length,
    topics: person.topics.length,
    latestEvents: person.latestEvents.length,
    relations: person.relationCount,
    relationsWithEvidence,
  });

  return {
    personId: person.id,
    personName: person.name,
    status: personStatusFromIssues(coverageScore, issues),
    coverageScore,
    evidenceCounts: {
      totalSources,
      sourceTypes,
      products: person.products.length,
      topics: person.topics.length,
      latestEvents: person.latestEvents.length,
      relations: person.relationCount,
      relationsWithEvidence,
    },
    issues,
  };
}

function scoreCoverage(input: {
  hasProfile: boolean;
  totalSources: number;
  sourceTypes: number;
  products: number;
  topics: number;
  latestEvents: number;
  relations: number;
  relationsWithEvidence: number;
}): number {
  const relationBase = input.relations > 0
    ? Math.min(input.relationsWithEvidence / Math.min(input.relations, 3), 1)
    : 0.6;
  const score =
    (input.hasProfile ? 18 : 0)
    + Math.min(input.totalSources / 8, 1) * 22
    + Math.min(input.sourceTypes / 4, 1) * 12
    + Math.min(input.products / 3, 1) * 16
    + Math.min(input.topics / 4, 1) * 12
    + Math.min(input.latestEvents / 3, 1) * 10
    + relationBase * 10;

  return Math.round(score);
}

function personStatusFromIssues(coverageScore: number, issues: CompareReviewIssue[]): ComparePersonReviewStatus {
  if (issues.some(issue => issue.severity === 'high')) return 'review_needed';
  if (coverageScore < 55 || issues.some(issue => issue.severity === 'medium')) return 'limited';
  return 'ready';
}

function reportStatusFromReview(
  people: ComparePersonReview[],
  averageCoverageScore: number,
  selectedCount: number
): CompareReportStatus {
  if (selectedCount < 2) return 'insufficient';
  if (people.some(person => person.status === 'review_needed') || averageCoverageScore < 55) return 'limited';
  return 'ready';
}

function buildDimensions(people: ComparePerson[], review: CompareReviewResult): CompareReportDimension[] {
  if (people.length < 2) return [];

  const influenceLeader = topBy(people, person => person.influenceScore);
  const citationLeader = topBy(people, person => person.citationCount);
  const githubLeader = topBy(people, person => person.githubStars);
  const activityLeader = topBy(people, person => person.latestEvents.length);
  const evidenceLeader = topBy(review.people, person => person.coverageScore);
  const sharedTopics = commonTopics(people);

  return [
    {
      key: 'positioning',
      label: '定位差异',
      summary: buildPositioningSummary(people, sharedTopics),
    },
    {
      key: 'influence',
      label: '综合影响力',
      summary: influenceLeader
        ? `${influenceLeader.item.name} 当前综合分最高，为 ${influenceLeader.value.toFixed(1)}。这个维度适合先看整体影响力，再回到学术、开源和近期动态拆因子。`
        : '综合影响力分布接近，建议结合具体场景再判断。',
      leaderId: influenceLeader?.item.id,
      leaderName: influenceLeader?.item.name,
    },
    {
      key: 'academic',
      label: '学术信号',
      summary: citationLeader && citationLeader.value > 0
        ? `${citationLeader.item.name} 的论文引用最高，为 ${formatCompactNumber(citationLeader.value)}，H-index 为 ${citationLeader.item.hIndex || 0}。`
        : '当前所选人物缺少明显学术指标差异。',
      leaderId: citationLeader?.item.id,
      leaderName: citationLeader?.item.name,
    },
    {
      key: 'open_source',
      label: '开源信号',
      summary: githubLeader && githubLeader.value > 0
        ? `${githubLeader.item.name} 的 GitHub stars 最高，为 ${formatCompactNumber(githubLeader.value)}，适合作为开源影响力的第一观察对象。`
        : '当前所选人物没有明显开源 stars 差异。',
      leaderId: githubLeader?.item.id,
      leaderName: githubLeader?.item.name,
    },
    {
      key: 'momentum',
      label: '近期变化',
      summary: activityLeader && activityLeader.value > 0
        ? `${activityLeader.item.name} 的近期动态最多，当前展示 ${activityLeader.value} 条，可优先看最近项目、论文或公开表达。`
        : '当前所选人物近期动态都偏少，报告主要反映长期资料。',
      leaderId: activityLeader?.item.id,
      leaderName: activityLeader?.item.name,
    },
    {
      key: 'evidence',
      label: '证据可信度',
      summary: evidenceLeader
        ? `${evidenceLeader.item.personName} 的资料覆盖分最高，为 ${evidenceLeader.item.coverageScore}。平均覆盖分 ${review.averageCoverageScore}，${statusText(review.status)}。`
        : `平均覆盖分 ${review.averageCoverageScore}，${statusText(review.status)}。`,
      leaderId: evidenceLeader?.item.personId,
      leaderName: evidenceLeader?.item.personName,
    },
  ];
}

function buildHeadline(people: ComparePerson[]): string {
  if (people.length < 2) return '请选择 2 到 3 位人物生成对比报告';

  const influenceLeader = topBy(people, person => person.influenceScore);
  const names = people.map(person => person.name).join('、');

  if (!influenceLeader) return `${names} 对比报告`;

  return `${names} 对比报告：${influenceLeader.item.name} 当前综合影响力最高`;
}

function buildExecutiveSummary(
  people: ComparePerson[],
  review: CompareReviewResult,
  dimensions: CompareReportDimension[]
): string[] {
  if (people.length < 2) {
    return ['凑齐 2 到 3 位人物后，系统会先审查资料覆盖，再生成可分享的对比报告。'];
  }

  const influence = dimensions.find(item => item.key === 'influence');
  const evidence = dimensions.find(item => item.key === 'evidence');
  const highIssueCount = review.issues.filter(issue => issue.severity === 'high').length;
  const mediumIssueCount = review.issues.filter(issue => issue.severity === 'medium').length;

  return [
    influence?.summary || '综合影响力差异暂不明显。',
    buildSourceSummary(review),
    highIssueCount > 0
      ? `审查发现 ${highIssueCount} 个高风险证据缺口，报告结论应先标记为有限可信。`
      : `审查未发现高风险缺口，仍有 ${mediumIssueCount} 个中等缺口可继续补强。`,
    evidence?.summary || `平均覆盖分 ${review.averageCoverageScore}。`,
  ];
}

function buildAnalysis(people: ComparePerson[], review: CompareReviewResult): CompareReport['analysis'] {
  if (people.length < 2) {
    return {
      common: ['需要至少 2 位人物才能分析共同点。'],
      differences: ['需要至少 2 位人物才能分析差异点。'],
    };
  }

  const sharedTopics = commonTopics(people);
  const influenceLeader = topBy(people, person => person.influenceScore);
  const citationLeader = topBy(people, person => person.citationCount);
  const githubLeader = topBy(people, person => person.githubStars);
  const activityLeader = topBy(people, person => person.latestEvents.length);
  const weakestReview = topBy(review.people, person => 100 - person.coverageScore);

  const common = [
    sharedTopics.length > 0
      ? `共同覆盖 ${sharedTopics.slice(0, 4).join('、')}，适合围绕这些话题做横向比较。`
      : '共同话题不明显，更适合按各自代表方向做差异化比较。',
    review.people.every(person => person.evidenceCounts.totalSources > 0)
      ? '两侧都有可追溯来源，报告可以展示证据限制，而不需要补占位信息。'
      : '至少一侧缺少可追溯来源，报告需要先保留谨慎判断。',
    people.every(person => person.products.length > 0)
      ? '两侧都有代表贡献，可把对比从指标比较推进到成果和路线比较。'
      : '代表贡献覆盖不均衡，成果维度还需要继续补资料。',
  ];

  const differences = uniqueStrings([
    influenceLeader ? `${influenceLeader.item.name} 综合影响力最高，适合作为整体影响力参照。` : '',
    citationLeader && citationLeader.value > 0 ? `${citationLeader.item.name} 学术引用更强，学术维度更有优势。` : '',
    githubLeader && githubLeader.value > 0 ? `${githubLeader.item.name} 开源 stars 更高，开源传播和开发者影响更突出。` : '',
    activityLeader && activityLeader.value > 0 ? `${activityLeader.item.name} 近期动态更多，短期关注价值更高。` : '',
    weakestReview && weakestReview.value > 0 ? `${weakestReview.item.personName} 的资料覆盖分相对更低，强结论要优先看证据缺口。` : '',
  ]).slice(0, 5);

  return {
    common,
    differences: differences.length > 0 ? differences : ['差异暂不明显，建议补充更多来源后再生成强判断。'],
  };
}

function buildSourceSummary(review: CompareReviewResult): string {
  const totalSources = review.people.reduce((sum, person) => sum + person.evidenceCounts.totalSources, 0);
  const totalRelationsWithEvidence = review.people.reduce((sum, person) => sum + person.evidenceCounts.relationsWithEvidence, 0);
  return `所选人物共覆盖 ${totalSources} 条成功来源、${totalRelationsWithEvidence} 条带证据关系，平均资料覆盖分 ${review.averageCoverageScore}。`;
}

function buildNextActions(people: ComparePerson[], review: CompareReviewResult): string[] {
  if (people.length < 2) return ['再选择至少 1 位人物。'];

  const actions: string[] = [];
  const highIssuePeople = review.people.filter(person => person.issues.some(issue => issue.severity === 'high'));
  const thinSourcePeople = review.people.filter(person => person.evidenceCounts.totalSources < 3);
  const missingProductPeople = review.people.filter(person => person.evidenceCounts.products === 0);

  if (highIssuePeople.length > 0) {
    actions.push(`优先复核 ${highIssuePeople.map(person => person.personName).join('、')} 的高风险证据缺口。`);
  }

  if (thinSourcePeople.length > 0) {
    actions.push(`补齐 ${thinSourcePeople.map(person => person.personName).join('、')} 的核心来源，至少覆盖论文、项目、访谈或官方资料中的两类。`);
  }

  if (missingProductPeople.length > 0) {
    actions.push(`补充 ${missingProductPeople.map(person => person.personName).join('、')} 的代表贡献，避免对比只剩指标比较。`);
  }

  if (actions.length === 0) {
    actions.push('可以直接分享报告，并按具体使用场景继续看学术、开源、产业或近期动态维度。');
  }

  return actions.slice(0, 3);
}

function buildPositioningSummary(people: ComparePerson[], sharedTopics: string[]): string {
  const clauses = people.map(person => {
    const topics = person.topics.slice(0, 2).join('、') || '主题待补';
    const product = person.products[0]?.name;
    return `${person.name} 偏 ${topics}${product ? `，代表贡献是 ${product}` : ''}`;
  });
  const shared = sharedTopics.length > 0 ? `共同话题集中在 ${sharedTopics.slice(0, 3).join('、')}。` : '共同话题暂不明显。';
  return `${clauses.join('；')}。${shared}`;
}

function commonTopics(people: ComparePerson[]): string[] {
  if (people.length === 0) return [];
  const [first, ...rest] = people.map(person => new Set(person.topics));
  return [...first].filter(topic => rest.every(topics => topics.has(topic)));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function topBy<T>(items: T[], valueOf: (item: T) => number): { item: T; value: number } | null {
  if (items.length === 0) return null;
  return items.reduce<{ item: T; value: number } | null>((best, item) => {
    const value = valueOf(item);
    if (!best || value > best.value) return { item, value };
    return best;
  }, null);
}

function statusText(status: CompareReportStatus): string {
  if (status === 'ready') return '可以生成正式报告';
  if (status === 'limited') return '报告可用，但需要保留证据限制提示';
  return '还不足以生成报告';
}

function formatCompactNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(value || 0);
}
