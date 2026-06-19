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
          <Link href="/" className="font-medium text-stone-500 hover:text-orange-600">AI 人物库</Link>
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

interface CompanyProductPresentation {
  name: string;
  summary: string;
  url?: string;
}

interface CompanyBetPresentation {
  title: string;
  body: string;
}

interface CompanyLearningResource {
  title: string;
  label: string;
  summary: string;
  url: string;
}

interface CompanyOfficialLink {
  title: string;
  summary: string;
  url: string;
}

interface CompanyPresentation {
  headline: string;
  strategy: string;
  products: CompanyProductPresentation[];
  bets: CompanyBetPresentation[];
  learningResources: CompanyLearningResource[];
  officialLinks: CompanyOfficialLink[];
}

const COMPANY_PRESENTATIONS: Record<string, CompanyPresentation> = {
  anthropic: {
    headline: '四条产品线：Claude、开发者平台、Claude Code、企业与云平台；安全研究是贯穿其中的底座。',
    strategy:
      'Anthropic 的 AI 布局可以按四条产品线看：Claude 是面向用户和企业的模型产品，Claude API / Console 是开发者平台，Claude Code 把模型带进真实软件工程循环，企业版与云平台负责规模化分发。安全研究不单独成线，而是决定这些产品能否被组织长期采用的底座。',
    products: [
      {
        name: 'Claude',
        summary: '个人、团队和企业直接使用的模型产品入口，承接 Claude 系列模型能力和日常协作场景。',
        url: 'https://www.anthropic.com/claude',
      },
      {
        name: 'Claude API / Console',
        summary: '开发者把 Claude 接入应用、内部工具和业务流程的入口，是 Anthropic 平台化收入和生态扩展的基础。',
        url: 'https://docs.anthropic.com/',
      },
      {
        name: 'Claude Code',
        summary: '面向真实代码库的 agentic coding CLI，也是 Loop Engineering 在 Anthropic 产品线里最关键的公司样本。',
        url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
      },
      {
        name: 'Claude 企业版与云平台',
        summary: '通过 Claude Enterprise、AWS Bedrock 和 Google Vertex 把模型带进企业采购和云生态，是 API 之外的规模化分发渠道。',
        url: 'https://www.anthropic.com/enterprise',
      },
    ],
    bets: [
      {
        title: '模型能力产品化',
        body: 'Claude 系列模型不只是底层能力，正在通过 Claude、API 和企业入口变成可购买、可集成、可管理的产品。',
      },
      {
        title: '开发者工作流',
        body: 'Claude Code 把模型能力带进终端、仓库、hooks、MCP 和 GitHub Action，是观察 Loop Engineering 的核心窗口。',
      },
      {
        title: '企业与平台',
        body: 'API、Console、合作伙伴和企业场景决定 Anthropic 能否把模型能力扩成稳定业务，而不是停留在单点应用。',
      },
      {
        title: '安全作为产品约束',
        body: '安全研究不是外围品牌叙事，它会影响模型发布节奏、企业采用和开发者平台的可用边界。',
      },
    ],
    learningResources: [
      {
        title: 'Claude Code: Best practices for agentic coding',
        label: 'Claude Code',
        summary: '最值得先读的官方工程文章，讲上下文、计划、验证、工具和迭代，直接解释 Claude Code 为什么适合作为 Loop Engineering 样本。',
        url: 'https://www.anthropic.com/engineering/claude-code-best-practices',
      },
      {
        title: 'Building effective agents',
        label: 'Agent 设计',
        summary: 'Anthropic 对 agent 架构的基础文章，强调简单、可组合、可验证的模式，比单纯追复杂框架更有学习价值。',
        url: 'https://www.anthropic.com/engineering/building-effective-agents',
      },
      {
        title: 'How we built our multi-agent research system',
        label: '多智能体',
        summary: '解释多 agent 并行研究、协调和评估方式，适合用来理解 Anthropic 如何把 agent 能力做成真实系统。',
        url: 'https://www.anthropic.com/engineering/multi-agent-research-system',
      },
      {
        title: 'Writing effective tools for agents',
        label: '工具设计',
        summary: '把工具当成 agent 产品体验的一部分来设计，和 Claude Code 的 hooks、MCP、SDK 有直接关系。',
        url: 'https://www.anthropic.com/engineering/writing-tools-for-agents',
      },
      {
        title: 'Effective context engineering for agents',
        label: '上下文工程',
        summary: '讨论如何给 agent 提供刚好足够的上下文，是理解 Claude Code、长任务和团队工作流的关键材料。',
        url: 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents',
      },
      {
        title: 'Model Context Protocol',
        label: 'MCP',
        summary: '官方介绍 MCP 为什么要把模型和外部工具、数据源连接起来，是理解 Anthropic 平台生态的入口。',
        url: 'https://www.anthropic.com/news/model-context-protocol',
      },
    ],
    officialLinks: [
      {
        title: 'Anthropic Engineering',
        summary: '工程博客，适合看 agent、Claude Code、工具和上下文工程。',
        url: 'https://www.anthropic.com/engineering',
      },
      {
        title: 'Claude Code docs',
        summary: 'Claude Code 产品文档，适合确认功能边界和落地入口。',
        url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
      },
      {
        title: 'Anthropic Docs',
        summary: 'API、模型、工具和平台能力的官方文档入口。',
        url: 'https://docs.anthropic.com/',
      },
      {
        title: 'Anthropic Research',
        summary: '研究发布和安全方向，用来理解公司长期技术边界。',
        url: 'https://www.anthropic.com/research',
      },
    ],
  },
};

export function CompanyOverviewSection({
  organization,
  intelligence,
}: {
  organization: string;
  intelligence: CompanyPageIntelligence;
}) {
  const presentation = getCompanyPresentation(organization, intelligence);
  const products = presentation.products.length > 0 ? presentation.products : intelligence.products;
  const hasOverview = Boolean(presentation.strategy || products.length > 0 || presentation.bets.length > 0);

  return (
    <section>
      <SectionTitle title={`${intelligence.displayName || organization} 在 AI 上怎么布局`} description="先看产品线和战略支点，再看来源依据。" />
      <div className="rounded-xl border border-stone-200 bg-white px-4 py-4 shadow-sm sm:px-5">
        <div>
          <div className="text-xs font-medium text-stone-500">{intelligence.displayName || organization}</div>
          <h2 className="mt-1 text-base font-semibold text-stone-950">
            {presentation.headline || intelligence.positioning || '公司产品线仍在整理中'}
          </h2>
          {presentation.strategy && (
            <p className="mt-2 text-sm leading-6 text-stone-600">{presentation.strategy}</p>
          )}
        </div>

        {hasOverview ? (
          <>
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
          </>
        ) : (
          <EmptyPanel text="公司产品线还没整理到可展示状态。" />
        )}
      </div>
    </section>
  );
}

export function CompanyEvidenceSection({ intelligence }: { intelligence: CompanyPageIntelligence }) {
  const groupedEvidence = groupCompanyEvidence(intelligence.evidence);

  return (
    <section>
      <SectionTitle title="来源与依据" description="这些官方新闻、文档、融资和合作材料用于支撑上面的公司判断。" />
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

export function CompanyLearningSection({
  organization,
  intelligence,
}: {
  organization: string;
  intelligence: CompanyPageIntelligence;
}) {
  const presentation = getCompanyPresentation(organization, intelligence);
  const officialLinks = getCompanyOfficialLinks(organization, intelligence);
  const [primary, ...secondary] = presentation.learningResources;
  if (!primary && officialLinks.length === 0) return null;

  return (
    <section className="rounded-2xl border border-orange-100 bg-orange-50/40 px-4 py-5 sm:px-5">
      <div className="mb-4">
        <div className="text-xs font-semibold text-orange-600">最值得读</div>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-950">官方博客与工程文章</h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-stone-500">
          这里放整页价值密度最高的官方内容：{organization} 自己怎么解释 Claude Code、agent、工具和上下文。先读这一篇，再按需展开。
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
  const presentation = getCompanyPresentation(organization, intelligence);
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

function getCompanyPresentation(organization: string, intelligence: CompanyPageIntelligence): CompanyPresentation {
  const key = getCompanyKey(intelligence.displayName || organization);
  const known = COMPANY_PRESENTATIONS[key];
  if (known) return known;

  return {
    headline: intelligence.positioning || '',
    strategy: intelligence.aiStrategySummary || intelligence.positioning || '',
    products: intelligence.products,
    bets: [],
    learningResources: [],
    officialLinks: [],
  };
}

function getCompanyKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
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
  excludeIds = [],
}: {
  current: OrganizationRolePerson[];
  alumni: OrganizationRolePerson[];
  excludeIds?: string[];
}) {
  const exclude = new Set(excludeIds);
  const restCurrent = current.filter(person => !exclude.has(person.personId));
  const restAlumni = alumni.filter(person => !exclude.has(person.personId));
  if (restCurrent.length === 0 && restAlumni.length === 0) return null;

  return (
    <section>
      <SectionTitle
        title="其他相关人物"
        description="上面关键人物之外，按履历匹配到的在职和已离职成员；低置信度会提示待核。"
      />
      <div className="space-y-5">
        {restCurrent.length > 0 && <RosterGroup label="在职" people={restCurrent} />}
        {restAlumni.length > 0 && <RosterGroup label="已离职 / 前成员" people={restAlumni} />}
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
