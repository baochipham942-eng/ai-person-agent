'use client';

import { useState } from 'react';
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

  // 无任何真实信号时（新入库/未富集人物）整块隐藏，不展示一排 0 让页面像坏掉。
  const hasSignal =
    influenceScore > 0 ||
    citationCount > 0 ||
    hIndex > 0 ||
    githubStars > 0 ||
    (products?.length ?? 0) > 0 ||
    cards.length > 0 ||
    Object.values(sourceTypeCounts).some(count => count > 0);

  const [open, setOpen] = useState(false);

  if (!hasSignal) return null;

  // 影响力评分是内部排序心智，不是读者价值——降到安静参考层，默认折叠。
  return (
    <section className="rounded-xl border border-stone-200/70 bg-stone-50/60 px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-stone-700">影响力评分构成</span>
          <span className="text-[11px] text-stone-400">内部排序参考</span>
        </span>
        <span className="flex items-center gap-2 text-xs text-stone-500">
          <span>综合 <span className="font-semibold text-stone-800">{influenceScore.toFixed(1)}</span></span>
          <svg
            className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="mt-3 border-t border-stone-200/70 pt-3">
          <p className="mb-3 max-w-2xl text-[11px] leading-5 text-stone-500">
            评分结合学术、开源、产业、内容和近期信号。内容曝光只作为发现线索，不等同于高置信贡献；缺失数据不计为低影响力。
            权重版本 {scoreResult.version} · 证据置信 {Math.round(scoreResult.confidence * 100)}%。
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {dimensions.map(dimension => (
              <div key={dimension.key} className="rounded-lg border border-stone-200 bg-white p-2.5">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold text-stone-700">{dimension.label}</div>
                  <div className="text-[10px] text-stone-400">{dimension.weight}%</div>
                </div>
                <div className="mb-1.5 h-1 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-orange-400" style={{ width: `${Math.max(4, dimension.score)}%` }} />
                </div>
                <div className="text-xs font-semibold text-stone-900">{Math.round(dimension.score)}</div>
                <div className="mt-0.5 text-[10px] leading-4 text-stone-500">{dimension.signal}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-4 text-stone-400">
            “综合影响力”看长期贡献与可验证资料，“最近热度”只看近 7 天站内访问。存量分与版本预估相差 {scoreDelta.toFixed(1)}，校准以审计记录为准。
          </p>
        </div>
      )}
    </section>
  );
}
