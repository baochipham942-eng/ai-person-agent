'use client';

import Link from 'next/link';
import type { FeaturedThread } from '@/lib/knowledge-thread-people';

/**
 * 主页「当期主题流」——回答「AI 圈最近在发生什么 / 我现在该读什么」。
 * 放在人物目录之上，让首屏第一眼有动态价值密度，而不是一页静态人名。
 */
interface CurrentThreadsStreamProps {
  threads: FeaturedThread[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export function CurrentThreadsStream({
  threads,
  title = '当期主题',
  subtitle = 'AI 圈最近在发生什么，以及谁在定义它。',
  className = 'mb-4',
}: CurrentThreadsStreamProps) {
  if (threads.length === 0) return null;

  return (
    <section className={className} aria-label="当期主题">
      <div className="mb-2 flex items-end justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-stone-900">{title}</h2>
          <p className="text-xs text-stone-500">{subtitle}</p>
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {threads.map(thread => (
          <li key={thread.slug}>
            <ThreadCard thread={thread} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ThreadCard({ thread }: { thread: FeaturedThread }) {
  return (
    <Link
      href={`/threads/${thread.slug}`}
      prefetch={false}
      className="flex h-full flex-col rounded-xl border border-stone-200 bg-white px-4 py-3.5 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50/40"
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-orange-600">
        <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
        知识主题
      </div>
      <h3 className="mt-1.5 text-sm font-semibold tracking-tight text-stone-950">{thread.title}</h3>
      <p className="mt-1 line-clamp-3 flex-1 text-xs leading-5 text-stone-600">{thread.whyNow}</p>

      {thread.peopleNames.length > 0 && (
        <div className="mt-2 truncate text-[11px] text-stone-500">
          <span className="text-stone-400">关键人物 · </span>
          {thread.peopleNames.join(' · ')}
        </div>
      )}

      {thread.topics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {thread.topics.map(topic => (
            <span
              key={topic}
              className="inline-flex items-center rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-600"
            >
              {topic}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
