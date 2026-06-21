/**
 * 公司官方博客配置 + Feed 解析
 *
 * 15 家目标（实测有经常维护的博客，2026-06）。method:
 *   'rss'    —— 有 RSS/Atom，直接解析 feed 拿 {title,url,date}
 *   'scrape' —— 无 RSS，用 Jina 渲染列表页 → 按 linkPattern 正则提取文章 URL
 * org —— 解析到 DB Organization 的名字（按 name/alias 匹配，缺则建）
 */

export interface CompanyBlog {
    name: string;
    org: string;
    method: 'rss' | 'scrape';
    url: string;
    linkPattern?: RegExp; // scrape 时提取文章链接
    // 单篇正文抓取策略：'jina'(默认，经 r.jina.ai) / 'html'(直连 fetch + HTML 抽取)。
    // HF 被 r.jina.ai 封禁(451)，走免费直连 HTML；其余源保持 Jina。
    articleFetch?: 'jina' | 'html';
}

/** 单篇正文抓取策略，缺省 'jina' */
export function pickArticleFetch(cfg: CompanyBlog): 'jina' | 'html' {
    return cfg.articleFetch ?? 'jina';
}

export const COMPANY_BLOGS: CompanyBlog[] = [
    // Tier 1：有 RSS
    { name: 'OpenAI', org: 'OpenAI', method: 'rss', url: 'https://openai.com/news/rss.xml' },
    { name: 'Microsoft Research', org: 'Microsoft', method: 'rss', url: 'https://www.microsoft.com/en-us/research/feed/' },
    { name: 'Google Research', org: 'Google', method: 'rss', url: 'https://research.google/blog/rss/' },
    { name: 'Google DeepMind', org: 'Google DeepMind', method: 'rss', url: 'https://deepmind.google/blog/rss.xml' },
    { name: 'Hugging Face', org: 'Hugging Face', method: 'rss', url: 'https://huggingface.co/blog/feed.xml', articleFetch: 'html' },
    { name: 'Mistral AI', org: 'Mistral AI', method: 'rss', url: 'https://mistral.ai/rss.xml' },
    { name: 'Together AI', org: 'Together AI', method: 'rss', url: 'https://www.together.ai/blog/rss.xml' },
    { name: 'NVIDIA', org: 'NVIDIA', method: 'rss', url: 'https://developer.nvidia.com/blog/feed/' },
    { name: 'Stability AI', org: 'Stability AI', method: 'rss', url: 'https://stability.ai/news-updates?format=rss' },
    // Tier 2/3：无 RSS，Jina 渲染列表页 + 正则提链
    { name: 'Anthropic', org: 'Anthropic', method: 'scrape', url: 'https://www.anthropic.com/news', linkPattern: /\/news\/[a-z0-9][a-z0-9-]{3,}/gi },
    { name: 'Anthropic Research', org: 'Anthropic', method: 'scrape', url: 'https://www.anthropic.com/research', linkPattern: /\/research\/[a-z0-9][a-z0-9-]{3,}/gi },
    { name: 'Cohere', org: 'Cohere', method: 'scrape', url: 'https://cohere.com/blog', linkPattern: /\/blog\/[a-z0-9][a-z0-9-]{3,}/gi },
    { name: 'Perplexity', org: 'Perplexity', method: 'scrape', url: 'https://www.perplexity.ai/hub/blog', linkPattern: /\/hub\/blog\/[a-z0-9][a-z0-9-]{3,}/gi },
    { name: 'Runway', org: 'Runway', method: 'scrape', url: 'https://runwayml.com/news', linkPattern: /\/news\/[a-z0-9][a-z0-9-]{3,}/gi },
    { name: 'xAI', org: 'xAI', method: 'scrape', url: 'https://x.ai/news', linkPattern: /\/news\/[a-z0-9][a-z0-9-]{3,}/gi },
    { name: 'Scale AI', org: 'Scale AI', method: 'scrape', url: 'https://scale.com/blog', linkPattern: /\/blog\/[a-z0-9][a-z0-9-]{3,}/gi },
];

export interface FeedItem {
    title: string;
    url: string;
    publishedAt: Date | null;
}

function decodeEntities(s: string): string {
    return s.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&apos;/g, "'")
        .trim();
}

function pick(block: string, tag: string): string {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
    return m ? decodeEntities(m[1]) : '';
}

/** 解析 RSS2(<item>) 或 Atom(<entry>) feed */
export function parseFeed(xml: string): FeedItem[] {
    const items: FeedItem[] = [];
    const isAtom = /<entry[\s>]/.test(xml) && !/<item[\s>]/.test(xml);
    const blocks = xml.match(isAtom ? /<entry[\s\S]*?<\/entry>/gi : /<item[\s\S]*?<\/item>/gi) || [];
    for (const b of blocks) {
        const title = pick(b, 'title');
        let url = '';
        if (isAtom) {
            const linkM = b.match(/<link[^>]*href=["']([^"']+)["']/i);
            url = linkM ? decodeEntities(linkM[1]) : '';
        } else {
            url = pick(b, 'link') || (b.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] ?? '');
        }
        const dateStr = pick(b, 'pubDate') || pick(b, 'published') || pick(b, 'updated') || pick(b, 'dc:date');
        const d = dateStr ? new Date(dateStr) : null;
        if (title && url) items.push({ title, url: url.trim(), publishedAt: d && !isNaN(d.getTime()) ? d : null });
    }
    return items;
}
