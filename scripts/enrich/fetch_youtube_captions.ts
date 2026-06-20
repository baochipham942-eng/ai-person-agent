/**
 * YouTube 字幕采集 + 关键词提取批量脚本
 *
 * 两件事（默认两件都做，--execute 才写库，否则 dry-run）：
 *   A. backfill：给已有 youtube_caption RawPoolItem 补 metadata.keywords（纯 DeepSeek，零 Supadata 成本）
 *   B. fetch-new：给缺字幕的视频用 Supadata 拉字幕 → 抽关键词 → upsert youtube_caption RawPoolItem
 *
 * 用法：
 *   bun scripts/enrich/fetch_youtube_captions.ts                      # dry-run，看会做什么
 *   bun scripts/enrich/fetch_youtube_captions.ts --execute            # 真写库（A+B）
 *   bun scripts/enrich/fetch_youtube_captions.ts --backfill-only --execute
 *   bun scripts/enrich/fetch_youtube_captions.ts --fetch-only --execute --max-supadata 30
 *   bun scripts/enrich/fetch_youtube_captions.ts --fetch-only --skip-keywords --execute
 *   bun scripts/enrich/fetch_youtube_captions.ts --fetch-only --skip-keywords --execute --shards 4 --shard-index 0
 *   bun scripts/enrich/fetch_youtube_captions.ts --person "Andrej Karpathy" --execute
 *   选项：--limit N（每阶段处理上限）--max-supadata N（Supadata 调用上限，护额度，默认 50）
 *        --lang en --quiet
 */

import { config as loadEnv } from 'dotenv';
// SUPADATA_API_KEYS / DEEPSEEK 等在 .env.local，dotenv 默认只读 .env，两者都显式加载
loadEnv({ path: '.env' });
loadEnv({ path: '.env.local' });

import { prisma } from '../../lib/db/prisma';
import { buildRawPoolIdentity, contentHash } from '../../lib/rawpool-identity';
import { fetchYoutubeTranscript, SupadataQuotaError } from '../../lib/datasources/supadata';
import { extractContentKeywords } from '../../lib/ai/extract-keywords';

// 兜底：Supadata 202 轮询有长空闲，Neon WebSocket 可能断连抛未处理 'error' 事件直接杀进程。
// 吞掉瞬时错误让批量任务存活，prisma 下次查询会自动重连。
process.on('unhandledRejection', e => console.warn('[unhandledRejection]', String(e).slice(0, 160)));
process.on('uncaughtException', e => console.warn('[uncaughtException]', String(e).slice(0, 160)));

interface Options {
    execute: boolean;
    backfillOnly: boolean;
    fetchOnly: boolean;
    limit: number;
    maxSupadata: number;
    lang?: string;
    person?: string;
    skipKeywords: boolean;
    shards: number;
    shardIndex: number;
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
        backfillOnly: a.includes('--backfill-only'),
        fetchOnly: a.includes('--fetch-only'),
        limit: Number(valOf('--limit') ?? Number.MAX_SAFE_INTEGER),
        maxSupadata: Number(valOf('--max-supadata') ?? 50),
        lang: valOf('--lang'),
        person: valOf('--person'),
        skipKeywords: a.includes('--skip-keywords'),
        shards: Math.max(1, Number(valOf('--shards') ?? 1)),
        shardIndex: Math.max(0, Number(valOf('--shard-index') ?? 0)),
        quiet: a.includes('--quiet'),
    };
}

type YoutubeRow = {
    id: string;
    personId: string;
    url: string;
    title: string;
    text: string;
    metadata: Record<string, unknown> | null;
};

function metaRecord(m: unknown): Record<string, unknown> {
    return m && typeof m === 'object' && !Array.isArray(m) ? (m as Record<string, unknown>) : {};
}
function isCaption(row: { metadata: unknown }): boolean {
    return metaRecord(row.metadata).sourceKind === 'youtube_caption';
}
function hasKeywords(row: { metadata: unknown }): boolean {
    const kw = metaRecord(row.metadata).keywords;
    return Array.isArray(kw) && kw.length > 0;
}
function videoIdOf(row: { metadata: unknown; url: string }): string {
    const fromMeta = metaRecord(row.metadata).videoId;
    if (typeof fromMeta === 'string' && fromMeta) return fromMeta;
    const m = row.url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    return m?.[1] ?? '';
}

function stableShard(value: string, shards: number): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return hash % shards;
}

async function resolvePersonId(name: string): Promise<string | null> {
    const p = await prisma.people.findFirst({
        where: { OR: [{ id: name }, { name }, { aliases: { has: name } }] },
        select: { id: true },
    });
    return p?.id ?? null;
}

function log(quiet: boolean, msg: string) {
    if (!quiet) console.log(msg);
}

async function main() {
    const opts = parseOptions();
    if (opts.shardIndex >= opts.shards) {
        console.error(`--shard-index 必须小于 --shards（当前 ${opts.shardIndex}/${opts.shards}）`);
        process.exit(1);
    }
    const personFilter = opts.person ? await resolvePersonId(opts.person) : null;
    if (opts.person && !personFilter) {
        console.error(`找不到人物：${opts.person}`);
        process.exit(1);
    }

    console.log(`=== YouTube 字幕采集 + 关键词提取 ===`);
    console.log(
        `模式: ${opts.execute ? 'EXECUTE(写库)' : 'DRY-RUN'} | ` +
        `${opts.backfillOnly ? '仅backfill' : opts.fetchOnly ? '仅fetch-new' : 'backfill+fetch-new'} | ` +
        `Supadata上限=${opts.maxSupadata}${personFilter ? ` | 人物=${opts.person}` : ''}` +
        `${opts.shards > 1 ? ` | shard=${opts.shardIndex}/${opts.shards}` : ''}\n`,
    );

    const baseWhere = {
        sourceType: 'youtube',
        ...(personFilter ? { personId: personFilter } : {}),
    };

    let kwBackfilled = 0;
    let captionsFetched = 0;
    let supadataCalls = 0;
    let skippedNoCaption = 0;
    let quotaHit = false;

    // ===== A. backfill 关键词 =====
    if (!opts.fetchOnly) {
        const captions = (await prisma.rawPoolItem.findMany({
            where: { ...baseWhere, metadata: { path: ['sourceKind'], equals: 'youtube_caption' } },
            select: { id: true, personId: true, url: true, title: true, text: true, metadata: true },
        })) as YoutubeRow[];
        const need = captions.filter(c => !hasKeywords(c)).slice(0, opts.limit);
        log(opts.quiet, `[A] 现有字幕 ${captions.length} 条，缺关键词 ${captions.filter(c => !hasKeywords(c)).length} 条，本轮处理 ${need.length} 条`);

        for (let i = 0; i < need.length; i++) {
            const c = need[i];
            if (!opts.execute) { kwBackfilled++; continue; }
            try {
                const kw = await extractContentKeywords(c.title, c.text, { contentType: 'YouTube 访谈/分享字幕' });
                await prisma.rawPoolItem.update({
                    where: { id: c.id },
                    data: { metadata: { ...metaRecord(c.metadata), keywords: kw.keywords, entities: kw.entities, contentTopics: kw.topics, gist: kw.gist } },
                });
                kwBackfilled++;
                if (!opts.quiet && (i + 1) % 10 === 0) console.log(`  [A] ${i + 1}/${need.length}`);
            } catch (e) {
                console.warn(`  [A] 跳过 ${c.url}: ${(e as Error).message.slice(0, 120)}`);
            }
        }
        log(opts.quiet, `[A] 完成：${kwBackfilled} 条字幕${opts.execute ? '已' : '将'}补关键词\n`);
    }

    // ===== B. fetch-new 字幕 =====
    if (!opts.backfillOnly) {
        // 只取轻量字段做分区（不拉 text，避免把 12 万字字幕全载入内存）
        const all = await prisma.rawPoolItem.findMany({
            where: baseWhere,
            select: { id: true, personId: true, url: true, title: true, metadata: true },
        });
        const captionedKeys = new Set(
            all.filter(isCaption).map(r => `${r.personId}:${videoIdOf(r)}`),
        );
        let skippedMarked = 0;
        let videosMissing = all.filter(r => {
            if (isCaption(r)) return false;
            const vid = videoIdOf(r);
            if (!vid) return false;
            if (captionedKeys.has(`${r.personId}:${vid}`)) return false;
            // 已确认无字幕的视频（前轮标记）永久跳过，不再扣额度重查
            if (metaRecord(r.metadata).captionFetchStatus === 'none') { skippedMarked++; return false; }
            return true;
        });
        if (opts.shards > 1) {
            videosMissing = videosMissing.filter(r => stableShard(`${r.personId}:${videoIdOf(r)}`, opts.shards) === opts.shardIndex);
        }
        log(opts.quiet, `[B] 视频总数 ${all.filter(r => !isCaption(r)).length}，缺字幕 ${videosMissing.length} 个（另 ${skippedMarked} 个已确认无字幕跳过）`);

        const budget = Math.min(videosMissing.length, opts.limit, opts.maxSupadata);
        const targets = videosMissing.slice(0, budget);
        log(opts.quiet, `[B] 本轮尝试 ${targets.length} 个（受 limit/max-supadata 约束）`);

        for (let i = 0; i < targets.length; i++) {
            const v = targets[i];
            const vid = videoIdOf(v);
            if (!opts.execute) { captionsFetched++; continue; }

            let transcript;
            try {
                supadataCalls++;
                transcript = await fetchYoutubeTranscript(v.url, { lang: opts.lang });
            } catch (e) {
                if (e instanceof SupadataQuotaError) {
                    quotaHit = true;
                    console.warn(`\n⚠️  ${e.message}`);
                    break;
                }
                console.warn(`  [B] 字幕请求失败 ${v.url}: ${(e as Error).message.slice(0, 120)}`);
                continue;
            }

            if (!transcript.available || transcript.text.length < 50) {
                skippedNoCaption++;
                // 确实没字幕(none) / 内容太短：在视频条目上永久标记，后续轮次跳过不再扣额度。
                // timeout/error 不标记，留待重试（可能有字幕只是慢）。
                if (transcript.status === 'none' || (transcript.status === 'ok' && transcript.text.length < 50)) {
                    try {
                        await prisma.rawPoolItem.update({
                            where: { id: v.id },
                            data: { metadata: { ...metaRecord(v.metadata), captionFetchStatus: 'none', captionCheckedAt: new Date().toISOString() } },
                        });
                    } catch { /* 标记失败无所谓，下轮重试 */ }
                }
                continue;
            }

            // 抽关键词
            let kw = { keywords: [] as string[], entities: [] as string[], topics: [] as string[], gist: '' };
            if (!opts.skipKeywords) {
                try {
                    kw = await extractContentKeywords(v.title, transcript.text, { contentType: 'YouTube 访谈/分享字幕' });
                } catch (e) {
                    console.warn(`  [B] 关键词提取失败（仍落字幕）${v.url}: ${(e as Error).message.slice(0, 80)}`);
                }
            }

            const captionMeta = {
                ...metaRecord(v.metadata),
                sourceKind: 'youtube_caption',
                videoId: vid,
                lang: transcript.lang,
                availableLangs: transcript.availableLangs,
                captionSource: 'supadata',
                originalRawPoolItemId: v.id,
                importedAt: new Date().toISOString(),
                keywords: kw.keywords,
                entities: kw.entities,
                contentTopics: kw.topics,
                gist: kw.gist,
            };
            const identity = buildRawPoolIdentity({ personId: v.personId, sourceType: 'youtube', url: v.url, metadata: captionMeta });
            const title = v.title.startsWith('YouTube 字幕：') ? v.title : `YouTube 字幕：${v.title}`;

            try {
                await prisma.rawPoolItem.upsert({
                    where: { urlHash: identity.urlHash },
                    create: {
                        personId: v.personId,
                        sourceType: 'youtube',
                        url: v.url,
                        urlHash: identity.urlHash,
                        contentHash: contentHash(transcript.text),
                        title,
                        text: transcript.text,
                        publishedAt: new Date(),
                        metadata: { ...captionMeta, rawPoolCanonicalKey: identity.canonicalKey },
                        fetchStatus: 'success',
                        fetchedAt: new Date(),
                    },
                    update: {
                        text: transcript.text,
                        contentHash: contentHash(transcript.text),
                        metadata: { ...captionMeta, rawPoolCanonicalKey: identity.canonicalKey },
                        fetchedAt: new Date(),
                    },
                });
            } catch (e) {
                // Neon 冷启动/连接抖动等：跳过这条，不让整批崩（已扣的 Supadata 额度记一笔损耗）
                console.warn(`  [B] 落库失败（跳过，可重跑补）${v.url}: ${(e as Error).message.slice(0, 100)}`);
                continue;
            }
            captionsFetched++;
            if (!opts.quiet && captionsFetched % 5 === 0) {
                console.log(`  [B] ${captionsFetched} 条字幕已落库（Supadata 调用 ${supadataCalls}）`);
            }
        }
        log(opts.quiet, `[B] 完成：${captionsFetched} 条字幕${opts.execute ? '已' : '将'}采集，无字幕跳过 ${skippedNoCaption}，Supadata 调用 ${supadataCalls}`);
    }

    console.log(`\n📊 汇总：关键词补全 ${kwBackfilled} | 新采集字幕 ${captionsFetched} | Supadata 调用 ${supadataCalls}/${opts.maxSupadata}`);
    if (quotaHit) {
        console.log(`⚠️  Supadata 额度已耗尽，告知补充新 key 后重跑（已落库的会幂等跳过）。`);
    }
    if (!opts.execute) console.log(`（DRY-RUN，未写库。加 --execute 真正执行）`);

    await prisma.$disconnect();
    process.exit(0);
}

main().catch(async e => {
    console.error('脚本失败:', e);
    await prisma.$disconnect();
    process.exit(1);
});
