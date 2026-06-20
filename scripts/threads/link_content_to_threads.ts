/**
 * 内容（YouTube 字幕 / 官方博客文章）关键词 → 主题页 全自动挂载 (WS3)
 *
 * 扫已抽关键词的 RawPoolItem（youtube_caption / official / personal_site / news / biography），
 * 与 DB 里 KnowledgeThread 的 tags/aliases/title/slug 做相关性匹配，
 * 超阈值则全自动 upsert KnowledgeThreadSource(rawPoolItemId=...)，把内容挂到主题页。
 *
 * 全自动 = 无人工 review，靠相关性阈值兜底：
 *   - 低于 HIGH 阈值的挂载标记 metadata.excludedFromTopicReadiness=true（仍展示，不计入就绪度）
 *   - 一条内容最多挂 top-2 主题，避免一个视频铺满所有主题
 *
 * 前置：先跑 scripts/threads/seed_threads_to_db.ts --execute（要有 DB 主题行）。
 *
 * 用法：
 *   npx tsx scripts/threads/link_content_to_threads.ts                 # dry-run，看会挂什么
 *   npx tsx scripts/threads/link_content_to_threads.ts --execute
 *   选项：--limit N --min-score 1.2 --max-per-item 2 --types youtube_caption,official --quiet
 */

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });
loadEnv({ path: '.env.local' });

import { prisma } from '../../lib/db/prisma';
import { sha256 } from '../../lib/rawpool-identity';

const ARTICLE_TYPES = ['official', 'personal_site', 'news', 'biography'];

interface Options {
    execute: boolean;
    limit: number;
    minScore: number;
    highScore: number;
    maxPerItem: number;
    types: string[]; // 'youtube_caption' | article sourceTypes
    includeCompany: boolean; // 公司博客 CompanySource 是否也喂主题
    quiet: boolean;
}
function parseOptions(): Options {
    const a = process.argv.slice(2);
    const valOf = (f: string) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : undefined; };
    return {
        execute: a.includes('--execute'),
        limit: Number(valOf('--limit') ?? Number.MAX_SAFE_INTEGER),
        minScore: Number(valOf('--min-score') ?? 1.5),
        highScore: Number(valOf('--high-score') ?? 2.5),
        maxPerItem: Number(valOf('--max-per-item') ?? 2),
        types: (valOf('--types')?.split(',').map(s => s.trim()).filter(Boolean)) ?? ['youtube_caption', ...ARTICLE_TYPES],
        includeCompany: !a.includes('--no-company'), // 默认含公司博客
        quiet: a.includes('--quiet'),
    };
}

function metaRecord(m: unknown): Record<string, unknown> {
    return m && typeof m === 'object' && !Array.isArray(m) ? (m as Record<string, unknown>) : {};
}
// 归一化：小写、_-/→空格、收敛空白
function norm(s: string): string {
    return s.toLowerCase().replace(/[_\-/]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function significantWords(phrase: string): string[] {
    return norm(phrase).split(' ').filter(w => w.length >= 5);
}

interface ThreadVocab {
    id: string; slug: string; title: string;
    phrases: Set<string>;   // tags/aliases/title/slug 归一化短语
    words: Set<string>;     // 上述里的长词（>=5）
}

function buildThreadVocab(t: { id: string; slug: string; title: string; tags: string[]; aliases: string[] }): ThreadVocab {
    const raw = [...t.tags, ...t.aliases, t.title, t.slug];
    const phrases = new Set<string>();
    const words = new Set<string>();
    for (const r of raw) {
        const n = norm(r);
        if (n) phrases.add(n);
        for (const w of significantWords(r)) words.add(w);
    }
    return { id: t.id, slug: t.slug, title: t.title, phrases, words };
}

/**
 * 内容 term 集合 vs 主题词表 的加权匹配分。
 * 区分 phraseScore（短语级：精确/包含匹配，强信号）与 weakScore（仅共享单词，弱信号）。
 * 挂载判定只认 phraseScore——纯单词重叠（如视频里提一句 "reasoning"）不足以挂主题，
 * 避免全自动模式下的过匹配噪声。weakScore 仅作排序微调。
 */
function scoreMatch(terms: string[], vocab: ThreadVocab): { phraseScore: number; weakScore: number; matched: string[] } {
    const matched: string[] = [];
    let phraseScore = 0;
    let weakScore = 0;
    // 先对归一化后的 term 去重：同一概念（keywords 与 contentTopics 常重复出现）只计一次，
    // 否则 "reinforcement learning" 出现两次会虚增 2 分，把泛泛提一句的内容误判为强相关。
    const seen = new Set<string>();
    for (const termRaw of terms) {
        const term = norm(termRaw);
        if (!term || seen.has(term)) continue;
        seen.add(term);
        if (vocab.phrases.has(term)) { phraseScore += 1.0; matched.push(term); continue; }   // 短语精确
        // 短语包含：只对「多词关键词」生效，避免单个泛词（reasoning/agents）被当成多词 tag 子串而误命中
        const termIsPhrase = term.includes(' ');
        let medium = false;
        if (termIsPhrase) {
            for (const p of vocab.phrases) {
                if (p.length >= 5 && (p.includes(term) || term.includes(p))) { medium = true; break; }
            }
        }
        if (medium) { phraseScore += 0.6; matched.push(term); continue; }
        // 共享长词（弱信号，不计入挂载阈值）
        const tw = significantWords(term);
        if (tw.some(w => vocab.words.has(w))) weakScore += 0.3;
    }
    return {
        phraseScore: Math.round(phraseScore * 100) / 100,
        weakScore: Math.round(weakScore * 100) / 100,
        matched: Array.from(new Set(matched)).slice(0, 8),
    };
}

function roleForSource(sourceType: string, sourceKind: unknown): string {
    if (sourceKind === 'youtube_caption') return 'transcript_context';
    return 'signal';
}

async function main() {
    const opts = parseOptions();
    console.log(`=== 内容关键词 → 主题页 自动挂载 ===`);
    console.log(`模式: ${opts.execute ? 'EXECUTE' : 'DRY-RUN'} | min-score=${opts.minScore} high=${opts.highScore} max/item=${opts.maxPerItem} | 类型=[${opts.types.join(',')}]\n`);

    const threads = await prisma.knowledgeThread.findMany({ select: { id: true, slug: true, title: true, tags: true, aliases: true } });
    if (threads.length === 0) {
        console.error('DB 无 KnowledgeThread。请先跑 scripts/threads/seed_threads_to_db.ts --execute');
        process.exit(1);
    }
    const vocabs = threads.map(buildThreadVocab);
    console.log(`主题数 ${threads.length}`);

    // 取已抽关键词的内容
    const wantCaption = opts.types.includes('youtube_caption');
    const articleTypes = opts.types.filter(t => t !== 'youtube_caption');
    const orConds: any[] = [];
    if (wantCaption) orConds.push({ sourceType: 'youtube', metadata: { path: ['sourceKind'], equals: 'youtube_caption' } });
    if (articleTypes.length) orConds.push({ sourceType: { in: articleTypes } });

    const items = await prisma.rawPoolItem.findMany({
        where: { OR: orConds },
        select: { id: true, personId: true, sourceType: true, title: true, url: true, metadata: true },
    });
    const withKw = items.filter(it => Array.isArray(metaRecord(it.metadata).keywords) && (metaRecord(it.metadata).keywords as unknown[]).length > 0);
    console.log(`候选内容 ${items.length}，已抽关键词 ${withKw.length}\n`);

    const targets = withKw.slice(0, opts.limit);
    let linkCount = 0, itemLinked = 0, lowConf = 0;
    const perThread = new Map<string, number>();

    for (const it of targets) {
        const m = metaRecord(it.metadata);
        const terms = [
            ...((m.keywords as string[]) ?? []),
            ...((m.contentTopics as string[]) ?? []),
        ];
        // 对每个主题打分，只认 phraseScore 超阈值的，按 phraseScore(+弱信号微调) 取 top-N
        const scored = vocabs
            .map(v => ({ v, ...scoreMatch(terms, v) }))
            .filter(x => x.phraseScore >= opts.minScore)
            .sort((a, b) => (b.phraseScore + b.weakScore * 0.1) - (a.phraseScore + a.weakScore * 0.1))
            .slice(0, opts.maxPerItem);
        if (scored.length === 0) continue;
        itemLinked++;

        for (const s of scored) {
            const role = roleForSource(it.sourceType, m.sourceKind);
            const excluded = s.phraseScore < opts.highScore;
            if (excluded) lowConf++;
            const relevanceScore = Math.min(0.92, 0.4 + 0.1 * s.phraseScore);
            perThread.set(s.v.slug, (perThread.get(s.v.slug) ?? 0) + 1);
            linkCount++;

            if (!opts.execute) continue;
            await prisma.knowledgeThreadSource.upsert({
                where: { threadId_rawPoolItemId_role: { threadId: s.v.id, rawPoolItemId: it.id, role } },
                create: {
                    threadId: s.v.id, rawPoolItemId: it.id, role,
                    relevanceScore,
                    summary: typeof m.gist === 'string' && m.gist ? m.gist : null,
                    metadata: {
                        autoLinked: true,
                        autoLinkScore: s.phraseScore,
                        matchedTerms: s.matched,
                        excludedFromTopicReadiness: excluded,
                        linkedAt: new Date().toISOString(),
                    },
                },
                update: {
                    relevanceScore,
                    metadata: {
                        autoLinked: true,
                        autoLinkScore: s.phraseScore,
                        matchedTerms: s.matched,
                        excludedFromTopicReadiness: excluded,
                        linkedAt: new Date().toISOString(),
                    },
                },
            });
        }
    }

    // ===== 公司博客 CompanySource → 镜像成 KnowledgeSource → 挂主题 =====
    let companyLinked = 0, companyItems = 0;
    if (opts.includeCompany) {
        const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
        const orgName = new Map(orgs.map(o => [o.id, o.name]));
        const cs = await prisma.companySource.findMany({
            where: { sourceKind: 'official_blog_article' },
            select: { id: true, organizationId: true, title: true, url: true, text: true, publishedAt: true, summary: true, metadata: true },
        });
        const csKw = cs.filter(c => Array.isArray(metaRecord(c.metadata).keywords) && (metaRecord(c.metadata).keywords as unknown[]).length > 0);
        console.log(`\n公司博客候选 ${cs.length}，已抽关键词 ${csKw.length}`);
        for (const c of csKw.slice(0, opts.limit)) {
            const m = metaRecord(c.metadata);
            const terms = [...((m.keywords as string[]) ?? []), ...((m.contentTopics as string[]) ?? [])];
            const scored = vocabs.map(v => ({ v, ...scoreMatch(terms, v) }))
                .filter(x => x.phraseScore >= opts.minScore)
                .sort((a, b) => (b.phraseScore + b.weakScore * 0.1) - (a.phraseScore + a.weakScore * 0.1))
                .slice(0, opts.maxPerItem);
            if (!scored.length) continue;
            companyItems++;

            // 镜像成 KnowledgeSource（thread 源表，按 urlHash 幂等）
            let ksId: string | null = null;
            if (opts.execute) {
                const urlHash = sha256(c.url);
                const ks = await prisma.knowledgeSource.upsert({
                    where: { urlHash },
                    create: { sourceKind: 'official_blog_article', sourceOwner: orgName.get(c.organizationId) ?? null, title: c.title, url: c.url, urlHash, text: c.text, publishedAt: c.publishedAt, metadata: { mirroredFromCompanySource: c.id } },
                    update: { title: c.title, text: c.text },
                });
                ksId = ks.id;
            }
            for (const s of scored) {
                const role = 'signal';
                const excluded = s.phraseScore < opts.highScore;
                if (excluded) lowConf++;
                const relevanceScore = Math.min(0.92, 0.4 + 0.1 * s.phraseScore);
                perThread.set(s.v.slug, (perThread.get(s.v.slug) ?? 0) + 1);
                companyLinked++;
                if (!opts.execute || !ksId) continue;
                const linkMeta = { autoLinked: true, autoLinkScore: s.phraseScore, matchedTerms: s.matched, excludedFromTopicReadiness: excluded, fromCompanyBlog: true, linkedAt: new Date().toISOString() };
                await prisma.knowledgeThreadSource.upsert({
                    where: { threadId_sourceId_role: { threadId: s.v.id, sourceId: ksId, role } },
                    create: { threadId: s.v.id, sourceId: ksId, role, relevanceScore, summary: c.summary ?? (typeof m.gist === 'string' ? m.gist : null), metadata: linkMeta },
                    update: { relevanceScore, metadata: linkMeta },
                });
            }
        }
        console.log(`公司博客 ${companyItems} 篇${opts.execute ? '已' : '将'}挂载，共 ${companyLinked} 条关系`);
    }

    console.log(`📊 ${itemLinked} 条内容${opts.execute ? '已' : '将'}挂载，共 ${linkCount} 条挂载关系（低置信不计就绪度 ${lowConf}）`);
    const top = Array.from(perThread.entries()).sort((a, b) => b[1] - a[1]);
    console.log('按主题分布:');
    for (const [slug, n] of top) console.log(`  ${slug}: ${n}`);
    if (!opts.execute) console.log(`\n（DRY-RUN，未写库。加 --execute 执行）`);

    await prisma.$disconnect();
    process.exit(0);
}

main().catch(async e => { console.error('失败:', e); await prisma.$disconnect(); process.exit(1); });
