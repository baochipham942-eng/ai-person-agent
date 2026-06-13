'use client';

import { getDirectoryTopicIcon } from '@/lib/person-directory-config';

interface TopicDetail {
  topic: string;
  rank: number;
  reason?: string;
  quote?: { text: string; source: string; url?: string };
}

interface TopicRankingProps {
  topics: string[];
  topicRanks: Record<string, number> | null;
  topicDetails?: TopicDetail[] | null;
}

export function TopicRanking({ topics, topicRanks, topicDetails }: TopicRankingProps) {
  if (!topics || topics.length === 0) return null;

  // 构建 topic -> detail 映射
  const detailsMap = new Map(
    (topicDetails || []).map(d => [d.topic, d])
  );

  return (
    <section className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span className="text-blue-600">🏆</span>
        话题贡献
      </h2>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 hide-scrollbar">
        {topics.map((topic) => {
          const detail = detailsMap.get(topic);
          const rank = detail?.rank || topicRanks?.[topic];
          const reason = detail?.reason;
          const icon = getDirectoryTopicIcon(topic);

          return (
            <div
              key={topic}
              className="flex-shrink-0 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 min-w-[180px] max-w-[220px] border border-blue-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{icon}</span>
                <span className="text-sm font-medium text-gray-700">{topic}</span>
              </div>
              {rank && rank < 99 && (
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold text-blue-600">#{rank}</span>
                  <span className="text-xs text-gray-400">全球排名</span>
                </div>
              )}
              {(!rank || rank >= 99) && (
                <div className="text-xs text-gray-400 mb-2">贡献者</div>
              )}
              {reason && (
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                  {reason}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
