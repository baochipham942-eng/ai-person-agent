'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import useSWR from 'swr';
import type { ActivityEvent } from '@/lib/activity';

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
  const [activeIndex, setActiveIndex] = useState(0);
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      limit: '5',
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
  const events = useMemo(() => (data?.data || []).slice(0, 5), [data]);
  const safeActiveIndex = events.length > 0 ? activeIndex % events.length : 0;
  const featuredEvent = events[safeActiveIndex] || null;
  const showLoading = isLoading && !data;
  const scopeLabel = topic ? ` · ${topic}` : organization ? ` · ${organization}` : '';

  const nextEvent = () => {
    if (events.length < 2) return;
    setActiveIndex(index => (index + 1) % events.length);
  };

  return (
    <section className="min-w-0 flex-1">
      <div className="mb-1.5 flex items-center gap-2">
        <h2 className="text-xs font-semibold text-stone-950">本周推荐{scopeLabel}</h2>
        <span className="hidden text-[11px] text-stone-400 sm:inline">近 7 天可信来源</span>
      </div>

      {error ? (
        <div className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2.5 text-xs text-stone-500">
          动态暂时加载失败，目录仍可继续使用。
        </div>
      ) : showLoading ? (
        <div className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2.5">
          <div className="mb-2 flex items-center gap-2 text-[11px] text-stone-400">
            <span className="rounded-md bg-white px-2 py-0.5 ring-1 ring-stone-200">内容</span>
            <span>正在选取本周信号</span>
          </div>
          <div className="h-4 w-4/5 animate-pulse rounded bg-stone-200/70" />
          <div className="mt-2 space-y-1.5">
            <div className="h-2.5 w-full animate-pulse rounded bg-stone-200/60" />
            <div className="h-2.5 w-2/3 animate-pulse rounded bg-stone-200/60" />
          </div>
        </div>
      ) : featuredEvent ? (
        <div className="space-y-1.5">
          <FeaturedActivityCard event={featuredEvent} onCycle={nextEvent} />
          {events.length > 1 && (
            <div className="flex gap-1.5" aria-label="本周推荐切换">
              {events.map((event, index) => (
                <button
                  key={event.id}
                  type="button"
                  aria-label={`切换到第 ${index + 1} 条推荐`}
                  onClick={() => setActiveIndex(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === safeActiveIndex
                      ? 'w-5 bg-orange-500'
                      : 'w-1.5 bg-stone-300 hover:bg-stone-400'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-3 text-xs text-stone-500">
          本周暂时没有可展示的动态
        </div>
      )}
    </section>
  );
}

function FeaturedActivityCard({ event, onCycle }: { event: ActivityEvent; onCycle: () => void }) {
  const eventTime = event.occurredAt || event.detectedAt;

  return (
    <button
      type="button"
      onClick={onCycle}
      className="block w-full cursor-pointer rounded-lg border border-stone-100 bg-stone-50 px-3 py-2.5 text-left transition-colors hover:border-orange-200 hover:bg-orange-50/40 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
            <span className="rounded-md bg-white px-2 py-0.5 font-medium text-orange-700 ring-1 ring-orange-100">
              {eventTypeLabel(event.eventType)}
            </span>
            <span>{event.sourceLabel}</span>
            <span>{formatDateTime(eventTime)}</span>
          </div>
          <h3 className="line-clamp-1 text-sm font-semibold leading-5 text-stone-950">
            {event.title}
          </h3>
          {event.importanceReason && (
            <p className="mt-1 line-clamp-1 text-xs leading-5 text-stone-600">
              <span className="font-medium text-stone-950">推荐理由：</span>
              {event.importanceReason}
            </p>
          )}
        </div>

        <div
          className="flex w-full flex-shrink-0 items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-xs font-medium text-stone-700 ring-1 ring-stone-200 hover:text-orange-700 sm:w-52"
          title={event.personName}
        >
          <span className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-stone-100">
            {event.personAvatarUrl ? (
              <Image src={event.personAvatarUrl} alt={event.personName} fill sizes="32px" className="object-cover object-top" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-orange-500 text-xs font-semibold text-white">
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
        </div>
      </div>
    </button>
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
