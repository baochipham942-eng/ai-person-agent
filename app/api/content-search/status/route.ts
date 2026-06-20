import { NextRequest, NextResponse } from 'next/server';
import { getSearchIndexReadiness } from '@/lib/search/search-readiness';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query') || 'agent';
  try {
    const readiness = await getSearchIndexReadiness(query);
    const status = readiness.status === 'blocked' ? 503 : 200;
    const response = NextResponse.json(readiness, { status });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    return NextResponse.json(
      { status: 'blocked', error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
