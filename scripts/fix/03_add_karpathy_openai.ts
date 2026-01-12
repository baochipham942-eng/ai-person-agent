/**
 * P0-3: 补充 Karpathy 2016年 OpenAI 记录
 * 问题: 缺少2016-2017年首次加入OpenAI的记录（Research Scientist/Founding Member）
 *
 * 历史事实:
 * - 2016年初: Karpathy 从 Stanford 博士毕业后加入 OpenAI 作为 Research Scientist
 * - 2017年6月: 离开 OpenAI 加入 Tesla 担任 AI Director
 * - 2023年2月: 回归 OpenAI
 * - 2024年2月: 离开 OpenAI 创办 Eureka Labs
 */

import { prisma } from '../../lib/db/prisma';

async function main() {
  console.log('🔍 查找 Karpathy 和 OpenAI 记录...\n');

  // 查找 Karpathy
  const karpathy = await prisma.people.findFirst({
    where: { name: { contains: 'Karpathy' } },
    include: {
      roles: {
        include: { organization: true },
        orderBy: { startDate: 'asc' }
      }
    }
  });

  if (!karpathy) {
    console.error('❌ 找不到 Karpathy');
    return;
  }

  console.log(`找到 Karpathy: ${karpathy.id}`);
  console.log('\n现有履历:');
  for (const role of karpathy.roles) {
    const start = role.startDate?.toISOString().split('T')[0] || 'N/A';
    const end = role.endDate?.toISOString().split('T')[0] || '至今';
    console.log(`- ${start} ~ ${end}: ${role.role} @ ${role.organization.name}`);
  }

  // 查找 OpenAI Foundation 组织 (有正式 QID)
  const openaiOrg = await prisma.organization.findFirst({
    where: { wikidataQid: 'Q21708200' }  // OpenAI Foundation
  });

  if (!openaiOrg) {
    console.error('❌ 找不到 OpenAI 组织');
    return;
  }

  console.log(`\n使用组织: ${openaiOrg.name} (${openaiOrg.id})`);

  // 检查是否已存在 2016 年的记录
  const existing2016 = karpathy.roles.find(
    r => r.startDate &&
         r.startDate.getFullYear() === 2016 &&
         r.organization.name.includes('OpenAI')
  );

  if (existing2016) {
    console.log('\n⚠️ 已存在 2016 年 OpenAI 记录，跳过');
    return;
  }

  // 添加 2016-2017 OpenAI Research Scientist 记录
  const newRole = await prisma.personRole.create({
    data: {
      personId: karpathy.id,
      organizationId: openaiOrg.id,
      role: 'Research Scientist',
      roleZh: '研究科学家（联合创始成员）',
      startDate: new Date('2016-01-01'),
      endDate: new Date('2017-06-01'),
      source: 'manual',
      confidence: 0.95
    }
  });

  console.log('\n✅ 已添加 2016-2017 OpenAI 记录:');
  console.log(`- ID: ${newRole.id}`);
  console.log(`- 职位: ${newRole.role} / ${newRole.roleZh}`);
  console.log(`- 时间: ${newRole.startDate?.toISOString().split('T')[0]} ~ ${newRole.endDate?.toISOString().split('T')[0]}`);

  // 可选：更新 2023 年的职位描述
  const role2023 = karpathy.roles.find(
    r => r.startDate &&
         r.startDate.getFullYear() === 2023 &&
         r.organization.name.includes('OpenAI')
  );

  if (role2023 && role2023.role === 'Employee') {
    await prisma.personRole.update({
      where: { id: role2023.id },
      data: {
        role: 'Research Scientist',
        roleZh: '研究科学家（回归）'
      }
    });
    console.log('\n✅ 已更新 2023 年职位描述: Employee → Research Scientist');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
