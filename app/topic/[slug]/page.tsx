import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import {
  ActivitySection,
  CoveragePanel,
  EntityHeader,
  EntityPageNav,
  FacetCloud,
  TopPeopleSection,
  WorksSection,
} from '@/components/entity/EntityPageBlocks';
import { CurrentThreadsStream } from '@/components/home/CurrentThreadsStream';
import { fetchTopicPageData } from '@/lib/entity-pages';
import { listThreadsForTopic } from '@/lib/knowledge-thread-people';
import {
  buildDirectoryHref,
  buildTopicHref,
  normalizeDirectoryTopic,
} from '@/lib/person-directory-config';

interface TopicPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300;

const loadTopicPageData = unstable_cache(
  async (topic: string) => fetchTopicPageData(topic),
  ['topic-page-data-v2'],
  { revalidate: 300 }
);

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = normalizeDirectoryTopic(decodeRouteParam(slug));

  return {
    title: `${topic} 关键人物 | AI 人物库`,
    description: `查看 ${topic} 方向的关键人物、近期动态、代表论文项目和相关机构。`,
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { slug } = await params;
  const topic = normalizeDirectoryTopic(decodeRouteParam(slug));
  const data = await loadTopicPageData(topic);
  const topicThreads = listThreadsForTopic(topic);

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <EntityPageNav currentLabel={`${topic} 方向`} />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6">
        <EntityHeader
          eyebrow="话题情报"
          title={`${topic} 方向关键人物`}
          description={`围绕 ${topic} 聚合人物、近期事件、论文项目和机构线索，帮助判断这个方向谁值得关注、最近有哪些变化。`}
          stats={[
            { label: '相关人物', value: data.totalPeople },
            { label: '近期动态', value: data.coverage.metrics.activityCount },
            { label: '论文/项目', value: data.coverage.metrics.workCount },
            { label: '相关机构', value: data.relatedOrganizations.length },
          ]}
          primaryAction={{
            label: '查看完整列表',
            href: buildDirectoryHref({ view: 'topic', topic }),
          }}
          followTarget={{
            type: 'topic',
            id: topic,
            label: topic,
            href: buildTopicHref(topic),
          }}
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-8">
            {topicThreads.length > 0 && (
              <CurrentThreadsStream
                threads={topicThreads}
                title={`${topic} 的当期主题脉络`}
                subtitle="这个方向最近正在成形的知识主题，以及谁在定义它。"
                className=""
              />
            )}
            <TopPeopleSection people={data.people} />
            <ActivitySection events={data.activity} title={`${topic} 最近动态`} />
            <WorksSection works={data.works} />
          </div>

          <aside className="space-y-8">
            <CoveragePanel coverage={data.coverage} />
            <FacetCloud
              title="相关机构"
              description="按该方向人物的机构线索统计。"
              facets={data.relatedOrganizations}
              type="organization"
            />
            <FacetCloud
              title="相关话题"
              description="适合继续追的相邻方向。"
              facets={data.relatedTopics}
              type="topic"
            />
            <section className="rounded-xl border border-stone-200 bg-white p-4 text-xs leading-5 text-stone-500 shadow-sm">
              <div className="mb-2 text-sm font-medium text-stone-900">数据口径</div>
              <p>人物来自已发布资料库，动态和作品来自可回溯的原始来源。低覆盖话题会优先保留可验证信息。</p>
              <Link
                href={buildDirectoryHref({ view: 'topic', topic, sortBy: 'influenceScore' })}
                prefetch={false}
                className="mt-3 inline-flex font-medium text-orange-600 hover:text-orange-700"
              >
                按综合影响力查看
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
