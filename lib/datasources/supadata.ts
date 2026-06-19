/**
 * Supadata YouTube 字幕 API 封装
 *
 * 用于拉取 YouTube 视频字幕/transcript（YouTube 官方无简单公开字幕接口，
 * 走 Supadata 第三方服务）。多 key 轮换：SUPADATA_API_KEYS 逗号分隔，
 * 命中 429/额度耗尽时自动切下一个 key；全部耗尽时抛 SupadataQuotaError。
 *
 * API 契约（v1）：
 *   GET https://api.supadata.ai/v1/transcript?url=<videoUrl>&text=true
 *   Header: x-api-key: <key>
 *   text=true 时返回 { content: "拼接后的纯文本", lang, availableLangs }
 *   text 缺省时返回 { content: [{text, offset, duration, lang}...], ... }
 */

const SUPADATA_BASE_URL = 'https://api.supadata.ai/v1';

export class SupadataQuotaError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SupadataQuotaError';
    }
}

export type TranscriptStatus =
    | 'ok'        // 拿到字幕
    | 'none'      // 确实没字幕（404 / 任务 failed / 内容空）→ 调用方应永久标记跳过
    | 'timeout'   // 202 异步任务未在轮询窗口内完成 → 可能有，留待重试，别标记
    | 'error';    // 其他错误 → 留待重试

export interface TranscriptResult {
    text: string;
    lang: string | null;
    availableLangs: string[];
    /** 命中字幕时为 true；视频无字幕/失败时为 false */
    available: boolean;
    /** 细分状态，供调用方决定是否永久标记跳过（none）还是重试（timeout/error） */
    status: TranscriptStatus;
}

function loadKeys(): string[] {
    const raw = process.env.SUPADATA_API_KEYS || process.env.SUPADATA_API_KEY || '';
    return raw
        .split(',')
        .map(k => k.trim())
        .filter(Boolean);
}

// 模块级游标：在一次进程内跨调用记住"当前可用 key"，避免每条视频都从耗尽的 key 重试
let keyCursor = 0;

// 全局频率闸：Supadata Pro 限 10 请求/秒。所有对 Supadata 的请求（首发+202轮询+重试）
// 都过这个闸，最小间隔 130ms ≈ 7.7 req/s，留安全余量避免 429。
const MIN_REQUEST_INTERVAL_MS = 130;
let lastRequestAt = 0;
async function rateGate(): Promise<void> {
    const now = Date.now();
    const wait = lastRequestAt + MIN_REQUEST_INTERVAL_MS - now;
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
}

interface FetchOptions {
    /** 偏好语言（如 'en'）；不传则取视频默认字幕 */
    lang?: string;
    /** 单 key 网络错误重试次数 */
    retries?: number;
    /** 异步任务轮询间隔 ms（默认 4000） */
    jobPollMs?: number;
    /** 异步任务最大轮询次数（默认 15，约 1 分钟） */
    jobMaxPolls?: number;
    /** 单 key 429 限流退避重试次数（默认 6） */
    rateLimitRetries?: number;
}

/** 轮询 Supadata 异步任务（202 返回的 jobId）直到 completed/failed/超时 */
async function pollTranscriptJob(jobId: string, key: string, pollMs: number, maxPolls: number): Promise<TranscriptResult> {
    const endpoint = `${SUPADATA_BASE_URL}/transcript/${jobId}`;
    for (let i = 0; i < maxPolls; i++) {
        await sleep(pollMs);
        let res: Response;
        try {
            await rateGate();
            res = await fetch(endpoint, { headers: { 'x-api-key': key } });
        } catch {
            continue; // 网络抖动，下一轮再试
        }
        if (res.status !== 200) continue;
        const data = await res.json().catch(() => null);
        const status = data && typeof data === 'object' ? (data as Record<string, unknown>).status : null;
        if (status === 'completed') return parseTranscript(data);
        if (status === 'failed') return { text: '', lang: null, availableLangs: [], available: false, status: 'none' };
        // queued / active：继续轮询
    }
    // 超时仍未完成：可能有字幕只是慢，标 timeout 留待重试（不永久跳过）
    return { text: '', lang: null, availableLangs: [], available: false, status: 'timeout' };
}

/**
 * 拉取单个视频的字幕。
 * @param videoUrlOrId 完整 watch URL 或 11 位 videoId
 * @returns 字幕文本结果；视频无字幕时 available=false（非错误，调用方按需跳过）
 * @throws SupadataQuotaError 当所有 key 的额度都耗尽
 */
export async function fetchYoutubeTranscript(
    videoUrlOrId: string,
    options: FetchOptions = {},
): Promise<TranscriptResult> {
    const keys = loadKeys();
    if (keys.length === 0) {
        throw new Error('SUPADATA_API_KEYS 未配置（.env.local）');
    }

    const url = normalizeVideoUrl(videoUrlOrId);
    const params = new URLSearchParams({ url, text: 'true' });
    if (options.lang) params.set('lang', options.lang);
    const endpoint = `${SUPADATA_BASE_URL}/transcript?${params}`;

    // 从当前游标开始，依次尝试每个 key
    for (let attempt = 0; attempt < keys.length; attempt++) {
        const idx = (keyCursor + attempt) % keys.length;
        const key = keys[idx];

        // 同一 key 上的 429 限流退避重试（429≠额度耗尽，是请求太快，等一下就好）
        let rateLimitTries = 0;
        const maxRateLimit = options.rateLimitRetries ?? 6;
        let rotate = false;

        while (!rotate) {
            const res = await fetchWithRetry(endpoint, key, options.retries ?? 2);

            if (res.status === 200) {
                keyCursor = idx;
                const data = await res.json().catch(() => null);
                return parseTranscript(data);
            }

            // 202：异步任务，轮询 jobId（不额外计费）
            if (res.status === 202) {
                keyCursor = idx;
                const data = await res.json().catch(() => null);
                const jobId = data && typeof data === 'object' ? (data as Record<string, unknown>).jobId : null;
                if (typeof jobId === 'string' && jobId) {
                    return await pollTranscriptJob(jobId, key, options.jobPollMs ?? 3000, options.jobMaxPolls ?? 8);
                }
                return { text: '', lang: null, availableLangs: [], available: false, status: 'none' };
            }

            // 404：确实没字幕，永久标记
            if (res.status === 404 || res.status === 206) {
                keyCursor = idx;
                return { text: '', lang: null, availableLangs: [], available: false, status: 'none' };
            }

            // 429 / 402 / 403：实测 key 明明有额度也偶发 402/403，是瞬时节流/抖动，
            // 一律退避重试同一个 key；首次打印真实响应体便于诊断。重试耗尽才换 key。
            if (res.status === 429 || res.status === 402 || res.status === 403) {
                if (rateLimitTries === 0) {
                    const body = await res.text().catch(() => '');
                    console.warn(`[supadata] ${url} -> HTTP ${res.status}（瞬时节流?重试）: ${body.slice(0, 140)}`);
                }
                rateLimitTries++;
                if (rateLimitTries > maxRateLimit) { rotate = true; break; } // 这个 key 持续失败，换下一个
                const backoff = Math.min(30000, 3000 * 2 ** (rateLimitTries - 1)); // 3s,6s,12s,24s,30s,30s
                await sleep(backoff);
                continue; // 重试同一个 key
            }

            // 其他错误：留待重试
            const body = await res.text().catch(() => '');
            console.warn(`[supadata] ${url} -> HTTP ${res.status}: ${body.slice(0, 160)}`);
            return { text: '', lang: null, availableLangs: [], available: false, status: 'error' };
        }
    }

    // 所有 key 都重试耗尽：这条视频先跳过(留待重试)，绝不抛错毒杀整批
    return { text: '', lang: null, availableLangs: [], available: false, status: 'error' };
}

async function fetchWithRetry(endpoint: string, key: string, retries: number): Promise<Response> {
    let lastErr: unknown;
    for (let i = 0; i <= retries; i++) {
        try {
            await rateGate();
            return await fetch(endpoint, { headers: { 'x-api-key': key } });
        } catch (err) {
            lastErr = err;
            // 网络抖动指数退避
            await sleep(500 * (i + 1));
        }
    }
    throw new Error(`Supadata 网络请求失败: ${(lastErr as Error)?.message}`);
}

function parseTranscript(data: unknown): TranscriptResult {
    if (!data || typeof data !== 'object') {
        return { text: '', lang: null, availableLangs: [], available: false, status: 'none' };
    }
    const obj = data as Record<string, unknown>;
    const content = obj.content;
    let text = '';
    if (typeof content === 'string') {
        text = content;
    } else if (Array.isArray(content)) {
        text = content
            .map(seg => (seg && typeof seg === 'object' ? String((seg as Record<string, unknown>).text ?? '') : ''))
            .join(' ');
    }
    text = text.replace(/\s+/g, ' ').trim();
    const lang = typeof obj.lang === 'string' ? obj.lang : null;
    const availableLangs = Array.isArray(obj.availableLangs)
        ? obj.availableLangs.filter((l): l is string => typeof l === 'string')
        : [];
    return { text, lang, availableLangs, available: text.length > 0, status: text.length > 0 ? 'ok' : 'none' };
}

function normalizeVideoUrl(videoUrlOrId: string): string {
    const trimmed = videoUrlOrId.trim();
    if (/^https?:\/\//.test(trimmed)) return trimmed;
    // 裸 videoId
    if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return `https://www.youtube.com/watch?v=${trimmed}`;
    return trimmed;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
