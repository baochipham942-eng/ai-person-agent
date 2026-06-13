import { Prisma, type UserProfile } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { normalizeDirectoryTopic } from '@/lib/person-directory-config';
import {
  defaultWatchHref,
  emptyWatchlist,
  mergeWatchlists,
  normalizeWatchTarget,
  setWatchTarget,
  type WatchTarget,
  type WatchlistSnapshot,
} from '@/lib/watchlist';

interface TopicInterestState {
  topics: string[];
  organizations: string[];
}

export async function getUserWatchlist(userId: string): Promise<WatchlistSnapshot> {
  const profile = await getOrCreateUserProfile(userId);
  const topicState = normalizeTopicInterests(profile.topicInterests);
  const personIds = uniqueStrings(profile.subscribedPeople);
  const people = personIds.length > 0
    ? await prisma.people.findMany({
        where: { id: { in: personIds } },
        select: {
          id: true,
          name: true,
        },
      })
    : [];
  const peopleById = new Map(people.map(person => [person.id, person.name]));

  return {
    people: personIds.map(id => ({
      type: 'person',
      id,
      label: peopleById.get(id) || id,
      href: defaultWatchHref('person', id),
    })),
    topics: topicState.topics.map(topic => ({
      type: 'topic',
      id: topic,
      label: topic,
      href: defaultWatchHref('topic', topic),
    })),
    organizations: topicState.organizations.map(organization => ({
      type: 'organization',
      id: organization,
      label: organization,
      href: defaultWatchHref('organization', organization),
    })),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export async function setUserFollow(
  userId: string,
  target: WatchTarget,
  following: boolean
): Promise<WatchlistSnapshot> {
  const normalized = normalizeWatchTarget(target);
  const profile = await getOrCreateUserProfile(userId);
  const current = await profileToWatchlist(profile);
  const next = setWatchTarget(current, normalized, following);

  await prisma.userProfile.update({
    where: { userId },
    data: {
      subscribedPeople: next.people.map(item => item.id),
      topicInterests: {
        topics: next.topics.map(item => item.id),
        organizations: next.organizations.map(item => item.id),
      } satisfies Prisma.InputJsonObject,
    },
  });

  return getUserWatchlist(userId);
}

export async function mergeUserWatchlist(
  userId: string,
  localWatchlist: WatchlistSnapshot
): Promise<WatchlistSnapshot> {
  const serverWatchlist = await getUserWatchlist(userId);
  const merged = mergeWatchlists(serverWatchlist, localWatchlist);

  await prisma.userProfile.update({
    where: { userId },
    data: {
      subscribedPeople: merged.people.map(item => item.id),
      topicInterests: {
        topics: merged.topics.map(item => item.id),
        organizations: merged.organizations.map(item => item.id),
      } satisfies Prisma.InputJsonObject,
    },
  });

  return getUserWatchlist(userId);
}

async function getOrCreateUserProfile(userId: string): Promise<UserProfile> {
  const existing = await prisma.userProfile.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.userProfile.create({
    data: {
      userId,
    },
  });
}

async function profileToWatchlist(profile: UserProfile): Promise<WatchlistSnapshot> {
  const topicState = normalizeTopicInterests(profile.topicInterests);

  return {
    ...emptyWatchlist(),
    people: uniqueStrings(profile.subscribedPeople).map(id => ({
      type: 'person',
      id,
      label: id,
      href: defaultWatchHref('person', id),
    })),
    topics: topicState.topics.map(topic => ({
      type: 'topic',
      id: topic,
      label: topic,
      href: defaultWatchHref('topic', topic),
    })),
    organizations: topicState.organizations.map(organization => ({
      type: 'organization',
      id: organization,
      label: organization,
      href: defaultWatchHref('organization', organization),
    })),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

function normalizeTopicInterests(value: Prisma.JsonValue): TopicInterestState {
  if (!isRecord(value)) return { topics: [], organizations: [] };

  const topics = Array.isArray(value.topics)
    ? uniqueStrings(value.topics.filter((item): item is string => typeof item === 'string'))
    : objectKeysFromTruthyValues(value.topicMap);

  const organizations = Array.isArray(value.organizations)
    ? uniqueStrings(value.organizations.filter((item): item is string => typeof item === 'string'))
    : objectKeysFromTruthyValues(value.organizationMap);

  const legacyTopics = Object.keys(value)
    .filter(key => !['topics', 'organizations', 'topicMap', 'organizationMap'].includes(key))
    .filter(key => Boolean(value[key]));

  return {
    topics: uniqueStrings([...topics, ...legacyTopics].map(normalizeDirectoryTopic)),
    organizations,
  };
}

function objectKeysFromTruthyValues(value: unknown): string[] {
  if (!isRecord(value)) return [];
  return Object.keys(value).filter(key => Boolean(value[key]));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
