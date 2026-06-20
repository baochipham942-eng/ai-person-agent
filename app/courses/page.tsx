import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/common/SiteHeader';
import { CoursesHubView, type CoursesHubFilters } from '@/components/courses/CoursesHubView';
import { fetchCoursesHub } from '@/lib/courses';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'AI 课程 | AI 人物库',
  description: '由 AI 教育者与研究者主讲的课程，按方向和难度挑选最该先学的那几门。',
};

interface CoursesPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const resolved = await searchParams;
  const filters: CoursesHubFilters = {
    topic: firstParam(resolved?.topic),
    level: firstParam(resolved?.level),
    type: firstParam(resolved?.type),
  };

  const hub = await fetchCoursesHub(filters).catch(error => {
    console.error('Failed to fetch courses hub:', error);
    return { courses: [], total: 0, facets: { topics: [], levels: [], platforms: [] } };
  });

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <SiteHeader current="courses" maxWidth="6xl" />
      <div className="border-b border-stone-100 bg-white/70">
        <div className="mx-auto flex max-w-6xl items-center gap-1.5 px-4 py-2 text-xs text-stone-400 sm:px-6">
          <Link href="/" className="font-medium text-stone-500 hover:text-orange-600">
            AI 人物库
          </Link>
          <span>/</span>
          <span className="truncate text-stone-500">AI 课程</span>
        </div>
      </div>
      <CoursesHubView hub={hub} filters={filters} />
    </div>
  );
}
