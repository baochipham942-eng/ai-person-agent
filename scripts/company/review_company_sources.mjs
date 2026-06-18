#!/usr/bin/env node
/**
 * Review CompanySource dry-run inputs and fetched packs.
 *
 * Read-only. It does not import Prisma and never writes a database.
 */
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_INPUT = 'docs/company/anthropic-evidence-seed.json';
const IN = getArg('--in') || getArg('--input') || DEFAULT_INPUT;
const OUT = getArg('--out');
const STRICT = process.argv.includes('--strict');

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

const P0_EVIDENCE_ROLES = new Set(REQUIRED_SOURCE_ROLES);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
}

function writeJson(payload) {
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  if (OUT) {
    fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
    fs.writeFileSync(path.resolve(OUT), text);
  } else {
    process.stdout.write(text);
  }
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

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function maybeBoolean(value) {
  return typeof value === 'boolean' ? value : null;
}

function candidateFromFetchedSource(source) {
  const metadata = isRecord(source.metadata) ? source.metadata : {};
  return isRecord(metadata.candidate) ? metadata.candidate : {};
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
  const title = asString(source.title) || asString(candidate.title) || asString(candidate.label);
  const sourceKind = asString(source.sourceKind) || asString(candidate.sourceKind);
  const role = asString(source.role) || asString(candidate.role);
  const originalFileUrl = asString(source.originalFileUrl)
    || asString(candidate.originalFileUrl)
    || asString(metadata.originalFileUrl);

  return {
    id: asString(candidate.id) || asString(source.sourceId) || asString(source.id) || `source_${index + 1}`,
    url,
    finalUrl,
    canonicalUrl: asString(source.canonicalUrl) || canonicalUrl(finalUrl || url),
    role,
    sourceKind,
    title,
    label: asString(source.label) || asString(candidate.label) || title,
    sourceLabel: asString(candidate.sourceLabel) || asString(source.sourceLabel) || asString(source.label) || asString(candidate.label) || null,
    access: asString(candidate.access) || asString(source.access) || asString(metadata.access) || null,
    publishedAt: asString(source.publishedAt) || asString(candidate.publishedAt) || asString(metadata.publishedAt) || null,
    originalFileUrl: originalFileUrl || null,
    readinessUse: asString(source.readinessUse) || asString(candidate.readinessUse) || asString(metadata.readinessUse) || null,
    excludedFromTopicReadiness: maybeBoolean(source.excludedFromTopicReadiness)
      ?? maybeBoolean(candidate.excludedFromTopicReadiness)
      ?? maybeBoolean(metadata.excludedFromTopicReadiness),
    companyPageOnly: maybeBoolean(source.companyPageOnly)
      ?? maybeBoolean(candidate.companyPageOnly)
      ?? maybeBoolean(metadata.companyPageOnly),
    notes: asString(candidate.notes) || asString(source.notes) || null,
    textLength: Number(source.textLength ?? String(source.text || '').length) || 0,
    fetch: isRecord(source.fetch) ? source.fetch : null,
    documentLinks: Array.isArray(metadata.documentLinks) ? metadata.documentLinks : [],
  };
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

function groupDuplicates(items, keyFn) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({ key, count: group.length, items: group }));
}

function sourceCountsByRole(sources) {
  return sources.reduce((acc, source) => {
    acc[source.role] = (acc[source.role] || 0) + 1;
    return acc;
  }, {});
}

function isFinancialOrIrKind(source) {
  const text = `${source.role} ${source.sourceKind} ${source.url}`.toLowerCase();
  return source.role === 'financial_signal'
    || /(sec|10-k|10-q|20-f|s-1|annual|earnings|transcript|ir|investor|shareholder|financing)/i.test(text);
}

function isDocumentLikeFinancialKind(source) {
  const text = `${source.sourceKind} ${source.url}`.toLowerCase();
  return /(sec|10-k|10-q|20-f|s-1|annual|earnings|transcript|ir|investor_presentation|shareholder_letter|pdf)/i.test(text);
}

function hasOriginalFileLink(source) {
  if (source.originalFileUrl) return true;
  if (Array.isArray(source.documentLinks) && source.documentLinks.length > 0) return true;
  const url = source.finalUrl || source.url || '';
  return /\.pdf($|\?)/i.test(url)
    || /sec\.gov\/Archives\/edgar/i.test(url)
    || /sec\.gov\/ixviewer/i.test(url)
    || /sec\.gov\/ix\?doc=/i.test(url);
}

function validateSources(sources) {
  const missingRequiredFields = [];
  const unknownRoles = [];
  const readinessBoundaryIssues = [];
  const financialPlacementIssues = [];
  const fetchFailures = [];
  const thinFetchedSources = [];

  for (const source of sources) {
    const missing = [];
    if (!source.id) missing.push('id');
    if (!source.url) missing.push('url');
    if (!source.role) missing.push('role');
    if (!source.sourceKind) missing.push('sourceKind');
    if (!source.title) missing.push('title');
    if (missing.length > 0) {
      missingRequiredFields.push({
        id: source.id || null,
        url: source.url || null,
        missing,
      });
    }

    if (source.url && !/^https?:\/\//i.test(source.url)) {
      missingRequiredFields.push({
        id: source.id,
        url: source.url,
        missing: ['http(s) url'],
      });
    }

    if (!ALLOWED_SOURCE_ROLES.has(source.role)) {
      unknownRoles.push({
        id: source.id,
        url: source.url,
        role: source.role || null,
      });
    }

    if (source.excludedFromTopicReadiness !== true) {
      readinessBoundaryIssues.push({
        id: source.id,
        role: source.role,
        issue: 'CompanySource candidates must set excludedFromTopicReadiness=true.',
      });
    }

    if (!ALLOWED_READINESS_USES.has(source.readinessUse)) {
      readinessBoundaryIssues.push({
        id: source.id,
        role: source.role,
        readinessUse: source.readinessUse,
        issue: 'readinessUse must be company_page_only or company_strategy_context_only.',
      });
    }

    if (isFinancialOrIrKind(source)) {
      if (source.readinessUse !== 'company_page_only') {
        financialPlacementIssues.push({
          id: source.id,
          role: source.role,
          sourceKind: source.sourceKind,
          issue: 'Financial or IR sources must stay company_page_only.',
        });
      }
      if (source.companyPageOnly !== true) {
        financialPlacementIssues.push({
          id: source.id,
          role: source.role,
          sourceKind: source.sourceKind,
          issue: 'Financial or IR sources must mark companyPageOnly=true.',
        });
      }
      if (isDocumentLikeFinancialKind(source) && !hasOriginalFileLink(source)) {
        financialPlacementIssues.push({
          id: source.id,
          role: source.role,
          sourceKind: source.sourceKind,
          issue: 'Financial document sources should preserve an original filing, PDF, transcript, or IR link.',
        });
      }
    }

    if (source.fetch && !source.fetch.ok) {
      fetchFailures.push({
        id: source.id,
        url: source.url,
        role: source.role,
        status: source.fetch.status ?? null,
        error: source.fetch.error ?? null,
      });
    }

    if (source.fetch?.ok && source.textLength < 200) {
      thinFetchedSources.push({
        id: source.id,
        url: source.url,
        role: source.role,
        textLength: source.textLength,
      });
    }
  }

  return {
    missingRequiredFields,
    unknownRoles,
    readinessBoundaryIssues,
    financialPlacementIssues,
    fetchFailures,
    thinFetchedSources,
  };
}

function validateStrategyContexts(contexts, sources) {
  const sourceById = new Map(sources.map(source => [source.id, source]));
  const missingStrategyContexts = contexts.length === 0
    ? [{ issue: 'At least one company_strategy_context is required for this P1 dry-run pack.' }]
    : [];
  const strategyContextIssues = [];
  const unknownSourceIds = [];
  const financialContextSourceIssues = [];

  for (const context of contexts) {
    const missing = [];
    if (!context.id) missing.push('id');
    if (!context.threadSlug) missing.push('threadSlug');
    if (!context.threadTitle) missing.push('threadTitle');
    if (!context.relationType) missing.push('relationType');
    if (!context.summary) missing.push('summary');
    if (!context.readinessNote) missing.push('readinessNote');
    if (context.sourceIds.length === 0) missing.push('sourceIds');
    if (missing.length > 0) {
      strategyContextIssues.push({
        id: context.id || null,
        threadSlug: context.threadSlug || null,
        missing,
      });
    }

    if (context.excludedFromTopicReadiness !== true || context.countsTowardTopicReadiness === true) {
      strategyContextIssues.push({
        id: context.id,
        threadSlug: context.threadSlug,
        issue: 'company_strategy_context must be excluded from topic readiness.',
      });
    }

    for (const sourceId of context.sourceIds) {
      const source = sourceById.get(sourceId);
      if (!source) {
        unknownSourceIds.push({
          contextId: context.id,
          threadSlug: context.threadSlug,
          sourceId,
        });
        continue;
      }
      if (isFinancialOrIrKind(source)) {
        financialContextSourceIssues.push({
          contextId: context.id,
          threadSlug: context.threadSlug,
          sourceId,
          role: source.role,
          sourceKind: source.sourceKind,
          issue: 'Financial or IR CompanySource records stay on the company page and must not be referenced by thread context.',
        });
      }
    }
  }

  return {
    missingStrategyContexts,
    strategyContextIssues,
    unknownSourceIds,
    financialContextSourceIssues,
  };
}

function buildP0ViewModelPreview(payload, sources, contexts) {
  const companyName = payload.company?.name || null;
  const evidence = sources
    .filter(source => P0_EVIDENCE_ROLES.has(source.role))
    .map(source => ({
      id: source.id,
      role: source.role,
      sourceType: source.sourceKind,
      title: source.title,
      url: source.url,
      summary: source.notes || `${source.title} (${source.role})`,
      publishedAt: source.publishedAt,
      sourceLabel: source.sourceLabel || source.label || companyName || 'Company source',
      confidence: 0.8,
    }));

  const relatedThreads = contexts.map(context => ({
    slug: context.threadSlug,
    title: context.threadTitle,
    relationType: context.relationType,
    summary: context.summary,
    evidenceSourceIds: context.sourceIds,
    excludedFromTopicReadiness: true,
  }));

  return {
    positioning: companyName ? `${companyName} company evidence dry-run` : null,
    aiStrategySummary: contexts[0]?.summary || null,
    evidence,
    relatedThreads,
    sourceMode: 'dry-run',
    sourceNote: 'Dry-run preview only. Future app wiring should hydrate CompanyPageIntelligence from reviewed CompanySource records, not from production RawPoolItem.',
  };
}

function review(payload, sources, contexts) {
  const sourceIds = groupDuplicates(sources, source => source.id);
  const duplicateSourceIds = sourceIds.map(group => ({
    id: group.key,
    count: group.count,
    urls: group.items.map(source => source.url),
  }));
  const duplicateUrls = groupDuplicates(sources, source => source.canonicalUrl).map(group => ({
    canonicalUrl: group.key,
    count: group.count,
    sourceIds: group.items.map(source => source.id),
    roles: [...new Set(group.items.map(source => source.role).filter(Boolean))],
  }));
  const counts = sourceCountsByRole(sources);
  const missingRequiredRoles = REQUIRED_SOURCE_ROLES.filter(role => !counts[role]);
  const sourceIssues = validateSources(sources);
  const contextIssues = validateStrategyContexts(contexts, sources);
  const threadReadinessExportIssues = Array.isArray(payload.threadReadinessExports) && payload.threadReadinessExports.length > 0
    ? [{
      count: payload.threadReadinessExports.length,
      issue: 'Company dry-run packs must not export technical thread readiness sources.',
    }]
    : [];

  const issueGroups = [
    missingRequiredRoles,
    duplicateSourceIds,
    duplicateUrls,
    sourceIssues.missingRequiredFields,
    sourceIssues.unknownRoles,
    sourceIssues.readinessBoundaryIssues,
    sourceIssues.financialPlacementIssues,
    sourceIssues.fetchFailures,
    contextIssues.missingStrategyContexts,
    contextIssues.strategyContextIssues,
    contextIssues.unknownSourceIds,
    contextIssues.financialContextSourceIssues,
    threadReadinessExportIssues,
  ];
  const pass = issueGroups.every(group => group.length === 0);

  return {
    pipeline: 'company_sources_review',
    dryRun: true,
    generatedAt: new Date().toISOString(),
    company: payload.company || null,
    input: {
      path: path.resolve(IN),
      payloadType: Array.isArray(payload.sources) ? 'fetched_pack' : 'seed',
      schemaVersion: payload.schemaVersion || null,
      contract: payload.contract || 'docs/company/company-source-contract.schema.json',
    },
    review: {
      pass,
      requiredRoles: REQUIRED_SOURCE_ROLES,
      sourceCountsByRole: counts,
      missingRequiredRoles,
      duplicateSourceIds,
      duplicateUrls,
      notAvailableRoles: payload.notAvailableRoles || [],
      threadReadinessExportIssues,
      ...sourceIssues,
      ...contextIssues,
      warnings: {
        thinFetchedSources: sourceIssues.thinFetchedSources,
      },
    },
    dryRunResult: {
      productionDbWrites: false,
      companySources: sources.map(source => ({
        id: source.id,
        role: source.role,
        sourceKind: source.sourceKind,
        title: source.title,
        url: source.url,
        canonicalUrl: source.canonicalUrl,
        publishedAt: source.publishedAt,
        readinessUse: source.readinessUse,
        excludedFromTopicReadiness: source.excludedFromTopicReadiness,
        companyPageOnly: source.companyPageOnly === true,
      })),
      companyStrategyContexts: contexts,
      p0ViewModelPreview: buildP0ViewModelPreview(payload, sources, contexts),
    },
  };
}

const payload = readJson(IN);
const sources = normalizeSources(payload);
const contexts = normalizeStrategyContexts(payload);
const result = review(payload, sources, contexts);
writeJson(result);

if (STRICT && !result.review.pass) {
  process.exitCode = 1;
}
