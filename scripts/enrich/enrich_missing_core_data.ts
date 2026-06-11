/**
 * 补充 completeness=0 但 status=ready 的人物核心数据
 *
 * 针对缺失头像、描述、话题等核心字段的人物进行补充
 * 使用 Perplexity 搜索 + DeepSeek 提取结构化数据
 *
 * 用法: npx tsx scripts/enrich/enrich_missing_core_data.ts [--limit N] [--name "xxx"]
 */

import 'dotenv/config';
import { prisma } from '../../lib/db/prisma';
import { chatStructuredCompletion } from '../../lib/ai/deepseek';

// AI 话题标签
const AI_TOPICS = [
  '大语言模型', 'Transformer', 'RAG', 'Agent', '多模态', '推理',
  'Scaling', '高效训练', '强化学习', '自监督学习', 'RLHF',
  '代码生成', 'NLP', '计算机视觉', '语音', '机器人', '自动驾驶',
  'Memory', 'Deep Research', 'Eval', '个性化', '知识图谱', 'MoE',
  '对齐', '安全', '合规', '可解释性',
  '医疗AI', '教育', '金融AI', '创意生成',
  '开源', '产品', '基础设施', '芯片', 'AGI'
];

interface PersonCoreData {
  description: string;
  whyImportant: string;
  occupation: string[];
  organization: string[];
  currentTitle: string;
  topics: string[];
  highlights: { icon: string; text: string }[];
  officialLinks: { type: string; url: string }[];
  avatarUrl?: string;
  gender?: string;
  country?: string;
}

/**
 * 使用 Perplexity 搜索人物信息
 */
async function searchWithPerplexity(personName: string, aliases: string[]): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.log('  ⚠️ PERPLEXITY_API_KEY not set');
    return '';
  }

  // 构建搜索名称，包含别名
  const searchNames = [personName, ...aliases.filter(a => a !== personName)].slice(0, 3);
  const searchQuery = searchNames.join(' OR ');

  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a research assistant. Provide comprehensive, factual information about the person.'
          },
          {
            role: 'user',
            content: `Please provide a comprehensive profile of "${searchQuery}" who works in AI/Machine Learning/Tech industry. Include:
1. Current position and organization
2. Career history (companies, universities, roles)
3. Key contributions and achievements in AI
4. Educational background
5. Notable publications, projects, or products they created
6. Social media handles (Twitter/X, GitHub, LinkedIn, personal website)
7. Nationality and gender if publicly known

Focus on their AI/tech career only. If there are multiple people with this name, focus on the one in AI/ML/tech.`
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!res.ok) {
      console.log(`  ⚠️ Perplexity API error: ${res.status}`);
      return '';
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (e) {
    console.log(`  ⚠️ Perplexity search failed: ${e}`);
    return '';
  }
}

/**
 * 使用 DeepSeek 提取结构化数据
 */
async function extractWithDeepSeek(personName: string, rawContent: string): Promise<PersonCoreData | null> {
  const systemPrompt = `你是一个 AI 领域专家，负责从文本中提取人物信息并返回结构化 JSON。

可选的 AI 话题标签列表：
${AI_TOPICS.join(', ')}

请严格返回以下 JSON 格式（不要添加任何其他内容）：
{
  "description": "一句话中文简介，说明此人是谁、做什么的",
  "whyImportant": "为什么此人在 AI 领域重要，2-3句话说明主要贡献",
  "occupation": ["职业1", "职业2"],
  "organization": ["当前/主要组织"],
  "currentTitle": "当前职位 @ 组织",
  "topics": ["话题1", "话题2", "话题3"],
  "highlights": [
    {"icon": "📄", "text": "代表性成就1"},
    {"icon": "💻", "text": "代表性成就2"}
  ],
  "officialLinks": [
    {"type": "twitter", "url": "https://twitter.com/xxx"},
    {"type": "github", "url": "https://github.com/xxx"},
    {"type": "website", "url": "https://xxx.com"}
  ],
  "gender": "male/female/unknown",
  "country": "US/CN/UK 等 ISO 代码"
}

注意：
- topics 必须从上述列表中选择
- highlights 的 icon 可以是: 📄(论文) 💻(代码/产品) 🏆(奖项) 🎬(视频) 🔥(热点)
- officialLinks 的 type 可以是: twitter, github, linkedin, website, youtube, scholar
- 如果信息不确定，可以省略该字段`;

  try {
    const result = await chatStructuredCompletion<PersonCoreData>(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请分析以下关于 "${personName}" 的信息并提取结构化数据：\n\n${rawContent}` }
      ],
      { temperature: 0.1 }
    );
    return result;
  } catch (e) {
    console.log(`  ⚠️ DeepSeek extraction failed: ${e}`);
    return null;
  }
}

/**
 * 尝试获取头像 URL
 */
async function fetchAvatarUrl(personName: string, links: { type: string; url: string }[]): Promise<string | null> {
  // 优先从 Twitter 获取
  const twitterLink = links.find(l => l.type === 'twitter');
  if (twitterLink) {
    const match = twitterLink.url.match(/twitter\.com\/(\w+)|x\.com\/(\w+)/);
    const handle = match?.[1] || match?.[2];
    if (handle) {
      // 使用 unavatar.io 获取头像
      return `https://unavatar.io/twitter/${handle}`;
    }
  }

  // 从 GitHub 获取
  const githubLink = links.find(l => l.type === 'github');
  if (githubLink) {
    const match = githubLink.url.match(/github\.com\/(\w+)/);
    const username = match?.[1];
    if (username) {
      return `https://unavatar.io/github/${username}`;
    }
  }

  return null;
}

/**
 * 更新数据库
 */
async function updatePerson(personId: string, data: PersonCoreData): Promise<void> {
  const updateData: any = {};

  if (data.description) updateData.description = data.description;
  if (data.whyImportant) updateData.whyImportant = data.whyImportant;
  if (data.occupation?.length) updateData.occupation = data.occupation;
  if (data.organization?.length) updateData.organization = data.organization;
  if (data.currentTitle) updateData.currentTitle = data.currentTitle;
  if (data.topics?.length) updateData.topics = data.topics;
  if (data.highlights?.length) updateData.highlights = data.highlights;
  if (data.officialLinks?.length) updateData.officialLinks = data.officialLinks;
  if (data.avatarUrl) updateData.avatarUrl = data.avatarUrl;
  if (data.gender) updateData.gender = data.gender;
  if (data.country) updateData.country = data.country;

  await prisma.people.update({
    where: { id: personId },
    data: updateData,
  });
}

/**
 * 计算新的 completeness
 */
function calculateCompleteness(person: any): number {
  let score = 0;

  if (person.avatarUrl) score += 15;
  if (person.description && person.description.length > 20) score += 10;
  if (person.occupation?.length > 0) score += 10;
  if (person.organization?.length > 0) score += 10;

  const links = person.officialLinks || [];
  const linksCount = Array.isArray(links) ? links.length : 0;
  score += Math.min(10, linksCount * 3);

  if (person.gender) score += 2.5;
  if (person.country) score += 2.5;

  const itemCount = person._count?.rawPoolItems || 0;
  score += Math.min(20, itemCount * 2);

  const roleCount = person._count?.roles || 0;
  score += Math.min(10, roleCount * 3);

  const cardCount = person._count?.cards || 0;
  score += Math.min(10, cardCount * 2);

  return Math.round(score);
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const nameArg = args.find(a => a.startsWith('--name='));

  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 100;
  const filterName = nameArg ? nameArg.split('=')[1] : null;

  console.log('=== 补充缺失核心数据 ===\n');

  // 查找需要补充的人物
  const whereClause: any = {
    status: 'ready',
    completeness: 0,
  };

  if (filterName) {
    whereClause.name = { contains: filterName };
  }

  const people = await prisma.people.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      aliases: true,
      description: true,
      avatarUrl: true,
      occupation: true,
      organization: true,
      officialLinks: true,
      _count: {
        select: { rawPoolItems: true, roles: true, cards: { where: { isActive: true } } }
      }
    },
    take: limit,
  });

  console.log(`找到 ${people.length} 个需要补充的人物\n`);

  let successCount = 0;
  let failCount = 0;

  for (const person of people) {
    console.log(`\n🔍 处理: ${person.name}`);
    console.log(`   别名: ${person.aliases.join(', ')}`);

    // 1. 使用 Perplexity 搜索
    console.log('   搜索人物信息...');
    const rawContent = await searchWithPerplexity(person.name, person.aliases);

    if (!rawContent) {
      console.log('   ❌ 未找到信息');
      failCount++;
      continue;
    }

    // 2. 使用 DeepSeek 提取结构化数据
    console.log('   提取结构化数据...');
    const extractedData = await extractWithDeepSeek(person.name, rawContent);

    if (!extractedData) {
      console.log('   ❌ 提取失败');
      failCount++;
      continue;
    }

    // 3. 尝试获取头像
    if (!person.avatarUrl && extractedData.officialLinks?.length) {
      console.log('   获取头像...');
      extractedData.avatarUrl = await fetchAvatarUrl(person.name, extractedData.officialLinks) || undefined;
    }

    // 4. 更新数据库
    console.log('   更新数据库...');
    await updatePerson(person.id, extractedData);

    // 5. 重新获取并计算 completeness
    const updated = await prisma.people.findUnique({
      where: { id: person.id },
      include: {
        _count: { select: { rawPoolItems: true, roles: true, cards: { where: { isActive: true } } } }
      }
    });

    if (updated) {
      const newCompleteness = calculateCompleteness(updated);
      await prisma.people.update({
        where: { id: person.id },
        data: { completeness: newCompleteness }
      });
      console.log(`   ✅ 完成! completeness: 0% -> ${newCompleteness}%`);
    }

    successCount++;

    // 打印提取的关键信息
    console.log(`   📝 ${extractedData.currentTitle || 'N/A'}`);
    console.log(`   🏷️  话题: ${extractedData.topics?.join(', ') || 'N/A'}`);

    // 避免 API 限流
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n=== 完成 ===');
  console.log(`成功: ${successCount}, 失败: ${failCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
