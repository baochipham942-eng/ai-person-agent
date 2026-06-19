import { NextResponse } from 'next/server';
import { resolveWeeklyPicks } from '@/lib/home/weekly-picks';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await resolveWeeklyPicks({
      topic: searchParams.get('topic'),
      organization: searchParams.get('organization'),
      limit: searchParams.has('limit') ? parseInt(searchParams.get('limit') || '8', 10) : undefined,
    });

    const response = NextResponse.json({ data });
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    return response;
  } catch (error) {
    console.error('Failed to resolve weekly picks:', error);
    return NextResponse.json({ error: 'Failed to resolve weekly picks' }, { status: 500 });
  }
}
