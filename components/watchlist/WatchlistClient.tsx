'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ActivityEventList } from '@/components/activity/ActivityEventList';
import { FollowButton } from '@/components/common/FollowButton';
import { SiteHeader } from '@/components/common/SiteHeader';
import { NewsletterSettings } from '@/components/newsletter/NewsletterSettings';
import type { ActivityEvent } from '@/lib/activity';
import {
  WATCHLIST_CHANGED_EVENT,
  emptyWatchlist,
  mergeWatchlists,
  readLocalWatchlist,
  writeLocalWatchlist,
  type WatchTarget,
  type WatchlistSnapshot,
} from '@/lib/watchlist';

interface WatchlistPerson {
  id: string;
  name: string;
  avatarUrl: string | null;
  currentTitle: string | null;
  organization: string[];
  topics: string[];
  influenceScore: number;
  weeklyViewCount: number;
}

interface WatchlistSummary {
  people: WatchlistPerson[];
  events: ActivityEvent[];
}

export function WatchlistClient() {
  const [watchlist, setWatchlist] = useState<WatchlistSnapshot>(emptyWatchlist());
  const [summary, setSummary] = useState<WatchlistSummary>({ people: [], events: [] });
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const totalCount = watchlist.people.length + watchlist.topics.length + watchlist.organizations.length;
  const hasItems = totalCount > 0;

  const loadWatchlist = useCallback(async () => {
    setLoading(true);
    const localWatchlist = readLocalWatchlist();
    let nextWatchlist = localWatchlist;
    let isAuthenticated = false;

    try {
      const response = await fetch('/api/user/watchlist', {
        cache: 'no-store',
      });
      if (response.ok) {
        const result = await response.json();
        isAuthenticated = Boolean(result.authenticated);
        if (isAuthenticated && result.watchlist) {
          const mergeResponse = await fetch('/api/user/watchlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ watchlist: localWatchlist }),
          });
          if (mergeResponse.ok) {
            const mergeResult = await mergeResponse.json();
            nextWatchlist = mergeWatchlists(localWatchlist, mergeResult.watchlist);
          } else {
            nextWatchlist = mergeWatchlists(localWatchlist, result.watchlist);
          }
        }
      }
    } catch {
      isAuthenticated = false;
    }

    writeLocalWatchlist(nextWatchlist);
    setWatchlist(nextWatchlist);
    setAuthenticated(isAuthenticated);

    try {
      const nextSummary = await fetchSummary(nextWatchlist);
      setSummary(nextSummary);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWatchlist();
    const handleChange = () => {
      const next = readLocalWatchlist();
      setWatchlist(next);
      void fetchSummary(next).then(setSummary);
    };
    window.addEventListener(WATCHLIST_CHANGED_EVENT, handleChange);
    return () => window.removeEventListener(WATCHLIST_CHANGED_EVENT, handleChange);
  }, [loadWatchlist]);

  const personTargets = useMemo(() => {
    const byId = new Map(summary.people.map(person => [person.id, person]));
    return watchlist.people.map(item => ({
      target: item,
      person: byId.get(item.id) || null,
    }));
  }, [summary.people, watchlist.people]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <SiteHeader current="watchlist" maxWidth="6xl" />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6">
        <section className="rounded-xl border border-stone-200 bg-white px-5 py-6 shadow-sm sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 text-xs font-medium text-orange-600">个人动态</div>
              <h1 className="text-2xl font-semibold text-stone-950">我的关注</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                关注的人物、话题和机构会汇总成个人动态流，未登录状态保存在当前浏览器。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="人物" value={watchlist.people.length} />
              <Stat label="话题" value={watchlist.topics.length} />
              <Stat label="机构" value={watchlist.organizations.length} />
            </div>
          </div>
        </section>

        {!hasItems && !loading ? (
          <EmptyState authenticated={authenticated} />
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-8">
              <section>
                <SectionTitle title="关注动态" />
                {loading ? (
                  <LoadingRows />
                ) : (
                  <ActivityEventList
                    events={summary.events}
                    emptyText="关注内容暂时没有近期动态"
                    showPerson
                  />
                )}
              </section>

              <section>
                <SectionTitle title="关注人物" />
                {personTargets.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {personTargets.map(({ target, person }) => (
                      <PersonWatchCard key={target.id} target={target} person={person} />
                    ))}
                  </div>
                ) : (
                  <EmptyPanel text="还没有关注人物。" />
                )}
              </section>
            </div>

            <aside className="space-y-8">
              <WatchChipSection title="关注话题" items={watchlist.topics} />
              <WatchChipSection title="关注机构" items={watchlist.organizations} />
              <section className="rounded-xl border border-stone-200 bg-white p-4 text-xs leading-5 text-stone-500 shadow-sm">
                <div className="mb-2 text-sm font-medium text-stone-900">同步状态</div>
                {authenticated ? '已登录，关注会写入账号资料。' : '当前使用本地关注，登录后可同步到账号。'}
              </section>
              <NewsletterSettings authenticated={authenticated} />
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

async function fetchSummary(watchlist: WatchlistSnapshot): Promise<WatchlistSummary> {
  const response = await fetch('/api/watchlist/summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ watchlist, limit: 24, days: 90 }),
  });
  if (!response.ok) return { people: [], events: [] };
  const result = await response.json();
  return {
    people: result.people || [],
    events: result.events || [],
  };
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-16 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2">
      <div className="text-lg font-semibold text-stone-950">{value}</div>
      <div className="mt-0.5 text-[11px] text-stone-500">{label}</div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="mb-3 text-base font-semibold text-stone-950">{title}</h2>;
}

function PersonWatchCard({ target, person }: { target: WatchTarget; person: WatchlistPerson | null }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-3 shadow-sm">
      <Link href={target.href} className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100">
        {person?.avatarUrl ? (
          <Image src={person.avatarUrl} alt={person.name} fill sizes="44px" className="object-cover object-top" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-orange-500 text-sm font-semibold text-white">
            {target.label.charAt(0)}
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={target.href} className="block truncate text-sm font-medium text-stone-900 hover:text-orange-600">
          {person?.name || target.label}
        </Link>
        <div className="mt-0.5 truncate text-xs text-stone-500">
          {person?.currentTitle || person?.organization?.[0] || '资料整理中'}
        </div>
        {person && (
          <div className="mt-0.5 text-[11px] text-stone-400">
            影响力 {person.influenceScore.toFixed(1)} · 近 7 天 {person.weeklyViewCount} 次访问
          </div>
        )}
      </div>
      <FollowButton target={target} size="sm" />
    </div>
  );
}

function WatchChipSection({ title, items }: { title: string; items: WatchTarget[] }) {
  return (
    <section>
      <SectionTitle title={title} />
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-sm">
              <Link href={item.href} className="min-w-0 truncate text-sm font-medium text-stone-700 hover:text-orange-600">
                {item.label}
              </Link>
              <FollowButton target={item} size="sm" />
            </div>
          ))}
        </div>
      ) : (
        <EmptyPanel text="还没有关注。" />
      )}
    </section>
  );
}

function EmptyState({ authenticated }: { authenticated: boolean | null }) {
  return (
    <section className="rounded-xl border border-dashed border-stone-200 bg-white/70 px-5 py-10 text-center">
      <h2 className="text-base font-semibold text-stone-950">还没有关注内容</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
        先从高频入口开始关注，个人动态流会自动聚合近期变化。
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link href="/topic/Agent" className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-medium text-white hover:bg-orange-600">
          Agent 方向
        </Link>
        <Link href="/org/OpenAI" className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700">
          OpenAI 机构
        </Link>
      </div>
      <div className="mx-auto mt-6 max-w-md rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs leading-5 text-stone-500 shadow-sm">
        <div className="mb-1 text-sm font-medium text-stone-900">同步状态</div>
        {authenticated ? '已登录，关注会写入账号资料。' : '当前使用本地关注，登录后可同步到账号。'}
      </div>
      <div className="mx-auto mt-3 max-w-md text-left">
        <NewsletterSettings authenticated={authenticated} />
      </div>
    </section>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-200 bg-white/70 px-4 py-6 text-center text-xs text-stone-500">
      {text}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map(index => (
        <div key={index} className="h-16 animate-pulse rounded-xl bg-stone-100" />
      ))}
    </div>
  );
}
