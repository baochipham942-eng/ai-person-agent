import { NextResponse } from 'next/server';
import { fetchPersonDirectory } from '@/lib/person-directory';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await fetchPersonDirectory({
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '12'),
      topic: searchParams.get('topic'),
      organization: searchParams.get('organization'),
      roleCategory: searchParams.get('roleCategory'),
      search: searchParams.get('search'),
      sortBy: searchParams.get('sortBy') || 'influenceScore',
    });

    const response = NextResponse.json(data);
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return response;
  } catch (error) {
    console.error('Failed to fetch directory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch directory' },
      { status: 500 }
    );
  }
}
