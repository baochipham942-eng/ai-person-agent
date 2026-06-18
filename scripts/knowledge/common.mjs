import crypto from 'node:crypto';
import fs from 'node:fs';

export const SOURCE_ROLES = {
  signal: 'signal',
  official: 'official_definition',
  youtube: 'transcript_context',
  paper: 'paper_foundation',
  implementation: 'implementation_signal',
};

export function parseArgs(argv) {
  const options = {
    url: [],
    rss: [],
    sitemap: [],
    input: null,
    output: null,
    limit: Number.POSITIVE_INFINITY,
    maxChars: 12_000,
    timeoutMs: 12_000,
    fetch: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--fetch') options.fetch = true;
    else if (arg.startsWith('--url=')) options.url.push(arg.slice('--url='.length));
    else if (arg.startsWith('--rss=')) options.rss.push(arg.slice('--rss='.length));
    else if (arg.startsWith('--sitemap=')) options.sitemap.push(arg.slice('--sitemap='.length));
    else if (arg.startsWith('--input=')) options.input = arg.slice('--input='.length);
    else if (arg.startsWith('--output=')) options.output = arg.slice('--output='.length);
    else if (arg.startsWith('--limit=')) options.limit = Number.parseInt(arg.slice('--limit='.length), 10);
    else if (arg.startsWith('--max-chars=')) options.maxChars = Number.parseInt(arg.slice('--max-chars='.length), 10);
    else if (arg.startsWith('--timeout-ms=')) options.timeoutMs = Number.parseInt(arg.slice('--timeout-ms='.length), 10);
    else setLooseOption(options, arg);
  }

  return options;
}

export function setLooseOption(options, arg) {
  const match = arg.match(/^--([^=]+)=(.*)$/);
  if (!match) throw new Error(`Unknown argument: ${arg}`);
  const key = match[1].replace(/-([a-z])/g, (_, char) => char.toUpperCase());
  const value = match[2];
  if (options[key] === undefined) options[key] = value;
  else if (Array.isArray(options[key])) options[key].push(value);
  else options[key] = value;
}

export function readInputList(inputPath) {
  if (!inputPath) return [];
  const raw = fs.readFileSync(inputPath, 'utf8');
  if (inputPath.endsWith('.json')) {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.urls)) return parsed.urls;
    if (Array.isArray(parsed.sources)) return parsed.sources;
    return [parsed];
  }

  return raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

export function writeJson(payload, outputPath) {
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  if (outputPath) fs.writeFileSync(outputPath, text);
  else process.stdout.write(text);
}

export async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 12_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': options.userAgent || defaultUserAgent(),
        'accept-language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        accept: options.accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      contentType: response.headers.get('content-type') || null,
      text,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeUrl(value, baseUrl = null) {
  if (!value) return null;
  try {
    const parsed = baseUrl ? new URL(value, baseUrl) : new URL(value);
    parsed.hash = '';
    if (parsed.pathname !== '/') parsed.pathname = parsed.pathname.replace(/\/$/, '');
    return parsed.href;
  } catch {
    return null;
  }
}

export function hashUrl(url) {
  const normalized = normalizeUrl(url) || String(url || '');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function makeKnowledgeSource(params) {
  const url = normalizeUrl(params.url) || params.url;
  const text = cleanText(params.text || '').slice(0, params.maxChars || 12_000);
  return {
    sourceKind: params.sourceKind,
    sourceOwner: params.sourceOwner || null,
    title: cleanText(params.title || url || 'Untitled source').slice(0, 300),
    url,
    urlHash: hashUrl(url),
    text,
    publishedAt: normalizeDate(params.publishedAt),
    fetchedAt: new Date().toISOString(),
    metadata: {
      ...(params.metadata || {}),
      role: params.role || null,
      dryRun: true,
    },
  };
}

export function buildPack({ script, inputs, sources, stats = {}, accessIssues = [], notes = [] }) {
  return {
    schemaVersion: 'knowledge-source-dry-run/v1',
    mode: 'dry-run',
    script,
    generatedAt: new Date().toISOString(),
    inputs,
    stats: {
      sources: sources.length,
      ...stats,
    },
    sources,
    accessIssues,
    notes,
  };
}

export function cleanText(value) {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function extractHtmlTitle(html) {
  return cleanText(
    extractMetaContent(html, 'property', 'og:title')
    || extractMetaContent(html, 'name', 'twitter:title')
    || extractTagText(html, 'title')
    || extractTagText(html, 'h1'),
  );
}

export function extractCanonicalUrl(html, baseUrl) {
  const match = String(html || '').match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)
    || String(html || '').match(/<link\b[^>]*rel=canonical[^>]*>/i);
  return normalizeUrl(match ? extractAttr(match[0], 'href') : null, baseUrl);
}

export function extractMetaContent(html, attrName, attrValue) {
  const pattern = new RegExp(`<meta\\b[^>]*${attrName}=["']${escapeRegExp(attrValue)}["'][^>]*>`, 'i');
  const match = String(html || '').match(pattern);
  return match ? extractAttr(match[0], 'content') : null;
}

export function extractTagText(html, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = String(html || '').match(pattern);
  return match ? htmlToText(match[1]) : '';
}

export function extractTimeValue(html) {
  const timeMatch = String(html || '').match(/<time\b[^>]*>/i);
  return timeMatch ? extractAttr(timeMatch[0], 'datetime') || extractTagText(html, 'time') : null;
}

export function htmlToText(html) {
  const withoutNoise = String(html || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<form\b[\s\S]*?<\/form>/gi, ' ');

  const main = extractTagRaw(withoutNoise, 'main')
    || extractTagRaw(withoutNoise, 'article')
    || withoutNoise;

  return cleanText(main
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|li|h[1-6]|pre)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '));
}

export function extractCodeSnippets(html, limit = 12) {
  const snippets = [];
  const pattern = /<(pre|code)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = pattern.exec(String(html || ''))) && snippets.length < limit) {
    const text = htmlToText(match[2]);
    if (text.length >= 20) snippets.push(text);
  }
  return snippets;
}

export function extractAttr(tag, name) {
  const pattern = new RegExp(`${name}=["']([^"']+)["']`, 'i');
  const match = String(tag || '').match(pattern);
  return match ? cleanText(match[1]) : null;
}

function extractTagRaw(html, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = String(html || '').match(pattern);
  return match ? match[1] : '';
}

export function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function uniqueByUrl(items) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = hashUrl(typeof item === 'string' ? item : item.url);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

export function inferOwnerFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host.split('.').slice(-2).join('.');
  } catch {
    return null;
  }
}

export function defaultUserAgent() {
  return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36';
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
