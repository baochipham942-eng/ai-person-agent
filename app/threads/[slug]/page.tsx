import type { Metadata } from 'next';
import { SiteHeader } from '@/components/common/SiteHeader';
import { MissingThreadState, ThreadPageBlocks } from '@/components/knowledge/ThreadPageBlocks';
import {
  loopEngineeringThread,
} from '@/lib/knowledge-thread-fixtures/loop-engineering';
import { fetchKnowledgeThreadPage } from '@/lib/knowledge-threads';

interface ThreadPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300;

export function generateStaticParams() {
  return [{ slug: loopEngineeringThread.slug }];
}

export async function generateMetadata({ params }: ThreadPageProps): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeRouteParam(slug);
  const thread = await fetchKnowledgeThreadPage(decodedSlug);

  if (!thread) {
    return {
      title: '知识主题页待补证据 | AI 人物库',
      description: '这个知识主题还没有达到证据覆盖门槛。',
    };
  }

  return {
    title: `${thread.title} | AI 人物库`,
    description: thread.summary,
  };
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { slug } = await params;
  const decodedSlug = decodeRouteParam(slug);
  const thread = await fetchKnowledgeThreadPage(decodedSlug);

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <SiteHeader current="home" maxWidth="6xl" />
      <div className="border-b border-stone-100 bg-white/70">
        <div className="mx-auto max-w-6xl px-4 py-2 text-xs text-stone-400 sm:px-6">
          知识主题 / {thread?.title || decodedSlug}
        </div>
      </div>
      {thread ? <ThreadPageBlocks thread={thread} /> : <MissingThreadState slug={decodedSlug} />}
    </div>
  );
}

function decodeRouteParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
