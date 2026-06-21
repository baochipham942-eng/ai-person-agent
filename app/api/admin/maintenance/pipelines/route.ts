import { NextResponse } from 'next/server';
import { requireAdminOrResponse } from '@/lib/auth/permissions';
import { ensurePipelinesRegistered } from '@/lib/admin/pipelines';
import { listPipelines } from '@/lib/admin/pipelines/registry';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { user, response } = await requireAdminOrResponse();
  if (response) return response;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  ensurePipelinesRegistered();
  const pipelines = listPipelines().map(p => ({
    kind: p.kind,
    label: p.label,
    category: p.category,
    optionFields: p.optionFields ?? [],
  }));
  return NextResponse.json({ pipelines });
}
