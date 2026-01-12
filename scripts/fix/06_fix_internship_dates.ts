/**
 * 修正实习日期精度问题
 *
 * 问题：实习记录的 startDate 和 endDate 相同（如 2015-01-01 - 2015-01-01）
 * 解决：对于 startDate=endDate 的实习记录，设置 endDate 为 null
 *
 * 用法: npx tsx scripts/fix/06_fix_internship_dates.ts [--dry-run]
 */

import { prisma } from '../../lib/db/prisma';

// 实习相关的职位关键词
const INTERNSHIP_KEYWORDS = [
  'intern', 'internship', '实习', '实习生',
  'trainee', 'apprentice', '见习'
];

function isInternship(role: string): boolean {
  const roleLower = role.toLowerCase();
  return INTERNSHIP_KEYWORDS.some(k => roleLower.includes(k));
}

function isSameDay(date1: Date | null, date2: Date | null): boolean {
  if (!date1 || !date2) return false;

  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('🔧 修正实习日期精度问题\n');
  console.log(`模式: ${dryRun ? '预览(dry-run)' : '实际执行'}\n`);

  // 1. 查找所有 startDate=endDate 的记录
  const roles = await prisma.personRole.findMany({
    where: {
      startDate: { not: null },
      endDate: { not: null }
    },
    include: {
      person: { select: { name: true } },
      organization: { select: { name: true, nameZh: true } }
    }
  });

  console.log(`📋 找到 ${roles.length} 条有完整日期的职位记录\n`);

  // 2. 筛选出日期相同的记录
  const sameDateRoles = roles.filter(r => isSameDay(r.startDate, r.endDate));
  console.log(`📋 其中日期相同的记录: ${sameDateRoles.length} 条\n`);

  let fixedCount = 0;
  let internshipCount = 0;
  let otherCount = 0;

  for (const role of sameDateRoles) {
    const isIntern = isInternship(role.role) || isInternship(role.roleZh || '');
    const orgName = role.organization.nameZh || role.organization.name;
    const startYear = role.startDate?.getFullYear();

    console.log(`${role.person.name}: ${role.roleZh || role.role} @ ${orgName}`);
    console.log(`  日期: ${role.startDate?.toISOString().slice(0, 10)} - ${role.endDate?.toISOString().slice(0, 10)}`);

    if (isIntern) {
      internshipCount++;
      console.log(`  类型: 实习 -> 将 endDate 设为 null`);
    } else {
      otherCount++;
      console.log(`  类型: 非实习 -> 将 endDate 设为 null（Wikidata 日期精度问题）`);
    }

    if (!dryRun) {
      await prisma.personRole.update({
        where: { id: role.id },
        data: { endDate: null }
      });
    }

    fixedCount++;
    console.log('');
  }

  console.log('📊 处理完成');
  console.log(`  检查记录数: ${roles.length}`);
  console.log(`  日期相同记录: ${sameDateRoles.length}`);
  console.log(`  - 实习记录: ${internshipCount}`);
  console.log(`  - 其他记录: ${otherCount}`);
  console.log(`  ${dryRun ? '将修复' : '已修复'}记录数: ${fixedCount}`);

  if (dryRun) {
    console.log('\n提示: 使用 --dry-run 参数仅预览，去掉该参数以实际执行修复');
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
