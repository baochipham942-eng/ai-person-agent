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
import { runYoutubeCaptions, type YoutubeCaptionsOptions } from '../../lib/pipelines/youtube-captions';

// 兜底：Supadata 202 轮询有长空闲，Neon WebSocket 可能断连抛未处理 'error' 事件直接杀进程。
// 吞掉瞬时错误让批量任务存活，prisma 下次查询会自动重连。
process.on('unhandledRejection', e => console.warn('[unhandledRejection]', String(e).slice(0, 160)));
process.on('uncaughtException', e => console.warn('[uncaughtException]', String(e).slice(0, 160)));

function parseOptions(): YoutubeCaptionsOptions {
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

async function main() {
    const opts = parseOptions();
    console.log(`=== YouTube 字幕采集 + 关键词提取 ===`);
    await runYoutubeCaptions(opts); // 无 hooks = console 裸跑
    if (!opts.execute) console.log(`（DRY-RUN，未写库。加 --execute 真正执行）`);
    await prisma.$disconnect();
    process.exit(0);
}

main().catch(async e => {
    console.error('脚本失败:', e);
    await prisma.$disconnect();
    process.exit(1);
});
