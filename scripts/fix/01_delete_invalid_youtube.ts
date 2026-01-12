/**
 * P0-1: 删除无效的 YouTube 记录
 * 问题: 存在 URL 包含 'undefined' 的 YouTube 视频记录
 */

import { prisma } from '../../lib/db/prisma';

async function main() {
  console.log('🔍 查找无效的 YouTube 记录...\n');

  // 查找包含 undefined 的 URL
  const invalidRecords = await prisma.rawPoolItem.findMany({
    where: {
      sourceType: 'youtube',
      url: { contains: 'undefined' }
    },
    include: {
      person: { select: { name: true } }
    }
  });

  if (invalidRecords.length === 0) {
    console.log('✅ 没有发现无效的 YouTube 记录');
    return;
  }

  console.log(`发现 ${invalidRecords.length} 条无效记录:\n`);

  for (const record of invalidRecords) {
    console.log(`- ${record.person.name}: "${record.title}"`);
    console.log(`  URL: ${record.url}`);
    console.log(`  发布时间: ${record.publishedAt?.toISOString().split('T')[0] || 'N/A'}`);
    console.log();
  }

  // 删除无效记录
  const result = await prisma.rawPoolItem.deleteMany({
    where: {
      sourceType: 'youtube',
      url: { contains: 'undefined' }
    }
  });

  console.log(`✅ 已删除 ${result.count} 条无效记录`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
