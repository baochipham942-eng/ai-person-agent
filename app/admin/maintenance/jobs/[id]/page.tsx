import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import CancelJobButton from '../../CancelJobButton';
import RetryButton from '../../RetryButton';

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

interface MaintenanceJobDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MaintenanceJobDetailPage({ params }: MaintenanceJobDetailPageProps) {
  const { id } = await params;
  const [job, schedule] = await Promise.all([
    prisma.maintenanceJob.findUnique({
      where: { id },
      include: {
        requestedBy: {
          select: {
            email: true,
            username: true,
            nickname: true,
          },
        },
        logs: {
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    prisma.maintenanceSchedule.findFirst({
      where: { lastJobId: id },
      select: {
        id: true,
        name: true,
        enabled: true,
      },
    }),
  ]);

  if (!job) notFound();

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-900 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="border-b border-stone-200 pb-5">
          <Link href="/admin/maintenance" className="text-xs font-medium text-orange-600 hover:text-orange-700">
            返回内容维护
          </Link>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-stone-950">{KIND_LABELS[job.kind] || job.kind}</h1>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[job.status] || STATUS_STYLES.queued}`}>
                  {job.status}
                </span>
                <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] text-stone-500">
                  {job.dryRun ? 'dry-run' : 'execute'}
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
                任务 ID <span className="font-mono text-stone-700">{job.id}</span>
              </p>
            </div>
            <div className="flex gap-2">
              {job.status === 'failed' ? <RetryButton jobId={job.id} /> : null}
              {canCancel(job.status) ? <CancelJobButton jobId={job.id} status={job.status} /> : null}
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <InfoCard title="操作者" value={formatUser(job.requestedBy)} />
          <InfoCard title="来源" value={`${job.triggerSource} · 重试 ${job.retryCount}`} />
          <InfoCard title="命令" value={job.command || '-'} mono />
          <InfoCard title="创建时间" value={formatDateTime(job.createdAt)} />
          <InfoCard title="开始时间" value={formatMaybeDateTime(job.startedAt)} />
          <InfoCard title="完成时间" value={formatMaybeDateTime(job.completedAt)} />
          <InfoCard title="进度" value={`${job.progressDone}/${job.progressTotal}`} />
          <InfoCard title="刷新强度" value={formatRefreshMode(job.options)} />
          <InfoCard title="渠道" value={formatSourceTypes(job.options)} />
          <InfoCard title="原任务" value={job.sourceJobId || '-'} mono />
          <InfoCard title="取消时间" value={formatMaybeDateTime(job.cancelRequestedAt)} />
          <InfoCard title="取消操作者" value={job.canceledById || '-'} mono />
          <InfoCard title="取消原因" value={job.cancelReason || '-'} />
          <InfoCard title="定时规则" value={schedule ? `${schedule.name} · ${schedule.enabled ? 'enabled' : 'paused'}` : '-'} />
          <InfoCard title="目标" value={formatTargetSummary(job.kind, job.targetPersonIds, job.options)} />
        </section>

        {job.errorMessage && (
          <section className="rounded-lg border border-rose-100 bg-rose-50 p-4 text-sm leading-6 text-rose-700">
            {job.errorMessage}
          </section>
        )}

        <section className="rounded-lg border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-stone-950">任务参数</h2>
          <pre className="mt-3 max-h-80 overflow-auto rounded-md bg-stone-50 p-3 text-xs leading-5 text-stone-600">
            {JSON.stringify({
              targetPersonIds: job.targetPersonIds,
              options: job.options,
            }, null, 2)}
          </pre>
        </section>

        <section className="grid gap-3">
          <h2 className="text-sm font-semibold text-stone-950">完整日志</h2>
          {job.logs.length > 0 ? job.logs.map(log => (
            <article key={log.id} className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-stone-700">
                  {log.level}
                </span>
                <span className="text-xs text-stone-400">{formatDateTime(log.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-stone-700">{log.message}</p>
              {log.metadata && (
                <pre className="mt-3 max-h-48 overflow-auto rounded-md bg-stone-50 p-3 text-xs leading-5 text-stone-600">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              )}
            </article>
          )) : (
            <div className="rounded-lg border border-stone-200 bg-white p-6 text-sm text-stone-500">
              暂无日志。
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function InfoCard({ title, value, mono = false }: { title: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="text-[11px] text-stone-400">{title}</div>
      <div className={`mt-1 break-words text-sm text-stone-800 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

function canCancel(status: string): boolean {
  return status === 'queued' || status === 'running';
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
