/**
 * 归一 Organization.type 大小写。
 *
 * Wikidata 富集把 'Company' / 'University' 等首字母大写值写进了 type 字段，
 * 与代码里统一使用的小写规范（`type === 'company'` / `'university'`）不一致，
 * 导致重复分桶，并让 audit 脚本把大写 'University' 误判成 career 而非 education。
 *
 * 本脚本把 type 统一小写化（幂等，可重复运行）。
 *   bun scripts/fix/normalize_org_type.ts            # 执行
 *   bun scripts/fix/normalize_org_type.ts --dry-run  # 只报告不写
 */
import { prisma } from '../../lib/db/prisma';

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const before = await prisma.organization.groupBy({ by: ['type'], _count: true });
  console.log('清洗前 type 分布:');
  for (const row of before.sort((a, b) => b._count - a._count)) {
    console.log(`  ${row.type.padEnd(14)} ${row._count}`);
  }

  // 需要归一的大写 → 小写映射（只处理与现有小写桶冲突的脏值）
  const targets = [...new Set(before.map(r => r.type))].filter(t => t !== t.toLowerCase());

  if (targets.length === 0) {
    console.log('\n✅ 无需清洗，type 已全部小写。');
    process.exit(0);
  }

  console.log(`\n待归一的脏值: ${targets.join(', ')}`);
  if (dryRun) {
    console.log('（--dry-run，未写入）');
    process.exit(0);
  }

  let total = 0;
  for (const dirty of targets) {
    const res = await prisma.organization.updateMany({
      where: { type: dirty },
      data: { type: dirty.toLowerCase() },
    });
    total += res.count;
    console.log(`  ${dirty} → ${dirty.toLowerCase()}: ${res.count} 条`);
  }

  const after = await prisma.organization.groupBy({ by: ['type'], _count: true });
  console.log('\n清洗后 type 分布:');
  for (const row of after.sort((a, b) => b._count - a._count)) {
    console.log(`  ${row.type.padEnd(14)} ${row._count}`);
  }
  console.log(`\n✅ 完成，共归一 ${total} 条。`);
  process.exit(0);
}

main().catch(e => {
  console.error('❌ 失败:', e.message);
  process.exit(1);
});
