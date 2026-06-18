import { prisma } from '@/lib/db/prisma';

export type ReadinessStatus = 'ready' | 'pending' | 'blocked';

export interface ReadinessCheck {
  key: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
}

export interface OperationsReadiness {
  generatedAt: string;
  overallStatus: ReadinessStatus;
  schema: {
    activityEvent: ActivityStoreReadiness;
    rawPoolItem: StoreReadiness;
    qaAuditLog: StoreReadiness;
    newsletterDeliveryLog: NewsletterStoreReadiness;
    influenceScoreAuditLog: StoreReadiness;
    compareReport: CompareReportStoreReadiness;
    companySource: CompanySourceStoreReadiness;
  };
  youtubeEnv: {
    hasGoogleApiKey: boolean;
    semanticQaEnabled: boolean;
  };
  youtubePipeline: {
    rawTotal: number;
    rawRecent24h: number;
    rawRecent7d: number;
    latestFetchedAt: string | null;
    attemptedPeople30d: number;
    failedPeople30d: number;
    latestAttemptedAt: string | null;
    latestError: string | null;
    auditedRecent7d: number;
    auditCoveragePct: number;
    latestAuditAt: string | null;
    verdictsRecent7d: {
      keep: number;
      review: number;
      reject: number;
      duplicate: number;
      skipped: number;
      other: number;
    };
    processedRecent7d: number;
    activityTotal: number;
    activityRecent7d: number;
    keepMaterializedRecent7d: number;
    materializationCoveragePct: number;
    latestActivityAt: string | null;
    generatedCards7d: number;
  };
  newsletterEnv: {
    provider: string | null;
    sendEnabled: boolean;
    hasApiKey: boolean;
    hasFromEmail: boolean;
    hasSiteUrl: boolean;
    hasTokenSecret: boolean;
    sendConfigReady: boolean;
    readyToSend: boolean;
  };
  activity: {
    total: number;
    recent30d: number;
    latestDetectedAt: string | null;
  };
  newsletter: {
    total: number;
    dryRun: number;
    sent: number;
    failed: number;
    latestCreatedAt: string | null;
  };
  influence: {
    audits: number;
    latestCreatedAt: string | null;
  };
  compareReport: {
    total: number;
    completed: number;
    running: number;
    pending: number;
    failed: number;
    latestCreatedAt: string | null;
  };
  companyEvidence: {
    sources: number;
    organizations: number;
    threadLinks: number;
    financialSignals: number;
    boundaryIssues: number;
    latestFetchedAt: string | null;
  };
  checks: ReadinessCheck[];
}

interface StoreReadiness {
  exists: boolean;
  status: ReadinessStatus;
  detail: string;
}

interface ActivityStoreReadiness extends StoreReadiness {
  reviewStatusColumn: boolean;
}

interface NewsletterStoreReadiness extends StoreReadiness {
  providerColumns: boolean;
}

interface CompareReportStoreReadiness extends StoreReadiness {
  eventTable: boolean;
  eventMetadataColumn: boolean;
}

interface CompanySourceStoreReadiness extends StoreReadiness {
  threadLinkTable: boolean;
  evidenceSourceIdsColumn: boolean;
}

export async function fetchOperationsReadiness(): Promise<OperationsReadiness> {
  const [
    activityStore,
    rawPoolStore,
    qaAuditStore,
    newsletterStore,
    influenceStore,
    compareReportStore,
    companySourceStore,
  ] = await Promise.all([
    checkActivityStore(),
    checkTable('RawPoolItem'),
    checkTable('QAAuditLog'),
    checkNewsletterStore(),
    checkTable('InfluenceScoreAuditLog'),
    checkCompareReportStore(),
    checkCompanySourceStore(),
  ]);

  const [activity, youtubePipeline, newsletter, influence, compareReport, companyEvidence] = await Promise.all([
    activityStore.exists && activityStore.reviewStatusColumn ? fetchActivityStats() : emptyActivityStats(),
    rawPoolStore.exists
      ? fetchYouTubePipelineStats({
        qaAuditReady: qaAuditStore.exists,
        activityEventReady: activityStore.exists && activityStore.reviewStatusColumn,
      })
      : emptyYouTubePipelineStats(),
    newsletterStore.exists && newsletterStore.providerColumns ? fetchNewsletterStats() : emptyNewsletterStats(),
    influenceStore.exists ? fetchInfluenceStats() : emptyInfluenceStats(),
    compareReportStore.exists && compareReportStore.eventTable && compareReportStore.eventMetadataColumn ? fetchCompareReportStats() : emptyCompareReportStats(),
    companySourceStore.exists && companySourceStore.threadLinkTable && companySourceStore.evidenceSourceIdsColumn
      ? fetchCompanyEvidenceStats()
      : emptyCompanyEvidenceStats(),
  ]);
  const youtubeEnv = buildYouTubeEnv();
  const newsletterEnv = buildNewsletterEnv();
  const checks = buildChecks({
    activityStore,
    rawPoolStore,
    qaAuditStore,
    newsletterStore,
    influenceStore,
    compareReportStore,
    companySourceStore,
    activity,
    youtubeEnv,
    youtubePipeline,
    newsletter,
    influence,
    compareReport,
    companyEvidence,
    newsletterEnv,
  });

  return {
    generatedAt: new Date().toISOString(),
    overallStatus: summarizeStatus(checks),
    schema: {
      activityEvent: activityStore,
      rawPoolItem: rawPoolStore,
      qaAuditLog: qaAuditStore,
      newsletterDeliveryLog: newsletterStore,
      influenceScoreAuditLog: influenceStore,
      compareReport: compareReportStore,
      companySource: companySourceStore,
    },
    youtubeEnv,
    youtubePipeline,
    newsletterEnv,
    activity,
    newsletter,
    influence,
    compareReport,
    companyEvidence,
    checks,
  };
}

async function checkTable(tableName: string): Promise<StoreReadiness> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT to_regclass(${`public."${tableName}"`}) IS NOT NULL AS "exists"
  `;
  const exists = Boolean(rows[0]?.exists);
  return {
    exists,
    status: exists ? 'ready' : 'blocked',
    detail: exists ? `${tableName} exists` : `${tableName} migration is not applied`,
  };
}

async function checkActivityStore(): Promise<ActivityStoreReadiness> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean; reviewStatusColumn: boolean }>>`
    SELECT
      to_regclass('public."ActivityEvent"') IS NOT NULL AS "exists",
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'ActivityEvent'
          AND column_name = 'reviewStatus'
      ) AS "reviewStatusColumn"
  `;
  const exists = Boolean(rows[0]?.exists);
  const reviewStatusColumn = Boolean(rows[0]?.reviewStatusColumn);
  const ready = exists && reviewStatusColumn;

  return {
    exists,
    reviewStatusColumn,
    status: ready ? 'ready' : 'blocked',
    detail: ready
      ? 'ActivityEvent exists with reviewStatus column'
      : exists
        ? 'ActivityEvent exists but reviewStatus column is missing'
        : 'ActivityEvent migration is not applied',
  };
}

async function checkNewsletterStore(): Promise<NewsletterStoreReadiness> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean; providerColumns: boolean }>>`
    SELECT
      to_regclass('public."NewsletterDeliveryLog"') IS NOT NULL AS "exists",
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'NewsletterDeliveryLog'
          AND column_name = 'provider'
      )
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'NewsletterDeliveryLog'
          AND column_name = 'attempts'
      ) AS "providerColumns"
  `;
  const exists = Boolean(rows[0]?.exists);
  const providerColumns = Boolean(rows[0]?.providerColumns);
  const ready = exists && providerColumns;

  return {
    exists,
    providerColumns,
    status: ready ? 'ready' : 'blocked',
    detail: ready
      ? 'NewsletterDeliveryLog exists with provider columns'
      : exists
        ? 'NewsletterDeliveryLog exists but provider columns are missing'
        : 'NewsletterDeliveryLog migration is not applied',
  };
}

async function checkCompareReportStore(): Promise<CompareReportStoreReadiness> {
  const rows = await prisma.$queryRaw<Array<{
    exists: boolean;
    eventTable: boolean;
    eventMetadataColumn: boolean;
  }>>`
    SELECT
      to_regclass('public."CompareReport"') IS NOT NULL AS "exists",
      to_regclass('public."CompareReportEvent"') IS NOT NULL AS "eventTable",
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'CompareReportEvent'
          AND column_name = 'metadata'
      ) AS "eventMetadataColumn"
  `;
  const exists = Boolean(rows[0]?.exists);
  const eventTable = Boolean(rows[0]?.eventTable);
  const eventMetadataColumn = Boolean(rows[0]?.eventMetadataColumn);
  const ready = exists && eventTable && eventMetadataColumn;

  return {
    exists,
    eventTable,
    eventMetadataColumn,
    status: ready ? 'ready' : 'blocked',
    detail: ready
      ? 'CompareReport and CompareReportEvent exist with event metadata'
      : !exists
        ? 'CompareReport migration is not applied'
        : !eventTable
          ? 'CompareReportEvent migration is not applied'
          : 'CompareReportEvent metadata column is missing',
  };
}

async function checkCompanySourceStore(): Promise<CompanySourceStoreReadiness> {
  const rows = await prisma.$queryRaw<Array<{
    exists: boolean;
    threadLinkTable: boolean;
    evidenceSourceIdsColumn: boolean;
  }>>`
    SELECT
      to_regclass('public."CompanySource"') IS NOT NULL AS "exists",
      to_regclass('public."CompanyThreadLink"') IS NOT NULL AS "threadLinkTable",
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'CompanyThreadLink'
          AND column_name = 'evidenceSourceIds'
      ) AS "evidenceSourceIdsColumn"
  `;
  const exists = Boolean(rows[0]?.exists);
  const threadLinkTable = Boolean(rows[0]?.threadLinkTable);
  const evidenceSourceIdsColumn = Boolean(rows[0]?.evidenceSourceIdsColumn);
  const ready = exists && threadLinkTable && evidenceSourceIdsColumn;

  return {
    exists,
    threadLinkTable,
    evidenceSourceIdsColumn,
    status: ready ? 'ready' : 'blocked',
    detail: ready
      ? 'CompanySource and CompanyThreadLink exist'
      : !exists
        ? 'CompanySource migration is not applied'
        : !threadLinkTable
          ? 'CompanyThreadLink migration is not applied'
          : 'CompanyThreadLink evidenceSourceIds column is missing',
  };
}

async function fetchActivityStats() {
  const rows = await prisma.$queryRaw<Array<{
    total: bigint | number | string;
    recent30d: bigint | number | string;
    latestDetectedAt: Date | null;
  }>>`
    SELECT
      COUNT(*) AS "total",
      COUNT(*) FILTER (WHERE "detectedAt" >= NOW() - INTERVAL '30 days') AS "recent30d",
      MAX("detectedAt") AS "latestDetectedAt"
    FROM "ActivityEvent"
  `;
  const row = rows[0];
  return {
    total: toNumber(row?.total),
    recent30d: toNumber(row?.recent30d),
    latestDetectedAt: row?.latestDetectedAt?.toISOString() || null,
  };
}

async function fetchYouTubePipelineStats(params: {
  qaAuditReady: boolean;
  activityEventReady: boolean;
}): Promise<OperationsReadiness['youtubePipeline']> {
  const [rawStats, attemptStats, auditStats, activityStats, cardStats] = await Promise.all([
    fetchYouTubeRawStats(),
    fetchYouTubeAttemptStats(),
    params.qaAuditReady ? fetchYouTubeAuditStats(params.activityEventReady) : Promise.resolve(emptyYouTubeAuditStats()),
    params.activityEventReady ? fetchYouTubeActivityStats() : Promise.resolve(emptyYouTubeActivityStats()),
    fetchYouTubeCardStats(),
  ]);

  const auditCoveragePct = rawStats.rawRecent7d > 0
    ? Math.round((auditStats.auditedRecent7d / rawStats.rawRecent7d) * 100)
    : 100;
  const keepRecent7d = auditStats.verdictsRecent7d.keep;
  const materializationCoveragePct = keepRecent7d > 0
    ? Math.round((auditStats.keepMaterializedRecent7d / keepRecent7d) * 100)
    : 100;

  return {
    ...rawStats,
    ...attemptStats,
    ...auditStats,
    auditCoveragePct,
    ...activityStats,
    materializationCoveragePct,
    generatedCards7d: cardStats.generatedCards7d,
  };
}

async function fetchYouTubeRawStats() {
  const rows = await prisma.$queryRaw<Array<{
    rawTotal: bigint | number | string;
    rawRecent24h: bigint | number | string;
    rawRecent7d: bigint | number | string;
    processedRecent7d: bigint | number | string;
    latestFetchedAt: Date | null;
  }>>`
    SELECT
      COUNT(*) AS "rawTotal",
      COUNT(*) FILTER (WHERE "fetchedAt" >= NOW() - INTERVAL '24 hours') AS "rawRecent24h",
      COUNT(*) FILTER (WHERE "fetchedAt" >= NOW() - INTERVAL '7 days') AS "rawRecent7d",
      COUNT(*) FILTER (WHERE "fetchedAt" >= NOW() - INTERVAL '7 days' AND processed = true) AS "processedRecent7d",
      MAX("fetchedAt") AS "latestFetchedAt"
    FROM "RawPoolItem"
    WHERE "sourceType" = 'youtube'
      AND "fetchStatus" = 'success'
  `;
  const row = rows[0];
  return {
    rawTotal: toNumber(row?.rawTotal),
    rawRecent24h: toNumber(row?.rawRecent24h),
    rawRecent7d: toNumber(row?.rawRecent7d),
    processedRecent7d: toNumber(row?.processedRecent7d),
    latestFetchedAt: row?.latestFetchedAt?.toISOString() || null,
  };
}

async function fetchYouTubeAttemptStats() {
  const people = await prisma.people.findMany({
    select: { lastFetchedAt: true },
  });
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let attemptedPeople30d = 0;
  let failedPeople30d = 0;
  let latestAttemptedAt: Date | null = null;
  let latestErrorAt: Date | null = null;
  let latestError: string | null = null;

  for (const person of people) {
    const cursor = asRecord(person.lastFetchedAt);
    const attemptedAt = parseDateValue(cursor.youtubeAttemptedAt);
    if (!attemptedAt || attemptedAt.getTime() < cutoff) continue;

    attemptedPeople30d++;
    if (!latestAttemptedAt || attemptedAt > latestAttemptedAt) {
      latestAttemptedAt = attemptedAt;
    }

    const error = typeof cursor.youtubeLastError === 'string' ? cursor.youtubeLastError : null;
    if (error) {
      failedPeople30d++;
      if (!latestErrorAt || attemptedAt > latestErrorAt) {
        latestErrorAt = attemptedAt;
        latestError = error;
      }
    }
  }

  return {
    attemptedPeople30d,
    failedPeople30d,
    latestAttemptedAt: latestAttemptedAt?.toISOString() || null,
    latestError,
  };
}

async function fetchYouTubeAuditStats(activityEventReady: boolean) {
  const rows = await prisma.$queryRaw<Array<{
    auditedRecent7d: bigint | number | string;
    keep: bigint | number | string;
    review: bigint | number | string;
    reject: bigint | number | string;
    duplicate: bigint | number | string;
    skipped: bigint | number | string;
    other: bigint | number | string;
    latestAuditAt: Date | null;
  }>>`
    WITH recent AS (
      SELECT id, "personId", "urlHash"
      FROM "RawPoolItem"
      WHERE "sourceType" = 'youtube'
        AND "fetchStatus" = 'success'
        AND "fetchedAt" >= NOW() - INTERVAL '7 days'
    ),
    latest AS (
      SELECT DISTINCT ON (q."personId", q."urlHash")
        q."personId",
        q."urlHash",
        q.verdict,
        q."createdAt"
      FROM "QAAuditLog" q
      JOIN recent r ON r."personId" = q."personId" AND r."urlHash" = q."urlHash"
      WHERE q."sourceType" = 'youtube'
      ORDER BY q."personId", q."urlHash", q."createdAt" DESC
    )
    SELECT
      COUNT(*) AS "auditedRecent7d",
      COUNT(*) FILTER (WHERE verdict = 'keep') AS "keep",
      COUNT(*) FILTER (WHERE verdict = 'review') AS "review",
      COUNT(*) FILTER (WHERE verdict = 'reject') AS "reject",
      COUNT(*) FILTER (WHERE verdict = 'duplicate') AS "duplicate",
      COUNT(*) FILTER (WHERE verdict = 'skipped') AS "skipped",
      COUNT(*) FILTER (WHERE verdict NOT IN ('keep', 'review', 'reject', 'duplicate', 'skipped')) AS "other",
      MAX("createdAt") AS "latestAuditAt"
    FROM latest
  `;
  const row = rows[0];
  const verdictsRecent7d = {
    keep: toNumber(row?.keep),
    review: toNumber(row?.review),
    reject: toNumber(row?.reject),
    duplicate: toNumber(row?.duplicate),
    skipped: toNumber(row?.skipped),
    other: toNumber(row?.other),
  };

  return {
    auditedRecent7d: toNumber(row?.auditedRecent7d),
    latestAuditAt: row?.latestAuditAt?.toISOString() || null,
    verdictsRecent7d,
    keepMaterializedRecent7d: activityEventReady ? await fetchYouTubeKeepMaterializedRecent7d() : 0,
  };
}

async function fetchYouTubeKeepMaterializedRecent7d(): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint | number | string }>>`
    WITH recent AS (
      SELECT id, "personId", "urlHash"
      FROM "RawPoolItem"
      WHERE "sourceType" = 'youtube'
        AND "fetchStatus" = 'success'
        AND "fetchedAt" >= NOW() - INTERVAL '7 days'
    ),
    latest AS (
      SELECT DISTINCT ON (q."personId", q."urlHash")
        q."personId",
        q."urlHash",
        q.verdict
      FROM "QAAuditLog" q
      JOIN recent r ON r."personId" = q."personId" AND r."urlHash" = q."urlHash"
      WHERE q."sourceType" = 'youtube'
      ORDER BY q."personId", q."urlHash", q."createdAt" DESC
    )
    SELECT COUNT(*) AS "count"
    FROM recent r
    JOIN latest l ON l."personId" = r."personId" AND l."urlHash" = r."urlHash"
    JOIN "ActivityEvent" a ON a."sourceItemId" = r.id
    WHERE l.verdict = 'keep'
      AND a."sourceType" = 'youtube'
  `;
  return toNumber(rows[0]?.count);
}

async function fetchYouTubeActivityStats() {
  const rows = await prisma.$queryRaw<Array<{
    activityTotal: bigint | number | string;
    activityRecent7d: bigint | number | string;
    latestActivityAt: Date | null;
  }>>`
    SELECT
      COUNT(*) AS "activityTotal",
      COUNT(*) FILTER (WHERE "detectedAt" >= NOW() - INTERVAL '7 days') AS "activityRecent7d",
      MAX("detectedAt") AS "latestActivityAt"
    FROM "ActivityEvent"
    WHERE "sourceType" = 'youtube'
  `;
  const row = rows[0];
  return {
    activityTotal: toNumber(row?.activityTotal),
    activityRecent7d: toNumber(row?.activityRecent7d),
    latestActivityAt: row?.latestActivityAt?.toISOString() || null,
  };
}

async function fetchYouTubeCardStats() {
  const rows = await prisma.$queryRaw<Array<{ generatedCards7d: bigint | number | string }>>`
    SELECT COUNT(*) AS "generatedCards7d"
    FROM "Card"
    WHERE "createdAt" >= NOW() - INTERVAL '7 days'
      AND "generationId" LIKE 'youtube-postprocess-%'
  `;
  return {
    generatedCards7d: toNumber(rows[0]?.generatedCards7d),
  };
}

async function fetchNewsletterStats() {
  const rows = await prisma.$queryRaw<Array<{
    total: bigint | number | string;
    dryRun: bigint | number | string;
    sent: bigint | number | string;
    failed: bigint | number | string;
    latestCreatedAt: Date | null;
  }>>`
    SELECT
      COUNT(*) AS "total",
      COUNT(*) FILTER (WHERE status = 'dry_run') AS "dryRun",
      COUNT(*) FILTER (WHERE status = 'sent') AS "sent",
      COUNT(*) FILTER (WHERE status = 'failed') AS "failed",
      MAX("createdAt") AS "latestCreatedAt"
    FROM "NewsletterDeliveryLog"
  `;
  const row = rows[0];
  return {
    total: toNumber(row?.total),
    dryRun: toNumber(row?.dryRun),
    sent: toNumber(row?.sent),
    failed: toNumber(row?.failed),
    latestCreatedAt: row?.latestCreatedAt?.toISOString() || null,
  };
}

async function fetchInfluenceStats() {
  const rows = await prisma.$queryRaw<Array<{
    audits: bigint | number | string;
    latestCreatedAt: Date | null;
  }>>`
    SELECT
      COUNT(*) AS "audits",
      MAX("createdAt") AS "latestCreatedAt"
    FROM "InfluenceScoreAuditLog"
  `;
  const row = rows[0];
  return {
    audits: toNumber(row?.audits),
    latestCreatedAt: row?.latestCreatedAt?.toISOString() || null,
  };
}

async function fetchCompareReportStats() {
  const rows = await prisma.$queryRaw<Array<{
    total: bigint | number | string;
    completed: bigint | number | string;
    running: bigint | number | string;
    pending: bigint | number | string;
    failed: bigint | number | string;
    latestCreatedAt: Date | null;
  }>>`
    SELECT
      COUNT(*) AS "total",
      COUNT(*) FILTER (WHERE status = 'completed') AS "completed",
      COUNT(*) FILTER (WHERE status = 'running') AS "running",
      COUNT(*) FILTER (WHERE status = 'pending') AS "pending",
      COUNT(*) FILTER (WHERE status = 'failed') AS "failed",
      MAX("createdAt") AS "latestCreatedAt"
    FROM "CompareReport"
  `;
  const row = rows[0];
  return {
    total: toNumber(row?.total),
    completed: toNumber(row?.completed),
    running: toNumber(row?.running),
    pending: toNumber(row?.pending),
    failed: toNumber(row?.failed),
    latestCreatedAt: row?.latestCreatedAt?.toISOString() || null,
  };
}

async function fetchCompanyEvidenceStats(): Promise<OperationsReadiness['companyEvidence']> {
  const [sourceRows, linkRows] = await Promise.all([
    prisma.$queryRaw<Array<{
      sources: bigint | number | string;
      organizations: bigint | number | string;
      financialSignals: bigint | number | string;
      boundaryIssues: bigint | number | string;
      latestFetchedAt: Date | null;
    }>>`
      SELECT
        COUNT(*) AS "sources",
        COUNT(DISTINCT "organizationId") AS "organizations",
        COUNT(*) FILTER (WHERE role = 'financial_signal') AS "financialSignals",
        COUNT(*) FILTER (
          WHERE "excludedFromTopicReadiness" IS NOT true
             OR (role = 'financial_signal' AND "companyPageOnly" IS NOT true)
        ) AS "boundaryIssues",
        MAX("fetchedAt") AS "latestFetchedAt"
      FROM "CompanySource"
    `,
    prisma.$queryRaw<Array<{ threadLinks: bigint | number | string }>>`
      SELECT COUNT(*) AS "threadLinks"
      FROM "CompanyThreadLink"
    `,
  ]);
  const sourceRow = sourceRows[0];
  const linkRow = linkRows[0];
  return {
    sources: toNumber(sourceRow?.sources),
    organizations: toNumber(sourceRow?.organizations),
    threadLinks: toNumber(linkRow?.threadLinks),
    financialSignals: toNumber(sourceRow?.financialSignals),
    boundaryIssues: toNumber(sourceRow?.boundaryIssues),
    latestFetchedAt: sourceRow?.latestFetchedAt?.toISOString() || null,
  };
}

function buildYouTubeEnv(): OperationsReadiness['youtubeEnv'] {
  return {
    hasGoogleApiKey: Boolean(process.env.GOOGLE_API_KEY),
    semanticQaEnabled: process.env.ENABLE_SEMANTIC_QA !== 'false',
  };
}

function buildNewsletterEnv(): OperationsReadiness['newsletterEnv'] {
  const provider = process.env.NEWSLETTER_EMAIL_PROVIDER || null;
  const sendEnabled = process.env.NEWSLETTER_SEND_ENABLED === 'true';
  const hasApiKey = Boolean(process.env.RESEND_API_KEY);
  const hasFromEmail = Boolean(process.env.NEWSLETTER_FROM_EMAIL);
  const hasSiteUrl = Boolean(process.env.PRODUCTION_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL);
  const hasTokenSecret = Boolean(process.env.NEWSLETTER_TOKEN_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET);
  const sendConfigReady = provider === 'resend' && hasApiKey && hasFromEmail && hasSiteUrl && hasTokenSecret;
  const readyToSend = sendConfigReady && sendEnabled;

  return {
    provider,
    sendEnabled,
    hasApiKey,
    hasFromEmail,
    hasSiteUrl,
    hasTokenSecret,
    sendConfigReady,
    readyToSend,
  };
}

function buildChecks(params: {
  activityStore: StoreReadiness;
  rawPoolStore: StoreReadiness;
  qaAuditStore: StoreReadiness;
  newsletterStore: NewsletterStoreReadiness;
  influenceStore: StoreReadiness;
  compareReportStore: CompareReportStoreReadiness;
  companySourceStore: CompanySourceStoreReadiness;
  activity: OperationsReadiness['activity'];
  youtubeEnv: OperationsReadiness['youtubeEnv'];
  youtubePipeline: OperationsReadiness['youtubePipeline'];
  newsletter: OperationsReadiness['newsletter'];
  influence: OperationsReadiness['influence'];
  compareReport: OperationsReadiness['compareReport'];
  companyEvidence: OperationsReadiness['companyEvidence'];
  newsletterEnv: OperationsReadiness['newsletterEnv'];
}): ReadinessCheck[] {
  return [
    {
      key: 'activity-schema',
      label: 'ActivityEvent migration',
      status: params.activityStore.status,
      detail: params.activityStore.detail,
    },
    {
      key: 'activity-backfill',
      label: 'ActivityEvent backfill',
      status: params.activityStore.status === 'blocked' ? 'blocked' : params.activity.total > 0 ? 'ready' : 'pending',
      detail: params.activityStore.status === 'blocked'
        ? 'Apply ActivityEvent migration and reviewStatus column before backfill'
        : params.activity.total > 0
          ? `${params.activity.total} events materialized`
          : 'No ActivityEvent rows yet',
    },
    {
      key: 'youtube-api-env',
      label: 'YouTube API env',
      status: params.youtubeEnv.hasGoogleApiKey ? 'ready' : 'blocked',
      detail: params.youtubeEnv.hasGoogleApiKey
        ? `GOOGLE_API_KEY is present; semantic QA is ${params.youtubeEnv.semanticQaEnabled ? 'enabled' : 'disabled'}`
        : 'GOOGLE_API_KEY is missing; YouTube Data API calls cannot run',
    },
    {
      key: 'youtube-rawpool-schema',
      label: 'RawPoolItem migration',
      status: params.rawPoolStore.status,
      detail: params.rawPoolStore.detail,
    },
    {
      key: 'youtube-qa-schema',
      label: 'QAAuditLog migration',
      status: params.qaAuditStore.status,
      detail: params.qaAuditStore.detail,
    },
    {
      key: 'youtube-recent-fetch',
      label: 'YouTube recent fetch',
      status: youtubeFetchStatus(params.youtubeEnv, params.youtubePipeline),
      detail: youtubeFetchDetail(params.youtubeEnv, params.youtubePipeline),
    },
    {
      key: 'youtube-qa-coverage',
      label: 'YouTube QA coverage',
      status: youtubeQaCoverageStatus(params.rawPoolStore, params.qaAuditStore, params.youtubePipeline),
      detail: youtubeQaCoverageDetail(params.rawPoolStore, params.qaAuditStore, params.youtubePipeline),
    },
    {
      key: 'youtube-activity-materialization',
      label: 'YouTube ActivityEvent materialization',
      status: youtubeMaterializationStatus(params.activityStore, params.youtubePipeline),
      detail: youtubeMaterializationDetail(params.activityStore, params.youtubePipeline),
    },
    {
      key: 'newsletter-schema',
      label: 'NewsletterDeliveryLog migration',
      status: params.newsletterStore.status,
      detail: params.newsletterStore.detail,
    },
    {
      key: 'newsletter-env',
      label: 'Newsletter send env',
      status: newsletterEnvStatus(params.newsletterEnv, params.newsletter),
      detail: newsletterEnvDetail(params.newsletterEnv, params.newsletter),
    },
    {
      key: 'newsletter-send-observation',
      label: 'Newsletter real-send observation',
      status: !params.newsletterStore.providerColumns ? 'blocked' : params.newsletter.sent > 0 ? 'ready' : 'pending',
      detail: !params.newsletterStore.providerColumns
        ? 'Apply provider columns before observing sends'
        : params.newsletter.sent > 0
          ? `${params.newsletter.sent} sent delivery logs`
          : 'No sent newsletter delivery logs yet',
    },
    {
      key: 'influence-audit-schema',
      label: 'InfluenceScoreAuditLog migration',
      status: params.influenceStore.status,
      detail: params.influenceStore.detail,
    },
    {
      key: 'influence-audit-observation',
      label: 'Influence calibration observation',
      status: !params.influenceStore.exists ? 'blocked' : params.influence.audits > 0 ? 'ready' : 'pending',
      detail: !params.influenceStore.exists
        ? 'Apply InfluenceScoreAuditLog migration before calibration audit'
        : params.influence.audits > 0
          ? `${params.influence.audits} calibration audit rows`
          : 'No influence calibration audit rows yet',
    },
    {
      key: 'compare-report-schema',
      label: 'CompareReport migration',
      status: params.compareReportStore.status,
      detail: params.compareReportStore.detail,
    },
    {
      key: 'compare-report-observation',
      label: 'Compare report observation',
      status: params.compareReportStore.status === 'blocked' ? 'blocked' : params.compareReport.total > 0 ? 'ready' : 'pending',
      detail: params.compareReportStore.status === 'blocked'
        ? 'Apply CompareReport migration before generating compare reports'
        : params.compareReport.total > 0
          ? `${params.compareReport.total} reports, ${params.compareReport.completed} completed`
          : 'No compare reports generated yet',
    },
    {
      key: 'company-source-schema',
      label: 'CompanySource migration',
      status: params.companySourceStore.status,
      detail: params.companySourceStore.detail,
    },
    {
      key: 'company-source-observation',
      label: 'Company evidence materialization',
      status: companyEvidenceStatus(params.companySourceStore, params.companyEvidence),
      detail: companyEvidenceDetail(params.companySourceStore, params.companyEvidence),
    },
  ];
}

function companyEvidenceStatus(
  store: CompanySourceStoreReadiness,
  evidence: OperationsReadiness['companyEvidence']
): ReadinessStatus {
  if (store.status === 'blocked') return 'blocked';
  if (evidence.boundaryIssues > 0) return 'blocked';
  if (evidence.sources > 0 && evidence.threadLinks > 0) return 'ready';
  return 'pending';
}

function companyEvidenceDetail(
  store: CompanySourceStoreReadiness,
  evidence: OperationsReadiness['companyEvidence']
): string {
  if (store.status === 'blocked') return 'Apply CompanySource migration before materializing company evidence';
  if (evidence.boundaryIssues > 0) return `${evidence.boundaryIssues} CompanySource rows violate topic-readiness boundaries`;
  if (evidence.sources > 0) {
    return `${evidence.sources} company sources across ${evidence.organizations} organizations; ${evidence.threadLinks} thread links`;
  }
  return 'No CompanySource rows materialized yet';
}

function youtubeFetchStatus(
  env: OperationsReadiness['youtubeEnv'],
  pipeline: OperationsReadiness['youtubePipeline']
): ReadinessStatus {
  if (!env.hasGoogleApiKey) return 'blocked';
  if (pipeline.rawRecent7d > 0) return 'ready';
  return pipeline.attemptedPeople30d > 0 ? 'pending' : 'pending';
}

function youtubeFetchDetail(
  env: OperationsReadiness['youtubeEnv'],
  pipeline: OperationsReadiness['youtubePipeline']
): string {
  if (!env.hasGoogleApiKey) return 'Configure GOOGLE_API_KEY before running YouTube fetch';
  if (pipeline.rawRecent7d > 0) {
    const failure = pipeline.failedPeople30d > 0 ? `; ${pipeline.failedPeople30d} people still have channel errors` : '';
    return `${pipeline.rawRecent7d} YouTube raw rows fetched in the last 7 days${failure}`;
  }
  if (pipeline.attemptedPeople30d > 0) {
    return `${pipeline.attemptedPeople30d} people attempted in 30 days, but no recent raw rows`;
  }
  return 'No YouTube fetch attempt recorded in the last 30 days';
}

function youtubeQaCoverageStatus(
  rawPoolStore: StoreReadiness,
  qaAuditStore: StoreReadiness,
  pipeline: OperationsReadiness['youtubePipeline']
): ReadinessStatus {
  if (!rawPoolStore.exists || !qaAuditStore.exists) return 'blocked';
  if (pipeline.rawRecent7d === 0) return 'pending';
  if (pipeline.auditedRecent7d >= pipeline.rawRecent7d) return 'ready';
  if (pipeline.auditedRecent7d > 0) return 'pending';
  return 'blocked';
}

function youtubeQaCoverageDetail(
  rawPoolStore: StoreReadiness,
  qaAuditStore: StoreReadiness,
  pipeline: OperationsReadiness['youtubePipeline']
): string {
  if (!rawPoolStore.exists) return 'RawPoolItem migration is missing';
  if (!qaAuditStore.exists) return 'QAAuditLog migration is missing';
  if (pipeline.rawRecent7d === 0) return 'No recent YouTube raw rows to audit';
  return `${pipeline.auditedRecent7d}/${pipeline.rawRecent7d} recent YouTube rows audited (${pipeline.auditCoveragePct}%)`;
}

function youtubeMaterializationStatus(
  activityStore: StoreReadiness,
  pipeline: OperationsReadiness['youtubePipeline']
): ReadinessStatus {
  if (!activityStore.exists) return 'blocked';
  const keepRecent7d = pipeline.verdictsRecent7d.keep;
  if (keepRecent7d === 0) return pipeline.auditedRecent7d > 0 ? 'ready' : 'pending';
  return pipeline.keepMaterializedRecent7d >= keepRecent7d ? 'ready' : 'pending';
}

function youtubeMaterializationDetail(
  activityStore: StoreReadiness,
  pipeline: OperationsReadiness['youtubePipeline']
): string {
  if (!activityStore.exists) return 'ActivityEvent migration is missing';
  const keepRecent7d = pipeline.verdictsRecent7d.keep;
  if (keepRecent7d === 0) return 'No recent keep verdicts require ActivityEvent materialization';
  return `${pipeline.keepMaterializedRecent7d}/${keepRecent7d} recent keep verdicts materialized (${pipeline.materializationCoveragePct}%)`;
}

function newsletterEnvStatus(
  env: OperationsReadiness['newsletterEnv'],
  newsletter: OperationsReadiness['newsletter']
): ReadinessStatus {
  if (env.readyToSend) return 'ready';
  if (env.sendConfigReady && !env.sendEnabled && newsletter.sent > 0) return 'ready';
  return 'pending';
}

function newsletterEnvDetail(
  env: OperationsReadiness['newsletterEnv'],
  newsletter: OperationsReadiness['newsletter']
) {
  if (env.readyToSend) return 'Resend sending env is ready';
  if (env.sendConfigReady && !env.sendEnabled && newsletter.sent > 0) {
    return 'Resend config is present; NEWSLETTER_SEND_ENABLED=false is a safety switch after sent observation';
  }

  const missing: string[] = [];
  if (env.provider !== 'resend') missing.push('NEWSLETTER_EMAIL_PROVIDER=resend');
  if (!env.hasApiKey) missing.push('RESEND_API_KEY');
  if (!env.hasFromEmail) missing.push('NEWSLETTER_FROM_EMAIL');
  if (!env.hasSiteUrl) missing.push('PRODUCTION_BASE_URL/NEXT_PUBLIC_SITE_URL/SITE_URL');
  if (!env.hasTokenSecret) missing.push('NEWSLETTER_TOKEN_SECRET/AUTH_SECRET/NEXTAUTH_SECRET');
  if (!env.sendEnabled) {
    missing.push(newsletter.sent > 0 ? 'NEWSLETTER_SEND_ENABLED=true for the next real send' : 'NEWSLETTER_SEND_ENABLED=true or a sent delivery observation');
  }
  return `Missing or disabled: ${missing.join(', ')}`;
}

function summarizeStatus(checks: ReadinessCheck[]): ReadinessStatus {
  if (checks.some(check => check.status === 'blocked')) return 'blocked';
  if (checks.some(check => check.status === 'pending')) return 'pending';
  return 'ready';
}

function emptyActivityStats(): OperationsReadiness['activity'] {
  return { total: 0, recent30d: 0, latestDetectedAt: null };
}

function emptyYouTubePipelineStats(): OperationsReadiness['youtubePipeline'] {
  return {
    rawTotal: 0,
    rawRecent24h: 0,
    rawRecent7d: 0,
    latestFetchedAt: null,
    attemptedPeople30d: 0,
    failedPeople30d: 0,
    latestAttemptedAt: null,
    latestError: null,
    auditedRecent7d: 0,
    auditCoveragePct: 100,
    latestAuditAt: null,
    verdictsRecent7d: {
      keep: 0,
      review: 0,
      reject: 0,
      duplicate: 0,
      skipped: 0,
      other: 0,
    },
    processedRecent7d: 0,
    activityTotal: 0,
    activityRecent7d: 0,
    keepMaterializedRecent7d: 0,
    materializationCoveragePct: 100,
    latestActivityAt: null,
    generatedCards7d: 0,
  };
}

function emptyYouTubeAuditStats(): Pick<OperationsReadiness['youtubePipeline'], 'auditedRecent7d' | 'latestAuditAt' | 'verdictsRecent7d' | 'keepMaterializedRecent7d'> {
  return {
    auditedRecent7d: 0,
    latestAuditAt: null,
    verdictsRecent7d: {
      keep: 0,
      review: 0,
      reject: 0,
      duplicate: 0,
      skipped: 0,
      other: 0,
    },
    keepMaterializedRecent7d: 0,
  };
}

function emptyYouTubeActivityStats(): Pick<OperationsReadiness['youtubePipeline'], 'activityTotal' | 'activityRecent7d' | 'latestActivityAt'> {
  return {
    activityTotal: 0,
    activityRecent7d: 0,
    latestActivityAt: null,
  };
}

function emptyNewsletterStats(): OperationsReadiness['newsletter'] {
  return { total: 0, dryRun: 0, sent: 0, failed: 0, latestCreatedAt: null };
}

function emptyInfluenceStats(): OperationsReadiness['influence'] {
  return { audits: 0, latestCreatedAt: null };
}

function emptyCompareReportStats(): OperationsReadiness['compareReport'] {
  return { total: 0, completed: 0, running: 0, pending: 0, failed: 0, latestCreatedAt: null };
}

function emptyCompanyEvidenceStats(): OperationsReadiness['companyEvidence'] {
  return { sources: 0, organizations: 0, threadLinks: 0, financialSignals: 0, boundaryIssues: 0, latestFetchedAt: null };
}

function toNumber(value: bigint | number | string | null | undefined): number {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function parseDateValue(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
