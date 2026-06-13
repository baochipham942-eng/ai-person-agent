/**
 * 修复 People.organization 字段为空的人物
 * 从 PersonRole 表获取组织信息并填充
 */

import { prisma } from '../lib/db/prisma';

async function main() {
  const quiet = process.argv.includes('--quiet');
  const dryRun = process.argv.includes('--dry-run');

  // 查找 organization 为空但有 PersonRole 记录的人物
  const people = await prisma.people.findMany({
    where: {
      status: 'ready',
      OR: [
        { organization: { equals: null } },
        { organization: { isEmpty: true } },
      ],
    },
    include: {
      roles: {
        include: {
          organization: true,
        },
        orderBy: [
          { endDate: 'desc' },  // null (当前任职) 排前面
          { startDate: 'desc' },
        ],
      },
    },
  });

  if (!quiet) {
    console.log(`找到 ${people.length} 个 organization 为空的人物\n`);
  }

  let updated = 0;
  let skipped = 0;

  for (const person of people) {
    // 从 PersonRole 中提取组织名称
    // 优先级：
    // 1. 当前任职（endDate 为 null）且有明确 startDate 的组织（更可信）
    // 2. 当前任职（endDate 为 null）但没有 startDate 的组织
    // 3. 历史组织（按 endDate 降序）
    const currentRolesWithStart = person.roles.filter(r => r.endDate === null && r.startDate !== null);
    const currentRolesWithoutStart = person.roles.filter(r => r.endDate === null && r.startDate === null);
    const historicalRoles = person.roles.filter(r => r.endDate !== null);

    // 按 startDate 降序排序（最近的在前）
    currentRolesWithStart.sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return dateB - dateA;
    });

    const allOrgs = new Set<string>();

    // 1. 先添加当前任职且有明确开始时间的（最可信）
    for (const role of currentRolesWithStart) {
      if (allOrgs.size >= 5) break;
      const orgName = role.organization.nameZh || role.organization.name;
      if (orgName) allOrgs.add(orgName);
    }

    // 2. 添加当前任职但没有开始时间的（可能是补充数据）
    for (const role of currentRolesWithoutStart) {
      if (allOrgs.size >= 5) break;
      const orgName = role.organization.nameZh || role.organization.name;
      if (orgName) allOrgs.add(orgName);
    }

    // 3. 添加历史组织
    for (const role of historicalRoles) {
      if (allOrgs.size >= 5) break;
      const orgName = role.organization.nameZh || role.organization.name;
      if (orgName) allOrgs.add(orgName);
    }

    const orgArray = Array.from(allOrgs);

    if (orgArray.length === 0) {
      if (!quiet) {
        console.log(`⏭️  ${person.name}: 没有 PersonRole 记录，跳过`);
      }
      skipped++;
      continue;
    }

    if (!quiet) {
      console.log(`✅ ${person.name}: ${orgArray.join(', ')}`);
    }

    if (!dryRun) {
      await prisma.people.update({
        where: { id: person.id },
        data: { organization: orgArray },
      });
    }
    updated++;
  }

  console.log(`\n📊 完成: 更新 ${updated} 人，跳过 ${skipped} 人${dryRun ? ' (dry-run 模式)' : ''}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
