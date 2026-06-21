import type { MaintenancePipeline, PipelineContext, PipelineLogLevel } from './types';

export interface ShellJob {
  id: string;
  kind: string;
  dryRun: boolean;
  status: string;
  options: Record<string, unknown>;
  requestedById: string | null;
  targetPersonIds: string[];
}

export interface ShellDeps {
  /** 抢占式置 running（status notIn cancelled/cancelling 才成功）。返回是否抢到。 */
  claimRunning(jobId: string): Promise<boolean>;
  readStatus(jobId: string): Promise<string | null>;
  setStatus(jobId: string, status: string, extra?: { errorMessage?: string | null; completedAt?: boolean }): Promise<void>;
  appendLog(jobId: string, level: PipelineLogLevel, message: string): Promise<void>;
  makeContext(job: ShellJob): PipelineContext;
}

/** 生命周期外壳：抢占 running → 跑 pipeline → 按收尾状态独占落终态（completed/failed/cancelled）。 */
export async function runJobWithPipeline(job: ShellJob, pipeline: MaintenancePipeline, deps: ShellDeps): Promise<void> {
  if (job.status === 'cancelled' || job.status === 'cancelling') return;
  const claimed = await deps.claimRunning(job.id);
  if (!claimed) return;

  await deps.appendLog(job.id, 'info', `开始${pipeline.label}${job.dryRun ? ' dry-run' : ''}`);
  const ctx = deps.makeContext(job);

  try {
    await pipeline.run(ctx);
    const status = await deps.readStatus(job.id);
    if (status === 'cancelling') {
      await deps.setStatus(job.id, 'cancelled', { errorMessage: null, completedAt: true });
      await deps.appendLog(job.id, 'warning', '任务已取消');
    } else if (status === 'running') {
      await deps.setStatus(job.id, 'completed', { completedAt: true });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await deps.setStatus(job.id, 'failed', { errorMessage: message, completedAt: true });
    await deps.appendLog(job.id, 'error', message);
  }
}
