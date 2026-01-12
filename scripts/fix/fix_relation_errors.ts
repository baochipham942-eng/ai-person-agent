/**
 * 修复 PersonRelation 表中的错误数据
 *
 * 问题：
 * 1. 自相矛盾的导师-学生关系（A 是 B 的导师，同时 B 也是 A 的导师）
 * 2. 重复的关系记录
 *
 * 用法: npx tsx scripts/fix/fix_relation_errors.ts [--dry-run]
 */

import 'dotenv/config';
import { prisma } from '../../lib/db/prisma';

// 已知的正确导师-学生关系映射
// 格式: { 学生名: 导师名 }
const KNOWN_ADVISOR_RELATIONS: Record<string, string> = {
  // Geoffrey Hinton 的学生
  'Ilya Sutskever': 'Geoffrey Hinton',
  '郑宇怀': 'Geoffrey Hinton',
  '鲁斯兰·萨拉赫丁诺夫': 'Geoffrey Hinton',
  '吉米·巴': 'Geoffrey Hinton',

  // Yoshua Bengio 的学生
  'Hugo Larochelle': 'Yoshua Bengio',
  '伊恩·J·古德费洛': 'Yoshua Bengio',

  // Yann LeCun 的学生
  'Wojciech Zaremba': 'Yann LeCun',
  '科拉伊·卡武克丘奥卢': 'Yann LeCun',
  '雷亚·哈德塞尔': 'Yann LeCun',

  // Christopher Manning 的学生
  'Richard Socher': 'Christopher Manning',
  '丹·克莱因': 'Christopher Manning',

  // 吴恩达的学生
  'Quoc Le': '吴恩达',

  // 李飞飞的学生
  'Andrej Karpathy': '李飞飞',
};

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('=== 修复 PersonRelation 错误数据 ===\n');
  if (dryRun) {
    console.log('🔍 DRY RUN 模式 - 只检查不修改\n');
  }

  // 1. 查找自相矛盾的关系（A 是 B 的导师，同时 B 也是 A 的导师）
  console.log('📊 检查自相矛盾的导师-学生关系...\n');

  const contradictoryRelations = await prisma.$queryRaw<Array<{
    person1_id: string;
    person1_name: string;
    person2_id: string;
    person2_name: string;
    relation1_id: string;
    relation2_id: string;
  }>>`
    SELECT
      r1."personId" as person1_id,
      p1.name as person1_name,
      r1."relatedPersonId" as person2_id,
      p2.name as person2_name,
      r1.id as relation1_id,
      r2.id as relation2_id
    FROM "PersonRelation" r1
    JOIN "PersonRelation" r2 ON r1."personId" = r2."relatedPersonId"
                             AND r1."relatedPersonId" = r2."personId"
                             AND r1."relationType" = 'advisor'
                             AND r2."relationType" = 'advisor'
    JOIN "People" p1 ON r1."personId" = p1.id
    JOIN "People" p2 ON r1."relatedPersonId" = p2.id
    WHERE r1."personId" < r1."relatedPersonId"
  `;

  if (contradictoryRelations.length === 0) {
    console.log('✅ 未发现自相矛盾的导师-学生关系\n');
  } else {
    console.log(`⚠️  发现 ${contradictoryRelations.length} 对矛盾关系:\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const rel of contradictoryRelations) {
      console.log(`  ${rel.person1_name} ↔ ${rel.person2_name}`);

      // 检查是否有已知的正确关系
      const person1IsStudent = KNOWN_ADVISOR_RELATIONS[rel.person1_name] === rel.person2_name;
      const person2IsStudent = KNOWN_ADVISOR_RELATIONS[rel.person2_name] === rel.person1_name;

      if (person1IsStudent) {
        // person1 是学生，person2 是导师
        // 正确关系: person1 的导师是 person2 (relation1)
        // 错误关系: person2 的导师是 person1 (relation2) - 需要删除
        console.log(`    ✅ 正确: ${rel.person1_name} 的导师是 ${rel.person2_name}`);
        console.log(`    ❌ 错误: ${rel.person2_name} 的导师是 ${rel.person1_name} (id: ${rel.relation2_id})`);

        if (!dryRun) {
          await prisma.personRelation.delete({ where: { id: rel.relation2_id } });
          console.log(`    🗑️  已删除错误关系`);
        } else {
          console.log(`    📝 [DRY RUN] 将删除错误关系 ${rel.relation2_id}`);
        }
        fixedCount++;
      } else if (person2IsStudent) {
        // person2 是学生，person1 是导师
        // 正确关系: person2 的导师是 person1 (relation2)
        // 错误关系: person1 的导师是 person2 (relation1) - 需要删除
        console.log(`    ✅ 正确: ${rel.person2_name} 的导师是 ${rel.person1_name}`);
        console.log(`    ❌ 错误: ${rel.person1_name} 的导师是 ${rel.person2_name} (id: ${rel.relation1_id})`);

        if (!dryRun) {
          await prisma.personRelation.delete({ where: { id: rel.relation1_id } });
          console.log(`    🗑️  已删除错误关系`);
        } else {
          console.log(`    📝 [DRY RUN] 将删除错误关系 ${rel.relation1_id}`);
        }
        fixedCount++;
      } else {
        console.log(`    ⚠️  未找到已知的正确关系，跳过（需手动处理）`);
        console.log(`    关系1: ${rel.person1_name} 的导师是 ${rel.person2_name} (id: ${rel.relation1_id})`);
        console.log(`    关系2: ${rel.person2_name} 的导师是 ${rel.person1_name} (id: ${rel.relation2_id})`);
        skippedCount++;
      }
      console.log('');
    }

    console.log(`📊 矛盾关系处理结果: 修复 ${fixedCount} 对，跳过 ${skippedCount} 对\n`);
  }

  // 2. 具体修复吴恩达和 Quoc Le 的关系
  console.log('📊 检查吴恩达相关的错误关系...\n');

  // 找到吴恩达
  const andrewNg = await prisma.people.findFirst({
    where: { name: '吴恩达' },
    select: { id: true, name: true }
  });

  if (!andrewNg) {
    console.log('❌ 未找到吴恩达\n');
    return;
  }

  // 找到 Quoc Le
  const quocLe = await prisma.people.findFirst({
    where: { name: 'Quoc Le' },
    select: { id: true, name: true }
  });

  if (!quocLe) {
    console.log('❌ 未找到 Quoc Le\n');
    return;
  }

  console.log(`吴恩达 ID: ${andrewNg.id}`);
  console.log(`Quoc Le ID: ${quocLe.id}\n`);

  // 查找错误关系：Quoc Le 被标记为吴恩达的导师
  const wrongRelation = await prisma.personRelation.findFirst({
    where: {
      personId: andrewNg.id,
      relatedPersonId: quocLe.id,
      relationType: 'advisor'
    }
  });

  // 查找正确关系：吴恩达是 Quoc Le 的导师
  const correctRelation = await prisma.personRelation.findFirst({
    where: {
      personId: quocLe.id,
      relatedPersonId: andrewNg.id,
      relationType: 'advisor'
    }
  });

  if (wrongRelation) {
    console.log(`❌ 发现错误关系: Quoc Le 被标记为吴恩达的导师 (id: ${wrongRelation.id})`);

    if (!dryRun) {
      await prisma.personRelation.delete({
        where: { id: wrongRelation.id }
      });
      console.log('   ✅ 已删除错误关系');
    } else {
      console.log('   📝 [DRY RUN] 将删除此错误关系');
    }
  } else {
    console.log('✅ 未发现 "Quoc Le 是吴恩达导师" 的错误关系');
  }

  if (correctRelation) {
    console.log(`✅ 正确关系存在: 吴恩达是 Quoc Le 的导师 (id: ${correctRelation.id})`);
  } else {
    console.log('⚠️  正确关系不存在，需要添加: 吴恩达是 Quoc Le 的导师');

    if (!dryRun) {
      const newRelation = await prisma.personRelation.create({
        data: {
          personId: quocLe.id,
          relatedPersonId: andrewNg.id,
          relationType: 'advisor',
          description: '博士导师',
          source: 'manual_fix',
          confidence: 1.0
        }
      });
      console.log(`   ✅ 已添加正确关系 (id: ${newRelation.id})`);
    } else {
      console.log('   📝 [DRY RUN] 将添加此正确关系');
    }
  }

  // 3. 检查其他可能的重复同事/合作者关系
  console.log('\n📊 检查重复的同事/合作者关系...\n');

  const duplicateRelations = await prisma.$queryRaw<Array<{
    person_id: string;
    person_name: string;
    related_id: string;
    related_name: string;
    count: bigint;
  }>>`
    SELECT
      r."personId" as person_id,
      p1.name as person_name,
      r."relatedPersonId" as related_id,
      p2.name as related_name,
      COUNT(*) as count
    FROM "PersonRelation" r
    JOIN "People" p1 ON r."personId" = p1.id
    JOIN "People" p2 ON r."relatedPersonId" = p2.id
    GROUP BY r."personId", p1.name, r."relatedPersonId", p2.name
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
    LIMIT 20
  `;

  if (duplicateRelations.length === 0) {
    console.log('✅ 未发现完全重复的关系记录\n');
  } else {
    console.log(`⚠️  发现 ${duplicateRelations.length} 对重复关系:\n`);

    let deduplicatedCount = 0;

    for (const rel of duplicateRelations) {
      console.log(`  ${rel.person_name} → ${rel.related_name}: ${Number(rel.count)} 条记录`);

      // 获取所有重复记录
      const duplicates = await prisma.personRelation.findMany({
        where: {
          personId: rel.person_id,
          relatedPersonId: rel.related_id
        },
        orderBy: { createdAt: 'asc' }
      });

      if (duplicates.length > 1) {
        // 保留第一条（最早创建的），删除其余的
        const toDelete = duplicates.slice(1);

        if (!dryRun) {
          await prisma.personRelation.deleteMany({
            where: {
              id: { in: toDelete.map(d => d.id) }
            }
          });
          console.log(`    🗑️  已删除 ${toDelete.length} 条重复记录`);
        } else {
          console.log(`    📝 [DRY RUN] 将删除 ${toDelete.length} 条重复记录`);
          for (const d of toDelete) {
            console.log(`       - ${d.id} (${d.relationType})`);
          }
        }
        deduplicatedCount += toDelete.length;
      }
    }

    console.log(`\n📊 重复关系处理结果: 删除 ${deduplicatedCount} 条重复记录\n`);
  }

  console.log('=== 完成 ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
