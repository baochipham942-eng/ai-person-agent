export interface XaiXPost {
    id: string;
    text: string;
    date: string;
    url: string;
    author?: string;
}

export interface XaiXSearchOptions {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    query: string;
    maxResults?: number;
    xHandle?: string;
    since?: Date;
}

export interface XaiXSearchResult {
    posts: XaiXPost[];
    rawText: string;
    citations: string[];
}

const DEFAULT_BASE_URL = 'https://api.x.ai/v1';
const DEFAULT_MODEL = 'grok-4.3';
const X_POST_URL_PATTERN = /https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([^/\s)]+)\/status\/(\d+)/i;

export function normalizeXHandle(value?: string | null): string | null {
    const normalized = value?.trim().replace(/^@/, '');
    if (!normalized) return null;

    try {
        const url = new URL(normalized);
        const handle = url.pathname.split('/').filter(Boolean)[0];
        return handle || null;
    } catch {
        return normalized
            .replace(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\//i, '')
            .replace(/^(?:www\.)?(?:x|twitter)\.com\//i, '')
            .split(/[/?#]/)[0] || null;
    }
}

export async function fetchXPostsWithXaiSearch(options: XaiXSearchOptions): Promise<XaiXSearchResult> {
    const apiKey = options.apiKey || process.env.XAI_API_KEY;
    if (!apiKey) return { posts: [], rawText: '', citations: [] };

    const baseUrl = options.baseUrl || process.env.XAI_BASE_URL || DEFAULT_BASE_URL;
    const model = options.model || process.env.XAI_X_SEARCH_MODEL || process.env.XAI_MODEL || DEFAULT_MODEL;
    const maxResults = Math.min(Math.max(options.maxResults || 10, 1), 20);
    const xHandle = normalizeXHandle(options.xHandle);
    const prompt = buildXSearchPrompt({
        query: options.query,
        maxResults,
        xHandle,
        since: options.since,
    });

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/responses`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            input: [{ role: 'user', content: prompt }],
            tools: [
                {
                    type: 'x_search',
                    ...(xHandle && { allowed_x_handles: [xHandle] }),
                    ...(options.since && { from_date: formatDateOnly(options.since) }),
                },
            ],
            temperature: 0.1,
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`xAI X Search error ${response.status}: ${body.slice(0, 500)}`);
    }

    const payload = await response.json();
    const rawText = extractXaiResponseText(payload);
    const posts = parseXPostsFromText(rawText, xHandle || undefined).slice(0, maxResults);
    const citations = extractCitations(payload, rawText);

    return { posts, rawText, citations };
}

export function parseXPostsFromText(content: string, fallbackHandle?: string): XaiXPost[] {
    const jsonPosts = parseJsonPosts(content, fallbackHandle);
    if (jsonPosts.length > 0) return jsonPosts;

    const posts: XaiXPost[] = [];
    const seen = new Set<string>();
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(X_POST_URL_PATTERN);
        if (!match) continue;

        const url = normalizeXPostUrl(match[0]);
        if (seen.has(url)) continue;
        seen.add(url);

        const text = extractNearbyPostText(lines, i);
        posts.push({
            id: match[2],
            text,
            date: extractNearbyDate(lines, i),
            url,
            author: match[1] || fallbackHandle,
        });
    }

    return posts;
}

function buildXSearchPrompt(input: {
    query: string;
    maxResults: number;
    xHandle: string | null;
    since?: Date;
}): string {
    const scope = input.xHandle ? `from @${input.xHandle}` : `about ${input.query}`;
    const since = input.since ? ` published after ${formatDateOnly(input.since)}` : '';

    return `Find up to ${input.maxResults} recent X posts ${scope}${since} that are specifically about AI, machine learning, large language models, AI products, research, engineering, developer tools, model releases, or AI company strategy.

Ignore politics, generic personal updates, memes, and unrelated opinions.

Return only a JSON object with this exact shape:
{
  "posts": [
    {
      "date": "YYYY-MM-DD",
      "text": "full post text",
      "url": "https://x.com/<handle>/status/<id>"
    }
  ]
}

Each post must include a direct X status URL.`;
}

function parseJsonPosts(content: string, fallbackHandle?: string): XaiXPost[] {
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd <= jsonStart) return [];

    try {
        const parsed = JSON.parse(content.slice(jsonStart, jsonEnd + 1)) as { posts?: unknown };
        if (!Array.isArray(parsed.posts)) return [];

        return parsed.posts
            .map(post => normalizePostObject(post, fallbackHandle))
            .filter((post): post is XaiXPost => Boolean(post));
    } catch {
        return [];
    }
}

function normalizePostObject(value: unknown, fallbackHandle?: string): XaiXPost | null {
    if (!value || typeof value !== 'object') return null;
    const record = value as Record<string, unknown>;
    const url = typeof record.url === 'string' ? normalizeXPostUrl(record.url) : '';
    const match = url.match(X_POST_URL_PATTERN);
    if (!match) return null;

    return {
        id: match[2],
        text: typeof record.text === 'string' ? record.text.trim() : '',
        date: typeof record.date === 'string' ? record.date : '',
        url,
        author: match[1] || fallbackHandle,
    };
}

export function extractXaiResponseText(payload: unknown): string {
    if (!payload || typeof payload !== 'object') return '';
    const record = payload as Record<string, unknown>;

    if (typeof record.output_text === 'string') return record.output_text;

    const output = Array.isArray(record.output) ? record.output : [];
    const chunks: string[] = [];

    for (const item of output) {
        if (!item || typeof item !== 'object') continue;
        const outputItem = item as Record<string, unknown>;
        if (typeof outputItem.text === 'string') chunks.push(outputItem.text);

        const content = Array.isArray(outputItem.content) ? outputItem.content : [];
        for (const contentItem of content) {
            if (!contentItem || typeof contentItem !== 'object') continue;
            const contentRecord = contentItem as Record<string, unknown>;
            if (typeof contentRecord.text === 'string') chunks.push(contentRecord.text);
        }
    }

    return chunks.join('\n').trim();
}

function extractCitations(payload: unknown, rawText: string): string[] {
    const citations = new Set<string>();
    const add = (value: unknown) => {
        if (typeof value === 'string' && X_POST_URL_PATTERN.test(value)) {
            citations.add(normalizeXPostUrl(value));
        }
    };

    if (payload && typeof payload === 'object') {
        const text = JSON.stringify(payload);
        for (const match of text.matchAll(new RegExp(X_POST_URL_PATTERN, 'gi'))) add(match[0]);
    }

    for (const match of rawText.matchAll(new RegExp(X_POST_URL_PATTERN, 'gi'))) add(match[0]);
    return [...citations];
}

function extractNearbyPostText(lines: string[], index: number): string {
    const candidates = [lines[index - 2], lines[index - 1], lines[index]].filter(Boolean);

    for (const candidate of candidates) {
        const quoted = candidate.match(/"([^"]+)"/);
        if (quoted?.[1]) return quoted[1].trim();
    }

    return candidates
        .join(' ')
        .replace(X_POST_URL_PATTERN, '')
        .replace(/^[-*\d.\s]+/, '')
        .trim();
}

function extractNearbyDate(lines: string[], index: number): string {
    const nearby = [lines[index - 2], lines[index - 1], lines[index], lines[index + 1]].filter(Boolean).join(' ');
    const isoDate = nearby.match(/\b\d{4}-\d{2}-\d{2}\b/);
    return isoDate?.[0] || '';
}

function normalizeXPostUrl(value: string): string {
    return value.replace(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com/i, 'https://x.com');
}

function formatDateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
}
