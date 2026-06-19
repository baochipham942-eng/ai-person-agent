import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { fetchTopicPageData } from '@/lib/entity-pages';
import { normalizeDirectoryTopic } from '@/lib/person-directory-config';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

const loadTopicApiData = unstable_cache(
  async (topic: string) => fetchTopicPageData(topic),
  ['topic-api-data-v1'],
  { revalidate: 300 }
);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const topic = normalizeDirectoryTopic(decodeRouteParam(slug));
    const data = await loadTopicApiData(topic);

    const response = NextResponse.json({ data });
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    return response;
  } catch (error) {
    console.error('Failed to fetch topic page data:', error);
    return NextResponse.json({ error: 'Failed to fetch topic page data' }, { status: 500 });
  }
}

function decodeRouteParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
