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
import type { EntityContentCoverage, EntityFacet, EntityWork, OrganizationRolePerson } from '@/lib/entity-pages';

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
                <Link href={`/person/${work.personId}`} className="text-xs font-medium text-stone-500 hover:text-orange-600">
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
