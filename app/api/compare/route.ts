import { NextResponse } from 'next/server';
import { fetchComparePeople } from '@/lib/compare';
import { generateCompareReport } from '@/lib/compare-report';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = parsePeopleParam(searchParams.get('people'));
    const people = await fetchComparePeople(ids);
    const report = generateCompareReport(people);

    const response = NextResponse.json({ data: { people, report } });
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    return response;
  } catch (error) {
    console.error('Failed to fetch compare report:', error);
    return NextResponse.json({ error: 'Failed to fetch compare report' }, { status: 500 });
  }
}

function parsePeopleParam(value: string | null): string[] {
  if (!value) return [];
  return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))].slice(0, 3);
}
