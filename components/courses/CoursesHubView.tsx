import Link from 'next/link';
import { ExternalClickableCard } from '@/components/common/ExternalClickableCard';
import type { CourseHubItem, CoursesHub } from '@/lib/courses';

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

export interface CoursesHubFilters {
  topic?: string | null;
  level?: string | null;
  type?: string | null;
}

function buildHref(filters: CoursesHubFilters, patch: Partial<CoursesHubFilters>): string {
  const next = { ...filters, ...patch };
  const params = new URLSearchParams();
  if (next.topic) params.set('topic', next.topic);
  if (next.level) params.set('level', next.level);
  if (next.type) params.set('type', next.type);
  const qs = params.toString();
  return qs ? `/courses?${qs}` : '/courses';
}

function formatRating(rating: number | null): string {
  return rating ? rating.toFixed(1) : '';
}

export function CoursesHubView({ hub, filters }: { hub: CoursesHub; filters: CoursesHubFilters }) {
  const { courses, total, facets } = hub;
  const hasFilter = Boolean(filters.topic || filters.level || filters.type);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <section className="rounded-xl border border-stone-200 bg-white px-5 py-6 shadow-sm sm:px-7">
        <div className="flex items-center gap-1.5 text-xs font-medium text-orange-600">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          学习入口
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">AI 课程</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
          由人物库里的 AI 教育者与研究者主讲的课程，按方向和难度挑选最该先学的那几门。共 {total} 门。
        </p>
      </section>

      {/* 筛选 */}
      <section className="space-y-3 rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
        <FacetRow
          label="方向"
          options={facets.topics.slice(0, 14).map(t => t.value)}
          active={filters.topic}
          hrefFor={value => buildHref(filters, { topic: filters.topic === value ? null : value })}
        />
        <FacetRow
          label="难度"
          options={facets.levels.map(l => l.value)}
          active={filters.level}
          labelMap={key => LEVEL_CONFIG[key]?.label || key}
          hrefFor={value => buildHref(filters, { level: filters.level === value ? null : value })}
        />
        <FacetRow
          label="类型"
          options={['free', 'paid']}
          active={filters.type}
          labelMap={key => (key === 'free' ? '免费' : '付费')}
          hrefFor={value => buildHref(filters, { type: filters.type === value ? null : value })}
        />
        {hasFilter && (
          <Link href="/courses" prefetch={false} className="inline-flex text-xs font-medium text-orange-600 hover:text-orange-700">
            清除筛选
          </Link>
        )}
      </section>

      {/* 课程网格 */}
      <section>
        <div className="mb-2 text-xs text-stone-500">{courses.length} 门课程</div>
        {courses.length === 0 ? (
          <div className="rounded-xl border border-stone-200 bg-white px-5 py-10 text-center text-sm text-stone-500 shadow-sm">
            这个筛选下暂无课程，换个方向试试。
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map(course => (
              <li key={course.id}>
                <CourseCard course={course} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function FacetRow({
  label,
  options,
  active,
  labelMap,
  hrefFor,
}: {
  label: string;
  options: string[];
  active?: string | null;
  labelMap?: (value: string) => string;
  hrefFor: (value: string) => string;
}) {
  if (options.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 flex-shrink-0 text-xs font-medium text-stone-400">{label}</span>
      {options.map(value => {
        const isActive = active === value;
        return (
          <Link
            key={value}
            href={hrefFor(value)}
            prefetch={false}
            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-orange-500 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-orange-50 hover:text-orange-700'
            }`}
          >
            {labelMap ? labelMap(value) : value}
          </Link>
        );
      })}
    </div>
  );
}

/** 课程横条：嵌到话题页等处，展示该方向最该先学的几门课。 */
export function CoursesStrip({
  courses,
  title,
  subtitle,
  moreHref,
}: {
  courses: CourseHubItem[];
  title: string;
  subtitle?: string;
  moreHref?: string;
}) {
  if (courses.length === 0) return null;
  return (
    <section className="rounded-xl border border-stone-200 bg-white px-5 py-5 shadow-sm">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <div className="text-xs font-semibold text-orange-600">学习入口</div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-950">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs leading-5 text-stone-500">{subtitle}</p>}
        </div>
        {moreHref && (
          <Link href={moreHref} prefetch={false} className="hidden flex-shrink-0 text-xs font-medium text-orange-600 hover:text-orange-700 sm:inline">
            更多课程 →
          </Link>
        )}
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map(course => (
          <li key={course.id}>
            <CourseCard course={course} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function CourseCard({ course }: { course: CourseHubItem }) {
  const platform = PLATFORM_CONFIG[course.platform] || PLATFORM_CONFIG.other;
  const level = course.level ? LEVEL_CONFIG[course.level] : null;

  return (
    <ExternalClickableCard
      href={course.url}
      ariaLabel={`打开课程 ${course.titleZh || course.title}`}
      className="flex h-full cursor-pointer flex-col rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-colors hover:border-orange-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${platform.color}`}>
          {platform.label}
        </span>
        {level && (
          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${level.color}`}>
            {level.label}
          </span>
        )}
        {course.type === 'free' && (
          <span className="inline-flex items-center rounded-md bg-green-100 px-1.5 py-0.5 text-[11px] font-medium text-green-700">
            免费
          </span>
        )}
        {course.rating ? (
          <span className="ml-auto text-[11px] font-medium text-amber-600">★ {formatRating(course.rating)}</span>
        ) : null}
      </div>

      <a
        href={course.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 line-clamp-2 text-sm font-semibold tracking-tight text-stone-950 hover:text-orange-600"
      >
        {course.titleZh || course.title}
      </a>

      {course.description && (
        <p className="mt-1 line-clamp-2 flex-1 text-xs leading-5 text-stone-500">{course.description}</p>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        {course.educator ? (
          <Link
            href={`/person/${course.educator.id}`}
            prefetch={false}
            className="truncate text-xs text-stone-500 hover:text-orange-600"
          >
            讲师 · {course.educator.name}
          </Link>
        ) : (
          <span />
        )}
        {course.duration && <span className="flex-shrink-0 text-[11px] text-stone-400">{course.duration}</span>}
      </div>
    </ExternalClickableCard>
  );
}
