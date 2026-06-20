import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/common/SiteHeader';
import { ThreadsHubView } from '@/components/threads/ThreadsHubView';
import { fetchThreadsHub } from '@/lib/threads-hub';

export const revalidate = 300;

export const metadata: Metadata = {
  title: '知识主题 | AI 人物库',
  description: 'AI 一线方法论主题：每条讲清楚它是什么、为什么现在重要、该读哪些一手材料、谁在推动。',
};

export default function ThreadsPage() {
  let hub;
  try {
    hub = fetchThreadsHub();
  } catch (error) {
    console.error('Failed to fetch threads hub:', error);
    hub = { items: [], total: 0 };
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <SiteHeader current="threads" maxWidth="6xl" />
      <div className="border-b border-stone-100 bg-white/70">
        <div className="mx-auto flex max-w-6xl items-center gap-1.5 px-4 py-2 text-xs text-stone-400 sm:px-6">
          <Link href="/" className="font-medium text-stone-500 hover:text-orange-600">
            AI 人物库
          </Link>
          <span>/</span>
          <span className="truncate text-stone-500">知识主题</span>
        </div>
      </div>
      <ThreadsHubView hub={hub} />
    </div>
  );
}
