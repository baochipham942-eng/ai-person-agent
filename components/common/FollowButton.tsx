'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  WATCHLIST_CHANGED_EVENT,
  hasWatchTarget,
  mergeWatchlists,
  readLocalWatchlist,
  setWatchTarget,
  writeLocalWatchlist,
  type WatchTarget,
} from '@/lib/watchlist';

interface FollowButtonProps {
  target: WatchTarget;
  size?: 'sm' | 'md';
  className?: string;
  syncOnMount?: boolean;
}

export function FollowButton({ target, size = 'md', className = '', syncOnMount = true }: FollowButtonProps) {
  const [following, setFollowing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const stableTarget = useMemo(() => ({
    type: target.type,
    id: target.id,
    label: target.label,
    href: target.href,
  }), [target.type, target.id, target.label, target.href]);

  const refreshState = useCallback(async () => {
    const localWatchlist = readLocalWatchlist();
    setFollowing(hasWatchTarget(localWatchlist, stableTarget));
    setHydrated(true);

    if (!syncOnMount) return;

    try {
      const response = await fetch('/api/user/watchlist', {
        cache: 'no-store',
      });
      if (!response.ok) return;
      const result = await response.json();
      if (!result?.authenticated || !result.watchlist) return;

      const merged = mergeWatchlists(localWatchlist, result.watchlist);
      writeLocalWatchlist(merged);
      setFollowing(hasWatchTarget(merged, stableTarget));
    } catch {
      // 本地关注状态仍然可用。
    }
  }, [stableTarget, syncOnMount]);

  useEffect(() => {
    refreshState();
    const handleChanged = () => {
      const next = readLocalWatchlist();
      setFollowing(hasWatchTarget(next, stableTarget));
    };
    window.addEventListener(WATCHLIST_CHANGED_EVENT, handleChanged);
    return () => window.removeEventListener(WATCHLIST_CHANGED_EVENT, handleChanged);
  }, [refreshState, stableTarget]);

  const toggleFollow = async () => {
    const nextFollowing = !following;
    const nextLocal = setWatchTarget(readLocalWatchlist(), stableTarget, nextFollowing);
    writeLocalWatchlist(nextLocal);
    setFollowing(nextFollowing);
    setSyncing(true);

    try {
      const response = await fetch('/api/user/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: stableTarget.type,
          id: stableTarget.id,
          label: stableTarget.label,
          href: stableTarget.href,
          following: nextFollowing,
        }),
      });

      if (!response.ok) return;
      const result = await response.json();
      if (result?.watchlist) {
        writeLocalWatchlist(mergeWatchlists(readLocalWatchlist(), result.watchlist));
      }
    } catch {
      // 离线或未登录时只保留本地状态。
    } finally {
      setSyncing(false);
    }
  };

  const label = following ? '已关注' : '关注';
  const buttonSize = size === 'sm'
    ? 'h-8 px-2.5 text-xs'
    : 'h-9 px-3 text-sm';

  return (
    <button
      type="button"
      onClick={toggleFollow}
      disabled={!hydrated}
      aria-pressed={following}
      className={`${buttonSize} inline-flex items-center justify-center rounded-lg border font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 disabled:cursor-wait disabled:opacity-60 ${
        following
          ? 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-white'
          : 'border-stone-200 bg-white text-stone-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700'
      } ${className}`}
    >
      {syncing ? '同步中' : label}
    </button>
  );
}
