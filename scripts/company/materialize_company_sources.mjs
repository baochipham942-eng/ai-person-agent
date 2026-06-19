#!/usr/bin/env node
/**
 * Build a reviewed staging artifact for future CompanySource rows.
 *
 * Default mode is read-only. Execute mode is guarded for local/dev databases
 * after the CompanySource migration is applied.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

neonConfig.webSocketConstructor = ws;

const DEFAULT_INPUT = 'docs/company/anthropic-evidence-seed.json';
const REQUIRED_SOURCE_ROLES = [
  'official_strategy',
  'product_release',
  'financial_signal',
  'partnership_signal',
  'hiring_team_signal',
];
const ALLOWED_SOURCE_ROLES = new Set([
  ...REQUIRED_SOURCE_ROLES,
  'technical_thread_link',
]);
const ALLOWED_READINESS_USES = new Set([
  'company_page_only',
  'company_strategy_context_only',
]);
const PROFILE_COMPLETENESS_COMPLETE = 'complete_profile';
const PROFILE_COMPLETENESS_INCREMENTAL = 'incremental_sources';
const FINANCIAL_KIND_RE = /(^|[\W_])(sec|10-k|10-q|20-f|s-1|annual|earnings|transcript|ir|investor|shareholder|financing)(?=$|[\W_])/i;

main()
  .catch(error => {
    console.error(error?.message || error);
    process.exitCode = 1;
  });

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const payload = readJson(options.input);
  const company = normalizeCompany(payload.company);
  const sources = normalizeSources(payload);
  const contexts = normalizeStrategyContexts(payload);
  const review = reviewCompanySources(payload, sources, contexts);
  const staging = buildStagingArtifact({ options, payload, company, sources, contexts, review });

  if (!options.execute) {
    writeJson(staging, options.output);
    if (options.strict && !review.pass) {
      process.exitCode = 1;
    }
    return;
  }

  const db = getDbInfo();
  assertWritableDb(db, options);
  if (!review.pass) {
    throw new Error(`Refusing to materialize a non-ready company source pack: ${JSON.stringify(review)}`);
  }

  const prisma = createPrismaClient();
  try {
    const materialized = await materializeCompanySources({
      prisma,
      company,
      sourceRows: staging.dryRunResult.companySources,
      threadLinks: staging.dryRunResult.companyThreadLinks,
      createOrganization: options.createOrganization,
    });
    writeJson({
      ...staging,
      dryRun: false,
      db,
      stagingBatch: {
        ...staging.stagingBatch,
        status: 'materialized_dev',
        writeEnabled: true,
        writeGuard: 'Executed only after production/remote guards passed. Production database writes remain refused.',
      },
      dryRunResult: {
        ...staging.dryRunResult,
        productionDbWrites: false,
        devDbWrites: true,
      },
      materialized,
    }, options.output);
  } finally {
    await prisma.$disconnect();
  }
}

function parseArgs(argv) {
  const options = {
    input: DEFAULT_INPUT,
    output: null,
    strict: false,
    execute: false,
    allowRemoteDev: false,
    createOrganization: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--strict') options.strict = true;
    else if (arg === '--execute') options.execute = true;
    else if (arg === '--allow-remote-dev') options.allowRemoteDev = true;
    else if (arg === '--create-organization') options.createOrganization = true;
    else if (arg.startsWith('--input=')) options.input = arg.slice('--input='.length);
    else if (arg.startsWith('--out=')) options.output = arg.slice('--out='.length);
    else if (arg.startsWith('--output=')) options.output = arg.slice('--output='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
}

function writeJson(payload, outputPath) {
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  if (!outputPath) {
    process.stdout.write(text);
    return;
  }
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(path.resolve(outputPath), text);
}

function normalizeCompany(company) {
  const source = isRecord(company) ? company : {};
  const name = asString(source.name);
  const slug = asString(source.slug) || slugify(name);
  return {
    id: slug ? `company:${slug}` : null,
    name: name || slug || null,
    slug: slug || null,
    aliases: Array.isArray(source.aliases) ? source.aliases.map(asString).filter(Boolean) : [],
    homepage: asString(source.homepage) || null,
    publicCompany: typeof source.publicCompany === 'boolean' ? source.publicCompany : null,
  };
}

function normalizeSources(payload) {
  if (Array.isArray(payload.sources)) {
    return payload.sources.map((source, index) => normalizeSource(source, candidateFromFetchedSource(source), index));
  }
  if (Array.isArray(payload.candidates)) {
    return payload.candidates.map((candidate, index) => normalizeSource(candidate, candidate, index));
  }
  return [];
}

function normalizeSource(source, candidate, index) {
  const metadata = isRecord(source.metadata) ? source.metadata : {};
  const url = asString(source.url) || asString(candidate.url);
  const finalUrl = asString(source.finalUrl) || url;
  const canonical = asString(source.canonicalUrl) || canonicalUrl(finalUrl || url);
  const title = asString(source.title) || asString(candidate.title) || asString(candidate.label);
  const label = asString(source.label) || asString(candidate.label) || title;
  const notes = asString(candidate.notes) || asString(source.notes) || asString(source.snippet);
  const fetch = isRecord(source.fetch) ? source.fetch : null;

  return {
    id: asString(candidate.id) || asString(source.sourceId) || asString(source.id) || `source_${index + 1}`,
    url,
    finalUrl,
    canonicalUrl: canonical,
    role: asString(source.role) || asString(candidate.role),
    sourceKind: asString(source.sourceKind) || asString(candidate.sourceKind),
    title,
    label,
    sourceLabel: asString(candidate.sourceLabel) || asString(source.sourceLabel) || label || null,
    access: asString(candidate.access) || asString(source.access) || asString(metadata.access) || null,
    publishedAt: asString(source.publishedAt) || asString(candidate.publishedAt) || asString(metadata.publishedAt) || null,
    originalFileUrl: asString(source.originalFileUrl) || asString(candidate.originalFileUrl) || asString(metadata.originalFileUrl) || null,
    readinessUse: asString(source.readinessUse) || asString(candidate.readinessUse) || asString(metadata.readinessUse) || null,
    excludedFromTopicReadiness: maybeBoolean(source.excludedFromTopicReadiness)
      ?? maybeBoolean(candidate.excludedFromTopicReadiness)
      ?? maybeBoolean(metadata.excludedFromTopicReadiness),
    companyPageOnly: maybeBoolean(source.companyPageOnly)
      ?? maybeBoolean(candidate.companyPageOnly)
      ?? maybeBoolean(metadata.companyPageOnly),
    notes: notes || null,
    text: asString(source.text) || notes || title,
    textLength: Number(source.textLength ?? String(source.text || '').length) || 0,
    snippet: asString(source.snippet) || null,
    fetch,
    documentLinks: Array.isArray(metadata.documentLinks) ? metadata.documentLinks : [],
    metadata,
  };
}

function candidateFromFetchedSource(source) {
  const metadata = isRecord(source.metadata) ? source.metadata : {};
  return isRecord(metadata.candidate) ? metadata.candidate : {};
}

function normalizeStrategyContexts(payload) {
  const rawContexts = Array.isArray(payload.companyStrategyContexts)
    ? payload.companyStrategyContexts
    : Array.isArray(payload.companyStrategyContext)
      ? payload.companyStrategyContext
      : [];

  return rawContexts.map((context, index) => ({
    id: asString(context.id) || `company_strategy_context_${index + 1}`,
    threadSlug: asString(context.threadSlug),
    threadTitle: asString(context.threadTitle),
    relationType: asString(context.relationType),
    summary: asString(context.summary),
    sourceIds: Array.isArray(context.sourceIds) ? context.sourceIds.map(asString).filter(Boolean) : [],
    excludedFromTopicReadiness: maybeBoolean(context.excludedFromTopicReadiness),
    readinessNote: asString(context.readinessNote),
    countsTowardTopicReadiness: maybeBoolean(context.countsTowardTopicReadiness),
  }));
}

function reviewCompanySources(payload, sources, contexts) {
  const roleCounts = countBy(sources, source => source.role || 'unknown');
  const profileCompleteness = readProfileCompleteness(payload);
  const allowMissingRequiredRoles = profileCompleteness === PROFILE_COMPLETENESS_INCREMENTAL;
  const duplicateSourceIds = duplicateGroups(sources, source => source.id).map(group => ({
    id: group.key,
    count: group.items.length,
  }));
  const duplicateUrls = duplicateGroups(sources, source => source.canonicalUrl).map(group => ({
    canonicalUrl: group.key,
    count: group.items.length,
    sourceIds: group.items.map(source => source.id),
  }));
  const missingRequiredRoles = REQUIRED_SOURCE_ROLES.filter(role => !roleCounts[role]);
  const sourceById = new Map(sources.map(source => [source.id, source]));
  const sourceIssues = [];
  const contextIssues = [];

  for (const source of sources) {
    const missing = [];
    if (!source.id) missing.push('id');
    if (!source.url) missing.push('url');
    if (!source.role) missing.push('role');
    if (!source.sourceKind) missing.push('sourceKind');
    if (!source.title) missing.push('title');
    if (missing.length > 0) sourceIssues.push(issue(source.id, 'missing_fields', { missing }));
    if (source.url && !/^https?:\/\//i.test(source.url)) sourceIssues.push(issue(source.id, 'url_must_be_http', { url: source.url }));
    if (!ALLOWED_SOURCE_ROLES.has(source.role)) sourceIssues.push(issue(source.id, 'unknown_role', { role: source.role }));
    if (source.excludedFromTopicReadiness !== true) {
      sourceIssues.push(issue(source.id, 'topic_readiness_boundary', {
        message: 'CompanySource candidates must set excludedFromTopicReadiness=true.',
      }));
    }
    if (!ALLOWED_READINESS_USES.has(source.readinessUse)) {
      sourceIssues.push(issue(source.id, 'invalid_readiness_use', { readinessUse: source.readinessUse }));
    }
    if (isFinancialOrIrKind(source) && source.readinessUse !== 'company_page_only') {
      sourceIssues.push(issue(source.id, 'financial_source_must_stay_company_page_only', { role: source.role, sourceKind: source.sourceKind }));
    }
    if (source.fetch && !source.fetch.ok) {
      sourceIssues.push(issue(source.id, 'fetch_failed', {
        status: source.fetch.status ?? null,
        error: source.fetch.error ?? null,
      }));
    }
  }

  if (contexts.length === 0 && !allowMissingRequiredRoles) {
    contextIssues.push({ issue: 'missing_company_strategy_context' });
  }

  for (const context of contexts) {
    const missing = [];
    if (!context.id) missing.push('id');
    if (!context.threadSlug) missing.push('threadSlug');
    if (!context.threadTitle) missing.push('threadTitle');
    if (!context.relationType) missing.push('relationType');
    if (!context.summary) missing.push('summary');
    if (context.sourceIds.length === 0) missing.push('sourceIds');
    if (!context.readinessNote) missing.push('readinessNote');
    if (missing.length > 0) contextIssues.push({ id: context.id || null, issue: 'missing_fields', missing });
    if (context.excludedFromTopicReadiness !== true || context.countsTowardTopicReadiness === true) {
      contextIssues.push({ id: context.id, issue: 'strategy_context_must_not_count_toward_topic_readiness' });
    }
    for (const sourceId of context.sourceIds) {
      const source = sourceById.get(sourceId);
      if (!source) {
        contextIssues.push({ id: context.id, issue: 'unknown_source_id', sourceId });
        continue;
      }
      if (isFinancialOrIrKind(source)) {
        contextIssues.push({
          id: context.id,
          issue: 'financial_source_must_not_back_thread_context',
          sourceId,
        });
      }
    }
  }

  const threadReadinessExportIssues = Array.isArray(payload.threadReadinessExports) && payload.threadReadinessExports.length > 0
    ? [{ issue: 'company_pack_must_not_export_thread_readiness_sources', count: payload.threadReadinessExports.length }]
    : [];
  const pass = (allowMissingRequiredRoles || missingRequiredRoles.length === 0)
    && duplicateSourceIds.length === 0
    && duplicateUrls.length === 0
    && sourceIssues.length === 0
    && contextIssues.length === 0
    && threadReadinessExportIssues.length === 0;

  return {
    pass,
    profileCompleteness,
    requiredRoles: REQUIRED_SOURCE_ROLES,
    sourceCountsByRole: roleCounts,
    missingRequiredRoles,
    requiredRoleGate: allowMissingRequiredRoles
      ? 'partial_allowed_for_incremental_sources'
      : 'complete_profile_required',
    duplicateSourceIds,
    duplicateUrls,
    sourceIssues,
    contextIssues,
    threadReadinessExportIssues,
    notAvailableRoles: payload.notAvailableRoles || [],
  };
}

function readProfileCompleteness(payload) {
  const value = asString(payload.profileCompleteness);
  if (value === PROFILE_COMPLETENESS_INCREMENTAL) return PROFILE_COMPLETENESS_INCREMENTAL;
  return PROFILE_COMPLETENESS_COMPLETE;
}

function buildStagingArtifact({ options, payload, company, sources, contexts, review }) {
  const inputPath = path.resolve(options.input);
  const sourceRows = sources.map(source => toCompanySourceRow(company, source));
  const rowIdBySourceId = new Map(sourceRows.map(row => [row.sourceId, row.id]));
  const threadLinks = contexts.map(context => toCompanyThreadLinkRow(company, context, rowIdBySourceId));
  const batchHash = hashString(JSON.stringify({
    company: company.slug,
    sourceIds: sourceRows.map(row => row.id).sort(),
    threadLinks: threadLinks.map(row => row.id).sort(),
  })).slice(0, 12);

  return {
    pipeline: 'company_sources_staging_materialize',
    dryRun: true,
    generatedAt: new Date().toISOString(),
    input: {
      path: inputPath,
      schemaVersion: payload.schemaVersion || null,
      contract: payload.contract || 'docs/company/company-source-contract.schema.json',
      payloadType: Array.isArray(payload.sources) ? 'fetched_pack' : 'seed',
    },
    company,
    review,
    stagingBatch: {
      id: `company-source-staging:${company.slug || 'unknown'}:${batchHash}`,
      status: review.pass ? 'ready_for_reviewed_staging' : 'blocked_by_review',
      writeEnabled: false,
      targetModels: [
        'CompanySource',
        'CompanyThreadLink',
      ],
      writeGuard: 'Dry-run output only. Use --execute only after applying the CompanySource migration to a local or explicitly confirmed dev database.',
    },
    dryRunResult: {
      productionDbWrites: false,
      rows: {
        companySources: sourceRows.length,
        companyThreadLinks: threadLinks.length,
      },
      companySources: sourceRows,
      companyThreadLinks: threadLinks,
      p0ViewModelPreview: buildP0ViewModelPreview(company, sourceRows, threadLinks),
    },
  };
}

function toCompanySourceRow(company, source) {
  const canonical = source.canonicalUrl || canonicalUrl(source.finalUrl || source.url);
  const urlHash = hashString(canonical);
  const rowId = `company-source:${company.slug}:${source.id}`;
  const companyPageOnly = source.companyPageOnly === true || source.readinessUse === 'company_page_only';

  return {
    id: rowId,
    sourceId: source.id,
    organizationSlug: company.slug,
    role: source.role,
    sourceKind: source.sourceKind,
    title: source.title,
    url: source.url,
    finalUrl: source.finalUrl || source.url,
    canonicalUrl: canonical,
    urlHash,
    text: source.text,
    summary: source.notes || source.snippet || `${source.title} (${source.role})`,
    publishedAt: source.publishedAt || null,
    fetchedAt: source.metadata.fetchedAt || source.fetch?.fetchedAt || null,
    confidence: defaultConfidence(source),
    readinessUse: source.readinessUse,
    excludedFromTopicReadiness: source.excludedFromTopicReadiness === true,
    companyPageOnly,
    metadata: {
      originalSourceId: source.id,
      label: source.label || null,
      sourceLabel: source.sourceLabel || company.name,
      access: source.access || null,
      originalFileUrl: source.originalFileUrl || null,
      textLength: source.textLength,
      fetch: source.fetch ? {
        ok: source.fetch.ok === true,
        status: source.fetch.status ?? null,
        error: source.fetch.error ?? null,
      } : null,
      dryRunContract: 'company-source-seed/v1',
    },
  };
}

function toCompanyThreadLinkRow(company, context, rowIdBySourceId) {
  const evidenceSourceIds = context.sourceIds.map(sourceId => rowIdBySourceId.get(sourceId) || sourceId);
  return {
    id: `company-thread-link:${company.slug}:${context.threadSlug}:${context.relationType}:${context.id}`,
    organizationSlug: company.slug,
    threadSlug: context.threadSlug,
    threadTitle: context.threadTitle,
    relationType: context.relationType,
    summary: context.summary,
    evidenceSourceIds,
    confidence: 0.8,
    excludedFromTopicReadiness: true,
    countsTowardTopicReadiness: false,
    metadata: {
      contextId: context.id,
      sourceIds: context.sourceIds,
      readinessNote: context.readinessNote,
    },
  };
}

function buildP0ViewModelPreview(company, sourceRows, threadLinks) {
  const evidenceRoles = new Set(REQUIRED_SOURCE_ROLES);
  return {
    positioning: company.name ? `${company.name} company evidence staging preview` : null,
    aiStrategySummary: threadLinks[0]?.summary || null,
    evidence: sourceRows
      .filter(row => evidenceRoles.has(row.role))
      .map(row => ({
        id: row.id,
        role: row.role,
        sourceType: row.sourceKind,
        title: row.title,
        url: row.url,
        summary: row.summary,
        publishedAt: row.publishedAt,
        sourceLabel: row.metadata.sourceLabel || company.name || 'Company source',
        confidence: row.confidence,
      })),
    relatedThreads: threadLinks.map(row => ({
      slug: row.threadSlug,
      title: row.threadTitle,
      relationType: row.relationType,
      summary: row.summary,
      evidenceSourceIds: row.evidenceSourceIds,
      excludedFromTopicReadiness: true,
    })),
    sourceMode: 'dry-run',
    sourceNote: 'Staging preview only. Company evidence remains company-page owned and excluded from technical thread readiness.',
  };
}

async function materializeCompanySources({ prisma, company, sourceRows, threadLinks, createOrganization }) {
  const organization = await resolveOrganization(prisma, company, createOrganization);
  const sourceIdByPreviewId = new Map();
  const result = {
    organization: {
      id: organization.id,
      name: organization.name,
      created: organization.created === true,
    },
    sourcesUpserted: 0,
    threadLinksUpserted: 0,
  };

  for (const row of sourceRows) {
    const persistedSource = await prisma.companySource.upsert({
      where: { urlHash: row.urlHash },
      update: {
        organizationId: organization.id,
        sourceKind: row.sourceKind,
        role: row.role,
        title: row.title,
        url: row.url,
        finalUrl: row.finalUrl,
        canonicalUrl: row.canonicalUrl,
        text: row.text,
        summary: row.summary,
        publishedAt: toDate(row.publishedAt),
        fetchedAt: toDate(row.fetchedAt) || new Date(),
        confidence: row.confidence,
        readinessUse: row.readinessUse,
        excludedFromTopicReadiness: row.excludedFromTopicReadiness,
        companyPageOnly: row.companyPageOnly,
        metadata: row.metadata,
      },
      create: {
        id: row.id,
        organizationId: organization.id,
        sourceKind: row.sourceKind,
        role: row.role,
        title: row.title,
        url: row.url,
        finalUrl: row.finalUrl,
        canonicalUrl: row.canonicalUrl,
        urlHash: row.urlHash,
        text: row.text,
        summary: row.summary,
        publishedAt: toDate(row.publishedAt),
        fetchedAt: toDate(row.fetchedAt) || new Date(),
        confidence: row.confidence,
        readinessUse: row.readinessUse,
        excludedFromTopicReadiness: row.excludedFromTopicReadiness,
        companyPageOnly: row.companyPageOnly,
        metadata: row.metadata,
      },
    });
    sourceIdByPreviewId.set(row.id, persistedSource.id);
    result.sourcesUpserted += 1;
  }

  for (const row of threadLinks) {
    const evidenceSourceIds = row.evidenceSourceIds.map(sourceId => sourceIdByPreviewId.get(sourceId) || sourceId);
    await prisma.companyThreadLink.upsert({
      where: {
        organizationId_threadSlug_relationType: {
          organizationId: organization.id,
          threadSlug: row.threadSlug,
          relationType: row.relationType,
        },
      },
      update: {
        threadTitle: row.threadTitle,
        summary: row.summary,
        evidenceSourceIds,
        confidence: row.confidence,
        excludedFromTopicReadiness: row.excludedFromTopicReadiness,
        countsTowardTopicReadiness: row.countsTowardTopicReadiness,
        metadata: row.metadata,
      },
      create: {
        id: row.id,
        organizationId: organization.id,
        threadSlug: row.threadSlug,
        threadTitle: row.threadTitle,
        relationType: row.relationType,
        summary: row.summary,
        evidenceSourceIds,
        confidence: row.confidence,
        excludedFromTopicReadiness: row.excludedFromTopicReadiness,
        countsTowardTopicReadiness: row.countsTowardTopicReadiness,
        metadata: row.metadata,
      },
    });
    result.threadLinksUpserted += 1;
  }

  return result;
}

async function resolveOrganization(prisma, company, createOrganization) {
  const names = unique([company.name, company.slug, ...company.aliases].filter(Boolean));
  const existing = names.length > 0
    ? await prisma.organization.findFirst({
      where: {
        OR: [
          { name: { in: names } },
          { nameZh: { in: names } },
        ],
      },
      orderBy: { name: 'asc' },
    })
    : null;

  if (existing) return { ...existing, created: false };
  if (!createOrganization) {
    throw new Error(`No Organization row matched ${names.join(', ')}. Re-run with --create-organization only for a confirmed dev/staging database.`);
  }

  const created = await prisma.organization.create({
    data: {
      name: company.name || company.slug,
      type: 'company',
      description: company.homepage ? `Company source seed: ${company.homepage}` : null,
    },
  });
  return { ...created, created: true };
}

function createPrismaClient() {
  if (getDbInfo().local) return new PrismaClient();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter: new PrismaNeon(pool) });
}

function getDbInfo() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return { configured: false, host: null, database: null, local: false };
  try {
    const url = new URL(connectionString);
    return {
      configured: true,
      host: url.hostname,
      database: url.pathname.replace(/^\//, '') || null,
      local: ['localhost', '127.0.0.1', '::1'].includes(url.hostname),
    };
  } catch {
    return { configured: true, host: 'unparseable', database: null, local: false };
  }
}

function assertWritableDb(db, options) {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    throw new Error('Refusing to materialize company sources while NODE_ENV=production or VERCEL is set.');
  }
  if (!db.configured) throw new Error('DATABASE_URL is not configured.');
  if (!db.local && !options.allowRemoteDev) {
    throw new Error(`Refusing to write to remote database host "${db.host}". Re-run with --allow-remote-dev only after confirming this is a dev/staging database.`);
  }
}

function defaultConfidence(source) {
  if (source.fetch && source.fetch.ok === false) return 0.4;
  if (source.role === 'official_strategy' || source.role === 'product_release') return 0.82;
  if (source.role === 'financial_signal' || source.role === 'partnership_signal') return 0.78;
  return 0.72;
}

function isFinancialOrIrKind(source) {
  return source.role === 'financial_signal' || FINANCIAL_KIND_RE.test(`${source.sourceKind} ${source.url}`);
}

function canonicalUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) {
      url.port = '';
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    return String(value || '').trim();
  }
}

function hashString(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function maybeBoolean(value) {
  return typeof value === 'boolean' ? value : null;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function duplicateGroups(items, keyFn) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({ key, items: group }));
}

function issue(sourceId, type, details = {}) {
  return {
    sourceId: sourceId || null,
    issue: type,
    ...details,
  };
}

function printHelp() {
  console.log(`
Usage:
  node scripts/company/materialize_company_sources.mjs --input=docs/company/anthropic-evidence-seed.json --strict
  node scripts/company/materialize_company_sources.mjs --input=/tmp/fetched-company-pack.json --output=/tmp/company-staging.json
  node scripts/company/materialize_company_sources.mjs --execute --create-organization --input=docs/company/anthropic-evidence-seed.json

Default mode is read-only dry-run. Execute mode refuses production and remote databases unless --allow-remote-dev is passed.
`);
}
