import type { Metadata } from 'next';
import { CompareReportBuilder } from '@/components/compare/CompareReportBuilder';
import { SiteHeader } from '@/components/common/SiteHeader';
import { DEFAULT_COMPARE_TOPIC } from '@/lib/compare-report-agent';

interface ComparePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '人物对比 | AI 人物库',
  description: '管理待对比人物并生成可保存的人物对比报告。',
};

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const resolvedSearchParams = await searchParams;
  const ids = parsePeopleParam(firstParam(resolvedSearchParams?.people));
  const topic = firstParam(resolvedSearchParams?.topic) || DEFAULT_COMPARE_TOPIC;

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <SiteHeader current="compareReports" />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <CompareReportBuilder
          key={ids.join(',') || 'empty'}
          initialTopic={topic}
          initialIds={ids}
        />
      </main>
    </div>
  );
}

function parsePeopleParam(value: string | null): string[] {
  if (!value) return [];
  return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))].slice(0, 3);
}

function firstParam(value?: string | string[] | null): string | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}
