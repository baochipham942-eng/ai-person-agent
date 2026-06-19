import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { SiteHeader } from '@/components/common/SiteHeader';
import { fetchCompanyDirectory, type CompanyDirectoryEntry } from '@/lib/company-directory';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'AI 公司 | AI 人物库',
  description: '前沿模型实验室、大厂与平台的公司页：每家看 AI 产品线、官方好文和关键人物。',
};

const BADGE_GRADIENTS = [
  'linear-gradient(135deg,#f97316,#ef4444)',
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#0ea5e9,#2563eb)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#ec4899,#db2777)',
];

function initial(name: string): string {
  const ch = name.trim()[0] ?? '?';
  return ch.toUpperCase();
}

function CompanyCard({ entry, index }: { entry: CompanyDirectoryEntry; index: number }) {
  return (
    <Link
      href={entry.href}
      prefetch={false}
      className="group flex flex-col gap-3 rounded-2xl border border-stone-200/70 bg-white/70 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        {entry.logoUrl ? (
          <span className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <Image
              src={entry.logoUrl}
              alt={`${entry.displayName} logo`}
              fill
              sizes="44px"
              className="object-contain p-1.5"
              unoptimized
            />
          </span>
        ) : (
          <span
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-base font-semibold text-white shadow-sm"
            style={{ background: BADGE_GRADIENTS[index % BADGE_GRADIENTS.length] }}
          >
            {initial(entry.displayName)}
          </span>
        )}
        <h3 className="min-w-0 truncate text-base font-semibold text-stone-900 group-hover:text-orange-600">
          {entry.displayName}
        </h3>
      </div>

      <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-stone-600">
        {entry.heroDescription}
      </p>

      <div className="flex items-center gap-4 border-t border-stone-100 pt-3 text-xs text-stone-500">
        <span>
          <span className="font-semibold text-stone-800">{entry.peopleCount}</span> 关键人物
        </span>
        <span>
          <span className="font-semibold text-stone-800">{entry.productCount}</span> 核心产品
        </span>
        <span>
          <span className="font-semibold text-stone-800">{entry.learningCount}</span> 官方好文
        </span>
      </div>
    </Link>
  );
}

export default async function CompanyDirectoryPage() {
  const companies = await fetchCompanyDirectory().catch(error => {
    console.error('Failed to fetch company directory:', error);
    return [] as CompanyDirectoryEntry[];
  });

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <SiteHeader current="organizations" maxWidth="6xl" />
      <div className="border-b border-stone-100 bg-white/70">
        <div className="mx-auto flex max-w-6xl items-center gap-1.5 px-4 py-2 text-xs text-stone-400 sm:px-6">
          <Link href="/" className="font-medium text-stone-500 hover:text-orange-600">
            AI 人物库
          </Link>
          <span>/</span>
          <span className="truncate text-stone-500">AI 公司</span>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-stone-900">AI 公司</h1>
          <p className="mt-1 text-sm text-stone-500">
            收录 {companies.length} 家有策展页的 AI 公司——每家看产品线、官方好文和库内关键人物。
          </p>
        </header>

        {companies.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white/60 p-10 text-center text-sm text-stone-500">
            暂无公司数据。
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((entry, index) => (
              <CompanyCard key={entry.key} entry={entry} index={index} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
