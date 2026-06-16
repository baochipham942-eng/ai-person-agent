import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import {
  ActivitySection,
  CoveragePanel,
  EntityHeader,
  EntityPageNav,
  FacetCloud,
  OrganizationRoleSection,
  TopPeopleSection,
  WorksSection,
} from '@/components/entity/EntityPageBlocks';
import { fetchOrganizationPageData } from '@/lib/entity-pages';
import {
  buildDirectoryHref,
  buildOrganizationHref,
} from '@/lib/person-directory-config';

interface OrganizationPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300;

const loadOrganizationPageData = unstable_cache(
  async (organization: string) => fetchOrganizationPageData(organization),
  ['organization-page-data-v2'],
  { revalidate: 300 }
);

export async function generateMetadata({ params }: OrganizationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const organization = decodeRouteParam(slug);

  return {
    title: `${organization} AI 关键人物 | AI 人物库`,
    description: `查看 ${organization} 的 AI 关键人物、履历线索、近期动态和相关技术方向。`,
  };
}

export default async function OrganizationPage({ params }: OrganizationPageProps) {
  const { slug } = await params;
  const organization = decodeRouteParam(slug);
  const data = await loadOrganizationPageData(organization);

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <EntityPageNav currentLabel={`${organization} 机构`} />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6">
        <EntityHeader
          eyebrow="机构情报"
          title={`${organization} AI 关键人物`}
          description={`围绕 ${organization} 汇总当前关键人物、历史履历、近期事件和技术方向，适合追踪团队结构、人才流动和机构影响力。`}
          stats={[
            { label: '相关人物', value: data.totalPeople },
            { label: '当前履历', value: data.currentPeople.length },
            { label: '历史履历', value: data.alumniPeople.length },
            { label: '近期动态', value: data.coverage.metrics.activityCount },
          ]}
          primaryAction={{
            label: '查看完整列表',
            href: buildDirectoryHref({ view: 'organization', organization }),
          }}
          followTarget={{
            type: 'organization',
            id: organization,
            label: organization,
            href: buildOrganizationHref(organization),
          }}
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-8">
            <TopPeopleSection people={data.people} />
            <OrganizationRoleSection
              title="当前关键人物"
              people={data.currentPeople}
              emptyText="当前履历仍在整理中。"
            />
            <OrganizationRoleSection
              title="历史人物与 Alumni"
              people={data.alumniPeople}
              emptyText="历史履历仍在整理中。"
            />
            <ActivitySection events={data.activity} title={`${organization} 最近动态`} />
            <WorksSection works={data.works} />
          </div>

          <aside className="space-y-8">
            <CoveragePanel coverage={data.coverage} />
            <FacetCloud
              title="相关话题"
              description="按相关人物的技术标签统计。"
              facets={data.relatedTopics}
              type="topic"
            />
            <section className="rounded-xl border border-stone-200 bg-white p-4 text-xs leading-5 text-stone-500 shadow-sm">
              <div className="mb-2 text-sm font-medium text-stone-900">匹配口径</div>
              <p>机构匹配会同时参考机构别名、人物简介、当前职位和履历表。显示待核时，说明来源置信度还不够高。</p>
              {data.aliases.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {data.aliases.slice(0, 6).map(alias => (
                    <span key={alias} className="rounded-md bg-stone-50 px-1.5 py-0.5 text-[10px] text-stone-500 ring-1 ring-stone-200">
                      {alias}
                    </span>
                  ))}
                </div>
              )}
              <Link
                href={buildDirectoryHref({ view: 'organization', organization, sortBy: 'weeklyViewCount' })}
                prefetch={false}
                className="mt-3 inline-flex font-medium text-orange-600 hover:text-orange-700"
              >
                按最近热度查看
              </Link>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function decodeRouteParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
