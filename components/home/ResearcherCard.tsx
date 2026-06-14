'use client';

import { memo, useCallback, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { CompareButton } from '@/components/common/CompareButton';
import { INFLUENCE_SCORE_VERSION, INFLUENCE_SCORE_WEIGHTS } from '@/lib/influence-scoring';
import { buildTopicHref, type DirectoryPerson, type DirectorySortKey } from '@/lib/person-directory-config';

interface ResearcherCardProps {
  person: DirectoryPerson;
  rank?: number;
  isHot?: boolean;
  sortBy?: DirectorySortKey;
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

// 从 currentTitle 中提取机构名称，如 "CEO @ OpenAI" -> "OpenAI"
function extractOrgFromTitle(title: string | null): string {
  if (!title) return '';
  const parts = title.split('@');
  if (parts.length >= 2) {
    return parts[parts.length - 1].trim();
  }
  return '';
}

function formatOrganizationMatch(person: DirectoryPerson): string | null {
  const match = person.organizationMatch;
  if (!match) return null;

  const prefixByStatus = {
    current: '当前',
    past: '曾任',
    role: '履历关联',
    profile: '资料关联',
  } as const;
  const prefix = prefixByStatus[match.status];
  const role = match.role ? ` · ${match.role}` : '';
  const fallbackEndYear = match.status === 'past' ? '未知' : '至今';
  const years = match.startYear || match.endYear
    ? ` · ${match.startYear || '?'}-${match.endYear || fallbackEndYear}`
    : '';

  return `${prefix} ${match.organization}${role}${years}`;
}

function preventMouseFocus(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
}

function isPlainLeftClick(event: MouseEvent<HTMLElement>) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function shouldIgnoreCardClick(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('a, button, input, select, textarea, [role="button"]'));
}

function formatCompactNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(value);
}

function formatSortSignal(person: DirectoryPerson, sortBy: DirectorySortKey): string {
  if (sortBy === 'weeklyViewCount') return `近 7 天 ${person.weeklyViewCount} 次访问`;
  return `影响力 ${person.influenceScore.toFixed(1)}`;
}

// 使用 memo 包裹整个组件，避免父组件重渲染时子组件不必要的渲染
export const ResearcherCard = memo(function ResearcherCard({ person, rank, isHot, sortBy = 'influenceScore' }: ResearcherCardProps) {
  const router = useRouter();
  const detailHref = `/person/${person.id}`;
  const hasPrefetchedRef = useRef(false);
  const roleLabel = person.roleCategory ? ROLE_LABELS[person.roleCategory] : null;
  // 优先使用 currentTitle 中的机构，回退到 organization[0]
  const primaryOrg = extractOrgFromTitle(person.currentTitle) || person.organization[0] || '';
  const safeDescription = person.description || '资料还在整理中，先查看已确认的职位、机构和主题线索。';
  const organizationMatchText = formatOrganizationMatch(person);

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    if (event.defaultPrevented || !isPlainLeftClick(event) || shouldIgnoreCardClick(event.target)) return;
    router.push(detailHref);
  };

  const prefetchDetail = useCallback(() => {
    if (hasPrefetchedRef.current) return;
    hasPrefetchedRef.current = true;
    router.prefetch(detailHref);
  }, [detailHref, router]);

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    router.push(detailHref);
  };

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`查看 ${person.name} 的详情`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      onMouseEnter={prefetchDetail}
      onFocus={prefetchDetail}
      className="card-interactive relative p-4 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
    >
      {/* Rank Badge */}
      {rank && rank <= 3 && <RankBadge rank={rank} />}

      {/* Weekly Heat Badge */}
      {isHot && (
        <div
          className="absolute -top-1.5 -right-1.5 text-white text-[10px] font-medium px-2 py-0.5 rounded-full z-10"
          style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-glow)' }}
        >
          本周热度
        </div>
      )}

      {/* Header: Avatar + Name + Org */}
      <div className="flex items-start gap-3 mb-3">
        <Link
          href={detailHref}
          aria-label={`查看 ${person.name} 的详情`}
          onMouseDown={preventMouseFocus}
          className="relative w-11 h-11 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 ring-1 ring-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          {/* Avatar */}
          {person.avatarUrl ? (
            <Image
              src={person.avatarUrl}
              alt={person.name}
              fill
              className="object-cover object-top"
              sizes="44px"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-sm font-semibold text-white"
              style={{ backgroundColor: getAvatarColor(person.name) }}
            >
              {person.name.charAt(0)}
            </div>
          )}
        </Link>

        {/* Name & Org */}
        <div className="flex-1 min-w-0">
          <Link href={detailHref} onMouseDown={preventMouseFocus} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded-md">
            <h3 className="text-sm font-semibold text-stone-900 truncate group-hover:text-orange-600 transition-colors">
              {person.name}
            </h3>
          </Link>
          <p className="text-xs text-stone-500 truncate">{person.currentTitle || primaryOrg}</p>
          {organizationMatchText && (
            <div
              className={`mt-1 max-w-full truncate rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
                person.organizationMatch?.isCurrent
                  ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                  : 'border-amber-100 bg-amber-50 text-amber-700'
              }`}
              title={organizationMatchText}
            >
              {organizationMatchText}
            </div>
          )}
          {roleLabel && person.roleCategory && (
            <Link
              href={`/?view=role&role=${encodeURIComponent(person.roleCategory)}`}
              onMouseDown={preventMouseFocus}
              className="inline-block mt-1 text-[10px] font-medium text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded-md hover:bg-orange-100 hover:border-orange-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            >
              {roleLabel}
            </Link>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="mb-2.5 min-h-[2.5rem] text-[11px] leading-5 text-stone-600 line-clamp-2">
        {safeDescription}
      </p>

      {/* Topics */}
      {person.topics && person.topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {person.topics.slice(0, 3).map((topic, i) => (
            <Link
              key={i}
              href={buildTopicHref(topic)}
              onMouseDown={preventMouseFocus}
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${TOPIC_STYLE} hover:bg-orange-100 hover:text-orange-700 hover:border-orange-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300`}
            >
              {topic}
            </Link>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2.5 border-t border-stone-100">
        <div className="relative group/score flex items-center gap-1 text-[10px] text-stone-400">
          <StarIcon />
          <span className="font-medium text-stone-500">{formatSortSignal(person, sortBy)}</span>
          {/* 打分规则提示 */}
          <div className="absolute bottom-full left-0 mb-2 w-56 p-3 bg-stone-900 text-white text-[10px] rounded-lg shadow-lg opacity-0 invisible group-hover/score:opacity-100 group-hover/score:visible group-focus-within/score:opacity-100 group-focus-within/score:visible transition-all z-50 pointer-events-none">
            <div className="font-medium mb-1.5 text-orange-400">影响力与榜单信号</div>
            <ul className="space-y-1 text-stone-300">
              <li>综合影响力: {person.influenceScore.toFixed(1)}</li>
              <li>近 7 天访问: {person.weeklyViewCount}</li>
              <li>论文引用: {formatCompactNumber(person.citationCount)}</li>
              <li>GitHub stars: {formatCompactNumber(person.githubStars)}</li>
            </ul>
            <div className="mt-2 border-t border-stone-700 pt-2 text-stone-400">
              综合分参考 · {INFLUENCE_SCORE_VERSION}
            </div>
            <ul className="mt-1 space-y-1 text-stone-400">
              {INFLUENCE_SCORE_WEIGHTS.map(weight => (
                <li key={weight.key}>{weight.label} ({weight.weight}%)</li>
              ))}
            </ul>
            <div className="absolute -bottom-1 left-3 w-2 h-2 bg-stone-900 transform rotate-45"></div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <CompareButton target={{ id: person.id, name: person.name }} />
          <Link
            href={detailHref}
            onMouseDown={preventMouseFocus}
            className="text-[10px] text-stone-500 group-hover:text-orange-600 transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 rounded-md px-1 py-0.5"
          >
            进入详情 →
          </Link>
        </div>
      </div>
    </article>
  );
});
