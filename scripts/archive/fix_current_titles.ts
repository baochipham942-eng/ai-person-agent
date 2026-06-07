/**
 * 修复 currentTitle 字段中的错误数据
 * 这些数据可能来自 Wikidata 的历史职位信息
 */

import { prisma } from '../lib/db/prisma';

// 需要修复的人物及其正确的 currentTitle
const TITLE_FIXES: Record<string, string> = {
  // AI 领域重要人物 - 第一批
  'Yann LeCun': 'VP & Chief AI Scientist @ Meta',
  'Geoffrey Hinton': 'Professor Emeritus @ University of Toronto',
  'Yoshua Bengio': 'Scientific Director @ Mila, Professor @ Université de Montréal',
  'Greg Brockman': 'Co-founder & President @ OpenAI',
  'Andrej Karpathy': 'Founder @ Eureka Labs',
  'Demis Hassabis': 'Co-founder & CEO @ Google DeepMind',
  'Ilya Sutskever': 'Co-founder & Chief Scientist @ Safe Superintelligence Inc.',
  'John Schulman': 'Co-founder @ Anthropic',
  'Sam Altman': 'CEO @ OpenAI',
  'Dario Amodei': 'CEO @ Anthropic',
  'Jason Wei': 'Research Scientist @ OpenAI',
  'Percy Liang': 'Associate Professor @ Stanford University',

  // 第二批 - 更多重要人物
  'Christopher Manning': 'Professor @ Stanford University',
  'Aidan Gomez': 'CEO & Co-founder @ Cohere',
  'Han Xiao': 'CEO & Founder @ Jina AI',
  '黄仁勋': 'CEO & Founder @ Nvidia',
  '杰夫·迪恩': 'Chief Scientist @ Google DeepMind',
  '吴恩达': 'Founder @ DeepLearning.AI, Coursera',
  '唐杰': 'Professor @ Tsinghua University',
  '朱军': 'Professor @ Tsinghua University',
  '萨提亚·纳德拉': 'CEO @ Microsoft',
  '印奇': 'CEO & Co-founder @ 旷视科技',
  '谢尔盖·布林': 'Co-founder & Board Member @ Alphabet',
  '何凯明': 'Research Scientist @ Meta AI',
  '吉滕德拉·马利克': 'Professor @ UC Berkeley',
  '拉里·佩奇': 'Co-founder @ Alphabet',
  '纳夫迪普·杰特利': 'Professor @ University of Toronto',
  '塞缪尔·瑞安·鲍曼': 'Associate Professor @ NYU',
  '亚林·加尔': 'Professor @ University of Oxford',
  '恰拉尔·居尔切赫雷': 'Research Scientist @ Google DeepMind',
  '伊恩·J·古德费洛': 'Research Director @ Google DeepMind',
  '彼得·阿比尔': 'Professor @ UC Berkeley',
  '彼得罗·佩罗纳': 'Professor @ Caltech',
  '帕斯卡尔·文森特': 'Research Director @ Meta AI',
  '梁明涛': 'Professor @ National University of Singapore',
  '普拉纳夫·拉杰普尔卡': 'Professor @ Stanford University',
  'Hugo Larochelle': 'Research Director @ Google DeepMind',
  '杜米特鲁·埃尔汉': 'Staff Research Scientist @ Google DeepMind',
  '雅各布·斯坦哈特': 'Assistant Professor @ UC Berkeley',
  '克里斯托弗·K·I·威廉姆斯': 'Professor @ University of Edinburgh',
  '布伦丹·J·弗雷': 'Professor @ University of Toronto',
  '詹姆斯·马滕斯': 'Research Scientist @ Google DeepMind',
  '苏浩': 'Professor @ Beihang University',
  '鲁斯兰·萨拉赫丁诺夫': 'Professor @ Carnegie Mellon University',
  '索拉布·古普塔': 'Research Scientist @ Meta AI',
  '凯尔文·顾': 'Assistant Professor @ MIT',
  '舒布汉·图尔西亚尼': 'Assistant Professor @ CMU',
  '大卫·杜维诺': 'Professor @ University of Toronto',
  '德米特里·巴丹瑙': 'Research Scientist @ Apple',
  'Harrison Chase': 'CEO & Co-founder @ LangChain',
  '尼蒂什·斯里瓦斯塔瓦': 'Research Scientist @ Apple',
  '塞雷娜·杨-利维': 'Assistant Professor @ Stanford University',
  '吉米·巴': 'Professor @ University of Toronto',
  '乔恩·巴伦': 'Research Scientist @ Google DeepMind',
  '齐科·科尔特': 'Professor @ CMU',
  '克里斯蒂娜·N·图塔诺娃': 'Research Scientist @ Google DeepMind',
  '沙基尔·穆罕默德': 'Staff Research Scientist @ Google DeepMind',
  '谢尔盖·贝隆吉': 'Professor @ Caltech',
  '安德烈·姆尼赫': 'Professor @ Princeton University',
  '理查德·S·泽梅尔': 'Professor @ University of Toronto',
  '胡安·卡洛斯·尼布勒斯': 'Professor @ Princeton University',
  '阿卜杜勒-拉赫曼·穆罕默德': 'Research Scientist @ Google DeepMind',
  '乔治·爱德华·达尔': 'Research Scientist @ Google DeepMind',
  '巴拉特·哈里哈兰': 'Assistant Professor @ Cornell University',
  '奥尼·汉农': 'Research Scientist @ Meta AI',
  'Yann Dauphin': 'Research Scientist @ Anthropic',
  '伊恩·默里': 'Professor @ University of Edinburgh',
  '马克·奥雷利奥·兰扎托': 'Professor @ NYU',
  '雷亚·哈德塞尔': 'VP Research @ Google DeepMind',
  '阿列克谢·A·埃夫罗斯': 'Professor @ UC Berkeley',
  '阿舒托什·萨克塞纳': 'Associate Professor @ Cornell University',
  '保罗·德贝维奇': 'Research Scientist @ Google',
  '大卫·洛佩兹-帕兹': 'Research Scientist @ Meta AI',
  '蒂门·蒂勒曼': 'Senior Staff Research Scientist @ Google DeepMind',
  '贾斯汀·约翰逊': 'Assistant Professor @ University of Michigan',
  '乔治亚·吉奥克萨里': 'Research Scientist @ Google DeepMind',
  '郑宇怀': 'Research Scientist @ Google',
  '凯瑟琳·A·海勒': 'Professor @ Duke University',
  '詹姆斯·伯格斯特拉': 'CEO @ Hyperopt',
  '蒂姆尼特·格布鲁': 'Founder @ DAIR Institute',
  '于克朱': 'Research Scientist @ Apple',
  '李宏乐': 'Professor @ University of Michigan',
  '吉姆·范': 'Research Scientist @ Stanford University',

  // 中国 AI 领域
  '贾扬清': 'Co-founder @ Lepton AI',
  '亚历克斯·克里泽夫斯基': 'Former Researcher @ Google',
  '拉德福德·M·尼尔': 'Professor @ University of Toronto',
  '拉兹万·帕斯卡努': 'Staff Research Scientist @ Google DeepMind',
  '李莲': 'Researcher @ OpenAI',
  'Haofan Wang': 'Co-founder & CEO @ InstantID',
  '季逸超': 'Co-founder & Chief Scientist @ Peak Labs',

  // OpenAI 相关
  'Jerry Tworek': 'Research Lead @ OpenAI',
  'Jakub Pachocki': 'Chief Scientist @ OpenAI',
  'Mark Chen': 'Chief Research Officer @ OpenAI',
  'Yann Dubois': 'Research Scientist @ OpenAI',

  // 其他
  'Alexander Amini': 'Co-founder & Chief Scientist @ Liquid AI',
  'Tri Dao': 'Chief Scientist @ Together AI',
  'Jay Alammar': 'Director & Engineering Fellow @ Cohere',
};

// 带重试的更新函数
async function updateWithRetry(name: string, correctTitle: string, maxRetries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await prisma.people.updateMany({
        where: { name },
        data: { currentTitle: correctTitle }
      });
      return result.count > 0;
    } catch (error: any) {
      if (attempt < maxRetries) {
        console.log(`   ⟳ ${name} 重试 ${attempt}/${maxRetries}...`);
        await new Promise(r => setTimeout(r, 1000 * attempt)); // 指数退避
      } else {
        console.error(`   ❌ ${name} 更新失败: ${error.message}`);
        return false;
      }
    }
  }
  return false;
}

async function main() {
  console.log('🔧 修复 currentTitle 数据...\n');

  let updated = 0;
  let notFound = 0;
  let failed = 0;

  const entries = Object.entries(TITLE_FIXES);

  // 分批处理，每批 10 个
  const batchSize = 10;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);

    for (const [name, correctTitle] of batch) {
      const success = await updateWithRetry(name, correctTitle);
      if (success) {
        console.log(`✅ ${name}`);
        updated++;
      } else {
        notFound++;
      }
    }

    // 批次间休息
    if (i + batchSize < entries.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`\n📊 统计: 更新 ${updated} 条, 未找到 ${notFound} 条`);

  // 查找其他可能有问题的记录（currentTitle 包含 "Student"）
  console.log('\n🔍 检查其他可能有问题的记录...');
  const suspiciousTitles = await prisma.people.findMany({
    where: {
      OR: [
        { currentTitle: { contains: 'Student', mode: 'insensitive' } },
        { currentTitle: { contains: 'student', mode: 'insensitive' } },
        { currentTitle: { contains: 'Member @', mode: 'insensitive' } }
      ]
    },
    select: { name: true, currentTitle: true },
    orderBy: { influenceScore: 'desc' }
  });

  if (suspiciousTitles.length > 0) {
    console.log(`⚠️ 发现 ${suspiciousTitles.length} 条可疑记录:`);
    suspiciousTitles.forEach(p => {
      console.log(`   - ${p.name}: ${p.currentTitle}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
