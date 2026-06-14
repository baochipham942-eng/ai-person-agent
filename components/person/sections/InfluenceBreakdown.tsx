import { computeInfluenceScore } from '@/lib/influence-scoring';

interface Product {
  name: string;
  org?: string;
  year?: string | number;
  description: string;
}

interface PersonRole {
  id: string;
  role: string;
  roleZh: string | null;
  startDate?: string | null;
  endDate?: string | null;
  source?: string | null;
  confidence?: number | null;
  organizationName: string;
  organizationNameZh: string | null;
  organizationType: string;
}

interface Card {
  id: string;
  sourceUrl?: string | null;
}

interface InfluenceBreakdownProps {
  influenceScore: number;
  citationCount: number;
  hIndex: number;
  githubStars: number;
  weeklyViewCount: number;
  sourceTypeCounts: Record<string, number>;
  products?: Product[] | null;
  personRoles?: PersonRole[];
  cards: Card[];
}

export function InfluenceBreakdown({
  influenceScore,
  citationCount,
  hIndex,
  githubStars,
  weeklyViewCount,
  sourceTypeCounts,
  products,
  personRoles,
  cards,
}: InfluenceBreakdownProps) {
  const scoreResult = computeInfluenceScore({
    citationCount,
    hIndex,
    githubStars,
    weeklyViewCount,
    sourceTypeCounts,
    products,
    personRoles,
    cards,
  });
  const dimensions = scoreResult.dimensions;
  const scoreDelta = influenceScore - scoreResult.weightedScore;

  return (
    <section className="card-base p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 border-b border-stone-100 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 text-xs font-medium text-orange-600">影响力解释</div>
          <h2 className="text-sm font-medium text-stone-900">为什么排在这里</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-stone-500">
            当前榜单分数结合学术、开源、产业、内容和近期信号。内容曝光只作为发现线索，不直接等同于高置信贡献。
          </p>
          <div className="mt-2 text-[11px] font-medium text-stone-400">
            权重版本 {scoreResult.version} · 证据置信 {Math.round(scoreResult.confidence * 100)}%
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <MetricPill label="综合影响力" value={influenceScore.toFixed(1)} />
          <MetricPill label="版本预估" value={scoreResult.weightedScore.toFixed(1)} />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        {dimensions.map(dimension => (
          <div key={dimension.key} className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-stone-900">{dimension.label}</div>
              <div className="text-[11px] text-stone-400">{dimension.weight}%</div>
            </div>
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-orange-500"
                style={{ width: `${Math.max(4, dimension.score)}%` }}
              />
            </div>
            <div className="text-sm font-semibold text-stone-950">{Math.round(dimension.score)}</div>
            <div className="mt-1 text-[11px] leading-4 text-stone-500">{dimension.signal}</div>
            <div className="mt-2 border-t border-stone-100 pt-2 text-[10px] leading-4 text-stone-400">
              {dimension.note}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-stone-50 px-3 py-3 text-xs leading-5 text-stone-500">
        榜单差异的读法: “综合影响力”更看长期贡献和可验证资料，“最近热度”只看近 7 天站内访问；学术和开源只作为已匹配到的引用、H-index、GitHub stars 信号，不把缺失数据当成低影响力。当前存量分与版本预估相差 {scoreDelta.toFixed(1)}，需要校准时以审计记录为准。
      </div>
    </section>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-24 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2">
      <div className="text-lg font-semibold text-stone-950">{value}</div>
      <div className="mt-0.5 text-[11px] text-stone-500">{label}</div>
    </div>
  );
}
