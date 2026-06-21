import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { ensurePipelinesRegistered } from '@/lib/admin/pipelines';
import { listPipelines } from '@/lib/admin/pipelines/registry';
import { getDatasourceHealth } from '@/lib/admin/datasource-health';
import CancelJobButton from './CancelJobButton';
import MaintenanceClient from './MaintenanceClient';
import MaintenanceScheduleClient from './MaintenanceScheduleClient';
import RetryButton from './RetryButton';
import ScheduleToggleButton from './ScheduleToggleButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STATUS_STYLES: Record<string, string> = {
  queued: 'border-stone-200 bg-stone-50 text-stone-600',
  running: 'border-sky-200 bg-sky-50 text-sky-700',
  cancelling: 'border-amber-200 bg-amber-50 text-amber-700',
  cancelled: 'border-stone-300 bg-stone-100 text-stone-600',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  failed: 'border-rose-200 bg-rose-50 text-rose-700',
};

const KIND_LABELS: Record<string, string> = {
  new_person_build: '新人物首次构建',
  single_person_refresh: '单人物更新',
  multi_person_refresh: '多人物列表更新',
  all_people_refresh: '全站批量更新',
};

const JOB_STATUS_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'queued', label: '排队中' },
  { value: 'running', label: '运行中' },
  { value: 'cancelling', label: '取消中' },
  { value: 'failed', label: '失败' },
  { value: 'completed', label: '完成' },
  { value: 'cancelled', label: '已取消' },
] as const;

interface AdminMaintenancePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminMaintenancePage({ searchParams }: AdminMaintenancePageProps) {
  const resolvedSearchParams = await searchParams;
  const selectedStatus = normalizeStatusFilter(getStringParam(resolvedSearchParams?.status));

  const [people, schedules, jobs, statusGroups] = await Promise.all([
    prisma.people.findMany({
      select: {
        id: true,
        name: true,
        status: true,
      },
      orderBy: [{ weeklyViewCount: 'desc' }, { name: 'asc' }],
      take: 120,
    }),
    prisma.maintenanceSchedule.findMany({
      select: {
        id: true,
        name: true,
        enabled: true,
        kind: true,
        dryRun: true,
        targetPersonIds: true,
        options: true,
        intervalHours: true,
        nextRunAt: true,
        lastRunAt: true,
        lastJobId: true,
        runCount: true,
        createdBy: {
          select: {
            email: true,
            username: true,
            nickname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.maintenanceJob.findMany({
      where: selectedStatus === 'all' ? undefined : { status: selectedStatus },
      select: {
        id: true,
        kind: true,
        status: true,
        dryRun: true,
        triggerSource: true,
        sourceJobId: true,
        retryCount: true,
        targetPersonIds: true,
        options: true,
        command: true,
        progressTotal: true,
        progressDone: true,
        errorMessage: true,
        startedAt: true,
        completedAt: true,
        cancelRequestedAt: true,
        cancelReason: true,
        createdAt: true,
        requestedBy: {
          select: {
            email: true,
            username: true,
            nickname: true,
          },
        },
        logs: {
          select: {
            id: true,
            level: true,
            message: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.maintenanceJob.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    }),
  ]);
  const statusCounts = Object.fromEntries(statusGroups.map(group => [group.status, group._count.status]));
  const totalJobCount = statusGroups.reduce((sum, group) => sum + group._count.status, 0);

  ensurePipelinesRegistered();
  const pipelines = listPipelines().map(p => ({
    kind: p.kind,
    label: p.label,
    category: p.category,
    optionFields: p.optionFields ?? [],
  }));
  const kindLabel = (kind: string) => pipelines.find(p => p.kind === kind)?.label || KIND_LABELS[kind] || kind;
  const health = await getDatasourceHealth();

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-900 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="border-b border-stone-200 pb-5">
          <Link href="/admin" className="text-xs font-medium text-orange-600 hover:text-orange-700">
            返回后台
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">内容维护</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
            从后台触发新人物构建、全站批量更新、多人物列表更新和单人物更新。每次执行都会记录任务、进度和日志。
          </p>
        </header>

        <section className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-950">数据源健康</h2>
            <div className="text-xs text-stone-400">最近 50 个任务的运行结果与额度信号</div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {health.length === 0 ? (
              <p className="text-xs text-stone-400">暂无任务记录</p>
            ) : health.map(row => (
              <div key={row.kind} className="rounded-md border border-stone-100 bg-stone-50 px-3 py-2 text-xs">
                <div className="font-medium text-stone-700">{kindLabel(row.kind)}</div>
                <div className="mt-1 text-stone-500">完成 {row.completed} · 失败 {row.failed} · 运行中 {row.running}</div>
                {row.quotaSignals > 0 && <div className="mt-1 font-medium text-amber-600">⚠ 额度/限流信号 {row.quotaSignals}</div>}
              </div>
            ))}
          </div>
        </section>

        <MaintenanceClient people={people} pipelines={pipelines} />

        <MaintenanceScheduleClient people={people} pipelines={pipelines} />

        <section className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-950">定时维护规则</h2>
            <div className="text-xs text-stone-400">Inngest 每 30 分钟扫描一次到期规则</div>
          </div>
          {schedules.length > 0 ? schedules.map(schedule => (
            <article key={schedule.id} className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-stone-950">{schedule.name}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${schedule.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-stone-200 bg-stone-50 text-stone-500'}`}>
                      {schedule.enabled ? 'enabled' : 'paused'}
                    </span>
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] text-stone-500">
                      {schedule.dryRun ? 'dry-run' : 'execute'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    {kindLabel(schedule.kind)} · 每 {schedule.intervalHours} 小时 · 创建者 {formatUser(schedule.createdBy)}
                  </p>
                  <div className="mt-3 grid gap-2 text-xs leading-5 text-stone-500 md:grid-cols-2">
                    <div className="rounded-md bg-stone-50 px-3 py-2">下次运行 {formatMaybeDateTime(schedule.nextRunAt)}</div>
                    <div className="rounded-md bg-stone-50 px-3 py-2">上次运行 {formatMaybeDateTime(schedule.lastRunAt)} · 已运行 {schedule.runCount}</div>
                    <div className="rounded-md bg-stone-50 px-3 py-2">目标 {formatTargetSummary(schedule.kind, schedule.targetPersonIds, schedule.options)}</div>
                    <div className="rounded-md bg-stone-50 px-3 py-2">刷新 {formatRefreshMode(schedule.options)} · 渠道 {formatSourceTypes(schedule.options)}</div>
                    <div className="rounded-md bg-stone-50 px-3 py-2 md:col-span-2">
                      最近任务 {schedule.lastJobId ? (
                        <Link href={`/admin/maintenance/jobs/${schedule.lastJobId}`} className="font-mono text-orange-600 hover:text-orange-700">
                          {schedule.lastJobId}
                        </Link>
                      ) : '-'}
                    </div>
                  </div>
                </div>
                <ScheduleToggleButton scheduleId={schedule.id} enabled={schedule.enabled} />
              </div>
            </article>
          )) : (
            <div className="rounded-lg border border-stone-200 bg-white p-6 text-sm text-stone-500">
              还没有定时维护规则。
            </div>
          )}
        </section>

        <section className="grid gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-sm font-semibold text-stone-950">维护任务日志</h2>
            <div className="flex flex-wrap gap-2">
              {JOB_STATUS_FILTERS.map(filter => {
                const active = selectedStatus === filter.value;
                const count = filter.value === 'all' ? totalJobCount : statusCounts[filter.value] || 0;
                return (
                  <Link
                    key={filter.value}
                    href={filter.value === 'all' ? '/admin/maintenance' : `/admin/maintenance?status=${filter.value}`}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      active ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-stone-200 bg-white text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    {filter.label} {count}
                  </Link>
                );
              })}
            </div>
          </div>
          {jobs.length > 0 ? jobs.map(job => (
            <article key={job.id} className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/maintenance/jobs/${job.id}`} className="text-sm font-semibold text-stone-950 hover:text-orange-700">
                      {kindLabel(job.kind)}
                    </Link>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[job.status] || STATUS_STYLES.queued}`}>
                      {job.status}
                    </span>
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] text-stone-500">
                      {job.dryRun ? 'dry-run' : 'execute'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    创建 {formatDateTime(job.createdAt)} · 操作者 {formatUser(job.requestedBy)} · 命令 {job.command || '-'}
                  </p>
                  <div className="mt-3 grid gap-2 text-xs leading-5 text-stone-500 md:grid-cols-2">
                    <div className="rounded-md bg-stone-50 px-3 py-2">
                      任务 ID <span className="font-mono text-stone-700">{job.id}</span>
                    </div>
                    <div className="rounded-md bg-stone-50 px-3 py-2">
                      来源 {job.triggerSource} · 重试 {job.retryCount}
                      {job.sourceJobId ? <span> · 原任务 <span className="font-mono text-stone-700">{job.sourceJobId}</span></span> : null}
                    </div>
                    <div className="rounded-md bg-stone-50 px-3 py-2">
                      时间 {formatLifecycle(job.startedAt, job.completedAt)}
                    </div>
                    <div className="rounded-md bg-stone-50 px-3 py-2">
                      目标 {formatTargetSummary(job.kind, job.targetPersonIds, job.options)}
                    </div>
                    <div className="rounded-md bg-stone-50 px-3 py-2">
                      刷新 {formatRefreshMode(job.options)}
                    </div>
                    <div className="rounded-md bg-stone-50 px-3 py-2">
                      渠道 {formatSourceTypes(job.options)}
                    </div>
                    {job.cancelRequestedAt ? (
                      <div className="rounded-md bg-amber-50 px-3 py-2 text-amber-700 md:col-span-2">
                        取消 {formatDateTime(job.cancelRequestedAt)} · {job.cancelReason || '未填写原因'}
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{ width: `${progressPercent(job.progressDone, job.progressTotal)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    进度 {job.progressDone}/{job.progressTotal}
                  </p>
                  {job.errorMessage && (
                    <div className="mt-3 rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
                      {job.errorMessage}
                    </div>
                  )}
                  <div className="mt-3 grid gap-1.5">
                    {job.logs.length > 0 ? [...job.logs].reverse().map(log => (
                      <div key={log.id} className="rounded-md bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-600">
                        <span className="font-medium text-stone-900">{log.level}</span> · {formatDateTime(log.createdAt)} · {log.message}
                      </div>
                    )) : (
                      <div className="text-xs text-stone-400">暂无日志。</div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {job.status === 'failed' ? <RetryButton jobId={job.id} /> : null}
                  {canCancel(job.status) ? <CancelJobButton jobId={job.id} status={job.status} /> : null}
                </div>
              </div>
            </article>
          )) : (
            <div className="rounded-lg border border-stone-200 bg-white p-6 text-sm text-stone-500">
              还没有维护任务。
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function progressPercent(done: number, total: number): number {
  if (total <= 0) return done > 0 ? 100 : 0;
  return Math.min(100, Math.round((done / total) * 100));
}

function canCancel(status: string): boolean {
  return status === 'queued' || status === 'running';
}

function getStringParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function normalizeStatusFilter(value: string): typeof JOB_STATUS_FILTERS[number]['value'] {
  return JOB_STATUS_FILTERS.some(filter => filter.value === value) ? value as typeof JOB_STATUS_FILTERS[number]['value'] : 'all';
}

function formatUser(user: { email: string | null; username: string; nickname: string | null } | null): string {
  if (!user) return '-';
  return user.email || user.nickname || user.username;
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function formatMaybeDateTime(value: Date | null): string {
  return value ? formatDateTime(value) : '-';
}

function formatLifecycle(startedAt: Date | null, completedAt: Date | null): string {
  if (!startedAt) return '未开始';
  if (!completedAt) return `开始 ${formatDateTime(startedAt)}`;
  const durationSeconds = Math.max(0, Math.round((completedAt.getTime() - startedAt.getTime()) / 1000));
  return `开始 ${formatDateTime(startedAt)} · 结束 ${formatDateTime(completedAt)} · ${durationSeconds}s`;
}

function formatTargetSummary(kind: string, targetPersonIds: string[], optionsValue: unknown): string {
  const options = asRecord(optionsValue);
  const qids = Array.isArray(options.targetQids) ? options.targetQids.filter(item => typeof item === 'string') : [];
  if (kind === 'new_person_build') return `${qids.length} 个 QID`;
  if (kind === 'single_person_refresh') return targetPersonIds[0] || '-';
  if (kind === 'multi_person_refresh') return `${targetPersonIds.length} 人`;

  const status = typeof options.status === 'string' ? options.status : 'all';
  const limit = typeof options.limit === 'number' ? options.limit : '-';
  const search = typeof options.search === 'string' && options.search ? ` · 搜索 ${options.search}` : '';
  return `状态 ${status} · 上限 ${limit}${search}`;
}

function formatRefreshMode(optionsValue: unknown): string {
  const options = asRecord(optionsValue);
  if (options.refreshMode === 'force') return '强制重拉';
  if (options.refreshMode === 'rebuild') return '清空重建';
  return '增量刷新';
}

function formatSourceTypes(optionsValue: unknown): string {
  const options = asRecord(optionsValue);
  if (!Array.isArray(options.sourceTypes) || options.sourceTypes.length === 0) return '全部来源';
  return options.sourceTypes.filter(item => typeof item === 'string').join(', ');
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
