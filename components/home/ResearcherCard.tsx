'use client';

import Link from 'next/link';
import Image from 'next/image';

interface Highlight {
  icon: string;
  text: string;
}

interface ResearcherCardProps {
  person: {
    id: string;
    name: string;
    avatarUrl: string | null;
    organization: string[];
    topics: string[];
    highlights: Highlight[] | null;
    roleCategory: string | null;
    influenceScore: number;
  };
  rank?: number;
  isHot?: boolean;
}

// 根据名字生成一致的颜色
function getAvatarColor(name: string): string {
  const colors = [
    '#4F46E5', '#7C3AED', '#2563EB', '#0891B2',
    '#059669', '#D97706', '#DC2626', '#DB2777'
  ];
  const charCode = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  return colors[charCode % colors.length];
}

// 角色分类中文映射
const ROLE_LABELS: Record<string, string> = {
  researcher: '研究科学家',
  founder: '创始人/CEO',
  engineer: '工程师',
  professor: '教授',
  evangelist: '布道者'
};

// 话题颜色映射
const TOPIC_COLORS: Record<string, string> = {
  'RAG': 'bg-purple-100 text-purple-700',
  'Agent': 'bg-blue-100 text-blue-700',
  '推理': 'bg-green-100 text-green-700',
  '多模态': 'bg-orange-100 text-orange-700',
  '对齐': 'bg-red-100 text-red-700',
  'Scaling': 'bg-cyan-100 text-cyan-700',
  '大语言模型': 'bg-indigo-100 text-indigo-700',
  'Transformer': 'bg-pink-100 text-pink-700',
  '开源': 'bg-emerald-100 text-emerald-700',
  'AGI': 'bg-rose-100 text-rose-700',
  '强化学习': 'bg-amber-100 text-amber-700',
  '计算机视觉': 'bg-teal-100 text-teal-700',
  '芯片': 'bg-slate-100 text-slate-700',
  '基础设施': 'bg-zinc-100 text-zinc-700',
  '产品': 'bg-sky-100 text-sky-700',
};

function getTopicColor(topic: string): string {
  return TOPIC_COLORS[topic] || 'bg-gray-100 text-gray-700';
}

// 排名徽章 - 更小巧
function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, string> = {
    1: 'bg-yellow-500',
    2: 'bg-gray-400',
    3: 'bg-orange-400',
  };
  if (rank > 3) return null;
  return (
    <div className={`absolute -top-1 -left-1 w-5 h-5 ${colors[rank]} rounded-full flex items-center justify-center z-10 text-[10px] font-bold text-white shadow`}>
      {rank}
    </div>
  );
}

export function ResearcherCard({ person, rank, isHot }: ResearcherCardProps) {
  const roleLabel = person.roleCategory ? ROLE_LABELS[person.roleCategory] : null;
  const primaryOrg = person.organization[0] || '';
  const highlights = (person.highlights as Highlight[]) || [];

  return (
    <Link href={`/person/${person.id}`} className="block group">
      <div className="relative bg-white rounded-xl p-3.5 hover:shadow-md transition-all duration-200 border border-gray-100 group-hover:border-gray-200">
        {/* Rank Badge */}
        {rank && rank <= 3 && <RankBadge rank={rank} />}

        {/* Hot Badge */}
        {isHot && (
          <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded z-10">
            热门
          </div>
        )}

        {/* Header: Avatar + Name + Org */}
        <div className="flex items-start gap-2.5 mb-2.5">
          {/* Avatar */}
          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {person.avatarUrl ? (
              <Image
                src={person.avatarUrl}
                alt={person.name}
                fill
                className="object-cover object-top"
                sizes="40px"
                unoptimized
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-sm font-semibold text-white"
                style={{ backgroundColor: getAvatarColor(person.name) }}
              >
                {person.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Name & Org */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
              {person.name}
            </h3>
            <p className="text-xs text-gray-500 truncate">{primaryOrg}</p>
            {roleLabel && (
              <span className="inline-block mt-0.5 text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                {roleLabel}
              </span>
            )}
          </div>
        </div>

        {/* Topics */}
        {person.topics && person.topics.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {person.topics.slice(0, 3).map((topic, i) => (
              <span
                key={i}
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getTopicColor(topic)}`}
              >
                {topic}
              </span>
            ))}
          </div>
        )}

        {/* Highlights - 只显示1条 */}
        {highlights.length > 0 && (
          <div className="mb-2">
            <div className="flex items-start gap-1 text-[11px] text-gray-600">
              <span className="flex-shrink-0 text-[10px]">{highlights[0].icon}</span>
              <span className="line-clamp-1">{highlights[0].text}</span>
            </div>
          </div>
        )}

        {/* Footer - 更紧凑 */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <div className="flex items-center gap-0.5 text-[10px] text-gray-400">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>{person.influenceScore.toFixed(1)}</span>
          </div>
          <span className="text-[10px] text-gray-400 group-hover:text-blue-500 transition-colors">
            详情 →
          </span>
        </div>
      </div>
    </Link>
  );
}
