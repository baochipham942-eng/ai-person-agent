import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { inngest } from '@/lib/inngest/client';
import { getPipeline } from './pipelines/registry';
import { ensurePipelinesRegistered } from './pipelines';
import { createPipelineContext } from './pipelines/context';
import { runJobWithPipeline, type ShellDeps } from './pipelines/shell';

interface MaintenanceCreateInput {
  kind: string;
  dryRun: boolean;
  requestedById: string | null;
  targetPersonIds: string[];
  options: Record<string, unknown>;
  triggerSource?: string;
  sourceJobId?: string | null;
  retryCount?: number;
}

export async function createAndQueueMaintenanceJob(input: MaintenanceCreateInput) {
  const job = await prisma.maintenanceJob.create({
    data: {
      kind: input.kind,
      dryRun: input.dryRun,
      triggerSource: input.triggerSource || 'manual',
      requestedById: input.requestedById,
      sourceJobId: input.sourceJobId || null,
      retryCount: input.retryCount || 0,
      targetPersonIds: input.targetPersonIds,
      options: toJsonObject(input.options),
      command: commandForJob(input.kind, input.dryRun, input.options),
    },
    select: {
      id: true,
    },
  });

  await prisma.userAuditLog.create({
    data: {
      actorUserId: input.requestedById,
      action: 'ADMIN_CREATED_MAINTENANCE_JOB',
      metadata: toJsonObject({
        jobId: job.id,
        kind: input.kind,
        dryRun: input.dryRun,
        triggerSource: input.triggerSource || 'manual',
        sourceJobId: input.sourceJobId || null,
        retryCount: input.retryCount || 0,
        targetPersonCount: input.targetPersonIds.length,
        targetQidCount: getTargetQids(input.options).length,
        options: input.options,
      }),
    },
  });

  await appendMaintenanceLog(job.id, 'info', '任务已进入后台队列');
  await enqueueMaintenanceJob(job.id);
  return job.id;
}

async function enqueueMaintenanceJob(jobId: string) {
  try {
    await inngest.send({
      name: 'maintenance/job.requested',
      data: {
        jobId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.maintenanceJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage: `后台队列投递失败：${message}`,
        completedAt: new Date(),
      },
    });
    await appendMaintenanceLog(jobId, 'error', `后台队列投递失败：${message}`);
    throw error;
  }
}

export async function retryMaintenanceJob(jobId: string, requestedById: string) {
  ensurePipelinesRegistered();
  const source = await prisma.maintenanceJob.findUnique({
    where: { id: jobId },
    select: {
      kind: true,
      dryRun: true,
      targetPersonIds: true,
      options: true,
      retryCount: true,
    },
  });

  if (!source || !getPipeline(source.kind)) {
    throw new Error('维护任务不存在');
  }

  return createAndQueueMaintenanceJob({
    kind: source.kind,
    dryRun: source.dryRun,
    requestedById,
    targetPersonIds: source.targetPersonIds,
    options: isRecord(source.options) ? source.options : {},
    triggerSource: 'retry',
    sourceJobId: jobId,
    retryCount: source.retryCount + 1,
  });
}

export async function cancelMaintenanceJob(jobId: string, requestedById: string, reason?: string) {
  const job = await prisma.maintenanceJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      progressDone: true,
      progressTotal: true,
    },
  });

  if (!job) throw new Error('维护任务不存在');
  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    throw new Error('当前任务状态不能取消');
  }

  const now = new Date();
  const nextStatus = job.status === 'queued' ? 'cancelled' : 'cancelling';
  await prisma.maintenanceJob.update({
    where: { id: jobId },
    data: {
      status: nextStatus,
      cancelRequestedAt: now,
      canceledById: requestedById,
      cancelReason: reason?.trim() || null,
      completedAt: nextStatus === 'cancelled' ? now : undefined,
      errorMessage: nextStatus === 'cancelled' ? null : '管理员已请求取消，任务会在当前人物处理后停止',
    },
  });

  await prisma.userAuditLog.create({
    data: {
      actorUserId: requestedById,
      action: 'ADMIN_CANCELLED_MAINTENANCE_JOB',
      metadata: toJsonObject({
        jobId,
        previousStatus: job.status,
        nextStatus,
        progressDone: job.progressDone,
        progressTotal: job.progressTotal,
        reason: reason?.trim() || null,
      }),
    },
  });

  await appendMaintenanceLog(jobId, 'warning', nextStatus === 'cancelled' ? '任务已取消' : '已请求取消，任务会在当前人物处理后停止', {
    canceledById: requestedById,
    reason: reason?.trim() || null,
  });

  return nextStatus;
}

/** 生命周期外壳：解析 pipeline → 委托 shell 跑（状态机由 shell 独占）。 */
export async function runMaintenanceJob(jobId: string) {
  ensurePipelinesRegistered();
  const job = await prisma.maintenanceJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  const pipeline = getPipeline(job.kind);
  if (!pipeline) {
    await prisma.maintenanceJob.update({
      where: { id: jobId },
      data: { status: 'failed', errorMessage: `未知任务类型：${job.kind}`, completedAt: new Date() },
    });
    await appendMaintenanceLog(jobId, 'error', `未知任务类型：${job.kind}`);
    return;
  }

  const shellJob = {
    id: job.id,
    kind: job.kind,
    dryRun: job.dryRun,
    status: job.status,
    options: isRecord(job.options) ? job.options : {},
    requestedById: job.requestedById,
    targetPersonIds: job.targetPersonIds,
  };

  const deps: ShellDeps = {
    claimRunning: async (id) => {
      const result = await prisma.maintenanceJob.updateMany({
        where: { id, status: { notIn: ['cancelled', 'cancelling'] } },
        data: { status: 'running', startedAt: new Date(), errorMessage: null },
      });
      return result.count > 0;
    },
    readStatus: async (id) => (await prisma.maintenanceJob.findUnique({ where: { id }, select: { status: true } }))?.status ?? null,
    setStatus: async (id, status, extra) => {
      await prisma.maintenanceJob.update({
        where: { id },
        data: {
          status,
          ...(extra && 'errorMessage' in extra ? { errorMessage: extra.errorMessage } : {}),
          ...(extra?.completedAt ? { completedAt: new Date() } : {}),
        },
      });
    },
    appendLog: (id, level, message) => appendMaintenanceLog(id, level, message),
    makeContext: (j) => createPipelineContext(j),
  };

  await runJobWithPipeline(shellJob, pipeline, deps);
}

export async function runDueMaintenanceSchedules(scanAt = new Date()) {
  ensurePipelinesRegistered();
  const schedules = await prisma.maintenanceSchedule.findMany({
    where: {
      enabled: true,
      OR: [
        { nextRunAt: null },
        { nextRunAt: { lte: scanAt } },
      ],
    },
    orderBy: [{ nextRunAt: 'asc' }, { createdAt: 'asc' }],
    take: 10,
  });

  let queued = 0;
  const skipped: string[] = [];

  for (const schedule of schedules) {
    if (!getPipeline(schedule.kind)) {
      skipped.push(schedule.id);
      continue;
    }

    const intervalHours = clampInteger(schedule.intervalHours, 1, 24 * 14, 24);
    const nextRunAt = addHours(scanAt, intervalHours);
    const locked = await prisma.maintenanceSchedule.updateMany({
      where: {
        id: schedule.id,
        enabled: true,
        OR: [
          { nextRunAt: null },
          { nextRunAt: { lte: scanAt } },
        ],
      },
      data: {
        lastRunAt: scanAt,
        nextRunAt,
      },
    });

    if (locked.count === 0) continue;

    const jobId = await createAndQueueMaintenanceJob({
      kind: schedule.kind,
      dryRun: schedule.dryRun,
      requestedById: schedule.createdById,
      targetPersonIds: schedule.targetPersonIds,
      options: isRecord(schedule.options) ? schedule.options : {},
      triggerSource: 'schedule',
    });

    await prisma.maintenanceSchedule.update({
      where: { id: schedule.id },
      data: {
        lastJobId: jobId,
        runCount: { increment: 1 },
      },
    });

    queued += 1;
  }

  return {
    scannedAt: scanAt.toISOString(),
    dueCount: schedules.length,
    queued,
    skipped,
  };
}

export async function appendMaintenanceLog(
  jobId: string,
  level: 'info' | 'warning' | 'error',
  message: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.maintenanceJobLog.create({
    data: {
      jobId,
      level,
      message,
      metadata: metadata ? toJsonObject(metadata) : undefined,
    },
  });
}

function commandForJob(kind: string, dryRun: boolean, options: Record<string, unknown>): string {
  const mode = dryRun ? 'dry-run' : 'execute';
  const refreshMode = getRefreshMode(options);
  if (kind === 'new_person_build') return `internal:${mode}:${refreshMode}:person/created:new`;
  if (kind === 'single_person_refresh') return `internal:${mode}:person/created:single`;
  if (kind === 'multi_person_refresh') return `internal:${mode}:person/created:multi`;
  if (kind === 'all_people_refresh') return `internal:${mode}:person/created:all`;
  return `internal:${mode}:${kind}`;
}

function toJsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getRefreshMode(options: unknown): 'incremental' | 'force' | 'rebuild' {
  const value = isRecord(options) ? options.refreshMode : undefined;
  if (value === 'force' || value === 'rebuild') return value;
  return 'incremental';
}

function getTargetQids(options: unknown): string[] {
  const value = isRecord(options) ? options.targetQids : undefined;
  if (Array.isArray(value)) return uniqueStrings(value.filter((item): item is string => typeof item === 'string'));
  if (typeof value === 'string') return uniqueStrings(value.split(/[\s,]+/));
  return [];
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function addHours(value: Date, hours: number): Date {
  return new Date(value.getTime() + hours * 60 * 60 * 1000);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}
