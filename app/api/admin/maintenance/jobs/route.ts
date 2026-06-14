import { NextResponse } from 'next/server';
import { requireAdminOrResponse } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/prisma';
import {
  createAndQueueMaintenanceJob,
  MAINTENANCE_SOURCE_TYPES,
  type MaintenanceKind,
  type MaintenanceRefreshMode,
  type MaintenanceSourceType,
} from '@/lib/admin/maintenance';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { response } = await requireAdminOrResponse();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status')?.trim();

  const jobs = await prisma.maintenanceJob.findMany({
    where: status && status !== 'all' ? { status } : {},
    include: {
      requestedBy: {
        select: {
          email: true,
          username: true,
          nickname: true,
        },
      },
      logs: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const { user, response } = await requireAdminOrResponse();
  if (response) return response;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const kind = typeof body?.kind === 'string' ? body.kind : '';
  if (!isMaintenanceKind(kind)) {
    return NextResponse.json({ error: 'Unsupported maintenance kind' }, { status: 400 });
  }

  const targetPersonIds = normalizePersonIds(body?.targetPersonIds);
  const dryRun = body?.dryRun !== false;
  const options = sanitizeOptions(body?.options);

  if (kind === 'new_person_build' && normalizeQids(options.targetQids).length === 0) {
    return NextResponse.json({ error: '请填写至少一个 Wikidata QID' }, { status: 400 });
  }

  if (kind === 'single_person_refresh' && targetPersonIds.length === 0) {
    return NextResponse.json({ error: '请选择一个人物' }, { status: 400 });
  }

  if (kind === 'multi_person_refresh' && targetPersonIds.length === 0) {
    return NextResponse.json({ error: '请填写至少一个人物 ID' }, { status: 400 });
  }

  if (options.refreshMode === 'rebuild' && options.sourceTypes.length > 0) {
    return NextResponse.json({ error: '清空重建模式不支持单独选择媒体渠道，请使用全部来源' }, { status: 400 });
  }

  const jobId = await createAndQueueMaintenanceJob({
    kind,
    dryRun,
    requestedById: user.id,
    targetPersonIds,
    options,
  });

  return NextResponse.json({ success: true, jobId }, { status: 201 });
}

function isMaintenanceKind(value: string): value is MaintenanceKind {
  return value === 'new_person_build' || value === 'single_person_refresh' || value === 'multi_person_refresh' || value === 'all_people_refresh';
}

function normalizePersonIds(value: unknown): string[] {
  if (Array.isArray(value)) return [...new Set(value.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean))];
  if (typeof value === 'string') return [...new Set(value.split(/[\s,]+/).map(item => item.trim()).filter(Boolean))];
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeOptions(value: unknown): {
  status: string;
  limit: number;
  search: string;
  refreshMode: MaintenanceRefreshMode;
  sourceTypes: MaintenanceSourceType[];
  targetQids: string[];
} {
  const options = isRecord(value) ? value : {};
  return {
    status: typeof options.status === 'string' ? options.status.trim() || 'all' : 'all',
    limit: clampInteger(options.limit, 1, 5000, 100),
    search: typeof options.search === 'string' ? options.search.trim() : '',
    refreshMode: normalizeRefreshMode(options.refreshMode),
    sourceTypes: normalizeSourceTypes(options.sourceTypes),
    targetQids: normalizeQids(options.targetQids),
  };
}

function normalizeRefreshMode(value: unknown): MaintenanceRefreshMode {
  if (value === 'force' || value === 'rebuild') return value;
  return 'incremental';
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

function normalizeQids(value: unknown): string[] {
  if (Array.isArray(value)) return uniqueStrings(value.filter((item): item is string => typeof item === 'string'));
  if (typeof value === 'string') return uniqueStrings(value.split(/[\s,]+/));
  return [];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}
