import type { Metadata } from 'next';
import { SiteHeader } from '@/components/common/SiteHeader';
import { ContentSearchPanel } from '@/components/search/ContentSearchPanel';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '内容搜索 | AI 人物库',
  description: '跨内容池、公司源和知识源检索 AI 人物库资料。',
};

export default function ContentSearchPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <SiteHeader current="contentSearch" maxWidth="7xl" />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <section className="mb-5">
          <div className="text-xs font-medium text-orange-600">内容检索</div>
          <h1 className="mt-2 text-2xl font-semibold text-stone-950">内容搜索</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            覆盖内容池、公司官方来源和已索引知识内容。
          </p>
        </section>
        <ContentSearchPanel />
      </main>
    </div>
  );
}
