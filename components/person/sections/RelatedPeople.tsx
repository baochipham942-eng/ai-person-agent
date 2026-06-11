'use client';

import { useState } from 'react';
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
  relatedPerson: RelatedPerson;
}

interface RelatedPeopleProps {
  relations: Relation[];
}

const RELATION_CONFIG: Record<string, { label: string; color: string }> = {
  advisor: { label: '导师', color: 'bg-purple-50 text-purple-600 border-purple-100' },
  advisee: { label: '学生', color: 'bg-green-50 text-green-600 border-green-100' },
  cofounder: { label: '联创', color: 'bg-orange-50 text-orange-600 border-orange-100' },
  colleague: { label: '同事', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  collaborator: { label: '合作者', color: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
  successor: { label: '继任者', color: 'bg-stone-50 text-stone-600 border-stone-100' },
  predecessor: { label: '前任', color: 'bg-amber-50 text-amber-600 border-amber-100' },
};

// 合并同一人物的多个关系
interface MergedRelation {
  personId: string;
  relatedPerson: RelatedPerson;
  relations: Array<{
    relationType: string;
    reviewStatus?: string | null;
    evidenceNote?: string | null;
  }>;
}

function mergeRelations(relations: Relation[]): MergedRelation[] {
  const personMap = new Map<string, MergedRelation>();

  for (const rel of relations) {
    const personId = rel.relatedPerson.id;
    if (personMap.has(personId)) {
      // 已存在，添加关系类型（去重）
      const existing = personMap.get(personId)!;
      if (!existing.relations.some(item => item.relationType === rel.relationType)) {
        existing.relations.push({
          relationType: rel.relationType,
          reviewStatus: rel.reviewStatus,
          evidenceNote: rel.evidenceNote,
        });
      }
    } else {
      // 新人物
      personMap.set(personId, {
        personId,
        relatedPerson: rel.relatedPerson,
        relations: [{
          relationType: rel.relationType,
          reviewStatus: rel.reviewStatus,
          evidenceNote: rel.evidenceNote,
        }],
      });
    }
  }

  return Array.from(personMap.values());
}

export function RelatedPeople({ relations }: RelatedPeopleProps) {
  const [showNeedsReview, setShowNeedsReview] = useState(false);

  if (!relations || relations.length === 0) return null;

  const confirmedRelations = relations.filter(rel => rel.reviewStatus !== 'needs_review');
  const needsReviewRelations = relations.filter(rel => rel.reviewStatus === 'needs_review');
  const mergedConfirmedRelations = mergeRelations(confirmedRelations);
  const mergedNeedsReviewRelations = mergeRelations(needsReviewRelations);
  const totalVisibleRelations = mergedConfirmedRelations.length + mergedNeedsReviewRelations.length;

  return (
    <section className="card-base p-5 sm:p-6">
      {/* 标题栏 */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-100">
        <span className="text-base">👥</span>
        <h2 className="text-sm font-medium text-stone-900">关联人物</h2>
        <span className="text-xs text-stone-400">({totalVisibleRelations})</span>
      </div>

      {mergedConfirmedRelations.length > 0 && <RelationGrid relations={mergedConfirmedRelations} />}

      {mergedNeedsReviewRelations.length > 0 && (
        <div className={mergedConfirmedRelations.length > 0 ? 'mt-4 border-t border-stone-100 pt-3' : ''}>
          <button
            type="button"
            onClick={() => setShowNeedsReview(!showNeedsReview)}
            className="flex w-full items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-left text-xs font-medium text-stone-600 hover:bg-stone-100"
          >
            <span>待核关系 ({mergedNeedsReviewRelations.length})</span>
            <svg
              className={`w-4 h-4 transition-transform ${showNeedsReview ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showNeedsReview && (
            <div className="mt-3">
              <RelationGrid relations={mergedNeedsReviewRelations} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function RelationGrid({ relations }: { relations: MergedRelation[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {relations.map((item) => {
        const organizationLabel = displayOrganization(item.relatedPerson);
        return (
          <Link
            key={item.personId}
            href={`/person/${item.personId}`}
            className="flex flex-col items-center p-3 bg-stone-50/50 rounded-xl hover:bg-orange-50/50 hover:shadow-md transition-all group text-center"
          >
            <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-pink-500 flex-shrink-0 ring-2 ring-white shadow-sm">
              {item.relatedPerson.avatarUrl ? (
                <Image
                  src={item.relatedPerson.avatarUrl}
                  alt={item.relatedPerson.name}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.relatedPerson.name)}&background=f97316&color=fff&size=112`;
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-lg font-semibold">
                  {item.relatedPerson.name.charAt(0)}
                </div>
              )}
            </div>

            <div className="mt-2 text-sm font-medium text-stone-900 group-hover:text-orange-600 transition-colors truncate max-w-full">
              {item.relatedPerson.name}
            </div>

            {organizationLabel && (
              <div className="text-xs text-stone-500 truncate max-w-full mt-0.5">
                {organizationLabel}
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-1 mt-2">
              {item.relations.map((relation) => {
                const isNeedsReview = relation.reviewStatus === 'needs_review';
                const config = RELATION_CONFIG[relation.relationType] || {
                  label: relation.relationType,
                  color: 'bg-stone-50 text-stone-600 border-stone-100'
                };
                return (
                  <span
                    key={relation.relationType}
                    title={relation.evidenceNote || undefined}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                      isNeedsReview
                        ? 'bg-stone-50 text-stone-400 border-stone-200 border-dashed'
                        : config.color
                    }`}
                  >
                    {config.label}{isNeedsReview ? '待核' : ''}
                  </span>
                );
              })}
            </div>
          </Link>
        );
      })}
    </div>
  );
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
