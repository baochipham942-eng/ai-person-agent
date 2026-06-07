/**
 * 存量数据重洗: 用新清洗层 (L1 语义 + L2 模糊去重) 重新评估已入库的 RawPoolItem。
 *
 * 这些 item 当初由旧的关键词 QA 放进来 (门槛形同虚设), 用新标准重新打分,
 * 量化脏数据率, 写 QAAuditLog。
 *
 * 默认: 审计模式 (只打分+写日志+报告, 不删数据)。
 * --prune: 删除被判 reject / duplicate 的 item (破坏性!)。
 * --limit=N: 只处理前 N 个 ready 人物 (按 viewCount 降序), 用于抽样。
 *
 * 用法:
 *   npx tsx scripts/enrich/rewash_existing.ts --limit=5     # 抽样审计
 *   npx tsx scripts/enrich/rewash_existing.ts               # 全量审计
 *   npx tsx scripts/enrich/rewash_existing.ts --prune       # 全量 + 删脏数据
 */
import 'dotenv/config';
import { prisma } from '../../lib/db/prisma';
import { cleanItems } from '../../lib/agents/clean-orchestrator';
import type { NormalizedItem, PersonContext } from '../../lib/datasources/adapter';

const PRUNE = process.argv.includes('--prune');
const limitArg = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;

function toNormalized(it: any): NormalizedItem {
    const meta = (it.metadata || {}) as Record<string, any>;
    return {
        url: it.url,
        urlHash: it.urlHash,
        contentHash: it.contentHash || '',
        title: it.title || '',
        text: it.text || '',
        publishedAt: it.publishedAt,
        sourceType: it.sourceType,
        isOfficial: meta.isOfficial === true,
        confidence: typeof meta.confidence === 'number' ? meta.confidence : 80,
        metadata: meta,
    };
}

async function main() {
    const people = await prisma.people.findMany({
        where: { status: 'ready' },
        orderBy: { viewCount: 'desc' },
        take: LIMIT,
        select: { id: true, name: true, aliases: true, organization: true, occupation: true },
    });

    console.log(`\n${PRUNE ? '🔴 PRUNE 模式 (会删脏数据)' : '🟢 审计模式 (不删数据)'} | 处理 ${people.length} 人\n`);

    const agg = { input: 0, keep: 0, reject: 0, review: 0, dup: 0, l0: 0, pruned: 0 };

    for (const p of people) {
        const rawItems = await prisma.rawPoolItem.findMany({ where: { personId: p.id } });
        if (rawItems.length === 0) continue;

        const items = rawItems.map(toNormalized);
        const ctx: PersonContext = {
            id: p.id, name: p.name, englishName: p.name,
            aliases: p.aliases || [], organizations: p.organization || [], occupations: p.occupation || [],
        };

        const result = await cleanItems(items, ctx, { persistAudit: true, personId: p.id, enableSemantic: true });

        agg.input += result.stats.input;
        agg.keep += result.stats.approved;
        agg.reject += result.stats.semanticRejected;
        agg.review += result.stats.semanticReview;
        agg.dup += result.stats.dedupDropped;
        agg.l0 += result.stats.l0Rejected;

        const dirtyRate = result.stats.input > 0 ? Math.round((1 - result.stats.approved / result.stats.input) * 100) : 0;
        console.log(`  ${p.name}: ${result.stats.input} -> 保留 ${result.stats.approved} (脏 ${dirtyRate}%: L0拒${result.stats.l0Rejected}/去重${result.stats.dedupDropped}/语义拒${result.stats.semanticRejected}/待审${result.stats.semanticReview})`);

        if (PRUNE) {
            // 删除 reject 的 item (semantic verdict=reject) + L2 重复
            const rejectUrls = new Set([
                ...(result.semantic?.reject.map(r => r.item.urlHash) ?? []),
                ...result.dedup.dropped.map(d => d.item.urlHash),
            ]);
            if (rejectUrls.size > 0) {
                const del = await prisma.rawPoolItem.deleteMany({ where: { personId: p.id, urlHash: { in: [...rejectUrls] } } });
                agg.pruned += del.count;
            }
        }
    }

    const totalDirty = agg.input > 0 ? Math.round((1 - agg.keep / agg.input) * 100) : 0;
    console.log(`\n=== 汇总 ===`);
    console.log(`  总 item: ${agg.input}`);
    console.log(`  保留: ${agg.keep} (${100 - totalDirty}%)`);
    console.log(`  脏数据: ${agg.input - agg.keep} (${totalDirty}%) = L0拒${agg.l0} + 去重${agg.dup} + 语义拒${agg.reject} + 待审${agg.review}`);
    if (PRUNE) console.log(`  已删除: ${agg.pruned} 条`);
    else console.log(`  (审计模式, 未删。加 --prune 删除 reject+重复)`);
    console.log(`  QAAuditLog 已写入, 可查 verdict 分布`);
    process.exit(0);
}
main().catch(e => { console.error('ERR:', e.message || e); process.exit(1); });
