/**
 * 批量采集人物的公开课程信息
 *
 * 数据来源：
 * - Perplexity AI 搜索（主要来源，付费 + 免费课程）
 * - YouTube 播放列表（免费课程）
 *
 * 用法:
 *   bun scripts/enrich/enrich_courses.ts              # 处理所有缺少课程的人物
 *   bun scripts/enrich/enrich_courses.ts --limit 10   # 限制处理数量
 *   bun scripts/enrich/enrich_courses.ts --force      # 强制刷新已有数据
 *   bun scripts/enrich/enrich_courses.ts --person "Andrew Ng"  # 处理指定人物
 */

import { prisma } from '../../lib/db/prisma';
import { runCoursesEnrich, type CoursesEnrichOptions } from '../../lib/pipelines/courses-enrich';

function parseArgs(): CoursesEnrichOptions {
  const args = process.argv.slice(2);
  let limit = 50;
  let force = false;
  let personName: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) { limit = parseInt(args[i + 1], 10); i++; }
    else if (args[i] === '--force') { force = true; }
    else if (args[i] === '--person' && args[i + 1]) { personName = args[i + 1]; i++; }
  }
  // CLI 默认执行写库（保持原脚本行为）；加 --dry-run 只搜索不写。
  return { limit, force, personName, dryRun: args.includes('--dry-run') };
}

async function main() {
  const opts = parseArgs();
  console.log('🎓 Course Enrichment Script');
  await runCoursesEnrich(opts); // 无 hooks = console 裸跑
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
