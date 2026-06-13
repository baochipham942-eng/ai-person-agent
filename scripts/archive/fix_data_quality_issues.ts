/**
 * 修复数据质量问题
 *
 * 问题类型：
 * 1. David Ha - QID 匹配错误（Q472547 是美国大法官 David Souter）
 * 2. Description 格式异常（抓取了 Wikidata 模板文本如 "XxxStudent", "XxxEmployee"）
 * 3. Description 抓取错误（包含 HTML/导航内容）
 * 4. Aakash Gupta - Wikidata 上没有对应人物，需手动补充
 */

import 'dotenv/config';
import { prisma } from '../lib/db/prisma';

// ============ 配置 ============

// David Ha 正确信息
const DAVID_HA_FIX = {
  id: 'cmjv6furu000lmfghb5zze4nm',
  qid: 'TEMP-david-ha-sakana', // 使用临时 QID（原 Q472547 是美国大法官 David Souter）
  description: 'Sakana AI 联合创始人兼 CEO，前 Google Brain 研究员。World Models 论文第一作者，Sketch-RNN 共同领导者。',
  organization: ['Sakana AI', 'Google Brain'],
};

// Aakash Gupta 正确信息 (based on LinkedIn: https://www.linkedin.com/in/aagupta)
const AAKASH_GUPTA_FIX = {
  id: 'cmjv6furu000gmfgh2tkuh8xm',
  qid: 'TEMP-aakash-gupta-product', // 使用临时 QID（Wikidata 无对应人物）
  description: 'AI 产品专家，Product Growth 创始人。前 Amplitude、Apollo.io 产品负责人。',
  organization: ['Product Growth'],
  topics: ['产品', '大语言模型'],
};

// Description 格式异常修复列表
const DESCRIPTION_FIXES: Array<{
  id: string;
  name: string;
  description: string;
  clearQid?: boolean;
}> = [
  {
    id: 'cmjtsxhyo00053est14oy641y',
    name: '李飞飞',
    description: '斯坦福大学教授，ImageNet 创建者，Google Cloud 前首席 AI 科学家。World Labs 联合创始人。',
  },
  {
    id: 'cmjv6furu000cmfghk9hx1jql',
    name: 'Paul Graham',
    description: 'Y Combinator 联合创始人，硅谷创业教父。Lisp 程序员、作家。',
  },
  {
    id: 'cmjv6furu000emfgh0aoztt24',
    name: 'Marc Andreessen',
    description: 'Andreessen Horowitz (a16z) 联合创始人，Netscape 创始人。硅谷最具影响力的风险投资人之一。',
  },
  {
    id: 'cmjv6furu000kmfgha9aias1i',
    name: 'Amanda Askell',
    description: 'Anthropic 角色训练负责人，前 OpenAI 研究员。哲学博士，专注于 AI 对齐与伦理。',
  },
  {
    id: 'cmjv6furu0008mfghimpelg81',
    name: 'Han Xiao',
    description: 'Jina AI 创始人兼 CEO。开源 AI 基础设施专家，DocArray、Finetuner 等项目创建者。',
  },
  {
    id: 'cmjv6furu000fmfgh7ck5ol2j',
    name: 'Matthew Berman',
    description: 'AI YouTuber 和技术博主，专注于大语言模型和 AI Agent 技术解读。',
  },
  {
    id: 'cmjv6furu000pmfghv7drjtak',
    name: 'Richard Socher',
    description: 'You.com 创始人兼 CEO，前 Salesforce 首席科学家。斯坦福 NLP 博士，GloVe 词向量共同作者。',
  },
  {
    id: 'cmjv6furu0005mfghkppozqo8',
    name: 'Zoubin Ghahramani',
    description: 'Google DeepMind 研究副总裁，剑桥大学信息工程教授。概率机器学习和贝叶斯方法权威。',
  },
  {
    id: 'cmjv6furu000nmfgh792b8quq',
    name: 'Ethan Mollick',
    description: '沃顿商学院教授，AI 在教育和商业应用领域的权威。《Co-Intelligence》作者。',
  },
  {
    id: 'cmjv6furu000hmfgh0d1egfwg',
    name: 'Eliezer Yudkowsky',
    description: 'MIRI (机器智能研究所) 联合创始人，AI 安全领域先驱。LessWrong 创始人。',
  },
  {
    id: 'cmjv6furu0006mfghaj1b1v4a',
    name: 'James Manyika',
    description: 'Google 技术与社会高级副总裁。前麦肯锡全球研究院主席，AI 政策与经济影响专家。',
  },
  {
    id: 'cmjv6furu000smfghreks2bnf',
    name: 'Allie K. Miller',
    description: 'AI 影响力人物，前 AWS AI 业务负责人。专注于企业 AI 战略与 AI 商业化。',
  },
  {
    id: 'cmjv6furu000dmfghyv96kktn',
    name: 'Chamath Palihapitiya',
    description: 'Social Capital 创始人兼 CEO，前 Facebook 增长副总裁。硅谷知名投资人。',
  },
  {
    id: 'cmjvd4npl0005kvtp6nhbtxpn',
    name: '沈向洋',
    description: '前微软全球执行副总裁、微软人工智能及研究事业部负责人。清华大学双聘教授，美国国家工程院外籍院士。',
  },
];

async function main() {
  console.log('=== 修复数据质量问题 ===\n');

  // 1. 修复 David Ha
  console.log('1. 修复 David Ha (QID 匹配错误)...');
  try {
    // 删除错误的 PersonRole 记录
    const deletedRoles = await prisma.personRole.deleteMany({
      where: { personId: DAVID_HA_FIX.id }
    });
    console.log(`   - 删除 ${deletedRoles.count} 条错误的 PersonRole 记录`);

    // 更新人物信息
    await prisma.people.update({
      where: { id: DAVID_HA_FIX.id },
      data: {
        qid: DAVID_HA_FIX.qid,
        description: DAVID_HA_FIX.description,
        organization: DAVID_HA_FIX.organization,
      }
    });
    console.log(`   - 更新 description 和 organization`);
    console.log('   ✅ David Ha 修复完成\n');
  } catch (e: any) {
    console.error(`   ❌ 失败: ${e.message}\n`);
  }

  // 2. 修复 Aakash Gupta
  console.log('2. 修复 Aakash Gupta (Wikidata 无对应人物)...');
  try {
    // 删除错误的 PersonRole 记录
    const deletedRoles = await prisma.personRole.deleteMany({
      where: { personId: AAKASH_GUPTA_FIX.id }
    });
    console.log(`   - 删除 ${deletedRoles.count} 条错误的 PersonRole 记录`);

    // 更新人物信息
    await prisma.people.update({
      where: { id: AAKASH_GUPTA_FIX.id },
      data: {
        qid: AAKASH_GUPTA_FIX.qid,
        description: AAKASH_GUPTA_FIX.description,
        organization: AAKASH_GUPTA_FIX.organization,
        topics: AAKASH_GUPTA_FIX.topics,
      }
    });
    console.log(`   - 更新 description、organization 和 topics`);
    console.log('   ✅ Aakash Gupta 修复完成\n');
  } catch (e: any) {
    console.error(`   ❌ 失败: ${e.message}\n`);
  }

  // 3. 修复 Description 格式异常
  console.log('3. 修复 Description 格式异常...');
  for (const fix of DESCRIPTION_FIXES) {
    try {
      await prisma.people.update({
        where: { id: fix.id },
        data: {
          description: fix.description,
          ...(fix.clearQid ? { qid: null } : {}),
        }
      });
      console.log(`   ✅ ${fix.name}`);
    } catch (e: any) {
      console.error(`   ❌ ${fix.name}: ${e.message}`);
    }
  }

  console.log('\n=== 修复完成 ===');

  // 输出修复统计
  const fixed = 2 + DESCRIPTION_FIXES.length;
  console.log(`共修复 ${fixed} 个人物的数据质量问题`);

  await prisma.$disconnect();
}

main().catch(console.error);
