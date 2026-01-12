/**
 * 获取人物的关联关系（导师、学生等）并存入数据库
 * 从 Wikidata 获取 P185(导师)/P802(学生) 等关系
 * 同时将导师关联到教育类型的 PersonRole 记录
 *
 * 用法: npx tsx scripts/enrich/fetch_related_people.ts [--limit N] [--link-advisors]
 */

import { prisma } from '../../lib/db/prisma';
import { getWikidataRelations } from '../../lib/datasources/wikidata';

// 教育相关关键词
const EDUCATION_KEYWORDS = ['university', 'college', 'school', 'academy', 'institute', 'polytechnic'];
const EDUCATION_ROLE_KEYWORDS = ['student', 'phd', 'doctoral', 'graduate', 'fellow', 'researcher'];

/**
 * 将导师关联到人物的教育类型 PersonRole 记录
 */
async function linkAdvisorToRoles(personId: string, advisorId: string): Promise<number> {
  // 查找该人物的教育类型职位记录（大学类型机构或学生/博士类职位）
  const educationRoles = await prisma.personRole.findMany({
    where: {
      personId,
      advisorId: null, // 尚未关联导师
      OR: [
        // 机构类型为大学
        {
          organization: {
            OR: EDUCATION_KEYWORDS.map(kw => ({
              name: { contains: kw, mode: 'insensitive' as const }
            }))
          }
        },
        // 或职位包含教育关键词
        {
          OR: EDUCATION_ROLE_KEYWORDS.map(kw => ({
            role: { contains: kw, mode: 'insensitive' as const }
          }))
        }
      ]
    },
    select: { id: true }
  });

  if (educationRoles.length === 0) {
    return 0;
  }

  // 更新这些记录的 advisorId
  const result = await prisma.personRole.updateMany({
    where: {
      id: { in: educationRoles.map(r => r.id) }
    },
    data: { advisorId }
  });

  return result.count;
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  const linkAdvisors = args.includes('--link-advisors');

  console.log('🔗 开始获取人物关联关系...\n');
  console.log(`关联导师到履历: ${linkAdvisors ? '是' : '否'}\n`);

  // 1. 获取所有有 QID 的人物
  const people = await prisma.people.findMany({
    where: {
      qid: { not: '' }
    },
    select: {
      id: true,
      name: true,
      qid: true,
    },
    take: limit,
    orderBy: { influenceScore: 'desc' }
  });

  console.log(`📋 找到 ${people.length} 个有 QID 的人物\n`);

  // 2. 获取数据库中所有人物的 QID 映射
  const allPeople = await prisma.people.findMany({
    select: { id: true, qid: true, name: true }
  });
  const qidToPersonId = new Map(allPeople.map(p => [p.qid, p.id]));
  const qidToName = new Map(allPeople.map(p => [p.qid, p.name]));

  let totalRelations = 0;
  let newRelations = 0;
  let skippedNotInDb = 0;
  let advisorLinksCount = 0;

  for (let i = 0; i < people.length; i++) {
    const person = people[i];
    console.log(`[${i + 1}/${people.length}] ${person.name} (${person.qid})`);

    try {
      // 从 Wikidata 获取关联关系
      const relations = await getWikidataRelations(person.qid);

      if (relations.length === 0) {
        console.log('  无关联人物');
        continue;
      }

      console.log(`  找到 ${relations.length} 个关联人物`);

      for (const rel of relations) {
        totalRelations++;

        // 检查关联人物是否在数据库中
        const relatedPersonId = qidToPersonId.get(rel.qid);

        if (!relatedPersonId) {
          console.log(`    ⚠️ ${rel.label} (${rel.qid}) 不在数据库中`);
          skippedNotInDb++;
          continue;
        }

        // 创建关联记录（如果不存在）
        try {
          await prisma.personRelation.upsert({
            where: {
              personId_relatedPersonId_relationType: {
                personId: person.id,
                relatedPersonId: relatedPersonId,
                relationType: rel.relationType,
              }
            },
            create: {
              personId: person.id,
              relatedPersonId: relatedPersonId,
              relationType: rel.relationType,
              description: rel.description,
              source: 'wikidata',
              confidence: 1.0,
            },
            update: {} // 如果存在则不更新
          });

          console.log(`    ✅ ${rel.relationType}: ${qidToName.get(rel.qid)}`);
          newRelations++;

          // 如果是导师关系，且开启了 --link-advisors，则关联到 PersonRole
          if (linkAdvisors && rel.relationType === 'advisor') {
            const linkedCount = await linkAdvisorToRoles(person.id, relatedPersonId);
            if (linkedCount > 0) {
              console.log(`    🔗 关联导师到 ${linkedCount} 条履历`);
              advisorLinksCount += linkedCount;
            }
          }
        } catch (err: any) {
          if (err.code !== 'P2002') { // 忽略唯一约束冲突
            console.error(`    ❌ 创建关联失败: ${err.message}`);
          }
        }
      }

      // 避免 API 限流
      await new Promise(r => setTimeout(r, 300));

    } catch (error) {
      console.error(`  ❌ 获取关联失败: ${error}`);
    }
  }

  console.log('\n📊 处理完成');
  console.log(`  总关联数: ${totalRelations}`);
  console.log(`  新增关联: ${newRelations}`);
  console.log(`  不在库中: ${skippedNotInDb}`);
  if (linkAdvisors) {
    console.log(`  导师履历关联: ${advisorLinksCount}`);
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
