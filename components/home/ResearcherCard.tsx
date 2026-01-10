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

// 排名徽章
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="absolute -top-2 -left-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg z-10">
        <span className="text-white text-sm font-bold">1</span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="absolute -top-2 -left-2 w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center shadow-lg z-10">
        <span className="text-white text-sm font-bold">2</span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="absolute -top-2 -left-2 w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg z-10">
        <span className="text-white text-sm font-bold">3</span>
      </div>
    );
  }
  return null;
}

export function ResearcherCard({ person, rank, isHot }: ResearcherCardProps) {
  const roleLabel = person.roleCategory ? ROLE_LABELS[person.roleCategory] : null;
  const primaryOrg = person.organization[0] || '';
  const highlights = (person.highlights as Highlight[]) || [];

  return (
    <Link href={`/person/${person.id}`} className="block group">
      <div className="relative bg-white rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group-hover:-translate-y-1 group-hover:border-blue-200">
        {/* Rank Badge */}
        {rank && rank <= 3 && <RankBadge rank={rank} />}

        {/* Hot Badge */}
        {isHot && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full shadow-md z-10">
            本周热门
          </div>
        )}

        {/* Header: Avatar + Name + Org */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 shadow-inner">
            {person.avatarUrl ? (
              <Image
                src={person.avatarUrl}
                alt={person.name}
                fill
                className="object-cover object-top"
                sizes="56px"
                unoptimized
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-xl font-bold text-white"
                style={{ backgroundColor: getAvatarColor(person.name) }}
              >
                {person.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Name & Org */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
              {person.name}
            </h3>
            <p className="text-sm text-gray-500 truncate">{primaryOrg}</p>
            {roleLabel && (
              <span className="inline-block mt-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {roleLabel}
              </span>
            )}
          </div>
        </div>

        {/* Topics */}
        {person.topics && person.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {person.topics.slice(0, 3).map((topic, i) => (
              <span
                key={i}
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${getTopicColor(topic)}`}
              >
                {topic}
              </span>
            ))}
          </div>
        )}

        {/* Highlights */}
        {highlights.length > 0 && (
          <div className="space-y-1.5">
            {highlights.slice(0, 2).map((hl, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                <span className="flex-shrink-0">{hl.icon}</span>
                <span className="line-clamp-1">{hl.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Score indicator (subtle) */}
        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>{person.influenceScore.toFixed(1)}</span>
          </div>
          <span className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
            查看详情 &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
