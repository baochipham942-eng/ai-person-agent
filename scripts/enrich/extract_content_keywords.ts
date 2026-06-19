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
import { fetchExaContents } from '../../lib/datasources/exa';
import { extractContentKeywords } from '../../lib/ai/extract-keywords';

const DEFAULT_TYPES = ['official', 'personal_site', 'news', 'biography'];

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
    const need = rows.filter(r => !hasKeywords(r.metadata)).slice(0, opts.limit);
    console.log(`命中 ${rows.length} 条，缺关键词 ${rows.filter(r => !hasKeywords(r.metadata)).length} 条，本轮处理 ${need.length} 条`);

    // 可选：批量重抓全文（Exa /contents），仅当目标正文偏短/疑似截断时才重抓以省额度
    const rescraped = new Map<string, string>();
    if (opts.rescrape && opts.execute) {
        const urls = need
            .filter(r => /^https?:\/\//.test(r.url) && (r.text?.length ?? 0) >= 4500) // 接近 5000 截断的优先重抓
            .map(r => r.url);
        console.log(`[rescrape] 对 ${urls.length} 条疑似截断的正文重抓全文…`);
        for (let i = 0; i < urls.length; i += 50) {
            const batch = urls.slice(i, i + 50);
            const map = await fetchExaContents(batch, 12000);
            for (const [u, v] of map) if (v.text.length > 0) rescraped.set(u, v.text);
        }
        console.log(`[rescrape] 成功重抓 ${rescraped.size} 条`);
    }

    let done = 0;
    let textUpgraded = 0;
    for (let i = 0; i < need.length; i++) {
        const r = need[i];
        if (!opts.execute) { done++; continue; }

        const fuller = rescraped.get(r.url);
        const text = fuller && fuller.length > (r.text?.length ?? 0) ? fuller : (r.text ?? '');
        if (fuller && fuller.length > (r.text?.length ?? 0)) textUpgraded++;

        if (!text || text.length < 80) {
            // 正文太薄，跳过关键词提取（标记一下避免反复重试）
            await prisma.rawPoolItem.update({
                where: { id: r.id },
                data: { metadata: { ...metaRecord(r.metadata), keywords: [], keywordSkipped: 'text_too_short' } },
            });
            continue;
        }

        try {
            const kw = await extractContentKeywords(r.title, text, { contentType: '官方博客/文章' });
            await prisma.rawPoolItem.update({
                where: { id: r.id },
                data: {
                    text: text !== (r.text ?? '') ? text : undefined,
                    metadata: { ...metaRecord(r.metadata), keywords: kw.keywords, entities: kw.entities, contentTopics: kw.topics, gist: kw.gist },
                },
            });
            done++;
            if (!opts.quiet && done % 10 === 0) console.log(`  ${done}/${need.length}`);
        } catch (e) {
            console.warn(`  跳过 ${r.url}: ${(e as Error).message.slice(0, 120)}`);
        }
    }

    console.log(`\n📊 ${done} 条${opts.execute ? '已' : '将'}补关键词${opts.rescrape ? `，全文升级 ${textUpgraded} 条` : ''}`);
    if (!opts.execute) console.log(`（DRY-RUN，未写库。加 --execute 执行）`);

    await prisma.$disconnect();
    process.exit(0);
}

main().catch(async e => {
    console.error('脚本失败:', e);
    await prisma.$disconnect();
    process.exit(1);
});
