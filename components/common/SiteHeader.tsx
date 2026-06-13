import type { ReactNode } from 'react';
import Link from 'next/link';

type SiteHeaderCurrent = 'home' | 'compareReports' | 'graph' | 'digest' | 'watchlist';
type SiteHeaderWidth = '5xl' | '6xl' | '7xl';

interface SiteHeaderProps {
  current?: SiteHeaderCurrent;
  maxWidth?: SiteHeaderWidth;
  statsSlot?: ReactNode;
}

const CONTENT_NAV_ITEMS: Array<{ key: SiteHeaderCurrent; href: string; label: string }> = [
  { key: 'home', href: '/', label: '推荐人物' },
  { key: 'digest', href: '/digest', label: '本周动态' },
  { key: 'graph', href: '/graph', label: '人物关系' },
];

const USER_NAV_ITEMS: Array<{ key: SiteHeaderCurrent; href: string; label: string }> = [
  { key: 'compareReports', href: '/compare/reports', label: '人物对比' },
  { key: 'watchlist', href: '/watchlist', label: '我的关注' },
];

const WIDTH_CLASS: Record<SiteHeaderWidth, string> = {
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
};

export function SiteHeader({ current = 'home', maxWidth = '6xl', statsSlot }: SiteHeaderProps) {
  return (
    <header className="glass-header sticky top-0 z-50 border-b border-subtle">
      <div className={`${WIDTH_CLASS[maxWidth]} mx-auto px-4 sm:px-6`}>
        <div className="flex min-h-14 flex-col gap-2 py-2 md:flex-row md:items-center md:justify-between md:gap-5">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl shadow-sm"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <span className="text-sm font-semibold text-white">AI</span>
            </span>
            <span className="truncate text-lg font-semibold text-stone-900">AI 人物库</span>
          </Link>

          {statsSlot && <div className="hidden items-center gap-6 text-sm lg:flex">{statsSlot}</div>}

          <div className="flex min-w-0 flex-1 items-center justify-between gap-3 md:justify-end">
            <nav className="flex min-w-0 items-center gap-5 overflow-x-auto text-sm scrollbar-hide" aria-label="内容导航">
              {CONTENT_NAV_ITEMS.map(item => {
                const isCurrent = current === item.key;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    aria-current={isCurrent ? 'page' : undefined}
                    className={`relative flex-shrink-0 whitespace-nowrap py-1 font-medium transition-colors ${
                      isCurrent
                        ? 'text-stone-950 after:absolute after:inset-x-0 after:-bottom-2 after:h-0.5 after:rounded-full after:bg-stone-950'
                        : 'text-stone-500 hover:text-orange-600'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <nav className="flex flex-shrink-0 items-center gap-2 overflow-x-auto scrollbar-hide" aria-label="个人工具">
              {USER_NAV_ITEMS.map(item => {
              const isCurrent = current === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium shadow-sm transition-colors ${
                    isCurrent
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
