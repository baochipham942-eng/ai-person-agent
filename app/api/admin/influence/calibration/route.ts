import { NextResponse } from 'next/server';
import {
  fetchInfluenceCalibration,
  recordInfluenceCalibrationAudit,
  type InfluenceCalibrationStatus,
} from '@/lib/influence-calibration';

export const dynamic = 'force-dynamic';

const SUPPORTED_STATUS = new Set(['all', 'aligned', 'review', 'large_gap']);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = normalizeStatus(searchParams.get('status'));
    const snapshot = await fetchInfluenceCalibration({
      limit: Number(searchParams.get('limit') || 36),
      topic: searchParams.get('topic'),
      search: searchParams.get('search'),
      status,
    });

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('Influence calibration fetch failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch influence calibration' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.AUTH_SECRET || authHeader !== `Bearer ${process.env.AUTH_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const personId = typeof body.personId === 'string' ? body.personId : '';
    if (!personId) {
      return NextResponse.json({ error: 'Missing personId' }, { status: 400 });
    }

    const audit = await recordInfluenceCalibrationAudit({
      personId,
      reason: typeof body.reason === 'string' ? body.reason : null,
      reviewer: typeof body.reviewer === 'string' ? body.reviewer : null,
      status: body.status === 'ignored' || body.status === 'applied' ? body.status : 'reviewed',
      applyScore: Boolean(body.applyScore),
      calibratedScore: typeof body.calibratedScore === 'number' ? body.calibratedScore : null,
    });

    return NextResponse.json({
      success: true,
      audit: {
        id: audit.id,
        personId: audit.personId,
        scoreVersion: audit.scoreVersion,
        previousScore: audit.previousScore,
        computedScore: audit.computedScore,
        appliedScore: audit.appliedScore,
        status: audit.status,
        createdAt: audit.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === 'Person not found' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

function normalizeStatus(value: string | null): InfluenceCalibrationStatus | 'all' {
  if (value && SUPPORTED_STATUS.has(value)) {
    return value as InfluenceCalibrationStatus | 'all';
  }
  return 'all';
}
