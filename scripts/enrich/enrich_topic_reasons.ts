/**
 * 为人物的话题贡献生成推荐语
 * 解释每个人物与其话题标签的具体关系
 *
 * 用法: bun scripts/enrich/enrich_topic_reasons.ts [--limit N] [--force] [--quiet]
 */

import { prisma } from '../../lib/db/prisma';
import { chatStructuredCompletion, type ChatMessage } from '../../lib/ai/deepseek';

interface TopicDetailWithReason {
  topic: string;
  rank: number;
  reason: string;  // 推荐语：人物与话题的关系
  quote?: { text: string; source: string; url?: string };
}

interface PersonData {
  id: string;
  name: string;
  aliases: string[];
  description: string | null;
  whyImportant: string | null;
  topics: string[];
  topicRanks: Record<string, number> | null;
  topicDetails: TopicDetailWithReason[] | null;
  products: any[] | null;
  occupation: string[];
  organization: string[];
  roles: Array<{
    role: string;
    roleZh: string | null;
    organization: { name: string; nameZh: string | null };
  }>;
}

/**
 * 使用 DeepSeek 为人物的每个话题生成推荐语
 */
async function generateTopicReasons(person: PersonData): Promise<TopicDetailWithReason[]> {
  if (!person.topics || person.topics.length === 0) {
    return [];
  }

  // 收集人物信息
  const rolesText = person.roles
    .map(r => `${r.roleZh || r.role} @ ${r.organization.nameZh || r.organization.name}`)
    .slice(0, 5)
    .join('; ');

  const productsText = person.products
    ?.map((p: any) => `${p.name}${p.org ? ` (${p.org})` : ''}`)
    .slice(0, 5)
    .join(', ') || '';

  // 保留已有的 rank 信息（优先从 topicDetails，其次从 topicRanks）
  const existingDetails = (person.topicDetails || []) as TopicDetailWithReason[];
  const detailRanks = new Map(existingDetails.map(d => [d.topic, d.rank]));
  const topicRanks = person.topicRanks || {};
  const existingRanks = new Map(
    person.topics.map(t => [t, detailRanks.get(t) || topicRanks[t] || 99])
  );

  const systemPrompt = `你是 AI 领域专家。任务：为一位 AI 人物的每个话题标签生成一句推荐语。

要求：
1. 推荐语要具体说明此人与该话题的关系
2. 点明具体贡献：论文、产品、项目、成就等
3. 长度：15-30 字，简洁有力
4. 不要用"此人"、"该人物"等指代，直接描述贡献
5. 避免空泛描述如"在该领域有贡献"

示例：
- 吴恩达 + 教育 → "Coursera 联合创始人，ML 公开课全球学员超千万"
- Jeff Dean + 基础设施 → "主导 MapReduce、TensorFlow、TPU 等核心基础设施研发"
- Ilya Sutskever + Scaling → "提出并验证 Scaling Laws，推动 GPT 系列模型突破"
- Lukasz Kaiser + Transformer → "Attention Is All You Need 论文共同一作"`;

  const userPrompt = `请为以下人物的每个话题生成推荐语：

姓名：${person.name}
别名：${person.aliases.join(', ') || '无'}
职业：${person.occupation.join(', ')}
机构：${person.organization.join(', ')}
履历：${rolesText || '无'}
代表作品：${productsText || '无'}
简介：${person.description || '无'}
AI 贡献：${person.whyImportant || '无'}

话题列表：${person.topics.join(', ')}

请返回 JSON 数组格式：
[
  { "topic": "话题名", "reason": "推荐语" },
  ...
]`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  const result = await chatStructuredCompletion<Array<{ topic: string; reason: string }>>(
    messages,
    { temperature: 0.3, maxTokens: 1500 }
  );

  // 合并 AI 生成的 reason 和已有的 rank
  return person.topics.map(topic => {
    const aiResult = result.find(r => r.topic === topic);
    const existingRank = existingRanks.get(topic) || 99;

    return {
      topic,
      rank: existingRank,
      reason: aiResult?.reason || `${topic} 领域贡献者`
    };
  });
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  const force = args.includes('--force');
  const quiet = args.includes('--quiet');

  const log = (msg: string) => { if (!quiet) console.log(msg); };

  log('🚀 开始生成话题推荐语...\n');

  // 获取有话题但缺少 reason 的人物
  const people = await prisma.people.findMany({
    where: {
      topics: { isEmpty: false },
      status: { in: ['active', 'ready'] },
      ...(force ? {} : {
        OR: [
          { topicDetails: { equals: null } },
          { topicDetails: { equals: [] } },
          // 检查 topicDetails 中是否缺少 reason 字段（需要在代码中过滤）
        ]
      })
    },
    select: {
      id: true,
      name: true,
      aliases: true,
      description: true,
      whyImportant: true,
      topics: true,
      topicRanks: true,
      topicDetails: true,
      products: true,
      occupation: true,
      organization: true,
      roles: {
        select: {
          role: true,
          roleZh: true,
          organization: {
            select: { name: true, nameZh: true }
          }
        },
        take: 5,
        orderBy: { startDate: 'desc' }
      }
    },
    take: limit,
    orderBy: { influenceScore: 'desc' }
  });

  // 过滤出确实需要更新的人物（topicDetails 中缺少 reason）
  const peopleToProcess = force ? people : people.filter(p => {
    const details = p.topicDetails as TopicDetailWithReason[] | null;
    if (!details || details.length === 0) return true;
    // 检查是否所有话题都有 reason
    return details.some(d => !d.reason);
  });

  log(`📋 找到 ${peopleToProcess.length} 个人物需要处理\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < peopleToProcess.length; i++) {
    const person = peopleToProcess[i] as PersonData;

    if (quiet && i % 10 === 0) {
      console.log(`进度: ${i}/${peopleToProcess.length}`);
    }

    log(`[${i + 1}/${peopleToProcess.length}] 处理: ${person.name}`);

    try {
      const topicDetails = await generateTopicReasons(person);

      await prisma.people.update({
        where: { id: person.id },
        data: { topicDetails }
      });

      if (!quiet) {
        for (const detail of topicDetails) {
          console.log(`  ✅ ${detail.topic}: ${detail.reason}`);
        }
      }
      successCount++;

      // 避免 API 限流
      await new Promise(r => setTimeout(r, 800));

    } catch (error) {
      console.error(`  ❌ 失败: ${error}`);
      errorCount++;
    }
  }

  console.log('\n📊 处理完成');
  console.log(`  ✅ 成功: ${successCount}`);
  console.log(`  ❌ 失败: ${errorCount}`);
}

// 仅在直接运行时执行
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('enrich_topic_reasons.ts')) {
  main()
    .catch(console.error)
    .finally(() => process.exit(0));
}
