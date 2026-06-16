'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import {
  ADMIN_WORKSPACE_NAV_ITEMS,
  USER_WORKSPACE_NAV_ITEMS,
  type IdentityNavItem,
} from '@/components/common/identityNavigation';

interface MenuUser {
  username: string;
  email: string | null;
  nickname: string | null;
  displayName: string | null;
  avatar: string | null;
  role: 'USER' | 'ADMIN';
  status: string;
}

interface UserMeResponse {
  authenticated: boolean;
  user: MenuUser | null;
}

const MENU_USER_CACHE_TTL_MS = 30_000;
const USER_ACCOUNT_MENU_ITEMS = USER_WORKSPACE_NAV_ITEMS.filter(item => item.href !== '/compare');

let cachedMenuUser: MenuUser | undefined;
let cachedMenuUserAt = 0;
let menuUserRequest: Promise<MenuUser | null> | null = null;

export function UserMenu() {
  const initialUser = readCachedMenuUser();
  const [user, setUser] = useState<MenuUser | null>(initialUser ?? null);
  const [loading, setLoading] = useState(!initialUser);
  const [open, setOpen] = useState(false);
  const [failedAvatarSrc, setFailedAvatarSrc] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    void requestMenuUser().then(result => {
      if (!active) return;
      setUser(result);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

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

  if (!user) {
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
        aria-label="登录"
        className="inline-flex h-8 flex-shrink-0 items-center whitespace-nowrap rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
      >
        登录
      </Link>
    );
  }

  const label = displayName(user);
  const initial = avatarInitial(label);
  const avatarSrc = user.avatar && failedAvatarSrc !== user.avatar ? user.avatar : null;

  return (
    <div ref={rootRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
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

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 z-50 max-h-[80vh] w-64 overflow-y-auto rounded-xl border border-stone-200 bg-white text-sm shadow-lg"
        >
          <div className="border-b border-stone-100 px-4 py-3">
            <div className="truncate font-medium text-stone-950">{label}</div>
            <div className="mt-0.5 truncate text-xs text-stone-500">{user.email || user.username}</div>
          </div>

          <MenuSection items={USER_ACCOUNT_MENU_ITEMS} onSelect={() => setOpen(false)} />

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
                cachedMenuUser = undefined;
                cachedMenuUserAt = 0;
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
      {items.map(item => (
        <Link
          key={item.href}
          href={item.href}
          prefetch={false}
          role="menuitem"
          onClick={onSelect}
          className="flex h-9 items-center rounded-lg px-2 text-xs font-medium text-stone-700 transition hover:bg-orange-50 hover:text-orange-700"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

function readCachedMenuUser(): MenuUser | undefined {
  if (!cachedMenuUser) return undefined;
  if (Date.now() - cachedMenuUserAt > MENU_USER_CACHE_TTL_MS) return undefined;
  return cachedMenuUser;
}

async function requestMenuUser(): Promise<MenuUser | null> {
  const cached = readCachedMenuUser();
  if (cached) return cached;

  if (!menuUserRequest) {
    menuUserRequest = fetchMenuUser().finally(() => {
      menuUserRequest = null;
    });
  }

  return menuUserRequest;
}

async function fetchMenuUser(): Promise<MenuUser | null> {
  try {
    const response = await fetch('/api/user/me', { cache: 'no-store' });
    if (!response.ok) return null;
    const result = await response.json() as UserMeResponse;
    const nextUser = result.authenticated ? result.user : null;
    if (nextUser) {
      cachedMenuUser = nextUser;
      cachedMenuUserAt = Date.now();
    } else {
      cachedMenuUser = undefined;
      cachedMenuUserAt = 0;
    }
    return nextUser;
  } catch {
    return null;
  }
}

function displayName(user: MenuUser): string {
  return user.displayName || user.nickname || user.username || '账号';
}

function avatarInitial(value: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 1).toUpperCase() : 'U';
}
