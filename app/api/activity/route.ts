import { NextResponse } from 'next/server';
import { fetchActivityEvents } from '@/lib/activity';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await fetchActivityEvents({
      topic: searchParams.get('topic'),
      organization: searchParams.get('organization'),
      limit: parseInt(searchParams.get('limit') || '12', 10),
      days: parseInt(searchParams.get('days') || '30', 10),
    });

    const response = NextResponse.json({ data });
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    return response;
  } catch (error) {
    console.error('Failed to fetch activity:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
