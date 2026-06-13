/**
 * 存量数据重洗: 用新清洗层重新评估已入库的 RawPoolItem。
 *
 * 默认只审计未写过 QAAuditLog 的 ready 人员, 支持中断后重跑。
 * 全程使用 Neon serverless raw SQL, 避开 Prisma native engine 在 Bun/macOS 下的签名冲突。
 *
 * 默认: 审计模式 (只打分 + 写 QAAuditLog, 不删数据)。
 * --limit=N: 只处理前 N 个待审人物。
 * --concurrency=N: 并发处理人物数, 默认 1。
 * --semantic-concurrency=N: 单个人内部 LLM 批次并发数, 默认 1。
 * --semantic-delay-ms=N: 语义批次窗口间隔, 默认 4500ms, 避免中转站 15 req/min 限流。
 * --person=NAME_OR_ID: 只处理指定人物。
 * --include-audited --allow-duplicates: 包含已审人物并允许重复写日志。
 * --list: 只列待审人员, 不跑 LLM。
 * --dry-run: 跑清洗但不写 QAAuditLog、不删数据。
 * --prune --yes-prune: 删除被判 reject / duplicate 的 item (破坏性!)。
 *
 * 用法:
 *   bun scripts/enrich/rewash_existing.ts --list
 *   bun scripts/enrich/rewash_existing.ts --limit=5 --dry-run
 *   bun scripts/enrich/rewash_existing.ts
 *   bun scripts/enrich/rewash_existing.ts --prune --yes-prune
 */
import 'dotenv/config';
import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';
import { qaAgent } from '../../lib/agents/qa-agent';
import { semanticQA, type SemanticQAConfig } from '../../lib/agents/semantic-qa';
import { dedupeBySimHash } from '../../lib/utils/dedup';
import type { NormalizedItem, PersonContext, SourceType } from '../../lib/datasources/adapter';

type DbPerson = {
    id: string;
    name: string;
    aliases: string[] | null;
    organization: string[] | null;
    occupation: string[] | null;
    raw_count: number;
    audit_count: number;
};

type DbRawItem = {
    id: string;
    sourceType: string;
    url: string;
    urlHash: string;
    contentHash: string;
    title: string;
    text: string;
    publishedAt: Date | string | null;
    metadata: Record<string, unknown> | null;
};

type AuditEntry = {
    id: string;
    personId: string;
    url: string;
    urlHash: string;
    sourceType: string;
    stage: string;
    verdict: string;
    aboutPerson: number | null;
    aiRelevant: number | null;
    quality: number | null;
    reason: string | null;
};

type PersonResult = {
    person: string;
    ok: boolean;
    input: number;
    keep: number;
    reject: number;
    review: number;
    dup: number;
    l0: number;
    auditRows: number;
    pruned: number;
    error?: string;
};

const args = process.argv.slice(2);

function readNumberArg(name: string, fallback?: number): number | undefined {
    const raw = args.find(a => a.startsWith(`--${name}=`));
    if (!raw) return fallback;
    const value = Number(raw.split('=')[1]);
    if (!Number.isFinite(value) || value < 0) throw new Error(`--${name} 必须是非负数字`);
    return value;
}

function readStringArg(name: string): string | undefined {
    return args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

const PRUNE = args.includes('--prune');
const CONFIRM_PRUNE = args.includes('--yes-prune');
const DRY_RUN = args.includes('--dry-run');
const LIST_ONLY = args.includes('--list');
const INCLUDE_AUDITED = args.includes('--include-audited');
const ALLOW_DUPLICATES = args.includes('--allow-duplicates');
const LIMIT = readNumberArg('limit');
const CONCURRENCY = Math.max(1, readNumberArg('concurrency', 1) ?? 1);
const SEMANTIC_CONCURRENCY = Math.max(1, readNumberArg('semantic-concurrency', 1) ?? 1);
const SEMANTIC_DELAY_MS = readNumberArg('semantic-delay-ms', 4500) ?? 4500;
const PERSON = readStringArg('person');

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
if (PRUNE && !CONFIRM_PRUNE) throw new Error('--prune 是破坏性操作, 需要同时传 --yes-prune');
if (INCLUDE_AUDITED && !DRY_RUN && !ALLOW_DUPLICATES) {
    throw new Error('--include-audited 会重复写 QAAuditLog, 写库时需要同时传 --allow-duplicates');
}

const sql = neon(process.env.DATABASE_URL);

function toNormalized(it: DbRawItem): NormalizedItem {
    const meta = (it.metadata || {}) as Record<string, unknown>;
    return {
        url: it.url || '',
        urlHash: it.urlHash || '',
        contentHash: it.contentHash || '',
        title: it.title || '',
        text: it.text || '',
        publishedAt: it.publishedAt ? new Date(it.publishedAt) : null,
        sourceType: it.sourceType as SourceType,
        isOfficial: meta.isOfficial === true,
        confidence: typeof meta.confidence === 'number' ? meta.confidence : 80,
        metadata: meta,
    };
}

function itemText(i: NormalizedItem): string {
    return `${i.title || ''} ${i.text || ''}`.trim();
}

function auditRow(
    item: NormalizedItem,
    personId: string,
    stage: string,
    verdict: string,
    extra: Partial<Omit<AuditEntry, 'id' | 'personId' | 'url' | 'urlHash' | 'sourceType' | 'stage' | 'verdict'>> = {}
): AuditEntry {
    return {
        id: crypto.randomUUID(),
        personId,
        url: item.url || '',
        urlHash: item.urlHash || '',
        sourceType: item.sourceType,
        stage,
        verdict,
        aboutPerson: extra.aboutPerson ?? null,
        aiRelevant: extra.aiRelevant ?? null,
        quality: extra.quality ?? null,
        reason: extra.reason ?? null,
    };
}

async function fetchPeople(): Promise<DbPerson[]> {
    const limit = LIMIT ?? 100000;
    const person = PERSON ?? null;
    const personLike = PERSON ? `%${PERSON}%` : null;
    return await sql`
        SELECT
            p.id,
            p.name,
            p.aliases,
            p.organization,
            p.occupation,
            COUNT(r.id)::int AS raw_count,
            COALESCE(q.audit_count, 0)::int AS audit_count
        FROM "People" p
        JOIN "RawPoolItem" r ON r."personId" = p.id
        LEFT JOIN (
            SELECT "personId", COUNT(*)::int AS audit_count
            FROM "QAAuditLog"
            GROUP BY "personId"
        ) q ON q."personId" = p.id
        WHERE p.status = ${'ready'}
          AND (${INCLUDE_AUDITED}::boolean OR q."personId" IS NULL)
          AND (${person}::text IS NULL OR p.id = ${person} OR p.name ILIKE ${personLike})
        GROUP BY p.id, q.audit_count
        ORDER BY p."viewCount" DESC
        LIMIT ${limit}
    ` as DbPerson[];
}

async function fetchRawItems(personId: string): Promise<DbRawItem[]> {
    return await sql`
        SELECT id, "sourceType", url, "urlHash", "contentHash", title, text, "publishedAt", metadata
        FROM "RawPoolItem"
        WHERE "personId" = ${personId}
        ORDER BY "fetchedAt" DESC
    ` as DbRawItem[];
}

async function insertAudit(entries: AuditEntry[]): Promise<void> {
    if (DRY_RUN || entries.length === 0) return;

    for (let i = 0; i < entries.length; i += 500) {
        const chunk = entries.slice(i, i + 500);
        await sql`
            INSERT INTO "QAAuditLog"
                (id, "personId", url, "urlHash", "sourceType", stage, verdict, "aboutPerson", "aiRelevant", quality, reason)
            SELECT *
            FROM unnest(
                ${chunk.map(e => e.id)}::text[],
                ${chunk.map(e => e.personId)}::text[],
                ${chunk.map(e => e.url)}::text[],
                ${chunk.map(e => e.urlHash)}::text[],
                ${chunk.map(e => e.sourceType)}::text[],
                ${chunk.map(e => e.stage)}::text[],
                ${chunk.map(e => e.verdict)}::text[],
                ${chunk.map(e => e.aboutPerson)}::double precision[],
                ${chunk.map(e => e.aiRelevant)}::double precision[],
                ${chunk.map(e => e.quality)}::double precision[],
                ${chunk.map(e => e.reason)}::text[]
            )
        `;
    }
}

async function pruneItems(personId: string, urlHashes: string[]): Promise<number> {
    if (!PRUNE || DRY_RUN || urlHashes.length === 0) return 0;
    const rows = await sql`
        DELETE FROM "RawPoolItem"
        WHERE "personId" = ${personId}
          AND "urlHash" = ANY(${urlHashes}::text[])
        RETURNING id
    `;
    return rows.length;
}

async function auditPerson(p: DbPerson): Promise<PersonResult> {
    try {
        const rawItems = await fetchRawItems(p.id);
        const items = rawItems.map(toNormalized);
        const ctx: PersonContext = {
            id: p.id,
            name: p.name,
            englishName: p.name,
            aliases: p.aliases || [],
            organizations: p.organization || [],
            occupations: p.occupation || [],
        };

        const audit: AuditEntry[] = [];

        const l0 = await qaAgent.check(items, ctx, new Set(), {
            enableIdentityCheck: false,
            enableRelevanceCheck: false,
            confidenceThreshold: 0,
        });
        for (const r of l0.rejected) {
            audit.push(auditRow(r.item, p.id, 'L0', r.reason, { reason: r.details }));
        }

        const dedup = dedupeBySimHash(l0.approved, itemText, 3);
        for (const d of dedup.dropped) {
            audit.push(auditRow(d.item, p.id, 'L2', 'duplicate', {
                reason: `SimHash 近似(距离${d.distance})重复于: ${d.duplicateOf.url}`,
            }));
        }

        const semanticConfig: Partial<SemanticQAConfig> = {
            concurrency: SEMANTIC_CONCURRENCY,
            requestDelayMs: SEMANTIC_DELAY_MS,
        };
        const semantic = dedup.kept.length > 0
            ? await semanticQA(dedup.kept, ctx, semanticConfig)
            : { scored: [], keep: [], reject: [], review: [], stats: { total: 0, keep: 0, reject: 0, review: 0, failedBatches: 0 } };

        for (const s of semantic.scored) {
            audit.push(auditRow(s.item, p.id, 'L1', s.score.verdict, {
                aboutPerson: s.score.aboutPerson,
                aiRelevant: s.score.aiRelevant,
                quality: s.score.quality,
                reason: s.score.reason,
            }));
        }

        await insertAudit(audit);

        const rejectUrls = new Set([
            ...semantic.reject.map(r => r.item.urlHash),
            ...dedup.dropped.map(d => d.item.urlHash),
        ]);
        const pruned = await pruneItems(p.id, [...rejectUrls]);

        return {
            person: p.name,
            ok: true,
            input: items.length,
            keep: semantic.keep.length,
            reject: semantic.reject.length,
            review: semantic.review.length,
            dup: dedup.dropped.length,
            l0: l0.rejected.length,
            auditRows: audit.length,
            pruned,
        };
    } catch (e) {
        return {
            person: p.name,
            ok: false,
            input: 0,
            keep: 0,
            reject: 0,
            review: 0,
            dup: 0,
            l0: 0,
            auditRows: 0,
            pruned: 0,
            error: e instanceof Error ? e.message : String(e),
        };
    }
}

async function runPool<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const results: R[] = [];
    let next = 0;
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (next < items.length) {
            const index = next++;
            results[index] = await worker(items[index], index);
        }
    });
    await Promise.all(workers);
    return results;
}

function printResult(index: number, total: number, r: PersonResult): void {
    if (!r.ok) {
        console.log(`  [${index}/${total}] ${r.person}: 失败 - ${r.error}`);
        return;
    }
    const dirtyRate = r.input > 0 ? Math.round((1 - r.keep / r.input) * 100) : 0;
    const prefix = DRY_RUN ? 'dry-run' : '写入';
    console.log(
        `  [${index}/${total}] ${r.person}: ${r.input} -> 保留 ${r.keep} ` +
        `(脏 ${dirtyRate}%: L0拒${r.l0}/去重${r.dup}/语义拒${r.reject}/待审${r.review}) | ${prefix} audit ${r.auditRows}` +
        (PRUNE ? ` | 删除 ${r.pruned}` : '')
    );
}

async function summarizeAudit() {
    const [counts, verdicts, last] = await Promise.all([
        sql`
            SELECT
                (SELECT COUNT(*)::int FROM "People") AS total,
                (SELECT COUNT(*)::int FROM "People" WHERE status = ${'ready'}) AS ready,
                (SELECT COUNT(DISTINCT "personId")::int FROM "QAAuditLog") AS audited_people,
                (SELECT COUNT(*)::int FROM "QAAuditLog") AS audit_rows
        `,
        sql`
            SELECT verdict, COUNT(*)::int AS count
            FROM "QAAuditLog"
            GROUP BY verdict
            ORDER BY count DESC
        `,
        sql`SELECT MAX("createdAt") AS last_audit FROM "QAAuditLog"`,
    ]);

    console.log('\n=== 当前 QAAuditLog ===');
    console.log(`  人物: ${counts[0].audited_people}/${counts[0].ready} ready`);
    console.log(`  行数: ${counts[0].audit_rows}`);
    console.log(`  最后写入: ${last[0].last_audit ?? 'n/a'}`);
    console.log(`  verdict: ${verdicts.map(v => `${v.verdict} ${v.count}`).join(' / ')}`);
}

async function main() {
    console.log(`\n${PRUNE ? 'PRUNE 模式' : DRY_RUN ? 'dry-run 审计模式' : '审计写库模式'} | people 并发 ${CONCURRENCY} | semantic 并发 ${SEMANTIC_CONCURRENCY} | semantic 间隔 ${SEMANTIC_DELAY_MS}ms`);
    console.log(`范围: ${INCLUDE_AUDITED ? '包含已审' : '仅未审'} ready 人员${PERSON ? ` | person=${PERSON}` : ''}${LIMIT ? ` | limit=${LIMIT}` : ''}\n`);

    const people = await fetchPeople();
    console.log(`待处理: ${people.length} 人`);

    if (people.length > 0) {
        for (const p of people.slice(0, 20)) {
            console.log(`  - ${p.name} (${p.raw_count} items, audit ${p.audit_count})`);
        }
        if (people.length > 20) console.log(`  ... 还有 ${people.length - 20} 人`);
    }

    if (LIST_ONLY || people.length === 0) {
        await summarizeAudit();
        return;
    }

    console.log('');
    const results = await runPool(people, CONCURRENCY, async (p, i) => {
        const r = await auditPerson(p);
        printResult(i + 1, people.length, r);
        return r;
    });

    const agg = results.reduce(
        (acc, r) => {
            if (!r.ok) acc.failed++;
            acc.input += r.input;
            acc.keep += r.keep;
            acc.reject += r.reject;
            acc.review += r.review;
            acc.dup += r.dup;
            acc.l0 += r.l0;
            acc.auditRows += r.auditRows;
            acc.pruned += r.pruned;
            return acc;
        },
        { failed: 0, input: 0, keep: 0, reject: 0, review: 0, dup: 0, l0: 0, auditRows: 0, pruned: 0 }
    );
    const totalDirty = agg.input > 0 ? Math.round((1 - agg.keep / agg.input) * 100) : 0;

    console.log('\n=== 本轮汇总 ===');
    console.log(`  人物: ${results.length - agg.failed}/${results.length} 成功, ${agg.failed} 失败`);
    console.log(`  总 item: ${agg.input}`);
    console.log(`  保留: ${agg.keep} (${100 - totalDirty}%)`);
    console.log(`  脏数据: ${agg.input - agg.keep} (${totalDirty}%) = L0拒${agg.l0} + 去重${agg.dup} + 语义拒${agg.reject} + 待审${agg.review}`);
    console.log(`  audit 行: ${DRY_RUN ? 0 : agg.auditRows}${DRY_RUN ? ' (dry-run 未写库)' : ''}`);
    if (PRUNE) console.log(`  已删除: ${agg.pruned} 条`);
    else console.log('  未删 RawPoolItem。加 --prune --yes-prune 才会删除 reject+重复。');

    await summarizeAudit();
    if (agg.failed > 0) process.exit(1);
}

main().catch(e => {
    console.error('ERR:', e instanceof Error ? e.message : e);
    process.exit(1);
});
