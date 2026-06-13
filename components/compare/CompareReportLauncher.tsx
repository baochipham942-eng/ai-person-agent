'use client';

import Link from 'next/link';
import type { ComparePersonOption } from '@/components/compare/CompareReportBuilder';

interface CompareReportLauncherProps {
  initialPeople?: ComparePersonOption[];
  triggerLabel?: string;
  triggerClassName?: string;
}

export function CompareReportLauncher({
  initialPeople = [],
  triggerLabel = '生成对比报告',
  triggerClassName = '',
}: CompareReportLauncherProps) {
  const href = buildNewReportHref(initialPeople);

  return (
    <Link
      href={href}
      className={triggerClassName || 'rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-orange-600'}
    >
      {triggerLabel}
    </Link>
  );
}

function buildNewReportHref(people: ComparePersonOption[]): string {
  const ids = people.map(person => person.id).filter(Boolean).slice(0, 3);
  if (ids.length === 0) return '/compare/reports/new';
  return `/compare/reports/new?people=${encodeURIComponent(ids.join(','))}`;
}
