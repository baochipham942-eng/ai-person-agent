export interface CompareTarget {
  id: string;
  name: string;
}

export const COMPARE_STORAGE_KEY = 'ai_person_compare_v1';
export const COMPARE_CHANGED_EVENT = 'ai_person_compare_changed';
export const MAX_COMPARE_PEOPLE = 3;

export function readCompareIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COMPARE_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return uniqueCompareIds(parsed.filter((item): item is string => typeof item === 'string'));
  } catch {
    return [];
  }
}

export function writeCompareIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(uniqueCompareIds(ids).slice(0, MAX_COMPARE_PEOPLE)));
}

export function notifyCompareChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(COMPARE_CHANGED_EVENT));
}

export function subscribeCompareIds(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(COMPARE_CHANGED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(COMPARE_CHANGED_EVENT, onStoreChange);
  };
}

export function getCompareIdsSnapshot() {
  return readCompareIds().join('\n');
}

export function getEmptyCompareIdsSnapshot() {
  return '';
}

export function decodeCompareIdsSnapshot(snapshot: string): string[] {
  return uniqueCompareIds(snapshot.split('\n'));
}

export function uniqueCompareIds(ids: string[]): string[] {
  return [...new Set(ids.map(id => id.trim()).filter(Boolean))];
}

export function buildCompareHref(ids: string[]): string {
  const query = uniqueCompareIds(ids).slice(0, MAX_COMPARE_PEOPLE).join(',');
  return query ? `/compare?people=${encodeURIComponent(query)}` : '/compare';
}
