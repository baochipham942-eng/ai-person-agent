import Link from 'next/link';
import { AvatarImage } from '@/components/common/AvatarImage';
import { CompareReportLauncher } from '@/components/compare/CompareReportLauncher';
import { comparePickSourceCount, type ComparePicks, type ComparePickReport } from '@/lib/compare-picks';
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

export function ThreadsHubView({ hub, comparePicks }: { hub: ThreadsHub; comparePicks: ComparePicks }) {
  const { items, total } = hub;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-6">
      {/* 专题页统一入口 */}
      <section className="rounded-xl border border-stone-200 bg-white px-5 py-6 shadow-sm sm:px-7">
        <div className="flex items-center gap-1.5 text-xs font-medium text-orange-600">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          学习入口
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">专题</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
          两种读法：<span className="font-medium text-stone-800">知识主题</span>——把 AI 一线方法论拆成可读的主题，看它是什么、为什么现在重要、谁在推动；
          <span className="font-medium text-stone-800">人物对比</span>——把关键人物放进同一主题里对照观点和路径差异。
        </p>
      </section>

      {/* 区一：知识主题 */}
      <section className="space-y-3">
        <SectionHeader
          title="知识主题"
          desc={`把 AI 一线正在发生的方法论拆成可读主题，每条都讲清来源与推动者。共 ${total} 条。`}
        />
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

      {/* 区二：人物对比 */}
      <ComparePicksSection comparePicks={comparePicks} />
    </main>
  );
}

function SectionHeader({ title, desc, action }: { title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight text-stone-950">{title}</h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-stone-500">{desc}</p>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
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

function ComparePicksSection({ comparePicks }: { comparePicks: ComparePicks }) {
  const { reports, peopleById } = comparePicks;

  return (
    <section className="space-y-3">
      <SectionHeader
        title="人物对比"
        desc={`把关键人物放进同一主题下对照观点变化、路径差异和关键证据。共 ${reports.length} 份公开报告。`}
        action={<CompareReportLauncher triggerLabel="+ 发起新对比" />}
      />
      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-white/70 px-5 py-10 text-center">
          <h3 className="text-sm font-semibold text-stone-900">还没有公开对比报告</h3>
          <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-stone-500">
            选 2–3 位人物、定一个主题，生成第一份对比报告。
          </p>
          <div className="mt-4 flex justify-center">
            <CompareReportLauncher triggerLabel="生成第一份报告" />
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map(report => (
            <li key={report.id}>
              <CompareReportCard report={report} peopleById={peopleById} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CompareReportCard({
  report,
  peopleById,
}: {
  report: ComparePickReport;
  peopleById: ComparePicks['peopleById'];
}) {
  const people = report.peopleIds.map(id => peopleById.get(id)).filter(Boolean) as NonNullable<
    ReturnType<ComparePicks['peopleById']['get']>
  >[];

  return (
    <Link
      href={`/compare/reports/${report.id}`}
      prefetch={false}
      className="group flex h-full flex-col rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-colors hover:border-orange-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex -space-x-2">
          {people.map(person => (
            <span
              key={person.id}
              className="relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-stone-100 ring-2 ring-white"
            >
              <AvatarImage
                src={person.avatarUrl}
                name={person.name}
                fallbackClassName="flex h-full w-full items-center justify-center bg-orange-500 text-[11px] font-semibold text-white"
              />
            </span>
          ))}
        </div>
        <span className="flex-shrink-0 rounded-md bg-stone-50 px-1.5 py-0.5 text-[11px] text-stone-500 ring-1 ring-stone-100">
          {comparePickSourceCount(report.sourceSnapshot)} 条资料
        </span>
      </div>
      <h3 className="mt-2.5 line-clamp-2 text-sm font-semibold leading-5 text-stone-950 group-hover:text-orange-700">
        {report.title}
      </h3>
      {report.summary && <p className="mt-1.5 line-clamp-2 flex-1 text-xs leading-5 text-stone-500">{report.summary}</p>}
      {report.topic && (
        <div className="mt-2.5">
          <span className="inline-flex items-center rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-600">
            {report.topic}
          </span>
        </div>
      )}
    </Link>
  );
}
