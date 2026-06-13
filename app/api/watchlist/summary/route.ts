import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { fetchActivityEvents, type ActivityEvent } from '@/lib/activity';
import { normalizeWatchlist } from '@/lib/watchlist';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const watchlist = normalizeWatchlist(body?.watchlist);
    const days = clampNumber(body?.days, 1, 365, 90);
    const limit = clampNumber(body?.limit, 1, 48, 24);
    const peopleIds = watchlist.people.map(item => item.id).slice(0, 40);
    const topics = watchlist.topics.map(item => item.id).slice(0, 20);
    const organizations = watchlist.organizations.map(item => item.id).slice(0, 20);

    const [people, eventGroups] = await Promise.all([
      peopleIds.length > 0
        ? prisma.people.findMany({
            where: {
              id: { in: peopleIds },
              status: { in: ['ready', 'active'] },
            },
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              currentTitle: true,
              organization: true,
              topics: true,
              influenceScore: true,
              weeklyViewCount: true,
            },
            orderBy: [{ influenceScore: 'desc' }, { name: 'asc' }],
          })
        : Promise.resolve([]),
      Promise.all([
        ...peopleIds.slice(0, 20).map(personId => fetchActivityEvents({ personId, limit: 8, days })),
        ...topics.slice(0, 12).map(topic => fetchActivityEvents({ topic, limit: 8, days })),
        ...organizations.slice(0, 12).map(organization => fetchActivityEvents({ organization, limit: 8, days })),
      ]),
    ]);

    const events = dedupeEvents(eventGroups.flat())
      .sort((left, right) => eventTime(right) - eventTime(left))
      .slice(0, limit);

    const response = NextResponse.json({
      people,
      events,
    });
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return response;
  } catch (error) {
    console.error('Failed to build watchlist summary:', error);
    return NextResponse.json(
      { error: 'Failed to build watchlist summary' },
      { status: 500 }
    );
  }
}

function dedupeEvents(events: ActivityEvent[]): ActivityEvent[] {
  const seen = new Set<string>();
  const result: ActivityEvent[] = [];

  for (const event of events) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    result.push(event);
  }

  return result;
}

function eventTime(event: ActivityEvent): number {
  return new Date(event.occurredAt || event.detectedAt).getTime();
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}
