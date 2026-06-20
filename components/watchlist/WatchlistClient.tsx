'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ActivityEventList } from '@/components/activity/ActivityEventList';
import { FollowButton } from '@/components/common/FollowButton';
import { useUserSession } from '@/components/common/userSessionClient';
import { NewsletterSettings } from '@/components/newsletter/NewsletterSettings';
import type { ActivityEvent } from '@/lib/activity';
import {
  WATCHLIST_CHANGED_EVENT,
  emptyWatchlist,
  mergeWatchlists,
  normalizeWatchlist,
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
  const session = useUserSession();
  const [watchlist, setWatchlist] = useState<WatchlistSnapshot>(emptyWatchlist());
  const [summary, setSummary] = useState<WatchlistSummary>({ people: [], events: [] });
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const totalCount = watchlistItemCount(watchlist);
  const hasItems = totalCount > 0;
  const isAuthenticated = authenticated === true;

  const loadWatchlist = useCallback((sessionStatus: typeof session.status) => {
    let cancelled = false;
    const localWatchlist = readLocalWatchlist();
    let nextWatchlist = localWatchlist;

    setWatchlist(localWatchlist);

    async function finishWithSummary(targetWatchlist: WatchlistSnapshot) {
      if (watchlistItemCount(targetWatchlist) === 0) {
        if (cancelled) return;
        setSummary({ people: [], events: [] });
        setLoading(false);
        return;
      }

      if (!cancelled) setLoading(true);
      try {
        const nextSummary = await fetchSummary(targetWatchlist);
        if (!cancelled) setSummary(nextSummary);
      } catch {
        if (!cancelled) setSummary({ people: [], events: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (sessionStatus === 'unknown' || sessionStatus === 'loading') {
      setAuthenticated(null);
      void finishWithSummary(localWatchlist);
      return () => {
        cancelled = true;
      };
    }

    if (sessionStatus === 'unauthenticated') {
      setAuthenticated(false);
      void finishWithSummary(localWatchlist);
      return () => {
        cancelled = true;
      };
    }

    setAuthenticated(true);
    setLoading(true);
    void loadAccountWatchlist(localWatchlist)
      .then(result => {
        if (cancelled) return;
        nextWatchlist = result.watchlist;
        writeLocalWatchlist(nextWatchlist, { notify: false });
        setWatchlist(nextWatchlist);
        setAuthenticated(result.authenticated);
        return finishWithSummary(nextWatchlist);
      })
      .catch(() => {
        if (cancelled) return;
        setAuthenticated(true);
        return finishWithSummary(localWatchlist);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return loadWatchlist(session.status);
  }, [loadWatchlist, session.status]);

  useEffect(() => {
    const handleChange = () => {
      const next = readLocalWatchlist();
      setWatchlist(next);
      if (watchlistItemCount(next) === 0) {
        setSummary({ people: [], events: [] });
        setLoading(false);
        return;
      }
      setLoading(true);
      void fetchSummary(next)
        .then(setSummary)
        .finally(() => setLoading(false));
    };
    window.addEventListener(WATCHLIST_CHANGED_EVENT, handleChange);
    return () => window.removeEventListener(WATCHLIST_CHANGED_EVENT, handleChange);
  }, []);

  const personTargets = useMemo(() => {
    const byId = new Map(summary.people.map(person => [person.id, person]));
    return watchlist.people.map(item => ({
      target: item,
      person: byId.get(item.id) || null,
    }));
  }, [summary.people, watchlist.people]);

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6">
      <section className="rounded-xl border border-stone-200 bg-white px-5 py-6 shadow-sm sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 text-xs font-medium text-orange-600">
              {isAuthenticated ? '个人动态' : '注册后同步'}
            </div>
            <h1 className="text-2xl font-semibold text-stone-950">
              {isAuthenticated ? '我的关注' : '注册后开启个人关注'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              {isAuthenticated
                ? '关注的人物、话题和机构会汇总成个人动态流。'
                : '当前浏览器里的关注可以先用，注册后再合并到账号里。'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="人物" value={watchlist.people.length} />
            <Stat label="话题" value={watchlist.topics.length} />
            <Stat label="机构" value={watchlist.organizations.length} />
          </div>
        </div>
      </section>

      {!hasItems ? (
        <EmptyState authenticated={authenticated} loading={loading} />
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

            <WatchTargetSection
              people={personTargets}
              topics={watchlist.topics}
              organizations={watchlist.organizations}
            />
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <AccountPanel authenticated={authenticated} loading={loading} />
          </aside>
        </div>
      )}
    </main>
  );
}

function watchlistItemCount(watchlist: WatchlistSnapshot): number {
  return watchlist.people.length + watchlist.topics.length + watchlist.organizations.length;
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

async function loadAccountWatchlist(localWatchlist: WatchlistSnapshot): Promise<{
  authenticated: boolean;
  watchlist: WatchlistSnapshot;
}> {
  const response = await fetch('/api/user/watchlist', {
    cache: 'no-store',
  });
  if (!response.ok) {
    return {
      authenticated: response.status === 401 ? false : true,
      watchlist: localWatchlist,
    };
  }

  const result = await response.json();
  const authenticated = Boolean(result.authenticated);
  if (!authenticated || !result.watchlist) {
    return { authenticated: false, watchlist: localWatchlist };
  }

  const accountWatchlist = normalizeWatchlist(result.watchlist);
  if (watchlistItemCount(localWatchlist) === 0) {
    return { authenticated: true, watchlist: accountWatchlist };
  }

  const mergeResponse = await fetch('/api/user/watchlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ watchlist: localWatchlist }),
  });
  if (!mergeResponse.ok) {
    return {
      authenticated: true,
      watchlist: mergeWatchlists(localWatchlist, accountWatchlist),
    };
  }

  const mergeResult = await mergeResponse.json();
  return {
    authenticated: true,
    watchlist: mergeWatchlists(localWatchlist, normalizeWatchlist(mergeResult.watchlist)),
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

function WatchTargetSection({
  people,
  topics,
  organizations,
}: {
  people: Array<{ target: WatchTarget; person: WatchlistPerson | null }>;
  topics: WatchTarget[];
  organizations: WatchTarget[];
}) {
  return (
    <section>
      <SectionTitle title="关注对象" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {people.map(({ target, person }) => (
          <PersonWatchCard key={target.id} target={target} person={person} />
        ))}
        {topics.map(target => (
          <TargetWatchCard key={target.id} target={target} />
        ))}
        {organizations.map(target => (
          <TargetWatchCard key={target.id} target={target} />
        ))}
      </div>
    </section>
  );
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
      <FollowButton target={target} size="sm" syncOnMount={false} />
    </div>
  );
}

function TargetWatchCard({ target }: { target: WatchTarget }) {
  const typeLabel = target.type === 'topic' ? '话题' : '机构';

  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-3 shadow-sm">
      <Link href={target.href} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-stone-100 text-xs font-semibold text-stone-500 hover:bg-orange-50 hover:text-orange-700">
        {targetInitial(target.label)}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-stone-400">{typeLabel}</div>
        <Link href={target.href} className="block truncate text-sm font-medium text-stone-900 hover:text-orange-600">
          {target.label}
        </Link>
      </div>
      <FollowButton target={target} size="sm" syncOnMount={false} />
    </div>
  );
}

function EmptyState({ authenticated, loading }: { authenticated: boolean | null; loading: boolean }) {
  const isAuthenticated = authenticated === true;
  const loadingText = isAuthenticated ? '正在读取账号关注内容。' : '正在读取本地关注内容。';

  return (
    <section className="rounded-xl border border-stone-200 bg-white px-5 py-12 text-center shadow-sm">
      <h2 className="text-base font-semibold text-stone-950">
        {loading ? '正在读取关注内容' : '还没有关注内容'}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
        {loading
          ? loadingText
          : isAuthenticated
            ? '先回到人物库关注人物、话题或机构。'
            : '注册后可以把关注保存到账号里，后续再开启每周提醒。'}
      </p>
      {loading ? (
        <div className="mx-auto mt-6 h-10 w-10 animate-spin rounded-full border-2 border-stone-200 border-t-orange-500" />
      ) : (
        <Link
          href={isAuthenticated ? '/' : '/login'}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
          style={{ background: 'var(--gradient-primary)' }}
        >
          {isAuthenticated ? '去人物库关注' : '注册或登录'}
        </Link>
      )}
    </section>
  );
}

function AccountPanel({
  authenticated,
  loading,
  compact = false,
}: {
  authenticated: boolean | null;
  loading: boolean;
  compact?: boolean;
}) {
  const isAuthenticated = authenticated === true;
  const pending = loading || authenticated === null;
  const statusLabel = pending ? '确认中' : isAuthenticated ? '已登录' : '未登录';
  const statusClass = pending
    ? 'border-stone-200 bg-stone-50 text-stone-500'
    : isAuthenticated
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-orange-200 bg-orange-50 text-orange-700';
  const statusText = pending
    ? '正在确认本地关注和账号状态。'
    : isAuthenticated
      ? '已登录，关注会自动写入账号资料，也可以开启每周邮件。'
      : '注册后把当前关注合并到账号，后续再开启每周邮件。';

  return (
    <section id="newsletter-settings" className={`${compact ? 'mx-auto mt-6 max-w-xl' : ''} scroll-mt-20 rounded-xl border border-stone-200 bg-white p-4 text-left shadow-sm`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-stone-950">{isAuthenticated ? '每周提醒' : '注册后同步关注'}</div>
          <p className="mt-1 text-xs leading-5 text-stone-500">{statusText}</p>
        </div>
        <span className={`inline-flex flex-shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      {isAuthenticated ? (
        <div className="mt-4 border-t border-stone-100 pt-4">
          <NewsletterSettings authenticated={authenticated} surface="inline" />
        </div>
      ) : (
        <div className="mt-4">
          <Link
            href="/login"
            className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium text-white shadow-sm transition hover:opacity-90"
            style={{ background: 'var(--gradient-primary)' }}
          >
            注册或登录
          </Link>
        </div>
      )}
    </section>
  );
}

function targetInitial(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return '#';
  return trimmed.slice(0, 2).toUpperCase();
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
