'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import useSWR from 'swr';
import type { ActivityEvent } from '@/lib/activity';
import { buildTopicHref } from '@/lib/person-directory-config';

interface ActivityFeedProps {
  topic?: string | null;
  organization?: string | null;
  initialEvents?: ActivityEvent[];
}

interface ActivityResponse {
  data: ActivityEvent[];
}

const ACTIVITY_PREVIEW_TIMEOUT_MS = 2500;

const fetcher = async (url: string): Promise<ActivityResponse> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), ACTIVITY_PREVIEW_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error('Failed to fetch activity');
    return res.json();
  } finally {
    window.clearTimeout(timeout);
  }
};

export function ActivityFeed({ topic, organization, initialEvents }: ActivityFeedProps) {
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      limit: '1',
      days: '7',
      includeRelations: 'false',
    });
    if (topic) params.set('topic', topic);
    if (organization) params.set('organization', organization);
    return `/api/activity?${params}`;
  }, [topic, organization]);

  const { data, error, isLoading } = useSWR<ActivityResponse>(apiUrl, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
    fallbackData: initialEvents ? { data: initialEvents } : undefined,
  });
  const featuredEvent = data?.data?.[0] || null;
  const showLoading = isLoading && !data;
  const scopeLabel = topic ? ` · ${topic}` : organization ? ` · ${organization}` : '';

  return (
    <section className="mb-5 rounded-xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-stone-950">本周值得扫一眼{scopeLabel}</h2>
          <p className="mt-1 text-xs leading-5 text-stone-500">按北京时间展示近 7 天可信来源里的优先信号。</p>
        </div>
        <Link
          href="/digest"
          className="inline-flex h-8 flex-shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
        >
          查看全部
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-stone-200 bg-white px-4 py-4 text-xs text-stone-500">
          动态暂时加载失败，目录仍可继续使用。
        </div>
      ) : showLoading ? (
        <div className="rounded-xl border border-stone-200 bg-stone-50/70 px-4 py-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] text-stone-400">
            <span className="rounded-md bg-white px-2 py-0.5 ring-1 ring-stone-200">内容</span>
            <span>正在选取本周信号</span>
          </div>
          <div className="h-5 w-4/5 animate-pulse rounded bg-stone-200/70" />
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-stone-200/60" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-stone-200/60" />
          </div>
          <div className="mt-4 h-8 w-full animate-pulse rounded-lg bg-white ring-1 ring-stone-200" />
        </div>
      ) : featuredEvent ? (
        <FeaturedActivityCard event={featuredEvent} />
      ) : (
        <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/70 px-4 py-6 text-center text-xs text-stone-500">
          本周暂时没有可展示的动态
        </div>
      )}
    </section>
  );
}

function FeaturedActivityCard({ event }: { event: ActivityEvent }) {
  const eventTime = event.occurredAt || event.detectedAt;

  return (
    <article className="rounded-xl border border-stone-200 bg-stone-50/70 px-4 py-4 transition-colors hover:border-orange-200 hover:bg-orange-50/40">
      <div className="flex flex-col gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
            <span className="rounded-md bg-white px-2 py-0.5 font-medium text-orange-700 ring-1 ring-orange-100">
              {eventTypeLabel(event.eventType)}
            </span>
            <span>{event.sourceLabel}</span>
            <span>{formatDateTime(eventTime)}</span>
          </div>
          <a
            href={event.url}
            target="_blank"
            rel="noreferrer"
            className="line-clamp-2 text-lg font-semibold leading-7 text-stone-950 hover:text-orange-700"
          >
            {event.title}
          </a>
          {event.importanceReason && (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-700">
              <span className="font-medium text-stone-950">推荐理由：</span>
              {event.importanceReason}
            </p>
          )}
          {event.summary && (
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-stone-500">{event.summary}</p>
          )}
          {event.topics.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {event.topics.slice(0, 3).map(topic => (
                <Link
                  key={topic}
                  href={buildTopicHref(topic)}
                  className="rounded-md bg-white px-2 py-0.5 text-[11px] text-stone-500 ring-1 ring-stone-200 hover:bg-orange-50 hover:text-orange-700 hover:ring-orange-100"
                >
                  {topic}
                </Link>
              ))}
            </div>
          )}
        </div>

        <Link
          href={`/person/${event.personId}`}
          className="flex w-full flex-shrink-0 items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-stone-700 ring-1 ring-stone-200 hover:text-orange-700"
          title={event.personName}
        >
          <span className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-stone-100">
            {event.personAvatarUrl ? (
              <Image src={event.personAvatarUrl} alt={event.personName} fill sizes="36px" className="object-cover object-top" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-orange-500 text-sm font-semibold text-white">
                {event.personName.charAt(0)}
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate">{event.personName}</span>
            {event.personCurrentTitle && (
              <span className="mt-0.5 block truncate text-[11px] font-normal text-stone-400">{event.personCurrentTitle}</span>
            )}
          </span>
        </Link>
      </div>
    </article>
  );
}

function eventTypeLabel(type: ActivityEvent['eventType']): string {
  const labels: Record<ActivityEvent['eventType'], string> = {
    paper: '论文',
    github: '开源',
    video: '视频',
    article: '文章',
    podcast: '播客',
    role_change: '履历',
    relation_change: '关系',
  };
  return labels[type];
}

function formatDateTime(value: string | null): string {
  if (!value) return '北京时间 最近';
  try {
    return `北京时间 ${new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(value))}`;
  } catch {
    return '北京时间 最近';
  }
}
