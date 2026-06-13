'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface RelatedPerson {
  id: string;
  name: string;
  avatarUrl: string | null;
  currentTitle?: string | null;
  organization: string[];
}

interface Relation {
  id: string;
  relationType: string;
  description?: string | null;
  reviewStatus?: string | null;
  evidenceUrl?: string | null;
  evidenceNote?: string | null;
  confidence?: number | null;
  relatedPerson: RelatedPerson;
}

interface RelatedPeopleProps {
  centerName: string;
  relations: Relation[];
}

const RELATION_CONFIG: Record<string, { label: string; color: string }> = {
  advisor: { label: '导师', color: 'bg-purple-50 text-purple-700 border-purple-100' },
  advisee: { label: '学生', color: 'bg-green-50 text-green-700 border-green-100' },
  cofounder: { label: '联创', color: 'bg-orange-50 text-orange-700 border-orange-100' },
  colleague: { label: '同事', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  former_colleague: { label: '前同事', color: 'bg-sky-50 text-sky-700 border-sky-100' },
  collaborator: { label: '合作者', color: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
  successor: { label: '继任者', color: 'bg-stone-50 text-stone-700 border-stone-100' },
  predecessor: { label: '前任', color: 'bg-amber-50 text-amber-700 border-amber-100' },
};
const TRUSTED_RELATION_STATUSES = new Set(['trusted', 'confirmed']);
const MIN_DEFAULT_RELATION_CONFIDENCE = 0.75;

interface MergedRelationItem {
  personId: string;
  relatedPerson: RelatedPerson;
  relations: Array<{
    relationType: string;
    reviewStatus?: string | null;
    evidenceNote?: string | null;
    evidenceUrl?: string | null;
    description?: string | null;
    confidence?: number | null;
  }>;
}

export function RelatedPeople({ centerName, relations }: RelatedPeopleProps) {
  const [showNeedsReview, setShowNeedsReview] = useState(false);
  const [activeType, setActiveType] = useState<string>('all');

  const confirmedRelations = useMemo(
    () => relations.filter(isDefaultVisibleRelation),
    [relations]
  );
  const needsReviewRelations = useMemo(
    () => relations.filter(rel => !isDefaultVisibleRelation(rel)),
    [relations]
  );
  const mergedConfirmedRelations = useMemo(() => mergeRelations(confirmedRelations), [confirmedRelations]);
  const mergedNeedsReviewRelations = useMemo(() => mergeRelations(needsReviewRelations), [needsReviewRelations]);
  const relationTypes = useMemo(() => buildRelationTypeOptions(confirmedRelations), [confirmedRelations]);
  const evidenceCount = relations.filter(rel => rel.evidenceUrl || rel.evidenceNote || rel.description).length;
  const totalPeople = mergedConfirmedRelations.length + mergedNeedsReviewRelations.length;
  const visibleConfirmedRelations = filterByRelationType(mergedConfirmedRelations, activeType);

  if (!relations || relations.length === 0) return null;

  return (
    <section className="card-base p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 border-b border-stone-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">👥</span>
          <h2 className="text-sm font-medium text-stone-900">关联人物</h2>
          <span className="text-xs text-stone-400">({totalPeople})</span>
        </div>
        <div className="text-xs text-stone-400">{evidenceCount} 条证据线索</div>
      </div>

      {relationTypes.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveType('all')}
            className={filterButtonClass(activeType === 'all')}
          >
            全部
          </button>
          {relationTypes.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setActiveType(type)}
              className={filterButtonClass(activeType === type)}
            >
              {relationLabel(type)}
            </button>
          ))}
        </div>
      )}

      <RelationNetwork centerName={centerName} items={visibleConfirmedRelations} activeType={activeType} />

      {visibleConfirmedRelations.length > 0 ? (
        <RelationList items={visibleConfirmedRelations} activeType={activeType} />
      ) : (
        <div className="rounded-xl border border-dashed border-stone-200 bg-white/60 px-4 py-6 text-center text-xs text-stone-500">
          这个关系类型还没有已确认人物。
        </div>
      )}

      {mergedNeedsReviewRelations.length > 0 && (
        <div className={mergedConfirmedRelations.length > 0 ? 'mt-4 border-t border-stone-100 pt-3' : ''}>
          <button
            type="button"
            onClick={() => setShowNeedsReview(!showNeedsReview)}
            className="flex w-full items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-left text-xs font-medium text-stone-600 hover:bg-stone-100"
          >
            <span>待核关系/低置信关系 ({mergedNeedsReviewRelations.length})</span>
            <svg
              className={`h-4 w-4 transition-transform ${showNeedsReview ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showNeedsReview && (
            <div className="mt-3">
              <RelationList items={mergedNeedsReviewRelations} activeType="all" muted />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function RelationNetwork({
  centerName,
  items,
  activeType,
}: {
  centerName: string;
  items: MergedRelationItem[];
  activeType: string;
}) {
  if (items.length === 0) return null;

  const networkItems = items.slice(0, 8).map(item => {
    const visibleRelations = activeType === 'all'
      ? item.relations
      : item.relations.filter(relation => relation.relationType === activeType);
    const primaryRelation = visibleRelations[0] || item.relations[0];

    return {
      id: item.personId,
      name: item.relatedPerson.name,
      organization: displayOrganization(item.relatedPerson),
      relationType: primaryRelation.relationType,
      reviewStatus: primaryRelation.reviewStatus,
      confidence: primaryRelation.confidence,
      hasEvidence: Boolean(primaryRelation.evidenceUrl || primaryRelation.evidenceNote || primaryRelation.description),
    };
  });

  return (
    <div className="mb-4 rounded-xl border border-stone-200 bg-white px-3 py-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xs font-medium text-stone-900">一跳关系图</div>
        <div className="text-[11px] text-stone-400">默认只展示已确认关系</div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[11rem_minmax(0,1fr)] lg:items-center">
        <div className="rounded-xl border border-orange-100 bg-orange-50 px-3 py-3 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-white">
            {centerName.charAt(0)}
          </div>
          <div className="truncate text-sm font-semibold text-stone-950" title={centerName}>
            {centerName}
          </div>
          <div className="mt-1 text-[11px] text-orange-700">中心人物</div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {networkItems.map(item => (
            <Link
              key={item.id}
              href={`/person/${item.id}?fromRelation=${encodeURIComponent(item.relationType)}`}
              className="group rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 transition-colors hover:border-orange-200 hover:bg-orange-50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-stone-900 group-hover:text-orange-700">
                  {item.name}
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${relationBadgeClass(item, false)}`}>
                  {relationLabel(item.relationType)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-stone-400">
                <span className="min-w-0 truncate">{item.organization || '机构待补充'}</span>
                <span>{item.hasEvidence ? '有证据' : '待补来源'}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {items.length > networkItems.length && (
        <div className="mt-3 text-[11px] text-stone-400">
          还有 {items.length - networkItems.length} 位关联人物在下方列表中展示。
        </div>
      )}
    </div>
  );
}

function RelationList({
  items,
  activeType,
  muted = false,
}: {
  items: MergedRelationItem[];
  activeType: string;
  muted?: boolean;
}) {
  return (
    <div className="space-y-3">
      {items.map(item => {
        const visibleRelations = activeType === 'all'
          ? item.relations
          : item.relations.filter(relation => relation.relationType === activeType);
        const primaryRelation = visibleRelations[0] || item.relations[0];
        const organizationLabel = displayOrganization(item.relatedPerson);

        return (
          <div
            key={item.personId}
            className={`rounded-xl border px-3 py-3 ${
              muted
                ? 'border-dashed border-stone-200 bg-stone-50/60'
                : 'border-stone-200 bg-white shadow-sm'
            }`}
          >
            <div className="flex gap-3">
              <Link
                href={`/person/${item.personId}?fromRelation=${encodeURIComponent(primaryRelation.relationType)}`}
                className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-100"
              >
                {item.relatedPerson.avatarUrl ? (
                  <Image
                    src={item.relatedPerson.avatarUrl}
                    alt={item.relatedPerson.name}
                    fill
                    sizes="48px"
                    className="object-cover object-top"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.relatedPerson.name)}&background=f97316&color=fff&size=96`;
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-orange-500 text-sm font-semibold text-white">
                    {item.relatedPerson.name.charAt(0)}
                  </div>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/person/${item.personId}?fromRelation=${encodeURIComponent(primaryRelation.relationType)}`}
                    className="text-sm font-medium text-stone-900 hover:text-orange-600"
                  >
                    {item.relatedPerson.name}
                  </Link>
                  {visibleRelations.map(relation => (
                    <span
                      key={relation.relationType}
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${relationBadgeClass(relation, muted)}`}
                    >
                      {relationLabel(relation.relationType)}
                    </span>
                  ))}
                </div>

                {organizationLabel && (
                  <div className="mt-0.5 truncate text-xs text-stone-500">{organizationLabel}</div>
                )}

                <div className="mt-2 space-y-1.5">
                  {visibleRelations.map(relation => (
                    <RelationEvidence key={relation.relationType} relation={relation} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RelationEvidence({ relation }: { relation: MergedRelationItem['relations'][number] }) {
  const evidence = relation.evidenceNote || relation.description || '来源证据仍在整理中';
  const status = relationStatusLabel(relation);

  return (
    <div className="rounded-lg bg-stone-50 px-2.5 py-2 text-xs leading-5 text-stone-600">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium text-stone-700">{status}</span>
        {typeof relation.confidence === 'number' && (
          <span className="text-[10px] text-stone-400">置信度 {Math.round(relation.confidence * 100)}%</span>
        )}
        {relation.evidenceUrl && (
          <a
            href={relation.evidenceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] font-medium text-orange-600 hover:text-orange-700"
          >
            查看来源
          </a>
        )}
      </div>
      <p className="mt-0.5 line-clamp-2 text-stone-500">{evidence}</p>
    </div>
  );
}

function mergeRelations(relations: Relation[]): MergedRelationItem[] {
  const personMap = new Map<string, MergedRelationItem>();

  for (const relation of relations) {
    const personId = relation.relatedPerson.id;
    const mergedRelation = {
      relationType: relation.relationType,
      reviewStatus: relation.reviewStatus,
      evidenceNote: relation.evidenceNote,
      evidenceUrl: relation.evidenceUrl,
      description: relation.description,
      confidence: relation.confidence,
    };

    if (!personMap.has(personId)) {
      personMap.set(personId, {
        personId,
        relatedPerson: relation.relatedPerson,
        relations: [mergedRelation],
      });
      continue;
    }

    const existing = personMap.get(personId)!;
    const existingRelation = existing.relations.find(item => item.relationType === relation.relationType);
    if (!existingRelation) {
      existing.relations.push(mergedRelation);
      continue;
    }

    if (!existingRelation.evidenceUrl && mergedRelation.evidenceUrl) existingRelation.evidenceUrl = mergedRelation.evidenceUrl;
    if (!existingRelation.evidenceNote && mergedRelation.evidenceNote) existingRelation.evidenceNote = mergedRelation.evidenceNote;
    if (!existingRelation.description && mergedRelation.description) existingRelation.description = mergedRelation.description;
    if (existingRelation.confidence == null && mergedRelation.confidence != null) existingRelation.confidence = mergedRelation.confidence;
  }

  return Array.from(personMap.values());
}

function buildRelationTypeOptions(relations: Relation[]): string[] {
  return [...new Set(relations.map(relation => relation.relationType))]
    .sort((left, right) => relationLabel(left).localeCompare(relationLabel(right), 'zh-CN'));
}

function filterByRelationType(items: MergedRelationItem[], activeType: string): MergedRelationItem[] {
  if (activeType === 'all') return items;
  return items.filter(item => item.relations.some(relation => relation.relationType === activeType));
}

function filterButtonClass(active: boolean): string {
  return `rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
    active
      ? 'bg-stone-900 text-white'
      : 'bg-stone-100 text-stone-600 hover:bg-orange-50 hover:text-orange-700'
  }`;
}

function relationBadgeClass(relation: MergedRelationItem['relations'][number], muted: boolean): string {
  if (muted || relation.reviewStatus === 'needs_review') {
    return 'border-stone-200 bg-stone-50 text-stone-500';
  }
  return RELATION_CONFIG[relation.relationType]?.color || 'border-stone-100 bg-stone-50 text-stone-700';
}

function relationLabel(type: string): string {
  return RELATION_CONFIG[type]?.label || type;
}

function relationStatusLabel(relation: MergedRelationItem['relations'][number]): string {
  if (isLowConfidenceRelation(relation)) return '低置信度';
  if (relation.reviewStatus === 'trusted') return '可信关系';
  if (relation.reviewStatus === 'confirmed') return '已确认';
  if (relation.reviewStatus === 'needs_review') return '待核关系';
  return '资料线索';
}

function isDefaultVisibleRelation(relation: Relation): boolean {
  return TRUSTED_RELATION_STATUSES.has(relation.reviewStatus || '') && !isLowConfidenceRelation(relation);
}

function isLowConfidenceRelation(relation: Pick<Relation, 'confidence'>): boolean {
  return typeof relation.confidence === 'number' && relation.confidence < MIN_DEFAULT_RELATION_CONFIDENCE;
}

function displayOrganization(person: RelatedPerson): string | null {
  const currentOrg = organizationFromTitle(person.currentTitle);
  return currentOrg || person.organization?.[0] || null;
}

function organizationFromTitle(title?: string | null): string | null {
  if (!title) return null;
  const match = title.match(/@\s*([^,/|;]+)/);
  return match?.[1]?.trim() || null;
}
