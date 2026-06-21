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
import { runThreadsLink, THREADS_LINK_DEFAULT_TYPES, type ThreadsLinkOptions } from '../../lib/pipelines/threads-link';

function parseOptions(): ThreadsLinkOptions {
    const a = process.argv.slice(2);
    const valOf = (f: string) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : undefined; };
    return {
        execute: a.includes('--execute'),
        limit: Number(valOf('--limit') ?? Number.MAX_SAFE_INTEGER),
        minScore: Number(valOf('--min-score') ?? 1.5),
        highScore: Number(valOf('--high-score') ?? 2.5),
        maxPerItem: Number(valOf('--max-per-item') ?? 2),
        types: (valOf('--types')?.split(',').map(s => s.trim()).filter(Boolean)) ?? THREADS_LINK_DEFAULT_TYPES,
        includeCompany: !a.includes('--no-company'),
        quiet: a.includes('--quiet'),
    };
}

async function main() {
    const opts = parseOptions();
    console.log(`=== 内容关键词 → 主题页 自动挂载 ===`);
    await runThreadsLink(opts); // 无 hooks = console 裸跑
    if (!opts.execute) console.log(`（DRY-RUN，未写库。加 --execute 执行）`);
    await prisma.$disconnect();
    process.exit(0);
}

main().catch(async e => { console.error('失败:', e); await prisma.$disconnect(); process.exit(1); });
