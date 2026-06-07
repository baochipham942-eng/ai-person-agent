/**
 * 三段式清洗编排器
 *
 * L0 (规则硬过滤): 复用 QAAgent, 但关掉关键词身份/相关性判定, 只做
 *                  必填字段 + 空内容 + 精确 hash 去重 + autofix。
 * L2 (模糊去重):   SimHash 近似去重 (转发/截断变体)。
 * L1 (语义判定):   gemini-flash 批量打分, 替代关键词判定 (是否关于本人/AI相关/质量)。
 * 审计:            每条决策写 QAAuditLog, 可回溯/度量/喂数据飞轮。
 *
 * 通过 ENABLE_SEMANTIC_QA 环境变量控制是否启用 L1 (默认启用; 设为 'false' 退回纯规则)。
 */

import { prisma } from '@/lib/db/prisma';
import type { NormalizedItem, PersonContext } from '@/lib/datasources/adapter';
import { qaAgent, QAResult } from './qa-agent';
import { dedupeBySimHash, DedupResult } from '@/lib/utils/dedup';
import { semanticQA, SemanticQAResult } from './semantic-qa';

export interface CleanOptions {
    existingUrlHashes?: Set<string>;
    enableSemantic?: boolean;
    persistAudit?: boolean;
    personId?: string;
    simhashThreshold?: number;
}

export interface CleanResult {
    approved: NormalizedItem[];
    l0: QAResult;
    dedup: DedupResult<NormalizedItem>;
    semantic: SemanticQAResult | null;
    stats: {
        input: number;
        l0Approved: number;
        afterDedup: number;
        approved: number;
        l0Rejected: number;
        dedupDropped: number;
        semanticRejected: number;
        semanticReview: number;
    };
}

interface AuditEntry {
    personId: string;
    url: string;
    urlHash: string;
    sourceType: string;
    stage: string;
    verdict: string;
    aboutPerson?: number;
    aiRelevant?: number;
    quality?: number;
    reason?: string;
}

const itemText = (i: NormalizedItem) => `${i.title || ''} ${i.text || ''}`.trim();

export async function cleanItems(
    items: NormalizedItem[],
    person: PersonContext,
    options: CleanOptions = {}
): Promise<CleanResult> {
    const enableSemantic = options.enableSemantic ?? (process.env.ENABLE_SEMANTIC_QA !== 'false');
    const audit: AuditEntry[] = [];
    const logAudit = (i: NormalizedItem, stage: string, verdict: string, extra?: Partial<AuditEntry>) => {
        if (!options.persistAudit || !options.personId) return;
        audit.push({ personId: options.personId, url: i.url, urlHash: i.urlHash, sourceType: i.sourceType, stage, verdict, ...extra });
    };

    // ---- L0: 规则硬过滤 (关掉关键词身份/相关性判定) ----
    const l0 = await qaAgent.check(items, person, options.existingUrlHashes ?? new Set(), {
        enableIdentityCheck: false,
        enableRelevanceCheck: false,
        confidenceThreshold: 0,
    });
    for (const r of l0.rejected) logAudit(r.item, 'L0', r.reason, { reason: r.details });

    // ---- L2: 模糊去重 ----
    const dedup = dedupeBySimHash(l0.approved, itemText, options.simhashThreshold ?? 3);
    for (const d of dedup.dropped) logAudit(d.item, 'L2', 'duplicate', { reason: `SimHash 近似(距离${d.distance})重复于: ${d.duplicateOf.url}` });

    // ---- L1: 语义判定 ----
    let semantic: SemanticQAResult | null = null;
    let approved: NormalizedItem[];

    if (enableSemantic && dedup.kept.length > 0) {
        semantic = await semanticQA(dedup.kept, person);
        for (const s of semantic.scored) {
            logAudit(s.item, 'L1', s.score.verdict, {
                aboutPerson: s.score.aboutPerson,
                aiRelevant: s.score.aiRelevant,
                quality: s.score.quality,
                reason: s.score.reason,
            });
        }
        approved = semantic.keep;
    } else {
        approved = dedup.kept;
        for (const i of dedup.kept) logAudit(i, 'L1', 'skipped', { reason: '语义清洗未启用' });
    }

    // ---- 持久化审计 ----
    if (options.persistAudit && options.personId && audit.length > 0) {
        try {
            await prisma.qAAuditLog.createMany({ data: audit });
        } catch (e) {
            console.warn(`[cleanItems] 审计日志写入失败: ${(e as Error).message?.slice(0, 120)}`);
        }
    }

    const stats = {
        input: items.length,
        l0Approved: l0.approved.length,
        afterDedup: dedup.kept.length,
        approved: approved.length,
        l0Rejected: l0.rejected.length,
        dedupDropped: dedup.dropped.length,
        semanticRejected: semantic?.reject.length ?? 0,
        semanticReview: semantic?.review.length ?? 0,
    };
    console.log(`[cleanItems] ${stats.input} -> L0 ${stats.l0Approved} -> 去重后 ${stats.afterDedup} -> 最终 ${stats.approved} (L0拒${stats.l0Rejected}/去重${stats.dedupDropped}/语义拒${stats.semanticRejected}/待审${stats.semanticReview})`);

    return { approved, l0, dedup, semantic, stats };
}
