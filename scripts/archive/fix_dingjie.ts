import { prisma } from '../lib/db/prisma';

async function main() {
  // 修复丁洁的数据 - 她是明尼苏达大学统计学院副教授，不是医生
  const dj = await prisma.people.findFirst({
    where: { name: '丁洁' }
  });

  if (dj === null) {
    console.log('未找到丁洁');
    return;
  }

  console.log('修复前:');
  console.log('  QID:', dj.qid);
  console.log('  职位:', dj.currentTitle);
  console.log('  描述:', dj.description);

  // 更新为正确的 AI 研究员信息
  await prisma.people.update({
    where: { id: dj.id },
    data: {
      // 注: qid 不能设为 null，保留原值但其他数据已修正
      currentTitle: 'Associate Professor @ University of Minnesota',
      description: '明尼苏达大学统计学院副教授，哈佛大学博士，研究领域包括AI基础理论、大模型高效训练、AI安全等。NSF CAREER Award获得者。',
      occupation: ['researcher', 'professor'],
      organization: ['University of Minnesota', 'Amazon AGI Team'],
      gender: 'female',
      country: 'US',
      education: [
        { degree: 'PhD', field: 'Engineering Sciences', institution: 'Harvard University', year: 2017 },
        { degree: 'BS', field: 'Electrical Engineering', institution: 'Tsinghua University', institutionZh: '清华大学', year: 2012 }
      ],
      topics: ['AI安全', '大语言模型', '高效训练', '可解释性'],
      highlights: [
        { icon: '🏆', text: 'NSF CAREER Award 获得者' },
        { icon: '🏆', text: 'Meta Research Award' },
        { icon: '📄', text: '3300+ Google Scholar 引用' }
      ],
      roleCategory: 'professor'
    }
  });

  // 删除错误的履历（医院相关）
  await prisma.personRole.deleteMany({
    where: {
      personId: dj.id,
      organization: { name: { contains: '医院' } }
    }
  });

  console.log('\n修复后:');
  const updated = await prisma.people.findUnique({ where: { id: dj.id } });
  console.log('  职位:', updated?.currentTitle);
  console.log('  描述:', updated?.description);
  console.log('  ✅ 已修复');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
