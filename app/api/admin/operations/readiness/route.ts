import { NextResponse } from 'next/server';
import { fetchOperationsReadiness } from '@/lib/operations-readiness';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await fetchOperationsReadiness();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Operations readiness failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch operations readiness' },
      { status: 500 },
    );
  }
}
