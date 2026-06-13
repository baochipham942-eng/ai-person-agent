import type { ReactNode } from 'react';
import Link from 'next/link';

type SiteHeaderCurrent = 'home' | 'compareReports' | 'graph' | 'digest' | 'watchlist';
type SiteHeaderWidth = '5xl' | '6xl' | '7xl';

interface SiteHeaderProps {
  current?: SiteHeaderCurrent;
  maxWidth?: SiteHeaderWidth;
  statsSlot?: ReactNode;
}

const NAV_ITEMS: Array<{ key: SiteHeaderCurrent; href: string; label: string }> = [
  { key: 'compareReports', href: '/compare/reports', label: '人物对比分析' },
  { key: 'graph', href: '/graph', label: '关系图谱' },
  { key: 'digest', href: '/digest', label: '本周动态' },
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
        <div className="flex h-14 items-center justify-between gap-4">
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

          <nav className="flex flex-shrink-0 items-center gap-2 overflow-x-auto scrollbar-hide">
            {NAV_ITEMS.map(item => {
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
    </header>
  );
}
