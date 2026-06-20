'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import useSWR from 'swr';
import type { FeaturedCard, FeaturedCardKind } from '@/lib/home/featured-cards';

/**
 * 首页「本周推荐」——合并原「当期主题」+「本周推荐（活动轮播）」为一条异质精选流。
 * 一张卡可以是：人物 / 知识主题 / 视频 / 论文 / 新闻 / 推文 / 播客，每张都带一句推荐理由。
 * 默认服务端渲染（含 pin），筛选 topic/org 时按 /api/weekly-picks 重取（不含 pin）。
 */
interface WeeklyPicksStreamProps {
  topic?: string | null;
  organization?: string | null;
  initialCards?: FeaturedCard[];
  className?: string;
}

interface WeeklyPicksResponse {
  data: FeaturedCard[];
}

const FETCH_TIMEOUT_MS = 10000;

const fetcher = async (url: string): Promise<WeeklyPicksResponse> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error('Failed to fetch weekly picks');
    return res.json();
  } finally {
    window.clearTimeout(timeout);
  }
};

const KIND_META: Record<FeaturedCardKind, { label: string; dot: string; text: string }> = {
  person: { label: '人物', dot: 'bg-amber-500', text: 'text-amber-600' },
  thread: { label: '知识主题', dot: 'bg-orange-500', text: 'text-orange-600' },
  video: { label: '视频', dot: 'bg-rose-500', text: 'text-rose-600' },
  paper: { label: '论文', dot: 'bg-sky-500', text: 'text-sky-600' },
  article: { label: '新闻', dot: 'bg-stone-400', text: 'text-stone-500' },
  x_post: { label: '推文', dot: 'bg-stone-900', text: 'text-stone-700' },
  podcast: { label: '播客', dot: 'bg-violet-500', text: 'text-violet-600' },
};

export function WeeklyPicksStream({ topic, organization, initialCards, className = 'mb-3' }: WeeklyPicksStreamProps) {
  const hasInitial = initialCards !== undefined;
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (topic) params.set('topic', topic);
    if (organization) params.set('organization', organization);
    const query = params.toString();
    return query ? `/api/weekly-picks?${query}` : '/api/weekly-picks';
  }, [topic, organization]);

  const { data, error, isLoading } = useSWR<WeeklyPicksResponse>(apiUrl, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
    fallbackData: hasInitial ? { data: initialCards } : undefined,
    revalidateOnMount: !hasInitial || initialCards.length === 0,
  });

  const cards = data?.data ?? [];
  const showLoading = isLoading && !data;
  const scopeLabel = topic ? ` · ${topic}` : organization ? ` · ${organization}` : '';

  return (
    <section className={className} aria-label="本周推荐">
      <div className="mb-2 flex items-end justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-stone-900">本周推荐{scopeLabel}</h2>
          <p className="text-xs text-stone-500">AI 圈最近最值得看的人、主题与动态。</p>
        </div>
      </div>

      {showLoading ? (
        <ul className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
          {[...Array(3)].map((_, index) => (
            <li key={index} className="h-52 w-[82vw] flex-none snap-start animate-pulse rounded-xl border border-stone-100 bg-stone-50 sm:w-[22rem] lg:w-[24rem]" />
          ))}
        </ul>
      ) : error && cards.length === 0 ? (
        <div className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2.5 text-xs text-stone-500">
          本周推荐正在更新，下方目录仍可继续使用。
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-3 text-xs text-stone-500">
          本周暂时没有可展示的推荐。
        </div>
      ) : (
        <ul className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
          {cards.map(card => (
            <li key={card.id} className="w-[82vw] flex-none snap-start sm:w-[22rem] lg:w-[24rem]">
              <FeaturedCardView card={card} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FeaturedCardView({ card }: { card: FeaturedCard }) {
  const meta = KIND_META[card.kind];
  const className = featuredCardClassName(card);
  const body = <FeaturedCardBody card={card} meta={meta} />;

  if (card.external) {
    return (
      <a href={card.href} target="_blank" rel="noopener noreferrer" className={className}>
        {body}
      </a>
    );
  }
  return (
    <Link href={card.href} prefetch={false} className={className}>
      {body}
    </Link>
  );
}

function featuredCardClassName(card: FeaturedCard): string {
  const base =
    'flex flex-col rounded-xl border border-stone-200 bg-white px-4 py-3.5 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50/40';
  if (card.kind === 'video') return `${base} min-h-[22rem]`;
  if (card.kind === 'article') return `${base} min-h-40`;
  return `${base} min-h-48`;
}

function FeaturedCardBody({ card, meta }: { card: FeaturedCard; meta: (typeof KIND_META)[FeaturedCardKind] }) {
  // 人物卡：头像主导的纵向布局
  if (card.kind === 'person') {
    return (
      <>
        <div className={`flex items-center gap-1.5 text-[11px] font-medium ${meta.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </div>
        <div className="mt-2 flex items-center gap-2.5">
          <PersonAvatar name={card.person?.name ?? card.title} avatarUrl={card.person?.avatarUrl ?? null} size={40} />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold tracking-tight text-stone-950">{card.title}</h3>
            {card.person?.currentTitle && (
              <p className="truncate text-[11px] text-stone-500">{card.person.currentTitle}</p>
            )}
          </div>
        </div>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-600">
          <span className="font-medium text-stone-950">本周看点：</span>
          {card.whyNow}
        </p>
        <Topics topics={card.topics} />
      </>
    );
  }

  return (
    <>
      {card.kind === 'video' && card.thumbnailUrl && (
        <div className="relative mb-2 aspect-video w-full overflow-hidden rounded-lg bg-stone-100">
          {/* 用原生 img 避免把 img.youtube.com 加进 next.config remotePatterns */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.thumbnailUrl} alt={card.title} loading="lazy" className="h-full w-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </div>
      )}

      <div className={`flex items-center gap-1.5 text-[11px] font-medium ${meta.text}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
        {meta.label}
        {card.sourceLabel && card.kind !== 'thread' && (
          <span className="font-normal text-stone-400">· {card.sourceLabel}</span>
        )}
      </div>

      <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold tracking-tight text-stone-950">{card.title}</h3>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-600">
        <span className="font-medium text-stone-950">推荐理由：</span>
        {card.whyNow}
      </p>

      {card.person && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-stone-500">
          <PersonAvatar name={card.person.name} avatarUrl={card.person.avatarUrl} size={18} />
          <span className="min-w-0 truncate">{card.person.name}</span>
        </div>
      )}
      {!card.person && card.note && (
        <div className="mt-2 truncate text-[11px] text-stone-500">{card.note}</div>
      )}

      <Topics topics={card.topics} />
    </>
  );
}

function Topics({ topics }: { topics: string[] }) {
  if (topics.length === 0) return null;
  const visibleTopics = topics.slice(0, 3);
  return (
    <div className="mt-3 flex min-h-5 gap-1 overflow-hidden">
      {visibleTopics.map(topic => (
        <span
          key={topic}
          className="inline-flex max-w-[8rem] flex-shrink-0 items-center truncate rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-600"
        >
          {topic}
        </span>
      ))}
      {topics.length > visibleTopics.length && (
        <span className="inline-flex flex-shrink-0 items-center rounded-md bg-stone-50 px-1.5 py-0.5 text-[11px] font-medium text-stone-400">
          +{topics.length - visibleTopics.length}
        </span>
      )}
    </div>
  );
}

function PersonAvatar({ name, avatarUrl, size }: { name: string; avatarUrl: string | null; size: number }) {
  return (
    <span
      className="relative flex-shrink-0 overflow-hidden rounded-full bg-stone-100"
      style={{ width: size, height: size }}
    >
      {avatarUrl ? (
        <Image src={avatarUrl} alt={name} fill sizes={`${size}px`} className="object-cover object-top" />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-orange-500 text-xs font-semibold text-white">
          {name.charAt(0)}
        </span>
      )}
    </span>
  );
}
