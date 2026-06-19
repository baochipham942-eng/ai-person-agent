#!/usr/bin/env node
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

process.env.WS_NO_BUFFER_UTIL ??= '1';
neonConfig.webSocketConstructor = ws;

const prisma = createPrismaClient();

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

async function main() {
  const [activityStore, newsletterStore, influenceStore, compareReportStore, companySourceStore] = await Promise.all([
    checkActivityStore(),
    checkNewsletterStore(),
    checkTable('InfluenceScoreAuditLog'),
    checkCompareReportStore(),
    checkCompanySourceStore(),
  ]);

  const [activity, newsletter, influence, compareReport, companyEvidence] = await Promise.all([
    activityStore.exists && activityStore.reviewStatusColumn ? fetchActivityStats() : emptyActivityStats(),
    newsletterStore.exists && newsletterStore.providerColumns ? fetchNewsletterStats() : emptyNewsletterStats(),
    influenceStore.exists ? fetchInfluenceStats() : emptyInfluenceStats(),
    compareReportStore.exists && compareReportStore.eventTable && compareReportStore.eventMetadataColumn ? fetchCompareReportStats() : emptyCompareReportStats(),
    companySourceStore.exists && companySourceStore.threadLinkTable && companySourceStore.evidenceSourceIdsColumn
      ? fetchCompanyEvidenceStats()
      : emptyCompanyEvidenceStats(),
  ]);
  const newsletterEnv = buildNewsletterEnv();
  const checks = buildChecks({
    activityStore,
    newsletterStore,
    influenceStore,
    compareReportStore,
    companySourceStore,
    activity,
    newsletter,
    influence,
    compareReport,
    companyEvidence,
    newsletterEnv,
  });
  const readiness = {
    generatedAt: new Date().toISOString(),
    overallStatus: summarizeStatus(checks),
    schema: {
      activityEvent: activityStore,
      newsletterDeliveryLog: newsletterStore,
      influenceScoreAuditLog: influenceStore,
      compareReport: compareReportStore,
      companySource: companySourceStore,
    },
    newsletterEnv,
    activity,
    newsletter,
    influence,
    compareReport,
    companyEvidence,
    checks,
  };

  console.log(JSON.stringify(readiness, null, 2));
}

async function checkTable(tableName) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public."${tableName}"') IS NOT NULL AS "exists"`,
  );
  const exists = Boolean(rows[0]?.exists);
  return {
    exists,
    status: exists ? 'ready' : 'blocked',
    detail: exists ? `${tableName} exists` : `${tableName} migration is not applied`,
  };
}

async function checkActivityStore() {
  const rows = await prisma.$queryRaw`
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

async function checkNewsletterStore() {
  const rows = await prisma.$queryRaw`
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

async function checkCompareReportStore() {
  const rows = await prisma.$queryRaw`
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

async function checkCompanySourceStore() {
  const rows = await prisma.$queryRaw`
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
  const rows = await prisma.$queryRaw`
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

async function fetchNewsletterStats() {
  const rows = await prisma.$queryRaw`
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
  const rows = await prisma.$queryRaw`
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
  const rows = await prisma.$queryRaw`
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

async function fetchCompanyEvidenceStats() {
  const [sourceRows, linkRows] = await Promise.all([
    prisma.$queryRaw`
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
    prisma.$queryRaw`
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

function buildNewsletterEnv() {
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

function buildChecks(params) {
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
        ? 'Apply CompareReport migration before generating PK reports'
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

function companyEvidenceStatus(store, evidence) {
  if (store.status === 'blocked') return 'blocked';
  if (evidence.boundaryIssues > 0) return 'blocked';
  if (evidence.sources > 0) return 'ready';
  return 'pending';
}

function companyEvidenceDetail(store, evidence) {
  if (store.status === 'blocked') return 'Apply CompanySource migration before materializing company evidence';
  if (evidence.boundaryIssues > 0) return `${evidence.boundaryIssues} CompanySource rows violate topic-readiness boundaries`;
  if (evidence.sources > 0) {
    return `${evidence.sources} company sources across ${evidence.organizations} organizations; ${evidence.threadLinks} optional thread links`;
  }
  return 'No CompanySource rows materialized yet';
}

function newsletterEnvStatus(env, newsletter) {
  if (env.readyToSend) return 'ready';
  if (env.sendConfigReady && !env.sendEnabled && newsletter.sent > 0) return 'ready';
  return 'pending';
}

function newsletterEnvDetail(env, newsletter) {
  if (env.readyToSend) return 'Resend sending env is ready';
  if (env.sendConfigReady && !env.sendEnabled && newsletter.sent > 0) {
    return 'Resend config is present; NEWSLETTER_SEND_ENABLED=false is a safety switch after sent observation';
  }

  const missing = [];
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

function summarizeStatus(checks) {
  if (checks.some(check => check.status === 'blocked')) return 'blocked';
  if (checks.some(check => check.status === 'pending')) return 'pending';
  return 'ready';
}

function emptyActivityStats() {
  return { total: 0, recent30d: 0, latestDetectedAt: null };
}

function emptyNewsletterStats() {
  return { total: 0, dryRun: 0, sent: 0, failed: 0, latestCreatedAt: null };
}

function emptyInfluenceStats() {
  return { audits: 0, latestCreatedAt: null };
}

function emptyCompareReportStats() {
  return { total: 0, completed: 0, running: 0, pending: 0, failed: 0, latestCreatedAt: null };
}

function emptyCompanyEvidenceStats() {
  return { sources: 0, organizations: 0, threadLinks: 0, financialSignals: 0, boundaryIssues: 0, latestFetchedAt: null };
}

function toNumber(value) {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || isLocalPostgres(connectionString)) return new PrismaClient();
  const pool = new Pool({ connectionString });
  return new PrismaClient({ adapter: new PrismaNeon(pool) });
}

function isLocalPostgres(connectionString) {
  try {
    const hostname = new URL(connectionString).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}
