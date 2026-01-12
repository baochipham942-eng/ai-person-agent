/**
 * 话题金句关联脚本
 * 将人物的 quotes 与其 topics 进行关联匹配
 * 生成 topicDetails 字段，包含话题的详细信息和关联金句
 *
 * 用法: npx tsx scripts/enrich/enrich_topic_quotes.ts [--limit N] [--force]
 */

import { prisma } from '../../lib/db/prisma';
import { chatStructuredCompletion, type ChatMessage } from '../../lib/ai/deepseek';

interface Quote {
  text: string;
  source: string;
  url?: string;
  year?: number;
  importance?: number;
}

interface TopicDetail {
  topic: string;
  rank: number;
  description?: string;
  quote?: {
    text: string;
    source: string;
    url?: string;
  };
}

/**
 * 使用 AI 匹配话题和语录
 */
async function matchTopicsWithQuotes(
  topics: string[],
  quotes: Quote[],
  topicRanks: Record<string, number> | null
): Promise<TopicDetail[]> {
  if (quotes.length === 0) {
    // 无语录，直接返回话题基本信息
    return topics.map(topic => ({
      topic,
      rank: topicRanks?.[topic] || 99,
    }));
  }

  const systemPrompt = `你是一个 AI 内容分析专家。任务：将人物的语录与其 AI 话题进行匹配。

规则：
1. 每个话题最多匹配一条最相关的语录
2. 一条语录可以匹配多个话题（如果确实相关）
3. 只匹配语义上真正相关的语录，不要强行匹配
4. 如果某话题没有相关语录，该话题不返回 quoteIndex

返回 JSON 数组：
[
  { "topic": "话题名", "quoteIndex": 0 },  // quoteIndex 是 quotes 数组中的索引
  { "topic": "话题名" }  // 无匹配语录
]`;

  const userPrompt = `话题列表：
${topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}

语录列表：
${quotes.map((q, i) => `${i}. "${q.text}" —— ${q.source}`).join('\n')}

请分析并匹配。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  try {
    const result = await chatStructuredCompletion<Array<{
      topic: string;
      quoteIndex?: number;
    }>>(messages, { temperature: 0.1, maxTokens: 500 });

    // 构建 TopicDetail 数组
    return topics.map(topic => {
      const match = result.find(r => r.topic === topic);
      const detail: TopicDetail = {
        topic,
        rank: topicRanks?.[topic] || 99,
      };

      if (match && typeof match.quoteIndex === 'number' && quotes[match.quoteIndex]) {
        const q = quotes[match.quoteIndex];
        detail.quote = {
          text: q.text,
          source: q.source,
          url: q.url,
        };
      }

      return detail;
    });
  } catch (error) {
    console.error('  AI 匹配失败:', error);
    // 回退到无匹配
    return topics.map(topic => ({
      topic,
      rank: topicRanks?.[topic] || 99,
    }));
  }
}

/**
 * 简单关键词匹配（作为备用方案）
 */
function matchByKeywords(
  topics: string[],
  quotes: Quote[],
  topicRanks: Record<string, number> | null
): TopicDetail[] {
  // 话题关键词映射（简体中文和英文）
  const topicKeywords: Record<string, string[]> = {
    '大语言模型': ['llm', 'language model', 'gpt', '大语言', '大模型'],
    'Transformer': ['transformer', 'attention', '注意力'],
    'RAG': ['rag', 'retrieval', '检索增强'],
    'Agent': ['agent', '智能体', '代理'],
    '多模态': ['multimodal', '多模态', 'vision', 'image', '视觉'],
    '推理': ['reasoning', '推理', 'inference', 'chain of thought', 'cot'],
    'Scaling': ['scaling', 'scale', '规模', 'scaling law'],
    'AGI': ['agi', 'artificial general intelligence', '通用人工智能'],
    '对齐': ['alignment', '对齐', 'safety', 'rlhf'],
    '强化学习': ['reinforcement learning', 'rl', '强化学习'],
    '开源': ['open source', '开源', 'opensource'],
  };

  return topics.map(topic => {
    const detail: TopicDetail = {
      topic,
      rank: topicRanks?.[topic] || 99,
    };

    // 查找匹配的语录
    const keywords = topicKeywords[topic] || [topic.toLowerCase()];
    for (const quote of quotes) {
      const text = `${quote.text} ${quote.source}`.toLowerCase();
      if (keywords.some(kw => text.includes(kw))) {
        detail.quote = {
          text: quote.text,
          source: quote.source,
          url: quote.url,
        };
        break;
      }
    }

    return detail;
  });
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  const force = args.includes('--force');
  const useAI = args.includes('--use-ai');

  console.log('🔗 开始关联话题和金句...\n');
  console.log(`使用 AI 匹配: ${useAI ? '是' : '否（使用关键词匹配）'}\n`);

  // 获取有 topics 和 quotes 的人物
  const people = await prisma.people.findMany({
    where: {
      topics: { isEmpty: false },
      ...(force ? {} : {
        OR: [
          { topicDetails: { equals: null } },
          { topicDetails: { equals: {} } },
        ]
      })
    },
    select: {
      id: true,
      name: true,
      topics: true,
      topicRanks: true,
      quotes: true,
      topicDetails: true,
    },
    take: limit,
    orderBy: { influenceScore: 'desc' }
  });

  console.log(`📋 找到 ${people.length} 个人物需要处理\n`);

  let successCount = 0;
  let matchedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < people.length; i++) {
    const person = people[i];
    console.log(`[${i + 1}/${people.length}] 处理: ${person.name}`);

    try {
      const quotes = (person.quotes || []) as Quote[];
      const topicRanks = person.topicRanks as Record<string, number> | null;

      let topicDetails: TopicDetail[];

      if (useAI && quotes.length > 0) {
        topicDetails = await matchTopicsWithQuotes(person.topics, quotes, topicRanks);
        // 避免 API 限流
        await new Promise(r => setTimeout(r, 300));
      } else {
        topicDetails = matchByKeywords(person.topics, quotes, topicRanks);
      }

      // 统计有匹配金句的话题数
      const quotesMatched = topicDetails.filter(t => t.quote).length;
      if (quotesMatched > 0) {
        matchedCount++;
      }

      await prisma.people.update({
        where: { id: person.id },
        data: { topicDetails }
      });

      console.log(`  ✅ ${person.topics.length} 个话题, ${quotesMatched} 条金句匹配`);
      successCount++;

    } catch (error) {
      console.error(`  ❌ 失败: ${error}`);
      errorCount++;
    }
  }

  console.log('\n📊 处理完成');
  console.log(`  ✅ 成功: ${successCount}`);
  console.log(`  🔗 有金句匹配: ${matchedCount}`);
  console.log(`  ❌ 失败: ${errorCount}`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
