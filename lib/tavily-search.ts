export interface TavilySearchResult {
  url: string;
  title: string;
  text: string;
  publishedDate: string | null;
  score: number | null;
  source: 'tavily';
}

interface TavilySearchOptions {
  maxResults?: number;
  searchDepth?: 'basic' | 'advanced';
  rawContent?: 'text' | 'markdown' | boolean;
}

const TAVILY_API_URL = 'https://api.tavily.com';

let tavilyKeyIndex = 0;
const exhaustedTavilyKeyIndexes = new Set<number>();

export function getTavilyApiKeys(): string[] {
  return uniqueValues([
    ...splitEnvValues(process.env.TAVILY_API_KEYS),
    ...indexedEnvValues('TAVILY_API_KEY'),
    ...splitEnvValues(process.env.TAVILY_API_KEY),
  ]);
}

export function isTavilyConfigured(): boolean {
  return getTavilyApiKeys().length > 0;
}

export async function searchTavily(
  query: string,
  options: TavilySearchOptions = {}
): Promise<TavilySearchResult[]> {
  const keys = getTavilyApiKeys();
  if (keys.length === 0) {
    return [];
  }

  const searchDepth = options.searchDepth || normalizeSearchDepth(process.env.TAVILY_SEARCH_DEPTH);
  const body: Record<string, unknown> = {
    query,
    max_results: Math.min(Math.max(options.maxResults || 4, 1), 8),
    search_depth: searchDepth,
    include_answer: false,
    include_raw_content: options.rawContent ?? process.env.TAVILY_RAW_CONTENT ?? 'text',
    include_images: false,
    include_favicon: false,
    include_usage: true,
    topic: 'general',
  };

  if (searchDepth === 'advanced') {
    body.chunks_per_source = 3;
  }

  const payload = await fetchTavilyJson(keys, '/search', body);
  const results = Array.isArray(payload.results) ? payload.results : [];

  return results
    .map(toTavilySearchResult)
    .filter((result): result is TavilySearchResult => Boolean(result));
}

async function fetchTavilyJson(
  keys: string[],
  endpoint: string,
  body: Record<string, unknown>
): Promise<{ results?: unknown[] }> {
  const attempts = Math.max(1, keys.length);
  const errors: string[] = [];

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const keyIndex = nextTavilyKeyIndex(keys);
    const response = await fetch(`${TAVILY_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${keys[keyIndex]}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    if (response.ok) {
      return JSON.parse(text) as { results?: unknown[] };
    }

    const error = `key#${keyIndex + 1}: HTTP ${response.status} ${text.slice(0, 240)}`;
    errors.push(error);
    if (isTavilyQuotaOrRateLimit(response.status, text)) {
      exhaustedTavilyKeyIndexes.add(keyIndex);
      continue;
    }

    throw new Error(`Tavily ${endpoint} failed: ${error}`);
  }

  throw new Error(`Tavily ${endpoint} failed: all ${keys.length} key(s) quota_or_rate_limited. ${errors.join(' | ')}`);
}

function nextTavilyKeyIndex(keys: string[]): number {
  for (let offset = 0; offset < keys.length; offset += 1) {
    const index = (tavilyKeyIndex + offset) % keys.length;
    if (!exhaustedTavilyKeyIndexes.has(index)) {
      tavilyKeyIndex = (index + 1) % keys.length;
      return index;
    }
  }

  exhaustedTavilyKeyIndexes.clear();
  const index = tavilyKeyIndex % keys.length;
  tavilyKeyIndex = (index + 1) % keys.length;
  return index;
}

function isTavilyQuotaOrRateLimit(status: number, text: string): boolean {
  return status === 429
    || status === 432
    || status === 433
    || /usage limit|rate limit|credits|quota/i.test(text);
}

function toTavilySearchResult(value: unknown): TavilySearchResult | null {
  if (!isRecord(value)) return null;
  const url = asString(value.url);
  if (!url) return null;

  return {
    url,
    title: asString(value.title) || url,
    text: asString(value.raw_content) || asString(value.content) || '',
    publishedDate: asString(value.published_date) || null,
    score: typeof value.score === 'number' && Number.isFinite(value.score) ? value.score : null,
    source: 'tavily',
  };
}

function splitEnvValues(value: string | undefined): string[] {
  return String(value || '')
    .split(/[\s,;]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function indexedEnvValues(prefix: string, limit = 50): string[] {
  const values: string[] = [];
  for (let index = 1; index <= limit; index += 1) {
    values.push(...splitEnvValues(process.env[`${prefix}_${index}`]));
  }
  return values;
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function normalizeSearchDepth(value: string | undefined): 'basic' | 'advanced' {
  return value === 'advanced' ? 'advanced' : 'basic';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
