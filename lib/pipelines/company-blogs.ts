/**
 * 公司官方博客抓取核心 → CompanySource（per-company）。
 * 从 scripts/enrich/fetch_company_blogs.ts 抽出，CLI 与后台共用。
 */
import { prisma } from '@/lib/db/prisma';
import { sha256 } from '@/lib/rawpool-identity';
import { fetchArticleText } from '@/lib/datasources/jina-reader';
import { extractContentKeywords } from '@/lib/ai/extract-keywords';
import { COMPANY_BLOGS, parseFeed, type CompanyBlog, type FeedItem } from '@/lib/datasources/company-blogs';
import { makeLogger, type PipelineRunHooks } from './hooks';

export interface CompanyBlogsOptions {
  execute: boolean;
  only?: string;
  perCompany: number;
  quiet: boolean;
}

const norm = (s: string) => (s || '').toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();

// 标题黑名单：明显垂类应用，标题就能判，直接跳过不抓（省 Jina/DeepSeek）
const NICHE_TITLE_RE = /\b(clinical|medical|healthcare|patient|diagnos|genomic|genome|protein|molecul|drug discovery|biomedical|climate|weather|meteorolog|materials science|semiconductor|wafer|lithograph|chemistry|astronom|geospatial|agricultur)\b/i;

// HuggingFace 社区文 URL 形如 /blog/<user>/<slug>（两段）；官方 /blog/<slug>（一段）
function isHfOfficial(url: string): boolean {
  const m = url.match(/huggingface\.co\/blog\/([^/?#]+)(\/([^/?#]+))?/i);
  return !!m && !m[3];
}

async function resolveOrCreateOrg(name: string, execute: boolean, log: (msg: string) => void): Promise<string | null> {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true, aliases: true } });
  const hit = orgs.find(o => norm(o.name) === norm(name) || (o.aliases || []).some(al => norm(al) === norm(name)));
  if (hit) return hit.id;
  if (!execute) return 'DRY-NEW';
  const created = await prisma.organization.create({ data: { name, type: 'company' } });
  log(`   + 新建 org: ${name}`);
  return created.id;
}

/** scrape 模式：Jina 以 markdown 渲染列表页 → 解析 [标题](url) → 按 linkPattern 过滤文章链接（去重） */
async function scrapeListLinks(cfg: CompanyBlog): Promise<FeedItem[]> {
  const page = await fetchArticleText(cfg.url, { maxChars: 80000, timeoutMs: 45000, format: 'markdown' });
  if (!page.ok) return [];
  const origin = new URL(cfg.url).origin;
  const seen = new Set<string>();
  const items: FeedItem[] = [];
  for (const m of page.text.matchAll(/\[([^\]\n]{2,150})\]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g)) {
    const title = m[1].trim();
    let url = m[2].trim();
    if (!url.startsWith('http')) url = origin + url;
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

export async function runCompanyBlogs(opts: CompanyBlogsOptions, hooks: PipelineRunHooks = {}): Promise<{ totalNew: number; totalSkip: number }> {
  const log = makeLogger(hooks);
  const targets = opts.only
    ? COMPANY_BLOGS.filter(c => norm(c.name) === norm(opts.only!) || norm(c.org) === norm(opts.only!))
    : COMPANY_BLOGS;

  await hooks.setTotal?.(targets.length);
  await log('info', `公司官方博客抓取：模式 ${opts.execute ? 'EXECUTE' : 'DRY-RUN'} | 目标 ${targets.length} 家 | 每家≤${opts.perCompany} 篇`);

  let totalNew = 0, totalSkip = 0;
  for (const [idx, cfg] of targets.entries()) {
    if (await hooks.isCancelled?.()) return { totalNew, totalSkip };

    const orgId = await resolveOrCreateOrg(cfg.org, opts.execute, msg => { if (!opts.quiet) console.log(msg); });

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
          await log('warning', `[${cfg.name}] feed HTTP ${res.status}，回退 Jina`);
          const viaJina = await fetchArticleText(cfg.url, { maxChars: 80000, format: 'markdown' });
          if (viaJina.ok) items = parseFeed(viaJina.text);
        }
      } else {
        items = await scrapeListLinks(cfg);
      }
    } catch (e) {
      await log('warning', `[${cfg.name}] 取列表失败: ${(e as Error).message.slice(0, 100)}`);
    }

    if (cfg.name === 'Hugging Face') items = items.filter(it => isHfOfficial(it.url));
    let nicheTitleSkipped = 0;
    items = items.filter(it => { if (NICHE_TITLE_RE.test(it.title)) { nicheTitleSkipped++; return false; } return true; });
    items = items.slice(0, opts.perCompany);
    await log('info', `【${cfg.name}】(${cfg.method}) 列表 ${items.length} 篇${nicheTitleSkipped ? `（标题剔垂类 ${nicheTitleSkipped}）` : ''} → org=${cfg.org}`);

    if (!opts.execute) { totalNew += items.length; await hooks.setDone?.(idx + 1); continue; }
    if (!orgId || orgId === 'DRY-NEW') { await hooks.setDone?.(idx + 1); continue; }

    let companyNew = 0, nicheSkipped = 0;
    for (const it of items) {
      const urlHash = sha256(it.url);
      const exists = await prisma.companySource.findUnique({ where: { urlHash }, select: { id: true } });
      if (exists) { totalSkip++; continue; }

      const art = await fetchArticleText(it.url, { maxChars: 15000 });
      if (!art.ok || art.text.length < 200) { totalSkip++; continue; }

      let kw = { keywords: [] as string[], entities: [] as string[], topics: [] as string[], gist: '', isCoreAI: true, domain: 'general-ai' };
      try { kw = await extractContentKeywords(it.title, art.text, { contentType: `${cfg.name} 官方博客文章` }); }
      catch { /* 抽词失败仍落正文 */ }

      if (!kw.isCoreAI) { nicheSkipped++; totalSkip++; continue; }

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
            metadata: { keywords: kw.keywords, entities: kw.entities, contentTopics: kw.topics, domain: kw.domain, fullTextSource: 'jina', blogSource: cfg.name },
          },
        });
        companyNew++; totalNew++;
      } catch (e) {
        await log('warning', `[${cfg.name}] 落库失败 ${it.url}: ${(e as Error).message.slice(0, 80)}`);
      }
    }
    if (companyNew || nicheSkipped) await log('info', `   ✓ ${cfg.name} 新增 ${companyNew} 篇${nicheSkipped ? `，领域过滤剔除 ${nicheSkipped}` : ''}`);
    await hooks.setDone?.(idx + 1);
  }

  await log('info', `${opts.execute ? '已新增' : '将抓取'} ${totalNew} 篇${opts.execute ? `，跳过(已有/太薄) ${totalSkip}` : ''}`);
  return { totalNew, totalSkip };
}
