/**
 * 公司官方博客抓取 → CompanySource（per-company）
 *
 * 对 15 家目标公司：RSS 解析 feed / 无 RSS 用 Jina 渲染列表页提链 →
 * 每篇 Jina 抓正文 + DeepSeek 抽关键词 → upsert CompanySource。
 * org 按 name/alias 解析（缺则建 type=company）。落到清理后的干净 org 上。
 *
 * 用法：
 *   npx tsx scripts/enrich/fetch_company_blogs.ts                    # dry-run
 *   npx tsx scripts/enrich/fetch_company_blogs.ts --execute
 *   npx tsx scripts/enrich/fetch_company_blogs.ts --only OpenAI --execute
 *   选项：--per-company N（每家最多抓几篇，默认 15）--quiet
 *
 * 注：必须 npx tsx（bun 下 Prisma 原生引擎本机签名冲突）。
 */

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });
loadEnv({ path: '.env.local' });

process.on('unhandledRejection', e => console.warn('[unhandledRejection]', String(e).slice(0, 160)));
process.on('uncaughtException', e => console.warn('[uncaughtException]', String(e).slice(0, 160)));

import { prisma } from '../../lib/db/prisma';
import { sha256 } from '../../lib/rawpool-identity';
import { fetchArticleText } from '../../lib/datasources/jina-reader';
import { extractContentKeywords } from '../../lib/ai/extract-keywords';
import { COMPANY_BLOGS, parseFeed, type CompanyBlog, type FeedItem } from '../../lib/datasources/company-blogs';

interface Options { execute: boolean; only?: string; perCompany: number; quiet: boolean; }
function parseOptions(): Options {
    const a = process.argv.slice(2);
    const valOf = (f: string) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : undefined; };
    return {
        execute: a.includes('--execute'),
        only: valOf('--only'),
        perCompany: Number(valOf('--per-company') ?? 15),
        quiet: a.includes('--quiet'),
    };
}

const norm = (s: string) => (s || '').toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();

async function resolveOrCreateOrg(name: string, execute: boolean): Promise<string | null> {
    const orgs = await prisma.organization.findMany({ select: { id: true, name: true, aliases: true } });
    const hit = orgs.find(o => norm(o.name) === norm(name) || (o.aliases || []).some(al => norm(al) === norm(name)));
    if (hit) return hit.id;
    if (!execute) return 'DRY-NEW';
    const created = await prisma.organization.create({ data: { name, type: 'company' } });
    console.log(`   + 新建 org: ${name}`);
    return created.id;
}

/** scrape 模式：Jina 以 markdown 渲染列表页 → 解析 [标题](url) → 按 linkPattern 过滤文章链接（去重） */
async function scrapeListLinks(cfg: CompanyBlog): Promise<FeedItem[]> {
    const page = await fetchArticleText(cfg.url, { maxChars: 80000, timeoutMs: 45000, format: 'markdown' });
    if (!page.ok) return [];
    const origin = new URL(cfg.url).origin;
    const seen = new Set<string>();
    const items: FeedItem[] = [];
    // 解析所有 markdown 链接 [title](url)
    for (const m of page.text.matchAll(/\[([^\]\n]{2,150})\]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g)) {
        const title = m[1].trim();
        let url = m[2].trim();
        if (!url.startsWith('http')) url = origin + url;
        // 只要匹配该站文章 URL 规律的
        let path: string;
        try { path = new URL(url).pathname; } catch { continue; }
        cfg.linkPattern!.lastIndex = 0;
        if (!cfg.linkPattern!.test(path)) continue;
        url = url.split('#')[0].split('?')[0];
        if (seen.has(url)) continue;
        seen.add(url);
        const cleanTitle = title.length > 3 ? title : (path.split('/').filter(Boolean).pop() || '').replace(/-/g, ' ');
        items.push({ title: cleanTitle, url, publishedAt: null });
    }
    return items;
}

async function main() {
    const opts = parseOptions();
    const targets = opts.only
        ? COMPANY_BLOGS.filter(c => norm(c.name) === norm(opts.only!) || norm(c.org) === norm(opts.only!))
        : COMPANY_BLOGS;

    console.log(`=== 公司官方博客抓取 → CompanySource ===`);
    console.log(`模式: ${opts.execute ? 'EXECUTE' : 'DRY-RUN'} | 目标 ${targets.length} 家 | 每家≤${opts.perCompany} 篇\n`);

    let totalNew = 0, totalSkip = 0;
    for (const cfg of targets) {
        const orgId = await resolveOrCreateOrg(cfg.org, opts.execute);

        // 取文章列表
        let items: FeedItem[] = [];
        try {
            if (cfg.method === 'rss') {
                const res = await fetch(cfg.url, { headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
                    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
                    'Accept-Language': 'en-US,en;q=0.9',
                } });
                if (res.ok) items = parseFeed(await res.text());
                else {
                    // 直连被拦(如 MSR 403)：回退用 Jina 渲染 feed URL 再解析
                    console.warn(`   [${cfg.name}] feed HTTP ${res.status}，回退 Jina`);
                    const viaJina = await fetchArticleText(cfg.url, { maxChars: 80000, format: 'markdown' });
                    if (viaJina.ok) items = parseFeed(viaJina.text);
                }
            } else {
                items = await scrapeListLinks(cfg);
            }
        } catch (e) {
            console.warn(`   [${cfg.name}] 取列表失败: ${(e as Error).message.slice(0, 100)}`);
        }
        items = items.slice(0, opts.perCompany);
        console.log(`【${cfg.name}】(${cfg.method}) 列表 ${items.length} 篇 → org=${cfg.org}`);
        if (!opts.execute) { totalNew += items.length; continue; }
        if (!orgId || orgId === 'DRY-NEW') continue;

        let companyNew = 0;
        for (const it of items) {
            const urlHash = sha256(it.url);
            const exists = await prisma.companySource.findUnique({ where: { urlHash }, select: { id: true } });
            if (exists) { totalSkip++; continue; }

            const art = await fetchArticleText(it.url, { maxChars: 15000 });
            if (!art.ok || art.text.length < 200) { totalSkip++; continue; }

            let kw = { keywords: [] as string[], entities: [] as string[], topics: [] as string[], gist: '' };
            try { kw = await extractContentKeywords(it.title, art.text, { contentType: `${cfg.name} 官方博客文章` }); }
            catch { /* 抽词失败仍落正文 */ }

            try {
                await prisma.companySource.create({
                    data: {
                        organizationId: orgId,
                        sourceKind: 'official_blog_article',
                        role: 'blog',
                        title: it.title.slice(0, 300),
                        url: it.url,
                        canonicalUrl: it.url,
                        urlHash,
                        text: art.text,
                        summary: kw.gist || null,
                        publishedAt: it.publishedAt,
                        fetchedAt: new Date(),
                        metadata: { keywords: kw.keywords, entities: kw.entities, contentTopics: kw.topics, fullTextSource: 'jina', blogSource: cfg.name },
                    },
                });
                companyNew++; totalNew++;
            } catch (e) {
                console.warn(`   [${cfg.name}] 落库失败 ${it.url}: ${(e as Error).message.slice(0, 80)}`);
            }
        }
        if (companyNew && !opts.quiet) console.log(`   ✓ 新增 ${companyNew} 篇`);
    }

    console.log(`\n📊 ${opts.execute ? '已新增' : '将抓取'} ${totalNew} 篇${opts.execute ? `，跳过(已有/太薄) ${totalSkip}` : ''}`);
    if (!opts.execute) console.log(`（DRY-RUN，加 --execute 执行）`);

    await prisma.$disconnect();
    process.exit(0);
}

main().catch(async e => { console.error('失败:', e); await prisma.$disconnect(); process.exit(1); });
