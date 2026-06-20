import type { ReactNode } from 'react';
import Link from 'next/link';
import { CompareNavLink } from '@/components/common/CompareNavLink';
import { UserMenu } from '@/components/common/UserMenu';

type SiteHeaderCurrent = 'home' | 'organizations' | 'contentSearch' | 'compareReports' | 'myCompare' | 'graph' | 'digest' | 'watchlist' | 'courses' | 'threads';
type SiteHeaderWidth = '5xl' | '6xl' | '7xl';

interface SiteHeaderProps {
  current?: SiteHeaderCurrent | null;
  maxWidth?: SiteHeaderWidth;
  statsSlot?: ReactNode;
  utilitySlot?: ReactNode;
}

/**
 * 主导航 = 浏览实体（全是「看什么」，互相平行）。
 * 工具（搜索/对比）退到右侧工具区；保存的对比报告在用户菜单里。
 */
const PRIMARY_NAV_ITEMS: Array<{ key: SiteHeaderCurrent; href: string; label: string }> = [
  { key: 'home', href: '/', label: '人物' },
  { key: 'organizations', href: '/org', label: '公司' },
  { key: 'threads', href: '/threads', label: '专题' },
  { key: 'courses', href: '/courses', label: '课程' },
];

const WIDTH_CLASS: Record<SiteHeaderWidth, string> = {
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
};

export function SiteHeader({ current = null, maxWidth = '6xl', statsSlot, utilitySlot }: SiteHeaderProps) {
  return (
    <header className="glass-header sticky top-0 z-50 border-b border-subtle">
      <div className={`${WIDTH_CLASS[maxWidth]} mx-auto px-4 sm:px-6`}>
        <div className="grid min-h-14 grid-cols-1 gap-2 py-2 lg:grid-cols-[minmax(11rem,1fr)_auto_minmax(13rem,1fr)] lg:items-center lg:gap-4">
          <Link href="/" prefetch={false} className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl shadow-sm"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <span className="text-sm font-semibold text-white">AI</span>
            </span>
            <span className="truncate text-lg font-semibold text-stone-900">AI 人物库</span>
          </Link>

          {statsSlot && <div className="hidden items-center gap-6 text-sm lg:flex">{statsSlot}</div>}

          <div className="flex min-w-0 flex-col gap-2 lg:contents">
            <nav className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1 text-sm sm:flex-nowrap lg:justify-center" aria-label="内容导航">
              {PRIMARY_NAV_ITEMS.map(item => {
                const isCurrent = current === item.key;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    prefetch={false}
                    aria-current={isCurrent ? 'page' : undefined}
                    className={`flex-shrink-0 whitespace-nowrap py-1 font-medium transition-colors ${
                      isCurrent
                        ? 'text-stone-950'
                        : 'text-stone-500 hover:text-orange-600'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex min-w-0 flex-shrink-0 items-center justify-center gap-2 md:justify-end">
              <div className="flex min-w-0 items-center justify-end gap-2 overflow-visible">
                {utilitySlot}
                <Link
                  href="/content-search"
                  prefetch={false}
                  aria-label="内容搜索"
                  aria-current={current === 'contentSearch' ? 'page' : undefined}
                  className={`inline-flex h-8 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-xs font-medium shadow-sm transition-colors ${
                    current === 'contentSearch'
                      ? 'border-stone-900 bg-stone-50 text-stone-950'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700'
                  }`}
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
                    <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
                    <path d="m17 17-3.2-3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  <span className="hidden sm:inline">搜索</span>
                </Link>
                <CompareNavLink isCurrent={current === 'myCompare'} />
              </div>
              <UserMenu />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
