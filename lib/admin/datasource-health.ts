import { prisma } from '@/lib/db/prisma';

export interface JobRow { id: string; kind: string; status: string; }
export interface LogRow { jobId: string; level: string; message: string; }
export interface HealthRow { kind: string; completed: number; failed: number; running: number; quotaSignals: number; }

const QUOTA_RE = /\b(402|403|429)\b|额度|限流|quota/i;

/** 纯聚合：不连库，便于单测。 */
export function summarizeHealth(jobs: JobRow[], logs: LogRow[]): HealthRow[] {
  const byKind = new Map<string, HealthRow>();
  const jobKind = new Map(jobs.map(j => [j.id, j.kind]));
  for (const j of jobs) {
    const row = byKind.get(j.kind) ?? { kind: j.kind, completed: 0, failed: 0, running: 0, quotaSignals: 0 };
    if (j.status === 'completed') row.completed += 1;
    else if (j.status === 'failed') row.failed += 1;
    else if (j.status === 'running') row.running += 1;
    byKind.set(j.kind, row);
  }
  for (const l of logs) {
    if (!QUOTA_RE.test(l.message)) continue;
    const kind = jobKind.get(l.jobId);
    if (!kind) continue;
    const row = byKind.get(kind);
    if (row) row.quotaSignals += 1;
  }
  return [...byKind.values()];
}

/** 读最近 N 个任务 + 其告警/错误日志，返回健康汇总（按额度信号→失败→kind 排序）。 */
export async function getDatasourceHealth(limit = 50): Promise<HealthRow[]> {
  const jobs = await prisma.maintenanceJob.findMany({
    orderBy: { createdAt: 'desc' }, take: limit,
    select: { id: true, kind: true, status: true },
  });
  if (jobs.length === 0) return [];
  const logs = await prisma.maintenanceJobLog.findMany({
    where: { jobId: { in: jobs.map(j => j.id) }, level: { in: ['warning', 'error'] } },
    select: { jobId: true, level: true, message: true },
  });
  return summarizeHealth(jobs, logs)
    .sort((a, b) => b.quotaSignals - a.quotaSignals || b.failed - a.failed || a.kind.localeCompare(b.kind));
}
