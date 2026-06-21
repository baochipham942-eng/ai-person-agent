/**
 * 按作者名批量抓 OpenAlex 论文 → 写入 RawPoolItem（sourceType='openalex'）。
 *
 * 背景：常规 Inngest 管线的论文支线要求人物有 ORCID（functions.ts:333 `if (!orcid) return []`），
 * 而全库 0 人填了 ORCID → 论文支线对所有人永久空转，论文实体长期停更。
 * 本脚本绕开 ORCID，用 `searchOpenAlexAuthor`（按名搜）+ `getAuthorWorks` 直接抓，
 * 并把**真实 publicationDate 写进 RawPoolItem.publishedAt** —— 这是让首页"本周推荐"
 * 论文新鲜度过滤（weekly-picks.ts 的 PAPER_MAX_AGE_DAYS）生效的前提。
 *
 * 抓完跑 `scripts/activity/materialize_activity_events.mjs` 把 RawPoolItem 落成 paper ActivityEvent。
 *
 * 用法：
 *   npx tsx scripts/enrich/fetch_openalex_papers.ts                 # dry-run，默认人群（researcher+professor）
 *   npx tsx scripts/enrich/fetch_openalex_papers.ts --execute       # 实际写库
 *   npx tsx scripts/enrich/fetch_openalex_papers.ts --limit=20      # 只处理前 20 人（按影响力降序）
 *   npx tsx scripts/enrich/fetch_openalex_papers.ts --works=8       # 每位作者取引用最高的 8 篇（默认 10）
 *   npx tsx scripts/enrich/fetch_openalex_papers.ts --since=2025-01-01  # 只取该日之后发表的
 *   npx tsx scripts/enrich/fetch_openalex_papers.ts --roles=all     # 放宽到所有角色（含 founder/engineer）
 *   npx tsx scripts/enrich/fetch_openalex_papers.ts --names="杨植麟,Andrej Karpathy"  # 指定人物
 *   npx tsx scripts/enrich/fetch_openalex_papers.ts --execute --quiet
 *
 * 成本：OpenAlex 免费 API（带 polite mailto），每人 1～N 次请求 + 取作品 1 次，含礼貌延迟。零付费。
 * 安全：dry-run 默认；同名消歧保守（无机构/姓名强信号则跳过，进 review 计数，不瞎挂论文，
 *       避免历史教训里的"张冠李戴"）；写库幂等（按 urlHash upsert）+ 每条 try/catch（抗 Neon ECONNRESET）。
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

import { prisma } from '@/lib/db/prisma';
import { runOpenalexPapers, DEFAULT_SINCE_DAYS, type OpenalexPapersOptions } from '@/lib/pipelines/openalex-papers';

function parseOptions(argv: string[]): OpenalexPapersOptions {
  const opts: OpenalexPapersOptions = {
    execute: false,
    quiet: false,
    limit: 60,
    works: 10,
    allTime: false,
    roles: 'academic',
    minCitations: 0,
    delayMs: 150,
  };
  for (const arg of argv) {
    if (arg === '--execute') opts.execute = true;
    else if (arg === '--quiet') opts.quiet = true;
    else if (arg === '--all-time') opts.allTime = true;
    else if (arg === '--roles=all') opts.roles = 'all';
    else if (arg.startsWith('--limit=')) opts.limit = clampInt(arg.slice(8), 1, 1000, opts.limit);
    else if (arg.startsWith('--works=')) opts.works = clampInt(arg.slice(8), 1, 50, opts.works);
    else if (arg.startsWith('--min-citations=')) opts.minCitations = clampInt(arg.slice(16), 0, 1_000_000, opts.minCitations);
    else if (arg.startsWith('--delay=')) opts.delayMs = clampInt(arg.slice(8), 0, 5000, opts.delayMs);
    else if (arg.startsWith('--since=')) {
      const d = new Date(arg.slice(8));
      if (!Number.isNaN(d.getTime())) opts.since = d;
    } else if (arg.startsWith('--names=')) {
      opts.names = arg.slice(8).split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  // 未显式指定 --since 且未 --all-time → 套近 18 个月默认下限
  if (!opts.since && !opts.allTime) {
    opts.since = new Date(Date.now() - DEFAULT_SINCE_DAYS * 86_400_000);
  }
  return opts;
}

function clampInt(value: string, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

async function main() {
  const opts = parseOptions(process.argv.slice(2));
  console.log(`📚 fetch_openalex_papers — ${opts.execute ? '执行写库' : 'DRY-RUN（不写库）'}`);
  await runOpenalexPapers(opts); // 无 hooks = console 裸跑
  if (!opts.execute) console.log('\n这是 DRY-RUN。确认无误后加 --execute 写库。');
  await prisma.$disconnect();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
