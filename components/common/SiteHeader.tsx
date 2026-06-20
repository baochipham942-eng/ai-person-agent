import type { ReactNode } from 'react';
import Link from 'next/link';
import { CompareNavLink } from '@/components/common/CompareNavLink';
import { UserMenu } from '@/components/common/UserMenu';

type SiteHeaderCurrent = 'home' | 'organizations' | 'contentSearch' | 'compareReports' | 'myCompare' | 'graph' | 'digest' | 'watchlist' | 'courses';
type SiteHeaderWidth = '5xl' | '6xl' | '7xl';

interface SiteHeaderProps {
  current?: SiteHeaderCurrent | null;
  maxWidth?: SiteHeaderWidth;
  statsSlot?: ReactNode;
  utilitySlot?: ReactNode;
}

const PRIMARY_NAV_ITEMS: Array<{ key: SiteHeaderCurrent; href: string; label: string }> = [
  { key: 'home', href: '/', label: '推荐人物' },
  { key: 'organizations', href: '/org', label: '公司' },
  { key: 'contentSearch', href: '/content-search', label: '内容搜索' },
  { key: 'digest', href: '/digest', label: '本周动态' },
];

const MORE_NAV_ITEMS: Array<{ key: SiteHeaderCurrent; href: string; label: string }> = [
  { key: 'courses', href: '/courses', label: 'AI 课程' },
  { key: 'compareReports', href: '/compare/reports', label: '人物对比' },
];

const WIDTH_CLASS: Record<SiteHeaderWidth, string> = {
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
};

export function SiteHeader({ current = null, maxWidth = '6xl', statsSlot, utilitySlot }: SiteHeaderProps) {
  const moreIsCurrent = MORE_NAV_ITEMS.some(item => item.key === current);

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
              <details className="group relative flex-shrink-0">
                <summary
                  aria-current={moreIsCurrent ? 'page' : undefined}
                  className={`site-header-more-summary flex cursor-pointer items-center gap-1 whitespace-nowrap py-1 font-medium transition-colors ${
                    moreIsCurrent ? 'text-stone-950' : 'text-stone-500 hover:text-orange-600'
                  }`}
                >
                  更多
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </summary>
                <div className="absolute left-1/2 top-8 z-50 w-36 -translate-x-1/2 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg">
                  {MORE_NAV_ITEMS.map(item => {
                    const isCurrent = current === item.key;
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        prefetch={false}
                        aria-current={isCurrent ? 'page' : undefined}
                        className={`flex h-8 items-center rounded-lg px-2.5 text-xs font-medium transition-colors ${
                          isCurrent
                            ? 'bg-stone-50 text-stone-950'
                            : 'text-stone-600 hover:bg-orange-50 hover:text-orange-700'
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </details>
            </nav>

            <div className="flex min-w-0 flex-shrink-0 items-center justify-center gap-2 md:justify-end">
              <div className="flex min-w-0 items-center justify-end gap-2 overflow-visible">
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
