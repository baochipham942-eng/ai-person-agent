/**
 * 把 11 个 source-pack fixture 主题落库（KnowledgeThread + KnowledgeSource +
 * KnowledgeThreadSource + KnowledgeThreadEdge），让 hasKnowledgeThreadStore 之后
 * 走 DB 渲染——这是「内容自动挂主题页」(WS3) 的前置：没有 DB 主题行，
 * 自动挂的 KnowledgeThreadSource 无处可指。
 *
 * ⚠️ 写的是共享 Neon 生产库。脚本满足：
 *   - 幂等（按 slug / urlHash upsert，可重复跑）
 *   - --verify：逐 slug 对比 fixture 渲染 vs DB 渲染的展示字段，证明 parity
 *   - --teardown：删除本脚本落的 11 主题全部数据，恢复 fixture 渲染
 *
 * loop-engineering 是静态 TS fixture（非 source-pack），不在落库范围，保持原样。
 *
 * 用法：
 *   npx tsx scripts/threads/seed_threads_to_db.ts --verify        # 只对比，不写（若库已空则提示先 seed）
 *   npx tsx scripts/threads/seed_threads_to_db.ts --execute       # 落库
 *   npx tsx scripts/threads/seed_threads_to_db.ts --execute --verify
 *   npx tsx scripts/threads/seed_threads_to_db.ts --teardown --execute
 */

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });
loadEnv({ path: '.env.local' });

import { prisma } from '../../lib/db/prisma';
import { sha256 } from '../../lib/rawpool-identity';
import { getSourcePackFixture, fetchKnowledgeThreadPage, SOURCE_PACK_SLUGS, getSourcePacks } from '../../lib/knowledge-threads';

interface Options { execute: boolean; verify: boolean; teardown: boolean; }
function parseOptions(): Options {
    const a = process.argv.slice(2);
    return { execute: a.includes('--execute'), verify: a.includes('--verify'), teardown: a.includes('--teardown') };
}

function firstText(value: string, length: number): string {
    const text = (value || '').replace(/\s+/g, ' ').trim();
    return text.length <= length ? text : `${text.slice(0, length - 1)}...`;
}
// 复刻 getSourcePackFixture 的 evidenceNote 优先级，写进 threadLink.whyRelevant
// 让 DB 渲染（whyRelevant 优先）与 fixture 渲染（reviewNotes 优先）结果一致
function fixtureEvidenceNote(s: any): string {
    return s.reviewNotes || s.evidenceQuote || s.whyRelevant || firstText(s.text || '', 180);
}
function fixtureSummary(s: any): string {
    return s.whyRelevant || firstText(s.text || '', 180);
}

async function teardown() {
    const slugs = SOURCE_PACK_SLUGS;
    const threads = await prisma.knowledgeThread.findMany({ where: { slug: { in: slugs } }, select: { id: true } });
    const threadIds = threads.map(t => t.id);

    const e = await prisma.knowledgeThreadEdge.deleteMany({ where: { threadId: { in: threadIds } } });
    const ts = await prisma.knowledgeThreadSource.deleteMany({ where: { threadId: { in: threadIds } } });
    const t = await prisma.knowledgeThread.deleteMany({ where: { id: { in: threadIds } } });
    // 按 seededFrom 标记删源，兼容新旧 urlHash 方案
    const ks = await prisma.knowledgeSource.deleteMany({ where: { metadata: { path: ['seededFrom'], equals: 'fixture' } } });
    console.log(`teardown: edges ${e.count}, threadSources ${ts.count}, threads ${t.count}, sources ${ks.count}`);
}

async function seed() {
    const packs = getSourcePacks();
    for (const pack of packs) {
        const t = pack.thread;
        const thread = await prisma.knowledgeThread.upsert({
            where: { slug: t.slug },
            create: {
                slug: t.slug,
                title: t.title,
                summary: t.definitionDraft,
                whyNow: t.whyNow ?? null,
                status: t.status ?? 'review_ready',
                category: t.category ?? null,
                tags: t.tags ?? [],
                aliases: t.aliases ?? [],
                confidence: 0.75,
                lastReviewedAt: t.updatedAt ? new Date(t.updatedAt) : new Date(),
            },
            update: {
                title: t.title, summary: t.definitionDraft, whyNow: t.whyNow ?? null,
                status: t.status ?? 'review_ready', category: t.category ?? null,
                tags: t.tags ?? [], aliases: t.aliases ?? [],
            },
        });

        // fixtureSourceId -> KnowledgeSource.id
        const idMap = new Map<string, string>();
        for (const s of pack.sources as any[]) {
            // 按 (主题,fixture源id) 生成唯一 urlHash：fixture 按 pack 独立渲染，
            // 同一 URL 在不同主题（或同 pack 内不同条目）各算一条，不能全局按 url 去重，
            // 否则共享源/同 url 条目会被折叠（owner 串味或真丢源），破坏 parity。
            const urlHash = sha256(`${t.slug}\t${s.id}`);
            const ks = await prisma.knowledgeSource.upsert({
                where: { urlHash },
                create: {
                    sourceKind: s.sourceKind || 'unknown',
                    sourceOwner: s.sourceOwner ?? null,
                    title: s.title || s.id,
                    url: s.url,
                    urlHash,
                    text: s.text || '',
                    publishedAt: typeof s.publishedAt === 'string' ? new Date(s.publishedAt) : null,
                    metadata: { textStatus: s.metadata?.textStatus ?? null, seededFrom: 'fixture' },
                },
                update: { title: s.title || s.id, text: s.text || '', sourceKind: s.sourceKind || 'unknown', sourceOwner: s.sourceOwner ?? null },
            });
            idMap.set(s.id, ks.id);

            const role = (s.metadata?.role || s.role) as string;
            await prisma.knowledgeThreadSource.upsert({
                where: { threadId_sourceId_role: { threadId: thread.id, sourceId: ks.id, role } },
                create: {
                    threadId: thread.id, sourceId: ks.id, role,
                    relevanceScore: Number(s.confidence) || 0.8,
                    summary: fixtureSummary(s),
                    evidenceQuote: s.evidenceQuote ?? null,
                    metadata: { whyRelevant: fixtureEvidenceNote(s), reviewNotes: s.reviewNotes ?? null, status: s.status ?? 'usable', seededFrom: 'fixture' },
                },
                update: {
                    relevanceScore: Number(s.confidence) || 0.8,
                    summary: fixtureSummary(s),
                    metadata: { whyRelevant: fixtureEvidenceNote(s), reviewNotes: s.reviewNotes ?? null, status: s.status ?? 'usable', seededFrom: 'fixture' },
                },
            });
        }

        let edgeCount = 0;
        for (const e of pack.edges as any[]) {
            const fromId = idMap.get(e.fromId || e.fromSourceId);
            const toId = idMap.get(e.toId || e.toSourceId);
            if (!fromId || !toId) continue; // 边引用了不存在的源，跳过
            await prisma.knowledgeThreadEdge.upsert({
                where: { id: `seed_${thread.id}_${e.fromId || e.fromSourceId}_${e.toId || e.toSourceId}`.slice(0, 191) },
                create: {
                    id: `seed_${thread.id}_${e.fromId || e.fromSourceId}_${e.toId || e.toSourceId}`.slice(0, 191),
                    threadId: thread.id, fromSourceId: fromId, toSourceId: toId,
                    relationType: e.relationType, confidence: Number(e.confidence) || 0.7,
                    evidenceNote: e.evidenceNote ?? null,
                },
                update: { relationType: e.relationType, confidence: Number(e.confidence) || 0.7, evidenceNote: e.evidenceNote ?? null },
            });
            edgeCount++;
        }
        console.log(`  ✓ ${t.slug}: sources ${pack.sources.length}, edges ${edgeCount}`);
    }
}

async function verify() {
    console.log('\n=== Parity 校验：fixture 渲染 vs DB 渲染 ===');
    let allOk = true;
    for (const slug of SOURCE_PACK_SLUGS) {
        const fixturePage = getSourcePackFixture(slug);
        const dbPage = await fetchKnowledgeThreadPage(slug);
        if (!fixturePage || !dbPage) { console.log(`  ⚠️ ${slug}: 缺页 fixture=${!!fixturePage} db=${!!dbPage}`); allOk = false; continue; }

        const norm = (page: any) =>
            (page.sources as any[])
                .map(s => `${s.role}|${s.sourceKind}|${s.title}|${s.owner}|${s.url ?? ''}|${s.status}|${Number(s.confidence).toFixed(2)}`)
                .sort();
        const fSrc = norm(fixturePage), dSrc = norm(dbPage);
        const fEdges = (fixturePage.edges as any[]).map(e => `${e.relationType}`).sort();
        const dEdges = (dbPage.edges as any[]).map(e => `${e.relationType}`).sort();

        const srcMatch = JSON.stringify(fSrc) === JSON.stringify(dSrc);
        const edgeMatch = JSON.stringify(fEdges) === JSON.stringify(dEdges);
        const titleMatch = fixturePage.title === dbPage.title && fixturePage.summary === dbPage.summary;

        if (srcMatch && edgeMatch && titleMatch) {
            console.log(`  ✅ ${slug}: 源 ${dSrc.length} / 边 ${dEdges.length} 完全一致`);
        } else {
            allOk = false;
            console.log(`  ❌ ${slug}: src=${srcMatch}(${fSrc.length}->${dSrc.length}) edge=${edgeMatch}(${fEdges.length}->${dEdges.length}) title/summary=${titleMatch}`);
            if (!srcMatch) {
                const missing = fSrc.filter(x => !dSrc.includes(x)).slice(0, 3);
                const extra = dSrc.filter(x => !fSrc.includes(x)).slice(0, 3);
                if (missing.length) console.log(`     fixture有DB无:`, missing);
                if (extra.length) console.log(`     DB有fixture无:`, extra);
            }
        }
    }
    console.log(allOk ? '\n✅ Parity 全部通过' : '\n❌ 存在 parity 差异，见上');
    return allOk;
}

async function main() {
    const opts = parseOptions();
    if (opts.teardown) {
        if (!opts.execute) { console.log('teardown 需要 --execute'); process.exit(1); }
        await teardown();
        await prisma.$disconnect(); process.exit(0);
    }
    if (opts.execute) {
        console.log('=== 落库 11 个 source-pack 主题 ===');
        await seed();
    } else if (!opts.verify) {
        console.log('dry-run：加 --execute 落库，或 --verify 校验。当前不做任何写入。');
    }
    if (opts.verify) await verify();
    await prisma.$disconnect();
    process.exit(0);
}

main().catch(async e => { console.error('失败:', e); await prisma.$disconnect(); process.exit(1); });
