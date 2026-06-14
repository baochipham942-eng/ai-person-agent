'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';

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

const USER_MENU_ITEMS = [
  { href: '/watchlist', label: '我的关注' },
  { href: '/compare', label: '我的对比' },
  { href: '/compare/reports', label: '我的对比报告' },
  { href: '/account/security', label: '账号安全' },
  { href: '/watchlist#newsletter-settings', label: '邮件订阅设置' },
];

const ADMIN_MENU_ITEMS = [
  { href: '/admin', label: '后台首页' },
  { href: '/admin/maintenance', label: '内容维护' },
  { href: '/admin/quality', label: '质量复核' },
  { href: '/admin/users', label: '用户管理' },
  { href: '/admin/invitations', label: '邀请码管理' },
  { href: '/admin/audit', label: '审计日志' },
  { href: '/admin/newsletter', label: 'Newsletter 投递' },
  { href: '/admin/influence', label: '影响力校准' },
  { href: '/admin/operations', label: '上线准备度' },
];

export function UserMenu() {
  const [user, setUser] = useState<MenuUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const response = await fetch('/api/user/me', { cache: 'no-store' });
        const result = await response.json() as UserMeResponse;
        if (!active) return;
        setUser(result.authenticated ? result.user : null);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadUser();
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

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.avatar]);

  if (!user) {
    return (
      <Link
        href="/login"
        aria-busy={loading || undefined}
        aria-label={loading ? '读取账号状态，登录' : '登录'}
        className="inline-flex h-8 flex-shrink-0 items-center whitespace-nowrap rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
      >
        登录
      </Link>
    );
  }

  const label = displayName(user);
  const initial = avatarInitial(label);
  const avatarSrc = user.avatar && !avatarFailed ? user.avatar : null;

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
          <img src={avatarSrc} alt={label} className="h-full w-full object-cover" onError={() => setAvatarFailed(true)} />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 z-50 w-64 overflow-hidden rounded-xl border border-stone-200 bg-white text-sm shadow-lg"
        >
          <div className="border-b border-stone-100 px-4 py-3">
            <div className="truncate font-medium text-stone-950">{label}</div>
            <div className="mt-0.5 truncate text-xs text-stone-500">{user.email || user.username}</div>
          </div>

          <MenuSection items={USER_MENU_ITEMS} onSelect={() => setOpen(false)} />

          {user.role === 'ADMIN' && (
            <div className="border-t border-stone-100">
              <div className="px-4 pt-3 text-[11px] font-medium uppercase tracking-wide text-stone-400">管理员</div>
              <MenuSection items={ADMIN_MENU_ITEMS} onSelect={() => setOpen(false)} />
            </div>
          )}

          <div className="border-t border-stone-100 p-2">
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: '/' })}
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

function MenuSection({ items, onSelect }: { items: Array<{ href: string; label: string }>; onSelect: () => void }) {
  return (
    <div className="p-2">
      {items.map(item => (
        <Link
          key={item.href}
          href={item.href}
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

function displayName(user: MenuUser): string {
  return user.displayName || user.nickname || user.username || '账号';
}

function avatarInitial(value: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 1).toUpperCase() : 'U';
}
