import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { CompareReportLauncher } from '@/components/compare/CompareReportLauncher';
import { SiteHeader } from '@/components/common/SiteHeader';
import { prisma } from '@/lib/db/prisma';

export const revalidate = 300;
export const metadata: Metadata = {
  title: '人物对比 | AI 人物库',
  description: '查看已生成的 AI 人物观点对比报告。',
};

export default async function CompareReportsPage() {
  const reports = await loadPublicCompareReports();
  const peopleById = new Map(
    (await loadPeopleById(reports.flatMap(report => report.peopleIds)))
      .map(person => [person.id, person])
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <SiteHeader current="compareReports" />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <section className="mb-6 flex flex-col gap-4 rounded-xl border border-stone-200 bg-white px-5 py-6 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:px-7">
          <div>
            <div className="mb-2 text-xs font-medium text-orange-600">人物对比</div>
            <h1 className="text-2xl font-semibold text-stone-950">公开对比报告</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              从公开资料里比较人物的观点变化、路径差异和关键证据。
            </p>
          </div>
          <div className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 text-center">
            <div className="text-lg font-semibold text-stone-950">{reports.length}</div>
            <div className="mt-0.5 text-[11px] text-stone-500">份报告</div>
            {reports.length > 0 && (
              <div className="mt-3">
                <CompareReportLauncher triggerLabel="新建报告" />
              </div>
            )}
          </div>
        </section>

        {reports.length === 0 ? (
          <section className="rounded-xl border border-dashed border-stone-200 bg-white/70 px-5 py-12 text-center">
            <h2 className="text-base font-semibold text-stone-950">还没有公开报告</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
              登录后可以生成第一份人物对比报告。
            </p>
            <div className="mt-5">
              <CompareReportLauncher triggerLabel="生成第一份报告" />
            </div>
          </section>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {reports.map(report => {
              const people = report.peopleIds.map(id => peopleById.get(id)).filter(Boolean) as PersonPreview[];
              return (
                <Link
                  key={report.id}
                  href={`/compare/reports/${report.id}`}
                  className="group rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-2 flex -space-x-2">
                        {people.map(person => (
                          <PersonAvatar key={person.id} person={person} />
                        ))}
                      </div>
                      <h2 className="line-clamp-2 text-base font-semibold leading-6 text-stone-950 group-hover:text-orange-700">
                        {report.title}
                      </h2>
                    </div>
                    <span className="rounded-md bg-stone-50 px-2 py-1 text-[11px] text-stone-500 ring-1 ring-stone-100">
                      {sourceCountFromSnapshot(report.sourceSnapshot)} 条资料
                    </span>
                  </div>
                  {report.summary && (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-600">{report.summary}</p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-stone-400">
                    <span>{formatDate(report.completedAt || report.createdAt)}</span>
                    {report.topic && <span className="rounded-md bg-stone-50 px-2 py-0.5 text-stone-500">{report.topic}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

interface PersonPreview {
  id: string;
  name: string;
  avatarUrl: string | null;
  currentTitle: string | null;
}

const loadPublicCompareReports = unstable_cache(
  async () => prisma.compareReport.findMany({
    where: {
      status: 'completed',
      visibility: 'public',
    },
    select: {
      id: true,
      title: true,
      topic: true,
      summary: true,
      peopleIds: true,
      sourceSnapshot: true,
      completedAt: true,
      createdAt: true,
    },
    orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
    take: 48,
  }),
  ['public-compare-reports'],
  { revalidate: 300 }
);

const loadPeopleById = unstable_cache(async (ids: string[]): Promise<PersonPreview[]> => {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return [];

  const people = await prisma.people.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      currentTitle: true,
      organization: true,
    },
  });

  return people.map(person => ({
    id: person.id,
    name: person.name,
    avatarUrl: person.avatarUrl,
    currentTitle: person.currentTitle || person.organization[0] || null,
  }));
}, ['compare-report-people'], { revalidate: 300 });

function PersonAvatar({ person }: { person: PersonPreview }) {
  return (
    <span className="relative inline-flex h-9 w-9 overflow-hidden rounded-lg bg-stone-100 ring-2 ring-white">
      {person.avatarUrl ? (
        <Image src={person.avatarUrl} alt={person.name} fill sizes="36px" className="object-cover object-top" />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-orange-500 text-xs font-semibold text-white">
          {person.name.charAt(0)}
        </span>
      )}
    </span>
  );
}

function sourceCountFromSnapshot(value: unknown): number {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 0;
  const count = (value as { evidenceCount?: unknown }).evidenceCount;
  return typeof count === 'number' && Number.isFinite(count) ? count : 0;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(value);
}
