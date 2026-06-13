'use client';

import Link from 'next/link';
import { useMemo, useSyncExternalStore, type MouseEvent } from 'react';

interface CompareTarget {
  id: string;
  name: string;
}

interface CompareButtonProps {
  target: CompareTarget;
  size?: 'xs' | 'sm';
  className?: string;
}

const COMPARE_STORAGE_KEY = 'ai_person_compare_v1';
const COMPARE_CHANGED_EVENT = 'ai_person_compare_changed';
const MAX_COMPARE_PEOPLE = 3;

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
      : [target.id, ...current.filter(id => id !== target.id)].slice(0, MAX_COMPARE_PEOPLE);

    writeCompareIds(next);
    window.dispatchEvent(new Event(COMPARE_CHANGED_EVENT));
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
          className={`${buttonSize} inline-flex items-center rounded-md bg-stone-900 font-medium text-white transition-colors hover:bg-orange-600`}
        >
          对比
        </Link>
      )}
    </div>
  );
}

function readCompareIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COMPARE_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return uniqueIds(parsed.filter((item): item is string => typeof item === 'string'));
  } catch {
    return [];
  }
}

function writeCompareIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(uniqueIds(ids).slice(0, MAX_COMPARE_PEOPLE)));
}

function subscribeCompareIds(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(COMPARE_CHANGED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(COMPARE_CHANGED_EVENT, onStoreChange);
  };
}

function getCompareIdsSnapshot() {
  return readCompareIds().join('\n');
}

function getEmptyCompareIdsSnapshot() {
  return '';
}

function decodeCompareIdsSnapshot(snapshot: string): string[] {
  return uniqueIds(snapshot.split('\n'));
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.map(id => id.trim()).filter(Boolean))];
}

function buildCompareHref(ids: string[]): string {
  const query = uniqueIds(ids).slice(0, MAX_COMPARE_PEOPLE).join(',');
  return query ? `/compare?people=${encodeURIComponent(query)}` : '/compare';
}
