import type { ReactNode } from 'react';
import Link from 'next/link';
import { CompareNavLink } from '@/components/common/CompareNavLink';
import { UserMenu } from '@/components/common/UserMenu';

type SiteHeaderCurrent = 'home' | 'compareReports' | 'myCompare' | 'graph' | 'digest' | 'watchlist';
type SiteHeaderWidth = '5xl' | '6xl' | '7xl';

interface SiteHeaderProps {
  current?: SiteHeaderCurrent | null;
  maxWidth?: SiteHeaderWidth;
  statsSlot?: ReactNode;
  utilitySlot?: ReactNode;
}

const CONTENT_NAV_ITEMS: Array<{ key: SiteHeaderCurrent; href: string; label: string }> = [
  { key: 'home', href: '/', label: '推荐人物' },
  { key: 'digest', href: '/digest', label: '本周动态' },
  { key: 'compareReports', href: '/compare/reports', label: '人物对比' },
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
        <div className="grid min-h-14 grid-cols-1 gap-2 py-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-5">
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

          <div className="flex min-w-0 flex-col gap-2 md:contents">
            <nav className="flex min-w-0 items-center justify-center gap-6 overflow-x-auto text-sm scrollbar-hide" aria-label="内容导航">
              {CONTENT_NAV_ITEMS.map(item => {
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
              <div className="flex min-w-0 items-center gap-2 overflow-x-auto scrollbar-hide">
                {utilitySlot}
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
