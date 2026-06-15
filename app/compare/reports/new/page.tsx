import type { Metadata } from 'next';
import { CompareReportBuilder } from '@/components/compare/CompareReportBuilder';
import { IdentityWorkspaceLayout } from '@/components/common/IdentityWorkspaceLayout';
import { fetchComparePeople } from '@/lib/compare';
import { DEFAULT_COMPARE_TOPIC } from '@/lib/compare-report-agent';

interface NewCompareReportPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '新建对比报告 | AI 人物库',
  description: '选择人物并生成一份可保存的人物对比分析报告。',
};

export default async function NewCompareReportPage({ searchParams }: NewCompareReportPageProps) {
  const resolvedSearchParams = await searchParams;
  const ids = parsePeopleParam(firstParam(resolvedSearchParams?.people));
  const topic = firstParam(resolvedSearchParams?.topic) || DEFAULT_COMPARE_TOPIC;
  const people = ids.length > 0 ? await fetchComparePeople(ids) : [];

  return (
    <IdentityWorkspaceLayout identity="user">
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <CompareReportBuilder
          initialTopic={topic}
          initialPeople={people.map(person => ({
            id: person.id,
            name: person.name,
            avatarUrl: person.avatarUrl,
            currentTitle: person.currentTitle || person.organization[0] || null,
            topics: person.topics,
          }))}
        />
      </main>
    </IdentityWorkspaceLayout>
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
