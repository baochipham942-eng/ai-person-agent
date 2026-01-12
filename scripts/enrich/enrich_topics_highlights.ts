/**
 * 批量提炼人物的 AI 话题标签和卡片亮点
 * 使用 DeepSeek 分析人物信息，生成结构化数据
 *
 * 用法: bun scripts/enrich/enrich_topics_highlights.ts [--limit N] [--force]
 */

import { prisma } from '../../lib/db/prisma';
import { chatStructuredCompletion, type ChatMessage } from '../../lib/ai/deepseek';

// AI 话题标签预定义列表 - 扩展版（导出供其他脚本使用）
export const AI_TOPICS = [
  // 核心技术
  '大语言模型', 'Transformer', 'RAG', 'Agent', '多模态', '推理',
  // 训练与优化
  'Scaling', '高效训练', '强化学习', '自监督学习', 'RLHF',
  // 应用方向
  '代码生成', 'NLP', '计算机视觉', '语音', '机器人', '自动驾驶',
  // 新兴热点
  'Memory', 'Deep Research', 'Eval', '个性化', '知识图谱', 'MoE',
  // 安全与治理
  '对齐', '安全', '合规', '可解释性',
  // 行业应用
  '医疗AI', '教育', '金融AI', '创意生成',
  // 生态
  '开源', '产品', '基础设施', '芯片', 'AGI'
];

// 角色分类
const ROLE_CATEGORIES = {
  researcher: ['人工智能研究员', '计算机科学家', '数据科学家', '机器学习工程师', 'Researcher', '研究员', '神经科学家'],
  founder: ['企业家', 'CEO', '创始人', '首席执行官', 'Entrepreneur', 'Founder', '科技创业者', '科技企业家'],
  engineer: ['工程师', '程序员', '软件工程师', 'Engineer', 'Software Engineer', '机器学习工程师', '软件开发员'],
  professor: ['教授', '大学教师', 'Professor', 'Scholar', '学者'],
  evangelist: ['作家', 'Author', '布道者', 'KOL']
};

interface EnrichResult {
  topics: string[];
  highlights: Array<{ icon: string; text: string }>;
  roleCategory: string;
}

/**
 * 根据 occupation 判断角色分类
 */
function inferRoleCategory(occupations: string[]): string {
  // 优先级: founder > professor > researcher > engineer > evangelist
  const priorities = ['founder', 'professor', 'researcher', 'engineer', 'evangelist'];

  for (const category of priorities) {
    const keywords = ROLE_CATEGORIES[category as keyof typeof ROLE_CATEGORIES];
    for (const occ of occupations) {
      if (keywords.some(kw => occ.toLowerCase().includes(kw.toLowerCase()))) {
        return category;
      }
    }
  }

  return 'researcher'; // 默认
}

/**
 * 使用 DeepSeek 提炼人物的 AI 话题和亮点
 */
async function enrichPersonWithAI(person: {
  id: string;
  name: string;
  aliases: string[];
  description: string | null;
  whyImportant: string | null;
  occupation: string[];
  organization: string[];
}): Promise<EnrichResult> {

  // 先根据 occupation 推断角色
  const roleCategory = inferRoleCategory(person.occupation);

  const systemPrompt = `你是一个 AI 领域专家，负责分析 AI 领域人物的贡献和特点。

任务：根据人物信息，提取以下数据：

1. **AI 话题标签 (topics)**：从以下列表中选择 2-4 个最相关的话题：
   ${AI_TOPICS.join(', ')}

2. **卡片亮点 (highlights)**：提取 2 条最具代表性的成就或贡献，格式为：
   - 📄 论文/研究成果
   - 🔥 热门新闻/动态
   - 💻 开源项目/产品
   - 🏆 奖项/荣誉
   - 🎬 视频/课程

注意：
- 只选择该人物在 AI 领域的贡献
- 亮点要具体、可验证，避免模糊描述
- 优先选择高影响力、知名度高的成就
- 确保人物识别准确，避免混淆同名人物`;

  const userPrompt = `请分析以下 AI 领域人物：

姓名：${person.name}
别名：${person.aliases.join(', ') || '无'}
职业：${person.occupation.join(', ')}
机构：${person.organization.join(', ')}
简介：${person.description || '无'}
AI 贡献：${person.whyImportant || '无'}

请返回 JSON 格式：
{
  "topics": ["话题1", "话题2"],
  "highlights": [
    {"icon": "📄", "text": "成就描述1"},
    {"icon": "🔥", "text": "成就描述2"}
  ]
}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  try {
    const result = await chatStructuredCompletion<{
      topics: string[];
      highlights: Array<{ icon: string; text: string }>;
    }>(messages, { temperature: 0.3, maxTokens: 1000 });

    // 验证话题是否在预定义列表中
    const validTopics = result.topics.filter(t =>
      AI_TOPICS.some(at => at.toLowerCase() === t.toLowerCase())
    );

    return {
      topics: validTopics.length > 0 ? validTopics : result.topics.slice(0, 4),
      highlights: result.highlights.slice(0, 2),
      roleCategory
    };
  } catch (error) {
    console.error(`  ❌ AI 提炼失败: ${error}`);
    // 返回基于规则的默认值
    return {
      topics: [],
      highlights: [],
      roleCategory
    };
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  const force = args.includes('--force');

  console.log('🚀 开始提炼人物话题和亮点...\n');

  // 获取需要处理的人物
  // 注意：Prisma 对 JSON 字段的 null 查询需要使用 equals: null
  const whereClause = force
    ? {}
    : {
        OR: [
          { topics: { isEmpty: true } },
          { highlights: { equals: null } },
          { roleCategory: { equals: null } }
        ]
      };

  const people = await prisma.people.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      aliases: true,
      description: true,
      whyImportant: true,
      occupation: true,
      organization: true,
    },
    take: limit,
    orderBy: { aiContributionScore: 'desc' }
  });

  console.log(`📋 找到 ${people.length} 个人物需要处理\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < people.length; i++) {
    const person = people[i];
    console.log(`[${i + 1}/${people.length}] 处理: ${person.name}`);

    try {
      const result = await enrichPersonWithAI(person);

      await prisma.people.update({
        where: { id: person.id },
        data: {
          topics: result.topics,
          highlights: result.highlights,
          roleCategory: result.roleCategory
        }
      });

      console.log(`  ✅ 话题: ${result.topics.join(', ')}`);
      console.log(`  ✅ 角色: ${result.roleCategory}`);
      console.log(`  ✅ 亮点: ${result.highlights.length} 条`);
      successCount++;

      // 避免 API 限流
      await new Promise(r => setTimeout(r, 500));

    } catch (error) {
      console.error(`  ❌ 失败: ${error}`);
      errorCount++;
    }
  }

  console.log('\n📊 处理完成');
  console.log(`  ✅ 成功: ${successCount}`);
  console.log(`  ❌ 失败: ${errorCount}`);
}

// 仅在直接运行时执行，避免被 import 时触发
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('enrich_topics_highlights.ts')) {
  main()
    .catch(console.error)
    .finally(() => process.exit(0));
}
