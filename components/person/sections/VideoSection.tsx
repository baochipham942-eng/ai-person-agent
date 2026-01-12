'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

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
    viewCount?: number;
    duration?: string;
    tags?: string[];  // AI 话题标签
  };
}

interface VideoSectionProps {
  personId: string;
  videoCount?: number;
}

type VideoCategory = 'all' | 'self_talk' | 'interview' | 'analysis';

const CATEGORY_CONFIG: Record<VideoCategory, { label: string }> = {
  all: { label: '全部' },
  self_talk: { label: '本人演讲' },
  interview: { label: '访谈对话' },
  analysis: { label: '相关分析' },
};

// 提取 YouTube 视频 ID
function extractVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  return match ? match[1] : null;
}

// 格式化日期
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export function VideoSection({ personId, videoCount = 0 }: VideoSectionProps) {
  const [videos, setVideos] = useState<RawPoolItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<VideoCategory>('all');
  const [showAll, setShowAll] = useState(false);
  const INITIAL_DISPLAY_COUNT = 6;

  // 加载视频数据
  const loadVideos = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/person/${personId}/items?type=youtube&limit=12`);
      if (response.ok) {
        const result = await response.json();
        setVideos(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [personId, loaded]);

  // 首次可见时加载
  useEffect(() => {
    if (videoCount > 0) {
      loadVideos();
    }
  }, [videoCount, loadVideos]);

  // 如果没有视频，不渲染
  if (videoCount === 0) {
    return null;
  }

  // 筛选视频
  const filteredVideos = filter === 'all'
    ? videos
    : videos.filter(v => v.metadata?.videoCategory === filter);

  return (
    <section className="card-base overflow-hidden">
      {/* 标题栏 */}
      <div className="px-5 py-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <span className="text-base">🎬</span>
          <h2 className="text-sm font-medium text-stone-900">听 TA 亲自讲</h2>
          <span className="text-xs text-stone-400">({videoCount})</span>
        </div>

        {/* 分类筛选 */}
        {videos.length > 0 && (
          <div className="flex gap-1.5 mt-3">
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
      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 rounded-full animate-spin" style={{ border: '2px solid transparent', borderTopColor: '#f97316', borderRightColor: '#ec4899' }}></div>
          </div>
        ) : filteredVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(showAll ? filteredVideos : filteredVideos.slice(0, INITIAL_DISPLAY_COUNT)).map(video => {
              const videoId = video.metadata?.videoId || extractVideoId(video.url);
              const thumbnailUrl = video.metadata?.thumbnailUrl ||
                (videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : null);
              const category = video.metadata?.videoCategory;

              return (
                <div
                  key={video.id}
                  onClick={(e) => {
                    // 如果点击的是链接，不触发卡片导航
                    if ((e.target as HTMLElement).closest('a')) return;
                    window.open(video.url, '_blank', 'noopener,noreferrer');
                  }}
                  className="group block rounded-xl overflow-hidden bg-stone-50 hover:shadow-md transition-all border border-transparent hover:border-orange-100 cursor-pointer"
                >
                  {/* 缩略图 */}
                  <div className="relative aspect-video bg-stone-200">
                    {thumbnailUrl && (
                      <img
                        src={thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
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
                    {category && category !== 'analysis' && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-[10px] rounded-md">
                        {CATEGORY_CONFIG[category as VideoCategory]?.label || category}
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
                      {video.metadata?.viewCount && (
                        <span>👁️ {(video.metadata.viewCount / 1000).toFixed(0)}K</span>
                      )}
                      {video.publishedAt && <span>{formatDate(video.publishedAt)}</span>}
                    </div>
                    {/* 话题标签 */}
                    {video.metadata?.tags && video.metadata.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {video.metadata.tags.slice(0, 3).map(tag => (
                          <Link
                            key={tag}
                            href={`/?view=topic&topic=${encodeURIComponent(tag)}`}
                            className="px-1.5 py-0.5 text-[10px] bg-orange-50 text-orange-600 rounded-md hover:bg-orange-100 transition-colors"
                          >
                            {tag}
                          </Link>
                        ))}
                      </div>
                    )}
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
