'use client';

import useSWR from 'swr';
import { ActivityEventList } from '@/components/activity/ActivityEventList';
import type { ActivityEvent } from '@/lib/activity';

interface RecentActivityProps {
  personId: string;
}

interface ActivityResponse {
  data: ActivityEvent[];
}

const fetcher = async (url: string): Promise<ActivityResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch person activity');
  return res.json();
};

export function RecentActivity({ personId }: RecentActivityProps) {
  const { data, error, isLoading } = useSWR<ActivityResponse>(
    `/api/person/${personId}/activity?limit=5&days=90`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );
  const events = data?.data || [];

  return (
    <section className="card-base overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-base">↗</span>
          <h2 className="text-sm font-medium text-stone-900">最近变化</h2>
        </div>
        <span className="text-xs text-stone-400">近 90 天</span>
      </div>

      <div className="p-5">
        {error ? (
          <div className="rounded-xl border border-stone-200 bg-white px-4 py-4 text-xs text-stone-500">
            最近变化暂时加载失败，其他资料仍可查看。
          </div>
        ) : isLoading ? (
          <div className="grid gap-2">
            {[0, 1, 2].map(index => (
              <div key={index} className="h-16 animate-pulse rounded-xl bg-stone-50 ring-1 ring-stone-100" />
            ))}
          </div>
        ) : (
          <ActivityEventList
            events={events}
            emptyText="暂无可展示的近期变化"
            showPerson={false}
          />
        )}
      </div>
    </section>
  );
}
