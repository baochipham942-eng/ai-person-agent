import { prisma } from '@/lib/db/prisma';
import { appendMaintenanceLog } from '@/lib/admin/maintenance';
import type { PipelineContext, PipelineLogLevel } from './types';

export interface PipelineJobLike {
  id: string;
  dryRun: boolean;
  options: Record<string, unknown>;
  requestedById: string | null;
  targetPersonIds: string[];
}

/** 把写副作用抽成可注入依赖，便于单测。生产用默认实现（真 prisma）。 */
export interface ContextDeps {
  appendLog(jobId: string, level: PipelineLogLevel, message: string, metadata?: Record<string, unknown>): Promise<void>;
  setProgress(jobId: string, patch: { progressTotal?: number; progressDone?: number }): Promise<void>;
  readStatus(jobId: string): Promise<string | null>;
}

const defaultDeps: ContextDeps = {
  appendLog: (jobId, level, message, metadata) => appendMaintenanceLog(jobId, level, message, metadata),
  setProgress: async (jobId, patch) => {
    await prisma.maintenanceJob.update({ where: { id: jobId }, data: patch });
  },
  readStatus: async (jobId) => {
    const job = await prisma.maintenanceJob.findUnique({ where: { id: jobId }, select: { status: true } });
    return job?.status ?? null;
  },
};

export function createPipelineContext(job: PipelineJobLike, deps: ContextDeps = defaultDeps): PipelineContext {
  return {
    jobId: job.id,
    dryRun: job.dryRun,
    options: job.options,
    requestedById: job.requestedById,
    targetPersonIds: job.targetPersonIds,
    log: (level, message, metadata) => deps.appendLog(job.id, level, message, metadata),
    setTotal: (total) => deps.setProgress(job.id, { progressTotal: total }),
    setDone: (done) => deps.setProgress(job.id, { progressDone: done }),
    isCancelled: async () => (await deps.readStatus(job.id)) === 'cancelling',
  };
}
