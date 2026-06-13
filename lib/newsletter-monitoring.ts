import { prisma } from '@/lib/db/prisma';

export interface NewsletterDeliveryMonitorRow {
  id: string;
  email: string;
  frequency: string;
  deliveryType: string;
  subject: string;
  status: string;
  provider: string | null;
  providerMessageId: string | null;
  attempts: number;
  errorMessage: string | null;
  createdAt: string;
  lastAttemptAt: string | null;
  sentAt: string | null;
}

export interface NewsletterDeliveryMonitor {
  ready: boolean;
  generatedAt: string;
  stats: {
    total: number;
    dryRun: number;
    queued: number;
    sent: number;
    failed: number;
    failureRate: number;
  };
  providers: Array<{ provider: string; count: number }>;
  rows: NewsletterDeliveryMonitorRow[];
}

export async function fetchNewsletterDeliveryMonitor(params: {
  limit?: number;
  status?: string | null;
} = {}): Promise<NewsletterDeliveryMonitor> {
  const ready = await hasNewsletterDeliveryMonitorStore();
  if (!ready) {
    return emptyMonitor(false);
  }

  const limit = Math.min(100, Math.max(1, params.limit || 40));
  const where = params.status && params.status !== 'all'
    ? { status: params.status }
    : {};

  const [rows, allRows] = await Promise.all([
    prisma.newsletterDeliveryLog.findMany({
      where,
      select: {
        id: true,
        email: true,
        frequency: true,
        deliveryType: true,
        subject: true,
        status: true,
        provider: true,
        providerMessageId: true,
        attempts: true,
        errorMessage: true,
        createdAt: true,
        lastAttemptAt: true,
        sentAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.newsletterDeliveryLog.findMany({
      select: {
        status: true,
        provider: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
  ]);

  return {
    ready: true,
    generatedAt: new Date().toISOString(),
    stats: buildStats(allRows),
    providers: buildProviderStats(allRows),
    rows: rows.map(row => ({
      id: row.id,
      email: row.email,
      frequency: row.frequency,
      deliveryType: row.deliveryType,
      subject: row.subject,
      status: row.status,
      provider: row.provider,
      providerMessageId: row.providerMessageId,
      attempts: row.attempts,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt.toISOString(),
      lastAttemptAt: row.lastAttemptAt?.toISOString() || null,
      sentAt: row.sentAt?.toISOString() || null,
    })),
  };
}

async function hasNewsletterDeliveryMonitorStore(): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT
      to_regclass('public."NewsletterDeliveryLog"') IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'NewsletterDeliveryLog'
          AND column_name = 'provider'
      ) AS "exists"
  `;
  return Boolean(rows[0]?.exists);
}

function emptyMonitor(ready: boolean): NewsletterDeliveryMonitor {
  return {
    ready,
    generatedAt: new Date().toISOString(),
    stats: {
      total: 0,
      dryRun: 0,
      queued: 0,
      sent: 0,
      failed: 0,
      failureRate: 0,
    },
    providers: [],
    rows: [],
  };
}

function buildStats(rows: Array<{ status: string }>): NewsletterDeliveryMonitor['stats'] {
  const total = rows.length;
  const dryRun = rows.filter(row => row.status === 'dry_run').length;
  const queued = rows.filter(row => row.status === 'queued').length;
  const sent = rows.filter(row => row.status === 'sent').length;
  const failed = rows.filter(row => row.status === 'failed').length;
  const attempted = sent + failed;
  const failureRate = attempted > 0 ? Number((failed / attempted).toFixed(3)) : 0;
  return { total, dryRun, queued, sent, failed, failureRate };
}

function buildProviderStats(rows: Array<{ provider: string | null }>) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const provider = row.provider || 'unknown';
    counts.set(provider, (counts.get(provider) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([provider, count]) => ({ provider, count }))
    .sort((left, right) => right.count - left.count || left.provider.localeCompare(right.provider));
}
