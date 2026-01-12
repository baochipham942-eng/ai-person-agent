'use client';

import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Highlight {
  icon: string;
  text: string;
}

interface ResearcherCardProps {
  person: {
    id: string;
    name: string;
    avatarUrl: string | null;
    organization: string[];
    topics: string[];
    highlights: Highlight[] | null;
    roleCategory: string | null;
    influenceScore: number;
  };
  rank?: number;
  isHot?: boolean;
}

// 根据名字生成一致的颜色（温暖色调）
function getAvatarColor(name: string): string {
  const colors = [
    '#f97316', '#ec4899', '#8b5cf6', '#06b6d4',
    '#10b981', '#f59e0b', '#ef4444', '#d946ef'
  ];
  const charCode = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  return colors[charCode % colors.length];
}

// 角色分类中文映射
const ROLE_LABELS: Record<string, string> = {
  researcher: '研究科学家',
  founder: '创始人/CEO',
  engineer: '工程师',
  professor: '教授',
  evangelist: '布道者'
};

// 统一话题标签样式
const TOPIC_STYLE = 'bg-stone-100 text-stone-600 border border-stone-200';

// 排名徽章 - 渐变效果
const RankBadge = memo(function RankBadge({ rank }: { rank: number }) {
  if (rank > 3) return null;

  const styles: Record<number, { bg: string; shadow: string }> = {
    1: { bg: 'var(--gradient-primary)', shadow: '0 2px 8px rgba(249, 115, 22, 0.3)' },
    2: { bg: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)', shadow: '0 2px 6px rgba(100, 116, 139, 0.3)' },
    3: { bg: 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)', shadow: '0 2px 6px rgba(234, 88, 12, 0.3)' },
  };

  return (
    <div
      className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center z-10 text-[10px] font-bold text-white"
      style={{ background: styles[rank].bg, boxShadow: styles[rank].shadow }}
    >
      {rank}
    </div>
  );
});

// 使用共享的 SVG 渐变，避免每个卡片都定义一个
const StarIcon = memo(function StarIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 20 20">
      <path
        fill="url(#shared-star-gradient)"
        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
      />
    </svg>
  );
});

// 共享 SVG 渐变定义 - 只需在页面中渲染一次
export function SharedSvgDefs() {
  return (
    <svg width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="shared-star-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// 使用 memo 包裹整个组件，避免父组件重渲染时子组件不必要的渲染
export const ResearcherCard = memo(function ResearcherCard({ person, rank, isHot }: ResearcherCardProps) {
  const roleLabel = person.roleCategory ? ROLE_LABELS[person.roleCategory] : null;
  const primaryOrg = person.organization[0] || '';
  const highlights = (person.highlights as Highlight[]) || [];

  return (
    <Link href={`/person/${person.id}`} className="block group">
      <div className="card-interactive relative p-4">
        {/* Rank Badge */}
        {rank && rank <= 3 && <RankBadge rank={rank} />}

        {/* Hot Badge */}
        {isHot && (
          <div
            className="absolute -top-1.5 -right-1.5 text-white text-[10px] font-medium px-2 py-0.5 rounded-full z-10"
            style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-glow)' }}
          >
            热门
          </div>
        )}

        {/* Header: Avatar + Name + Org */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 ring-1 ring-stone-100">
            {person.avatarUrl ? (
              <Image
                src={person.avatarUrl}
                alt={person.name}
                fill
                className="object-cover object-top"
                sizes="44px"
                unoptimized
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-sm font-semibold text-white"
                style={{ backgroundColor: getAvatarColor(person.name) }}
              >
                {person.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Name & Org */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-stone-900 truncate group-hover:text-orange-600 transition-colors">
              {person.name}
            </h3>
            <p className="text-xs text-stone-500 truncate">{primaryOrg}</p>
            {roleLabel && person.roleCategory && (
              <Link
                href={`/?view=role&role=${encodeURIComponent(person.roleCategory)}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-block mt-1 text-[10px] font-medium text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded-md hover:bg-orange-100 hover:border-orange-200 transition-colors"
              >
                {roleLabel}
              </Link>
            )}
          </div>
        </div>

        {/* Topics - 可点击跳转到详情页话题 Tab */}
        {person.topics && person.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {person.topics.slice(0, 3).map((topic, i) => (
              <Link
                key={i}
                href={`/person/${person.id}?section=topics&highlight=${encodeURIComponent(topic)}`}
                onClick={(e) => e.stopPropagation()}
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${TOPIC_STYLE} hover:bg-orange-100 hover:text-orange-700 hover:border-orange-200 transition-colors`}
              >
                {topic}
              </Link>
            ))}
          </div>
        )}

        {/* Highlights - 只显示1条 */}
        {highlights.length > 0 && (
          <div className="mb-2.5">
            <div className="flex items-start gap-1.5 text-[11px] text-stone-600">
              <span className="flex-shrink-0 text-[10px]">{highlights[0].icon}</span>
              <span className="line-clamp-1">{highlights[0].text}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2.5 border-t border-stone-100">
          <div className="relative group/score flex items-center gap-1 text-[10px] text-stone-400 cursor-help">
            <StarIcon />
            <span className="font-medium text-stone-500">{person.influenceScore.toFixed(1)}</span>
            {/* 打分规则提示 */}
            <div className="absolute bottom-full left-0 mb-2 w-56 p-3 bg-stone-900 text-white text-[10px] rounded-lg shadow-lg opacity-0 invisible group-hover/score:opacity-100 group-hover/score:visible transition-all z-50 pointer-events-none">
              <div className="font-medium mb-1.5 text-orange-400">影响力评分规则</div>
              <ul className="space-y-1 text-stone-300">
                <li>• 学术引用量 (30%)</li>
                <li>• 核心论文数量 (25%)</li>
                <li>• GitHub Stars (15%)</li>
                <li>• 社交媒体影响力 (15%)</li>
                <li>• 行业经历权重 (15%)</li>
              </ul>
              <div className="absolute -bottom-1 left-3 w-2 h-2 bg-stone-900 transform rotate-45"></div>
            </div>
          </div>
          <span className="text-[10px] text-stone-400 group-hover:text-orange-500 transition-colors font-medium">
            详情 →
          </span>
        </div>
      </div>
    </Link>
  );
});
