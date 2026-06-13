import Link from 'next/link';
import { fetchInfluenceCalibration, type InfluenceCalibrationStatus } from '@/lib/influence-calibration';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STATUS_LABELS: Record<InfluenceCalibrationStatus | 'all', string> = {
  all: '全部',
  aligned: '已对齐',
  review: '待复核',
  large_gap: '高差异',
};

const STATUS_STYLES: Record<InfluenceCalibrationStatus, string> = {
  aligned: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  review: 'border-amber-200 bg-amber-50 text-amber-700',
  large_gap: 'border-rose-200 bg-rose-50 text-rose-700',
};

interface InfluenceAdminPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function InfluenceAdminPage({ searchParams }: InfluenceAdminPageProps) {
  const resolvedSearchParams = await searchParams;
  const status = normalizeStatus(firstParam(resolvedSearchParams?.status));
  const topic = firstParam(resolvedSearchParams?.topic);
  const search = firstParam(resolvedSearchParams?.search);
  const snapshot = await fetchInfluenceCalibration({ limit: 36, status, topic, search });

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-900 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/" className="text-xs font-medium text-orange-600 hover:text-orange-700">
              返回人物库
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">影响力校准</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
              {snapshot.version} · 平均差异 {snapshot.stats.averageAbsDelta.toFixed(2)} · 生成 {formatDateTime(snapshot.generatedAt)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            <StatPill label="候选" value={snapshot.stats.total} />
            <StatPill label="已对齐" value={snapshot.stats.aligned} />
            <StatPill label="待复核" value={snapshot.stats.review} />
            <StatPill label="高差异" value={snapshot.stats.largeGap} />
          </div>
        </header>

        <section className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="mb-3 text-xs font-semibold text-stone-500">权重</div>
          <div className="grid gap-2 sm:grid-cols-5">
            {snapshot.weights.map(weight => (
              <div key={weight.key} className="rounded-md border border-stone-100 bg-stone-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-stone-900">{weight.label}</span>
                  <span className="text-xs font-semibold text-orange-600">{weight.weight}%</span>
                </div>
                <p className="mt-2 text-[11px] leading-4 text-stone-500">{weight.note}</p>
              </div>
            ))}
          </div>
        </section>

        <nav className="flex flex-wrap gap-2">
          {(['all', 'large_gap', 'review', 'aligned'] as const).map(nextStatus => (
            <Link
              key={nextStatus}
              href={buildStatusHref(nextStatus)}
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

        <section className="grid gap-3">
          {snapshot.items.map(item => (
            <article key={item.person.id} className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/person/${item.person.id}`} className="text-base font-semibold text-stone-950 hover:text-orange-700">
                      {item.person.name}
                    </Link>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[item.status]}`}>
                      {STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">{item.person.currentTitle || item.person.organization[0] || '职位整理中'}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.person.topics.slice(0, 4).map(topicName => (
                      <span key={topicName} className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
                        {topicName}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center sm:min-w-80">
                  <Metric label="存量分" value={item.storedScore.toFixed(1)} />
                  <Metric label="版本分" value={item.computedScore.toFixed(1)} />
                  <Metric label="差异" value={formatDelta(item.delta)} tone={item.delta >= 0 ? 'up' : 'down'} />
                </div>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-5">
                {item.scoreResult.dimensions.map(dimension => (
                  <div key={dimension.key} className="rounded-md border border-stone-100 bg-stone-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-stone-900">{dimension.label}</span>
                      <span className="text-[11px] text-stone-400">{dimension.weight}%</span>
                    </div>
                    <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.max(4, dimension.score)}%` }} />
                    </div>
                    <div className="text-sm font-semibold text-stone-950">{Math.round(dimension.score)}</div>
                    <p className="mt-1 text-[11px] leading-4 text-stone-500">{dimension.signal}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-500">
                最近审计: {item.latestAudit ? `${item.latestAudit.status} · ${item.latestAudit.scoreVersion} · ${formatDateTime(item.latestAudit.createdAt)}` : '暂无'}
              </div>
            </article>
          ))}
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

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  const valueClass = tone === 'up'
    ? 'text-emerald-700'
    : tone === 'down'
      ? 'text-rose-700'
      : 'text-stone-950';

  return (
    <div className="rounded-md border border-stone-100 bg-stone-50 px-3 py-2">
      <div className={`text-base font-semibold ${valueClass}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-stone-500">{label}</div>
    </div>
  );
}

function normalizeStatus(value: string | null | undefined): InfluenceCalibrationStatus | 'all' {
  if (value === 'aligned' || value === 'review' || value === 'large_gap') return value;
  return 'all';
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function buildStatusHref(status: InfluenceCalibrationStatus | 'all') {
  return status === 'all' ? '/admin/influence' : `/admin/influence?status=${status}`;
}

function formatDelta(value: number): string {
  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
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
