import type { ReactNode } from 'react';
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
  CompanyArticleItem,
  CompanyEvidenceItem,
  CompanyEvidenceRole,
  CompanyPageIntelligence,
  CompanyThreadLink,
  EntityContentCoverage,
  EntityFacet,
  EntityWork,
  OrganizationRolePerson,
} from '@/lib/entity-pages';
import {
  resolveCompanyPresentation,
  type CompanyLearningResource,
  type CompanyOfficialLink,
} from '@/lib/entity-presentations/company-presentation';

interface EntityNavProps {
  label: string;
  href?: string;
}

interface EntityHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  logoUrl?: string | null;
  logoAlt?: string;
  metaItems?: Array<{ label: string; value: string }>;
  stats: Array<{ label: string; value: string | number }>;
  primaryAction?: EntityNavProps;
  followTarget?: WatchTarget;
}

export function EntityPageNav({
  currentLabel,
  sectionLabel,
  sectionHref,
}: {
  currentLabel: string;
  sectionLabel?: string;
  sectionHref?: string;
}) {
  return (
    <>
      <SiteHeader current={null} maxWidth="6xl" />
      <div className="border-b border-stone-100 bg-white/70">
        <div className="mx-auto flex max-w-6xl items-center gap-1.5 px-4 py-2 text-xs text-stone-400 sm:px-6">
          <Link href="/" prefetch={false} className="font-medium text-stone-500 hover:text-orange-600">AI 人物库</Link>
          {sectionLabel && (
            <>
              <span>/</span>
              {sectionHref ? (
                <Link href={sectionHref} prefetch={false} className="font-medium text-stone-500 hover:text-orange-600">
                  {sectionLabel}
                </Link>
              ) : (
                <span>{sectionLabel}</span>
              )}
            </>
          )}
          <span>/</span>
          <span className="truncate text-stone-500">{currentLabel}</span>
        </div>
      </div>
    </>
  );
}

export function EntityHeader({
  eyebrow,
  title,
  description,
  logoUrl,
  logoAlt,
  metaItems = [],
  stats,
  primaryAction,
  followTarget,
}: EntityHeaderProps) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white px-5 py-5 shadow-sm sm:px-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <EntityLogo title={title} logoUrl={logoUrl} alt={logoAlt || `${title} logo`} />
          <div className="min-w-0 max-w-3xl">
            <div className="mb-2 text-xs font-medium text-orange-600">{eyebrow}</div>
            <h1 className="text-2xl font-semibold tracking-normal text-stone-950 sm:text-3xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">{description}</p>
            {metaItems.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {metaItems.map(item => (
                  <span key={`${item.label}:${item.value}`} className="rounded-md bg-stone-50 px-2 py-1 text-[11px] font-medium text-stone-500 ring-1 ring-stone-200">
                    {item.label}: <span className="text-stone-800">{item.value}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:pt-1">
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

function EntityLogo({ title, logoUrl, alt }: { title: string; logoUrl?: string | null; alt: string }) {
  return (
    <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-200 bg-stone-50 shadow-sm">
      {logoUrl ? (
        <Image src={logoUrl} alt={alt} fill sizes="64px" className="object-contain p-2" />
      ) : (
        <span className="text-xl font-semibold text-stone-700">{title.trim().charAt(0).toUpperCase()}</span>
      )}
    </div>
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
  const presentation = resolveCompanyPresentation(organization, intelligence);
  const products = presentation.products.length > 0 ? presentation.products : intelligence.products;
  const headline = presentation.headline || intelligence.positioning;
  // 真的没内容（无标题/无战略/无产品线）就不渲染这个模块，而不是显示「整理中」占位。
  if (!headline && !presentation.strategy && products.length === 0) return null;

  return (
    <section>
      <SectionTitle title={`${intelligence.displayName || organization} 在 AI 上怎么布局`} description="先看产品线和战略支点，再看来源依据。" />
      <div className="rounded-xl border border-stone-200 bg-white px-4 py-4 shadow-sm sm:px-5">
        <div>
          <div className="text-xs font-medium text-stone-500">{intelligence.displayName || organization}</div>
          {headline && <h2 className="mt-1 text-base font-semibold text-stone-950">{headline}</h2>}
          {presentation.strategy && (
            <p className="mt-2 text-sm leading-6 text-stone-600">{presentation.strategy}</p>
          )}
        </div>

        {products.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-xs font-medium text-stone-500">核心产品线</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {products.map(product => (
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
          </div>
        )}
      </div>
    </section>
  );
}

export function CompanyEvidenceSection({ intelligence }: { intelligence: CompanyPageIntelligence }) {
  const groupedEvidence = groupCompanyEvidence(intelligence.evidence);
  // 没有公司级证据就不渲染这个模块（不展示空占位）。
  if (groupedEvidence.length === 0) return null;

  return (
    <section>
      <SectionTitle title="来源与依据" description="这些官方新闻、文档、融资和合作材料用于支撑上面的公司判断。" />
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
    </section>
  );
}

function normalizeArticleUrl(url: string): string {
  return url.trim().replace(/[#?].*$/, '').replace(/\/+$/, '').toLowerCase();
}

// 合并「手工策展的精选文章」和「抓取入库的官方博客」：策展条目优先且去重，
// 抓取的博客补在后面，供「官方博客与工程文章」区块完整展示，并驱动 hero 的「官方好文」计数。
export function buildCompanyArticleSections(
  organization: string,
  intelligence: CompanyPageIntelligence
): { curated: CompanyLearningResource[]; moreArticles: CompanyArticleItem[]; totalCount: number } {
  const presentation = resolveCompanyPresentation(organization, intelligence);
  const curated = presentation.learningResources;
  const seen = new Set(curated.map(resource => normalizeArticleUrl(resource.url)));
  const moreArticles: CompanyArticleItem[] = [];
  for (const article of intelligence.officialArticles) {
    if (!article.url || !article.title) continue;
    const key = normalizeArticleUrl(article.url);
    if (seen.has(key)) continue;
    seen.add(key);
    moreArticles.push(article);
  }
  return { curated, moreArticles, totalCount: seen.size };
}

export function CompanyLearningSection({
  organization,
  intelligence,
}: {
  organization: string;
  intelligence: CompanyPageIntelligence;
}) {
  const officialLinks = getCompanyOfficialLinks(organization, intelligence);
  const { curated, moreArticles } = buildCompanyArticleSections(organization, intelligence);
  const [primary, ...secondary] = curated;
  const displayMore = moreArticles.slice(0, 30);
  if (!primary && officialLinks.length === 0 && displayMore.length === 0) return null;

  return (
    <section className="rounded-2xl border border-orange-100 bg-orange-50/40 px-4 py-5 sm:px-5">
      <div className="mb-4">
        <div className="text-xs font-semibold text-orange-600">最值得读</div>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-950">官方博客与工程文章</h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-stone-500">
          这里放整页价值密度最高的官方内容：{organization} 自己怎么解释产品、模型、工具和工作流。先读这一篇，再按需展开。
        </p>
      </div>
      {officialLinks.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-stone-500">官方入口</span>
          {officialLinks.map(link => (
            <a
              key={link.title}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              title={link.summary}
              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
            >
              {link.title}
              <span className="text-[10px] text-stone-400">↗</span>
            </a>
          ))}
        </div>
      )}

      {primary && (
        <a
          href={primary.url}
          target="_blank"
          rel="noreferrer"
          className="block rounded-xl border border-stone-200 bg-white px-5 py-5 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50/40"
        >
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">先读这篇</span>
            <span className="text-xs font-semibold text-orange-600">{primary.label}</span>
          </div>
          <h3 className="mt-2 text-lg font-semibold leading-7 text-stone-950 sm:text-xl">{primary.title}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{primary.summary}</p>
          <div className="mt-4 inline-flex text-xs font-medium text-orange-600">打开官方文章 →</div>
        </a>
      )}

      {secondary.length > 0 && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {secondary.map(resource => (
            <a
              key={resource.title}
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col rounded-lg border border-stone-100 bg-white px-3 py-3 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50/40"
            >
              <div className="text-[11px] font-semibold text-orange-600">{resource.label}</div>
              <h4 className="mt-2 text-sm font-semibold leading-5 text-stone-950">{resource.title}</h4>
              <p className="mt-1 text-xs leading-5 text-stone-500">{resource.summary}</p>
            </a>
          ))}
        </div>
      )}

      {displayMore.length > 0 && (
        <div className="mt-5 border-t border-orange-100 pt-4">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold text-stone-600">更多官方文章</span>
            <span className="text-[11px] text-stone-400">抓取入库，共 {moreArticles.length} 篇</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {displayMore.map(article => (
              <a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noreferrer"
                title={article.summary || article.title}
                className="flex flex-col rounded-lg border border-stone-100 bg-white px-3 py-2.5 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50/40"
              >
                <h4 className="line-clamp-2 text-xs font-semibold leading-5 text-stone-900">{article.title}</h4>
                {article.publishedAt && (
                  <span className="mt-1 text-[10px] text-stone-400">{article.publishedAt}</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function RelatedThreadsSection({
  threads,
  topics = [],
}: {
  threads: CompanyThreadLink[];
  topics?: EntityFacet[];
}) {
  const hasThreads = threads.length > 0;
  const hasTopics = topics.length > 0;
  // 主题和话题都没有就不渲染这个模块（不展示空占位）。
  if (!hasThreads && !hasTopics) return null;

  return (
    <section>
      <SectionTitle
        title="相关主题与话题"
        description="主题页解释产品线为什么重要；话题标签用于继续探索，不作为公司判断的主证据。"
      />
      <div className="rounded-xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
        {hasThreads ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {threads.map(thread => (
              <Link
                key={thread.slug}
                href={`/threads/${thread.slug}`}
                prefetch={false}
                className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-3 transition-colors hover:border-orange-200 hover:bg-orange-50/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-sm font-semibold text-stone-950">{thread.title}</h2>
                  <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-stone-500 ring-1 ring-stone-100">
                    {COMPANY_THREAD_RELATION_LABELS[thread.relationType]}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-stone-500">{displayCompanyThreadSummary(thread)}</p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyPanel text="相关知识线程尚未关联。公司页会先保留空态，不把技术主题页反向改成 ready。" />
        )}

        {hasTopics && (
          <div className={hasThreads ? 'mt-4 border-t border-stone-100 pt-4' : undefined}>
            <div className="mb-2 text-xs font-medium text-stone-500">相关话题</div>
            <div className="flex flex-wrap gap-2">
              {topics.map(topic => (
                <Link
                  key={topic.label}
                  href={buildTopicHref(topic.label)}
                  prefetch={false}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                >
                  <span>{topic.label}</span>
                  <span className="text-[10px] text-stone-400">{topic.count}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function getCompanyOfficialLinks(organization: string, intelligence: CompanyPageIntelligence): CompanyOfficialLink[] {
  const presentation = resolveCompanyPresentation(organization, intelligence);
  if (presentation.officialLinks.length > 0) return presentation.officialLinks;
  return intelligence.homepageUrl
    ? [{ title: `${intelligence.displayName || organization} 官网`, summary: '公司官方入口。', url: intelligence.homepageUrl }]
    : [];
}

export function CompanyOfficialLinksPanel({
  organization,
  intelligence,
}: {
  organization: string;
  intelligence: CompanyPageIntelligence;
}) {
  const links = getCompanyOfficialLinks(organization, intelligence);
  if (links.length === 0) return null;

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 text-xs leading-5 text-stone-500 shadow-sm">
      <h2 className="text-sm font-medium text-stone-950">官方入口</h2>
      <div className="mt-3 space-y-2">
        {links.map(link => (
          <a
            key={link.title}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-stone-100 bg-stone-50 px-3 py-3 transition-colors hover:border-orange-200 hover:bg-orange-50/70"
          >
            <div className="font-medium text-stone-900">{link.title}</div>
            <p className="mt-1">{link.summary}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
export const TOP_PEOPLE_LIMIT = 9;

export function TopPeopleSection({
  people,
  description = '按综合影响力排序，保留来源和话题线索。',
}: {
  people: DirectoryPerson[];
  description?: string;
}) {
  if (people.length === 0) {
    return <EmptyPanel text="这个入口下还没有可展示的人物。" />;
  }

  return (
    <section>
      <SectionTitle title="关键人物" description={description} />
      <SharedSvgDefs />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {people.slice(0, TOP_PEOPLE_LIMIT).map((person, index) => (
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
          {displayCompanySourceType(item.sourceType)}
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
      <p className="mt-1 text-xs leading-5 text-stone-500">{displayCompanyEvidenceSummary(item)}</p>
    </div>
  );
}

function displayCompanyThreadSummary(thread: CompanyThreadLink): string {
  if (thread.slug === 'loop-engineering') {
    return 'Claude Code 是 Anthropic 把模型能力带进真实开发循环的入口，和 Loop Engineering 强相关。';
  }
  if (thread.slug === 'agentic-coding') {
    return 'Agentic Coding 用来解释 Claude Code 为什么不只是代码生成，而是进入仓库、工具和验证流程。';
  }
  if (hasCjkText(thread.summary)) return thread.summary;
  return '这个主题用于解释公司产品线背后的技术方向和使用场景。';
}

function displayCompanyEvidenceSummary(item: CompanyEvidenceItem): string {
  const title = item.title.toLowerCase();
  if (item.role === 'official_strategy') {
    return '官方新闻和公告用于确认公司战略、模型发布节奏和产品方向。';
  }
  if (item.role === 'product_release') {
    if (title.includes('claude code')) {
      return '这条材料确认 Claude Code 在 Anthropic 产品线里的位置，也是连接 Loop Engineering 的关键来源。';
    }
    if (title.includes('claude 4')) {
      return '这条材料用于确认 Claude 模型能力和产品发布节奏。';
    }
    return '产品发布材料用于确认公司把模型能力包装成了哪些可用产品。';
  }
  if (item.role === 'financial_signal') {
    return '融资和财务信号只用于公司页判断资源投入，不作为技术主题页的必备证据。';
  }
  if (item.role === 'partnership_signal') {
    return '合作材料用于观察训练、部署、渠道或企业落地资源。';
  }
  if (item.role === 'hiring_team_signal') {
    return '招聘和团队材料用于观察公司正在补强哪些能力。';
  }
  if (hasCjkText(item.summary)) return item.summary;
  return '这条来源用于支撑公司页判断，发布前可继续回到原文复核细节。';
}

function displayCompanySourceType(sourceType: string): string {
  const labels: Record<string, string> = {
    newsroom_index: '官方新闻',
    newsroom_article: '官方文章',
    product_docs: '产品文档',
    product_changelog: '发布记录',
    careers_page: '招聘页',
  };
  return labels[sourceType] || sourceType.replace(/_/g, ' ');
}

function hasCjkText(value: string | null | undefined): boolean {
  return Boolean(value && /[\u3400-\u9fff]/.test(value));
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

export function OrganizationRosterSection({
  current,
  alumni,
  others = [],
  excludeIds = [],
}: {
  current: OrganizationRolePerson[];
  alumni: OrganizationRolePerson[];
  // 仅靠 People.organization[] 关联、没有履历(PersonRole)记录的相关成员，
  // 在职 / 离职无法判定，单独成组诚实展示，避免他们整个从公司页消失。
  others?: OrganizationRolePerson[];
  excludeIds?: string[];
}) {
  const exclude = new Set(excludeIds);
  const restCurrent = current.filter(person => !exclude.has(person.personId));
  const restAlumni = alumni.filter(person => !exclude.has(person.personId));
  const shown = new Set([...restCurrent, ...restAlumni].map(person => person.personId));
  const restOthers = others.filter(person => !exclude.has(person.personId) && !shown.has(person.personId));
  if (restCurrent.length === 0 && restAlumni.length === 0 && restOthers.length === 0) return null;

  return (
    <section>
      <SectionTitle
        title="其他相关人物"
        description="上面关键人物之外，按履历匹配到的在职和已离职成员；低置信度会提示待核。"
      />
      <div className="space-y-5">
        {restCurrent.length > 0 && <RosterGroup label="在职" people={restCurrent} />}
        {restAlumni.length > 0 && <RosterGroup label="已离职 / 前成员" people={restAlumni} />}
        {restOthers.length > 0 && <RosterGroup label="相关成员（履历待补全）" people={restOthers} />}
      </div>
    </section>
  );
}

function RosterGroup({ label, people }: { label: string; people: OrganizationRolePerson[] }) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-stone-500">{label}</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {people.map(person => (
          <PersonRosterRow key={person.personId} person={person} />
        ))}
      </div>
    </div>
  );
}

function PersonRosterRow({ person }: { person: OrganizationRolePerson }) {
  return (
    <Link
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
      <div className="text-right text-[11px] text-stone-400">{formatYears(person.startYear, person.endYear)}</div>
    </Link>
  );
}

export function ReferenceTier({ children }: { children: ReactNode }) {
  return (
    <section className="mt-4 border-t border-stone-200 pt-8">
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-stone-500">参考与来源</h2>
        <p className="mt-1 text-xs leading-5 text-stone-400">
          下面是支撑上方判断的证据、相关主题和近期动态，给需要核对来源的读者，按需展开。
        </p>
      </div>
      <div className="space-y-8">{children}</div>
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
