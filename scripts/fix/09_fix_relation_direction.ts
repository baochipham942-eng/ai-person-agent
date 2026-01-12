/**
 * 修复人物关系方向一致性问题
 *
 * 问题：数据库中有两种不同语义的关系数据
 * - wikidata 来源: personId 是 relatedPersonId 的 type（LeCun 是 Zaremba 的导师）
 * - perplexity 来源: relatedPersonId 是 personId 的 type（Manning 是 Karpathy 的导师）
 *
 * 统一语义：{ personId: A, relatedPersonId: B, type: X } = B 是 A 的 X
 * 即 relatedPerson 是 person 的那个关系类型（perplexity 语义）
 *
 * 需要翻转 wikidata 来源的数据
 *
 * 运行: npx tsx scripts/fix/09_fix_relation_direction.ts [--dry-run]
 */

import { prisma } from '../../lib/db/prisma';

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('🔧 修复人物关系方向一致性问题\n');
  console.log(`模式: ${dryRun ? '试运行（不写入）' : '正式运行'}\n`);
  console.log('统一语义: { personId: A, relatedPersonId: B, type: X } = B 是 A 的 X\n');

  // 1. 查找需要翻转的关系（wikidata 来源的所有关系）
  const toFix = await prisma.personRelation.findMany({
    where: {
      source: 'wikidata'
    },
    include: {
      person: { select: { id: true, name: true } },
      relatedPerson: { select: { id: true, name: true } }
    }
  });

  console.log(`找到 ${toFix.length} 条 wikidata 来源的关系需要翻转\n`);

  let fixed = 0;
  let skipped = 0;
  let errors = 0;

  for (const rel of toFix) {
    console.log(`处理: ${rel.person.name} -> ${rel.relatedPerson.name} (${rel.relationType})`);
    console.log(`  当前语义(错误): ${rel.person.name} 是 ${rel.relatedPerson.name} 的${rel.relationType}`);
    console.log(`  修复后语义(正确): ${rel.relatedPerson.name} 是 ${rel.person.name} 的${rel.relationType}`);

    // 检查翻转后是否会重复
    const existingReverse = await prisma.personRelation.findFirst({
      where: {
        personId: rel.relatedPersonId,
        relatedPersonId: rel.personId,
        relationType: rel.relationType
      }
    });

    if (existingReverse) {
      console.log(`  ⚠️ 翻转后会重复，删除当前记录`);
      if (!dryRun) {
        await prisma.personRelation.delete({ where: { id: rel.id } });
      }
      skipped++;
      continue;
    }

    if (!dryRun) {
      try {
        // 翻转方向
        await prisma.personRelation.update({
          where: { id: rel.id },
          data: {
            personId: rel.relatedPersonId,
            relatedPersonId: rel.personId,
            // description 保持不变
          }
        });
        console.log(`  ✅ 已修复`);
        fixed++;
      } catch (error: any) {
        if (error.code === 'P2002') {
          // 唯一约束冲突，说明翻转后的记录已存在
          console.log(`  ⚠️ 翻转后记录已存在，删除当前记录`);
          await prisma.personRelation.delete({ where: { id: rel.id } });
          skipped++;
        } else {
          console.error(`  ❌ 修复失败: ${error.message}`);
          errors++;
        }
      }
    } else {
      console.log(`  [试运行] 将翻转此关系`);
      fixed++;
    }

    console.log('');
  }

  console.log('\n📊 处理完成');
  console.log(`  修复: ${fixed}`);
  console.log(`  跳过: ${skipped}`);
  console.log(`  错误: ${errors}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
