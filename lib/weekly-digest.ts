import { prisma } from '@/lib/db/prisma';
import { fetchActivityEvents, type ActivityEvent } from '@/lib/activity';
import { normalizePublicAvatarUrl } from '@/lib/public-avatar';
import {
  buildDirectoryHref,
  buildOrganizationHref,
  buildTopicHref,
  normalizeDirectoryTopics,
} from '@/lib/person-directory-config';

export interface WeeklyDigestPerson {
  id: string;
  name: string;
  avatarUrl: string | null;
  currentTitle: string | null;
  organization: string[];
  topics: string[];
  influenceScore: number;
  citationCount: number;
  githubStars: number;
  weeklyViews: number;
  eventCount: number;
}

export interface WeeklyDigestFacet {
  label: string;
  href: string;
  count: number;
}

export interface WeeklyDigestSource {
  label: string;
  count: number;
}

export interface WeeklyDigestData {
  days: number;
  generatedAt: string;
  windowStart: string;
  windowEnd: string;
  events: ActivityEvent[];
  trendingPeople: WeeklyDigestPerson[];
  topics: WeeklyDigestFacet[];
  organizations: WeeklyDigestFacet[];
  sourceMix: WeeklyDigestSource[];
}

const DEFAULT_DIGEST_DAYS = 7;

export async function fetchWeeklyDigest(days = DEFAULT_DIGEST_DAYS): Promise<WeeklyDigestData> {
  const safeDays = Math.min(30, Math.max(1, Math.floor(days)));
  const now = new Date();
  const since = new Date(now.getTime() - safeDays * 24 * 60 * 60 * 1000);
  const events = await fetchActivityEvents({ limit: 24, days: safeDays });
  const eventPersonIds = [...new Set(events.map(event => event.personId))].slice(0, 24);
  const eventCounts = countBy(events.map(event => event.personId));

  const [topPeople, eventPeople] = await Promise.all([
    prisma.people.findMany({
      where: {
        status: { in: ['ready', 'active'] },
      },
      select: personDigestSelect(since),
      orderBy: [{ weeklyViewCount: 'desc' }, { influenceScore: 'desc' }, { name: 'asc' }],
      take: 18,
    }),
    eventPersonIds.length > 0
      ? prisma.people.findMany({
          where: {
            id: { in: eventPersonIds },
            status: { in: ['ready', 'active'] },
          },
          select: personDigestSelect(since),
        })
      : Promise.resolve([]),
  ]);

  const trendingPeople = uniquePeople([...eventPeople, ...topPeople])
    .map(person => ({
      id: person.id,
      name: person.name,
      avatarUrl: normalizePublicAvatarUrl(person.avatarUrl),
      currentTitle: person.currentTitle,
      organization: person.organization,
      topics: normalizeDirectoryTopics(person.topics),
      influenceScore: person.influenceScore,
      citationCount: person.citationCount,
      githubStars: person.githubStars,
      weeklyViews: person._count.pageViews,
      eventCount: eventCounts.get(person.id) || 0,
    }))
    .sort((left, right) => {
      const eventDelta = right.eventCount - left.eventCount;
      if (eventDelta !== 0) return eventDelta;
      const viewDelta = right.weeklyViews - left.weeklyViews;
      if (viewDelta !== 0) return viewDelta;
      const influenceDelta = right.influenceScore - left.influenceScore;
      if (influenceDelta !== 0) return influenceDelta;
      return left.name.localeCompare(right.name);
    })
    .slice(0, 8);

  return {
    days: safeDays,
    generatedAt: now.toISOString(),
    windowStart: since.toISOString(),
    windowEnd: now.toISOString(),
    events,
    trendingPeople,
    topics: buildTopicFacets(events, trendingPeople),
    organizations: buildOrganizationFacets(events, trendingPeople),
    sourceMix: buildSourceMix(events),
  };
}

function personDigestSelect(since: Date) {
  return {
    id: true,
    name: true,
    avatarUrl: true,
    currentTitle: true,
    organization: true,
    topics: true,
    influenceScore: true,
    citationCount: true,
    githubStars: true,
    _count: {
      select: {
        pageViews: {
          where: {
            viewedAt: { gte: since },
          },
        },
      },
    },
  } as const;
}

function uniquePeople<T extends { id: string }>(people: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const person of people) {
    if (seen.has(person.id)) continue;
    seen.add(person.id);
    result.push(person);
  }

  return result;
}

function buildTopicFacets(events: ActivityEvent[], people: WeeklyDigestPerson[]): WeeklyDigestFacet[] {
  const counts = countBy([
    ...events.flatMap(event => event.topics),
    ...people.flatMap(person => person.topics.slice(0, 4)),
  ]);

  return topFacets(counts, label => buildTopicHref(label));
}

function buildOrganizationFacets(events: ActivityEvent[], people: WeeklyDigestPerson[]): WeeklyDigestFacet[] {
  const counts = countBy([
    ...events.flatMap(event => event.organizations),
    ...people.flatMap(person => person.organization.slice(0, 3)),
  ]);

  return topFacets(counts, label => buildOrganizationHref(label));
}

function buildSourceMix(events: ActivityEvent[]): WeeklyDigestSource[] {
  return [...countBy(events.map(event => event.sourceLabel)).entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, 6);
}

function topFacets(counts: Map<string, number>, hrefFor: (label: string) => string): WeeklyDigestFacet[] {
  return [...counts.entries()]
    .filter(([label]) => label.length > 0)
    .map(([label, count]) => ({
      label,
      count,
      href: hrefFor(label),
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, 8);
}

function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }

  return counts;
}

export function weeklyDigestDirectoryHref(sortBy: 'weeklyViewCount' | 'influenceScore' = 'weeklyViewCount') {
  return buildDirectoryHref({ sortBy });
}
