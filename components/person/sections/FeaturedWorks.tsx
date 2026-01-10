'use client';

import { useState } from 'react';

interface Product {
  name: string;
  org: string;
  year: string;
  description: string;
  url?: string;
  icon?: string;
  stats?: string;
}

interface Paper {
  id: string;
  title: string;
  text: string;
  url: string;
  publishedAt: string | null;
  metadata: {
    venue?: string;
    citedByCount?: number;
    authors?: string[];
  };
}

interface TopicContribution {
  topic: string;
  rank: number;
  description?: string;
  paperCount?: number;
  citations?: number;
  quote?: { text: string; source: string };
}

interface FeaturedWorksProps {
  products?: Product[] | null;
  papers?: Paper[];
  topics?: string[];
  topicRanks?: Record<string, number> | null;
}

type TabKey = 'products' | 'papers' | 'topics';

// 排名徽章样式
function getRankBadgeStyle(rank: number): string {
  if (rank === 1) return 'bg-yellow-100 text-yellow-700';
  if (rank === 2) return 'bg-gray-100 text-gray-600';
  if (rank === 3) return 'bg-orange-100 text-orange-700';
  return 'bg-blue-50 text-blue-600';
}

function getRankLabel(rank: number): string {
  if (rank === 1) return '🥇 Top 1';
  if (rank === 2) return '🥈 Top 2';
  if (rank === 3) return '🥉 Top 3';
  return `Top ${rank}`;
}

// 话题颜色
const TOPIC_ICONS: Record<string, string> = {
  'Scaling': '📈',
  'Agent': '🤖',
  'RAG': '🔍',
  '推理': '🧠',
  '多模态': '🎨',
  '对齐': '🛡️',
  'AGI': '🌟',
  '大语言模型': '💬',
  '强化学习': '🎮',
  '开源': '🔓',
};

function getTopicIcon(topic: string): string {
  return TOPIC_ICONS[topic] || '📚';
}

// 格式化日期
function formatYear(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).getFullYear().toString();
  } catch {
    return '';
  }
}

export function FeaturedWorks({ products, papers, topics, topicRanks }: FeaturedWorksProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('products');

  // 检查各 tab 是否有内容
  const hasProducts = products && products.length > 0;
  const hasPapers = papers && papers.length > 0;
  const hasTopics = topics && topics.length > 0;

  // 如果没有任何内容，不渲染
  if (!hasProducts && !hasPapers && !hasTopics) {
    return null;
  }

  // 构建可用的 tabs
  const tabs: { key: TabKey; label: string; count?: number }[] = [];
  if (hasProducts) tabs.push({ key: 'products', label: '产品/项目', count: products!.length });
  if (hasPapers) tabs.push({ key: 'papers', label: '核心论文', count: papers!.length });
  if (hasTopics) tabs.push({ key: 'topics', label: '话题贡献', count: topics!.length });

  // 如果当前 tab 没有内容，切换到第一个有内容的 tab
  if (
    (activeTab === 'products' && !hasProducts) ||
    (activeTab === 'papers' && !hasPapers) ||
    (activeTab === 'topics' && !hasTopics)
  ) {
    setActiveTab(tabs[0]?.key || 'products');
  }

  // 生成话题贡献数据
  const topicContributions: TopicContribution[] = (topics || []).map(topic => ({
    topic,
    rank: topicRanks?.[topic] || 99,
  })).sort((a, b) => a.rank - b.rank);

  return (
    <section className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 标题栏 + Tabs */}
      <div className="px-5 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🏆</span>
            <h2 className="text-sm font-medium text-gray-900">代表作品</h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-5">
        {/* 产品/项目 */}
        {activeTab === 'products' && hasProducts && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products!.slice(0, 6).map((product, idx) => (
              <a
                key={idx}
                href={product.url || '#'}
                target={product.url ? '_blank' : undefined}
                rel={product.url ? 'noopener noreferrer' : undefined}
                className="block p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-lg">{product.icon || '🚀'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-900">{product.name}</h4>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{product.org} · {product.year}</p>
                    <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{product.description}</p>
                    {product.stats && (
                      <p className="text-xs text-orange-600 font-medium mt-1.5">{product.stats}</p>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* 核心论文 */}
        {activeTab === 'papers' && hasPapers && (
          <div className="space-y-3">
            {papers!.slice(0, 5).map(paper => (
              <a
                key={paper.id}
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border-l-4 border-green-400"
              >
                <h4 className="text-sm font-medium text-gray-900 line-clamp-2">{paper.title}</h4>
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{paper.text}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  {paper.metadata?.venue && <span>📍 {paper.metadata.venue}</span>}
                  {paper.metadata?.citedByCount && paper.metadata.citedByCount > 0 && (
                    <span className="text-orange-600 font-medium">
                      ⭐ {paper.metadata.citedByCount.toLocaleString()} 引用
                    </span>
                  )}
                  {paper.publishedAt && <span>{formatYear(paper.publishedAt)}</span>}
                </div>
              </a>
            ))}
          </div>
        )}

        {/* 话题贡献 - 横向滚动 */}
        {activeTab === 'topics' && hasTopics && (
          <div className="-mx-5 px-5">
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {topicContributions.slice(0, 6).map((item, idx) => (
                <div
                  key={idx}
                  className="flex-shrink-0 w-64 p-4 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">{getTopicIcon(item.topic)}</span>
                      <span className="text-sm font-semibold text-gray-900">{item.topic}</span>
                    </div>
                    {item.rank <= 10 && (
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRankBadgeStyle(item.rank)}`}>
                        {getRankLabel(item.rank)}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">{item.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {item.paperCount && <span>📄 {item.paperCount} 篇论文</span>}
                    {item.citations && <span>⭐ {item.citations.toLocaleString()} 引用</span>}
                  </div>
                </div>
              ))}
            </div>
            {topicContributions.length > 3 && (
              <p className="text-center text-xs text-gray-400 mt-2">← 左右滑动查看更多 →</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
