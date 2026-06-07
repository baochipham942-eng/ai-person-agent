'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface RawPoolItem {
  id: string;
  sourceType: string;
  url: string;
  title: string;
  text: string;
  publishedAt: string | null;
  metadata: any;
}

interface Card {
  id: string;
  type: string;
  title: string;
  content: string;
  tags: string[];
  importance: number;
}

interface ContentTabsProps {
  personId: string;
  cards: Card[];
  sourceTypeCounts: Record<string, number>;
  officialLinks: any[];
}

type VideoCategory = 'all' | 'self_talk' | 'interview' | 'analysis';

// Tab 配置 - 只保留播客，学习卡片已移动到代表作品模块
const TAB_CONFIG: Record<string, { icon: string; label: string }> = {
  podcast: { icon: '🎙️', label: '播客' },
};

// 卡片类型配置
const CARD_TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  insight: { icon: '💡', label: '核心洞见', color: 'border-l-blue-400' },
  quote: { icon: '💬', label: '金句', color: 'border-l-purple-400' },
  story: { icon: '📖', label: '故事', color: 'border-l-orange-400' },
  method: { icon: '🔧', label: '方法论', color: 'border-l-green-400' },
  fact: { icon: '📊', label: '事实', color: 'border-l-cyan-400' },
};

// 视频分类配置
const VIDEO_CATEGORY_CONFIG: Record<VideoCategory, { label: string }> = {
  all: { label: '全部' },
  self_talk: { label: '本人演讲' },
  interview: { label: '访谈对话' },
  analysis: { label: '相关分析' },
};

// 提取 YouTube 视频 ID
function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '');
    if (hostname === 'youtu.be') {
      return parsed.pathname.split('/').filter(Boolean)[0] || null;
    }
    if (hostname.endsWith('youtube.com')) {
      const fromQuery = parsed.searchParams.get('v');
      if (fromQuery) return fromQuery;
      const match = parsed.pathname.match(/\/(?:shorts|embed|live)\/([^/?#]+)/);
      return match?.[1] || null;
    }
  } catch {
    const match = url.match(/(?:v=|youtu\.be\/|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{6,})/);
    return match?.[1] || null;
  }
  return null;
}

// 格式化日期
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

// 卡片组件
const CardItem = ({ card }: { card: Card }) => {
  const config = CARD_TYPE_CONFIG[card.type] || CARD_TYPE_CONFIG.insight;

  return (
    <div className={`bg-stone-50 rounded-xl p-4 border-l-4 ${config.color} hover:shadow-md transition-all hover:bg-orange-50/30`}>
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
  );
};

// YouTube 视频组件
const VideoItem = ({ item }: { item: RawPoolItem }) => {
  const videoId = item.metadata?.videoId || extractVideoId(item.url);
  const thumbnailUrl = item.metadata?.thumbnailUrl || (videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : null);
  const category = item.metadata?.videoCategory;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-stone-50 rounded-xl overflow-hidden hover:shadow-md transition-all border border-transparent hover:border-orange-100"
    >
      {/* 缩略图 */}
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-stone-400">
          <svg className="w-9 h-9 text-stone-300" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span className="text-xs font-medium line-clamp-2">{item.title || '视频内容'}</span>
        </div>
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        {/* 播放按钮 */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        {/* 分类标签 */}
        {category && category !== 'analysis' && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-xs rounded-md">
            {VIDEO_CATEGORY_CONFIG[category as VideoCategory]?.label || category}
          </div>
        )}
      </div>
      {/* 信息 */}
      <div className="p-3">
        <h4 className="font-medium text-stone-900 text-sm line-clamp-2 group-hover:text-orange-600 transition-colors">
          {item.title}
        </h4>
        {item.publishedAt && (
          <div className="text-xs text-stone-400 mt-1">{formatDate(item.publishedAt)}</div>
        )}
      </div>
    </a>
  );
};

// X 推文组件
const XPostItem = ({ item }: { item: RawPoolItem }) => {
  // 过滤纯链接内容
  if (item.text && /^https?:\/\/\S+$/.test(item.text.trim())) {
    return null;
  }

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-stone-50 rounded-xl p-4 hover:shadow-md transition-all border-l-4 hover:bg-orange-50/30"
      style={{ borderLeftColor: '#1c1917' }}
    >
      <p className="text-stone-700 text-sm line-clamp-4 whitespace-pre-wrap">{item.text || item.title}</p>
      {item.publishedAt && (
        <div className="text-xs text-stone-400 mt-2">{formatDate(item.publishedAt)}</div>
      )}
    </a>
  );
};

// GitHub 仓库组件
const GithubRepoItem = ({ item }: { item: RawPoolItem }) => {
  const stars = item.metadata?.stars || 0;
  const language = item.metadata?.language;
  const forks = item.metadata?.forks || 0;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-stone-50 rounded-xl p-4 hover:shadow-md transition-all hover:bg-orange-50/30 border border-transparent hover:border-orange-100"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-stone-900 truncate">{item.title}</h4>
          <p className="text-sm text-stone-500 line-clamp-2 mt-1">{item.text}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-stone-400">
            {language && (
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                {language}
              </span>
            )}
            <span className="flex items-center gap-1 text-orange-600">
              ⭐ {stars.toLocaleString()}
            </span>
            {forks > 0 && (
              <span className="flex items-center gap-1">
                🍴 {forks.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
};

// 论文组件
const PaperItem = ({ item }: { item: RawPoolItem }) => {
  const citedBy = item.metadata?.citedByCount || 0;
  const venue = item.metadata?.venue;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-stone-50 rounded-xl p-4 hover:shadow-md transition-all border-l-4 border-l-emerald-400 hover:bg-emerald-50/30"
    >
      <h4 className="font-medium text-stone-900 line-clamp-2">{item.title}</h4>
      <p className="text-sm text-stone-500 line-clamp-2 mt-1">{item.text}</p>
      <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
        {venue && <span>📍 {venue}</span>}
        {citedBy > 0 && <span className="text-orange-600 font-medium">📚 被引用 {citedBy}</span>}
        {item.publishedAt && <span>{formatDate(item.publishedAt)}</span>}
      </div>
    </a>
  );
};

// 文章组件
const ArticleItem = ({ item }: { item: RawPoolItem }) => {
  const domain = item.metadata?.domain || (item.url ? new URL(item.url).hostname : '');

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-stone-50 rounded-xl p-4 hover:shadow-md transition-all hover:bg-orange-50/30 border border-transparent hover:border-orange-100"
    >
      <h4 className="font-medium text-stone-900 line-clamp-2">{item.title}</h4>
      <p className="text-sm text-stone-500 line-clamp-2 mt-1">{item.text}</p>
      <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
        <span>🌐 {domain}</span>
        {item.publishedAt && <span>{formatDate(item.publishedAt)}</span>}
      </div>
    </a>
  );
};

export function ContentTabs({ personId, cards, sourceTypeCounts, officialLinks }: ContentTabsProps) {
  const [activeTab, setActiveTab] = useState('podcast');
  const [loadedItems, setLoadedItems] = useState<Record<string, RawPoolItem[]>>({});
  const [loadingTab, setLoadingTab] = useState<string | null>(null);
  const [videoFilter, setVideoFilter] = useState<VideoCategory>('all');
  const [showAllCards, setShowAllCards] = useState(false);  // 控制学习卡片展开/收起

  // 确定要显示的 tabs - 只显示播客
  const availableTabs = [
    ...Object.entries(sourceTypeCounts || {})
      .filter(([_, count]) => count > 0)
      .map(([key, count]) => ({ key, count }))
  ].filter(tab => TAB_CONFIG[tab.key]);

  // 追踪已加载过的 tab 类型，避免重复请求
  const loadedTabsRef = useRef<Set<string>>(new Set());

  // 加载 tab 内容 - 移除对 loadedItems 的依赖以避免无限循环
  const loadItemsForType = useCallback(async (type: string) => {
    if (type === 'cards' || loadedTabsRef.current.has(type)) return;

    // 标记为已加载（即使失败也不重试，避免无限循环）
    loadedTabsRef.current.add(type);
    setLoadingTab(type);
    try {
      const response = await fetch(`/api/person/${personId}/items?type=${type}&limit=50`);
      if (response.ok) {
        const result = await response.json();
        setLoadedItems(prev => ({ ...prev, [type]: result.data || [] }));
      }
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoadingTab(null);
    }
  }, [personId]);

  // 切换 tab 时加载数据
  useEffect(() => {
    if (activeTab !== 'cards') {
      loadItemsForType(activeTab);
    }
  }, [activeTab, loadItemsForType]);

  // 获取当前 tab 的内容
  const currentItems = loadedItems[activeTab] || [];

  // YouTube 视频筛选
  const filteredYouTubeItems = activeTab === 'youtube' && videoFilter !== 'all'
    ? currentItems.filter(item => item.metadata?.videoCategory === videoFilter)
    : currentItems;

  // 渲染内容
  const renderContent = () => {
    if (loadingTab === activeTab) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '3px solid transparent', borderTopColor: '#f97316', borderRightColor: '#ec4899' }}></div>
        </div>
      );
    }

    if (activeTab === 'cards') {
      if (cards.length === 0) {
        return (
          <div className="text-center py-12 text-stone-400">
            <div className="text-4xl mb-2">💡</div>
            <div>暂无学习卡片</div>
          </div>
        );
      }

      // 默认显示4个卡片（2行），展开后显示全部
      const DEFAULT_VISIBLE_COUNT = 4;
      const displayCards = showAllCards ? cards : cards.slice(0, DEFAULT_VISIBLE_COUNT);
      const hasMoreCards = cards.length > DEFAULT_VISIBLE_COUNT;

      // 按类型分组（用于展示的卡片）
      const groupedCards = displayCards.reduce((acc, card) => {
        if (!acc[card.type]) acc[card.type] = [];
        acc[card.type].push(card);
        return acc;
      }, {} as Record<string, Card[]>);

      return (
        <div className="space-y-6">
          {Object.entries(groupedCards).map(([type, typeCards]) => {
            const config = CARD_TYPE_CONFIG[type] || CARD_TYPE_CONFIG.insight;
            // 计算该类型的总数（用于显示）
            const totalCount = cards.filter(c => c.type === type).length;
            return (
              <div key={type}>
                <h3 className="text-sm font-medium text-stone-500 mb-3 flex items-center gap-1.5">
                  <span>{config.icon}</span>
                  <span>{config.label}</span>
                  <span className="text-stone-400">({totalCount})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {typeCards.map(card => (
                    <CardItem key={card.id} card={card} />
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
                <>展开更多 ({cards.length - DEFAULT_VISIBLE_COUNT} 条) <span className="text-xs">▼</span></>
              )}
            </button>
          )}
        </div>
      );
    }

    const items = activeTab === 'youtube' ? filteredYouTubeItems : currentItems;

    if (items.length === 0) {
      return (
        <div className="text-center py-12 text-stone-400">
          <div className="text-4xl mb-2">{TAB_CONFIG[activeTab]?.icon || '📄'}</div>
          <div>暂无内容</div>
        </div>
      );
    }

    switch (activeTab) {
      case 'youtube':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => <VideoItem key={item.id} item={item} />)}
          </div>
        );
      case 'x':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map(item => <XPostItem key={item.id} item={item} />).filter(Boolean)}
          </div>
        );
      case 'github':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map(item => <GithubRepoItem key={item.id} item={item} />)}
          </div>
        );
      case 'openalex':
        return (
          <div className="space-y-4">
            {items.map(item => <PaperItem key={item.id} item={item} />)}
          </div>
        );
      default:
        return (
          <div className="space-y-4">
            {items.map(item => <ArticleItem key={item.id} item={item} />)}
          </div>
        );
    }
  };

  // 如果没有任何可用的 tab，不渲染
  if (availableTabs.length === 0) {
    return null;
  }

  return (
    <section className="card-base overflow-hidden">
      {/* Tab 导航 */}
      <div className="border-b border-stone-100 overflow-x-auto">
        <div className="flex">
          {availableTabs.map(tab => {
            const config = TAB_CONFIG[tab.key];
            if (!config) return null;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-stone-500 hover:text-stone-700'
                }`}
              >
                <span>{config.icon}</span>
                <span>{config.label}</span>
                {tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    activeTab === tab.key ? 'bg-orange-100 text-orange-600' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* YouTube 分类筛选 */}
      {activeTab === 'youtube' && currentItems.length > 0 && (
        <div className="px-6 pt-4 flex gap-2">
          {Object.entries(VIDEO_CATEGORY_CONFIG).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setVideoFilter(key as VideoCategory)}
              className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                videoFilter === key
                  ? 'gradient-btn'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* 内容区域 */}
      <div className="p-6">
        {renderContent()}
      </div>
    </section>
  );
}
