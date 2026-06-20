/**
 * 文章类内容关键词提取（官方博客/个人站/新闻/传记等）
 *
 * 现状：official/personal_site 等文章正文大多已在库（Exa 抓取，截断 5000 字），
 * 但 metadata.keywords 全为空 → 无法被主题页等模块交叉引用。本脚本补关键词，
 * 可选 --rescrape 用 Exa /contents 把截断/摘要正文重抓成更完整全文。
 *
 * 用法：
 *   npx tsx scripts/enrich/extract_content_keywords.ts                 # dry-run（默认类型）
 *   npx tsx scripts/enrich/extract_content_keywords.ts --execute
 *   npx tsx scripts/enrich/extract_content_keywords.ts --execute --rescrape   # 同时重抓全文
 *   npx tsx scripts/enrich/extract_content_keywords.ts --types official,personal_site,news,exa --execute
 *   选项：--limit N --person <name|id> --quiet
 *
 * 注：必须用 npx tsx（bun 下 Prisma 原生引擎在本机有代码签名 Team ID 冲突）。
 */

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });
loadEnv({ path: '.env.local' });

import { prisma } from '../../lib/db/prisma';
import { fetchArticleText } from '../../lib/datasources/jina-reader';
import { extractContentKeywords } from '../../lib/ai/extract-keywords';

// 兜底：Jina 抓取较慢有空闲，Neon WebSocket 可能断连抛未捕获 'error' 杀进程
process.on('unhandledRejection', e => console.warn('[unhandledRejection]', String(e).slice(0, 160)));
process.on('uncaughtException', e => console.warn('[uncaughtException]', String(e).slice(0, 160)));

const DEFAULT_TYPES = ['official', 'personal_site', 'news', 'biography'];
// 正文残缺判定：偏薄（落地页/摘要）或卡在 5000 截断（长文后半截没抓到）
const THIN_MAX = 800;
const TRUNCATED_MIN = 4900;
function isIncomplete(len: number): boolean {
    return len < THIN_MAX || len >= TRUNCATED_MIN;
}

interface Options {
    execute: boolean;
    rescrape: boolean;
    types: string[];
    limit: number;
    person?: string;
    quiet: boolean;
}

function parseOptions(): Options {
    const a = process.argv.slice(2);
    const valOf = (flag: string) => {
        const i = a.indexOf(flag);
        return i >= 0 ? a[i + 1] : undefined;
    };
    return {
        execute: a.includes('--execute'),
        rescrape: a.includes('--rescrape'),
        types: (valOf('--types')?.split(',').map(s => s.trim()).filter(Boolean)) ?? DEFAULT_TYPES,
        limit: Number(valOf('--limit') ?? Number.MAX_SAFE_INTEGER),
        person: valOf('--person'),
        quiet: a.includes('--quiet'),
    };
}

function metaRecord(m: unknown): Record<string, unknown> {
    return m && typeof m === 'object' && !Array.isArray(m) ? (m as Record<string, unknown>) : {};
}
function hasKeywords(m: unknown): boolean {
    const kw = metaRecord(m).keywords;
    return Array.isArray(kw) && kw.length > 0;
}

async function resolvePersonId(name: string): Promise<string | null> {
    const p = await prisma.people.findFirst({
        where: { OR: [{ id: name }, { name }, { aliases: { has: name } }] },
        select: { id: true },
    });
    return p?.id ?? null;
}

async function main() {
    const opts = parseOptions();
    const personFilter = opts.person ? await resolvePersonId(opts.person) : null;
    if (opts.person && !personFilter) {
        console.error(`找不到人物：${opts.person}`);
        process.exit(1);
    }

    console.log(`=== 文章类内容关键词提取 ===`);
    console.log(`模式: ${opts.execute ? 'EXECUTE' : 'DRY-RUN'}${opts.rescrape ? ' +rescrape' : ''} | 类型=[${opts.types.join(',')}]${personFilter ? ` | 人物=${opts.person}` : ''}\n`);

    const rows = await prisma.rawPoolItem.findMany({
        where: { sourceType: { in: opts.types }, ...(personFilter ? { personId: personFilter } : {}) },
        select: { id: true, url: true, title: true, text: true, metadata: true },
    });

    // 两种模式：
    //   --rescrape：按正文残缺度选目标（薄/截断），Jina 重抓全文 → 更新正文 → 重抽关键词
    //   默认：缺关键词的条目，用现有正文抽关键词
    const need = (opts.rescrape
        ? rows.filter(r =>
            /^https?:\/\//.test(r.url)
            && isIncomplete(r.text?.length ?? 0)
            && metaRecord(r.metadata).rescrapeStatus !== 'failed') // 上轮重抓失败的不反复试
        : rows.filter(r => !hasKeywords(r.metadata))
    ).slice(0, opts.limit);

    if (opts.rescrape) {
        const incomplete = rows.filter(r => /^https?:\/\//.test(r.url) && isIncomplete(r.text?.length ?? 0)).length;
        console.log(`命中 ${rows.length} 条，正文残缺(薄/截断) ${incomplete} 条，本轮重抓 ${need.length} 条（Jina）`);
    } else {
        console.log(`命中 ${rows.length} 条，缺关键词 ${rows.filter(r => !hasKeywords(r.metadata)).length} 条，本轮处理 ${need.length} 条`);
    }

    let done = 0;
    let textUpgraded = 0;
    for (let i = 0; i < need.length; i++) {
        const r = need[i];
        const oldLen = r.text?.length ?? 0;
        if (!opts.execute) { done++; continue; }

        // rescrape 模式：先 Jina 抓全文
        let text = r.text ?? '';
        if (opts.rescrape) {
            const fetched = await fetchArticleText(r.url, { maxChars: 15000 });
            if (fetched.ok && fetched.text.length > oldLen) {
                text = fetched.text;
                textUpgraded++;
            } else if (!fetched.ok) {
                // 抓取失败：标记避免下轮反复试
                try {
                    await prisma.rawPoolItem.update({
                        where: { id: r.id },
                        data: { metadata: { ...metaRecord(r.metadata), rescrapeStatus: 'failed' } },
                    });
                } catch { /* ignore */ }
            }
        }

        if (!text || text.length < 80) continue;

        try {
            const kw = await extractContentKeywords(r.title, text, { contentType: '官方博客/文章' });
            await prisma.rawPoolItem.update({
                where: { id: r.id },
                data: {
                    text: text !== (r.text ?? '') ? text : undefined,
                    metadata: {
                        ...metaRecord(r.metadata),
                        keywords: kw.keywords, entities: kw.entities, contentTopics: kw.topics, gist: kw.gist,
                        ...(opts.rescrape && text !== (r.text ?? '') ? { rescrapeStatus: 'ok', fullTextSource: 'jina' } : {}),
                    },
                },
            });
            done++;
            if (!opts.quiet && done % 5 === 0) console.log(`  ${done}/${need.length}（全文升级 ${textUpgraded}）`);
        } catch (e) {
            console.warn(`  跳过 ${r.url}: ${(e as Error).message.slice(0, 120)}`);
        }
    }

    console.log(`\n📊 ${done} 条${opts.execute ? '已' : '将'}处理${opts.rescrape ? `，全文升级 ${textUpgraded} 条` : '（补关键词）'}`);
    if (!opts.execute) console.log(`（DRY-RUN，未写库。加 --execute 执行）`);

    await prisma.$disconnect();
    process.exit(0);
}

main().catch(async e => {
    console.error('脚本失败:', e);
    await prisma.$disconnect();
    process.exit(1);
});
