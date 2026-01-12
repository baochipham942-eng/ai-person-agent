/**
 * 使用 Exa API 补充人物之间的关联关系
 * 用于 Perplexity API 额度用完时的备选方案
 *
 * 用法: npx tsx scripts/enrich/enrich_relations_exa.ts [--limit N] [--dry-run]
 */

import { prisma } from '../../lib/db/prisma';
import { chatStructuredCompletion } from '../../lib/ai/deepseek';

// Exa API
const EXA_API_URL = 'https://api.exa.ai/search';

interface ExaResult {
  title: string;
  url: string;
  text: string;
}

async function searchExa(query: string): Promise<ExaResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) throw new Error('EXA_API_KEY not set');

  const response = await fetch(EXA_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      numResults: 8,
      type: 'neural',
      useAutoprompt: true,
      contents: {
        text: { maxCharacters: 2000 }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Exa API error: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}

// 关系类型
const RELATION_TYPES = ['advisor', 'cofounder', 'colleague', 'collaborator'] as const;

interface ParsedRelation {
  relatedPersonName: string;
  relationType: string;
  description: string;
}

/**
 * 用 DeepSeek 从 Exa 搜索结果中提取关系
 */
async function extractRelationsFromSearch(
  personName: string,
  searchResults: ExaResult[],
  candidateNames: string[]
): Promise<ParsedRelation[]> {
  if (searchResults.length === 0) return [];

  const context = searchResults.map(r => r.text).join('\n\n---\n\n');
  const candidateList = candidateNames.slice(0, 50).join(', ');

  const prompt = `Based on the following search results about "${personName}", identify their professional relationships.

Search results:
${context}

Look for relationships with these specific people (use exact names from this list):
${candidateList}

Relationship types to identify:
- advisor: PhD advisor or mentor relationship
- cofounder: co-founded a company together
- colleague: worked at the same organization/company
- collaborator: published papers together, collaborated on research, or publicly worked together on AI projects

Return a JSON array. If no relationships found, return empty array [].
Format: [{ "name": "exact name from list above", "type": "advisor|cofounder|colleague|collaborator", "desc": "简短中文描述" }]

Important: Only include relationships that are clearly mentioned or strongly implied in the search results.`;

  try {
    const result = await chatStructuredCompletion<Array<{name: string; type: string; desc: string}>>(
      [
        { role: 'system', content: 'You extract professional relationships from text. Return valid JSON array only.' },
        { role: 'user', content: prompt }
      ],
      { temperature: 0.1, maxTokens: 1000 }
    );

    if (!Array.isArray(result)) return [];

    return result
      .filter(r => RELATION_TYPES.includes(r.type as any))
      .map(r => ({
        relatedPersonName: r.name,
        relationType: r.type,
        description: r.desc?.slice(0, 15) || ''
      }));
  } catch (error) {
    console.error('  DeepSeek 解析失败:', error);
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  const dryRun = args.includes('--dry-run');

  console.log('🔍 使用 Exa + DeepSeek 补充人物关联关系...\n');
  console.log(`模式: ${dryRun ? '试运行（不写入）' : '正式运行'}\n`);

  // 获取没有关联关系的人物
  const peopleWithoutRels = await prisma.people.findMany({
    where: {
      AND: [
        { relations: { none: {} } },
        { relatedTo: { none: {} } }
      ]
    },
    select: { id: true, name: true },
    orderBy: { influenceScore: 'desc' },
    take: limit
  });

  console.log(`📋 找到 ${peopleWithoutRels.length} 个没有关联关系的人物\n`);

  if (peopleWithoutRels.length === 0) {
    console.log('所有人物都已有关联关系！');
    return;
  }

  // 获取所有人物名称用于匹配
  const allPeople = await prisma.people.findMany({
    select: { id: true, name: true }
  });
  const nameToId = new Map(allPeople.map(p => [p.name, p.id]));
  const allNames = allPeople.map(p => p.name);

  let totalCreated = 0;

  for (let i = 0; i < peopleWithoutRels.length; i++) {
    const person = peopleWithoutRels[i];
    console.log(`[${i + 1}/${peopleWithoutRels.length}] ${person.name}`);

    try {
      // 搜索人物关系信息 - 使用更具体的查询
      const query = `"${person.name}" AI researcher mentor advisor student colleague cofounder collaborator`;
      const results = await searchExa(query);

      if (results.length === 0) {
        console.log('  无搜索结果');
        continue;
      }

      console.log(`  找到 ${results.length} 条搜索结果`);

      // 显示搜索结果摘要
      if (args.includes('--verbose')) {
        results.slice(0, 3).forEach((r, idx) => {
          console.log(`    [${idx + 1}] ${r.title?.slice(0, 50)}...`);
        });
      }

      // 用 DeepSeek 提取关系 - 优先使用高影响力人物名单
      const otherNames = allNames
        .filter(n => n !== person.name)
        .slice(0, 100); // 限制候选人数量
      const relations = await extractRelationsFromSearch(person.name, results, otherNames);

      if (relations.length === 0) {
        console.log('  未提取到关系');
        continue;
      }

      for (const rel of relations) {
        const relatedPersonId = nameToId.get(rel.relatedPersonName);
        if (!relatedPersonId) {
          // 尝试模糊匹配
          const matched = allNames.find(n =>
            n.toLowerCase().includes(rel.relatedPersonName.toLowerCase()) ||
            rel.relatedPersonName.toLowerCase().includes(n.toLowerCase())
          );
          if (!matched) continue;
          rel.relatedPersonName = matched;
        }

        const finalRelatedId = nameToId.get(rel.relatedPersonName);
        if (!finalRelatedId) continue;

        // 检查是否已存在
        const existing = await prisma.personRelation.findFirst({
          where: {
            OR: [
              { personId: person.id, relatedPersonId: finalRelatedId, relationType: rel.relationType },
              { personId: finalRelatedId, relatedPersonId: person.id, relationType: rel.relationType },
            ]
          }
        });

        if (existing) {
          console.log(`    ⏭️ ${rel.relatedPersonName} (${rel.relationType}) 已存在`);
          continue;
        }

        console.log(`    ✅ ${rel.relatedPersonName} (${rel.relationType}): ${rel.description}`);

        if (!dryRun) {
          try {
            await prisma.personRelation.create({
              data: {
                personId: person.id,
                relatedPersonId: finalRelatedId,
                relationType: rel.relationType,
                description: rel.description,
                source: 'exa',
                confidence: 0.8,
              }
            });
            totalCreated++;
          } catch (error: any) {
            if (error.code !== 'P2002') {
              console.error(`    ❌ 创建失败:`, error.message);
            }
          }
        } else {
          totalCreated++;
        }
      }
    } catch (error) {
      console.error(`  查询失败:`, error);
    }

    // 避免 API 限流
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n📊 处理完成');
  console.log(`  新增关系: ${totalCreated}`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
