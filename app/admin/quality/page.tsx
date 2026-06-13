import Link from 'next/link';
import {
  fetchQualityReviewQueue,
  normalizeIssueType,
  normalizeSeverity,
  type QualityIssueType,
  type QualityReviewIssue,
  type QualitySeverity,
} from '@/lib/quality-review';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SEVERITY_LABELS: Record<QualitySeverity | 'all', string> = {
  all: '全部',
  critical: '阻断',
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
};

const SEVERITY_STYLES: Record<QualitySeverity, string> = {
  critical: 'border-rose-200 bg-rose-50 text-rose-700',
  high: 'border-orange-200 bg-orange-50 text-orange-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  low: 'border-stone-200 bg-stone-50 text-stone-600',
};

interface QualityAdminPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function QualityAdminPage({ searchParams }: QualityAdminPageProps) {
  const resolvedSearchParams = await searchParams;
  const severity = normalizeSeverity(firstParam(resolvedSearchParams?.severity) as QualitySeverity | 'all' | null);
  const issueType = normalizeIssueType(firstParam(resolvedSearchParams?.issueType) as QualityIssueType | 'all' | null);
  const days = clampNumber(Number(firstParam(resolvedSearchParams?.days) || 30), 1, 365, 30);
  const staleDays = clampNumber(Number(firstParam(resolvedSearchParams?.staleDays) || 90), 7, 730, 90);
  const snapshot = await fetchQualityReviewQueue({ limit: 50, days, staleDays, severity, issueType });

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-900 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/" className="text-xs font-medium text-orange-600 hover:text-orange-700">
              返回人物库
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">质量复核队列</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
              {snapshot.stats.reviewedPeople} 人样本 · {snapshot.stats.queuedPeople} 人入队 · 生成 {formatDateTime(snapshot.generatedAt)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            <StatPill label="阻断" value={snapshot.stats.criticalPeople} tone="critical" />
            <StatPill label="高优先级" value={snapshot.stats.highPeople} tone="high" />
            <StatPill label="待处理问题" value={snapshot.stats.totalIssues} />
            <StatPill label="QA review" value={snapshot.stats.qaReviewRows} />
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <MetricCard title="关系证据覆盖" value={formatPercent(snapshot.stats.relationEvidenceCoverage)} detail="trusted / confirmed 关系" />
          <MetricCard title="动态来源覆盖" value={formatPercent(snapshot.stats.activitySourceCoverage)} detail={`近 ${snapshot.params.days} 天活动`} />
          <MetricCard title="卡片来源覆盖" value={formatPercent(snapshot.stats.cardSourceCoverage)} detail="活跃学习卡片" />
        </section>

        <nav className="flex flex-wrap gap-2">
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map(nextSeverity => (
            <Link
              key={nextSeverity}
              href={buildHref({ severity: nextSeverity, issueType, days, staleDays })}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                severity === nextSeverity
                  ? 'border-orange-200 bg-orange-50 text-orange-700'
                  : 'border-stone-200 bg-white text-stone-500 hover:border-orange-200 hover:text-orange-700'
              }`}
            >
              {SEVERITY_LABELS[nextSeverity]}
            </Link>
          ))}
        </nav>

        <section className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-stone-950">问题分布</h2>
            <span className="text-xs text-stone-500">近 {snapshot.params.days} 天 · stale {snapshot.params.staleDays} 天</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildHref({ severity, issueType: 'all', days, staleDays })}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                issueType === 'all'
                  ? 'border-orange-200 bg-orange-50 text-orange-700'
                  : 'border-stone-200 bg-stone-50 text-stone-500 hover:border-orange-200 hover:text-orange-700'
              }`}
            >
              全部问题
            </Link>
            {snapshot.issueBreakdown.map(issue => (
              <Link
                key={issue.type}
                href={buildHref({ severity, issueType: issue.type, days, staleDays })}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                  issueType === issue.type
                    ? 'border-orange-200 bg-orange-50 text-orange-700'
                    : 'border-stone-200 bg-stone-50 text-stone-500 hover:border-orange-200 hover:text-orange-700'
                }`}
              >
                {issue.label} · {issue.people}/{issue.count}
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-3">
          {snapshot.items.length > 0 ? snapshot.items.map(item => (
            <article key={item.person.id} className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/person/${item.person.id}`} className="text-base font-semibold text-stone-950 hover:text-orange-700">
                      {item.person.name}
                    </Link>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${SEVERITY_STYLES[item.severity]}`}>
                      {SEVERITY_LABELS[item.severity]}
                    </span>
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                      score {item.score}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    {item.person.currentTitle || item.person.organization[0] || '职位整理中'} · 近 7 天 {item.person.weeklyViewCount} · 总访问 {item.person.viewCount}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.person.topics.slice(0, 5).map(topic => (
                      <span key={topic} className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center sm:min-w-96 sm:grid-cols-4">
                  <Metric label="关系证据" value={formatPercent(item.metrics.relationEvidenceCoverage)} />
                  <Metric label="待核关系" value={String(item.metrics.needsReviewRelationCount)} />
                  <Metric label="近期动态" value={String(item.metrics.recentActivityCount)} />
                  <Metric label="卡片来源" value={formatPercent(item.metrics.cardSourceCoverage)} />
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {item.issues.map(issue => (
                  <IssueBlock key={issue.key} issue={issue} />
                ))}
              </div>
            </article>
          )) : (
            <div className="rounded-lg border border-stone-200 bg-white p-6 text-sm text-stone-500">
              当前筛选下没有待复核人物。
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function IssueBlock({ issue }: { issue: QualityReviewIssue }) {
  return (
    <div className="rounded-md border border-stone-100 bg-stone-50 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-stone-950">{issue.label}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${SEVERITY_STYLES[issue.severity]}`}>
              {SEVERITY_LABELS[issue.severity]}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-stone-500">{issue.detail}</p>
        </div>
        <span className="w-fit rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-700">
          {issue.count}
        </span>
      </div>

      {issue.sample.length > 0 && (
        <div className="mt-3 space-y-2">
          {issue.sample.map(sample => (
            <div key={sample.id} className="rounded-md bg-white px-3 py-2 text-xs leading-5 text-stone-500">
              <div className="break-words font-medium text-stone-700">
                {sample.href ? (
                  <a href={sample.href} target="_blank" rel="noreferrer" className="hover:text-orange-700">
                    {sample.label}
                  </a>
                ) : sample.label}
              </div>
              {sample.detail && <div className="break-words">{sample.detail}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, tone }: { label: string; value: number; tone?: QualitySeverity }) {
  const toneClass = tone ? SEVERITY_STYLES[tone] : 'border-stone-200 bg-white text-stone-950';
  return (
    <div className={`rounded-lg border px-4 py-3 ${toneClass}`}>
      <div className="text-lg font-semibold">{value}</div>
      <div className="mt-0.5 text-[11px]">{label}</div>
    </div>
  );
}

function MetricCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="text-sm font-semibold text-stone-950">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-stone-950">{value}</div>
      <div className="mt-1 text-xs text-stone-500">{detail}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-100 bg-stone-50 px-3 py-2">
      <div className="text-base font-semibold text-stone-950">{value}</div>
      <div className="mt-0.5 text-[11px] text-stone-500">{label}</div>
    </div>
  );
}

function buildHref(params: {
  severity: QualitySeverity | 'all';
  issueType: QualityIssueType | 'all';
  days: number;
  staleDays: number;
}) {
  const searchParams = new URLSearchParams();
  if (params.severity !== 'all') searchParams.set('severity', params.severity);
  if (params.issueType !== 'all') searchParams.set('issueType', params.issueType);
  if (params.days !== 30) searchParams.set('days', String(params.days));
  if (params.staleDays !== 90) searchParams.set('staleDays', String(params.staleDays));
  const query = searchParams.toString();
  return query ? `/admin/quality?${query}` : '/admin/quality';
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
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
