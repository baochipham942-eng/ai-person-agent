'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { ResearcherCard } from './ResearcherCard';

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

export function ResearcherDirectory() {
  const [viewMode, setViewMode] = useState<ViewMode>('trending');
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({ total: 0, hasMore: true });
  const [stats, setStats] = useState<Stats>({ totalPeople: 0, totalTopics: 0, totalPapers: 0 });

  // 筛选条件
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 折叠展开状态
  const [expandedFilters, setExpandedFilters] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // 获取数据
  const fetchPeople = useCallback(async (pageNum: number, isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '12',
        sortBy: viewMode === 'trending' ? 'influenceScore' : 'influenceScore',
      });

      if (selectedTopic) params.set('topic', selectedTopic);
      if (selectedOrg) params.set('organization', selectedOrg);
      if (selectedRole) params.set('roleCategory', selectedRole);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/person/directory?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');

      const result = await response.json();

      if (isLoadMore) {
        setPeople(prev => [...prev, ...result.data]);
      } else {
        setPeople(result.data);
      }

      setPagination({
        total: result.pagination.total,
        hasMore: result.pagination.hasMore
      });

      if (result.stats) {
        setStats(result.stats);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [viewMode, selectedTopic, selectedOrg, selectedRole, searchQuery]);

  // 初始加载和筛选变化时重新加载
  useEffect(() => {
    setPage(1);
    fetchPeople(1);
  }, [fetchPeople]);

  // 加载更多
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && pagination.hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPeople(nextPage, true);
    }
  }, [loadingMore, pagination.hasMore, page, fetchPeople]);

  // 无限滚动
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination.hasMore && !loadingMore && !loading) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore, pagination.hasMore, loadingMore, loading]);

  // 切换视图模式时清除筛选和重置折叠
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setSelectedTopic(null);
    setSelectedOrg(null);
    setSelectedRole(null);
    setExpandedFilters(false);
  };

  // 判断是否本周热门（本周访问量 > 10）
  const isHot = (person: Person) => person.weeklyViewCount > 10;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-xl">🧠</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Researcher Directory</h1>
              <p className="text-xs text-gray-500">探索 AI 领域的杰出人物</p>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-12">
            <div className="text-center">
              <div className="text-3xl font-bold">{stats.totalPeople || pagination.total}</div>
              <div className="text-sm text-blue-100">研究者</div>
            </div>
            <div className="w-px h-10 bg-blue-400/30"></div>
            <div className="text-center">
              <div className="text-3xl font-bold">{TOPICS.length}+</div>
              <div className="text-sm text-blue-100">话题领域</div>
            </div>
            <div className="w-px h-10 bg-blue-400/30"></div>
            <div className="text-center">
              <div className="text-3xl font-bold">{ORGANIZATIONS.length}+</div>
              <div className="text-sm text-blue-100">顶尖机构</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-xl mx-auto">
            <input
              type="text"
              placeholder="搜索人物、公司或话题..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-5 py-3 pl-12 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.key}
              onClick={() => handleViewModeChange(mode.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                viewMode === mode.key
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <span>{mode.icon}</span>
              <span>{mode.label}</span>
            </button>
          ))}
        </div>

        {/* Filter Chips */}
        {viewMode === 'topic' && (
          <div className="mb-6">
            <div className={`flex flex-wrap justify-center gap-2 overflow-hidden transition-all duration-300 ${
              expandedFilters ? 'max-h-none' : 'max-h-24'
            }`}>
              <button
                onClick={() => setSelectedTopic(null)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedTopic === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                全部
              </button>
              {TOPICS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedTopic === topic
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
            {TOPICS.length > 12 && (
              <div className="flex justify-center mt-2">
                <button
                  onClick={() => setExpandedFilters(!expandedFilters)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {expandedFilters ? '收起' : `展开全部 ${TOPICS.length} 个话题`}
                  <svg className={`w-4 h-4 transition-transform ${expandedFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {viewMode === 'organization' && (
          <div className="mb-6">
            <div className={`flex flex-wrap justify-center gap-2 overflow-hidden transition-all duration-300 ${
              expandedFilters ? 'max-h-none' : 'max-h-24'
            }`}>
              <button
                onClick={() => setSelectedOrg(null)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedOrg === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                全部
              </button>
              {ORGANIZATIONS.map((org) => (
                <button
                  key={org}
                  onClick={() => setSelectedOrg(org)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedOrg === org
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {org}
                </button>
              ))}
            </div>
            {ORGANIZATIONS.length > 12 && (
              <div className="flex justify-center mt-2">
                <button
                  onClick={() => setExpandedFilters(!expandedFilters)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {expandedFilters ? '收起' : `展开全部 ${ORGANIZATIONS.length} 个机构`}
                  <svg className={`w-4 h-4 transition-transform ${expandedFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {viewMode === 'role' && (
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <button
              onClick={() => setSelectedRole(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedRole === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              全部
            </button>
            {ROLES.map((role) => (
              <button
                key={role.key}
                onClick={() => setSelectedRole(role.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedRole === role.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {role.label} ({role.count})
              </button>
            ))}
          </div>
        )}

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            共 <span className="font-medium text-gray-900">{pagination.total}</span> 位研究者
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-48 shadow-sm"></div>
            ))}
          </div>
        ) : (
          <>
            {/* People Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {people.map((person, index) => (
                <ResearcherCard
                  key={person.id}
                  person={person}
                  rank={viewMode === 'trending' && page === 1 ? index + 1 : undefined}
                  isHot={isHot(person)}
                />
              ))}
            </div>

            {/* Empty State */}
            {people.length === 0 && !loading && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">未找到匹配的研究者</h3>
                <p className="text-sm text-gray-500">尝试调整筛选条件或搜索关键词</p>
              </div>
            )}

            {/* Infinite Scroll Sentinel */}
            {pagination.hasMore && (
              <div ref={sentinelRef} className="mt-8 h-16 flex items-center justify-center">
                {loadingMore && (
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
