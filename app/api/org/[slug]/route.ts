import { NextResponse } from 'next/server';
import { fetchOrganizationPageData } from '@/lib/entity-pages';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const organization = decodeRouteParam(slug);
    const data = await fetchOrganizationPageData(organization);

    const response = NextResponse.json({ data });
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    return response;
  } catch (error) {
    console.error('Failed to fetch organization page data:', error);
    return NextResponse.json({ error: 'Failed to fetch organization page data' }, { status: 500 });
  }
}

function decodeRouteParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
