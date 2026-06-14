import { NextResponse } from 'next/server';
import { requireAdminOrResponse } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/prisma';
import {
  MAINTENANCE_SOURCE_TYPES,
  type MaintenanceKind,
  type MaintenanceRefreshMode,
  type MaintenanceSourceType,
} from '@/lib/admin/maintenance';

export const dynamic = 'force-dynamic';

type SchedulableKind = Exclude<MaintenanceKind, 'new_person_build'>;

export async function POST(request: Request) {
  const { user, response } = await requireAdminOrResponse();
  if (response) return response;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const kind = typeof body?.kind === 'string' ? body.kind : '';
  const dryRun = body?.dryRun !== false;
  const enabled = body?.enabled === true;
  const intervalHours = clampInteger(body?.intervalHours, 1, 24 * 14, 24);
  const targetPersonIds = normalizePersonIds(body?.targetPersonIds);
  const rawOptions = isRecord(body?.options) ? body.options : {};
  const options = sanitizeOptions(body?.options);

  if (!name) {
    return NextResponse.json({ error: '请填写定时任务名称' }, { status: 400 });
  }

  if (!isSchedulableKind(kind)) {
    return NextResponse.json({ error: '定时任务只支持已有人物刷新' }, { status: 400 });
  }

  if (kind === 'single_person_refresh' && targetPersonIds.length === 0) {
    return NextResponse.json({ error: '请选择一个人物' }, { status: 400 });
  }

  if (kind === 'multi_person_refresh' && targetPersonIds.length === 0) {
    return NextResponse.json({ error: '请填写至少一个人物 ID' }, { status: 400 });
  }

  if (rawOptions.refreshMode === 'rebuild') {
    return NextResponse.json({ error: '定时任务不支持清空重建，请手动执行' }, { status: 400 });
  }

  const now = new Date();
  const schedule = await prisma.maintenanceSchedule.create({
    data: {
      name,
      enabled,
      kind,
      dryRun,
      targetPersonIds,
      options,
      intervalHours,
      nextRunAt: enabled ? addHours(now, intervalHours) : null,
      createdById: user.id,
    },
    select: {
      id: true,
    },
  });

  await prisma.userAuditLog.create({
    data: {
      actorUserId: user.id,
      action: 'ADMIN_CREATED_MAINTENANCE_SCHEDULE',
      metadata: toJsonObject({
        scheduleId: schedule.id,
        name,
        kind,
        dryRun,
        enabled,
        intervalHours,
        targetPersonCount: targetPersonIds.length,
        options,
      }),
    },
  });

  return NextResponse.json({ success: true, scheduleId: schedule.id }, { status: 201 });
}

function isSchedulableKind(value: string): value is SchedulableKind {
  return value === 'single_person_refresh' || value === 'multi_person_refresh' || value === 'all_people_refresh';
}

function sanitizeOptions(value: unknown): {
  status: string;
  limit: number;
  search: string;
  refreshMode: Exclude<MaintenanceRefreshMode, 'rebuild'>;
  sourceTypes: MaintenanceSourceType[];
} {
  const options = isRecord(value) ? value : {};
  const refreshMode = options.refreshMode === 'force' ? 'force' : 'incremental';
  return {
    status: typeof options.status === 'string' ? options.status.trim() || 'all' : 'all',
    limit: clampInteger(options.limit, 1, 5000, 100),
    search: typeof options.search === 'string' ? options.search.trim() : '',
    refreshMode,
    sourceTypes: normalizeSourceTypes(options.sourceTypes),
  };
}

function normalizePersonIds(value: unknown): string[] {
  if (Array.isArray(value)) return uniqueStrings(value.filter((item): item is string => typeof item === 'string'));
  if (typeof value === 'string') return uniqueStrings(value.split(/[\s,]+/));
  return [];
}

function normalizeSourceTypes(value: unknown): MaintenanceSourceType[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .map(item => typeof item === 'string' ? normalizeSourceType(item) : null)
    .filter((item): item is MaintenanceSourceType => Boolean(item)))];
}

function normalizeSourceType(value: string): MaintenanceSourceType | null {
  if (value === 'x') return 'grok';
  return MAINTENANCE_SOURCE_TYPES.includes(value as MaintenanceSourceType) ? value as MaintenanceSourceType : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function addHours(value: Date, hours: number): Date {
  return new Date(value.getTime() + hours * 60 * 60 * 1000);
}

function toJsonObject(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value));
}
