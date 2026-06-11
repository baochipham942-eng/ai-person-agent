import { Suspense } from 'react';
import { ResearcherDirectory } from '@/components/home/ResearcherDirectory';
import { getInitialDirectoryFilters } from '@/lib/person-directory-config';
import { fetchPersonDirectory } from '@/lib/person-directory';

function LoadingFallback() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center"
      style={{ background: 'var(--background)' }}
      aria-live="polite"
    >
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm"
        style={{ background: 'var(--gradient-primary)' }}
      >
        <span className="text-white text-sm font-semibold">AI</span>
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium text-stone-900">AI 人物库</div>
        <div className="text-xs text-stone-500">正在加载研究者</div>
      </div>
      <div
        className="w-8 h-8 rounded-full animate-spin"
        style={{ border: '3px solid transparent', borderTopColor: '#f97316', borderRightColor: '#ec4899' }}
      />
    </div>
  );
}

interface HomePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const initialFilters = getInitialDirectoryFilters({
    view: resolvedSearchParams?.view,
    topic: resolvedSearchParams?.topic,
    organization: resolvedSearchParams?.organization,
    role: resolvedSearchParams?.role,
    search: resolvedSearchParams?.search,
  });

  const initialData = await fetchPersonDirectory({
    page: 1,
    limit: 12,
    topic: initialFilters.topic,
    organization: initialFilters.organization,
    roleCategory: initialFilters.role,
    search: initialFilters.search,
    sortBy: 'influenceScore',
  });

  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResearcherDirectory initialData={initialData} initialFilters={initialFilters} />
    </Suspense>
  );
}
