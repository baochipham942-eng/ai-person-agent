import { NextResponse } from 'next/server';
import { fetchRelationshipGraph } from '@/lib/relation-graph';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const searchParams = new URL(request.url).searchParams;
    const firstHopLimit = readLimit(searchParams.get('firstHopLimit'), 4, 24, 10);
    const secondHopLimit = readLimit(searchParams.get('secondHopLimit'), 4, 48, 18);

    const graph = await fetchRelationshipGraph(id, { firstHopLimit, secondHopLimit });
    if (!graph) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      );
    }

    const response = NextResponse.json({ graph });
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
    return response;
  } catch (error) {
    console.error('Failed to fetch relationship graph:', error);
    return NextResponse.json(
      { error: 'Failed to fetch relationship graph' },
      { status: 500 }
    );
  }
}

function readLimit(value: string | null, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}
