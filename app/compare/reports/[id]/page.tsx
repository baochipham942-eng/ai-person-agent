import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { SiteHeader } from '@/components/common/SiteHeader';
import { prisma } from '@/lib/db/prisma';
import { sanitizeCompareReportContent, type CompareReportContent } from '@/lib/compare-report-agent';
import { COMPARE_AGENT_TOOLS } from '@/lib/compare-report';

interface ReportDetailPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: ReportDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const report = await prisma.compareReport.findUnique({
    where: { id },
    select: { title: true, summary: true },
  });

  return {
    title: report ? `${report.title} | AI 人物库` : '人物对比报告 | AI 人物库',
    description: report?.summary || 'AI 人物观点对比报告。',
  };
}

export default async function CompareReportDetailPage({ params }: ReportDetailPageProps) {
  const { id } = await params;
  const [session, report] = await Promise.all([
    auth(),
    prisma.compareReport.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        topic: true,
        status: true,
        visibility: true,
        summary: true,
        peopleIds: true,
        reportJson: true,
        sourceSnapshot: true,
        errorMessage: true,
        createdAt: true,
        completedAt: true,
        events: {
          select: {
            id: true,
            step: true,
            status: true,
            title: true,
            message: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
  ]);

  if (!report || report.visibility !== 'public') notFound();

  const people = await prisma.people.findMany({
    where: { id: { in: report.peopleIds } },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      currentTitle: true,
      organization: true,
      topics: true,
    },
  });
  const peopleById = new Map(people.map(person => [person.id, person]));
  const orderedPeople = report.peopleIds
    .map(personId => peopleById.get(personId))
    .filter(Boolean) as typeof people;
  const content = isReportContent(report.reportJson) ? sanitizeCompareReportContent(report.reportJson) : null;
  const sourceCount = sourceCountFromSnapshot(report.sourceSnapshot, content);
  const isAnonymous = !session?.user?.id;

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <SiteHeader current="compareReports" />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <section className="rounded-xl border border-stone-200 bg-white px-5 py-6 shadow-sm sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">对比报告</span>
                <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${statusClass(report.status)}`}>
                  {statusLabel(report.status)}
                </span>
                <span className="text-xs text-stone-400">{formatDate(report.completedAt || report.createdAt)}</span>
              </div>
              <h1 className="text-2xl font-semibold leading-8 text-stone-950">{content?.title || report.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
                {content?.summary || report.summary || '报告正在生成。'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <AvatarStack people={orderedPeople} />
                <span className="text-xs text-stone-500">{sourceCount} 条公开资料</span>
                {report.topic && <span className="rounded-md bg-stone-50 px-2 py-0.5 text-xs text-stone-500">{report.topic}</span>}
              </div>
            </div>
          </div>
        </section>

        <details className="rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm sm:px-7">
          <summary className="cursor-pointer text-sm font-medium text-stone-700 marker:text-stone-400 hover:text-orange-600">
            生成过程与来源校验
          </summary>
          <div className="mt-4">
            <div className="mb-3 text-xs font-medium text-orange-600">Agent 工具链</div>
            <div className="flex flex-wrap gap-2">
              {COMPARE_AGENT_TOOLS.map(tool => (
                <span
                  key={tool.key}
                  title={tool.description}
                  className="rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-600"
                >
                  {tool.label}
                </span>
              ))}
            </div>
          </div>
        </details>

        {report.status !== 'completed' || !content ? (
          <PendingOrFailedPanel status={report.status} errorMessage={report.errorMessage} events={report.events} />
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="mb-2 text-xs font-medium text-orange-600">核心判断</div>
                <h2 className="text-xl font-semibold leading-7 text-stone-950">{content.verdict.headline}</h2>
                <p className="mt-3 text-sm leading-7 text-stone-600">{content.verdict.body}</p>
              </div>
              <aside className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="mb-3 text-xs font-medium text-stone-500">来源覆盖</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <ReportStat label="总资料" value={content.coverage.sourceCount} />
                  <ReportStat label="已有资料" value={content.coverage.localSourceCount} />
                  <ReportStat label="公开搜索" value={content.coverage.webSourceCount} />
                </div>
                {content.coverage.limitations.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {content.coverage.limitations.slice(0, 3).map(item => (
                      <p key={item} className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">{item}</p>
                    ))}
                  </div>
                )}
              </aside>
            </section>

            <section>
              <SectionTitle title="人物立场" />
              <div className={gridClass(content.people.length)}>
                {content.people.map(person => (
                  <article key={person.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <PersonAvatar person={person} />
                      <div className="min-w-0">
                        <Link href={`/person/${person.id}`} className="font-semibold text-stone-950 hover:text-orange-600">
                          {person.name}
                        </Link>
                        <div className="mt-1 text-xs leading-5 text-stone-500">{person.currentTitle || '公开身份整理中'}</div>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-stone-600">{person.stanceSummary}</p>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <SectionTitle title="观点矩阵" />
              <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
                {content.dimensions.map(dimension => (
                  <div key={dimension.key} className="border-b border-stone-100 p-4 last:border-b-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-stone-950">{dimension.label}</h3>
                      <span className="rounded-md bg-stone-50 px-2 py-0.5 text-[11px] text-stone-500">{confidenceLabel(dimension.confidence)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{dimension.sharedView}</p>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{dimension.differences}</p>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {dimension.personViews.map(view => (
                        <div key={`${dimension.key}-${view.personId}`} className="rounded-lg bg-stone-50 px-3 py-2">
                          <div className="text-xs font-semibold text-stone-900">{view.personName}</div>
                          <p className="mt-1 text-xs leading-5 text-stone-600">{view.view}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {content.timeline.length > 0 && (
              <section>
                <SectionTitle title="变化时间线" />
                <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="space-y-3">
                    {content.timeline.map((item, index) => (
                      <div key={`${item.description}-${index}`} className="grid gap-2 border-b border-stone-100 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[7rem_minmax(0,1fr)]">
                        <div className="text-xs font-medium text-stone-400">{formatTimelineDate(item.date)}</div>
                        <div>
                          <div className="text-xs font-semibold text-orange-700">{item.label}</div>
                          {item.sourceUrl ? (
                            <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 block text-sm leading-6 text-stone-700 hover:text-orange-600">
                              {item.description}
                            </a>
                          ) : (
                            <p className="mt-1 text-sm leading-6 text-stone-700">{item.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            <section>
              <SectionTitle title="完整分析" />
              <div className="grid gap-4 md:grid-cols-2">
                {content.analysisSections.map(section => (
                  <article key={section.title} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-stone-950">{section.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-stone-600">{section.body}</p>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <SectionTitle title="关键证据" />
              <div className="grid gap-3 md:grid-cols-2">
                {content.evidence.map(item => (
                  <article key={item.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-stone-50 px-2 py-0.5 text-[11px] text-stone-500">{item.personName}</span>
                      <span className="rounded-md bg-stone-50 px-2 py-0.5 text-[11px] text-stone-500">{item.sourceType}</span>
                    </div>
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noreferrer" className="line-clamp-2 text-sm font-semibold leading-6 text-stone-950 hover:text-orange-600">
                        {item.title}
                      </a>
                    ) : (
                      <h3 className="line-clamp-2 text-sm font-semibold leading-6 text-stone-950">{item.title}</h3>
                    )}
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-stone-600">{item.excerpt}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {isAnonymous && (
          <section className="rounded-xl border border-orange-100 bg-orange-50 px-5 py-5">
            <h2 className="text-base font-semibold text-orange-950">登录后可以生成自己的对比报告</h2>
            <p className="mt-2 text-sm leading-6 text-orange-800">
              选择 2 到 3 位人物，系统会整理公开资料、补充近期信息，并保存成可分享的报告。
            </p>
            <Link href="/login" className="mt-4 inline-flex rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
              登录或注册
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}

function PendingOrFailedPanel({
  status,
  errorMessage,
  events,
}: {
  status: string;
  errorMessage: string | null;
  events: Array<{ id: string; status: string; title: string; message: string | null; createdAt: Date }>;
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-orange-600">生成进度</div>
          <h2 className="mt-1 text-lg font-semibold text-stone-950">
            {status === 'failed' ? '报告生成失败' : '报告正在生成'}
          </h2>
        </div>
      </div>
      {errorMessage && (
        <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
          {errorMessage}
        </div>
      )}
      <div className="grid gap-2 md:grid-cols-2">
        {events.map(event => (
          <div key={event.id} className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-stone-900">{event.title}</span>
              <span className={`rounded-md px-2 py-0.5 text-[11px] ${eventStatusClass(event.status)}`}>{eventStatusLabel(event.status)}</span>
            </div>
            {event.message && <p className="mt-1 text-xs leading-5 text-stone-500">{event.message}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function AvatarStack({ people }: { people: Array<{ id: string; name: string; avatarUrl: string | null }> }) {
  return (
    <div className="flex -space-x-2">
      {people.map(person => (
        <span key={person.id} className="relative inline-flex h-9 w-9 overflow-hidden rounded-lg bg-stone-100 ring-2 ring-white">
          {person.avatarUrl ? (
            <Image src={person.avatarUrl} alt={person.name} fill sizes="36px" className="object-cover object-top" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-orange-500 text-xs font-semibold text-white">
              {person.name.charAt(0)}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

function PersonAvatar({ person }: { person: { name: string; avatarUrl: string | null } }) {
  return (
    <span className="relative inline-flex h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100">
      {person.avatarUrl ? (
        <Image src={person.avatarUrl} alt={person.name} fill sizes="48px" className="object-cover object-top" />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-orange-500 text-sm font-semibold text-white">
          {person.name.charAt(0)}
        </span>
      )}
    </span>
  );
}

function ReportStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-stone-50 px-2 py-2">
      <div className="text-lg font-semibold text-stone-950">{value}</div>
      <div className="mt-0.5 text-[11px] text-stone-500">{label}</div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="mb-3 text-base font-semibold text-stone-950">{title}</h2>;
}

function isReportContent(value: unknown): value is CompareReportContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Partial<CompareReportContent>;
  return typeof record.title === 'string'
    && typeof record.summary === 'string'
    && Boolean(record.verdict)
    && Array.isArray(record.people)
    && Array.isArray(record.dimensions)
    && Array.isArray(record.evidence)
    && Array.isArray(record.analysisSections);
}

function sourceCountFromSnapshot(value: unknown, content: CompareReportContent | null): number {
  if (content) return content.coverage.sourceCount;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 0;
  const count = (value as { evidenceCount?: unknown }).evidenceCount;
  return typeof count === 'number' && Number.isFinite(count) ? count : 0;
}

function statusLabel(status: string): string {
  if (status === 'completed') return '已完成';
  if (status === 'running') return '生成中';
  if (status === 'failed') return '失败';
  return '等待生成';
}

function statusClass(status: string): string {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700';
  if (status === 'running') return 'bg-orange-50 text-orange-700';
  if (status === 'failed') return 'bg-red-50 text-red-700';
  return 'bg-stone-50 text-stone-500';
}

function eventStatusLabel(status: string): string {
  if (status === 'completed') return '完成';
  if (status === 'failed') return '失败';
  if (status === 'queued') return '等待';
  return '进行中';
}

function eventStatusClass(status: string): string {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700';
  if (status === 'failed') return 'bg-red-50 text-red-700';
  if (status === 'queued') return 'bg-stone-100 text-stone-500';
  return 'bg-orange-50 text-orange-700';
}

function confidenceLabel(confidence: string): string {
  if (confidence === 'high') return '资料较充分';
  if (confidence === 'medium') return '资料可用';
  return '谨慎参考';
}

function gridClass(count: number): string {
  if (count >= 3) return 'grid gap-4 lg:grid-cols-3';
  return 'grid gap-4 md:grid-cols-2';
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(value);
}

function formatTimelineDate(value: string | null): string {
  if (!value) return '时间待补';
  if (/^\d{4}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}
