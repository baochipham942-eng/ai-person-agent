'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { buildTopicHref, normalizeDirectoryTopics } from '@/lib/person-directory-config';
import { useSectionVisibility } from './useSectionVisibility';

interface RawPoolItem {
  id: string;
  sourceType: string;
  url: string;
  title: string;
  text: string;
  publishedAt: string | null;
  metadata: {
    videoId?: string;
    thumbnailUrl?: string;
    videoCategory?: string;
    videoCategoryConfidence?: number;
    isOfficial?: boolean;
    author?: string;
    viewCount?: number;
    duration?: string;
    tags?: string[];  // AI 话题标签
  };
}

interface VideoSectionProps {
  personId: string;
  videoCount?: number;
  /** 作为「成果与资料」tab 内嵌渲染时为 true：去掉外层卡片外壳，避免卡中卡 */
  bare?: boolean;
}

type VideoCategory = 'all' | 'self_talk' | 'interview' | 'analysis';

const CATEGORY_CONFIG: Record<VideoCategory, { label: string }> = {
  all: { label: '精选' },
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
    return date.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export function VideoSection({ personId, videoCount = 0, bare = false }: VideoSectionProps) {
  const { sectionRef, isVisible } = useSectionVisibility<HTMLElement>();
  const [videos, setVideos] = useState<RawPoolItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<VideoCategory>('all');
  const [showAll, setShowAll] = useState(false);
  const INITIAL_DISPLAY_COUNT = 6;

  // 加载视频数据
  const loadVideos = useCallback(async (force = false) => {
    if (loaded && !force) return;
    setLoading(true);
    setError(false);
    try {
      const response = await fetch(`/api/person/${personId}/items?type=youtube&limit=12`);
      if (!response.ok) throw new Error('Failed to load videos');
      const result = await response.json();
      setVideos(result.data || []);
    } catch (error) {
      console.error('Failed to load videos:', error);
      setError(true);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [personId, loaded]);

  useEffect(() => {
    if (videoCount > 0 && isVisible) {
      loadVideos();
    }
  }, [videoCount, isVisible, loadVideos]);

  // 如果没有视频，不渲染
  if (videoCount === 0) {
    return null;
  }

  // 筛选视频
  const firstPartyVideos = videos.filter(v => v.metadata?.videoCategory !== 'analysis');
  const filteredVideos = filter === 'all'
    ? (firstPartyVideos.length > 0 ? firstPartyVideos : videos)
    : videos.filter(v => v.metadata?.videoCategory === filter);

  return (
    <section ref={sectionRef} className={bare ? '' : 'card-base overflow-hidden'}>
      {/* 标题栏 */}
      <div className={bare ? 'pb-2' : 'px-5 py-3 border-b border-stone-100'}>
        {!bare && (
          <div className="flex items-center gap-2">
            <span className="text-base">🎬</span>
            <h2 className="text-sm font-medium text-stone-900">视频与访谈</h2>
            <span className="text-xs text-stone-400">({videoCount})</span>
          </div>
        )}

        {/* 分类筛选 */}
        {videos.length > 0 && (
          <div className={`flex gap-1.5 ${bare ? '' : 'mt-3'}`}>
            {Object.entries(CATEGORY_CONFIG).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setFilter(key as VideoCategory)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
                  filter === key
                    ? 'gradient-btn'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className={bare ? '' : 'p-5'}>
        {!isVisible || loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 rounded-full animate-spin" style={{ border: '2px solid transparent', borderTopColor: '#f97316', borderRightColor: '#ec4899' }}></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-stone-500">
            <div className="text-sm font-medium text-stone-700 mb-1">加载失败</div>
            <p className="text-xs text-stone-400 mb-3">视频资料暂时没有取回来</p>
            <button
              type="button"
              onClick={() => loadVideos(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium gradient-btn"
            >
              重试
            </button>
          </div>
        ) : filteredVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(showAll ? filteredVideos : filteredVideos.slice(0, INITIAL_DISPLAY_COUNT)).map(video => {
              const videoId = video.metadata?.videoId || extractVideoId(video.url);
              const workspaceHref = `/source/youtube/${video.id}`;
              const thumbnailUrl = video.metadata?.thumbnailUrl ||
                (videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : null);
              const category = video.metadata?.videoCategory as VideoCategory | undefined;
              const badgeLabel = getVideoBadgeLabel(video);
              const confidence = video.metadata?.videoCategoryConfidence;

              return (
                <div
                  key={video.id}
                  onClick={(e) => {
                    // 如果点击的是链接，不触发卡片导航
                    if ((e.target as HTMLElement).closest('a')) return;
                    window.location.href = workspaceHref;
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    if ((event.target as HTMLElement).closest('a')) return;
                    event.preventDefault();
                    window.location.href = workspaceHref;
                  }}
                  role="link"
                  tabIndex={0}
                  className="group block rounded-xl overflow-hidden bg-stone-50 hover:shadow-md transition-all border border-transparent hover:border-orange-100 cursor-pointer"
                >
                  {/* 缩略图 */}
                  <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200">
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-stone-400">
                      <svg className="w-9 h-9 text-stone-300" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span className="text-xs font-medium line-clamp-2">{video.title || '视频内容'}</span>
                    </div>
                    {thumbnailUrl && (
                      <Image
                        src={thumbnailUrl}
                        alt={video.title}
                        fill
                        unoptimized
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    {/* 播放按钮遮罩 */}
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
                    {badgeLabel && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-[10px] rounded-md">
                        {badgeLabel}
                      </div>
                    )}
                    {/* 时长 */}
                    {video.metadata?.duration && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 text-white text-[10px] rounded-md">
                        {video.metadata.duration}
                      </div>
                    )}
                  </div>
                  {/* 信息 */}
                  <div className="p-3">
                    <h4 className="text-sm font-medium text-stone-900 line-clamp-2 group-hover:text-orange-600 transition-colors">
                      {video.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-stone-400">
                      <span>{video.metadata?.isOfficial ? '本人频道' : category === 'analysis' ? '第三方分析' : '自动分类'}</span>
                      {typeof confidence === 'number' && (
                        <span>置信度 {Math.round(confidence * 100)}%</span>
                      )}
                      {video.metadata?.viewCount && (
                        <span>👁️ {(video.metadata.viewCount / 1000).toFixed(0)}K</span>
                      )}
                      {video.publishedAt && <span>{formatDate(video.publishedAt)}</span>}
                    </div>
                    {/* 话题标签 */}
                    {video.metadata?.tags && video.metadata.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {normalizeDirectoryTopics(video.metadata.tags).slice(0, 3).map(tag => (
                          <Link
                            key={tag}
                            href={buildTopicHref(tag)}
                            className="px-1.5 py-0.5 text-[10px] bg-orange-50 text-orange-600 rounded-md hover:bg-orange-100 transition-colors"
                          >
                            {tag}
                          </Link>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-stone-100 pt-2">
                      <span className="text-xs font-medium text-orange-600">站内阅读字幕</span>
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-stone-400 transition-colors hover:text-orange-600"
                      >
                        YouTube ↗
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-stone-400">
            <div className="text-3xl mb-2">🎬</div>
            <div className="text-sm">暂无视频内容</div>
          </div>
        )}

        {/* 查看更多/收起 */}
        {filteredVideos.length > INITIAL_DISPLAY_COUNT && (
          <div className="text-center mt-4 pt-3 border-t border-stone-100">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-stone-500 hover:text-orange-600 transition-colors flex items-center justify-center gap-1 mx-auto"
            >
              {showAll ? (
                <>收起 <span className="text-xs">▲</span></>
              ) : (
                <>查看更多 ({filteredVideos.length - INITIAL_DISPLAY_COUNT} 个视频) <span className="text-xs">▼</span></>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function getVideoBadgeLabel(video: RawPoolItem): string | null {
  if (video.metadata?.isOfficial) return '本人频道';
  const category = video.metadata?.videoCategory as VideoCategory | undefined;
  if (category === 'analysis') return '第三方分析';
  if (category === 'interview') return '访谈';
  if (category === 'self_talk') return '本人演讲';
  return category ? CATEGORY_CONFIG[category]?.label || category : null;
}
