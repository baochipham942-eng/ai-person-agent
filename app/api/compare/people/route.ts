import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('query') || '').trim();

    if (query.length < 1) {
      return NextResponse.json({ data: [] });
    }

    const people = await prisma.people.findMany({
      where: {
        status: { in: ['ready', 'active'] },
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { aliases: { has: query } },
          { currentTitle: { contains: query, mode: 'insensitive' } },
          { organization: { has: query } },
          { topics: { has: query } },
        ],
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        currentTitle: true,
        organization: true,
        topics: true,
        influenceScore: true,
      },
      orderBy: [{ influenceScore: 'desc' }, { name: 'asc' }],
      take: 8,
    });

    return NextResponse.json({
      data: people.map(person => ({
        id: person.id,
        name: person.name,
        avatarUrl: person.avatarUrl,
        currentTitle: person.currentTitle || person.organization[0] || null,
        topics: person.topics.slice(0, 4),
        influenceScore: person.influenceScore,
      })),
    });
  } catch (error) {
    console.error('Failed to search compare people:', error);
    return NextResponse.json({ error: '搜索人物失败' }, { status: 500 });
  }
}
