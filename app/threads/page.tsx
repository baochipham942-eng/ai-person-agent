import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/common/SiteHeader';
import { ThreadsHubView } from '@/components/threads/ThreadsHubView';
import { fetchThreadsHub } from '@/lib/threads-hub';
import { fetchComparePicks } from '@/lib/compare-picks';

export const revalidate = 300;

export const metadata: Metadata = {
  title: '专题 | AI 人物库',
  description: '知识主题 + 人物对比：把 AI 一线方法论拆成可读主题，并把关键人物放进同一主题对照。',
};

export default async function ThreadsPage() {
  let hub;
  try {
    hub = fetchThreadsHub();
  } catch (error) {
    console.error('Failed to fetch threads hub:', error);
    hub = { items: [], total: 0 };
  }

  const comparePicks = await fetchComparePicks();

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <SiteHeader current="threads" maxWidth="6xl" />
      <div className="border-b border-stone-100 bg-white/70">
        <div className="mx-auto flex max-w-6xl items-center gap-1.5 px-4 py-2 text-xs text-stone-400 sm:px-6">
          <Link href="/" className="font-medium text-stone-500 hover:text-orange-600">
            AI 人物库
          </Link>
          <span>/</span>
          <span className="truncate text-stone-500">专题</span>
        </div>
      </div>
      <ThreadsHubView hub={hub} comparePicks={comparePicks} />
    </div>
  );
}
