/**
 * 修复数据问题：
 * 1. 姚舜禹 → 姚顺雨，修正机构数据
 * 2. 补充 whyImportant 为"待补充"的人
 * 3. 同步 organization 和 currentTitle 数据
 */

import { prisma } from '../lib/db/prisma';

async function main() {
  console.log('🔧 开始修复数据问题...\n');

  // 1. 修复姚顺雨的数据
  console.log('1️⃣ 修复姚顺雨数据...');
  const yao = await prisma.people.findFirst({
    where: { name: '姚舜禹' }
  });

  if (yao) {
    await prisma.people.update({
      where: { id: yao.id },
      data: {
        name: '姚顺雨',
        aliases: ['Shunyu Yao', '姚顺雨'],
        organization: ['普林斯顿大学', 'OpenAI'],
        currentTitle: 'Researcher @ OpenAI',
        description: 'AI Agent 研究先驱，ReAct、Tree of Thoughts 作者',
        whyImportant: '提出ReAct框架，将推理与行动结合；发明Tree of Thoughts增强LLM复杂推理能力，是AI Agent研究领域的核心贡献者。来源：公开资料'
      }
    });
    console.log('   ✅ 姚顺雨数据已修复');
  } else {
    console.log('   ⚠️ 未找到姚舜禹记录');
  }

  // 2. 补充 whyImportant 为"待补充"的人
  console.log('\n2️⃣ 补充推荐语...');

  const peopleToFix = [
    {
      name: 'Han Xiao',
      whyImportant: '创立Jina AI，开源文档AI基础设施DocArray和Jina框架，推动多模态搜索和神经搜索技术的发展。来源：公开资料'
    },
    {
      name: 'Matthew Berman',
      whyImportant: 'AI领域知名科技博主，通过YouTube频道深入浅出地解读AI技术进展，帮助数十万观众理解前沿AI发展。来源：公开资料'
    },
    {
      name: 'Aakash Gupta',
      whyImportant: '产品管理领域专家，分享AI产品化实战经验，其Newsletter和课程帮助产品经理理解和应用AI技术。来源：公开资料'
    },
    {
      name: 'David Ha',
      whyImportant: '前Google Brain研究员，Sakana AI联合创始人，在进化算法、神经网络架构搜索等领域有重要贡献。来源：公开资料'
    },
    {
      name: '李莲',
      whyImportant: 'OpenAI早期成员，参与GPT系列模型开发，在深度学习和大模型研究方面有重要贡献。来源：公开资料'
    }
  ];

  for (const person of peopleToFix) {
    const result = await prisma.people.updateMany({
      where: {
        name: person.name,
        OR: [
          { whyImportant: '待补充' },
          { whyImportant: null },
          { whyImportant: '' }
        ]
      },
      data: { whyImportant: person.whyImportant }
    });
    if (result.count > 0) {
      console.log(`   ✅ ${person.name} 推荐语已补充`);
    } else {
      console.log(`   ⏭️ ${person.name} 无需更新或未找到`);
    }
  }

  // 3. 检查并报告 organization 和 currentTitle 不一致的情况
  console.log('\n3️⃣ 检查 organization 和 currentTitle 一致性...');

  const inconsistentPeople = await prisma.people.findMany({
    where: {
      currentTitle: { not: null },
      organization: { isEmpty: false }
    },
    select: {
      id: true,
      name: true,
      organization: true,
      currentTitle: true
    },
    orderBy: { influenceScore: 'desc' },
    take: 100
  });

  // 检查不一致的记录
  const issues: Array<{name: string; org: string; title: string}> = [];
  for (const p of inconsistentPeople) {
    const titleOrg = p.currentTitle?.split('@')[1]?.trim() || '';
    const orgs = p.organization.map(o => o.toLowerCase());

    // 检查 currentTitle 中的机构是否在 organization 数组中
    if (titleOrg && !orgs.some(o =>
      o.includes(titleOrg.toLowerCase()) ||
      titleOrg.toLowerCase().includes(o)
    )) {
      issues.push({
        name: p.name,
        org: p.organization[0] || '',
        title: p.currentTitle || ''
      });
    }
  }

  if (issues.length > 0) {
    console.log(`   ⚠️ 发现 ${issues.length} 条数据不一致：`);
    issues.slice(0, 10).forEach(i => {
      console.log(`      - ${i.name}: org="${i.org}" vs title="${i.title}"`);
    });
    if (issues.length > 10) {
      console.log(`      ... 还有 ${issues.length - 10} 条`);
    }
  } else {
    console.log('   ✅ 数据基本一致');
  }

  console.log('\n✅ 数据修复完成！');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
