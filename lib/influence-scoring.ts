import scoringConfig from './influence-scoring-config.json';

export type InfluenceDimensionKey = 'academic' | 'opensource' | 'industry' | 'content' | 'recent';

export interface InfluenceScoringWeight {
  key: InfluenceDimensionKey;
  label: string;
  weight: number;
  note: string;
}

export interface InfluenceProductSignal {
  name?: string;
  org?: string;
  year?: string | number;
  description?: string;
  url?: string;
}

export interface InfluenceRoleSignal {
  endDate?: string | Date | null;
}

export interface InfluenceCardSignal {
  sourceUrl?: string | null;
}

export interface InfluenceScoreInput {
  citationCount?: number | null;
  hIndex?: number | null;
  githubStars?: number | null;
  weeklyViewCount?: number | null;
  sourceTypeCounts?: Record<string, number> | null;
  products?: InfluenceProductSignal[] | null;
  personRoles?: InfluenceRoleSignal[] | null;
  cards?: InfluenceCardSignal[] | null;
}

export interface InfluenceDimension {
  key: InfluenceDimensionKey;
  label: string;
  score: number;
  weight: number;
  signal: string;
  note: string;
}

export interface InfluenceScoreResult {
  version: string;
  scale: number;
  dimensions: InfluenceDimension[];
  weightedScore: number;
  weightedScore100: number;
  confidence: number;
  weights: InfluenceScoringWeight[];
  signals: {
    citationCount: number;
    hIndex: number;
    githubStars: number;
    weeklyViewCount: number;
    productCount: number;
    roleCount: number;
    currentRoleCount: number;
    mediaSignals: number;
    sourceBackedCards: number;
  };
}

export const INFLUENCE_SCORE_VERSION = scoringConfig.version;
export const INFLUENCE_SCORE_SCALE = scoringConfig.scale;
export const INFLUENCE_SCORE_WEIGHTS = scoringConfig.weights as InfluenceScoringWeight[];

export function computeInfluenceScore(input: InfluenceScoreInput): InfluenceScoreResult {
  const signals = buildSignals(input);
  const weightsByKey = new Map(INFLUENCE_SCORE_WEIGHTS.map(weight => [weight.key, weight]));
  const rawDimensions: Array<Pick<InfluenceDimension, 'key' | 'score' | 'signal'>> = [
    {
      key: 'academic',
      score: clamp100(normalizeLog(signals.citationCount, 100000) * 65 + normalizeLinear(signals.hIndex, 100) * 35),
      signal: `${formatCompactNumber(signals.citationCount)} 引用 · H-index ${signals.hIndex}`,
    },
    {
      key: 'opensource',
      score: clamp100(normalizeLog(signals.githubStars, 200000) * 100),
      signal: `${formatCompactNumber(signals.githubStars)} GitHub stars`,
    },
    {
      key: 'industry',
      score: clamp100(signals.productCount * 18 + signals.roleCount * 8 + signals.currentRoleCount * 14),
      signal: `${signals.productCount} 个代表贡献 · ${signals.roleCount} 条履历`,
    },
    {
      key: 'content',
      score: clamp100(signals.mediaSignals * 5 + signals.sourceBackedCards * 6),
      signal: `${signals.mediaSignals} 条媒体/内容 · ${signals.sourceBackedCards} 张有源卡片`,
    },
    {
      key: 'recent',
      score: clamp100(signals.weeklyViewCount * 3 + signals.mediaSignals * 2),
      signal: `近 7 天 ${signals.weeklyViewCount} 次访问`,
    },
  ];

  const dimensions: InfluenceDimension[] = rawDimensions.map(dimension => {
    const weight = weightsByKey.get(dimension.key);
    return {
      ...dimension,
      label: weight?.label || dimension.key,
      weight: weight?.weight || 0,
      note: weight?.note || '',
    };
  });

  const weightedScore100 = dimensions.reduce((sum, dimension) => {
    return sum + dimension.score * dimension.weight;
  }, 0) / 100;
  const weightedScore = clampScore(weightedScore100);

  return {
    version: INFLUENCE_SCORE_VERSION,
    scale: INFLUENCE_SCORE_SCALE,
    dimensions,
    weightedScore,
    weightedScore100,
    confidence: buildConfidence(signals),
    weights: INFLUENCE_SCORE_WEIGHTS,
    signals,
  };
}

export function formatCompactNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(value || 0);
}

export function clampScore(value: number): number {
  return Math.min(INFLUENCE_SCORE_SCALE, Math.max(0, value));
}

function buildSignals(input: InfluenceScoreInput): InfluenceScoreResult['signals'] {
  const products = input.products || [];
  const personRoles = input.personRoles || [];
  const cards = input.cards || [];
  const sourceRows = input.sourceTypeCounts || {};
  const mediaSignals = (sourceRows.youtube || 0) + (sourceRows.podcast || 0) + (sourceRows.exa || 0);

  return {
    citationCount: safeNumber(input.citationCount),
    hIndex: safeNumber(input.hIndex),
    githubStars: safeNumber(input.githubStars),
    weeklyViewCount: safeNumber(input.weeklyViewCount),
    productCount: products.length,
    roleCount: personRoles.length,
    currentRoleCount: personRoles.filter(role => !role.endDate).length,
    mediaSignals,
    sourceBackedCards: cards.filter(card => card.sourceUrl).length,
  };
}

function buildConfidence(signals: InfluenceScoreResult['signals']): number {
  let confidence = 0.35;
  if (signals.citationCount > 0 || signals.hIndex > 0) confidence += 0.18;
  if (signals.githubStars > 0) confidence += 0.12;
  if (signals.productCount > 0) confidence += 0.14;
  if (signals.roleCount > 0) confidence += 0.12;
  if (signals.sourceBackedCards > 0) confidence += 0.09;
  return Math.min(1, Number(confidence.toFixed(2)));
}

function normalizeLog(value: number, max: number): number {
  if (value <= 0) return 0;
  return Math.min(1, Math.log10(value + 1) / Math.log10(max + 1)) * 100;
}

function normalizeLinear(value: number, max: number): number {
  if (value <= 0) return 0;
  return Math.min(1, value / max) * 100;
}

function clamp100(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function safeNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
