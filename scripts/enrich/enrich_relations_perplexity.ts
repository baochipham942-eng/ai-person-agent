/**
 * 使用 Perplexity API 补充人物之间的关联关系
 * 查询真实世界信息，识别导师、学生、联创、同事等关系
 *
 * 用法: npx tsx scripts/enrich/enrich_relations_perplexity.ts [--limit N] [--dry-run]
 */

import { prisma } from '../../lib/db/prisma';
import { searchPerplexity } from '../../lib/datasources/perplexity';
import { relationReviewFields, validateRelationCandidate } from '../../lib/agents/relation-validation';

// 关系类型
const RELATION_TYPES = ['advisor', 'cofounder', 'colleague', 'former_colleague', 'collaborator'] as const;

interface ParsedRelation {
  relatedPersonName: string;
  relationType: string;
  description: string;
  evidenceText: string;
  evidenceUrls: string[];
}

/**
 * 查询某人物与库中其他人物的关系
 */
async function queryRelationsForPerson(
  personName: string,
  otherPeopleNames: string[]
): Promise<ParsedRelation[]> {
  // 将人物列表分成小批次，避免 prompt 太长
  const batchSize = 30;
  const allRelations: ParsedRelation[] = [];

  for (let i = 0; i < otherPeopleNames.length; i += batchSize) {
    const batch = otherPeopleNames.slice(i, i + batchSize);

    const query = `Who are the known professional relationships of ${personName} in the AI/tech field?

Check specifically if ${personName} has any of these relationships with the following people:
${batch.map((n, idx) => `${idx + 1}. ${n}`).join('\n')}

For each person that ${personName} has a relationship with, identify:
- advisor: PhD advisor or mentor
- cofounder: co-founded a company together
- colleague: currently work at the same company
- former_colleague: previously worked at the same company, but do not currently share an employer
- collaborator: published papers together or collaborated on research

Return ONLY confirmed relationships in this exact format (one per line):
RELATION: [person name] | [type] | [brief description in Chinese, max 10 chars]

Example:
RELATION: Geoffrey Hinton | advisor | 博士导师
RELATION: Sam Altman | cofounder | OpenAI联创

If no relationships are confirmed, return: NO_RELATIONS`;

    try {
      const response = await searchPerplexity(
        query,
        'You are an expert on AI researchers and tech leaders. Only return confirmed, well-documented relationships. Be concise.',
        { temperature: 0.1 }
      );

      // 解析响应
      const lines = response.content.split('\n');
      for (const line of lines) {
        if (line.startsWith('RELATION:')) {
          const parts = line.replace('RELATION:', '').trim().split('|').map(s => s.trim());
          if (parts.length >= 3) {
            const [relatedName, relationType, description] = parts;
            // 验证关系类型
            if (RELATION_TYPES.includes(relationType as any)) {
              // 验证人名在列表中
              const matchedName = batch.find(n =>
                n.toLowerCase() === relatedName.toLowerCase() ||
                n.toLowerCase().includes(relatedName.toLowerCase()) ||
                relatedName.toLowerCase().includes(n.toLowerCase())
              );
              if (matchedName) {
                allRelations.push({
                  relatedPersonName: matchedName,
                  relationType,
                  description: description.slice(0, 15), // 限制长度
                  evidenceText: response.content,
                  evidenceUrls: response.citations || [],
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`  查询失败: ${error}`);
    }

    // API 限流
    if (i + batchSize < otherPeopleNames.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return allRelations;
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  const dryRun = args.includes('--dry-run');

  console.log('🔍 使用 Perplexity 补充人物关联关系...\n');
  console.log(`模式: ${dryRun ? '试运行（不写入）' : '正式运行'}\n`);

  // 1. 获取所有人物
  const allPeople = await prisma.people.findMany({
    select: { id: true, name: true },
    orderBy: { influenceScore: 'desc' },
  });

  console.log(`📋 数据库中共 ${allPeople.length} 个人物\n`);

  const nameToId = new Map(allPeople.map(p => [p.name, p.id]));
  const allNames = allPeople.map(p => p.name);

  // 2. 选择要处理的人物（按影响力排序）
  const toProcess = limit ? allPeople.slice(0, limit) : allPeople;

  let totalCreated = 0;
  let totalSkipped = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const person = toProcess[i];
    console.log(`[${i + 1}/${toProcess.length}] ${person.name}`);

    // 排除自己
    const otherNames = allNames.filter(n => n !== person.name);

    // 查询关系
    const relations = await queryRelationsForPerson(person.name, otherNames);

    if (relations.length === 0) {
      console.log('  无新关系');
      continue;
    }

    console.log(`  找到 ${relations.length} 个关系`);

    for (const rel of relations) {
      const relatedPersonId = nameToId.get(rel.relatedPersonName);
      if (!relatedPersonId) {
        console.log(`    ⚠️ ${rel.relatedPersonName} 未找到`);
        continue;
      }

      // 检查是否已存在
      const existing = await prisma.personRelation.findFirst({
        where: {
          OR: [
            { personId: person.id, relatedPersonId, relationType: rel.relationType },
            { personId: relatedPersonId, relatedPersonId: person.id, relationType: rel.relationType },
          ]
        }
      });

      if (existing) {
        console.log(`    ⏭️ ${rel.relatedPersonName} (${rel.relationType}) 已存在`);
        totalSkipped++;
        continue;
      }

      console.log(`    ✅ ${rel.relatedPersonName} (${rel.relationType}): ${rel.description}`);

      const validationInput = {
        personId: person.id,
        relatedPersonId,
        relationType: rel.relationType,
        description: rel.description,
        source: 'perplexity',
        confidence: 0.9,
        evidenceTexts: [rel.evidenceText],
        evidenceUrls: rel.evidenceUrls,
      };
      const validation = await validateRelationCandidate(prisma, validationInput);

      if (!validation.ok) {
        console.log(`    🚫 校验未通过: ${validation.reasons.join('; ')}`);
        totalSkipped++;
        continue;
      }

      console.log(`    🔒 校验通过: ${validation.evidence.join('; ')}`);

      if (!dryRun) {
        try {
          await prisma.personRelation.create({
            data: {
              personId: person.id,
              relatedPersonId,
              relationType: rel.relationType,
              description: rel.description,
              source: 'perplexity',
              confidence: 0.9,
              ...relationReviewFields(validationInput, validation),
            }
          });
          totalCreated++;
        } catch (error: any) {
          if (error.code === 'P2002') {
            console.log(`    ⚠️ 重复记录`);
          } else {
            console.error(`    ❌ 创建失败:`, error.message);
          }
        }
      } else {
        totalCreated++;
      }
    }

    // 避免 API 限流
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n📊 处理完成');
  console.log(`  新增关系: ${totalCreated}`);
  console.log(`  跳过: ${totalSkipped}`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
