import Link from 'next/link';
import type { ThreadHubItem, ThreadsHub } from '@/lib/threads-hub';

/** 就绪度徽标：内部心智，保持安静（stone 系），不喧宾夺主。 */
const STATUS_CONFIG: Record<string, { label: string }> = {
  review_ready: { label: '复核就绪' },
  source_pack_review: { label: '待复核' },
  thin: { label: '内容偏薄' },
  draft: { label: '草稿' },
};

function statusLabel(status: string): string {
  return STATUS_CONFIG[status]?.label ?? '整理中';
}

export function ThreadsHubView({ hub }: { hub: ThreadsHub }) {
  const { items, total } = hub;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <section className="rounded-xl border border-stone-200 bg-white px-5 py-6 shadow-sm sm:px-7">
        <div className="flex items-center gap-1.5 text-xs font-medium text-orange-600">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          学习入口
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">知识主题</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
          把 AI 一线正在发生的方法论拆成可读的主题：每条讲清楚它是什么、为什么现在重要、该读哪些一手材料、谁在推动。共 {total} 条。
        </p>
      </section>

      <section>
        {items.length === 0 ? (
          <div className="rounded-xl border border-stone-200 bg-white px-5 py-10 text-center text-sm text-stone-500 shadow-sm">
            暂无主题。
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(item => (
              <li key={item.slug}>
                <ThreadCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function ThreadCard({ item }: { item: ThreadHubItem }) {
  return (
    <Link
      href={`/threads/${item.slug}`}
      prefetch={false}
      className="flex h-full flex-col rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-colors hover:border-orange-200"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight text-stone-950">
          {item.title}
          {item.subtitle && <span className="ml-1.5 text-xs font-normal text-stone-400">{item.subtitle}</span>}
        </h3>
        <span className="mt-0.5 flex-shrink-0 rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-500">
          {statusLabel(item.status)}
        </span>
      </div>

      {item.blurb && <p className="mt-1.5 line-clamp-3 flex-1 text-xs leading-5 text-stone-500">{item.blurb}</p>}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-400">
        <span>{item.sourceCount} 份材料</span>
        {item.peopleNames.length > 0 && (
          <span className="truncate text-stone-500">推动者 · {item.peopleNames.slice(0, 2).join('、')}</span>
        )}
      </div>
    </Link>
  );
}
