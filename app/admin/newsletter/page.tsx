import Link from 'next/link';
import { fetchNewsletterDeliveryMonitor } from '@/lib/newsletter-monitoring';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STATUS_LABELS: Record<string, string> = {
  all: '全部',
  dry_run: 'Dry-run',
  queued: '排队',
  sent: '已发送',
  failed: '失败',
};

const STATUS_STYLES: Record<string, string> = {
  dry_run: 'border-stone-200 bg-stone-50 text-stone-600',
  queued: 'border-sky-200 bg-sky-50 text-sky-700',
  sent: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  failed: 'border-rose-200 bg-rose-50 text-rose-700',
};

interface NewsletterAdminPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewsletterAdminPage({ searchParams }: NewsletterAdminPageProps) {
  const resolvedSearchParams = await searchParams;
  const status = normalizeStatus(firstParam(resolvedSearchParams?.status));
  const monitor = await fetchNewsletterDeliveryMonitor({ status, limit: 50 });

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-900 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/" className="text-xs font-medium text-orange-600 hover:text-orange-700">
              返回人物库
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">Newsletter 投递</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
              最近 500 条投递日志 · 失败率 {(monitor.stats.failureRate * 100).toFixed(1)}% · {monitor.ready ? '日志表可用' : '等待迁移'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
            <StatPill label="总数" value={monitor.stats.total} />
            <StatPill label="Dry-run" value={monitor.stats.dryRun} />
            <StatPill label="已发送" value={monitor.stats.sent} />
            <StatPill label="失败" value={monitor.stats.failed} />
            <StatPill label="排队" value={monitor.stats.queued} />
          </div>
        </header>

        <nav className="flex flex-wrap gap-2">
          {(['all', 'failed', 'sent', 'dry_run', 'queued'] as const).map(nextStatus => (
            <Link
              key={nextStatus}
              href={nextStatus === 'all' ? '/admin/newsletter' : `/admin/newsletter?status=${nextStatus}`}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                status === nextStatus
                  ? 'border-orange-200 bg-orange-50 text-orange-700'
                  : 'border-stone-200 bg-white text-stone-500 hover:border-orange-200 hover:text-orange-700'
              }`}
            >
              {STATUS_LABELS[nextStatus]}
            </Link>
          ))}
        </nav>

        <section className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="mb-3 text-xs font-semibold text-stone-500">Provider</div>
          <div className="flex flex-wrap gap-2">
            {monitor.providers.length > 0 ? monitor.providers.map(provider => (
              <span key={provider.provider} className="rounded-md border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-600">
                {provider.provider}: {provider.count}
              </span>
            )) : (
              <span className="text-sm text-stone-500">暂无投递记录</span>
            )}
          </div>
        </section>

        <section className="grid gap-3">
          {monitor.rows.length > 0 ? monitor.rows.map(row => (
            <article key={row.id} className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[row.status] || STATUS_STYLES.dry_run}`}>
                      {STATUS_LABELS[row.status] || row.status}
                    </span>
                    <span className="text-xs text-stone-500">{row.provider || 'unknown'} · 尝试 {row.attempts}</span>
                  </div>
                  <h2 className="mt-2 text-sm font-semibold text-stone-950">{row.subject}</h2>
                  <p className="mt-1 break-all text-xs text-stone-500">{row.email}</p>
                </div>
                <div className="text-left text-xs leading-5 text-stone-500 lg:text-right">
                  <div>创建 {formatDateTime(row.createdAt)}</div>
                  <div>发送 {row.sentAt ? formatDateTime(row.sentAt) : '-'}</div>
                  <div className="break-all">Message ID {row.providerMessageId || '-'}</div>
                </div>
              </div>
              {row.errorMessage && (
                <div className="mt-3 rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
                  {row.errorMessage}
                </div>
              )}
            </article>
          )) : (
            <div className="rounded-lg border border-stone-200 bg-white p-6 text-sm text-stone-500">
              暂无投递日志。
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3">
      <div className="text-lg font-semibold text-stone-950">{value}</div>
      <div className="mt-0.5 text-[11px] text-stone-500">{label}</div>
    </div>
  );
}

function normalizeStatus(value: string | null | undefined): string {
  if (value === 'dry_run' || value === 'queued' || value === 'sent' || value === 'failed') return value;
  return 'all';
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
