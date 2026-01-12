/**
 * 删除低价值的 PersonRole 记录
 * - 高中/中学学生记录
 * - 自由职业/非正式职位
 */

import { prisma } from '../../lib/db/prisma';

async function main() {
  console.log('=== 删除低价值 PersonRole 记录 ===\n');

  // 查找缺少 startDate 的记录
  const missing = await prisma.personRole.findMany({
    where: { startDate: null },
    include: {
      person: { select: { name: true } },
      organization: { select: { name: true, nameZh: true } }
    }
  });

  // 要删除的记录
  const toDelete: string[] = [];

  for (const r of missing) {
    const orgName = (r.organization.name + ' ' + (r.organization.nameZh || '')).toLowerCase();
    const role = (r.role + ' ' + (r.roleZh || '')).toLowerCase();

    // 高中/中学 (Student角色)
    const isAcademyButNotChinese = orgName.includes('academy') && !orgName.includes('chinese academy');
    const isHighSchool = (
      orgName.includes('high school') ||
      orgName.includes('senior secondary') ||
      orgName.includes('aloha high') ||
      orgName.includes('red river high') ||
      isAcademyButNotChinese ||
      orgName.includes('mechina') ||
      orgName.includes('中学') ||
      orgName.includes('高中')
    ) && role.includes('student');

    // 短期/非正式
    const isShortTerm = (
      orgName.includes('self-employed') ||
      orgName.includes('自由职业') ||
      orgName.includes('续航教育')
    );

    if (isHighSchool || isShortTerm) {
      toDelete.push(r.id);
      console.log('删除: ' + r.person.name + ' @ ' + r.organization.name + ' (' + r.role + ')');
    }
  }

  console.log('\n--- 汇总 ---');
  console.log('将删除: ' + toDelete.length + ' 条');

  if (toDelete.length > 0) {
    const result = await prisma.personRole.deleteMany({
      where: { id: { in: toDelete } }
    });
    console.log('\n✅ 已删除 ' + result.count + ' 条记录');
  }

  // 最终统计
  const finalMissing = await prisma.personRole.count({ where: { startDate: null } });
  const total = await prisma.personRole.count();
  const withDate = total - finalMissing;
  console.log('\n最终统计:');
  console.log('总记录: ' + total);
  console.log('有 startDate: ' + withDate + ' (' + Math.round(withDate / total * 100) + '%)');
  console.log('缺少 startDate: ' + finalMissing + ' (' + Math.round(finalMissing / total * 100) + '%)');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('脚本失败:', e);
  process.exit(1);
});
