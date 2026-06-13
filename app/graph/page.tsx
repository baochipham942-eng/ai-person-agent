import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { SiteHeader } from '@/components/common/SiteHeader';
import {
  DIRECTORY_ORGANIZATION_GROUPS,
  DIRECTORY_TOPIC_GROUPS,
  normalizeDirectoryTopic,
} from '@/lib/person-directory-config';
import {
  buildGlobalGraphHref,
  fetchGlobalRelationshipGraph,
  supportedGlobalGraphRelationTypes,
  type GlobalRelationshipGraph,
  type GlobalRelationshipGraphEdge,
  type GlobalRelationshipGraphNode,
} from '@/lib/global-relationship-graph';

export const revalidate = 300;

export const metadata: Metadata = {
  title: '人物关系 | AI 人物库',
  description: '探索 AI 关键人物、机构和话题之间的可信关系网络。',
};

interface GraphPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const RELATION_LABELS: Record<string, string> = {
  advisor: '导师',
  advisee: '学生',
  cofounder: '联创',
  colleague: '同事',
  former_colleague: '前同事',
  collaborator: '合作者',
  successor: '继任者',
  predecessor: '前任',
};

export default async function GraphPage({ searchParams }: GraphPageProps) {
  const resolvedSearchParams = await searchParams;
  const topic = firstParam(resolvedSearchParams?.topic);
  const organization = firstParam(resolvedSearchParams?.organization);
  const relationType = firstParam(resolvedSearchParams?.relationType);
  const graph = await fetchCachedGlobalRelationshipGraph(topic, organization, relationType);
  const title = topic || organization || (relationType ? relationLabel(relationType) : 'AI 关键人物');

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <SiteHeader current="graph" maxWidth="7xl" />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
          <div>
            <div className="mb-2 text-xs font-medium text-orange-600">可信关系网络</div>
            <h1 className="text-2xl font-semibold text-stone-950">人物关系</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
              当前视图围绕 {title} 展示已确认关系，默认排除待核关系。每条边都保留置信度和证据线索，适合顺着导师、联创、同事和合作者继续查人。
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="核心人物" value={graph.stats.seedPeople} />
            <Stat label="延展人物" value={graph.stats.linkedPeople} />
            <Stat label="证据边" value={graph.stats.evidenceEdges} />
          </div>
        </section>

        <FilterPanel topic={topic} organization={organization} relationType={relationType} graph={graph} />

        {graph.edges.length > 0 ? (
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <GraphBoard graph={graph} />
            <GraphInsights graph={graph} />
          </section>
        ) : (
          <EmptyGraph graph={graph} />
        )}
      </main>
    </div>
  );
}

const fetchCachedGlobalRelationshipGraph = unstable_cache(
  async (topic: string | null, organization: string | null, relationType: string | null) => fetchGlobalRelationshipGraph({
    topic,
    organization,
    relationType,
    seedLimit: 14,
    edgeLimit: 48,
  }),
  ['global-relationship-graph'],
  { revalidate: 300 }
);

function FilterPanel({
  topic,
  organization,
  relationType,
  graph,
}: {
  topic: string | null;
  organization: string | null;
  relationType: string | null;
  graph: GlobalRelationshipGraph;
}) {
  const topicOptions = [
    ...new Set([
      ...(topic ? [normalizeDirectoryTopic(topic)] : []),
      ...graph.topics.map(item => normalizeDirectoryTopic(item.label)),
      ...DIRECTORY_TOPIC_GROUPS.flatMap(group => group.topics).slice(0, 10),
    ]),
  ].slice(0, 16);
  const organizationOptions = [
    ...new Set([
      ...(organization ? [organization] : []),
      ...graph.organizations.map(item => item.label),
      ...DIRECTORY_ORGANIZATION_GROUPS.flatMap(group => group.organizations).slice(0, 10),
    ]),
  ].slice(0, 16);
  const relationOptions = [
    ...new Set([
      ...(relationType ? [relationType] : []),
      ...graph.relationTypes.map(item => item.label),
      ...supportedGlobalGraphRelationTypes(),
    ]),
  ].slice(0, 10);

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-medium text-stone-900">筛选视图</div>
        {(topic || organization || relationType) && (
          <Link href="/graph" className="text-xs font-medium text-orange-600 hover:text-orange-700">
            清除筛选
          </Link>
        )}
      </div>

      <FilterRow label="话题" items={topicOptions} active={topic} hrefFor={label => buildGlobalGraphHref({ topic: label, organization, relationType })} />
      <FilterRow label="机构" items={organizationOptions} active={organization} hrefFor={label => buildGlobalGraphHref({ topic, organization: label, relationType })} />
      <FilterRow label="关系" items={relationOptions} active={relationType} hrefFor={label => buildGlobalGraphHref({ topic, organization, relationType: label })} labelFor={relationLabel} />
    </section>
  );
}

function FilterRow({
  label,
  items,
  active,
  hrefFor,
  labelFor = value => value,
}: {
  label: string;
  items: string[];
  active: string | null;
  hrefFor: (label: string) => string;
  labelFor?: (label: string) => string;
}) {
  return (
    <div className="mb-3 flex flex-col gap-2 last:mb-0 sm:flex-row sm:items-start">
      <div className="w-12 flex-shrink-0 pt-1 text-xs font-medium text-stone-400">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map(item => (
          <Link
            key={item}
            href={hrefFor(item)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
              active === item
                ? 'border-orange-200 bg-orange-50 text-orange-700'
                : 'border-stone-200 bg-white text-stone-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700'
            }`}
          >
            {labelFor(item)}
          </Link>
        ))}
      </div>
    </div>
  );
}

function GraphBoard({ graph }: { graph: GlobalRelationshipGraph }) {
  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-stone-950">人物节点</h2>
          <div className="text-xs text-stone-400">核心人物来自当前筛选，延展人物来自可信关系边</div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <NodeGroup title="核心人物" nodes={graph.seedPeople.slice(0, 12)} tone="seed" />
          <NodeGroup title="延展人物" nodes={graph.linkedPeople.slice(0, 12)} tone="linked" />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-stone-950">关系边</h2>
          <div className="text-xs text-stone-400">共 {graph.edges.length} 条已确认关系</div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {graph.edges.slice(0, 24).map(edge => (
            <EdgeCard key={edge.id} edge={edge} />
          ))}
        </div>
      </section>
    </div>
  );
}

function NodeGroup({ title, nodes, tone }: { title: string; nodes: GlobalRelationshipGraphNode[]; tone: 'seed' | 'linked' }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-stone-900">{title}</div>
        <div className="text-[11px] text-stone-400">{nodes.length} 位</div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {nodes.map(node => (
          <Link
            key={node.id}
            href={`/person/${node.id}`}
            className={`flex min-h-16 items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
              tone === 'seed'
                ? 'border-orange-100 bg-orange-50 hover:border-orange-200'
                : 'border-stone-100 bg-stone-50 hover:border-orange-200 hover:bg-orange-50'
            }`}
          >
            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-stone-100">
              {node.avatarUrl ? (
                <Image src={node.avatarUrl} alt={node.name} fill sizes="40px" className="object-cover object-top" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-orange-500 text-xs font-semibold text-white">
                  {node.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-stone-900">{node.name}</div>
              <div className="mt-0.5 truncate text-[11px] text-stone-500">
                {organizationLabel(node)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function EdgeCard({ edge }: { edge: GlobalRelationshipGraphEdge }) {
  const evidence = edge.evidenceNote || edge.description || '证据整理中';
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/person/${edge.sourceId}?fromGraph=1`} className="text-sm font-medium text-stone-900 hover:text-orange-600">
          {edge.sourceName}
        </Link>
        <span className="rounded-full border border-orange-100 bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700">
          {relationLabel(edge.relationType)}
        </span>
        <Link href={`/person/${edge.targetId}?fromGraph=1`} className="text-sm font-medium text-stone-900 hover:text-orange-600">
          {edge.targetName}
        </Link>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-stone-400">
        <span>{edge.reviewStatus === 'trusted' ? '可信关系' : '已确认'}</span>
        {typeof edge.confidence === 'number' && <span>置信度 {Math.round(edge.confidence * 100)}%</span>}
        {edge.evidenceUrl && (
          <a href={edge.evidenceUrl} target="_blank" rel="noreferrer" className="font-medium text-orange-600 hover:text-orange-700">
            查看来源
          </a>
        )}
      </div>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{evidence}</p>
    </div>
  );
}

function GraphInsights({ graph }: { graph: GlobalRelationshipGraph }) {
  return (
    <aside className="space-y-4">
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="mb-3 text-sm font-medium text-stone-900">图谱质量</div>
        <div className="space-y-2 text-xs text-stone-600">
          <InsightRow label="平均置信度" value={graph.stats.averageConfidence == null ? '无' : `${Math.round(graph.stats.averageConfidence * 100)}%`} />
          <InsightRow label="证据覆盖" value={`${graph.stats.evidenceEdges}/${graph.stats.trustedEdges}`} />
          <InsightRow label="默认状态" value="排除待核关系" />
        </div>
      </section>

      <HubSection graph={graph} />
      <RecommendedPathSection graph={graph} />
      <FacetSection title="相关话题" facets={graph.topics} />
      <FacetSection title="相关机构" facets={graph.organizations} />
      <FacetSection title="关系类型" facets={graph.relationTypes} labelFor={relationLabel} />
    </aside>
  );
}

function HubSection({ graph }: { graph: GlobalRelationshipGraph }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-medium text-stone-900">关键连接点</div>
      {graph.hubs.length > 0 ? (
        <div className="space-y-2">
          {graph.hubs.slice(0, 6).map(hub => (
            <Link key={hub.personId} href={`/person/${hub.personId}?fromGraphHub=1`} className="block rounded-lg bg-stone-50 px-3 py-2 text-xs hover:bg-orange-50">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-medium text-stone-900">{hub.name}</span>
                <span className="shrink-0 text-stone-400">{hub.degree} 条</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500">
                {hub.isSeed && <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-orange-700">核心</span>}
                <span>{hub.evidenceEdges}/{hub.degree} 有证据</span>
                {hub.averageConfidence != null && <span>{Math.round(hub.averageConfidence * 100)}% 平均置信</span>}
              </div>
              <div className="mt-1 truncate text-[11px] text-stone-400">
                {hub.relationTypes.map(relationLabel).join('、') || hub.organization || hub.topic || '关系整理中'}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-stone-200 px-3 py-4 text-center text-xs text-stone-500">
          暂无高连接人物
        </div>
      )}
    </section>
  );
}

function RecommendedPathSection({ graph }: { graph: GlobalRelationshipGraph }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-medium text-stone-900">可追踪关系</div>
      {graph.recommendedPaths.length > 0 ? (
        <div className="space-y-2">
          {graph.recommendedPaths.slice(0, 6).map(path => (
            <div key={path.id} className="rounded-lg bg-stone-50 px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5 leading-5">
                <Link href={`/person/${path.sourceId}?fromGraphPath=1`} className="font-medium text-stone-900 hover:text-orange-600">
                  {path.sourceName}
                </Link>
                <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-orange-700 ring-1 ring-orange-100">
                  {relationLabel(path.relationType)}
                </span>
                <Link href={`/person/${path.targetId}?fromGraphPath=1`} className="font-medium text-stone-900 hover:text-orange-600">
                  {path.targetName}
                </Link>
              </div>
              <div className="mt-1 text-[11px] text-stone-400">
                {path.confidence == null ? '置信度待补' : `置信度 ${Math.round(path.confidence * 100)}%`}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-stone-200 px-3 py-4 text-center text-xs text-stone-500">
          暂无可追踪关系
        </div>
      )}
    </section>
  );
}

function FacetSection({
  title,
  facets,
  labelFor = label => label,
}: {
  title: string;
  facets: Array<{ label: string; count: number; href: string }>;
  labelFor?: (label: string) => string;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-medium text-stone-900">{title}</div>
      {facets.length > 0 ? (
        <div className="space-y-2">
          {facets.slice(0, 8).map(facet => (
            <Link key={facet.label} href={facet.href} className="flex items-center justify-between gap-3 rounded-lg bg-stone-50 px-3 py-2 text-xs hover:bg-orange-50">
              <span className="min-w-0 truncate font-medium text-stone-700">{labelFor(facet.label)}</span>
              <span className="text-stone-400">{facet.count}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-stone-200 px-3 py-4 text-center text-xs text-stone-500">
          暂无可聚合项
        </div>
      )}
    </section>
  );
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-stone-500">{label}</span>
      <span className="font-medium text-stone-900">{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm">
      <div className="text-lg font-semibold text-stone-950">{value}</div>
      <div className="mt-0.5 text-[11px] text-stone-500">{label}</div>
    </div>
  );
}

function EmptyGraph({ graph }: { graph: GlobalRelationshipGraph }) {
  const isDegraded = graph.status === 'degraded';

  return (
    <section className="rounded-lg border border-dashed border-stone-200 bg-white/70 px-5 py-10 text-center">
      <h2 className="text-base font-semibold text-stone-950">
        {isDegraded ? '关系数据暂时不可用' : '当前筛选下还没有足够关系'}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
        {isDegraded ? graph.message : '可以换一个话题、机构或关系类型查看。'}
      </p>
      <Link href="/graph" className="mt-5 inline-flex h-9 items-center rounded-lg bg-stone-900 px-3 text-xs font-medium text-white hover:bg-orange-600">
        查看默认图谱
      </Link>
    </section>
  );
}

function relationLabel(type: string): string {
  return RELATION_LABELS[type] || type;
}

function organizationLabel(node: GlobalRelationshipGraphNode): string {
  return organizationFromTitle(node.currentTitle) || node.organization[0] || node.topics[0] || '资料整理中';
}

function organizationFromTitle(title?: string | null): string | null {
  if (!title) return null;
  const match = title.match(/@\s*([^,/|;]+)/);
  return match?.[1]?.trim() || null;
}

function firstParam(value?: string | string[] | null): string | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}
