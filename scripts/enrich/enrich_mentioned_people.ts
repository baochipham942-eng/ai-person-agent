/**
 * 人物内链标记脚本
 * 识别 whyImportant、description、quotes.text 中提到的人名
 * 并替换为 [[名称|personId]] 格式的链接标记
 *
 * 用法: npx tsx scripts/enrich/enrich_mentioned_people.ts [--limit N] [--dry-run]
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

interface MentionResult {
  name: string;
  originalText: string;
}

/**
 * 使用 AI 识别文本中提到的人物
 */
async function extractMentionedPeople(text: string): Promise<MentionResult[]> {
  if (!text || text.length < 10) return [];

  const systemPrompt = `你是一个 AI 领域人物识别专家。任务：从文本中提取提到的 AI 领域相关人物姓名。

规则：
1. 只提取明确提到的人名（全名或常用名）
2. 忽略一般性描述中的人称代词
3. 只返回 AI/科技/学术领域相关人物
4. 对于中文文本，返回原文中的人名形式

返回 JSON: { "mentions": [{ "name": "Geoffrey Hinton", "originalText": "Hinton" }] }
如果没有提到人物，返回空数组: { "mentions": [] }`;

  const userPrompt = `请从以下文本中提取提到的人物姓名：

"${text}"`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  try {
    const result = await chatStructuredCompletion<{ mentions: MentionResult[] }>(messages, {
      temperature: 0.1,
      maxTokens: 300
    });

    return result.mentions || [];
  } catch (error) {
    console.error('  AI 提取失败:', error);
    return [];
  }
}

/**
 * 在数据库中查找匹配的人物
 */
async function findPersonByName(name: string, allPeople: Map<string, { id: string; name: string; aliases: string[] }>): Promise<string | null> {
  const nameLower = name.toLowerCase().trim();

  for (const [id, person] of allPeople) {
    // 检查主名称
    if (person.name.toLowerCase() === nameLower) {
      return id;
    }
    // 检查别名
    if (person.aliases.some(alias => alias.toLowerCase() === nameLower)) {
      return id;
    }
    // 检查部分匹配（姓或名）
    const personNameParts = person.name.toLowerCase().split(/\s+/);
    const searchParts = nameLower.split(/\s+/);
    if (searchParts.length >= 2 && personNameParts.length >= 2) {
      // 如果两个名字都有多个部分，检查姓是否匹配
      if (personNameParts[personNameParts.length - 1] === searchParts[searchParts.length - 1]) {
        return id;
      }
    }
  }

  return null;
}

/**
 * 将文本中的人名替换为链接标记
 */
function applyMentionMarks(
  text: string,
  mentions: MentionResult[],
  personIdMap: Map<string, string>
): string {
  let result = text;

  for (const mention of mentions) {
    const personId = personIdMap.get(mention.name);
    if (!personId) continue;

    // 使用原始文本进行替换
    const searchText = mention.originalText || mention.name;
    const marker = `[[${searchText}|${personId}]]`;

    // 只替换第一次出现（避免重复标记）
    if (!result.includes(`[[${searchText}|`)) {
      result = result.replace(searchText, marker);
    }
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  const dryRun = args.includes('--dry-run');

  console.log('🔗 开始标记人物内链...\n');
  console.log(`模拟运行: ${dryRun ? '是（不会实际更新数据）' : '否'}\n`);

  // 1. 加载所有人物信息用于匹配
  const allPeopleRaw = await prisma.people.findMany({
    select: { id: true, name: true, aliases: true }
  });
  const allPeople = new Map(allPeopleRaw.map(p => [p.id, p]));
  console.log(`📋 已加载 ${allPeople.size} 个人物用于匹配\n`);

  // 2. 获取需要处理的人物
  const people = await prisma.people.findMany({
    where: {
      OR: [
        { whyImportant: { not: null } },
        { description: { not: null } },
        { quotes: { not: null } },
      ]
    },
    select: {
      id: true,
      name: true,
      whyImportant: true,
      description: true,
      quotes: true,
    },
    take: limit,
    orderBy: { influenceScore: 'desc' }
  });

  console.log(`📋 找到 ${people.length} 个人物需要处理\n`);

  let processedCount = 0;
  let markedCount = 0;

  for (let i = 0; i < people.length; i++) {
    const person = people[i];
    console.log(`[${i + 1}/${people.length}] 处理: ${person.name}`);

    // 跳过已标记的内容
    const hasMarks = (text: string | null) => text?.includes('[[') && text?.includes('|');

    let updates: { whyImportant?: string; description?: string; quotes?: Quote[] } = {};
    let mentionedAny = false;

    // 处理 whyImportant
    if (person.whyImportant && !hasMarks(person.whyImportant)) {
      const mentions = await extractMentionedPeople(person.whyImportant);
      if (mentions.length > 0) {
        // 查找匹配的人物 ID
        const personIdMap = new Map<string, string>();
        for (const m of mentions) {
          const personId = await findPersonByName(m.name, allPeople);
          if (personId && personId !== person.id) { // 排除自己
            personIdMap.set(m.name, personId);
          }
        }

        if (personIdMap.size > 0) {
          const marked = applyMentionMarks(person.whyImportant, mentions, personIdMap);
          if (marked !== person.whyImportant) {
            updates.whyImportant = marked;
            mentionedAny = true;
            console.log(`  ✅ whyImportant: ${personIdMap.size} 个人物链接`);
          }
        }
      }
      await new Promise(r => setTimeout(r, 200));
    }

    // 处理 description
    if (person.description && !hasMarks(person.description)) {
      const mentions = await extractMentionedPeople(person.description);
      if (mentions.length > 0) {
        const personIdMap = new Map<string, string>();
        for (const m of mentions) {
          const personId = await findPersonByName(m.name, allPeople);
          if (personId && personId !== person.id) {
            personIdMap.set(m.name, personId);
          }
        }

        if (personIdMap.size > 0) {
          const marked = applyMentionMarks(person.description, mentions, personIdMap);
          if (marked !== person.description) {
            updates.description = marked;
            mentionedAny = true;
            console.log(`  ✅ description: ${personIdMap.size} 个人物链接`);
          }
        }
      }
      await new Promise(r => setTimeout(r, 200));
    }

    // 处理 quotes
    const quotes = person.quotes as Quote[] | null;
    if (quotes && quotes.length > 0) {
      const updatedQuotes: Quote[] = [];
      let quotesModified = false;

      for (const quote of quotes) {
        if (!quote.text || hasMarks(quote.text)) {
          updatedQuotes.push(quote);
          continue;
        }

        const mentions = await extractMentionedPeople(quote.text);
        if (mentions.length > 0) {
          const personIdMap = new Map<string, string>();
          for (const m of mentions) {
            const personId = await findPersonByName(m.name, allPeople);
            if (personId && personId !== person.id) {
              personIdMap.set(m.name, personId);
            }
          }

          if (personIdMap.size > 0) {
            const marked = applyMentionMarks(quote.text, mentions, personIdMap);
            if (marked !== quote.text) {
              updatedQuotes.push({ ...quote, text: marked });
              quotesModified = true;
              console.log(`  ✅ quote: ${personIdMap.size} 个人物链接`);
            } else {
              updatedQuotes.push(quote);
            }
          } else {
            updatedQuotes.push(quote);
          }
        } else {
          updatedQuotes.push(quote);
        }
        await new Promise(r => setTimeout(r, 200));
      }

      if (quotesModified) {
        updates.quotes = updatedQuotes;
        mentionedAny = true;
      }
    }

    // 更新数据库
    if (mentionedAny && Object.keys(updates).length > 0) {
      if (!dryRun) {
        await prisma.people.update({
          where: { id: person.id },
          data: updates
        });
      }
      markedCount++;
      console.log(`  💾 ${dryRun ? '(模拟)' : ''} 已更新`);
    }

    processedCount++;
  }

  console.log('\n📊 处理完成');
  console.log(`  处理人数: ${processedCount}`);
  console.log(`  标记人数: ${markedCount}`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
