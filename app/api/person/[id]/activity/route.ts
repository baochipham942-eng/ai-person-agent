import { NextResponse } from 'next/server';
import { fetchActivityEvents } from '@/lib/activity';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const data = await fetchActivityEvents({
      personId: id,
      limit: parseInt(searchParams.get('limit') || '6', 10),
      days: parseInt(searchParams.get('days') || '90', 10),
    });

    const response = NextResponse.json({ data });
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    return response;
  } catch (error) {
    console.error('Failed to fetch person activity:', error);
    return NextResponse.json({ error: 'Failed to fetch person activity' }, { status: 500 });
  }
}
