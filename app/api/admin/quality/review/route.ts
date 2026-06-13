import { NextResponse } from 'next/server';
import { fetchQualityReviewQueue, normalizeIssueType, normalizeSeverity } from '@/lib/quality-review';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await fetchQualityReviewQueue({
      limit: Number(searchParams.get('limit') || 40),
      days: Number(searchParams.get('days') || 30),
      staleDays: Number(searchParams.get('staleDays') || 90),
      severity: normalizeSeverity(searchParams.get('severity') as Parameters<typeof normalizeSeverity>[0]),
      issueType: normalizeIssueType(searchParams.get('issueType') as Parameters<typeof normalizeIssueType>[0]),
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Quality review queue failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quality review queue' },
      { status: 500 },
    );
  }
}
