/**
 * 重置周访问量统计
 * 建议每周一凌晨通过 cron 任务运行
 *
 * 用法: bun scripts/cron/reset_weekly_views.ts
 */

import { prisma } from '../../lib/db/prisma';

async function main() {
  console.log('🔄 开始重置周访问量...\n');

  // 清理超过7天的访问记录（节省存储空间）
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const deleted = await prisma.pageView.deleteMany({
    where: {
      viewedAt: { lt: sevenDaysAgo }
    }
  });

  console.log(`🗑️ 已清理 ${deleted.count} 条旧访问记录`);

  // 重置所有人物的周访问量
  const updated = await prisma.people.updateMany({
    data: {
      weeklyViewCount: 0
    }
  });

  console.log(`✅ 已重置 ${updated.count} 个人物的周访问量`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
