/**
 * 用本地 Tavily 重新生成存量公开对比报告。
 * 背景：这些报告生成时所在运行环境没有 TAVILY_API_KEYS（只在 .env.local），
 * 导致 webSourceCount=0 且「未配置 Tavily」警告被烤进快照。本地带 Tavily 重跑即可补 web 源 + 清警告。
 * 默认只重跑「web 源为 0」的报告（幂等、省成本）；传 --all 强制全部重跑。
 */
import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { isTavilyConfigured } from '../../lib/tavily-search';
import { runCompareReportAgent } from '../../lib/compare-report-agent';
import { prisma } from '../../lib/db/prisma';

async function main() {
  const all = process.argv.includes('--all');
  if (!isTavilyConfigured()) {
    console.error('❌ 本地未检测到 Tavily key（.env.local 的 TAVILY_API_KEYS），中止。');
    process.exit(1);
  }

  const reports = await prisma.compareReport.findMany({
    where: { status: 'completed', visibility: 'public' },
    select: { id: true, title: true, sourceSnapshot: true },
    orderBy: { createdAt: 'desc' },
  });

  const targets = reports.filter(r => {
    if (all) return true;
    const web = (r.sourceSnapshot as { webSourceCount?: number } | null)?.webSourceCount;
    return !web; // 仅重跑 web 源为 0/缺失的
  });

  console.log(`共 ${reports.length} 份公开报告，需重跑 ${targets.length} 份${all ? '（--all 全部）' : '（web 源为 0）'}。`);

  let ok = 0;
  let fail = 0;
  for (const [i, r] of targets.entries()) {
    const tag = `[${i + 1}/${targets.length}] ${r.title.slice(0, 26)}`;
    try {
      const t0 = Date.now();
      const content = await runCompareReportAgent(r.id);
      const web = content.coverage?.webSourceCount ?? 0;
      console.log(`✅ ${tag} | web:${web} | ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      ok++;
    } catch (error) {
      console.error(`❌ ${tag} | ${(error as Error).message}`);
      fail++;
    }
  }

  console.log(`\n📊 完成：成功 ${ok}，失败 ${fail}，跳过 ${reports.length - targets.length}。`);
}

main()
  .catch(error => {
    console.error('脚本失败:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
