'use client';

import Link from 'next/link';
import { useMemo, useSyncExternalStore, type MouseEvent } from 'react';
import {
  buildCompareHref,
  decodeCompareIdsSnapshot,
  getCompareIdsSnapshot,
  getEmptyCompareIdsSnapshot,
  notifyCompareChanged,
  readCompareIds,
  subscribeCompareIds,
  writeCompareIds,
  type CompareTarget,
} from '@/components/common/compareSelection';

interface CompareButtonProps {
  target: CompareTarget;
  size?: 'xs' | 'sm';
  className?: string;
}

export function CompareButton({ target, size = 'xs', className = '' }: CompareButtonProps) {
  const idsSnapshot = useSyncExternalStore(subscribeCompareIds, getCompareIdsSnapshot, getEmptyCompareIdsSnapshot);
  const ids = useMemo(() => decodeCompareIdsSnapshot(idsSnapshot), [idsSnapshot]);
  const isSelected = ids.includes(target.id);
  const compareHref = useMemo(() => buildCompareHref(ids), [ids]);

  const toggleCompare = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const current = readCompareIds();
    const next = isSelected
      ? current.filter(id => id !== target.id)
      : [target.id, ...current.filter(id => id !== target.id)];

    writeCompareIds(next);
    notifyCompareChanged();
  };

  const buttonSize = size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-6 px-1.5 text-[10px]';

  return (
    <div className={`inline-flex items-center gap-1 ${className}`} onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={toggleCompare}
        className={`${buttonSize} rounded-md border font-medium transition-colors ${
          isSelected
            ? 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-white'
            : 'border-stone-200 bg-white text-stone-500 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700'
        }`}
        aria-pressed={isSelected}
      >
        {isSelected ? '已加入对比' : '加入对比'}
      </button>
      {ids.length >= 2 && (
        <Link
          href={compareHref}
          prefetch={false}
          className={`${buttonSize} inline-flex items-center rounded-md bg-stone-900 font-medium text-white transition-colors hover:bg-orange-600`}
        >
          对比
        </Link>
      )}
    </div>
  );
}
