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

export interface TranscriptResult {
    text: string;
    lang: string | null;
    availableLangs: string[];
    /** 命中字幕时为 true；视频无字幕（404/transcript-unavailable）时为 false */
    available: boolean;
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

interface FetchOptions {
    /** 偏好语言（如 'en'）；不传则取视频默认字幕 */
    lang?: string;
    /** 单 key 网络错误重试次数 */
    retries?: number;
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

    let exhausted = 0;
    // 从当前游标开始，依次尝试每个 key；额度耗尽的 key 推进游标
    for (let attempt = 0; attempt < keys.length; attempt++) {
        const idx = (keyCursor + attempt) % keys.length;
        const key = keys[idx];

        const res = await fetchWithRetry(endpoint, key, options.retries ?? 2);

        if (res.status === 200) {
            keyCursor = idx; // 记住这个能用的 key
            const data = await res.json().catch(() => null);
            return parseTranscript(data);
        }

        // 404 / 这条视频无字幕：不是额度问题，直接返回 unavailable
        if (res.status === 404 || res.status === 206) {
            keyCursor = idx;
            return { text: '', lang: null, availableLangs: [], available: false };
        }

        // 429 限流 / 402 / 403 额度耗尽：换下一个 key
        if (res.status === 429 || res.status === 402 || res.status === 403) {
            exhausted++;
            continue;
        }

        // 其他错误（4xx/5xx）：当前 key 不一定坏，但这条视频拿不到，按 unavailable 处理并记录
        const body = await res.text().catch(() => '');
        console.warn(`[supadata] ${url} -> HTTP ${res.status}: ${body.slice(0, 160)}`);
        return { text: '', lang: null, availableLangs: [], available: false };
    }

    throw new SupadataQuotaError(
        `Supadata 全部 ${keys.length} 个 key 额度/限流耗尽（exhausted=${exhausted}）。请补充 SUPADATA_API_KEYS 后重跑。`,
    );
}

async function fetchWithRetry(endpoint: string, key: string, retries: number): Promise<Response> {
    let lastErr: unknown;
    for (let i = 0; i <= retries; i++) {
        try {
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
        return { text: '', lang: null, availableLangs: [], available: false };
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
    return { text, lang, availableLangs, available: text.length > 0 };
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
