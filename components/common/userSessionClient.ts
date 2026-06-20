'use client';

import { useEffect, useSyncExternalStore } from 'react';

export interface MenuUser {
  username: string;
  email: string | null;
  nickname: string | null;
  displayName: string | null;
  avatar: string | null;
  role: 'USER' | 'ADMIN';
  status: string;
}

export type MenuDisplayUser = Pick<MenuUser, 'username' | 'email' | 'nickname' | 'displayName' | 'avatar'>;

interface UserMeResponse {
  authenticated: boolean;
  user: MenuUser | null;
}

export type UserSessionSnapshot = {
  status: 'unknown' | 'loading' | 'authenticated' | 'unauthenticated';
  user: MenuUser | null;
  displayUser: MenuDisplayUser | null;
  fetchedAt: number;
};

const USER_SESSION_STORAGE_KEY = 'ai-person-agent:user-session:v1';
const USER_DISPLAY_STORAGE_KEY = 'ai-person-agent:profile-display:v1';
const USER_SESSION_CACHE_TTL_MS = 5 * 60 * 1000;
const USER_SESSION_UNAUTH_CACHE_TTL_MS = 60 * 1000;
const USER_DISPLAY_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const emptySnapshot = createEmptySnapshot();

function createEmptySnapshot(displayUser: MenuDisplayUser | null = null): UserSessionSnapshot {
  return {
    status: 'unknown',
    user: null,
    displayUser,
    fetchedAt: 0,
  };
}

let snapshot = readStoredSnapshot() ?? createEmptySnapshot(readStoredDisplayUser());
let request: Promise<MenuUser | null> | null = null;
const listeners = new Set<() => void>();

export function useUserSession(): UserSessionSnapshot {
  const session = useSyncExternalStore(subscribeUserSession, getUserSessionSnapshot, getServerUserSessionSnapshot);

  useEffect(() => {
    void ensureUserSession();
  }, []);

  return session;
}

export function ensureUserSession(options: { force?: boolean } = {}): Promise<MenuUser | null> {
  const snapshotAge = Date.now() - snapshot.fetchedAt;
  const hasFreshSnapshot = snapshot.status === 'authenticated'
    ? snapshotAge < USER_SESSION_CACHE_TTL_MS
    : snapshot.status === 'unauthenticated' && snapshotAge < USER_SESSION_UNAUTH_CACHE_TTL_MS;

  if (!options.force && hasFreshSnapshot) {
    return Promise.resolve(snapshot.user);
  }
  if (request) return request;

  if (snapshot.status === 'unknown') {
    setSnapshot({ ...snapshot, status: 'loading' });
  }

  request = fetchUserSession()
    .then(result => {
      setSnapshot(result);
      return result.user;
    })
    .catch(() => {
      if (snapshot.user) return snapshot.user;
      setSnapshot({ status: 'unauthenticated', user: null, displayUser: null, fetchedAt: Date.now() });
      return null;
    })
    .finally(() => {
      request = null;
    });

  return request;
}

export function clearUserSessionCache() {
  request = null;
  setSnapshot({ status: 'unauthenticated', user: null, displayUser: null, fetchedAt: Date.now() });
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(USER_SESSION_STORAGE_KEY);
    window.localStorage.removeItem(USER_DISPLAY_STORAGE_KEY);
  }
}

function subscribeUserSession(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getUserSessionSnapshot() {
  return snapshot;
}

function getServerUserSessionSnapshot() {
  return emptySnapshot;
}

function setSnapshot(next: UserSessionSnapshot) {
  snapshot = next;
  writeStoredSnapshot(next);
  listeners.forEach(listener => listener());
}

async function fetchUserSession(): Promise<UserSessionSnapshot> {
  const response = await fetch('/api/user/me', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to load user session');
  }

  const result = await response.json() as UserMeResponse;
  const now = Date.now();
  if (result.authenticated && result.user) {
    return {
      status: 'authenticated',
      user: result.user,
      displayUser: toDisplayUser(result.user),
      fetchedAt: now,
    };
  }
  return { status: 'unauthenticated', user: null, displayUser: null, fetchedAt: now };
}

function readStoredSnapshot(): UserSessionSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(USER_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = normalizeStoredSnapshot(JSON.parse(raw));
    if (!parsed) return null;
    const ttl = parsed.status === 'authenticated' ? USER_SESSION_CACHE_TTL_MS : USER_SESSION_UNAUTH_CACHE_TTL_MS;
    if (Date.now() - parsed.fetchedAt > ttl) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredSnapshot(next: UserSessionSnapshot) {
  if (typeof window === 'undefined') return;
  try {
    writeStoredDisplayUser(next);
    if (next.status !== 'authenticated' && next.status !== 'unauthenticated') {
      window.sessionStorage.removeItem(USER_SESSION_STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(USER_SESSION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable in private browsing or restricted contexts.
  }
}

function readStoredDisplayUser(): MenuDisplayUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_DISPLAY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { user?: unknown; cachedAt?: unknown };
    if (typeof parsed.cachedAt !== 'number') return null;
    if (Date.now() - parsed.cachedAt > USER_DISPLAY_CACHE_TTL_MS) return null;
    const user = normalizeDisplayUser(parsed.user);
    if (!user) return null;
    return user;
  } catch {
    return null;
  }
}

function writeStoredDisplayUser(next: UserSessionSnapshot) {
  if (typeof window === 'undefined') return;
  try {
    if (next.status === 'authenticated' && next.displayUser) {
      window.localStorage.setItem(USER_DISPLAY_STORAGE_KEY, JSON.stringify({
        user: next.displayUser,
        cachedAt: Date.now(),
      }));
      return;
    }
    if (next.status === 'unauthenticated') {
      window.localStorage.removeItem(USER_DISPLAY_STORAGE_KEY);
    }
  } catch {
    // Display cache is optional and should never block account rendering.
  }
}

function normalizeStoredSnapshot(value: unknown): UserSessionSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<UserSessionSnapshot>;
  if (candidate.status === 'unauthenticated') {
    if (candidate.user !== null || typeof candidate.fetchedAt !== 'number') return null;
    return {
      status: 'unauthenticated',
      user: null,
      displayUser: null,
      fetchedAt: candidate.fetchedAt,
    };
  }

  if (candidate.status !== 'authenticated' || !candidate.user || typeof candidate.fetchedAt !== 'number') return null;
  const user = normalizeMenuUser(candidate.user);
  if (!user) return null;
  return {
    status: 'authenticated',
    user,
    displayUser: normalizeDisplayUser(candidate.displayUser) ?? toDisplayUser(user),
    fetchedAt: candidate.fetchedAt,
  };
}

function normalizeMenuUser(value: unknown): MenuUser | null {
  if (!value || typeof value !== 'object') return null;
  const user = value as Partial<MenuUser>;
  if (typeof user.username !== 'string') return null;
  return {
    username: user.username,
    email: typeof user.email === 'string' ? user.email : null,
    nickname: typeof user.nickname === 'string' ? user.nickname : null,
    displayName: typeof user.displayName === 'string' ? user.displayName : null,
    avatar: typeof user.avatar === 'string' ? user.avatar : null,
    role: user.role === 'ADMIN' ? 'ADMIN' : 'USER',
    status: typeof user.status === 'string' ? user.status : 'ACTIVE',
  };
}

function normalizeDisplayUser(value: unknown): MenuDisplayUser | null {
  if (!value || typeof value !== 'object') return null;
  const user = value as Partial<MenuDisplayUser>;
  if (typeof user.username !== 'string') return null;
  return {
    username: user.username,
    email: typeof user.email === 'string' ? user.email : null,
    nickname: typeof user.nickname === 'string' ? user.nickname : null,
    displayName: typeof user.displayName === 'string' ? user.displayName : null,
    avatar: typeof user.avatar === 'string' ? user.avatar : null,
  };
}

function toDisplayUser(user: MenuUser): MenuDisplayUser {
  return {
    username: user.username,
    email: user.email,
    nickname: user.nickname,
    displayName: user.displayName,
    avatar: user.avatar,
  };
}
