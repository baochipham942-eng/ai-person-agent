import Image from 'next/image';
import Link from 'next/link';
import { ActivityEventList } from '@/components/activity/ActivityEventList';
import { FollowButton } from '@/components/common/FollowButton';
import { SiteHeader } from '@/components/common/SiteHeader';
import { ResearcherCard, SharedSvgDefs } from '@/components/home/ResearcherCard';
import type { ActivityEvent } from '@/lib/activity';
import type { WatchTarget } from '@/lib/watchlist';
import type { DirectoryPerson } from '@/lib/person-directory-config';
import {
  buildOrganizationHref,
  buildTopicHref,
} from '@/lib/person-directory-config';
import type {
  CompanyEvidenceItem,
  CompanyEvidenceRole,
  CompanyPageIntelligence,
  CompanyThreadLink,
  EntityContentCoverage,
  EntityFacet,
  EntityWork,
  OrganizationRolePerson,
} from '@/lib/entity-pages';

interface EntityNavProps {
  label: string;
  href?: string;
}

interface EntityHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  stats: Array<{ label: string; value: string | number }>;
  primaryAction?: EntityNavProps;
  followTarget?: WatchTarget;
}

export function EntityPageNav({ currentLabel }: { currentLabel: string }) {
  return (
    <>
      <SiteHeader current="home" maxWidth="6xl" />
      <div className="border-b border-stone-100 bg-white/70">
        <div className="mx-auto max-w-6xl px-4 py-2 text-xs text-stone-400 sm:px-6">
          {currentLabel}
        </div>
      </div>
    </>
  );
}

export function EntityHeader({ eyebrow, title, description, stats, primaryAction, followTarget }: EntityHeaderProps) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white px-5 py-6 shadow-sm sm:px-7 sm:py-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-2 text-xs font-medium text-orange-600">{eyebrow}</div>
          <h1 className="text-2xl font-semibold tracking-normal text-stone-950 sm:text-3xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {followTarget && <FollowButton target={followTarget} />}
          {primaryAction && (
            <Link
              href={primaryAction.href || '/'}
              prefetch={false}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-stone-900 px-3 text-xs font-medium text-white transition-colors hover:bg-orange-600"
            >
              {primaryAction.label}
            </Link>
          )}
        </div>
      </div>

      {stats.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(stat => (
            <div key={stat.label} className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2">
              <div className="text-lg font-semibold text-stone-950">{stat.value}</div>
              <div className="mt-0.5 text-[11px] text-stone-500">{stat.label}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-stone-950">{title}</h2>
        {description && <p className="mt-1 text-xs leading-5 text-stone-500">{description}</p>}
      </div>
    </div>
  );
}

const COMPANY_EVIDENCE_ROLE_LABELS: Record<CompanyEvidenceRole, string> = {
  official_strategy: '官方策略',
  product_release: '产品发布',
  financial_signal: '融资/财务信号',
  partnership_signal: '合作信号',
  hiring_team_signal: '团队信号',
};

const COMPANY_THREAD_RELATION_LABELS: Record<CompanyThreadLink['relationType'], string> = {
  invests_in: '投入',
  productizes: '产品化',
  researches: '研究',
  platform_for: '平台支撑',
};

export function CompanyOverviewSection({
  organization,
  intelligence,
}: {
  organization: string;
  intelligence: CompanyPageIntelligence;
}) {
  const hasOverview = Boolean(intelligence.positioning || intelligence.aiStrategySummary || intelligence.products.length > 0);

  return (
    <section>
      <SectionTitle title="公司 AI 概览" description="只展示公司级来源整理出的策略、产品和覆盖状态。" />
      <div className="rounded-xl border border-stone-200 bg-white px-4 py-4 shadow-sm sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-medium text-stone-500">{organization}</div>
            <h2 className="mt-1 text-base font-semibold text-stone-950">
              {intelligence.positioning || '公司级证据尚未入库'}
            </h2>
          </div>
          <CompanySourceModePill intelligence={intelligence} />
        </div>

        {hasOverview ? (
          <>
            {intelligence.aiStrategySummary && (
              <p className="mt-3 text-sm leading-6 text-stone-700">{intelligence.aiStrategySummary}</p>
            )}
            {intelligence.products.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {intelligence.products.map(product => (
                  <article key={product.name} className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-3">
                    {product.url ? (
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-stone-950 hover:text-orange-600"
                      >
                        {product.name}
                      </a>
                    ) : (
                      <div className="text-sm font-semibold text-stone-950">{product.name}</div>
                    )}
                    <p className="mt-1 text-xs leading-5 text-stone-500">{product.summary}</p>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : (
          <EmptyPanel text="公司级证据尚未入库。当前页保留人物、履历和动态聚合，但不会把这些内容标成公司证据。" />
        )}

        <p className="mt-3 border-t border-stone-100 pt-3 text-xs leading-5 text-stone-500">
          {intelligence.sourceNote}
        </p>
      </div>
    </section>
  );
}

export function CompanyEvidenceSection({ intelligence }: { intelligence: CompanyPageIntelligence }) {
  const groupedEvidence = groupCompanyEvidence(intelligence.evidence);

  return (
    <section>
      <SectionTitle title="公司级证据" description="财报、IR、产品发布、融资和合作材料只在公司页承担证据角色。" />
      {intelligence.evidence.length > 0 ? (
        <div className="space-y-3">
          {groupedEvidence.map(group => (
            <article key={group.role} className="rounded-xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-stone-950">{COMPANY_EVIDENCE_ROLE_LABELS[group.role]}</h2>
                <span className="text-xs font-medium text-stone-400">{group.items.length}</span>
              </div>
              <div className="divide-y divide-stone-100">
                {group.items.map(item => (
                  <CompanyEvidenceRow key={item.id} item={item} />
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyPanel text="公司级证据尚未入库。不会用人物动态、论文、项目或履历记录顶替公司证据。" />
      )}
    </section>
  );
}

export function RelatedThreadsSection({ threads }: { threads: CompanyThreadLink[] }) {
  return (
    <section>
      <SectionTitle title="相关知识线程" description="公司策略和产品线可以回链知识线程，但不把财报材料放进技术主题 readiness。" />
      {threads.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {threads.map(thread => (
            <Link
              key={thread.slug}
              href={`/threads/${thread.slug}`}
              prefetch={false}
              className="rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50/40"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold text-stone-950">{thread.title}</h2>
                <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500">
                  {COMPANY_THREAD_RELATION_LABELS[thread.relationType]}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-stone-500">{thread.summary}</p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyPanel text="相关知识线程尚未关联。公司页会先保留空态，不把技术主题页反向改成 ready。" />
      )}
    </section>
  );
}

export function TopPeopleSection({ people }: { people: DirectoryPerson[] }) {
  if (people.length === 0) {
    return <EmptyPanel text="这个入口下还没有可展示的人物。" />;
  }

  return (
    <section>
      <SectionTitle title="关键人物" description="按综合影响力排序，保留来源和话题线索。" />
      <SharedSvgDefs />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {people.slice(0, 9).map((person, index) => (
          <ResearcherCard
            key={person.id}
            person={person}
            rank={index + 1}
            sortBy="influenceScore"
          />
        ))}
      </div>
    </section>
  );
}

export function ActivitySection({ events, title = '最近动态' }: { events: ActivityEvent[]; title?: string }) {
  return (
    <section>
      <SectionTitle title={title} description="来自论文、开源、视频、文章等来源的近期变化。" />
      <ActivityEventList events={events} emptyText="暂时没有近期动态" showPerson />
    </section>
  );
}

export function WorksSection({ works }: { works: EntityWork[] }) {
  return (
    <section>
      <SectionTitle title="代表论文与项目" description="优先展示可回到原始来源的论文和开源项目。" />
      {works.length > 0 ? (
        <div className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          {works.map(work => (
            <article key={work.id} className="px-4 py-3 transition-colors hover:bg-orange-50/40">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
                  {work.sourceLabel}
                </span>
                {work.publishedAt && <span className="text-[10px] text-stone-400">{formatDate(work.publishedAt)}</span>}
                {work.metricLabel && <span className="text-[10px] text-stone-400">{work.metricLabel}</span>}
              </div>
              <a
                href={work.url}
                target="_blank"
                rel="noreferrer"
                className="line-clamp-2 text-sm font-medium leading-5 text-stone-900 hover:text-orange-600"
              >
                {work.title}
              </a>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Link href={`/person/${work.personId}`} prefetch={false} className="text-xs font-medium text-stone-500 hover:text-orange-600">
                  {work.personName}
                </Link>
                {work.summary && <p className="line-clamp-1 text-xs text-stone-400">{work.summary}</p>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyPanel text="还没有足够稳定的论文或项目来源。" />
      )}
    </section>
  );
}

export function FacetCloud({
  title,
  description,
  facets,
  type,
}: {
  title: string;
  description?: string;
  facets: EntityFacet[];
  type: 'topic' | 'organization';
}) {
  return (
    <section>
      <SectionTitle title={title} description={description} />
      {facets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {facets.map(facet => (
            <Link
              key={facet.label}
              href={type === 'topic' ? buildTopicHref(facet.label) : buildOrganizationHref(facet.label)}
              prefetch={false}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-600 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
            >
              <span>{facet.label}</span>
              <span className="text-[10px] text-stone-400">{facet.count}</span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyPanel text="相关条目还在整理中。" />
      )}
    </section>
  );
}

export function CoveragePanel({ coverage }: { coverage: EntityContentCoverage }) {
  const isReady = coverage.status === 'ready';
  return (
    <section className={`rounded-xl border p-4 text-xs leading-5 shadow-sm ${
      isReady
        ? 'border-emerald-100 bg-emerald-50/70 text-emerald-800'
        : 'border-amber-100 bg-amber-50/80 text-amber-800'
    }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className={`text-sm font-medium ${isReady ? 'text-emerald-950' : 'text-amber-950'}`}>内容覆盖</h2>
        <span className={`rounded-md px-1.5 py-0.5 text-[10px] ring-1 ${
          isReady
            ? 'bg-white/70 text-emerald-700 ring-emerald-100'
            : 'bg-white/70 text-amber-700 ring-amber-100'
        }`}
        >
          {isReady ? '达标' : '补强中'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <CoverageMetric label="人物" current={coverage.metrics.peopleCount} target={coverage.thresholds.people} />
        <CoverageMetric label="动态" current={coverage.metrics.activityCount} target={coverage.thresholds.activity} />
        <CoverageMetric label="作品" current={coverage.metrics.workCount} target={coverage.thresholds.works} />
      </div>
      <p className="mt-3">
        {isReady
          ? '人物、动态和代表作品覆盖已达到当前入口门槛。'
          : '当前入口仍在补强，默认优先展示已有来源和可验证内容。'}
      </p>
      {coverage.missing.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {coverage.missing.map(item => (
            <span key={item.key} className="rounded-md bg-white/70 px-1.5 py-0.5 text-[10px] ring-1 ring-amber-100">
              {item.detail}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function CompanyEvidenceRow({ item }: { item: CompanyEvidenceItem }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
          {item.sourceType}
        </span>
        {item.publishedAt && <span className="text-[10px] text-stone-400">{formatDate(item.publishedAt)}</span>}
        <span className="text-[10px] text-stone-400">{Math.round(item.confidence * 100)}%</span>
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="mt-1 block text-sm font-medium leading-5 text-stone-950 hover:text-orange-600"
      >
        {item.title}
      </a>
      <p className="mt-1 text-xs leading-5 text-stone-500">{item.summary}</p>
    </div>
  );
}

function CompanySourceModePill({ intelligence }: { intelligence: CompanyPageIntelligence }) {
  const isFixture = intelligence.sourceMode === 'fixture';
  return (
    <span className={`w-fit rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-normal ring-1 ${
      isFixture
        ? 'bg-blue-50 text-blue-700 ring-blue-100'
        : 'bg-amber-50 text-amber-700 ring-amber-100'
    }`}
    >
      {isFixture ? 'dev fixture' : 'not ingested'}
    </span>
  );
}

function groupCompanyEvidence(evidence: CompanyEvidenceItem[]): Array<{ role: CompanyEvidenceRole; items: CompanyEvidenceItem[] }> {
  const order: CompanyEvidenceRole[] = [
    'official_strategy',
    'product_release',
    'financial_signal',
    'partnership_signal',
    'hiring_team_signal',
  ];

  return order
    .map(role => ({
      role,
      items: evidence.filter(item => item.role === role),
    }))
    .filter(group => group.items.length > 0);
}

function CoverageMetric({ label, current, target }: { label: string; current: number; target: number }) {
  const ready = current >= target;
  return (
    <div className="rounded-lg bg-white/70 px-2 py-2 ring-1 ring-black/5">
      <div className="text-sm font-semibold text-stone-950">{current}</div>
      <div className="mt-0.5 text-[10px] text-stone-500">{label}</div>
      <div className={`mt-0.5 text-[10px] ${ready ? 'text-emerald-700' : 'text-amber-700'}`}>
        目标 {target}
      </div>
    </div>
  );
}

export function OrganizationRoleSection({
  title,
  people,
  emptyText,
}: {
  title: string;
  people: OrganizationRolePerson[];
  emptyText: string;
}) {
  return (
    <section>
      <SectionTitle title={title} description="基于履历表和机构别名匹配，低置信度会提示待核。" />
      {people.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {people.map(person => (
            <Link
              key={person.personId}
              href={`/person/${person.personId}`}
              prefetch={false}
              className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-3 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50/50"
            >
              <Avatar name={person.name} avatarUrl={person.avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-stone-900">{person.name}</span>
                  {person.confidence !== null && person.confidence < 0.75 && (
                    <span className="rounded-md border border-amber-100 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">
                      待核
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-xs text-stone-500">{person.role}</div>
                {person.currentTitle && <div className="mt-0.5 truncate text-[11px] text-stone-400">{person.currentTitle}</div>}
              </div>
              <div className="text-right text-[11px] text-stone-400">
                {formatYears(person.startYear, person.endYear)}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyPanel text={emptyText} />
      )}
    </section>
  );
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100">
      {avatarUrl ? (
        <Image src={avatarUrl} alt={name} fill sizes="40px" className="object-cover object-top" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-orange-500 text-sm font-semibold text-white">
          {name.charAt(0)}
        </div>
      )}
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-200 bg-white/70 px-4 py-6 text-center text-xs text-stone-500">
      {text}
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return '最近';
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  } catch {
    return '最近';
  }
}

function formatYears(startYear: string | null, endYear: string | null): string {
  if (!startYear && !endYear) return '';
  return `${startYear || '?'}-${endYear || '至今'}`;
}
