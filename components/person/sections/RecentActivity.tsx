'use client';

import useSWR from 'swr';
import { ActivityEventList } from '@/components/activity/ActivityEventList';
import type { ActivityEvent } from '@/lib/activity';
import { useSectionVisibility } from './useSectionVisibility';

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
  const { sectionRef, isVisible } = useSectionVisibility<HTMLElement>();
  const { data, error, isLoading } = useSWR<ActivityResponse>(
    isVisible ? `/api/person/${personId}/activity?limit=5&days=90` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );
  const events = data?.data || [];
  const settled = isVisible && !isLoading;

  // 加载完成后无内容（空或失败）→ 整块隐藏，不占一张空卡（次要动态流，没有就别占位）。
  // 仍保留加载中的骨架，让 sectionRef 进入视口触发拉取后再决定去留。
  if (settled && (error || events.length === 0)) return null;

  return (
    <section ref={sectionRef} className="card-base overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-base">↗</span>
          <h2 className="text-sm font-medium text-stone-900">最近变化</h2>
        </div>
        <span className="text-xs text-stone-400">近 90 天</span>
      </div>

      <div className="p-5">
        {!isVisible || isLoading ? (
          <div className="grid gap-2">
            {[0, 1].map(index => (
              <div key={index} className="h-14 animate-pulse rounded-xl bg-stone-50 ring-1 ring-stone-100" />
            ))}
          </div>
        ) : (
          <ActivityEventList events={events} showPerson={false} />
        )}
      </div>
    </section>
  );
}
