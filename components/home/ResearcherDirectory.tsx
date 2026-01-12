'use client';

import { useEffect, useState, useRef, useCallback, memo } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR, { preload } from 'swr';
import { ResearcherCard, SharedSvgDefs } from './ResearcherCard';

type ViewMode = 'trending' | 'topic' | 'organization' | 'role';

interface Highlight {
  icon: string;
  text: string;
}

interface Person {
  id: string;
  name: string;
  avatarUrl: string | null;
  organization: string[];
  currentTitle: string | null;
  topics: string[];
  highlights: Highlight[] | null;
  roleCategory: string | null;
  influenceScore: number;
  weeklyViewCount: number;
}

interface Stats {
  totalPeople: number;
  totalTopics: number;
  totalPapers: number;
}

interface PaginationInfo {
  total: number;
  hasMore: boolean;
}

interface ApiResponse {
  data: Person[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  stats?: Stats;
}

// 预定义话题 - 扩展版，分类展示
const TOPICS = [
  // 核心技术 (第一行)
  '大语言模型', 'Transformer', 'RAG', 'Agent', '多模态', '推理',
  // 训练与热点 (第二行)
  'Scaling', '强化学习', 'RLHF', 'Memory', 'Eval', 'MoE',
  // 应用方向 (第三行)
  '代码生成', 'NLP', '计算机视觉', '语音', '机器人', '自动驾驶',
  // 安全与行业 (第四行)
  '对齐', '安全', '合规', '医疗AI', '教育', '金融AI',
  // 生态 (第五行)
  '开源', '产品', '基础设施', '芯片', 'AGI', '个性化'
];

// 预定义机构 - 扩展版
const ORGANIZATIONS = [
  // 海外大厂
  'OpenAI', 'Google', 'DeepMind', 'Anthropic', 'Microsoft', 'Meta',
  // 海外创业
  'xAI', 'Mistral', 'Perplexity', 'Hugging Face', 'Cohere',
  // 中国公司
  'DeepSeek', 'Kimi', '智谱AI', '百川智能', 'MiniMax',
  '阿里巴巴', '腾讯', '字节跳动', '百度',
  // 高校
  'Stanford', 'MIT', 'Berkeley', 'CMU', '清华大学', '北京大学',
  // 硬件
  'Nvidia', 'Tesla', 'Apple'
];

// 角色分类 - 按优先级排序：创始人 > 研究员 > 工程师 > 教授 > 布道者
const ROLES = [
  { key: 'founder', label: '创始人/CEO', count: 32 },
  { key: 'researcher', label: '研究科学家', count: 84 },
  { key: 'engineer', label: '工程师', count: 4 },
  { key: 'professor', label: '教授', count: 12 },
  { key: 'evangelist', label: '布道者', count: 1 }
];

// 视图模式配置
const VIEW_MODES: { key: ViewMode; icon: string; label: string }[] = [
  { key: 'trending', icon: '🔥', label: '热度排序' },
  { key: 'topic', icon: '📚', label: '按话题' },
  { key: 'organization', icon: '🏢', label: '按机构' },
  { key: 'role', icon: '👤', label: '按角色' }
];

// SWR fetcher
const fetcher = (url: string) => fetch(url).then(res => res.json());

// 构建 API URL
function buildApiUrl(params: {
  page: number;
  topic?: string | null;
  organization?: string | null;
  roleCategory?: string | null;
  search?: string;
}): string {
  const searchParams = new URLSearchParams({
    page: params.page.toString(),
    limit: '12',
    sortBy: 'influenceScore',
  });

  if (params.topic) searchParams.set('topic', params.topic);
  if (params.organization) searchParams.set('organization', params.organization);
  if (params.roleCategory) searchParams.set('roleCategory', params.roleCategory);
  if (params.search) searchParams.set('search', params.search);

  return `/api/person/directory?${searchParams}`;
}

// 预加载函数 - 用于 hover 时预加载数据
function preloadData(params: Parameters<typeof buildApiUrl>[0]) {
  const url = buildApiUrl(params);
  preload(url, fetcher);
}

// Loading skeleton 组件
const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="card-base h-40"></div>
      ))}
    </div>
  );
});

export function ResearcherDirectory() {
  // 从 URL 参数读取初始筛选状态
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view') as ViewMode | null;
  const urlTopic = searchParams.get('topic');
  const urlOrg = searchParams.get('organization');
  const urlRole = searchParams.get('role');

  // 根据 URL 参数确定初始视图模式
  const getInitialViewMode = (): ViewMode => {
    if (urlView && ['trending', 'topic', 'organization', 'role'].includes(urlView)) {
      return urlView;
    }
    if (urlTopic) return 'topic';
    if (urlOrg) return 'organization';
    if (urlRole) return 'role';
    return 'trending';
  };

  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);
  const [page, setPage] = useState(1);

  // 筛选条件 - 从 URL 参数初始化
  const [selectedTopic, setSelectedTopic] = useState<string | null>(urlTopic);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(urlOrg);
  const [selectedRole, setSelectedRole] = useState<string | null>(urlRole);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // 累积的人物列表（用于无限滚动）
  const [allPeople, setAllPeople] = useState<Person[]>([]);

  // URL 参数变化时更新状态
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      return;
    }
    // URL 参数变化时更新筛选状态
    const newTopic = searchParams.get('topic');
    const newOrg = searchParams.get('organization');
    const newRole = searchParams.get('role');

    if (newTopic && newTopic !== selectedTopic) {
      setViewMode('topic');
      setSelectedTopic(newTopic);
      setSelectedOrg(null);
      setSelectedRole(null);
    } else if (newOrg && newOrg !== selectedOrg) {
      setViewMode('organization');
      setSelectedOrg(newOrg);
      setSelectedTopic(null);
      setSelectedRole(null);
    } else if (newRole && newRole !== selectedRole) {
      setViewMode('role');
      setSelectedRole(newRole);
      setSelectedTopic(null);
      setSelectedOrg(null);
    }
  }, [searchParams, initialized, selectedTopic, selectedOrg, selectedRole]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 折叠展开状态
  const [expandedFilters, setExpandedFilters] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // 构建当前查询的 URL
  const apiUrl = buildApiUrl({
    page,
    topic: selectedTopic,
    organization: selectedOrg,
    roleCategory: selectedRole,
    search: debouncedSearch,
  });

  // 使用 SWR 获取数据
  const { data, error, isLoading, isValidating } = useSWR<ApiResponse>(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 60 秒内相同请求去重
      keepPreviousData: true, // 切换时保持旧数据显示
    }
  );

  // 当筛选条件变化时重置页码和列表
  useEffect(() => {
    setPage(1);
    setAllPeople([]);
  }, [selectedTopic, selectedOrg, selectedRole, debouncedSearch]);

  // 数据更新时累积列表
  useEffect(() => {
    if (data?.data) {
      if (page === 1) {
        setAllPeople(data.data);
      } else {
        setAllPeople(prev => {
          // 避免重复添加
          const existingIds = new Set(prev.map(p => p.id));
          const newPeople = data.data.filter(p => !existingIds.has(p.id));
          return [...prev, ...newPeople];
        });
      }
    }
  }, [data, page]);

  const pagination: PaginationInfo = {
    total: data?.pagination?.total || 0,
    hasMore: data?.pagination?.hasMore || false
  };

  const stats: Stats = data?.stats || { totalPeople: pagination.total, totalTopics: TOPICS.length, totalPapers: 0 };

  // 加载更多
  const handleLoadMore = useCallback(() => {
    if (!isValidating && pagination.hasMore) {
      setPage(prev => prev + 1);
    }
  }, [isValidating, pagination.hasMore]);

  // 无限滚动
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination.hasMore && !isValidating && !isLoading) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore, pagination.hasMore, isValidating, isLoading]);

  // 切换视图模式时清除筛选和重置折叠
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setSelectedTopic(null);
    setSelectedOrg(null);
    setSelectedRole(null);
    setExpandedFilters(false);
  };

  // Tab hover 时预加载数据
  const handleTabHover = (mode: ViewMode) => {
    if (mode === viewMode) return;
    // 预加载该 tab 的默认数据
    preloadData({ page: 1 });
  };

  // 筛选项 hover 时预加载
  const handleTopicHover = (topic: string) => {
    if (topic === selectedTopic) return;
    preloadData({ page: 1, topic });
  };

  const handleOrgHover = (org: string) => {
    if (org === selectedOrg) return;
    preloadData({ page: 1, organization: org });
  };

  const handleRoleHover = (role: string) => {
    if (role === selectedRole) return;
    preloadData({ page: 1, roleCategory: role });
  };

  // 判断是否本周热门（本周访问量 > 10）
  const isHot = (person: Person) => person.weeklyViewCount > 10;

  const loading = isLoading && page === 1;
  const loadingMore = isValidating && page > 1;

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* 共享 SVG 渐变定义 */}
      <SharedSvgDefs />

      {/* Header - 玻璃拟态效果 */}
      <header className="glass-header border-b border-subtle sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo & Title */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'var(--gradient-primary)' }}>
                <span className="text-white text-sm font-semibold">AI</span>
              </div>
              <h1 className="text-lg font-semibold text-stone-900">AI 人物库</h1>
            </div>

            {/* Stats - 右侧紧凑展示 */}
            <div className="hidden sm:flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-stone-900">{stats.totalPeople || pagination.total}</span>
                <span className="text-stone-500">位研究者</span>
              </div>
              <div className="w-px h-4 bg-stone-200"></div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-stone-900">{TOPICS.length}</span>
                <span className="text-stone-500">话题</span>
              </div>
              <div className="w-px h-4 bg-stone-200"></div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-stone-900">{ORGANIZATIONS.length}</span>
                <span className="text-stone-500">机构</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        {/* Search & View Mode - 水平排列 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="搜索人物、公司或话题..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 px-4 pl-10 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 text-stone-900 placeholder:text-stone-400 shadow-sm transition-all"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode.key}
                onClick={() => handleViewModeChange(mode.key)}
                onMouseEnter={() => handleTabHover(mode.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  viewMode === mode.key
                    ? 'gradient-btn shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                <span className="text-xs">{mode.icon}</span>
                <span>{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter Chips - 更紧凑的标签样式 */}
        {viewMode === 'topic' && (
          <div className="mb-4">
            <div className={`flex flex-wrap gap-1.5 overflow-hidden transition-all duration-300 ${
              expandedFilters ? 'max-h-[500px]' : 'max-h-[72px]'
            }`}>
              <button
                onClick={() => setSelectedTopic(null)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedTopic === null
                    ? 'gradient-btn'
                    : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200 hover:border-stone-300'
                }`}
              >
                全部
              </button>
              {TOPICS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  onMouseEnter={() => handleTopicHover(topic)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedTopic === topic
                      ? 'gradient-btn'
                      : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
            {TOPICS.length > 15 && (
              <button
                onClick={() => setExpandedFilters(!expandedFilters)}
                className="mt-2 text-xs text-orange-600 hover:text-orange-700 flex items-center gap-0.5"
              >
                {expandedFilters ? '收起' : `展开全部`}
                <svg className={`w-3.5 h-3.5 transition-transform ${expandedFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        )}

        {viewMode === 'organization' && (
          <div className="mb-4">
            <div className={`flex flex-wrap gap-1.5 overflow-hidden transition-all duration-300 ${
              expandedFilters ? 'max-h-[500px]' : 'max-h-[72px]'
            }`}>
              <button
                onClick={() => setSelectedOrg(null)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedOrg === null
                    ? 'gradient-btn'
                    : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200 hover:border-stone-300'
                }`}
              >
                全部
              </button>
              {ORGANIZATIONS.map((org) => (
                <button
                  key={org}
                  onClick={() => setSelectedOrg(org)}
                  onMouseEnter={() => handleOrgHover(org)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedOrg === org
                      ? 'gradient-btn'
                      : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {org}
                </button>
              ))}
            </div>
            {ORGANIZATIONS.length > 15 && (
              <button
                onClick={() => setExpandedFilters(!expandedFilters)}
                className="mt-2 text-xs text-orange-600 hover:text-orange-700 flex items-center gap-0.5"
              >
                {expandedFilters ? '收起' : `展开全部`}
                <svg className={`w-3.5 h-3.5 transition-transform ${expandedFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        )}

        {viewMode === 'role' && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            <button
              onClick={() => setSelectedRole(null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedRole === null
                  ? 'gradient-btn'
                  : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200 hover:border-stone-300'
              }`}
            >
              全部
            </button>
            {ROLES.map((role) => (
              <button
                key={role.key}
                onClick={() => setSelectedRole(role.key)}
                onMouseEnter={() => handleRoleHover(role.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedRole === role.key
                    ? 'gradient-btn'
                    : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200 hover:border-stone-300'
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>
        )}

        {/* Results Count - 更小巧 */}
        <div className="flex items-center mb-3">
          <p className="text-xs text-stone-500">
            共 {pagination.total} 位研究者
            {isValidating && !loading && <span className="ml-2 text-orange-500">更新中...</span>}
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* People Grid - 4列布局 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {allPeople.map((person, index) => (
                <ResearcherCard
                  key={person.id}
                  person={person}
                  rank={viewMode === 'trending' && page === 1 && index < 12 ? index + 1 : undefined}
                  isHot={isHot(person)}
                />
              ))}
            </div>

            {/* Empty State */}
            {allPeople.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🔍</div>
                <h3 className="text-sm font-medium text-stone-900 mb-1">未找到匹配的研究者</h3>
                <p className="text-xs text-stone-500">尝试调整筛选条件或搜索关键词</p>
              </div>
            )}

            {/* Infinite Scroll Sentinel */}
            {pagination.hasMore && (
              <div ref={sentinelRef} className="mt-6 h-12 flex items-center justify-center">
                {loadingMore && (
                  <div className="w-6 h-6 rounded-full animate-spin" style={{ border: '2px solid transparent', borderTopColor: '#f97316', borderRightColor: '#ec4899' }}></div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
