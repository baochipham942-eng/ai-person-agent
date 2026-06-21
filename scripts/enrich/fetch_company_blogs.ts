/**
 * 公司官方博客抓取 → CompanySource（per-company）
 *
 * 对 15 家目标公司：RSS 解析 feed / 无 RSS 用 Jina 渲染列表页提链 →
 * 每篇 Jina 抓正文 + DeepSeek 抽关键词 → upsert CompanySource。
 * org 按 name/alias 解析（缺则建 type=company）。落到清理后的干净 org 上。
 *
 * 用法：
 *   npx tsx scripts/enrich/fetch_company_blogs.ts                    # dry-run
 *   npx tsx scripts/enrich/fetch_company_blogs.ts --execute
 *   npx tsx scripts/enrich/fetch_company_blogs.ts --only OpenAI --execute
 *   选项：--per-company N（每家最多抓几篇，默认 15）--quiet
 *
 * 注：必须 npx tsx（bun 下 Prisma 原生引擎本机签名冲突）。
 */

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });
loadEnv({ path: '.env.local' });

process.on('unhandledRejection', e => console.warn('[unhandledRejection]', String(e).slice(0, 160)));
process.on('uncaughtException', e => console.warn('[uncaughtException]', String(e).slice(0, 160)));

import { prisma } from '../../lib/db/prisma';
import { runCompanyBlogs, type CompanyBlogsOptions } from '../../lib/pipelines/company-blogs';

function parseOptions(): CompanyBlogsOptions {
    const a = process.argv.slice(2);
    const valOf = (f: string) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : undefined; };
    return {
        execute: a.includes('--execute'),
        only: valOf('--only'),
        perCompany: Number(valOf('--per-company') ?? 15),
        quiet: a.includes('--quiet'),
    };
}

async function main() {
    const opts = parseOptions();
    console.log(`=== 公司官方博客抓取 → CompanySource ===`);
    await runCompanyBlogs(opts); // 无 hooks = console 裸跑
    if (!opts.execute) console.log(`（DRY-RUN，加 --execute 执行）`);
    await prisma.$disconnect();
    process.exit(0);
}

main().catch(async e => { console.error('失败:', e); await prisma.$disconnect(); process.exit(1); });
