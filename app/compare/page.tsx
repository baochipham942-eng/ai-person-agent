import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ActivityEventList } from '@/components/activity/ActivityEventList';
import { CompareReportLauncher } from '@/components/compare/CompareReportLauncher';
import { SiteHeader } from '@/components/common/SiteHeader';
import { fetchComparePeople, type ComparePerson } from '@/lib/compare';
import { generateCompareReport, type CompareReport, type CompareReviewSeverity } from '@/lib/compare-report';

interface ComparePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata: Metadata = {
  title: '人物对比 | AI 人物库',
  description: '并排比较 AI 人物的身份、贡献、影响力、关系和近期动态。',
};

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const resolvedSearchParams = await searchParams;
  const ids = parsePeopleParam(firstParam(resolvedSearchParams?.people));
  const people = await fetchComparePeople(ids);
  const report = generateCompareReport(people);

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <SiteHeader current="compareReports" />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6">
        <section className="rounded-xl border border-stone-200 bg-white px-5 py-6 shadow-sm sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 text-xs font-medium text-orange-600">对比工作台</div>
              <h1 className="text-2xl font-semibold text-stone-950">人物对比</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                选择 2 到 3 位人物，并排比较身份、代表贡献、话题覆盖、学术开源影响、关系和最近变化。
              </p>
            </div>
            <div className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 text-center">
              <div className="text-lg font-semibold text-stone-950">{people.length}</div>
              <div className="mt-0.5 text-[11px] text-stone-500">已选人物</div>
              {people.length >= 2 && (
                <div className="mt-3 flex flex-col gap-2">
                  <CompareReportLauncher
                    initialPeople={people.map(person => ({
                      id: person.id,
                      name: person.name,
                      avatarUrl: person.avatarUrl,
                      currentTitle: person.currentTitle || person.organization[0] || null,
                      topics: person.topics,
                    }))}
                    triggerLabel="生成对比报告"
                    triggerClassName="inline-flex h-8 items-center justify-center rounded-lg bg-stone-900 px-3 text-xs font-medium text-white transition-colors hover:bg-orange-600"
                  />
                  <Link href="/compare/reports" className="text-xs font-medium text-stone-500 hover:text-orange-600">
                    查看报告库
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {people.length < 2 ? (
          <EmptyCompareState selectedCount={people.length} />
        ) : (
          <>
            <CompareReportPanel report={report} />
            <CompareIdentity people={people} />
            <CompareMetrics people={people} />
            <CompareTopics people={people} />
            <CompareProducts people={people} />
            <CompareSources people={people} />
            <CompareRelations people={people} />
            <CompareActivity people={people} />
          </>
        )}
      </main>
    </div>
  );
}

function CompareReportPanel({ report }: { report: CompareReport }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white px-5 py-5 shadow-sm sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-orange-600">对比速览</span>
            <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${statusClass(report.status)}`}>
              {statusLabel(report.status)}
            </span>
            {report.tools.map(tool => (
              <span key={tool.key} className="rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] text-stone-500">
                {tool.label}
              </span>
            ))}
          </div>
          <h2 className="text-lg font-semibold leading-7 text-stone-950">{report.headline}</h2>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-stone-600 md:grid-cols-2">
            {report.executiveSummary.map(item => (
              <p key={item} className="rounded-lg bg-stone-50 px-3 py-2">{item}</p>
            ))}
          </div>
        </div>

        <div className="grid min-w-48 grid-cols-3 gap-2 text-center lg:grid-cols-1">
          <ReportStat label="覆盖分" value={report.review.averageCoverageScore} />
          <ReportStat label="证据缺口" value={report.review.issues.length} />
          <ReportStat label="人数" value={report.selectedCount} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <SectionTitle title="关键判断" />
          <div className="grid gap-3 md:grid-cols-2">
            {report.dimensions.map(dimension => (
              <div key={dimension.key} className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-stone-900">{dimension.label}</div>
                  {dimension.leaderName && (
                    <span className="truncate rounded-md bg-white px-2 py-0.5 text-[10px] text-stone-500 ring-1 ring-stone-200">
                      {dimension.leaderName}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs leading-5 text-stone-600">{dimension.summary}</p>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <SectionTitle title="分析报告" />
            <div className="grid gap-3 md:grid-cols-2">
              <ReportList title="共同点" items={report.analysis.common} />
              <ReportList title="差异点" items={report.analysis.differences} />
            </div>
          </div>
        </div>

        <aside>
          <SectionTitle title="审查结果" />
          <div className="space-y-2">
            {report.review.people.map(person => (
              <div key={person.personId} className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/person/${person.personId}`} className="truncate text-xs font-semibold text-stone-900 hover:text-orange-600">
                    {person.personName}
                  </Link>
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${personReviewStatusClass(person.status)}`}>
                    {personReviewStatusLabel(person.status)}
                  </span>
                </div>
                <div className="mt-1.5 text-[11px] text-stone-500">
                  覆盖 {person.coverageScore} · 来源 {person.evidenceCounts.totalSources} · 动态 {person.evidenceCounts.latestEvents}
                </div>
                {person.issues.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {person.issues.slice(0, 3).map(issue => (
                      <span key={issue.key} className={`rounded px-1.5 py-0.5 text-[10px] ${severityClass(issue.severity)}`}>
                        {issue.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-orange-100 bg-orange-50 px-3 py-3">
            <div className="text-xs font-semibold text-orange-900">下一步</div>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-5 text-orange-800">
              {report.nextActions.map(action => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ReportStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2">
      <div className="text-lg font-semibold text-stone-950">{value}</div>
      <div className="mt-0.5 text-[11px] text-stone-500">{label}</div>
    </div>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-3">
      <h3 className="text-xs font-semibold text-stone-900">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-xs leading-5 text-stone-600">
        {items.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function EmptyCompareState({ selectedCount }: { selectedCount: number }) {
  return (
    <section className="rounded-xl border border-dashed border-stone-200 bg-white/70 px-5 py-10 text-center">
      <h2 className="text-base font-semibold text-stone-950">
        {selectedCount === 0 ? '还没有选择人物' : '还需要再选一位人物'}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
        在首页人物卡或人物详情页点击“加入对比”，凑齐 2 到 3 位后先看临时对比，再生成可保存的报告。
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link href="/" className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-medium text-white hover:bg-orange-600">
          回到人物列表
        </Link>
        <Link href="/topic/Agent" className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700">
          从 Agent 方向开始
        </Link>
        <Link href="/compare/reports/new" className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700">
          新建报告
        </Link>
      </div>
    </section>
  );
}

function CompareIdentity({ people }: { people: ComparePerson[] }) {
  return (
    <section>
      <SectionTitle title="身份和定位" />
      <div className={compareGridClass(people.length)}>
        {people.map(person => (
          <article key={person.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <Link href={`/person/${person.id}`} className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100">
                {person.avatarUrl ? (
                  <Image src={person.avatarUrl} alt={person.name} fill sizes="56px" className="object-cover object-top" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-orange-500 text-lg font-semibold text-white">
                    {person.name.charAt(0)}
                  </div>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/person/${person.id}`} className="text-base font-semibold text-stone-950 hover:text-orange-600">
                  {person.name}
                </Link>
                <div className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">
                  {person.currentTitle || person.organization[0] || '当前身份整理中'}
                </div>
              </div>
            </div>
            {person.description && (
              <p className="mt-3 line-clamp-3 text-xs leading-5 text-stone-600">{person.description}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function CompareMetrics({ people }: { people: ComparePerson[] }) {
  const rows = [
    { label: '综合影响力', value: (person: ComparePerson) => person.influenceScore.toFixed(1) },
    { label: '论文引用', value: (person: ComparePerson) => formatCompactNumber(person.citationCount) },
    { label: 'H-index', value: (person: ComparePerson) => String(person.hIndex || 0) },
    { label: 'GitHub stars', value: (person: ComparePerson) => formatCompactNumber(person.githubStars) },
    { label: '可信关系', value: (person: ComparePerson) => String(person.relationCount) },
  ];

  return (
    <section>
      <SectionTitle title="影响力来源" />
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {rows.map(row => (
          <div key={row.label} className="grid border-b border-stone-100 last:border-b-0" style={{ gridTemplateColumns: `8rem repeat(${people.length}, minmax(0, 1fr))` }}>
            <div className="bg-stone-50 px-3 py-3 text-xs font-medium text-stone-500">{row.label}</div>
            {people.map(person => (
              <div key={person.id} className="px-3 py-3 text-sm font-semibold text-stone-950">
                {row.value(person)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function CompareTopics({ people }: { people: ComparePerson[] }) {
  return (
    <section>
      <SectionTitle title="话题覆盖" />
      <div className={compareGridClass(people.length)}>
        {people.map(person => (
          <div key={person.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-medium text-stone-900">{person.name}</div>
            <div className="flex flex-wrap gap-1.5">
              {person.topics.slice(0, 8).map(topic => (
                <Link
                  key={topic}
                  href={`/topic/${encodeURIComponent(topic)}`}
                  className="rounded-md bg-stone-50 px-2 py-1 text-xs text-stone-600 ring-1 ring-stone-200 hover:bg-orange-50 hover:text-orange-700 hover:ring-orange-100"
                >
                  {topic}
                  {person.topicRanks?.[topic] ? <span className="ml-1 text-[10px] text-stone-400">#{person.topicRanks[topic]}</span> : null}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CompareProducts({ people }: { people: ComparePerson[] }) {
  return (
    <section>
      <SectionTitle title="代表贡献" />
      <div className={compareGridClass(people.length)}>
        {people.map(person => (
          <div key={person.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-medium text-stone-900">{person.name}</div>
            {person.products.length > 0 ? (
              <div className="space-y-3">
                {person.products.map(product => (
                  <div key={`${person.id}-${product.name}`} className="rounded-lg bg-stone-50 px-3 py-2">
                    <div className="text-xs font-medium text-stone-900">{product.name}</div>
                    <div className="mt-0.5 text-[11px] text-stone-400">{[product.org, product.year].filter(Boolean).join(' · ')}</div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{product.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel text="代表贡献仍在整理中。" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function CompareSources({ people }: { people: ComparePerson[] }) {
  const sourceTypes = ['openalex', 'github', 'youtube', 'exa', 'podcast'];
  const labels: Record<string, string> = {
    openalex: '论文',
    github: '开源',
    youtube: '视频',
    exa: '网页',
    podcast: '播客',
  };

  return (
    <section>
      <SectionTitle title="资料覆盖" />
      <div className={compareGridClass(people.length)}>
        {people.map(person => (
          <div key={person.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-medium text-stone-900">{person.name}</div>
            <div className="space-y-2">
              {sourceTypes.map(type => (
                <div key={type} className="flex items-center justify-between text-xs">
                  <span className="text-stone-500">{labels[type]}</span>
                  <span className="font-medium text-stone-900">{person.sourceCounts[type] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CompareRelations({ people }: { people: ComparePerson[] }) {
  return (
    <section>
      <SectionTitle title="关系网络" />
      <div className={compareGridClass(people.length)}>
        {people.map(person => (
          <div key={person.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-medium text-stone-900">{person.name}</div>
            {person.relations.length > 0 ? (
              <div className="space-y-2">
                {person.relations.map(relation => (
                  <Link
                    key={`${person.id}-${relation.personId}-${relation.relationType}`}
                    href={`/person/${relation.personId}?fromRelation=${encodeURIComponent(relation.relationType)}`}
                    className="block rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 hover:border-orange-200 hover:bg-orange-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-xs font-medium text-stone-900">{relation.personName}</span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-stone-500 ring-1 ring-stone-200">
                        {relationLabel(relation.relationType)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-stone-400">
                      <span>{typeof relation.confidence === 'number' ? `置信度 ${Math.round(relation.confidence * 100)}%` : '置信度待补'}</span>
                      <span>{relation.hasEvidence ? '有证据' : '待补来源'}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyPanel text="暂无已确认关系。" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function CompareActivity({ people }: { people: ComparePerson[] }) {
  return (
    <section>
      <SectionTitle title="最近变化" />
      <div className={compareGridClass(people.length)}>
        {people.map(person => (
          <div key={person.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-medium text-stone-900">{person.name}</div>
            <ActivityEventList
              events={person.latestEvents}
              emptyText="暂无近期动态"
              showPerson={false}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="mb-3 text-base font-semibold text-stone-950">{title}</h2>;
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-200 bg-white/70 px-3 py-5 text-center text-xs text-stone-500">
      {text}
    </div>
  );
}

function compareGridClass(count: number): string {
  if (count >= 3) return 'grid grid-cols-1 gap-4 lg:grid-cols-3';
  return 'grid grid-cols-1 gap-4 md:grid-cols-2';
}

function parsePeopleParam(value: string | null): string[] {
  if (!value) return [];
  return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))].slice(0, 3);
}

function firstParam(value?: string | string[] | null): string | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function formatCompactNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(value || 0);
}

function relationLabel(type: string): string {
  const labels: Record<string, string> = {
    advisor: '导师',
    advisee: '学生',
    cofounder: '联创',
    colleague: '同事',
    former_colleague: '前同事',
    collaborator: '合作者',
    successor: '继任者',
    predecessor: '前任',
  };
  return labels[type] || type;
}

function statusLabel(status: CompareReport['status']): string {
  if (status === 'ready') return '可分享';
  if (status === 'limited') return '有限可信';
  return '待选择';
}

function statusClass(status: CompareReport['status']): string {
  if (status === 'ready') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100';
  if (status === 'limited') return 'bg-amber-50 text-amber-700 ring-1 ring-amber-100';
  return 'bg-stone-50 text-stone-500 ring-1 ring-stone-200';
}

function personReviewStatusLabel(status: string): string {
  if (status === 'ready') return '通过';
  if (status === 'limited') return '可用';
  return '需复核';
}

function personReviewStatusClass(status: string): string {
  if (status === 'ready') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100';
  if (status === 'limited') return 'bg-amber-50 text-amber-700 ring-1 ring-amber-100';
  return 'bg-rose-50 text-rose-700 ring-1 ring-rose-100';
}

function severityClass(severity: CompareReviewSeverity): string {
  if (severity === 'high') return 'bg-rose-50 text-rose-700';
  if (severity === 'medium') return 'bg-amber-50 text-amber-700';
  return 'bg-stone-100 text-stone-600';
}
