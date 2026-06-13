'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { buildTopicHref, normalizeDirectoryTopics } from '@/lib/person-directory-config';

// ============== 类型定义 ==============

interface Course {
  id: string;
  title: string;
  titleZh?: string;
  platform: string;
  url: string;
  type: 'free' | 'paid' | 'freemium';
  level?: string;
  category?: string;
  description?: string;
  thumbnailUrl?: string;
  duration?: string;
  language?: string;
  enrollments?: number;
  rating?: number;
  reviewCount?: number;
  prerequisite?: string;
  learningOrder?: number;
  topics: string[];
  verified: boolean;
  confidence?: number;
  publishedAt?: string;
}

interface CourseSectionProps {
  personId: string;
  courseCount?: number;
}

type CourseTypeFilter = 'all' | 'free' | 'paid';

// ============== 常量配置 ==============

const TYPE_CONFIG: Record<CourseTypeFilter, { label: string; icon: string }> = {
  all: { label: '全部', icon: '📚' },
  free: { label: '免费', icon: '🆓' },
  paid: { label: '付费', icon: '💰' },
};

const PLATFORM_CONFIG: Record<string, { label: string; color: string }> = {
  coursera: { label: 'Coursera', color: 'bg-blue-100 text-blue-700' },
  edx: { label: 'edX', color: 'bg-red-100 text-red-700' },
  youtube: { label: 'YouTube', color: 'bg-rose-100 text-rose-700' },
  udacity: { label: 'Udacity', color: 'bg-cyan-100 text-cyan-700' },
  'fast.ai': { label: 'fast.ai', color: 'bg-purple-100 text-purple-700' },
  stanford: { label: 'Stanford', color: 'bg-red-100 text-red-800' },
  mit: { label: 'MIT', color: 'bg-gray-100 text-gray-700' },
  udemy: { label: 'Udemy', color: 'bg-violet-100 text-violet-700' },
  'deeplearning.ai': { label: 'DeepLearning.AI', color: 'bg-orange-100 text-orange-700' },
  other: { label: '其他', color: 'bg-stone-100 text-stone-600' },
};

const LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
  beginner: { label: '入门', color: 'bg-green-100 text-green-700' },
  intermediate: { label: '进阶', color: 'bg-yellow-100 text-yellow-700' },
  advanced: { label: '高级', color: 'bg-red-100 text-red-700' },
};

// ============== 工具函数 ==============

function formatEnrollments(count?: number): string {
  if (!count) return '';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
}

function formatRating(rating?: number): string {
  if (!rating) return '';
  return rating.toFixed(1);
}

// ============== 组件 ==============

export function CourseSection({ personId, courseCount = 0 }: CourseSectionProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<CourseTypeFilter>('all');
  const [stats, setStats] = useState<{
    typeCounts: Record<string, number>;
    platformCounts: Record<string, number>;
  } | null>(null);

  // 加载课程数据
  const loadCourses = useCallback(async (force = false) => {
    if (loaded && !force) return;
    setLoading(true);
    setError(false);
    try {
      const response = await fetch(`/api/person/${personId}/courses?limit=20`);
      if (!response.ok) throw new Error('Failed to load courses');
      const result = await response.json();
      setCourses(result.data || []);
      setStats(result.stats || null);
    } catch (error) {
      console.error('Failed to load courses:', error);
      setError(true);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [personId, loaded]);

  // 首次可见时加载
  useEffect(() => {
    if (courseCount > 0) {
      loadCourses();
    }
  }, [courseCount, loadCourses]);

  // 如果没有课程，不渲染
  if (courseCount === 0) {
    return null;
  }

  // 筛选课程
  const filteredCourses =
    filter === 'all'
      ? courses
      : courses.filter((c) => {
          if (filter === 'free') return c.type === 'free';
          if (filter === 'paid') return c.type === 'paid' || c.type === 'freemium';
          return true;
        });

  // 按学习顺序排序
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    if (a.learningOrder && b.learningOrder) {
      return a.learningOrder - b.learningOrder;
    }
    if (a.learningOrder) return -1;
    if (b.learningOrder) return 1;
    return (b.enrollments || 0) - (a.enrollments || 0);
  });

  return (
    <section className="card-base overflow-hidden">
      {/* 标题栏 */}
      <div className="px-5 py-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <span className="text-base">🎓</span>
          <h2 className="text-sm font-medium text-stone-900">TA 的课程</h2>
          <span className="text-xs text-stone-400">({courseCount})</span>
        </div>

        {/* 类型筛选 */}
        {courses.length > 0 && (
          <div className="flex gap-1.5 mt-3">
            {Object.entries(TYPE_CONFIG).map(([key, { label }]) => {
              const count =
                key === 'all'
                  ? courses.length
                  : key === 'free'
                  ? stats?.typeCounts?.free || 0
                  : (stats?.typeCounts?.paid || 0) + (stats?.typeCounts?.freemium || 0);

              return (
                <button
                  key={key}
                  onClick={() => setFilter(key as CourseTypeFilter)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
                    filter === key
                      ? 'gradient-btn'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {label}
                  {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div
              className="w-6 h-6 rounded-full animate-spin"
              style={{
                border: '2px solid transparent',
                borderTopColor: '#f97316',
                borderRightColor: '#ec4899',
              }}
            ></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-stone-500">
            <div className="text-sm font-medium text-stone-700 mb-1">加载失败</div>
            <p className="text-xs text-stone-400 mb-3">课程资料暂时没有取回来</p>
            <button
              type="button"
              onClick={() => loadCourses(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium gradient-btn"
            >
              重试
            </button>
          </div>
        ) : sortedCourses.length > 0 ? (
          <>
            {/* 学习路径提示 */}
            {sortedCourses.some((c) => c.learningOrder) && (
              <div className="mb-4 px-3 py-2 bg-gradient-to-r from-orange-50 to-pink-50 rounded-lg border border-orange-100">
                <div className="flex items-center gap-2 text-xs text-orange-700">
                  <span>💡</span>
                  <span>推荐学习路径：按入门→进阶顺序学习效果更佳</span>
                </div>
              </div>
            )}

            {/* 课程卡片网格 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sortedCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-stone-400">
            <div className="text-3xl mb-2">🎓</div>
            <div className="text-sm">暂无课程</div>
          </div>
        )}
      </div>
    </section>
  );
}

// ============== 课程卡片组件 ==============

function CourseCard({ course }: { course: Course }) {
  const platformInfo = PLATFORM_CONFIG[course.platform] || PLATFORM_CONFIG.other;
  const levelInfo = course.level ? LEVEL_CONFIG[course.level] : null;
  const typeIcon = course.type === 'free' ? '🆓' : course.type === 'paid' ? '💰' : '🔄';
  const thumbnailUrl = course.thumbnailUrl;
  const hasThumbnail = !!thumbnailUrl;
  const confidenceLabel = typeof course.confidence === 'number'
    ? `置信度 ${Math.round(course.confidence * 100)}%`
    : null;

  return (
    <a
      href={course.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl overflow-hidden bg-stone-50 hover:shadow-md transition-all border border-transparent hover:border-orange-100"
    >
      {/* 课程封面 - 只在有缩略图时显示 */}
      {hasThumbnail && (
        <div className="relative h-24 bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
          <Image
            src={thumbnailUrl}
            alt={course.title}
            width={640}
            height={320}
            unoptimized
            sizes="(min-width: 640px) 50vw, 100vw"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />

          {/* 平台标签 */}
          <div
            className={`absolute top-2 right-2 px-2 py-0.5 text-[10px] font-medium rounded-md ${platformInfo.color}`}
          >
            {platformInfo.label}
          </div>

          {/* 类型图标 */}
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded-md">
            {typeIcon} {course.type === 'free' ? '免费' : course.type === 'paid' ? '付费' : '可旁听'}
          </div>
        </div>
      )}

      {/* 课程信息 */}
      <div className="p-3">
        {/* 无缩略图时：顶部显示平台和类型标签 */}
        {!hasThumbnail && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className={`px-2 py-0.5 text-[10px] font-medium rounded-md ${platformInfo.color}`}>
              {platformInfo.label}
            </div>
            <div className="px-1.5 py-0.5 bg-stone-100 text-stone-600 text-[10px] rounded-md">
              {typeIcon} {course.type === 'free' ? '免费' : course.type === 'paid' ? '付费' : '可旁听'}
            </div>
            <QualityBadge verified={course.verified} confidenceLabel={confidenceLabel} />
          </div>
        )}

        {hasThumbnail && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <QualityBadge verified={course.verified} confidenceLabel={confidenceLabel} />
          </div>
        )}

        {/* 标题 */}
        <h4 className="text-sm font-medium text-stone-900 line-clamp-2 group-hover:text-orange-600 transition-colors">
          {course.titleZh || course.title}
        </h4>

        {/* 元数据行 */}
        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-stone-500">
          {/* 难度 */}
          {levelInfo && (
            <span className={`px-1.5 py-0.5 rounded ${levelInfo.color}`}>
              {levelInfo.label}
            </span>
          )}

          {/* 时长 */}
          {course.duration && (
            <span className="flex items-center gap-0.5">
              <span>⏱️</span>
              {course.duration}
            </span>
          )}

          {/* 评分 */}
          {course.rating && (
            <span className="flex items-center gap-0.5">
              <span>⭐</span>
              {formatRating(course.rating)}
            </span>
          )}

          {/* 学员数 */}
          {course.enrollments && (
            <span className="flex items-center gap-0.5">
              <span>👥</span>
              {formatEnrollments(course.enrollments)}
            </span>
          )}
        </div>

        {/* 描述 */}
        {course.description && (
          <p className="mt-2 text-xs text-stone-400 line-clamp-2">{course.description}</p>
        )}

        {/* 话题标签 */}
        {course.topics && course.topics.length > 0 && (
          <div
            className="flex flex-wrap gap-1 mt-2"
            onClick={(e) => e.stopPropagation()}
          >
            {normalizeDirectoryTopics(course.topics).slice(0, 3).map((tag) => (
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

        {/* 先修条件 */}
        {course.prerequisite && (
          <div className="mt-2 text-[10px] text-stone-400">
            <span className="font-medium">先修：</span>
            {course.prerequisite}
          </div>
        )}
      </div>
    </a>
  );
}

function QualityBadge({ verified, confidenceLabel }: { verified: boolean; confidenceLabel: string | null }) {
  return (
    <span
      className={`px-1.5 py-0.5 text-[10px] font-medium rounded-md border ${
        verified
          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
          : 'bg-amber-50 text-amber-700 border-amber-100'
      }`}
    >
      {verified ? '已验证' : '待核'}
      {confidenceLabel ? ` · ${confidenceLabel}` : ''}
    </span>
  );
}
