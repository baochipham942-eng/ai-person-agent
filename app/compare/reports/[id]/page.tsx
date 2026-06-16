import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import type { CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AnonymousReportCta } from '@/components/compare/AnonymousReportCta';
import { IdentityWorkspaceLayout } from '@/components/common/IdentityWorkspaceLayout';
import { COMPARE_AGENT_TOOLS } from '@/lib/compare-report';
import { prisma } from '@/lib/db/prisma';
import {
  normalizeCompareReportLayout,
  sanitizeCompareReportContent,
  type CompareReportContent,
  type CompareReportModuleKey,
  type ReportEvidence,
} from '@/lib/compare-report-agent';

interface ReportDetailPageProps {
  params: Promise<{ id: string }>;
}

interface ReportPersonPreview {
  id: string;
  name: string;
  avatarUrl: string | null;
  currentTitle: string | null;
  organization?: string[];
  topics: string[];
}

type ReportPerson = CompareReportContent['people'][number];
type ReportDimension = CompareReportContent['dimensions'][number];
type ReportTimelineItem = CompareReportContent['timeline'][number];
type ReportEvent = {
  id: string;
  step: string;
  status: string;
  title: string;
  message: string | null;
  createdAt: Date;
};

const pageBackground: CSSProperties = {
  backgroundColor: '#f6f4ef',
  backgroundImage: 'radial-gradient(circle at top left, rgba(200, 95, 32, 0.11), transparent 34rem), linear-gradient(180deg, #fbfaf6 0%, #f6f4ef 32rem)',
};

export const revalidate = 300;

const loadPublicCompareReport = unstable_cache(
  async (id: string) => prisma.compareReport.findUnique({
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
      errorMessage: true,
      createdAt: true,
      completedAt: true,
    },
  }),
  ['public-compare-report-detail-v2'],
  { revalidate: 300 }
);

const loadCompareReportEvents = unstable_cache(
  async (reportId: string, reportStatus: string) => fetchReportEvents(reportId, reportStatus),
  ['compare-report-events-v2'],
  { revalidate: 300 }
);

export async function generateMetadata({ params }: ReportDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const report = await loadPublicCompareReport(id);

  return {
    title: report ? `${report.title} | AI 人物库` : '人物对比报告 | AI 人物库',
    description: report?.summary || 'AI 人物观点对比报告。',
  };
}

export default async function CompareReportDetailPage({ params }: ReportDetailPageProps) {
  const { id } = await params;
  const report = await loadPublicCompareReport(id);

  if (!report || report.visibility !== 'public') notFound();

  const [people, events] = await Promise.all([
    prisma.people.findMany({
      where: { id: { in: report.peopleIds } },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        currentTitle: true,
        organization: true,
        topics: true,
      },
    }),
    loadCompareReportEvents(report.id, report.status),
  ]);
  const peopleById = new Map(people.map(person => [person.id, person]));
  const orderedPeople = report.peopleIds
    .map(personId => peopleById.get(personId))
    .filter(Boolean)
    .map(person => ({
      id: person!.id,
      name: person!.name,
      avatarUrl: person!.avatarUrl,
      currentTitle: person!.currentTitle || person!.organization[0] || null,
      organization: person!.organization,
      topics: person!.topics,
    })) as ReportPersonPreview[];
  const content = isReportContent(report.reportJson) ? sanitizeCompareReportContent(report.reportJson) : null;
  const modules = content ? new Set(normalizeCompareReportLayout(content.layout, content).modules) : new Set<CompareReportModuleKey>();
  const sourceCount = sourceCountFromSnapshot(null, content);

  return (
    <IdentityWorkspaceLayout identity="user">
      <div className="min-h-screen text-[#201c17]" style={pageBackground}>
        <main className="mx-auto max-w-[1180px] px-4 py-7 sm:px-6">
          <ReportHero
            reportTitle={report.title}
            reportSummary={report.summary}
            topic={report.topic}
            status={report.status}
            generatedAt={report.completedAt || report.createdAt}
            people={orderedPeople}
            content={content}
            sourceCount={sourceCount}
          />

          <ProcessDetails events={events} />

          {report.status !== 'completed' || !content ? (
            <PendingOrFailedPanel status={report.status} errorMessage={report.errorMessage} events={events} />
          ) : (
            <>
              {modules.has('pkStage') && (
                <CompareStage content={content} people={orderedPeople} />
              )}

              {modules.has('viewpointMatrix') && (
                <ViewpointMatrix content={content} />
              )}

              {modules.has('timeline') && (
                <TimelineSection content={content} />
              )}

              {modules.has('analysis') && (
                <AnalysisSection sections={content.analysisSections} />
              )}

              {modules.has('evidence') && (
                <EvidenceSection evidence={content.evidence} dimensions={content.dimensions} />
              )}
            </>
          )}

          <AnonymousReportCta />
        </main>
      </div>
    </IdentityWorkspaceLayout>
  );
}

async function fetchReportEvents(reportId: string, reportStatus: string): Promise<ReportEvent[]> {
  const isCompleted = reportStatus === 'completed';
  const rows = await prisma.compareReportEvent.findMany({
    where: { reportId },
    select: {
      id: true,
      step: true,
      status: true,
      title: true,
      message: true,
      createdAt: true,
    },
    orderBy: { createdAt: isCompleted ? 'desc' : 'asc' },
    ...(isCompleted && { take: 4 }),
  });

  return isCompleted ? rows.reverse() : rows;
}

function ReportHero({
  reportTitle,
  reportSummary,
  topic,
  status,
  generatedAt,
  people,
  content,
  sourceCount,
}: {
  reportTitle: string;
  reportSummary: string | null;
  topic: string | null;
  status: string;
  generatedAt: Date;
  people: ReportPersonPreview[];
  content: CompareReportContent | null;
  sourceCount: number;
}) {
  const title = content?.title || reportTitle;
  const summary = content?.summary || reportSummary || '报告正在生成。';
  const limitations = content?.coverage.limitations || [];

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(20rem,0.82fr)]">
      <article className="rounded-lg border border-[#5b4a33]/15 bg-[#fffdf8]/90 p-5 shadow-[0_18px_45px_rgba(71,52,26,0.10)] sm:p-6">
        <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-[#c85f20]">
          <span className="h-[7px] w-[7px] rounded-full bg-[#c85f20]" />
          观点对照，不是资料堆叠
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-[#fff2de] px-2 py-0.5 text-xs font-medium text-[#8a3a12]">对比报告</span>
          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${statusClass(status)}`}>
            {statusLabel(status)}
          </span>
          <span className="text-xs text-[#776f64]">{formatDate(generatedAt)}</span>
        </div>
        <h1 className="max-w-3xl text-[28px] font-semibold leading-tight tracking-normal text-[#201c17] sm:text-[34px]">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#776f64]">{summary}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {people.map(person => (
            <Link
              key={person.id}
              href={`/person/${person.id}`}
              prefetch={false}
              className="inline-flex items-center gap-2 rounded-lg border border-[#ded4c4] bg-white px-3 py-2 text-left text-xs text-[#4f463b] hover:border-orange-200 hover:text-orange-700"
            >
              <PersonAvatar person={person} size={28} />
              <span className="min-w-0">
                <strong className="block text-[13px] text-[#201c17]">{person.name}</strong>
                <span className="block max-w-[13rem] truncate text-[11px] text-[#776f64]">{person.currentTitle || '公开身份整理中'}</span>
              </span>
            </Link>
          ))}
        </div>
      </article>

      <aside className="rounded-lg border border-[#5b4a33]/15 bg-[#fffdf8]/90 p-5 shadow-[0_18px_45px_rgba(71,52,26,0.10)]">
        <h2 className="text-[15px] font-semibold text-[#201c17]">证据预览</h2>
        <p className="mt-2 text-xs leading-5 text-[#776f64]">
          {limitations.length > 0
            ? '这份报告会把资料限制直接露出来，强判断需要回到来源逐条核验。'
            : '当前报告已有可展开来源，适合先看核心判断，再回到矩阵和证据。'}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <SourceStat label="可展开证据" value={sourceCount} />
          <SourceStat label="已有资料" value={content?.coverage.localSourceCount ?? 0} />
          <SourceStat label="公开搜索" value={content?.coverage.webSourceCount ?? 0} />
        </div>
        {topic && (
          <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs leading-5 text-[#5f5548] ring-1 ring-[#ded4c4]/70">
            {topic}
          </p>
        )}
        <div className="mt-3 border-l-4 border-[#9a6b1f] bg-[#fff8e8] px-3 py-2 text-xs leading-5 text-[#6f501b]">
          {limitations[0] || '本页基于已收录公开资料形成判断，更严肃的结论仍要回到原始来源。'}
        </div>
      </aside>
    </section>
  );
}

function SourceStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-[#ded4c4]/70">
      <div className="text-lg font-semibold leading-none text-[#201c17]">{value}</div>
      <div className="mt-1 text-[11px] text-[#776f64]">{label}</div>
    </div>
  );
}

function ProcessDetails({ events }: { events: ReportEvent[] }) {
  return (
    <details className="my-4 rounded-lg border border-[#5b4a33]/15 bg-[#fffdf8]/80 px-5 py-4 shadow-[0_12px_30px_rgba(71,52,26,0.07)]">
      <summary className="cursor-pointer text-sm font-medium text-[#5f5548] marker:text-[#c85f20] hover:text-[#c85f20]">
        报告可信度链路
      </summary>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)]">
        <div>
          <div className="mb-2 text-xs font-bold text-[#c85f20]">它和读者的关系</div>
          <p className="max-w-2xl text-sm leading-6 text-[#4d4439]">
            这里说明报告为什么敢给出这些判断：先确认人物和资料覆盖，再整理公开来源和近期动态，最后把强判断限制在能回看的证据内。读者可以用它判断哪些结论能先参考，哪些需要回到原始来源再核验。
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <ProcessPillar title="取材" body="人物资料、观点摘录、近期动态和公开网页。" />
            <ProcessPillar title="成文" body="把证据整理成共同点、差异点和个人视角。" />
            <ProcessPillar title="复核" body="检查来源覆盖，弱证据会进入限制说明。" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {COMPARE_AGENT_TOOLS.map(tool => (
              <span
                key={tool.key}
                title={tool.description}
                className="rounded-md border border-[#ded4c4] bg-white px-2.5 py-1 text-xs font-medium text-[#5f5548]"
              >
                {tool.label}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          {events.slice(-4).map(event => (
            <div key={event.id} className="rounded-lg bg-white px-3 py-2 text-xs ring-1 ring-[#ded4c4]/70">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-[#201c17]">{event.title}</span>
                <span className={`rounded-md px-2 py-0.5 ${eventStatusClass(event.status)}`}>{eventStatusLabel(event.status)}</span>
              </div>
              {event.message && <p className="mt-1 leading-5 text-[#776f64]">{event.message}</p>}
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

function ProcessPillar({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-[#ded4c4]/70">
      <div className="text-xs font-semibold text-[#201c17]">{title}</div>
      <p className="mt-1 text-xs leading-5 text-[#776f64]">{body}</p>
    </div>
  );
}

function CompareStage({ content, people }: { content: CompareReportContent; people: ReportPersonPreview[] }) {
  const personMeta = new Map(people.map(person => [person.id, person]));
  if (content.people.length === 2) {
    return (
      <section className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.72fr)_minmax(0,1fr)]">
        <PersonSummaryCard person={content.people[0]} meta={personMeta.get(content.people[0].id)} />
        <VerdictCard verdict={content.verdict} />
        <PersonSummaryCard person={content.people[1]} meta={personMeta.get(content.people[1].id)} />
      </section>
    );
  }

  return (
    <section className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.62fr)]">
      <div className="grid gap-3 md:grid-cols-3">
        {content.people.map(person => (
          <PersonSummaryCard key={person.id} person={person} meta={personMeta.get(person.id)} />
        ))}
      </div>
      <VerdictCard verdict={content.verdict} />
    </section>
  );
}

function PersonSummaryCard({ person, meta }: { person: ReportPerson; meta?: ReportPersonPreview }) {
  const topics = (meta?.topics || []).slice(0, 4);

  return (
    <article className="min-w-0 rounded-lg border border-[#5b4a33]/15 bg-[#fffdf8] p-4 shadow-[0_18px_45px_rgba(71,52,26,0.10)]">
      <div className="flex items-center gap-3">
        <PersonAvatar person={person} size={58} />
        <div className="min-w-0">
          <Link href={`/person/${person.id}`} prefetch={false} className="text-xl font-semibold tracking-normal text-[#201c17] hover:text-[#c85f20]">
            {person.name}
          </Link>
          <p className="mt-1 text-xs leading-5 text-[#776f64]">{person.currentTitle || '公开身份整理中'}</p>
        </div>
      </div>
      {topics.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {topics.map(topic => (
            <span key={topic} className="rounded-full border border-[#5b4a33]/15 bg-white px-2 py-1 text-[11px] leading-none text-[#5f5548]">
              {topic}
            </span>
          ))}
        </div>
      )}
      <p className="mt-4 text-sm leading-6 text-[#4d4439]">{person.stanceSummary}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniMetric label="证据" value={person.evidenceCount} />
        <MiniMetric label="话题" value={topics.length} />
      </div>
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[#f7f1e7] px-3 py-2">
      <strong className="block text-base leading-none text-[#201c17]">{value}</strong>
      <span className="mt-1 block text-[11px] text-[#776f64]">{label}</span>
    </div>
  );
}

function VerdictCard({ verdict }: { verdict: CompareReportContent['verdict'] }) {
  return (
    <aside className="flex min-h-[12rem] flex-col justify-center rounded-lg border border-[#201c17] bg-[#201c17] p-5 text-center text-[#fff8ea] shadow-[0_18px_45px_rgba(71,52,26,0.10)]">
      <div className="text-xs font-bold text-[#d8b991]">核心判断</div>
      <h2 className="mt-3 text-xl font-semibold leading-7 tracking-normal">{verdict.headline}</h2>
      <p className="mt-4 text-xs leading-6 text-[#e7ddcb]">{verdict.body}</p>
    </aside>
  );
}

function ViewpointMatrix({ content }: { content: CompareReportContent }) {
  const evidenceById = new Map(content.evidence.map(item => [item.id, item]));
  const gridStyle = {
    gridTemplateColumns: `156px repeat(${content.people.length}, minmax(0, 1fr)) minmax(180px, 0.8fr)`,
  };

  return (
    <section className="mb-4 rounded-lg border border-[#5b4a33]/15 bg-[#fffdf8]/90 p-4 shadow-[0_18px_45px_rgba(71,52,26,0.10)] sm:p-5">
      <SectionHead title="观点矩阵" note="先看共同点，再看每个人的视角和差异来源。" />
      <div className="overflow-hidden rounded-lg border border-[#ded4c4] bg-white">
        <div className="hidden border-b border-[#eee5d7] bg-[#f8f1e7] text-xs font-bold text-[#5f5548] lg:grid" style={gridStyle}>
          <div className="border-r border-[#eee5d7] px-4 py-3">维度</div>
          {content.people.map(person => (
            <div key={person.id} className="border-r border-[#eee5d7] px-4 py-3">{person.name}</div>
          ))}
          <div className="px-4 py-3">差异</div>
        </div>
        {content.dimensions.map(dimension => (
          <MatrixRow key={dimension.key} dimension={dimension} people={content.people} evidenceById={evidenceById} gridStyle={gridStyle} />
        ))}
      </div>
    </section>
  );
}

function MatrixRow({
  dimension,
  people,
  evidenceById,
  gridStyle,
}: {
  dimension: ReportDimension;
  people: ReportPerson[];
  evidenceById: Map<string, ReportEvidence>;
  gridStyle: CSSProperties;
}) {
  const viewsByPerson = new Map(dimension.personViews.map(view => [view.personId, view]));
  const evidence = dimension.evidenceIds.map(id => evidenceById.get(id)).filter(Boolean) as ReportEvidence[];

  return (
    <article className="border-b border-[#eee5d7] last:border-b-0 lg:grid" style={gridStyle}>
      <div className="bg-[#201c17] px-4 py-3 text-[#fff8ea] lg:border-r lg:border-[#eee5d7] lg:bg-[#fbf7ee] lg:text-[#201c17]">
        <div className="text-sm font-bold">{dimension.label}</div>
        <div className="mt-2 inline-flex rounded-full bg-[#fff2de] px-2 py-1 text-[11px] font-medium text-[#8a3a12] lg:bg-white">
          {confidenceLabel(dimension.confidence)}
        </div>
      </div>
      {people.map(person => {
        const view = viewsByPerson.get(person.id);
        return (
          <div key={`${dimension.key}-${person.id}`} className="border-b border-[#eee5d7] px-4 py-3 text-sm leading-6 text-[#4d4439] lg:border-b-0 lg:border-r">
            <div className="mb-2 text-xs font-semibold text-[#201c17] lg:hidden">{person.name}</div>
            {view?.view || '这一维度的公开资料仍需补充。'}
          </div>
        );
      })}
      <div className="px-4 py-3 text-sm leading-6 text-[#4d4439]">
        <div className="mb-2 text-xs font-semibold text-[#201c17] lg:hidden">差异</div>
        <p>{dimension.differences}</p>
        <p className="mt-2 text-xs leading-5 text-[#776f64]">{dimension.sharedView}</p>
        {evidence.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {evidence.slice(0, 3).map(item => (
              <a
                key={item.id}
                href={`#${evidenceAnchorId(item.id)}`}
                title={item.title}
                className="inline-flex max-w-full rounded-md bg-[#fff2de] px-2 py-1 text-left text-xs font-semibold leading-5 text-[#8a3a12] ring-1 ring-[#f0d4b8] hover:bg-[#ffe8c5] hover:text-orange-900"
              >
                <span className="line-clamp-2">
                  {item.personName} · {item.title}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function TimelineSection({ content }: { content: CompareReportContent }) {
  const groups = groupTimeline(content.timeline, content.people);

  return (
    <section className="mb-4 rounded-lg border border-[#5b4a33]/15 bg-[#fffdf8]/90 p-4 shadow-[0_18px_45px_rgba(71,52,26,0.10)] sm:p-5">
      <SectionHead title="变化时间线" note="只放已有日期、年份或明确阶段的证据。" />
      <div className="grid gap-3 lg:grid-cols-2">
        {groups.map(group => (
          <article key={group.key} className="rounded-lg border border-[#ded4c4] bg-white p-4">
            <h3 className="text-sm font-semibold text-[#201c17]">{group.label}</h3>
            <div className="mt-3 space-y-3">
              {group.items.map((item, index) => (
                <div key={`${group.key}-${item.description}-${index}`} className="relative pl-5">
                  <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-[#c85f20]" />
                  {index < group.items.length - 1 && <span className="absolute bottom-[-14px] left-[3px] top-4 w-px bg-[#eadfce]" />}
                  <time className="text-[11px] font-bold text-[#c85f20]">{formatTimelineDate(item.date)}</time>
                  {item.sourceUrl ? (
                    <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs leading-5 text-[#4d4439] hover:text-[#c85f20]">
                      {item.description}
                    </a>
                  ) : (
                    <p className="mt-1 text-xs leading-5 text-[#4d4439]">{item.description}</p>
                  )}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AnalysisSection({ sections }: { sections: CompareReportContent['analysisSections'] }) {
  return (
    <section className="mb-4 rounded-lg border border-[#5b4a33]/15 bg-[#fffdf8]/90 p-4 shadow-[0_18px_45px_rgba(71,52,26,0.10)] sm:p-5">
      <SectionHead title="完整分析" note="把长结论拆成几个可检查的问题。" />
      <div className="grid gap-3 md:grid-cols-2">
        {sections.map(section => (
          <article key={section.title} className="rounded-lg border border-[#ded4c4] bg-white p-4">
            <h3 className="text-sm font-semibold text-[#201c17]">{section.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[#4d4439]">{section.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function EvidenceSection({ evidence, dimensions }: { evidence: ReportEvidence[]; dimensions: ReportDimension[] }) {
  const referencesByEvidenceId = buildEvidenceReferenceMap(dimensions);
  const viewpointEvidence = evidence.filter(item => (referencesByEvidenceId.get(item.id) || []).length > 0);
  const backgroundEvidence = evidence.filter(item => (referencesByEvidenceId.get(item.id) || []).length === 0);

  return (
    <>
      <section className="mb-4 rounded-lg border border-[#5b4a33]/15 bg-[#fffdf8]/90 p-4 shadow-[0_18px_45px_rgba(71,52,26,0.10)] sm:p-5">
        <SectionHead title="观点引用证据" note="这些资料被观点矩阵直接引用，用来支撑页面里的共同点、差异点和个人视角。" />
        {viewpointEvidence.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {viewpointEvidence.map(item => (
              <EvidenceCard key={item.id} item={item} references={referencesByEvidenceId.get(item.id) || []} />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-[#ded4c4] bg-white px-4 py-3 text-sm leading-6 text-[#776f64]">
            当前观点矩阵还没有绑定到具体证据，结论只能作为阅读线索。
          </p>
        )}
      </section>

      {backgroundEvidence.length > 0 && (
        <section className="mb-4 rounded-lg border border-[#5b4a33]/15 bg-[#fffdf8]/90 p-4 shadow-[0_18px_45px_rgba(71,52,26,0.10)] sm:p-5">
          <SectionHead title="补充来源" note="这些资料参与人物背景、覆盖度和资料厚度判断，但没有被观点矩阵直接引用。" />
          <div className="grid gap-3 md:grid-cols-2">
            {backgroundEvidence.map(item => (
              <EvidenceCard key={item.id} item={item} references={[]} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function EvidenceCard({ item, references }: { item: ReportEvidence; references: string[] }) {
  return (
    <article id={evidenceAnchorId(item.id)} className="scroll-mt-24 rounded-lg border border-[#ded4c4] bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-[#f8f1e7] px-2 py-0.5 text-[11px] text-[#5f5548]">{item.personName}</span>
        <span className="rounded-md bg-[#f8f1e7] px-2 py-0.5 text-[11px] text-[#5f5548]">{item.sourceType}</span>
        {references.length > 0 ? (
          references.slice(0, 2).map(reference => (
            <span key={`${item.id}-${reference}`} className="rounded-md bg-[#fff2de] px-2 py-0.5 text-[11px] font-medium text-[#8a3a12]">
              支撑：{reference}
            </span>
          ))
        ) : (
          <span className="rounded-md bg-stone-50 px-2 py-0.5 text-[11px] text-[#776f64]">补充资料</span>
        )}
      </div>
      {item.url ? (
        <a href={item.url} target="_blank" rel="noreferrer" className="text-sm font-semibold leading-6 text-[#201c17] hover:text-[#c85f20]">
          {item.title}
        </a>
      ) : (
        <h3 className="text-sm font-semibold leading-6 text-[#201c17]">{item.title}</h3>
      )}
      <p className="mt-2 text-xs leading-5 text-[#5f5548]">{item.excerpt}</p>
    </article>
  );
}

function SectionHead({ title, note }: { title: string; note: string }) {
  return (
    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-[15px] font-semibold text-[#201c17]">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-[#776f64]">{note}</p>
      </div>
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
  events: ReportEvent[];
}) {
  return (
    <section className="rounded-lg border border-[#5b4a33]/15 bg-[#fffdf8]/90 p-5 shadow-[0_18px_45px_rgba(71,52,26,0.10)]">
      <div className="mb-4">
        <div className="text-xs font-bold text-[#c85f20]">生成进度</div>
        <h2 className="mt-1 text-lg font-semibold text-[#201c17]">
          {status === 'failed' ? '报告生成失败' : '报告正在生成'}
        </h2>
      </div>
      {errorMessage && (
        <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
          {errorMessage}
        </div>
      )}
      <div className="grid gap-2 md:grid-cols-2">
        {events.map(event => (
          <div key={event.id} className="rounded-lg border border-[#ded4c4] bg-white px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-[#201c17]">{event.title}</span>
              <span className={`rounded-md px-2 py-0.5 text-[11px] ${eventStatusClass(event.status)}`}>{eventStatusLabel(event.status)}</span>
            </div>
            {event.message && <p className="mt-1 text-xs leading-5 text-[#776f64]">{event.message}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function PersonAvatar({ person, size }: { person: { name: string; avatarUrl: string | null }; size: number }) {
  return (
    <span
      className="relative inline-flex flex-shrink-0 overflow-hidden rounded-lg bg-[#ebe2d4] ring-1 ring-[#5b4a33]/15"
      style={{ width: size, height: size }}
    >
      {person.avatarUrl ? (
        <Image src={person.avatarUrl} alt={person.name} fill sizes={`${size}px`} className="object-cover object-top" />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[#c85f20] text-sm font-semibold text-white">
          {person.name.charAt(0)}
        </span>
      )}
    </span>
  );
}

function groupTimeline(timeline: ReportTimelineItem[], people: ReportPerson[]) {
  const nameById = new Map(people.map(person => [person.id, person.name]));
  const groups = new Map<string, { key: string; label: string; items: ReportTimelineItem[] }>();

  for (const item of timeline) {
    const key = item.personId || 'shared';
    const label = item.personId ? (nameById.get(item.personId) || item.label) : '共同线索';
    const group = groups.get(key) || { key, label, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }

  return [...groups.values()].filter(group => group.items.length > 0);
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

function evidenceAnchorId(id: string): string {
  return `evidence-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function buildEvidenceReferenceMap(dimensions: ReportDimension[]): Map<string, string[]> {
  const references = new Map<string, string[]>();

  for (const dimension of dimensions) {
    for (const evidenceId of dimension.evidenceIds) {
      const labels = references.get(evidenceId) || [];
      if (!labels.includes(dimension.label)) labels.push(dimension.label);
      references.set(evidenceId, labels);
    }
  }

  return references;
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

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '日期待确认';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '日期待确认';

  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
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
