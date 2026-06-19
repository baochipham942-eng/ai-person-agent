/**
 * Jina Reader（r.jina.ai）全文抓取
 *
 * 免费、无需 key（可选 JINA_API_KEY 提高限额），把任意 URL 转成干净正文。
 * 用于 Exa 额度耗尽时重抓被截断/偏薄的官方博客/文章全文。
 */

const JINA_BASE = 'https://r.jina.ai/';

export interface ArticleText {
    text: string;
    ok: boolean;
}

/**
 * 抓取单篇文章全文。失败返回 { text:'', ok:false }，不抛错（调用方按需跳过）。
 * @param url 目标文章 URL
 * @param maxChars 截断上限（默认 15000）
 * @param timeoutMs 单篇超时（默认 30s，Jina 免费层较慢）
 */
export async function fetchArticleText(
    url: string,
    { maxChars = 15000, timeoutMs = 30000 }: { maxChars?: number; timeoutMs?: number } = {},
): Promise<ArticleText> {
    if (!/^https?:\/\//.test(url)) return { text: '', ok: false };

    const headers: Record<string, string> = { 'X-Return-Format': 'text' };
    if (process.env.JINA_API_KEY) headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(`${JINA_BASE}${url}`, { headers, signal: controller.signal });
        if (!res.ok) return { text: '', ok: false };
        let body = await res.text();
        body = body.replace(/\s+/g, ' ').trim();
        if (body.length > maxChars) body = body.slice(0, maxChars);
        return { text: body, ok: body.length > 0 };
    } catch {
        return { text: '', ok: false };
    } finally {
        clearTimeout(timer);
    }
}
