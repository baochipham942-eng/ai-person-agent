import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/common/SiteHeader';
import { WorkPageView } from '@/components/work/WorkPageView';
import { fetchWorkPage } from '@/lib/products';

export const revalidate = 300;

interface WorkPageProps {
  params: Promise<{ slug: string }>;
}

function decodeRouteParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateMetadata({ params }: WorkPageProps): Promise<Metadata> {
  const { slug } = await params;
  const work = await fetchWorkPage(decodeRouteParam(slug));
  if (!work) return { title: '作品未找到 | AI 人物库' };
  return {
    title: `${work.name}（${work.typeLabel}） | AI 人物库`,
    description: work.description || `${work.name} 的关键人物、主理方与相关方向。`,
  };
}

export default async function WorkPage({ params }: WorkPageProps) {
  const { slug } = await params;
  const work = await fetchWorkPage(decodeRouteParam(slug));
  if (!work) notFound();

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <SiteHeader current={null} maxWidth="6xl" />
      <div className="border-b border-stone-100 bg-white/70">
        <div className="mx-auto flex max-w-5xl items-center gap-1.5 px-4 py-2 text-xs text-stone-400 sm:px-6">
          <Link href="/" className="font-medium text-stone-500 hover:text-orange-600">
            AI 人物库
          </Link>
          <span>/</span>
          <span className="text-stone-400">作品</span>
          <span>/</span>
          <span className="truncate text-stone-500">{work.name}</span>
        </div>
      </div>
      <WorkPageView work={work} />
    </div>
  );
}
