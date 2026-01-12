'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';

interface Product {
  name: string;
  org: string;
  year: string;
  description: string;
  url?: string;
  icon?: string;
  stats?: string | { stars?: number; forks?: number };
  type?: 'product' | 'project' | 'opensource';  // 区分产品/项目/开源
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

interface TopicDetail {
  topic: string;
  rank: number;
  description?: string;
  paperCount?: number;
  citations?: number;
  quote?: { text: string; source: string; url?: string };
}

interface GithubRepo {
  id: string;
  url: string;
  title: string;
  text: string;
  metadata?: {
    stars?: number;
    forks?: number;
    language?: string;
    deepwikiSummary?: string;  // DeepWiki 生成的摘要
  };
}

interface FeaturedWorksProps {
  products?: Product[] | null;
  papers?: Paper[];
  topics?: string[];
  topicRanks?: Record<string, number> | null;
  topicDetails?: TopicDetail[] | null;
  personId?: string;  // 用于加载开源项目
  initialTab?: TabKey;  // 从 URL 初始化的 tab
  highlightTopic?: string | null;  // 需要高亮的话题
}

type TabKey = 'products' | 'papers' | 'topics';

// 排名徽章样式
function getRankBadgeStyle(rank: number): string {
  if (rank === 1) return 'bg-amber-50 text-amber-700 border border-amber-200';
  if (rank === 2) return 'bg-stone-50 text-stone-600 border border-stone-200';
  if (rank === 3) return 'bg-orange-50 text-orange-700 border border-orange-200';
  return 'bg-stone-50 text-stone-600 border border-stone-100';
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

export function FeaturedWorks({ products, papers, topics, topicRanks, topicDetails, personId, initialTab, highlightTopic }: FeaturedWorksProps) {
  const [showAllPapers, setShowAllPapers] = useState(false);
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const hasScrolled = useRef(false);

  // 检查各 tab 是否有内容 - 使用 useMemo 缓存计算结果
  const hasProducts = products && products.length > 0;
  const hasPapers = papers && papers.length > 0;
  const hasTopics = topics && topics.length > 0;
  // 产品 tab 现在也包含开源项目，所以如果有 personId 就总是显示（开源项目会动态加载）
  const hasProductsOrGithub = hasProducts || !!personId;

  // 构建可用的 tabs - 使用 useMemo 避免重复计算
  const tabs = useMemo(() => {
    const result: { key: TabKey; label: string; count?: number }[] = [];
    // 产品/项目 tab 始终显示（如果有 personId，因为可能有开源项目）
    if (hasProductsOrGithub) result.push({ key: 'products', label: '产品/项目' });
    if (hasPapers) result.push({ key: 'papers', label: '核心论文', count: papers?.length });
    if (hasTopics) result.push({ key: 'topics', label: '话题贡献', count: topics?.length });
    return result;
  }, [hasProductsOrGithub, hasPapers, hasTopics, papers?.length, topics?.length]);

  // 计算有效的初始 tab - 使用 useMemo 确保只在相关依赖变化时重新计算
  const validInitialTab = useMemo(() => {
    // 如果指定了 initialTab 且该 tab 可用，使用它
    if (initialTab && tabs.some(t => t.key === initialTab)) {
      return initialTab;
    }
    // 否则使用第一个可用的 tab
    return tabs[0]?.key || 'products';
  }, [initialTab, tabs]);

  const [activeTab, setActiveTab] = useState<TabKey>(validInitialTab);

  // 当 validInitialTab 变化时更新 activeTab（处理初始 tab 无效的情况）
  useEffect(() => {
    const isCurrentTabValid = tabs.some(t => t.key === activeTab);
    if (!isCurrentTabValid && tabs.length > 0) {
      setActiveTab(tabs[0].key);
    }
  }, [activeTab, tabs]);

  // 加载开源项目数据
  const loadGithubRepos = useCallback(async () => {
    if (!personId || githubRepos.length > 0) return;
    setLoadingRepos(true);
    try {
      const response = await fetch(`/api/person/${personId}/items?type=github&limit=6`);
      if (response.ok) {
        const result = await response.json();
        setGithubRepos(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load github repos:', error);
    } finally {
      setLoadingRepos(false);
    }
  }, [personId, githubRepos.length]);

  // 当切换到产品 tab 且有 personId 时加载开源项目
  useEffect(() => {
    if (activeTab === 'products' && personId) {
      loadGithubRepos();
    }
  }, [activeTab, personId, loadGithubRepos]);

  // 如果有 initialTab，滚动到该 section
  useEffect(() => {
    if (initialTab && sectionRef.current && !hasScrolled.current) {
      hasScrolled.current = true;
      // 延迟滚动，确保页面渲染完成
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [initialTab]);

  // 如果没有任何内容，不渲染
  if (!hasProductsOrGithub && !hasPapers && !hasTopics) {
    return null;
  }

  // 生成话题贡献数据：优先使用 topicDetails，否则从 topics + topicRanks 生成
  const topicContributions: TopicDetail[] = topicDetails && topicDetails.length > 0
    ? topicDetails.sort((a, b) => a.rank - b.rank)
    : (topics || []).map(topic => ({
        topic,
        rank: topicRanks?.[topic] || 99,
      })).sort((a, b) => a.rank - b.rank);

  return (
    <section ref={sectionRef} className="card-base overflow-hidden">
      {/* 标题栏 + Tabs */}
      <div className="px-5 py-3 border-b border-stone-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🏆</span>
            <h2 className="text-sm font-medium text-stone-900">代表作品</h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mt-3">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.key
                  ? 'gradient-btn shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-5">
        {/* 产品/项目（整合开源项目） */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* 产品/项目 */}
            {hasProducts && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products!.slice(0, 6).map((product, idx) => (
                  <a
                    key={idx}
                    href={product.url || '#'}
                    target={product.url ? '_blank' : undefined}
                    rel={product.url ? 'noopener noreferrer' : undefined}
                    className="block p-4 bg-stone-50 hover:bg-orange-50/50 rounded-xl transition-all hover:shadow-sm border border-transparent hover:border-orange-100"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--gradient-primary)' }}
                      >
                        <span className="text-white text-lg">{product.icon || '🚀'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-stone-900">{product.name}</h4>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">{product.org} · {product.year}</p>
                        <p className="text-xs text-stone-600 mt-1.5 line-clamp-2">{product.description}</p>
                        {product.stats && (
                          <p className="text-xs text-orange-600 font-medium mt-1.5">
                            {typeof product.stats === 'string'
                              ? product.stats
                              : `⭐ ${product.stats.stars?.toLocaleString() || 0}`}
                          </p>
                        )}
                        {product.url && (
                          <p className="text-xs text-blue-500 mt-2 flex items-center gap-1">
                            🔗 查看详情 →
                          </p>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* 开源项目 */}
            {(githubRepos.length > 0 || loadingRepos) && (
              <div>
                <h3 className="text-xs font-medium text-stone-500 mb-3 flex items-center gap-1.5">
                  <span>💻</span>
                  <span>开源项目</span>
                </h3>
                {loadingRepos ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-5 h-5 rounded-full animate-spin" style={{ border: '2px solid transparent', borderTopColor: '#f97316' }}></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {githubRepos.map(repo => (
                      <a
                        key={repo.id}
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-4 bg-stone-50 hover:bg-orange-50/50 rounded-xl transition-all hover:shadow-sm border border-transparent hover:border-orange-100"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-stone-900 truncate">{repo.title}</h4>
                            <p className="text-xs text-stone-600 mt-1 line-clamp-2">
                              {repo.metadata?.deepwikiSummary || repo.text}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
                              {repo.metadata?.language && (
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                  {repo.metadata.language}
                                </span>
                              )}
                              {repo.metadata?.stars && (
                                <span className="text-orange-600 font-medium">⭐ {repo.metadata.stars.toLocaleString()}</span>
                              )}
                              {repo.metadata?.forks && repo.metadata.forks > 0 && (
                                <span>🍴 {repo.metadata.forks.toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 无内容提示 */}
            {!hasProducts && githubRepos.length === 0 && !loadingRepos && (
              <div className="text-center py-8 text-stone-400">
                <div className="text-3xl mb-2">🏆</div>
                <div className="text-sm">暂无代表作品</div>
              </div>
            )}
          </div>
        )}

        {/* 核心论文 - 增强展示，默认显示2篇 */}
        {activeTab === 'papers' && hasPapers && (
          <div className="space-y-3">
            {(showAllPapers ? papers! : papers!.slice(0, 2)).map((paper, idx) => (
              <a
                key={paper.id}
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 bg-stone-50 hover:bg-emerald-50/50 rounded-xl transition-all hover:shadow-sm group"
              >
                <div className="flex gap-3">
                  {/* 论文图标 */}
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-100">
                    <span className="text-lg">📄</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-stone-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {paper.title}
                    </h4>
                    {/* 作者列表 - 高亮本人 */}
                    {paper.metadata?.authors && paper.metadata.authors.length > 0 && (
                      <p className="text-xs text-stone-500 mt-1 line-clamp-1">
                        {paper.metadata.authors.slice(0, 5).join(', ')}
                        {paper.metadata.authors.length > 5 && ', ...'}
                      </p>
                    )}
                    {/* 摘要 */}
                    {paper.text && (
                      <p className="text-xs text-stone-600 mt-1.5 line-clamp-2">{paper.text}</p>
                    )}
                    {/* 元信息 */}
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      {paper.metadata?.venue && (
                        <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-md">
                          {paper.metadata.venue}
                        </span>
                      )}
                      {paper.publishedAt && (
                        <span className="text-stone-400">{formatYear(paper.publishedAt)}</span>
                      )}
                      {paper.metadata?.citedByCount && paper.metadata.citedByCount > 0 && (
                        <span className="text-orange-600 font-semibold flex items-center gap-1">
                          ⭐ {paper.metadata.citedByCount.toLocaleString()} 引用
                        </span>
                      )}
                    </div>
                    {/* 链接提示 */}
                    <p className="text-xs text-blue-500 mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      🔗 查看论文 →
                    </p>
                  </div>
                </div>
              </a>
            ))}

            {/* 展开/收起按钮 */}
            {papers!.length > 2 && (
              <button
                onClick={() => setShowAllPapers(!showAllPapers)}
                className="w-full py-2 text-sm text-stone-500 hover:text-orange-600 transition-colors flex items-center justify-center gap-1"
              >
                {showAllPapers ? (
                  <>收起 <span className="text-xs">▲</span></>
                ) : (
                  <>查看更多 ({papers!.length - 2} 篇) <span className="text-xs">▼</span></>
                )}
              </button>
            )}
          </div>
        )}

        {/* 话题贡献 - 增强可视化，横向滚动卡片 */}
        {activeTab === 'topics' && hasTopics && (
          <div className="-mx-5 px-5">
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
              {topicContributions.slice(0, 6).map((item, idx) => {
                const isHighlighted = highlightTopic && item.topic === highlightTopic;
                return (
                <div
                  key={idx}
                  className={`flex-shrink-0 w-80 bg-gradient-to-br rounded-xl hover:shadow-lg transition-all group snap-start overflow-hidden ${
                    isHighlighted
                      ? 'from-orange-50 to-orange-100/50 border-2 border-orange-400 shadow-lg ring-2 ring-orange-200'
                      : 'from-stone-50 to-white border border-stone-100 hover:border-orange-200'
                  }`}
                >
                  {/* 卡片头部 */}
                  <div className="p-4 pb-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getTopicIcon(item.topic)}</span>
                        <span className="text-base font-bold text-stone-900">{item.topic}</span>
                      </div>
                      {item.rank <= 10 && (
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getRankBadgeStyle(item.rank)}`}>
                          {getRankLabel(item.rank)}
                        </span>
                      )}
                    </div>

                    {/* 话题描述 */}
                    {item.description && (
                      <p className="text-sm text-stone-600 line-clamp-2 leading-relaxed mb-3">{item.description}</p>
                    )}

                    {/* 统计数据 */}
                    <div className="flex items-center gap-4 text-xs text-stone-500 mb-3">
                      {item.paperCount && (
                        <span className="flex items-center gap-1">
                          📄 <span className="font-semibold text-stone-700">{item.paperCount}</span> 篇论文
                        </span>
                      )}
                      {item.citations && (
                        <span className="flex items-center gap-1">
                          ⭐ <span className="font-semibold text-orange-600">{item.citations.toLocaleString()}</span> 引用
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 话题金句 - 带链接 */}
                  {item.quote && (
                    <a
                      href={item.quote.url || '#'}
                      target={item.quote.url ? '_blank' : undefined}
                      rel={item.quote.url ? 'noopener noreferrer' : undefined}
                      className="block mx-4 mb-3 px-3 py-2.5 bg-amber-50/80 border-l-3 border-amber-400 rounded-r-lg hover:bg-amber-50 transition-colors cursor-pointer"
                      style={{ borderLeftWidth: '3px' }}
                    >
                      <p className="text-xs text-stone-700 italic line-clamp-2 leading-relaxed">
                        "{item.quote.text}"
                      </p>
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-stone-500">
                        {item.quote.url && <span className="text-blue-500">🔗</span>}
                        <span>{item.quote.source}</span>
                      </div>
                    </a>
                  )}

                  {/* 底部操作 */}
                  <div className="px-4 py-3 bg-stone-50/50 border-t border-stone-100">
                    <Link
                      href={`/?view=topic&topic=${encodeURIComponent(item.topic)}`}
                      className="flex items-center justify-between text-xs text-orange-600 hover:text-orange-700 font-medium group/link"
                    >
                      <span>进入学习路径</span>
                      <svg className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              );
              })}
            </div>
            {topicContributions.length > 2 && (
              <p className="text-center text-xs text-stone-400 mt-1">← 左右滑动查看更多 →</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
