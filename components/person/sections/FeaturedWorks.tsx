'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';

interface Product {
  name: string;
  org?: string;
  year?: string | number;
  description: string;
  url?: string;
  icon?: string;
  logo?: string;        // 产品 Logo URL
  category?: string;    // 产品类别: AI Model, Platform, Tool, Framework, Service
  stats?: {
    users?: string;     // 用户数: "10M+", "1B+"
    revenue?: string;   // 营收: "$1B ARR"
    valuation?: string; // 估值
    downloads?: string; // 下载量
  };
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

interface Card {
  id: string;
  type: string;
  title: string;
  content: string;
  tags: string[];
  importance: number;
}

interface BlogItem {
  id: string;
  url: string;
  title: string;
  text: string;
  publishedAt: string | null;
  metadata?: {
    domain?: string;
  };
}

interface PodcastItem {
  id: string;
  url: string;
  title: string;
  text: string;
  publishedAt: string | null;
  metadata?: {
    domain?: string;
    duration?: string;
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
  cards?: Card[];  // 学习卡片
  podcastCount?: number;  // 播客数量
  githubCount?: number;  // GitHub 开源项目数量
  blogCount?: number;    // 博客文章数量
}

type TabKey = 'products' | 'opensource' | 'papers' | 'topics' | 'cards' | 'blogs' | 'podcast';

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

// 从 URL 获取 Google Favicon
function getGoogleFavicon(url: string | undefined, size: number = 128): string | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=${size}`;
  } catch {
    return null;
  }
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

// 卡片类型配置
const CARD_TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  insight: { icon: '💡', label: '核心洞见', color: 'border-l-blue-400' },
  quote: { icon: '💬', label: '金句', color: 'border-l-purple-400' },
  story: { icon: '📖', label: '故事', color: 'border-l-orange-400' },
  method: { icon: '🔧', label: '方法论', color: 'border-l-green-400' },
  fact: { icon: '📊', label: '事实', color: 'border-l-cyan-400' },
};

export function FeaturedWorks({ products, papers, topics, topicRanks, topicDetails, personId, initialTab, highlightTopic, cards, podcastCount, githubCount, blogCount }: FeaturedWorksProps) {
  const [showAllPapers, setShowAllPapers] = useState(false);
  const [showAllCards, setShowAllCards] = useState(false);
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [blogItems, setBlogItems] = useState<BlogItem[]>([]);
  const [podcastItems, setPodcastItems] = useState<PodcastItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [loadingPodcast, setLoadingPodcast] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const hasScrolled = useRef(false);

  // 过滤真正的产品（排除 GitHub 仓库类型）并按年份降序排序
  const realProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    return products
      .filter(p => {
        // 排除 GitHub 类型的数据（这些应该在开源项目 Tab 显示）
        const isGithub = (p as any).type === 'github' ||
                         (p.url && p.url.includes('github.com'));
        return !isGithub;
      })
      .sort((a, b) => {
        // 按年份降序排序（最新的在前）
        const yearA = typeof a.year === 'string' ? parseInt(a.year) : (a.year || 0);
        const yearB = typeof b.year === 'string' ? parseInt(b.year) : (b.year || 0);
        return yearB - yearA;
      });
  }, [products]);

  // 检查各 tab 是否有内容 - 使用 useMemo 缓存计算结果
  const hasProducts = realProducts.length > 0;
  const hasPapers = papers && papers.length > 0;
  const hasTopics = topics && topics.length > 0;
  const hasCards = cards && cards.length > 0;
  // 开源项目、博客、播客通过 personId 动态加载
  // 只有当确实有数据时才显示对应 Tab
  const hasOpensource = !!personId && (githubCount ?? 0) > 0;
  const hasBlogs = !!personId && (blogCount ?? 0) > 0;
  const hasPodcast = (podcastCount ?? 0) > 0;

  // 构建可用的 tabs - 使用 useMemo 避免重复计算
  const tabs = useMemo(() => {
    const result: { key: TabKey; label: string; count?: number }[] = [];
    // 产品 tab（只显示真正的产品）
    if (hasProducts) result.push({ key: 'products', label: '代表产品' });
    // 开源项目 tab
    if (hasOpensource) result.push({ key: 'opensource', label: '开源项目' });
    if (hasPapers) result.push({ key: 'papers', label: '核心论文', count: papers?.length });
    if (hasTopics) result.push({ key: 'topics', label: '话题贡献', count: topics?.length });
    // 学习卡片 tab
    if (hasCards) result.push({ key: 'cards', label: '学习卡片', count: cards?.length });
    // 博客 tab
    if (hasBlogs) result.push({ key: 'blogs', label: '博客' });
    // 播客 tab
    if (hasPodcast) result.push({ key: 'podcast', label: '播客', count: podcastCount });
    return result;
  }, [hasProducts, hasOpensource, hasPapers, hasTopics, hasCards, hasBlogs, hasPodcast, papers?.length, topics?.length, cards?.length, podcastCount]);

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

  // 加载博客数据
  const loadBlogItems = useCallback(async () => {
    if (!personId || blogItems.length > 0) return;
    setLoadingBlogs(true);
    try {
      const response = await fetch(`/api/person/${personId}/items?type=exa&limit=10`);
      if (response.ok) {
        const result = await response.json();
        setBlogItems(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load blog items:', error);
    } finally {
      setLoadingBlogs(false);
    }
  }, [personId, blogItems.length]);

  // 当切换到开源项目 tab 时加载 GitHub 仓库
  useEffect(() => {
    if (activeTab === 'opensource' && personId) {
      loadGithubRepos();
    }
  }, [activeTab, personId, loadGithubRepos]);

  // 当切换到博客 tab 时加载博客
  useEffect(() => {
    if (activeTab === 'blogs' && personId) {
      loadBlogItems();
    }
  }, [activeTab, personId, loadBlogItems]);

  // 加载播客数据
  const loadPodcastItems = useCallback(async () => {
    if (!personId || podcastItems.length > 0) return;
    setLoadingPodcast(true);
    try {
      const response = await fetch(`/api/person/${personId}/items?type=podcast&limit=20`);
      if (response.ok) {
        const result = await response.json();
        setPodcastItems(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load podcast items:', error);
    } finally {
      setLoadingPodcast(false);
    }
  }, [personId, podcastItems.length]);

  // 当切换到播客 tab 时加载播客
  useEffect(() => {
    if (activeTab === 'podcast' && personId) {
      loadPodcastItems();
    }
  }, [activeTab, personId, loadPodcastItems]);

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
  if (!hasProducts && !hasOpensource && !hasPapers && !hasTopics && !hasCards && !hasBlogs && !hasPodcast) {
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
        {/* 代表产品 */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            {hasProducts ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {realProducts.slice(0, 6).map((product, idx) => {
                  // 优先使用 logo，其次从 url 获取 favicon，最后用 emoji
                  const logoUrl = product.logo || getGoogleFavicon(product.url);
                  return (
                  <a
                    key={idx}
                    href={product.url || '#'}
                    target={product.url ? '_blank' : undefined}
                    rel={product.url ? 'noopener noreferrer' : undefined}
                    className="block p-4 bg-gradient-to-br from-stone-50 to-white hover:from-orange-50/50 hover:to-white rounded-xl transition-all hover:shadow-md border border-stone-100 hover:border-orange-200 group"
                  >
                    <div className="flex items-start gap-3">
                      {/* 产品 Logo/Icon - 优先用 logo，其次 Google Favicon，最后 emoji - 懒加载 */}
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={product.name}
                          className="w-12 h-12 rounded-xl object-contain flex-shrink-0 border border-stone-100 bg-white p-1"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            // favicon 加载失败时隐藏图片，显示 fallback
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${logoUrl ? 'hidden' : ''}`}
                        style={{ background: 'var(--gradient-primary)' }}
                      >
                        <span className="text-white text-xl">{product.icon || '🚀'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-stone-900 group-hover:text-orange-600 transition-colors">{product.name}</h4>
                          {product.category && (
                            <span className="px-1.5 py-0.5 bg-stone-100 text-stone-500 text-[10px] rounded-md">
                              {product.category}
                            </span>
                          )}
                        </div>
                        {(product.org || product.year) && (
                          <p className="text-xs text-stone-500 mt-0.5">
                            {product.org}{product.org && product.year ? ' · ' : ''}{product.year}
                          </p>
                        )}
                        <p className="text-xs text-stone-600 mt-1.5 line-clamp-2">{product.description}</p>
                        {/* 产品数据展示 */}
                        {product.stats && (
                          <div className="flex items-center gap-3 mt-2 text-xs">
                            {product.stats.users && (
                              <span className="text-orange-600 font-medium">👥 {product.stats.users}</span>
                            )}
                            {product.stats.revenue && (
                              <span className="text-emerald-600 font-medium">💰 {product.stats.revenue}</span>
                            )}
                            {product.stats.downloads && (
                              <span className="text-blue-600 font-medium">⬇️ {product.stats.downloads}</span>
                            )}
                          </div>
                        )}
                        {product.url && (
                          <p className="text-xs text-blue-500 mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            🔗 查看详情 →
                          </p>
                        )}
                      </div>
                    </div>
                  </a>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-stone-400">
                <div className="text-3xl mb-2">🚀</div>
                <div className="text-sm">暂无代表产品信息</div>
                <p className="text-xs text-stone-400 mt-1">产品信息正在补充中...</p>
              </div>
            )}
          </div>
        )}

        {/* 开源项目 */}
        {activeTab === 'opensource' && (
          <div className="space-y-4">
            {loadingRepos ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 rounded-full animate-spin" style={{ border: '2px solid transparent', borderTopColor: '#f97316' }}></div>
              </div>
            ) : githubRepos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {githubRepos.map(repo => (
                  <a
                    key={repo.id}
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 bg-stone-50 hover:bg-orange-50/50 rounded-xl transition-all hover:shadow-sm border border-transparent hover:border-orange-100 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-stone-900 truncate group-hover:text-orange-600 transition-colors">{repo.title}</h4>
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
            ) : (
              <div className="text-center py-8 text-stone-400">
                <div className="text-3xl mb-2">💻</div>
                <div className="text-sm">暂无开源项目</div>
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

        {/* 学习卡片 */}
        {activeTab === 'cards' && (
          <div className="space-y-6">
            {hasCards ? (
              <>
                {(() => {
                  const DEFAULT_VISIBLE_COUNT = 4;
                  const displayCards = showAllCards ? cards! : cards!.slice(0, DEFAULT_VISIBLE_COUNT);
                  const hasMoreCards = cards!.length > DEFAULT_VISIBLE_COUNT;

                  // 按类型分组
                  const groupedCards = displayCards.reduce((acc, card) => {
                    if (!acc[card.type]) acc[card.type] = [];
                    acc[card.type].push(card);
                    return acc;
                  }, {} as Record<string, Card[]>);

                  return (
                    <>
                      {Object.entries(groupedCards).map(([type, typeCards]) => {
                        const config = CARD_TYPE_CONFIG[type] || CARD_TYPE_CONFIG.insight;
                        const totalCount = cards!.filter(c => c.type === type).length;
                        return (
                          <div key={type}>
                            <h3 className="text-sm font-medium text-stone-500 mb-3 flex items-center gap-1.5">
                              <span>{config.icon}</span>
                              <span>{config.label}</span>
                              <span className="text-stone-400">({totalCount})</span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {typeCards.map(card => (
                                <div
                                  key={card.id}
                                  className={`bg-stone-50 rounded-xl p-4 border-l-4 ${config.color} hover:shadow-md transition-all hover:bg-orange-50/30`}
                                >
                                  <div className="flex items-center gap-2 text-sm text-stone-500 mb-2">
                                    <span>{config.icon}</span>
                                    <span>{config.label}</span>
                                  </div>
                                  <h4 className="font-medium text-stone-900 mb-2">{card.title}</h4>
                                  <p className="text-sm text-stone-600 line-clamp-3">{card.content}</p>
                                  {card.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-3">
                                      {card.tags.slice(0, 3).map((tag, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-stone-100 text-stone-500 text-xs rounded-full border border-stone-200">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* 展开/收起按钮 */}
                      {hasMoreCards && (
                        <button
                          onClick={() => setShowAllCards(!showAllCards)}
                          className="w-full py-2.5 text-sm text-stone-500 hover:text-orange-600 transition-colors flex items-center justify-center gap-1 border-t border-stone-100 mt-4"
                        >
                          {showAllCards ? (
                            <>收起 <span className="text-xs">▲</span></>
                          ) : (
                            <>展开更多 ({cards!.length - DEFAULT_VISIBLE_COUNT} 条) <span className="text-xs">▼</span></>
                          )}
                        </button>
                      )}
                    </>
                  );
                })()}
              </>
            ) : (
              <div className="text-center py-8 text-stone-400">
                <div className="text-3xl mb-2">💡</div>
                <div className="text-sm">暂无学习卡片</div>
              </div>
            )}
          </div>
        )}

        {/* 博客 */}
        {activeTab === 'blogs' && (
          <div className="space-y-4">
            {loadingBlogs ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 rounded-full animate-spin" style={{ border: '2px solid transparent', borderTopColor: '#f97316' }}></div>
              </div>
            ) : blogItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {blogItems.map(item => {
                  const domain = item.metadata?.domain || (item.url ? new URL(item.url).hostname : '');
                  return (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-stone-50 rounded-xl p-4 hover:shadow-md transition-all hover:bg-orange-50/30 border border-transparent hover:border-orange-100"
                    >
                      <h4 className="font-medium text-stone-900 line-clamp-2">{item.title}</h4>
                      <p className="text-sm text-stone-500 line-clamp-2 mt-1">{item.text}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
                        <span>🌐 {domain}</span>
                        {item.publishedAt && (
                          <span>{formatYear(item.publishedAt)}</span>
                        )}
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-stone-400">
                <div className="text-3xl mb-2">📝</div>
                <div className="text-sm">暂无博客文章</div>
              </div>
            )}
          </div>
        )}

        {/* 播客 */}
        {activeTab === 'podcast' && (
          <div className="space-y-4">
            {loadingPodcast ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 rounded-full animate-spin" style={{ border: '2px solid transparent', borderTopColor: '#f97316' }}></div>
              </div>
            ) : podcastItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {podcastItems.map(item => {
                  const domain = item.metadata?.domain || (item.url ? new URL(item.url).hostname : '');
                  return (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-stone-50 rounded-xl p-4 hover:shadow-md transition-all hover:bg-orange-50/30 border border-transparent hover:border-orange-100"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">🎙️</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-stone-900 line-clamp-2">{item.title}</h4>
                          <p className="text-sm text-stone-500 line-clamp-2 mt-1">{item.text}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
                            <span>🌐 {domain}</span>
                            {item.metadata?.duration && (
                              <span>⏱️ {item.metadata.duration}</span>
                            )}
                            {item.publishedAt && (
                              <span>{formatYear(item.publishedAt)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-stone-400">
                <div className="text-3xl mb-2">🎙️</div>
                <div className="text-sm">暂无播客内容</div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
