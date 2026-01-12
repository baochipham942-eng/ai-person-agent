import { Suspense } from 'react';
import { ResearcherDirectory } from '@/components/home/ResearcherDirectory';

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '3px solid transparent', borderTopColor: '#f97316', borderRightColor: '#ec4899' }}></div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResearcherDirectory />
    </Suspense>
  );
}
