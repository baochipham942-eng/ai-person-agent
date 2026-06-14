'use client';

import { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react';
import useSWR, { preload } from 'swr';
import { SiteHeader } from '@/components/common/SiteHeader';
import { ResearcherCard, SharedSvgDefs } from './ResearcherCard';
import { ActivityFeed } from './ActivityFeed';
import type { ActivityEvent } from '@/lib/activity';
import {
  DIRECTORY_ORGANIZATION_GROUPS,
  DIRECTORY_ROLES,
  DIRECTORY_SORT_OPTIONS,
  DIRECTORY_TOPIC_GROUPS,
  buildDirectoryApiUrl,
  getInitialDirectoryFilters,
  type DirectoryFilters,
  type DirectoryPerson,
  type DirectoryResponse,
  type DirectorySortKey,
  type DirectoryViewMode,
} from '@/lib/person-directory-config';

interface PaginationInfo {
  total: number;
  hasMore: boolean;
}

// SWR fetcher
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch directory');
  return res.json();
};

// 预加载函数 - 用于 hover 时预加载数据
function preloadData(params: Parameters<typeof buildDirectoryApiUrl>[0]) {
  const url = buildDirectoryApiUrl(params);
  preload(url, fetcher);
}

// Loading skeleton 组件
const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="card-base h-40"></div>
      ))}
    </div>
  );
});

const FILTER_MODES: Array<{ key: DirectoryViewMode; label: string }> = [
  { key: 'trending', label: '全部' },
  { key: 'topic', label: '话题' },
  { key: 'organization', label: '机构' },
  { key: 'role', label: '角色' },
];

interface ResearcherDirectoryProps {
  initialData: DirectoryResponse;
  initialFilters: DirectoryFilters;
  initialActivity?: ActivityEvent[];
}

export function ResearcherDirectory({ initialData, initialFilters, initialActivity }: ResearcherDirectoryProps) {
  const [filters, setFilters] = useState<DirectoryFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState(initialFilters.search);
  const [debouncedSearch, setDebouncedSearch] = useState(initialFilters.search);
  const [searchOpen, setSearchOpen] = useState(Boolean(initialFilters.search));
  const [allPeople, setAllPeople] = useState<DirectoryPerson[]>(initialData.data);
  const hasMountedRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentFilters: DirectoryFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearch,
  }), [filters, debouncedSearch]);

  const {
    view: viewMode,
    topic: selectedTopic,
    organization: selectedOrg,
    role: selectedRole,
    sortBy: selectedSort,
  } = currentFilters;

  const apiUrl = buildDirectoryApiUrl({
    page,
    topic: currentFilters.topic,
    organization: currentFilters.organization,
    roleCategory: currentFilters.role,
    search: currentFilters.search,
    sortBy: currentFilters.sortBy,
  });

  const { data, error, isLoading, isValidating, mutate } = useSWR<DirectoryResponse>(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      keepPreviousData: true,
      revalidateOnMount: false,
      fallbackData: isSameInitialQuery(initialFilters, currentFilters) && page === 1 ? initialData : undefined,
    }
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    queueMicrotask(() => setPage(1));
    replaceDirectoryUrl(currentFilters);
  }, [currentFilters]);

  useEffect(() => {
    const handlePopState = () => {
      const nextFilters = readFiltersFromLocation();
      setFilters(nextFilters);
      setSearchQuery(nextFilters.search);
      setDebouncedSearch(nextFilters.search);
      setPage(1);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!data?.data) return;
    const nextPeople = data.data;

    queueMicrotask(() => {
      if (page === 1) {
        setAllPeople(nextPeople);
        return;
      }

      setAllPeople(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newPeople = nextPeople.filter(p => !existingIds.has(p.id));
        return [...prev, ...newPeople];
      });
    });
  }, [data, page]);

  const pagination: PaginationInfo = {
    total: data?.pagination?.total ?? initialData.pagination.total,
    hasMore: data?.pagination?.hasMore ?? false
  };

  const isFallbackData = Boolean(data?.isFallback && page === 1 && allPeople.length === 0);
  const hasActiveFilters = Boolean(selectedTopic || selectedOrg || selectedRole || debouncedSearch);

  const handleLoadMore = useCallback(() => {
    if (!isValidating && pagination.hasMore) {
      setPage(prev => prev + 1);
    }
  }, [isValidating, pagination.hasMore]);

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

  const applyFilters = (next: DirectoryFilters, historyMode: 'push' | 'replace' = 'push') => {
    setFilters(next);
    setSearchQuery(next.search);
    setDebouncedSearch(next.search);
    setPage(1);
    updateDirectoryUrl(next, historyMode);
  };

  const handleViewModeChange = (mode: DirectoryViewMode) => {
    applyFilters({
      view: mode,
      topic: null,
      organization: null,
      role: null,
      search: debouncedSearch,
      sortBy: currentFilters.sortBy,
    });
  };

  const handleTabHover = (mode: DirectoryViewMode) => {
    if (mode === viewMode) return;
    preloadData({ page: 1, sortBy: currentFilters.sortBy });
  };

  const handleSortChange = (sortBy: DirectorySortKey) => {
    applyFilters({
      ...currentFilters,
      sortBy,
    });
  };

  const handleTopicSelect = (topic: string | null) => {
    applyFilters({
      view: 'topic',
      topic,
      organization: null,
      role: null,
      search: debouncedSearch,
      sortBy: currentFilters.sortBy,
    });
  };

  const handleOrgSelect = (organization: string | null) => {
    applyFilters({
      view: 'organization',
      topic: null,
      organization,
      role: null,
      search: debouncedSearch,
      sortBy: currentFilters.sortBy,
    });
  };

  const handleRoleSelect = (role: string | null) => {
    applyFilters({
      view: 'role',
      topic: null,
      organization: null,
      role,
      search: debouncedSearch,
      sortBy: currentFilters.sortBy,
    });
  };

  const handleClearFilters = () => {
    setSearchOpen(false);
    applyFilters({
      view: 'trending',
      topic: null,
      organization: null,
      role: null,
      search: '',
      sortBy: currentFilters.sortBy,
    });
  };

  const handleTopicHover = (topic: string) => {
    if (topic === selectedTopic) return;
    preloadData({ page: 1, topic, sortBy: currentFilters.sortBy });
  };

  const handleOrgHover = (org: string) => {
    if (org === selectedOrg) return;
    preloadData({ page: 1, organization: org, sortBy: currentFilters.sortBy });
  };

  const handleRoleHover = (role: string) => {
    if (role === selectedRole) return;
    preloadData({ page: 1, roleCategory: role, sortBy: currentFilters.sortBy });
  };

  const hotPersonIds = useMemo(() => {
    const ranked = [...allPeople]
      .filter(person => person.weeklyViewCount > 0)
      .sort((a, b) => b.weeklyViewCount - a.weeklyViewCount || b.influenceScore - a.influenceScore || a.name.localeCompare(b.name));
    return new Set(ranked.slice(0, 3).map(person => person.id));
  }, [allPeople]);

  const isHot = (person: DirectoryPerson) => hotPersonIds.has(person.id);

  const loading = (isLoading || isFallbackData) && page === 1 && allPeople.length === 0;
  const loadingMore = isValidating && page > 1;
  const hasLoadError = Boolean(error && allPeople.length === 0);
  const shouldUseInitialActivity = selectedTopic === initialFilters.topic && selectedOrg === initialFilters.organization;
  const selectedSortOption = DIRECTORY_SORT_OPTIONS.find(option => option.key === selectedSort);

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* 共享 SVG 渐变定义 */}
      <SharedSvgDefs />

      <SiteHeader
        current="home"
        maxWidth="7xl"
        utilitySlot={
          searchOpen ? (
            <div className="relative w-56 max-w-[calc(100vw-6rem)] flex-shrink-0 sm:w-64 lg:w-72">
              <input
                id="home-directory-search"
                ref={searchInputRef}
                type="text"
                placeholder="搜索人物、公司或话题..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-lg border border-orange-200 bg-white px-3 pl-8 pr-8 text-xs text-stone-900 shadow-sm transition-all placeholder:text-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              <svg
                aria-hidden="true"
                className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.35-5.15a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
              </svg>
              <button
                type="button"
                aria-label={searchQuery ? '清除搜索' : '关闭搜索'}
                onClick={() => {
                  if (searchQuery) {
                    setSearchQuery('');
                    return;
                  }
                  setSearchOpen(false);
                }}
                className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-expanded={searchOpen}
              aria-controls="home-directory-search"
              onClick={() => setSearchOpen(true)}
              className={`inline-flex h-8 flex-shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-xs font-medium shadow-sm transition-colors ${
                debouncedSearch
                  ? 'border-orange-200 bg-orange-50 text-orange-700'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700'
              }`}
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.35-5.15a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
              </svg>
              搜索
            </button>
          )
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <section className="min-w-0">
          <div className="mb-3 rounded-xl border border-stone-200 bg-white px-3 py-3 shadow-sm">
            <ActivityFeed
              topic={selectedTopic}
              organization={selectedOrg}
              initialEvents={shouldUseInitialActivity ? initialActivity : undefined}
            />
          </div>

          <div className="mb-4 rounded-xl border border-stone-200 bg-white px-3 py-3 shadow-sm">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-5 gap-y-3">
              <div className="flex min-w-0 items-center gap-2 overflow-x-auto scrollbar-hide">
                <span className="flex-shrink-0 text-[11px] font-medium text-stone-400">筛选</span>
                <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-stone-100 p-1 scrollbar-hide">
                  {FILTER_MODES.map((mode) => (
                    <button
                      key={mode.key}
                      type="button"
                      onClick={() => handleViewModeChange(mode.key)}
                      onMouseEnter={() => handleTabHover(mode.key)}
                      className={`flex-shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        viewMode === mode.key
                          ? 'gradient-btn shadow-sm'
                          : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-2 overflow-x-auto scrollbar-hide">
                <div className="flex min-w-0 flex-shrink-0 items-baseline gap-2">
                  <span className="flex-shrink-0 text-[11px] font-medium text-stone-400">排序</span>
                  <span className="hidden max-w-48 truncate text-[11px] text-stone-400 sm:inline xl:max-w-64">
                    {selectedSortOption?.hint}
                  </span>
                </div>
                <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-stone-100 p-1 scrollbar-hide">
                  {DIRECTORY_SORT_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      title={option.hint}
                      onClick={() => handleSortChange(option.key)}
                      className={`flex-shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        selectedSort === option.key
                          ? 'gradient-btn shadow-sm'
                          : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

        {/* Filter Chips - 更紧凑的标签样式 */}
        {viewMode === 'topic' && (
          <div className="mb-4">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => handleTopicSelect(null)}
                className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedTopic === null
                    ? 'gradient-btn'
                    : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200 hover:border-stone-300'
                }`}
              >
                全部话题
              </button>
              <span className="text-[11px] text-stone-400">按研究方向和应用场景归类</span>
            </div>
            <div className="space-y-2">
              {DIRECTORY_TOPIC_GROUPS.map((group) => (
                <div key={group.key} className="flex flex-col gap-1.5 sm:flex-row sm:items-start">
                  <div className="w-24 flex-shrink-0 pt-1 text-[11px] font-medium text-stone-400">
                    {group.label}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.topics.map((topic) => (
                      <button
                        key={topic}
                        onClick={() => handleTopicSelect(topic)}
                        onMouseEnter={() => handleTopicHover(topic)}
                        className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          selectedTopic === topic
                            ? 'gradient-btn'
                            : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'organization' && (
          <div className="mb-4">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => handleOrgSelect(null)}
                className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedOrg === null
                    ? 'gradient-btn'
                    : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200 hover:border-stone-300'
                }`}
              >
                全部机构
              </button>
              <span className="text-[11px] text-stone-400">按当前和已确认履历匹配</span>
            </div>
            <div className="space-y-2">
              {DIRECTORY_ORGANIZATION_GROUPS.map((group) => (
                <div key={group.key} className="flex flex-col gap-1.5 sm:flex-row sm:items-start">
                  <div className="w-24 flex-shrink-0 pt-1 text-[11px] font-medium text-stone-400">
                    {group.label}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.organizations.map((org) => (
                      <button
                        key={org}
                        onClick={() => handleOrgSelect(org)}
                        onMouseEnter={() => handleOrgHover(org)}
                        className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          selectedOrg === org
                            ? 'gradient-btn'
                            : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        {org}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'role' && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            <button
              onClick={() => handleRoleSelect(null)}
              className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedRole === null
                  ? 'gradient-btn'
                  : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200 hover:border-stone-300'
              }`}
            >
              全部
            </button>
            {DIRECTORY_ROLES.map((role) => (
              <button
                key={role.key}
                onClick={() => handleRoleSelect(role.key)}
                onMouseEnter={() => handleRoleHover(role.key)}
                className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
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
        <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-stone-500">
            {isFallbackData ? '资料库正在唤醒' : `共 ${pagination.total} 位研究者`}
            {isValidating && !loading && <span className="ml-2 text-orange-500">更新中...</span>}
          </p>
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
              <span>当前筛选</span>
              {debouncedSearch && <span className="rounded-md bg-white px-2 py-0.5 text-stone-700 border border-stone-200">搜索：{debouncedSearch}</span>}
              {selectedTopic && <span className="rounded-md bg-white px-2 py-0.5 text-stone-700 border border-stone-200">话题：{selectedTopic}</span>}
              {selectedOrg && <span className="rounded-md bg-white px-2 py-0.5 text-stone-700 border border-stone-200">{`机构：${selectedOrg}`}</span>}
              {selectedRole && (
                <span className="rounded-md bg-white px-2 py-0.5 text-stone-700 border border-stone-200">
                  角色：{DIRECTORY_ROLES.find(role => role.key === selectedRole)?.label ?? selectedRole}
                </span>
              )}
              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-md px-2 py-0.5 font-medium text-orange-600 hover:bg-orange-50"
              >
                清除筛选
              </button>
            </div>
          )}
        </div>

        {/* Loading State */}
        {hasLoadError ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">⏳</div>
            <h3 className="text-sm font-medium text-stone-900 mb-1">加载失败</h3>
            <p className="text-xs text-stone-500 mb-4">数据库可能正在唤醒</p>
            <button
              onClick={() => mutate()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium gradient-btn"
            >
              重试
            </button>
          </div>
        ) : loading ? (
          <div>
            <div className="mb-3 text-xs text-stone-500">
              {isFallbackData ? '正在唤醒资料库，先加载最新目录' : '正在加载研究者'}
            </div>
            <LoadingSkeleton />
          </div>
        ) : (
          <>
            {/* People Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {allPeople.map((person, index) => (
                <ResearcherCard
                  key={person.id}
                  person={person}
                  rank={viewMode === 'trending' && index < 12 ? index + 1 : undefined}
                  isHot={isHot(person)}
                  sortBy={selectedSort}
                />
              ))}
            </div>

            {/* Empty State */}
            {allPeople.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🔍</div>
                <h3 className="text-sm font-medium text-stone-900 mb-1">未找到匹配的研究者</h3>
                <p className="text-xs text-stone-500 mb-4">尝试调整筛选条件或搜索关键词</p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium gradient-btn"
                >
                  清除筛选
                </button>
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
        </section>
      </main>
    </div>
  );
}

function isSameInitialQuery(left: DirectoryFilters, right: DirectoryFilters): boolean {
  return left.view === right.view
    && left.topic === right.topic
    && left.organization === right.organization
    && left.role === right.role
    && left.search === right.search
    && left.sortBy === right.sortBy;
}

function readFiltersFromLocation(): DirectoryFilters {
  const searchParams = new URLSearchParams(window.location.search);
  return getInitialDirectoryFilters({
    view: searchParams.get('view'),
    topic: searchParams.get('topic'),
    organization: searchParams.get('organization'),
    role: searchParams.get('role'),
    search: searchParams.get('search'),
    sortBy: searchParams.get('sortBy'),
  });
}

function replaceDirectoryUrl(filters: DirectoryFilters) {
  updateDirectoryUrl(filters, 'replace');
}

function updateDirectoryUrl(filters: DirectoryFilters, mode: 'push' | 'replace') {
  const url = buildDirectoryPageUrl(filters);
  if (window.location.pathname + window.location.search === url) return;
  window.history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
}

function buildDirectoryPageUrl(filters: DirectoryFilters): string {
  const searchParams = new URLSearchParams();

  if (filters.view !== 'trending') {
    searchParams.set('view', filters.view);
  }
  if (filters.topic) searchParams.set('topic', filters.topic);
  if (filters.organization) searchParams.set('organization', filters.organization);
  if (filters.role) searchParams.set('role', filters.role);
  if (filters.search) searchParams.set('search', filters.search);
  if (filters.sortBy !== 'influenceScore') searchParams.set('sortBy', filters.sortBy);

  const query = searchParams.toString();
  return query ? `/?${query}` : '/';
}
