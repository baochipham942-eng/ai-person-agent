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

const RELATION_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  advisor: { label: '导师', icon: '👨‍🏫', color: 'bg-purple-50 text-purple-700' },
  advisee: { label: '学生', icon: '👨‍🎓', color: 'bg-green-50 text-green-700' },
  cofounder: { label: '联合创始人', icon: '🤝', color: 'bg-orange-50 text-orange-700' },
  colleague: { label: '同事', icon: '👥', color: 'bg-blue-50 text-blue-700' },
  collaborator: { label: '合作者', icon: '🔗', color: 'bg-cyan-50 text-cyan-700' },
  successor: { label: '继任者', icon: '➡️', color: 'bg-gray-50 text-gray-700' },
};

export function RelatedPeople({ relations }: RelatedPeopleProps) {
  if (!relations || relations.length === 0) return null;

  // 按关系类型分组
  const grouped = relations.reduce((acc, rel) => {
    const type = rel.relationType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(rel);
    return acc;
  }, {} as Record<string, Relation[]>);

  return (
    <section className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span className="text-blue-600">👥</span>
        关联人物
      </h2>

      <div className="space-y-4">
        {Object.entries(grouped).map(([type, rels]) => {
          const config = RELATION_CONFIG[type] || { label: type, icon: '👤', color: 'bg-gray-50 text-gray-700' };

          return (
            <div key={type}>
              <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                <span>{config.icon}</span>
                <span>{config.label}</span>
                <span className="text-gray-400">({rels.length})</span>
              </h3>

              <div className="flex flex-wrap gap-3">
                {rels.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/person/${rel.relatedPerson.id}`}
                    className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-xl hover:bg-blue-50 hover:shadow-sm transition-all group"
                  >
                    {/* 头像 */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                      {rel.relatedPerson.avatarUrl ? (
                        <img
                          src={rel.relatedPerson.avatarUrl}
                          alt={rel.relatedPerson.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(rel.relatedPerson.name)}&background=3b82f6&color=fff&size=80`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-medium">
                          {rel.relatedPerson.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* 信息 */}
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        {rel.relatedPerson.name}
                      </div>
                      {rel.relatedPerson.organization?.[0] && (
                        <div className="text-xs text-gray-500 truncate">
                          {rel.relatedPerson.organization[0]}
                        </div>
                      )}
                    </div>

                    {/* 箭头 */}
                    <svg
                      className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
