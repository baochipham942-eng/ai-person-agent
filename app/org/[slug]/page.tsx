import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import {
  ActivitySection,
  CompanyEvidenceSection,
  CompanyLearningSection,
  CompanyOverviewSection,
  EntityHeader,
  EntityPageNav,
  OrganizationRosterSection,
  ReferenceTier,
  RelatedThreadsSection,
  TOP_PEOPLE_LIMIT,
  TopPeopleSection,
  WorksSection,
} from '@/components/entity/EntityPageBlocks';
import { buildEmptyCompanyIntelligence, fetchOrganizationPageData } from '@/lib/entity-pages';
import { resolveCompanyPresentation } from '@/lib/entity-presentations/company-presentation';
import {
  buildDirectoryHref,
  buildOrganizationHref,
  type DirectoryPerson,
} from '@/lib/person-directory-config';

interface OrganizationPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300;

const loadOrganizationPageData = unstable_cache(
  async (organization: string) => fetchOrganizationPageData(organization),
  ['organization-page-data-v6'],
  { revalidate: 300 }
);

export async function generateMetadata({ params }: OrganizationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const organization = decodeRouteParam(slug);

  return {
    title: `${organization} 公司页 | AI 人物库`,
    description: `查看 ${organization} 的 AI 产品线、相关技术主题、公司来源和关键人物。`,
  };
}

export default async function OrganizationPage({ params }: OrganizationPageProps) {
  const { slug } = await params;
  const organization = decodeRouteParam(slug);
  const data = await loadOrganizationPageData(organization);
  const companyIntelligence = data.companyIntelligence ?? buildEmptyCompanyIntelligence();
  const displayName = companyIntelligence.displayName || organization;
  const presentation = resolveCompanyPresentation(displayName, companyIntelligence);
  const coreProductCount = presentation.products.length;
  const learningResourceCount = presentation.learningResources.length;
  const rankedPeople = rankPeopleForCompany(data.people, presentation.flagshipKeywords);
  // DB intelligence 优先；没有时回退到公司 seed 里的 logo / 官网。
  const logoUrl = companyIntelligence.logoUrl ?? presentation.logoUrl ?? null;
  const homepageUrl = companyIntelligence.homepageUrl ?? presentation.homepageUrl ?? null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <EntityPageNav
        sectionLabel="公司"
        sectionHref={buildDirectoryHref({ view: 'organization' })}
        currentLabel={displayName}
      />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6">
        <EntityHeader
          eyebrow="公司详情"
          title={displayName}
          logoUrl={logoUrl}
          logoAlt={`${displayName} logo`}
          description={presentation.heroDescription}
          metaItems={[
            homepageUrl ? { label: '官网', value: homepageUrl.replace(/^https?:\/\//, '') } : null,
          ].filter((item): item is { label: string; value: string } => Boolean(item))}
          stats={[
            { label: '关键人物', value: data.people.length },
            { label: '核心产品', value: coreProductCount },
            { label: '官方好文', value: learningResourceCount },
            { label: '来源材料', value: companyIntelligence.coverage.evidenceCount },
          ]}
          primaryAction={{
            label: '相关人物',
            href: buildDirectoryHref({ view: 'organization', organization: displayName }),
          }}
          followTarget={{
            type: 'organization',
            id: organization,
            label: displayName,
            href: buildOrganizationHref(organization),
          }}
        />

        {/* 主阅读带：做什么 → 该读什么 → 谁在做 */}
        <div className="space-y-8">
          <CompanyOverviewSection organization={displayName} intelligence={companyIntelligence} />
          <CompanyLearningSection organization={displayName} intelligence={companyIntelligence} />
          {rankedPeople.length > 0 && (
            <TopPeopleSection
              people={rankedPeople}
              description="按公司相关性排序：现任成员、创始团队和旗舰产品贡献者优先，再看综合影响力。"
            />
          )}
          {(data.currentPeople.length > 0 || data.alumniPeople.length > 0) && (
            <OrganizationRosterSection
              current={data.currentPeople}
              alumni={data.alumniPeople}
              excludeIds={rankedPeople.slice(0, TOP_PEOPLE_LIMIT).map(person => person.id)}
            />
          )}
        </div>

        {/* 参考与来源：支撑上方判断的证据、主题与动态，按需展开 */}
        <ReferenceTier>
          <RelatedThreadsSection threads={companyIntelligence.relatedThreads} topics={data.relatedTopics} />
          <CompanyEvidenceSection intelligence={companyIntelligence} />
          {data.activity.length > 0 && <ActivitySection events={data.activity} title={`${displayName} 最近动态`} />}
          {data.works.length > 0 && <WorksSection works={data.works} />}
        </ReferenceTier>
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

function companyRelevanceScore(person: DirectoryPerson, flagshipKeywords: string[]): number {
  let score = person.influenceScore || 0;
  const match = person.organizationMatch;
  if (match?.isCurrent || match?.status === 'current') score += 30;
  const title = (person.currentTitle || '').toLowerCase();
  const haystack = `${title} ${(person.description || '').toLowerCase()}`;
  if (/found|创始|ceo|cto|chief/.test(title)) score += 45;
  else if (/head|lead|director|\bvp\b|principal|负责人|主管/.test(title)) score += 20;
  if (flagshipKeywords.some(keyword => haystack.includes(keyword))) score += 40;
  return score;
}

// 公司页人物排序：全局影响力是基线，但让现任成员、创始团队和旗舰产品贡献者优先，
// 否则学术影响力会盖过对这家公司真正关键的人（比如 Claude Code 创建者）。旗舰词来自公司 seed。
function rankPeopleForCompany(people: DirectoryPerson[], flagshipKeywords: string[]): DirectoryPerson[] {
  return [...people].sort(
    (a, b) => companyRelevanceScore(b, flagshipKeywords) - companyRelevanceScore(a, flagshipKeywords)
  );
}
