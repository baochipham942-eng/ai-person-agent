/**
 * 直连 HTML 全文抓取（免费，不经 Jina）
 *
 * 用于内容静态 SSR、但被 r.jina.ai 封禁的源（如 Hugging Face → r.jina.ai 返 451）。
 * 直连 fetch 拿到 SSR HTML → 抽正文容器 → 去标签/解实体/压空白。
 * 返回与 jina-reader 同构的 ArticleText，可在管线里 drop-in 替换。
 */

import type { ArticleText } from './jina-reader';

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/**
 * 从指定开始位置（某个开标签处）按标签嵌套配平，切出该元素的 innerHTML。
 * 未闭合则取到结尾（兜底，配合后续 nav/footer 剥离仍可用）。
 */
function sliceBalanced(html: string, tag: string, startIdx: number): string {
  const openEnd = html.indexOf('>', startIdx);
  if (openEnd < 0) return '';
  const re = new RegExp(`<\\/?${tag}\\b`, 'gi');
  re.lastIndex = openEnd + 1;
  let depth = 1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[0].toLowerCase().startsWith('</')) {
      depth--;
      if (depth === 0) return html.slice(openEnd + 1, m.index);
    } else {
      depth++;
    }
  }
  return html.slice(openEnd + 1);
}

/** 选正文容器：优先 HF 的 blog-content div，回退 <article> → <main> → 整个 body */
function pickContainer(html: string): string {
  const blog = html.match(/<div[^>]*class=["'][^"']*\bblog-content\b[^"']*["'][^>]*>/i);
  if (blog) return sliceBalanced(html, 'div', blog.index!);
  const article = html.match(/<article\b[^>]*>/i);
  if (article) return sliceBalanced(html, 'article', article.index!);
  const main = html.match(/<main\b[^>]*>/i);
  if (main) return sliceBalanced(html, 'main', main.index!);
  const body = html.match(/<body\b[^>]*>/i);
  if (body) return sliceBalanced(html, 'body', body.index!);
  return html;
}

/**
 * 从 SSR HTML 抽出干净正文。纯函数（无网络），便于测试。
 * 流程：剥 script/style/noscript → 选正文容器 → 容器内剥 nav/header/footer/aside →
 *       去标签 → 解实体 → 压空白。
 */
export function extractArticleText(html: string): string {
  if (!html || !html.trim()) return '';
  let h = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

  let container = pickContainer(h);
  container = container.replace(/<(nav|header|footer|aside)\b[\s\S]*?<\/\1>/gi, ' ');

  // 去标签：必须吞掉引号属性值里的 >（HF 用 Tailwind 任意值类名如 [&>a]:hidden，
  // class 里含 >，朴素 /<[^>]+>/ 会被截断、漏出 `a]:hidden">` 碎片）。
  const stripped = container.replace(/<[a-zA-Z!/][^>"']*(?:"[^"]*"[^>"']*|'[^']*'[^>"']*)*>/g, ' ');
  const text = decodeEntities(stripped).replace(/\s+/g, ' ').trim();
  return text;
}

/**
 * 直连抓取单篇文章全文。失败返回 { text:'', ok:false }，不抛错（调用方按需回退/跳过）。
 * @param url 目标文章 URL
 * @param maxChars 截断上限（默认 15000）
 * @param timeoutMs 单篇超时（默认 30s）
 */
export async function fetchArticleHtml(
  url: string,
  { maxChars = 15000, timeoutMs = 30000 }: { maxChars?: number; timeoutMs?: number } = {},
): Promise<ArticleText> {
  if (!/^https?:\/\//.test(url)) return { text: '', ok: false };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });
    if (!res.ok) return { text: '', ok: false };
    let text = extractArticleText(await res.text());
    if (text.length > maxChars) text = text.slice(0, maxChars);
    return { text, ok: text.length > 0 };
  } catch {
    return { text: '', ok: false };
  } finally {
    clearTimeout(timer);
  }
}
