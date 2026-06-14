import { NextResponse } from 'next/server';
import { cancelMaintenanceJob } from '@/lib/admin/maintenance';
import { requireAdminOrResponse } from '@/lib/auth/permissions';

interface CancelRouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: CancelRouteProps) {
  const { user, response } = await requireAdminOrResponse();
  if (response) return response;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null) as { reason?: unknown } | null;
  const reason = typeof body?.reason === 'string' ? body.reason : undefined;

  try {
    const status = await cancelMaintenanceJob(id, user.id, reason);
    return NextResponse.json({ success: true, status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '取消失败' },
      { status: 400 },
    );
  }
}
