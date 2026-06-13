import {
  buildOrganizationHref,
  buildTopicHref,
  normalizeDirectoryTopic,
} from '@/lib/person-directory-config';

export type WatchTargetType = 'person' | 'topic' | 'organization';

export interface WatchTarget {
  type: WatchTargetType;
  id: string;
  label: string;
  href: string;
}

export interface WatchlistSnapshot {
  people: WatchTarget[];
  topics: WatchTarget[];
  organizations: WatchTarget[];
  updatedAt: string | null;
}

export const WATCHLIST_STORAGE_KEY = 'ai_person_watchlist_v1';
export const WATCHLIST_CHANGED_EVENT = 'ai-person-watchlist-changed';

const COLLECTION_BY_TYPE = {
  person: 'people',
  topic: 'topics',
  organization: 'organizations',
} as const satisfies Record<WatchTargetType, keyof Omit<WatchlistSnapshot, 'updatedAt'>>;

export function emptyWatchlist(): WatchlistSnapshot {
  return {
    people: [],
    topics: [],
    organizations: [],
    updatedAt: null,
  };
}

export function targetCollection(type: WatchTargetType): keyof Omit<WatchlistSnapshot, 'updatedAt'> {
  return COLLECTION_BY_TYPE[type];
}

export function normalizeWatchTarget(target: WatchTarget): WatchTarget {
  const rawId = target.id.trim();
  const id = target.type === 'topic' ? normalizeDirectoryTopic(rawId) : rawId;
  const rawLabel = target.label.trim() || rawId;
  const label = target.type === 'topic' ? normalizeDirectoryTopic(rawLabel) : rawLabel;

  return {
    type: target.type,
    id,
    label,
    href: target.type === 'topic' ? defaultWatchHref(target.type, id) : target.href || defaultWatchHref(target.type, id),
  };
}

export function defaultWatchHref(type: WatchTargetType, id: string): string {
  if (type === 'person') return `/person/${id}`;
  if (type === 'topic') return buildTopicHref(id);
  return buildOrganizationHref(id);
}

export function hasWatchTarget(watchlist: WatchlistSnapshot, target: Pick<WatchTarget, 'type' | 'id'>): boolean {
  const collection = targetCollection(target.type);
  const id = target.type === 'topic' ? normalizeDirectoryTopic(target.id) : target.id.trim();
  return watchlist[collection].some(item => item.id === id);
}

export function setWatchTarget(
  watchlist: WatchlistSnapshot,
  target: WatchTarget,
  following: boolean
): WatchlistSnapshot {
  const normalized = normalizeWatchTarget(target);
  const collection = targetCollection(normalized.type);
  const withoutTarget = watchlist[collection].filter(item => item.id !== normalized.id);

  return {
    ...watchlist,
    [collection]: following ? [...withoutTarget, normalized] : withoutTarget,
    updatedAt: new Date().toISOString(),
  };
}

export function mergeWatchlists(...snapshots: WatchlistSnapshot[]): WatchlistSnapshot {
  const merged = emptyWatchlist();

  for (const snapshot of snapshots) {
    mergeCollection(merged.people, snapshot.people);
    mergeCollection(merged.topics, snapshot.topics);
    mergeCollection(merged.organizations, snapshot.organizations);
    if (snapshot.updatedAt && (!merged.updatedAt || snapshot.updatedAt > merged.updatedAt)) {
      merged.updatedAt = snapshot.updatedAt;
    }
  }

  return merged;
}

export function readLocalWatchlist(): WatchlistSnapshot {
  if (typeof window === 'undefined') return emptyWatchlist();

  try {
    const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return emptyWatchlist();
    return normalizeWatchlist(JSON.parse(raw));
  } catch {
    return emptyWatchlist();
  }
}

export function writeLocalWatchlist(watchlist: WatchlistSnapshot) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(normalizeWatchlist(watchlist)));
  window.dispatchEvent(new CustomEvent(WATCHLIST_CHANGED_EVENT));
}

export function normalizeWatchlist(value: unknown): WatchlistSnapshot {
  if (!isRecord(value)) return emptyWatchlist();

  return {
    people: normalizeCollection(value.people, 'person'),
    topics: normalizeCollection(value.topics, 'topic'),
    organizations: normalizeCollection(value.organizations, 'organization'),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
  };
}

function normalizeCollection(value: unknown, type: WatchTargetType): WatchTarget[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: WatchTarget[] = [];

  for (const item of value) {
    const target = normalizeRawTarget(item, type);
    if (!target || seen.has(target.id)) continue;
    seen.add(target.id);
    items.push(target);
  }

  return items;
}

function normalizeRawTarget(value: unknown, type: WatchTargetType): WatchTarget | null {
  if (typeof value === 'string') {
    const id = value.trim();
    if (!id) return null;
    return normalizeWatchTarget({
      type,
      id,
      label: id,
      href: defaultWatchHref(type, id),
    });
  }

  if (!isRecord(value)) return null;
  const id = typeof value.id === 'string' ? value.id.trim() : '';
  if (!id) return null;

  return normalizeWatchTarget({
    type,
    id,
    label: typeof value.label === 'string' ? value.label : id,
    href: typeof value.href === 'string' ? value.href : defaultWatchHref(type, id),
  });
}

function mergeCollection(target: WatchTarget[], source: WatchTarget[]) {
  const existing = new Set(target.map(item => item.id));
  for (const item of source) {
    const normalized = normalizeWatchTarget(item);
    if (existing.has(normalized.id)) continue;
    existing.add(normalized.id);
    target.push(normalized);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
