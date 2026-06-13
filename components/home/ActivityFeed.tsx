'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ActivityEventList } from '@/components/activity/ActivityEventList';
import type { ActivityEvent } from '@/lib/activity';

interface ActivityFeedProps {
  topic?: string | null;
  organization?: string | null;
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

export function ActivityFeed({ topic, organization }: ActivityFeedProps) {
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      limit: '6',
      days: '7',
    });
    if (topic) params.set('topic', topic);
    if (organization) params.set('organization', organization);
    return `/api/activity?${params}`;
  }, [topic, organization]);

  const { data, error, isLoading } = useSWR<ActivityResponse>(apiUrl, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });
  const events = data?.data || [];
  const scopeLabel = topic ? ` · ${topic}` : organization ? ` · ${organization}` : '';

  return (
    <section className="mb-5 rounded-xl border border-stone-200 bg-white/75 px-3 py-3 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 text-[11px] font-medium text-orange-600">本周动态入口{scopeLabel}</div>
          <h2 className="text-sm font-semibold text-stone-900">本周值得扫一眼</h2>
          <p className="text-xs text-stone-500">从近 7 天可信来源里抽取，作为进入完整周报前的快速推荐</p>
        </div>
        <Link
          href="/digest"
          className="inline-flex h-8 flex-shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
        >
          查看本周动态
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-stone-200 bg-white px-4 py-4 text-xs text-stone-500">
          动态暂时加载失败，目录仍可继续使用。
        </div>
      ) : isLoading ? (
        <div className="scrollbar-hide -mx-3 flex gap-3 overflow-hidden px-3 sm:mx-0 sm:px-0">
          {[0, 1, 2].map(index => (
            <div key={index} className="h-48 w-[18.5rem] flex-shrink-0 animate-pulse rounded-xl bg-white ring-1 ring-stone-200 sm:w-[20rem]" />
          ))}
        </div>
      ) : (
        <ActivityEventList events={events} emptyText="本周暂时没有可展示的动态" variant="rail" />
      )}
    </section>
  );
}
