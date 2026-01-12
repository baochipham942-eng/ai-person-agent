'use client';

import Link from 'next/link';

interface RelatedPerson {
  id: string;
  name: string;
  avatarUrl: string | null;
  organization: string[];
}

interface Relation {
  id: string;
  relationType: string;
  description?: string | null;
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
  relationTypes: string[];
}

function mergeRelations(relations: Relation[]): MergedRelation[] {
  const personMap = new Map<string, MergedRelation>();

  for (const rel of relations) {
    const personId = rel.relatedPerson.id;
    if (personMap.has(personId)) {
      // 已存在，添加关系类型（去重）
      const existing = personMap.get(personId)!;
      if (!existing.relationTypes.includes(rel.relationType)) {
        existing.relationTypes.push(rel.relationType);
      }
    } else {
      // 新人物
      personMap.set(personId, {
        personId,
        relatedPerson: rel.relatedPerson,
        relationTypes: [rel.relationType],
      });
    }
  }

  return Array.from(personMap.values());
}

export function RelatedPeople({ relations }: RelatedPeopleProps) {
  if (!relations || relations.length === 0) return null;

  // 合并同一人物的多个关系
  const mergedRelations = mergeRelations(relations);

  return (
    <section className="card-base p-5 sm:p-6">
      {/* 标题栏 */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-100">
        <span className="text-base">👥</span>
        <h2 className="text-sm font-medium text-stone-900">关联人物</h2>
        <span className="text-xs text-stone-400">({mergedRelations.length})</span>
      </div>

      {/* 网格布局 - 匹配设计稿 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {mergedRelations.map((item) => {
          return (
            <Link
              key={item.personId}
              href={`/person/${item.personId}`}
              className="flex flex-col items-center p-3 bg-stone-50/50 rounded-xl hover:bg-orange-50/50 hover:shadow-md transition-all group text-center"
            >
              {/* 头像 - 懒加载 */}
              <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-pink-500 flex-shrink-0 ring-2 ring-white shadow-sm">
                {item.relatedPerson.avatarUrl ? (
                  <img
                    src={item.relatedPerson.avatarUrl}
                    alt={item.relatedPerson.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.relatedPerson.name)}&background=f97316&color=fff&size=112`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-lg font-semibold">
                    {item.relatedPerson.name.charAt(0)}
                  </div>
                )}
              </div>

              {/* 名字 */}
              <div className="mt-2 text-sm font-medium text-stone-900 group-hover:text-orange-600 transition-colors truncate max-w-full">
                {item.relatedPerson.name}
              </div>

              {/* 机构 */}
              {item.relatedPerson.organization?.[0] && (
                <div className="text-xs text-stone-500 truncate max-w-full mt-0.5">
                  {item.relatedPerson.organization[0]}
                </div>
              )}

              {/* 关系标签 - 支持多个 */}
              <div className="flex flex-wrap justify-center gap-1 mt-2">
                {item.relationTypes.map((relationType) => {
                  const config = RELATION_CONFIG[relationType] || {
                    label: relationType,
                    color: 'bg-stone-50 text-stone-600 border-stone-100'
                  };
                  return (
                    <span
                      key={relationType}
                      className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${config.color}`}
                    >
                      {config.label}
                    </span>
                  );
                })}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
