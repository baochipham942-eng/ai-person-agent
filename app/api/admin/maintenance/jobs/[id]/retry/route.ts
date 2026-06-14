import { NextResponse } from 'next/server';
import { requireAdminOrResponse } from '@/lib/auth/permissions';
import { retryMaintenanceJob } from '@/lib/admin/maintenance';

interface RetryRouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RetryRouteProps) {
  const { user, response } = await requireAdminOrResponse();
  if (response) return response;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const jobId = await retryMaintenanceJob(id, user.id);
    return NextResponse.json({ success: true, jobId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '重试失败' },
      { status: 400 },
    );
  }
}

