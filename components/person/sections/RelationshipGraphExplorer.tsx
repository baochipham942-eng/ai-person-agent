'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { RelationshipGraph, RelationshipGraphEdge, RelationshipGraphPerson } from '@/lib/relation-graph';
import { useSectionVisibility } from './useSectionVisibility';

interface RelationshipGraphExplorerProps {
  personId: string;
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

export function RelationshipGraphExplorer({ personId }: RelationshipGraphExplorerProps) {
  const { sectionRef, isVisible } = useSectionVisibility<HTMLElement>('480px 0px');
  const [graph, setGraph] = useState<RelationshipGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!isVisible) return;
    let active = true;

    async function loadGraph() {
      setLoading(true);
      try {
        const response = await fetch(`/api/person/${personId}/relationship-graph?firstHopLimit=10&secondHopLimit=18`);
        if (!response.ok) return;
        const result = await response.json() as { graph?: RelationshipGraph };
        if (active) setGraph(result.graph || null);
      } catch {
        if (active) setGraph(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadGraph();
    return () => {
      active = false;
    };
  }, [personId, isVisible]);

  const visibleNodes = useMemo(() => {
    if (!graph) return [];
    return graph.nodes
      .filter(node => node.depth > 0)
      .sort((left, right) => left.depth - right.depth || left.name.localeCompare(right.name))
      .slice(0, expanded ? 28 : 12);
  }, [expanded, graph]);

  if (!isVisible || loading) {
    return (
      <section ref={sectionRef} className="card-base p-5 sm:p-6">
        <div className="h-4 w-28 rounded bg-stone-100" />
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="h-20 rounded-lg bg-stone-100" />
          <div className="h-20 rounded-lg bg-stone-100" />
          <div className="h-20 rounded-lg bg-stone-100" />
        </div>
      </section>
    );
  }

  if (!graph || graph.nodes.length <= 1 || graph.edges.length === 0) return null;

  return (
    <section ref={sectionRef} className="card-base p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 border-b border-stone-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">⛓</span>
            <h2 className="text-sm font-medium text-stone-900">二跳关系探索</h2>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            沿已确认关系继续看共同导师、合作者和机构圈层。
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
          <GraphStat label="一跳" value={graph.stats.firstHopPeople} />
          <GraphStat label="二跳" value={graph.stats.secondHopPeople} />
          <GraphStat label="证据边" value={graph.stats.evidenceEdges} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-xs font-medium text-stone-900">关系节点</div>
            <div className="text-[11px] text-stone-400">只含已确认关系</div>
          </div>

          <div className="mb-3 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2">
            <div className="text-sm font-semibold text-stone-950">{graph.center.name}</div>
            <div className="mt-0.5 text-[11px] text-orange-700">中心人物</div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {visibleNodes.map(node => (
              <GraphNodeCard key={node.id} node={node} edge={primaryEdgeForNode(graph, node.id)} />
            ))}
          </div>

          {graph.nodes.length - 1 > visibleNodes.length && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-3 h-8 rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
            >
              展开更多节点
            </button>
          )}
        </div>

        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
          <div className="mb-3 text-xs font-medium text-stone-900">可探索路径</div>
          {graph.paths.length > 0 ? (
            <div className="space-y-2">
              {graph.paths.slice(0, expanded ? 12 : 6).map(path => (
                <div key={`${path.viaPersonId}:${path.targetPersonId}:${path.firstRelationType}:${path.secondRelationType}`} className="rounded-lg bg-white px-3 py-2 text-xs leading-5 shadow-sm ring-1 ring-stone-100">
                  <div className="flex flex-wrap items-center gap-1.5 text-stone-700">
                    <Link href={`/person/${path.viaPersonId}?fromRelation=${encodeURIComponent(path.firstRelationType)}`} className="font-medium text-stone-900 hover:text-orange-600">
                      {path.viaPersonName}
                    </Link>
                    <span className="text-stone-400">{relationLabel(path.firstRelationType)}</span>
                    <span className="text-stone-300">→</span>
                    <Link href={`/person/${path.targetPersonId}?fromRelation=${encodeURIComponent(path.secondRelationType)}`} className="font-medium text-stone-900 hover:text-orange-600">
                      {path.targetPersonName}
                    </Link>
                    <span className="text-stone-400">{relationLabel(path.secondRelationType)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-stone-400">
                    <span>路径置信度 {Math.round(path.confidence * 100)}%</span>
                    <span>{path.evidenceCount} 条证据边</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-stone-200 bg-white px-3 py-5 text-center text-xs text-stone-500">
              二跳路径还不够密集。
            </div>
          )}
        </div>
      </div>

      {graph.stats.lowConfidenceEdges > 0 && (
        <div className="mt-3 text-[11px] leading-5 text-stone-400">
          低置信度边只作为探索线索，关键关系仍以来源和审核状态为准。
        </div>
      )}
    </section>
  );
}

function GraphStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-100 bg-stone-50 px-2 py-1.5">
      <div className="text-sm font-semibold text-stone-950">{value}</div>
      <div className="text-[10px] text-stone-500">{label}</div>
    </div>
  );
}

function GraphNodeCard({ node, edge }: { node: RelationshipGraphPerson; edge?: RelationshipGraphEdge }) {
  return (
    <Link
      href={`/person/${node.id}${edge ? `?fromRelation=${encodeURIComponent(edge.relationType)}` : ''}`}
      className="group flex items-center gap-2 rounded-lg border border-stone-100 bg-stone-50 px-2.5 py-2 transition hover:border-orange-200 hover:bg-orange-50"
    >
      <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg bg-stone-100">
        {node.avatarUrl ? (
          <Image src={node.avatarUrl} alt={node.name} fill sizes="36px" className="object-cover object-top" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-orange-500 text-xs font-semibold text-white">
            {node.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-stone-900 group-hover:text-orange-700">{node.name}</span>
          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${node.depth === 1 ? 'bg-orange-100 text-orange-700' : 'bg-stone-200 text-stone-600'}`}>
            {node.depth === 1 ? '一跳' : '二跳'}
          </span>
        </div>
        <div className="mt-0.5 truncate text-[11px] text-stone-400">
          {edge ? relationLabel(edge.relationType) : displayOrganization(node)}
        </div>
      </div>
    </Link>
  );
}

function primaryEdgeForNode(graph: RelationshipGraph, nodeId: string): RelationshipGraphEdge | undefined {
  return graph.edges
    .filter(edge => edge.targetId === nodeId)
    .sort((left, right) => (right.confidence || 0) - (left.confidence || 0))[0];
}

function relationLabel(type: string): string {
  return RELATION_LABELS[type] || type;
}

function displayOrganization(person: RelationshipGraphPerson): string {
  return organizationFromTitle(person.currentTitle) || person.organization[0] || '机构待补充';
}

function organizationFromTitle(title?: string | null): string | null {
  if (!title) return null;
  const match = title.match(/@\s*([^,/|;]+)/);
  return match?.[1]?.trim() || null;
}
