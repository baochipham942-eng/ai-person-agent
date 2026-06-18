import Link from 'next/link';
import { fetchOperationsReadiness, type ReadinessStatus } from '@/lib/operations-readiness';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STATUS_LABELS: Record<ReadinessStatus, string> = {
  ready: 'Ready',
  pending: 'Pending',
  blocked: 'Blocked',
};

const STATUS_STYLES: Record<ReadinessStatus, string> = {
  ready: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  blocked: 'border-rose-200 bg-rose-50 text-rose-700',
};

export default async function OperationsPage() {
  const readiness = await fetchOperationsReadiness();
  const newsletterEnvCheck = readiness.checks.find(check => check.key === 'newsletter-env');
  const youtubeQaCheck = readiness.checks.find(check => check.key === 'youtube-qa-coverage');
  const youtubeMaterializationCheck = readiness.checks.find(check => check.key === 'youtube-activity-materialization');
  const newsletterLaunchReady = newsletterEnvCheck?.status === 'ready';
  const newsletterStatusLabel = readiness.newsletterEnv.readyToSend
    ? '可真实发送'
    : newsletterLaunchReady
      ? '上线配置已满足'
      : '未满足真实发送条件';

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-900 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/" className="text-xs font-medium text-orange-600 hover:text-orange-700">
              返回人物库
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">上线准备度</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
              生产迁移、回填、邮件发送、校准审计和对比报告的只读检查 · {formatDateTime(readiness.generatedAt)}
            </p>
          </div>

          <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[readiness.overallStatus]}`}>
            {STATUS_LABELS[readiness.overallStatus]}
          </span>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard
            title="YouTube 管道"
            status={youtubeMaterializationCheck?.status || 'pending'}
            rows={[
              `近 24h Raw ${readiness.youtubePipeline.rawRecent24h}`,
              `QA ${readiness.youtubePipeline.auditedRecent7d}/${readiness.youtubePipeline.rawRecent7d}`,
              `入库 ${readiness.youtubePipeline.keepMaterializedRecent7d}/${readiness.youtubePipeline.verdictsRecent7d.keep}`,
            ]}
          />
          <MetricCard
            title="ActivityEvent"
            status={readiness.schema.activityEvent.status}
            rows={[`总数 ${readiness.activity.total}`, `近 30 天 ${readiness.activity.recent30d}`, `最近 ${formatMaybeDate(readiness.activity.latestDetectedAt)}`]}
          />
          <MetricCard
            title="NewsletterDeliveryLog"
            status={readiness.schema.newsletterDeliveryLog.status}
            rows={[`总数 ${readiness.newsletter.total}`, `已发送 ${readiness.newsletter.sent}`, `失败 ${readiness.newsletter.failed}`]}
          />
          <MetricCard
            title="InfluenceScoreAuditLog"
            status={readiness.schema.influenceScoreAuditLog.status}
            rows={[`审计 ${readiness.influence.audits}`, `最近 ${formatMaybeDate(readiness.influence.latestCreatedAt)}`]}
          />
          <MetricCard
            title="CompareReport"
            status={readiness.schema.compareReport.status}
            rows={[`总数 ${readiness.compareReport.total}`, `完成 ${readiness.compareReport.completed}`, `失败 ${readiness.compareReport.failed}`]}
          />
          <MetricCard
            title="CompanySource"
            status={readiness.schema.companySource.status}
            rows={[
              `来源 ${readiness.companyEvidence.sources}`,
              `公司 ${readiness.companyEvidence.organizations}`,
              `回链 ${readiness.companyEvidence.threadLinks}`,
              `边界问题 ${readiness.companyEvidence.boundaryIssues}`,
            ]}
          />
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-stone-950">YouTube 数据管道</h2>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                监控 YouTube Data API、RawPoolItem、QAAuditLog、ActivityEvent 和卡片生成的闭环状态。
              </p>
            </div>
            <span className={`w-fit rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[youtubeQaCheck?.status || 'pending']}`}>
              QA {formatPercent(readiness.youtubePipeline.auditCoveragePct)}
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <EnvPill label="Google API key" value={readiness.youtubeEnv.hasGoogleApiKey ? 'present' : 'missing'} ok={readiness.youtubeEnv.hasGoogleApiKey} />
            <EnvPill label="Semantic QA" value={readiness.youtubeEnv.semanticQaEnabled ? 'enabled' : 'disabled'} ok={readiness.youtubeEnv.semanticQaEnabled} />
            <EnvPill label="Latest fetch" value={formatMaybeDate(readiness.youtubePipeline.latestFetchedAt)} ok={readiness.youtubePipeline.rawRecent7d > 0} />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-4">
            <PipelineBlock
              title="Raw 抓取"
              rows={[
                `总量 ${readiness.youtubePipeline.rawTotal}`,
                `近 24 小时 ${readiness.youtubePipeline.rawRecent24h}`,
                `近 7 天 ${readiness.youtubePipeline.rawRecent7d}`,
                `已标记处理 ${readiness.youtubePipeline.processedRecent7d}`,
              ]}
            />
            <PipelineBlock
              title="抓取游标"
              rows={[
                `30 天尝试 ${readiness.youtubePipeline.attemptedPeople30d} 人`,
                `仍有错误 ${readiness.youtubePipeline.failedPeople30d} 人`,
                `最近尝试 ${formatMaybeDate(readiness.youtubePipeline.latestAttemptedAt)}`,
                `最近错误 ${readiness.youtubePipeline.latestError || '-'}`,
              ]}
            />
            <PipelineBlock
              title="QA 清洗"
              rows={[
                `覆盖 ${readiness.youtubePipeline.auditedRecent7d}/${readiness.youtubePipeline.rawRecent7d} (${formatPercent(readiness.youtubePipeline.auditCoveragePct)})`,
                `keep ${readiness.youtubePipeline.verdictsRecent7d.keep} · review ${readiness.youtubePipeline.verdictsRecent7d.review}`,
                `reject ${readiness.youtubePipeline.verdictsRecent7d.reject} · duplicate ${readiness.youtubePipeline.verdictsRecent7d.duplicate}`,
                `最近 ${formatMaybeDate(readiness.youtubePipeline.latestAuditAt)}`,
              ]}
            />
            <PipelineBlock
              title="前台入库"
              rows={[
                `YouTube ActivityEvent ${readiness.youtubePipeline.activityTotal}`,
                `近 7 天入库 ${readiness.youtubePipeline.activityRecent7d}`,
                `keep 入库 ${readiness.youtubePipeline.keepMaterializedRecent7d}/${readiness.youtubePipeline.verdictsRecent7d.keep} (${formatPercent(readiness.youtubePipeline.materializationCoveragePct)})`,
                `新卡片 ${readiness.youtubePipeline.generatedCards7d}`,
              ]}
            />
          </div>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-stone-950">Newsletter 环境</h2>
            <span className={`w-fit rounded-full border px-2 py-0.5 text-[11px] font-medium ${newsletterLaunchReady ? STATUS_STYLES.ready : STATUS_STYLES.pending}`}>
              {newsletterStatusLabel}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <EnvPill label="Provider" value={readiness.newsletterEnv.provider || '-'} ok={readiness.newsletterEnv.provider === 'resend'} />
            <EnvPill label="Send enabled" value={readiness.newsletterEnv.sendEnabled ? 'true' : 'false'} ok={readiness.newsletterEnv.sendEnabled} />
            <EnvPill label="Send config" value={readiness.newsletterEnv.sendConfigReady ? 'ready' : 'missing'} ok={readiness.newsletterEnv.sendConfigReady} />
            <EnvPill label="API key" value={readiness.newsletterEnv.hasApiKey ? 'present' : 'missing'} ok={readiness.newsletterEnv.hasApiKey} />
            <EnvPill label="From email" value={readiness.newsletterEnv.hasFromEmail ? 'present' : 'missing'} ok={readiness.newsletterEnv.hasFromEmail} />
            <EnvPill label="Site URL" value={readiness.newsletterEnv.hasSiteUrl ? 'present' : 'missing'} ok={readiness.newsletterEnv.hasSiteUrl} />
            <EnvPill label="Token secret" value={readiness.newsletterEnv.hasTokenSecret ? 'present' : 'missing'} ok={readiness.newsletterEnv.hasTokenSecret} />
          </div>
        </section>

        <section className="grid gap-3">
          {readiness.checks.map(check => (
            <article key={check.key} className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-stone-950">{check.label}</h2>
                  <p className="mt-1 text-xs leading-5 text-stone-500">{check.detail}</p>
                </div>
                <span className={`w-fit rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[check.status]}`}>
                  {STATUS_LABELS[check.status]}
                </span>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function PipelineBlock({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div className="rounded-md border border-stone-100 bg-stone-50 px-3 py-2">
      <h3 className="text-xs font-semibold text-stone-800">{title}</h3>
      <div className="mt-2 grid gap-1 text-xs leading-5 text-stone-500">
        {rows.map(row => <div key={row} className="break-words">{row}</div>)}
      </div>
    </div>
  );
}

function MetricCard({ title, status, rows }: { title: string; status: ReadinessStatus; rows: string[] }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-950">{title}</h2>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>
      <div className="mt-3 space-y-1 text-xs text-stone-500">
        {rows.map(row => <div key={row}>{row}</div>)}
      </div>
    </div>
  );
}

function EnvPill({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-md border border-stone-100 bg-stone-50 px-3 py-2">
      <div className="text-[11px] text-stone-500">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${ok ? 'text-emerald-700' : 'text-stone-700'}`}>{value}</div>
    </div>
  );
}

function formatMaybeDate(value: string | null): string {
  return value ? formatDateTime(value) : '-';
}

function formatPercent(value: number): string {
  return `${Math.max(0, Math.min(100, value))}%`;
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
