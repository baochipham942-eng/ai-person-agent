import { NextResponse } from 'next/server';
import { requireAdminOrResponse } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/prisma';

interface ToggleRouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: ToggleRouteProps) {
  const { user, response } = await requireAdminOrResponse();
  if (response) return response;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const schedule = await prisma.maintenanceSchedule.findUnique({
    where: { id },
    select: {
      enabled: true,
      intervalHours: true,
    },
  });

  if (!schedule) {
    return NextResponse.json({ error: '定时任务不存在' }, { status: 404 });
  }

  const nextEnabled = !schedule.enabled;
  const nextRunAt = nextEnabled ? addHours(new Date(), clampInteger(schedule.intervalHours, 1, 24 * 14, 24)) : null;
  await prisma.maintenanceSchedule.update({
    where: { id },
    data: {
      enabled: nextEnabled,
      nextRunAt,
    },
  });

  await prisma.userAuditLog.create({
    data: {
      actorUserId: user.id,
      action: nextEnabled ? 'ADMIN_ENABLED_MAINTENANCE_SCHEDULE' : 'ADMIN_DISABLED_MAINTENANCE_SCHEDULE',
      metadata: {
        scheduleId: id,
        nextRunAt: nextRunAt?.toISOString() || null,
      },
    },
  });

  return NextResponse.json({ success: true, enabled: nextEnabled });
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function addHours(value: Date, hours: number): Date {
  return new Date(value.getTime() + hours * 60 * 60 * 1000);
}
