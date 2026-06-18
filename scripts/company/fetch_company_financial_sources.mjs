/**
 * Dry-run fetcher for company/institution evidence packs.
 *
 * It reads candidate URLs, fetches public pages, extracts title/text/snippet,
 * and emits JSON. It never writes the database.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_INPUT = 'docs/company/anthropic-evidence-seed.json';
const INPUT = getArg('--input') || DEFAULT_INPUT;
const OUT = getArg('--out');
const LIMIT = numberArg('--limit', 0);
const TIMEOUT_MS = numberArg('--timeout-ms', 15000);
const MAX_TEXT_CHARS = numberArg('--max-text-chars', 12000);
const INCLUDE_TEXT = !process.argv.includes('--no-text');

const ALLOWED_ROLES = new Set([
  'official_strategy',
  'product_release',
  'financial_signal',
  'partnership_signal',
  'hiring_team_signal',
  'technical_thread_link',
]);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function numberArg(name, fallback) {
  const raw = getArg(name);
  if (raw === '0') return 0;
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function compactText(value, max = MAX_TEXT_CHARS) {
  const text = normalizeWhitespace(value);
  return text.length <= max ? text : `${text.slice(0, max - 1)}...`;
}

function snippetFor(value, max = 360) {
  return compactText(value, max);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
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

function hostOf(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function readSeed(filePath) {
  const absolutePath = path.resolve(filePath);
  const payload = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  return {
    ...payload,
    inputPath: absolutePath,
    candidates: candidates.filter((candidate) => candidate && typeof candidate.url === 'string'),
  };
}

function validateCandidate(candidate) {
  const issues = [];
  if (!/^https?:\/\//i.test(candidate.url || '')) issues.push('url must be http(s)');
  if (!ALLOWED_ROLES.has(candidate.role)) issues.push(`unknown role: ${candidate.role || '(missing)'}`);
  if (!candidate.sourceKind) issues.push('sourceKind is required');
  return issues;
}

function absoluteUrl(baseUrl, href) {
  if (!href) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function stripTags(value) {
  return decodeHtmlEntities(String(value || '').replace(/<[^>]+>/g, ' '));
}

function getAttr(tag, attrName) {
  const pattern = new RegExp(`\\s${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = tag.match(pattern);
  return match?.[1] || match?.[2] || match?.[3] || '';
}

function firstTagText(html, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  return normalizeWhitespace(stripTags(html.match(pattern)?.[1] || ''));
}

function metaContent(html, keys) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metaTags) {
    const name = getAttr(tag, 'name').toLowerCase();
    const property = getAttr(tag, 'property').toLowerCase();
    if (keys.includes(name) || keys.includes(property)) {
      return normalizeWhitespace(decodeHtmlEntities(getAttr(tag, 'content')));
    }
  }
  return '';
}

function firstTimeDatetime(html) {
  const timeTags = html.match(/<time\b[^>]*>/gi) || [];
  for (const tag of timeTags) {
    const value = getAttr(tag, 'datetime');
    if (value) return normalizeWhitespace(value);
  }
  return '';
}

function extractDocumentLinks(html, baseUrl) {
  const links = [];
  const anchorPattern = /<a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorPattern.exec(html))) {
    const href = match[1] || match[2] || match[3] || '';
    const url = absoluteUrl(baseUrl, href);
    if (!url) continue;
    const label = normalizeWhitespace(stripTags(match[4])).slice(0, 160);
    const lower = url.toLowerCase();
    const looksLikeDocument = lower.endsWith('.pdf')
      || lower.includes('/archives/edgar/')
      || lower.includes('sec.gov/ixviewer/')
      || lower.includes('sec.gov/ix?doc=')
      || lower.includes('annual-report')
      || lower.includes('earnings')
      || lower.includes('transcript');
    if (looksLikeDocument) {
      links.push({ url, label });
    }
  }
  return [...new Map(links.map((link) => [canonicalUrl(link.url), link])).values()].slice(0, 20);
}

function extractHtml(html, pageUrl) {
  const title = normalizeWhitespace(
    metaContent(html, ['og:title', 'twitter:title'])
    || firstTagText(html, 'title')
    || firstTagText(html, 'h1'),
  );
  const description = normalizeWhitespace(
    metaContent(html, ['description', 'og:description', 'twitter:description']),
  );
  const publishedAt = normalizeWhitespace(
    metaContent(html, ['article:published_time'])
    || firstTimeDatetime(html),
  );
  const documentLinks = extractDocumentLinks(html, pageUrl);

  const readableHtml = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header\b[\s\S]*?<\/header>/gi, ' ')
    .replace(/<form\b[\s\S]*?<\/form>/gi, ' ');
  const chunks = [];
  const textPattern = /<(h1|h2|h3|p|li|td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = textPattern.exec(readableHtml))) {
    const text = normalizeWhitespace(stripTags(match[2]));
    if (text) chunks.push(text);
  }
  const text = [...new Set(chunks)].join('\n');

  return {
    title,
    description,
    publishedAt: publishedAt || null,
    documentLinks,
    text: [description, text].filter(Boolean).join('\n\n'),
  };
}

function titleFromUrl(value) {
  try {
    const url = new URL(value);
    const last = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || url.hostname);
    return last.replace(/[-_]+/g, ' ').trim() || url.hostname;
  } catch {
    return value;
  }
}

async function fetchCandidate(candidate, index) {
  const validationIssues = validateCandidate(candidate);
  const startedAt = new Date().toISOString();
  const base = {
    id: sha256(canonicalUrl(candidate.url)),
    url: candidate.url,
    finalUrl: candidate.url,
    canonicalUrl: canonicalUrl(candidate.url),
    role: candidate.role,
    sourceKind: candidate.sourceKind || null,
    label: candidate.label || null,
    title: '',
    snippet: '',
    textLength: 0,
    metadata: {
      index,
      host: hostOf(candidate.url),
      fetchedAt: startedAt,
      candidate,
      access: candidate.access || 'free_web',
      publishedAt: candidate.publishedAt || null,
      originalFileUrl: candidate.originalFileUrl || null,
      validationIssues,
      documentLinks: [],
    },
    fetch: {
      ok: false,
      status: null,
      error: null,
    },
  };

  if (validationIssues.length) {
    return {
      ...base,
      fetch: {
        ok: false,
        status: null,
        error: validationIssues.join('; '),
      },
      ...(INCLUDE_TEXT ? { text: '' } : {}),
    };
  }

  try {
    const response = await fetch(candidate.url, {
      headers: {
        'User-Agent': 'AI-Person-Agent/0.4 company-evidence-dry-run linchen@example.invalid',
        Accept: 'text/html,application/xhtml+xml,text/plain,application/json,application/pdf;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const contentType = response.headers.get('content-type') || '';
    const finalUrl = response.url || candidate.url;
    const metadata = {
      ...base.metadata,
      host: hostOf(finalUrl),
      status: response.status,
      statusText: response.statusText,
      contentType,
      finalUrl,
    };

    if (!response.ok) {
      return {
        ...base,
        finalUrl,
        canonicalUrl: canonicalUrl(finalUrl),
        metadata,
        title: candidate.label || titleFromUrl(finalUrl),
        fetch: {
          ok: false,
          status: response.status,
          error: `HTTP ${response.status} ${response.statusText}`,
        },
        ...(INCLUDE_TEXT ? { text: '' } : {}),
      };
    }

    if (/application\/pdf/i.test(contentType)) {
      return {
        ...base,
        finalUrl,
        canonicalUrl: canonicalUrl(finalUrl),
        title: candidate.label || titleFromUrl(finalUrl),
        snippet: 'Binary PDF fetched; text extraction is intentionally not attempted in this dry-run fetcher.',
        textLength: 0,
        metadata: {
          ...metadata,
          binaryLike: true,
          originalFileUrl: candidate.originalFileUrl || finalUrl,
        },
        fetch: {
          ok: true,
          status: response.status,
          error: null,
        },
        ...(INCLUDE_TEXT ? { text: '' } : {}),
      };
    }

    const body = await response.text();
    const parsed = /html|xml/i.test(contentType) || /<html|<!doctype/i.test(body.slice(0, 200))
      ? extractHtml(body, finalUrl)
      : {
        title: candidate.label || titleFromUrl(finalUrl),
        description: '',
        publishedAt: null,
        documentLinks: [],
        text: body,
      };
    const text = compactText(parsed.text || '');

    return {
      ...base,
      finalUrl,
      canonicalUrl: canonicalUrl(finalUrl),
      title: parsed.title || candidate.label || titleFromUrl(finalUrl),
      snippet: snippetFor(text || parsed.description || ''),
      textLength: text.length,
      metadata: {
        ...metadata,
        description: parsed.description || null,
        publishedAt: candidate.publishedAt || parsed.publishedAt || null,
        originalFileUrl: candidate.originalFileUrl || parsed.documentLinks[0]?.url || null,
        documentLinks: parsed.documentLinks,
      },
      fetch: {
        ok: true,
        status: response.status,
        error: null,
      },
      ...(INCLUDE_TEXT ? { text } : {}),
    };
  } catch (error) {
    return {
      ...base,
      title: candidate.label || titleFromUrl(candidate.url),
      fetch: {
        ok: false,
        status: null,
        error: error instanceof Error ? error.message : String(error),
      },
      ...(INCLUDE_TEXT ? { text: '' } : {}),
    };
  }
}

function roleCounts(sources) {
  return sources.reduce((acc, source) => {
    acc[source.role] = (acc[source.role] || 0) + 1;
    return acc;
  }, {});
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

async function main() {
  const seed = readSeed(INPUT);
  const candidates = LIMIT > 0 ? seed.candidates.slice(0, LIMIT) : seed.candidates;
  const sources = [];

  for (const [index, candidate] of candidates.entries()) {
    sources.push(await fetchCandidate(candidate, index));
  }

  writeJson({
    pipeline: 'company_evidence',
    dryRun: true,
    generatedAt: new Date().toISOString(),
    company: seed.company || null,
    input: {
      path: seed.inputPath,
      totalCandidates: seed.candidates.length,
      fetchedCandidates: candidates.length,
    },
    notAvailableRoles: seed.notAvailableRoles || [],
    sourceCountsByRole: roleCounts(sources),
    sources,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
