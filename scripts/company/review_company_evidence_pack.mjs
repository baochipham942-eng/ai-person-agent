/**
 * Review a company evidence seed or fetched evidence pack.
 *
 * Read-only. It checks source roles, duplicate URLs, fetch failures, thin text,
 * and original-file links for financial document roles.
 */
import fs from 'node:fs';
import path from 'node:path';

const IN = getArg('--in') || getArg('--input') || 'docs/company/anthropic-evidence-seed.json';
const OUT = getArg('--out');
const STRICT = process.argv.includes('--strict');

const ALLOWED_ROLES = new Set([
  'official_strategy',
  'product_release',
  'financial_signal',
  'partnership_signal',
  'hiring_team_signal',
  'technical_thread_link',
]);

const ROLES_REQUIRING_ORIGINAL_FILE = new Set([
  'financial_signal',
]);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function canonicalUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return String(value || '').trim();
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
}

function normalizeSources(payload) {
  if (Array.isArray(payload.sources)) {
    return payload.sources.map((source) => ({
      url: source.url,
      finalUrl: source.finalUrl,
      canonicalUrl: source.canonicalUrl || canonicalUrl(source.finalUrl || source.url),
      role: source.role,
      sourceKind: source.sourceKind,
      label: source.label,
      title: source.title,
      textLength: source.textLength ?? String(source.text || '').length,
      metadata: source.metadata || {},
      fetch: source.fetch || null,
    }));
  }
  if (Array.isArray(payload.candidates)) {
    return payload.candidates.map((candidate) => ({
      url: candidate.url,
      finalUrl: candidate.url,
      canonicalUrl: canonicalUrl(candidate.url),
      role: candidate.role,
      sourceKind: candidate.sourceKind,
      label: candidate.label,
      title: candidate.label || '',
      textLength: 0,
      metadata: {
        originalFileUrl: candidate.originalFileUrl || null,
        access: candidate.access || null,
        candidate,
      },
      fetch: null,
    }));
  }
  return [];
}

function groupByCanonicalUrl(sources) {
  const groups = new Map();
  for (const source of sources) {
    const key = source.canonicalUrl || canonicalUrl(source.finalUrl || source.url);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(source);
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([url, group]) => ({
      canonicalUrl: url,
      count: group.length,
      roles: [...new Set(group.map((source) => source.role).filter(Boolean))],
      labels: group.map((source) => source.label || source.title || source.url).filter(Boolean),
    }));
}

function hasOriginalFileLink(source) {
  const metadata = source.metadata || {};
  const sourceKind = String(source.sourceKind || metadata.candidate?.sourceKind || '').toLowerCase();
  if (!/(sec|10-k|10-q|20-f|s-1|annual|earnings|transcript|ir|investor_presentation)/i.test(sourceKind)) {
    return true;
  }
  if (metadata.originalFileUrl) return true;
  if (metadata.candidate?.originalFileUrl) return true;
  if (Array.isArray(metadata.documentLinks) && metadata.documentLinks.length > 0) return true;
  const url = source.finalUrl || source.url || '';
  return /\.pdf($|\?)/i.test(url)
    || /sec\.gov\/Archives\/edgar/i.test(url)
    || /sec\.gov\/ixviewer/i.test(url)
    || /sec\.gov\/ix\?doc=/i.test(url);
}

function roleCounts(sources) {
  return sources.reduce((acc, source) => {
    acc[source.role] = (acc[source.role] || 0) + 1;
    return acc;
  }, {});
}

function review(payload, sources) {
  const unknownRoles = sources
    .filter((source) => !ALLOWED_ROLES.has(source.role))
    .map((source) => ({
      url: source.url,
      role: source.role || null,
      label: source.label || source.title || null,
    }));

  const missingOriginalFileLinks = sources
    .filter((source) => ROLES_REQUIRING_ORIGINAL_FILE.has(source.role))
    .filter((source) => !hasOriginalFileLink(source))
    .map((source) => ({
      url: source.url,
      role: source.role,
      label: source.label || source.title || null,
      issue: 'Financial document role should keep an original filing/PDF/transcript link.',
    }));

  const fetchFailures = sources
    .filter((source) => source.fetch && !source.fetch.ok)
    .map((source) => ({
      url: source.url,
      role: source.role,
      status: source.fetch.status,
      error: source.fetch.error,
    }));

  const thinSources = sources
    .filter((source) => source.fetch?.ok && Number(source.textLength || 0) < 200)
    .map((source) => ({
      url: source.url,
      role: source.role,
      title: source.title || null,
      textLength: Number(source.textLength || 0),
    }));

  const duplicateUrls = groupByCanonicalUrl(sources);
  const pass = unknownRoles.length === 0
    && duplicateUrls.length === 0
    && missingOriginalFileLinks.length === 0
    && fetchFailures.length === 0;

  return {
    pipeline: 'company_evidence_review',
    generatedAt: new Date().toISOString(),
    company: payload.company || null,
    input: {
      path: path.resolve(IN),
      sourceCount: sources.length,
      payloadType: Array.isArray(payload.sources) ? 'fetched_pack' : 'seed',
    },
    review: {
      pass,
      sourceCountsByRole: roleCounts(sources),
      notAvailableRoles: payload.notAvailableRoles || [],
      unknownRoles,
      duplicateUrls,
      missingOriginalFileLinks,
      thinSources,
      fetchFailures,
    },
  };
}

function writeJson(payload) {
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  if (OUT) {
    fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
    fs.writeFileSync(OUT, text);
  } else {
    process.stdout.write(text);
  }
}

const payload = readJson(IN);
const sources = normalizeSources(payload);
const result = review(payload, sources);
writeJson(result);

if (STRICT && !result.review.pass) {
  process.exitCode = 1;
}
