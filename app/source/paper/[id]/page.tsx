import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/common/SiteHeader';
import { PaperSourceWorkspace } from '@/components/source/PaperSourceWorkspace';
import { prisma } from '@/lib/db/prisma';
import { getPaperSourceViewModel } from '@/lib/paper-source';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

interface PaperSourcePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PaperSourcePageProps): Promise<Metadata> {
  const { id } = await params;
  const source = await prisma.rawPoolItem.findUnique({
    where: { id },
    select: { title: true, sourceType: true },
  });
  if (!source || source.sourceType !== 'openalex') return { title: '论文资料未找到 | AI 人物库' };
  return {
    title: `${source.title} | 论文资料 | AI 人物库`,
    description: '带 PDF/摘要阅读和结构化导读的 OpenAlex 论文资料页。',
  };
}

export default async function PaperSourcePage({ params }: PaperSourcePageProps) {
  const { id } = await params;
  const viewModel = await getPaperSourceViewModel(id, { generateGuide: false });
  if (!viewModel) notFound();

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <SiteHeader current={null} maxWidth="7xl" />
      <div className="border-b border-stone-100 bg-white/70">
        <div className="mx-auto flex max-w-[1480px] items-center gap-1.5 px-4 py-2 text-xs text-stone-400 sm:px-6">
          <Link href="/" className="font-medium text-stone-500 hover:text-orange-600">
            AI 人物库
          </Link>
          <span>/</span>
          <Link href={`/person/${viewModel.person.id}`} className="font-medium text-stone-500 hover:text-orange-600">
            {viewModel.person.name}
          </Link>
          <span>/</span>
          <span className="truncate text-stone-500">论文资料</span>
        </div>
      </div>
      <PaperSourceWorkspace viewModel={viewModel} />
    </div>
  );
}
