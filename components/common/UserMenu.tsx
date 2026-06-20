'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  clearUserSessionCache,
  useUserSession,
  type MenuDisplayUser,
} from '@/components/common/userSessionClient';
import {
  ADMIN_WORKSPACE_NAV_ITEMS,
  USER_WORKSPACE_NAV_ITEMS,
  type IdentityNavItem,
} from '@/components/common/identityNavigation';
import {
  MAX_COMPARE_PEOPLE,
  buildCompareHref,
  decodeCompareIdsSnapshot,
  getCompareIdsSnapshot,
  getEmptyCompareIdsSnapshot,
  subscribeCompareIds,
} from '@/components/common/compareSelection';

// 我的对比已从顶栏移入此折叠菜单，故不再过滤 /compare 之外的项；compare 作为带数量徽标的专用项单独渲染。
const USER_ACCOUNT_MENU_ITEMS = USER_WORKSPACE_NAV_ITEMS.filter(item => item.href !== '/compare');

export function UserMenu() {
  const session = useUserSession();
  const user = session.status === 'authenticated' ? session.user : null;
  const displayUser = user ?? (session.status === 'unknown' || session.status === 'loading' ? session.displayUser : null);
  const loading = session.status === 'unknown' || session.status === 'loading';
  const canOpenMenu = Boolean(user);
  const [open, setOpen] = useState(false);
  const [failedAvatarSrc, setFailedAvatarSrc] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canOpenMenu) setOpen(false);
  }, [canOpenMenu]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!displayUser) {
    if (loading) {
      return (
        <div
          aria-busy="true"
          aria-label="读取账号状态"
          className="h-8 w-8 flex-shrink-0 rounded-full border border-stone-200 bg-stone-100 shadow-sm"
        />
      );
    }

    return (
      <Link
        href="/login"
        prefetch={false}
        aria-label="登录"
        className="inline-flex h-8 flex-shrink-0 items-center whitespace-nowrap rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
      >
        登录
      </Link>
    );
  }

  const label = displayName(displayUser);
  const initial = avatarInitial(label);
  const avatarSrc = displayUser.avatar && failedAvatarSrc !== displayUser.avatar ? displayUser.avatar : null;

  return (
    <div ref={rootRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => {
          if (canOpenMenu) setOpen(current => !current);
        }}
        aria-haspopup="menu"
        aria-expanded={canOpenMenu ? open : false}
        aria-busy={!canOpenMenu && loading ? true : undefined}
        aria-label={canOpenMenu ? label : '读取账号状态'}
        className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-stone-200 text-xs font-semibold shadow-sm transition hover:border-orange-200 ${
          avatarSrc ? 'bg-white text-stone-700 hover:bg-orange-50 hover:text-orange-700' : 'text-white'
        }`}
        style={avatarSrc ? undefined : { background: 'var(--gradient-primary)' }}
      >
        {avatarSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarSrc} alt={label} className="h-full w-full object-cover" onError={() => setFailedAvatarSrc(avatarSrc)} />
        ) : (
          initial
        )}
      </button>

      {open && user && (
        <div
          role="menu"
          className="absolute right-0 top-10 z-50 max-h-[80vh] w-64 overflow-y-auto rounded-xl border border-stone-200 bg-white text-sm shadow-lg"
        >
          <div className="border-b border-stone-100 px-4 py-3">
            <div className="truncate font-medium text-stone-950">{label}</div>
            <div className="mt-0.5 truncate text-xs text-stone-500">{user.email || user.username}</div>
          </div>

          <div className="p-2">
            <CompareMenuLink onSelect={() => setOpen(false)} />
            <MenuLinks items={USER_ACCOUNT_MENU_ITEMS} onSelect={() => setOpen(false)} />
          </div>

          {user.role === 'ADMIN' && (
            <div className="border-t border-stone-100">
              <div className="px-4 pt-3 text-[11px] font-medium uppercase tracking-wide text-stone-400">管理员</div>
              <MenuSection items={ADMIN_WORKSPACE_NAV_ITEMS} onSelect={() => setOpen(false)} />
            </div>
          )}

          <div className="border-t border-stone-100 p-2">
            <button
              type="button"
              onClick={() => {
                clearUserSessionCache();
                void signOut({ callbackUrl: '/' });
              }}
              className="flex h-9 w-full items-center rounded-lg px-2 text-left text-xs font-medium text-rose-600 transition hover:bg-rose-50"
            >
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuSection({ items, onSelect }: { items: IdentityNavItem[]; onSelect: () => void }) {
  return (
    <div className="p-2">
      <MenuLinks items={items} onSelect={onSelect} />
    </div>
  );
}

function MenuLinks({ items, onSelect }: { items: IdentityNavItem[]; onSelect: () => void }) {
  const router = useRouter();

  return (
    <>
      {items.map(item => (
        <Link
          key={item.href}
          href={item.href}
          prefetch={false}
          role="menuitem"
          onMouseEnter={() => router.prefetch(item.href)}
          onClick={onSelect}
          className="flex h-9 items-center rounded-lg px-2 text-xs font-medium text-stone-700 transition hover:bg-orange-50 hover:text-orange-700"
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}

function CompareMenuLink({ onSelect }: { onSelect: () => void }) {
  const router = useRouter();
  const idsSnapshot = useSyncExternalStore(subscribeCompareIds, getCompareIdsSnapshot, getEmptyCompareIdsSnapshot);
  const ids = useMemo(() => decodeCompareIdsSnapshot(idsSnapshot), [idsSnapshot]);
  const href = useMemo(() => buildCompareHref(ids), [ids]);

  return (
    <Link
      href={href}
      prefetch={false}
      role="menuitem"
      onMouseEnter={() => router.prefetch('/compare')}
      onClick={onSelect}
      className="flex h-9 items-center justify-between gap-2 rounded-lg px-2 text-xs font-medium text-stone-700 transition hover:bg-orange-50 hover:text-orange-700"
    >
      <span>我的对比</span>
      <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500">
        {ids.length}/{MAX_COMPARE_PEOPLE}
      </span>
    </Link>
  );
}

function displayName(user: MenuDisplayUser): string {
  return user.displayName || user.nickname || user.username || '账号';
}

function avatarInitial(value: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 1).toUpperCase() : 'U';
}
