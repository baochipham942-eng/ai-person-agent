'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ADMIN_WORKSPACE_NAV_ITEMS,
  USER_WORKSPACE_NAV_ITEMS,
  type IdentityNavItem,
} from '@/components/common/identityNavigation';

interface IdentityWorkspaceLayoutProps {
  identity: 'user' | 'admin';
  children: ReactNode;
}

const IDENTITY_META = {
  user: {
    title: '个人空间',
    eyebrow: 'User',
    homeHref: '/',
    homeLabel: '返回人物库',
    items: USER_WORKSPACE_NAV_ITEMS,
  },
  admin: {
    title: '后台管理',
    eyebrow: 'Admin',
    homeHref: '/',
    homeLabel: '返回人物库',
    items: ADMIN_WORKSPACE_NAV_ITEMS,
  },
} as const;

export function IdentityWorkspaceLayout({ identity, children }: IdentityWorkspaceLayoutProps) {
  const pathname = usePathname();
  const [hash, setHash] = useState('');
  const meta = IDENTITY_META[identity];

  useEffect(() => {
    function syncHash() {
      setHash(window.location.hash);
    }

    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="border-b border-stone-200 bg-white/95 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex gap-4 overflow-x-auto px-4 py-4 scrollbar-hide lg:h-full lg:flex-col lg:overflow-y-auto lg:px-5 lg:py-6">
          <div className="flex min-w-48 flex-shrink-0 flex-col gap-3 lg:min-w-0">
            <Link href={meta.homeHref} className="flex items-center gap-2.5">
              <span
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl shadow-sm"
                style={{ background: 'var(--gradient-primary)' }}
              >
                <span className="text-sm font-semibold text-white">AI</span>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-semibold text-stone-950">{meta.title}</span>
                <span className="block text-[11px] font-medium uppercase tracking-wide text-stone-400">{meta.eyebrow}</span>
              </span>
            </Link>
            <Link href={meta.homeHref} className="w-fit text-xs font-medium text-orange-600 hover:text-orange-700">
              {meta.homeLabel}
            </Link>
          </div>

          <nav className="flex min-w-max items-stretch gap-2 lg:min-w-0 lg:flex-1 lg:flex-col" aria-label={`${meta.title}导航`}>
            {meta.items.map(item => (
              <WorkspaceNavLink key={item.href} item={item} pathname={pathname} hash={hash} />
            ))}
          </nav>
        </div>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
}

function WorkspaceNavLink({ item, pathname, hash }: { item: IdentityNavItem; pathname: string; hash: string }) {
  const active = isActiveItem(item, pathname, hash);

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`group flex w-44 flex-shrink-0 flex-col rounded-lg border px-3 py-2.5 text-left transition lg:w-full ${
        active
          ? 'border-orange-200 bg-orange-50 text-orange-700'
          : 'border-transparent text-stone-600 hover:border-stone-200 hover:bg-stone-50 hover:text-stone-950'
      }`}
    >
      <span className="text-sm font-semibold leading-5">{item.label}</span>
      {item.detail && (
        <span className={`mt-1 text-xs leading-5 ${active ? 'text-orange-700/75' : 'text-stone-400 group-hover:text-stone-500'}`}>
          {item.detail}
        </span>
      )}
    </Link>
  );
}

function isActiveItem(item: IdentityNavItem, pathname: string, hash: string): boolean {
  const [itemPath, itemHash] = item.href.split('#');

  if (itemHash) {
    return pathname === itemPath && hash === `#${itemHash}`;
  }

  const hasHashSibling = USER_WORKSPACE_NAV_ITEMS.some(sibling => {
    const [siblingPath, siblingHash] = sibling.href.split('#');
    return siblingPath === itemPath && Boolean(siblingHash);
  });
  if (hasHashSibling && hash) return false;

  if (item.match === 'prefix') {
    return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
  }

  return pathname === itemPath;
}
