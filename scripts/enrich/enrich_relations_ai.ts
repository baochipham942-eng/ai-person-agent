/**
 * 使用 AI 补充人物之间的关联关系
 * 基于共同经历（同一公司、同一学校）和公开信息识别关系
 *
 * 用法: npx tsx scripts/enrich/enrich_relations_ai.ts [--limit N] [--dry-run]
 */

import { prisma } from '../../lib/db/prisma';
import { chatStructuredCompletion } from '../../lib/ai/deepseek';

// 关系类型定义
const RELATION_TYPES = [
  'advisor',      // 导师
  'advisee',      // 学生
  'cofounder',    // 联合创始人
  'colleague',    // 同事（同公司工作过）
  'collaborator', // 合作者（论文合作等）
];

interface RelationCandidate {
  personAId: string;
  personAName: string;
  personBId: string;
  personBName: string;
  sharedOrgs: string[];
  personARoles: string[];
  personBRoles: string[];
}

interface AIRelation {
  relationType: string;
  description: string;
  confidence: number;
}

/**
 * 找出可能有关系的人物对（基于共同机构）
 */
async function findRelationCandidates(): Promise<RelationCandidate[]> {
  // 获取所有人物及其机构经历
  const people = await prisma.people.findMany({
    where: {
      roles: { some: {} }
    },
    select: {
      id: true,
      name: true,
      roles: {
        include: {
          organization: true
        }
      }
    }
  });

  console.log(`📋 找到 ${people.length} 个有职业经历的人物`);

  // 构建机构 -> 人物映射
  const orgToPeople = new Map<string, Set<string>>();
  const personRoles = new Map<string, string[]>();

  for (const person of people) {
    const roles: string[] = [];
    for (const role of person.roles) {
      const orgName = role.organization.name;
      if (!orgToPeople.has(orgName)) {
        orgToPeople.set(orgName, new Set());
      }
      orgToPeople.get(orgName)!.add(person.id);
      roles.push(`${role.role} @ ${orgName} (${role.startDate?.getFullYear() || '?'}-${role.endDate?.getFullYear() || 'now'})`);
    }
    personRoles.set(person.id, roles);
  }

  // 找出共同机构的人物对
  const candidates: RelationCandidate[] = [];
  const processedPairs = new Set<string>();

  for (const [orgName, personIds] of orgToPeople) {
    const ids = Array.from(personIds);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const pairKey = [ids[i], ids[j]].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const personA = people.find(p => p.id === ids[i])!;
        const personB = people.find(p => p.id === ids[j])!;

        // 找出所有共同机构
        const sharedOrgs: string[] = [];
        for (const [org, pIds] of orgToPeople) {
          if (pIds.has(ids[i]) && pIds.has(ids[j])) {
            sharedOrgs.push(org);
          }
        }

        candidates.push({
          personAId: personA.id,
          personAName: personA.name,
          personBId: personB.id,
          personBName: personB.name,
          sharedOrgs,
          personARoles: personRoles.get(personA.id) || [],
          personBRoles: personRoles.get(personB.id) || [],
        });
      }
    }
  }

  return candidates;
}

/**
 * 检查关系是否已存在
 */
async function relationExists(personAId: string, personBId: string, relationType: string): Promise<boolean> {
  const existing = await prisma.personRelation.findFirst({
    where: {
      OR: [
        { personId: personAId, relatedPersonId: personBId, relationType },
        { personId: personBId, relatedPersonId: personAId, relationType },
      ]
    }
  });
  return !!existing;
}

/**
 * 使用 AI 判断两人之间的关系
 */
async function inferRelationWithAI(candidate: RelationCandidate): Promise<AIRelation | null> {
  const prompt = `分析以下两位 AI 领域人物的关系:

人物A: ${candidate.personAName}
履历: ${candidate.personARoles.join('; ')}

人物B: ${candidate.personBName}
履历: ${candidate.personBRoles.join('; ')}

共同机构: ${candidate.sharedOrgs.join(', ')}

请判断他们之间最重要的一种关系。可选类型:
- advisor: A是B的导师（博士导师等）
- advisee: A是B的学生
- cofounder: 联合创始人（共同创立公司）
- colleague: 同事（在同一公司工作过）
- collaborator: 合作者（研究合作）

如果关系不明确或不确定，返回 null。

返回 JSON 格式:
{
  "relationType": "类型或null",
  "description": "关系描述（中文，10字以内）",
  "confidence": 0.0-1.0,
  "reasoning": "判断理由"
}`;

  try {
    const result = await chatStructuredCompletion<{
      relationType: string | null;
      description: string;
      confidence: number;
      reasoning: string;
    }>([
      { role: 'system', content: '你是一个 AI 领域专家，熟悉该领域的人物关系。请基于提供的信息判断人物关系。' },
      { role: 'user', content: prompt }
    ], {
      temperature: 0.3,
      maxTokens: 500,
    });

    if (!result.relationType || result.confidence < 0.7) {
      return null;
    }

    if (!RELATION_TYPES.includes(result.relationType)) {
      return null;
    }

    return {
      relationType: result.relationType,
      description: result.description,
      confidence: result.confidence,
    };
  } catch (error) {
    console.error('  AI 推理失败:', error);
    return null;
  }
}

/**
 * 创建关系记录
 */
async function createRelation(
  personAId: string,
  personBId: string,
  relationType: string,
  description: string,
  confidence: number
): Promise<void> {
  // 对于 advisor/advisee 关系，需要确定方向
  // advisor: personA 是 personB 的导师
  // advisee: personA 是 personB 的学生 -> 转换为 personB 是 personA 的导师

  let finalPersonId = personAId;
  let finalRelatedPersonId = personBId;
  let finalRelationType = relationType;

  if (relationType === 'advisee') {
    // 反转关系
    finalPersonId = personBId;
    finalRelatedPersonId = personAId;
    finalRelationType = 'advisor';
  }

  await prisma.personRelation.create({
    data: {
      personId: finalPersonId,
      relatedPersonId: finalRelatedPersonId,
      relationType: finalRelationType,
      description,
      source: 'ai-inference',
      confidence,
    }
  });
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  const dryRun = args.includes('--dry-run');

  console.log('🤖 使用 AI 补充人物关联关系...\n');
  console.log(`模式: ${dryRun ? '试运行（不写入）' : '正式运行'}\n`);

  // 1. 找出可能有关系的人物对
  const candidates = await findRelationCandidates();
  console.log(`🔍 找到 ${candidates.length} 对可能有关系的人物\n`);

  // 2. 过滤已有关系的对
  const toProcess: RelationCandidate[] = [];
  for (const c of candidates) {
    // 检查是否已有任何类型的关系
    const hasRelation = await prisma.personRelation.findFirst({
      where: {
        OR: [
          { personId: c.personAId, relatedPersonId: c.personBId },
          { personId: c.personBId, relatedPersonId: c.personAId },
        ]
      }
    });
    if (!hasRelation) {
      toProcess.push(c);
    }
  }

  console.log(`📝 需要处理 ${toProcess.length} 对（排除已有关系）\n`);

  const processLimit = limit || toProcess.length;
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < Math.min(toProcess.length, processLimit); i++) {
    const c = toProcess[i];
    console.log(`[${i + 1}/${processLimit}] ${c.personAName} <-> ${c.personBName}`);
    console.log(`  共同机构: ${c.sharedOrgs.join(', ')}`);

    const relation = await inferRelationWithAI(c);

    if (relation) {
      console.log(`  ✅ ${relation.relationType}: ${relation.description} (置信度: ${relation.confidence})`);

      if (!dryRun) {
        try {
          await createRelation(
            c.personAId,
            c.personBId,
            relation.relationType,
            relation.description,
            relation.confidence
          );
          created++;
        } catch (error: any) {
          if (error.code === 'P2002') {
            console.log('  ⚠️ 关系已存在');
          } else {
            console.error('  ❌ 创建失败:', error.message);
          }
        }
      } else {
        created++;
      }
    } else {
      console.log('  ⏭️ 关系不明确，跳过');
      skipped++;
    }

    // 避免 API 限流
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n📊 处理完成');
  console.log(`  新增关系: ${created}`);
  console.log(`  跳过: ${skipped}`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
