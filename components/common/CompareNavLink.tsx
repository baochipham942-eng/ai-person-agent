'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  MAX_COMPARE_PEOPLE,
  buildCompareHref,
  decodeCompareIdsSnapshot,
  getCompareIdsSnapshot,
  getEmptyCompareIdsSnapshot,
  subscribeCompareIds,
} from '@/components/common/compareSelection';

interface CompareNavLinkProps {
  isCurrent: boolean;
}

interface UserMeResponse {
  authenticated: boolean;
}

export function CompareNavLink({ isCurrent }: CompareNavLinkProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const idsSnapshot = useSyncExternalStore(subscribeCompareIds, getCompareIdsSnapshot, getEmptyCompareIdsSnapshot);
  const ids = useMemo(() => decodeCompareIdsSnapshot(idsSnapshot), [idsSnapshot]);
  const href = useMemo(() => buildCompareHref(ids), [ids]);

  useEffect(() => {
    let active = true;

    async function loadAuthState() {
      try {
        const response = await fetch('/api/user/me', { cache: 'no-store' });
        const result = await response.json() as UserMeResponse;
        if (active) setAuthenticated(Boolean(result.authenticated));
      } catch {
        if (active) setAuthenticated(false);
      }
    }

    void loadAuthState();
    return () => {
      active = false;
    };
  }, []);

  if (!authenticated) return null;

  return (
    <Link
      href={href}
      aria-current={isCurrent ? 'page' : undefined}
      className={`inline-flex h-8 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-xs font-medium shadow-sm transition-colors ${
        isCurrent
          ? 'border-stone-900 bg-stone-50 text-stone-950'
          : 'border-stone-200 bg-white text-stone-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700'
      }`}
    >
      <span>我的对比</span>
      <span
        className={`rounded-md px-1.5 py-0.5 text-[10px] ${
          isCurrent ? 'bg-white text-stone-600 ring-1 ring-stone-200' : 'bg-stone-50 text-stone-500'
        }`}
      >
        {ids.length}/{MAX_COMPARE_PEOPLE}
      </span>
    </Link>
  );
}
