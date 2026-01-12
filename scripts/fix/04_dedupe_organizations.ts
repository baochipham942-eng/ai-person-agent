/**
 * P1-1: 组织去重脚本
 * 问题: 存在大量同名但不同ID的组织记录
 *
 * 策略:
 * 1. 按名称分组找出重复
 * 2. 选择保留优先级: 有wikidataQid > 有nameZh > 角色数最多
 * 3. 将其他记录的PersonRole迁移到保留的记录
 * 4. 删除重复记录
 */

import { prisma } from '../../lib/db/prisma';

interface OrgWithCount {
  id: string;
  name: string;
  nameZh: string | null;
  wikidataQid: string | null;
  roleCount: number;
}

// 计算组织的优先级分数
function getOrgScore(org: OrgWithCount): number {
  let score = 0;

  // 1. 有正规 wikidataQid (Q开头) 最优先
  if (org.wikidataQid && /^Q\d+$/.test(org.wikidataQid)) {
    score += 1000;
  } else if (org.wikidataQid) {
    // 有其他类型的 qid (baike-, ai-gen-) 次优先
    score += 100;
  }

  // 2. 角色数作为次要权重
  score += org.roleCount;

  // 3. 有中文名小幅加分
  if (org.nameZh) {
    score += 0.5;
  }

  return score;
}

// 选择要保留的组织
function selectPrimary(orgs: OrgWithCount[]): OrgWithCount {
  return orgs.sort((a, b) => getOrgScore(b) - getOrgScore(a))[0];
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('🔍 DRY RUN 模式 - 不会实际修改数据\n');
  }

  console.log('🔍 查找重复的组织...\n');

  // 获取所有组织及其角色数
  const orgs = await prisma.organization.findMany({
    include: { _count: { select: { roles: true } } }
  });

  const orgData: OrgWithCount[] = orgs.map(o => ({
    id: o.id,
    name: o.name,
    nameZh: o.nameZh,
    wikidataQid: o.wikidataQid,
    roleCount: o._count.roles
  }));

  // 按名称分组 (忽略大小写)
  const byName = new Map<string, OrgWithCount[]>();
  for (const org of orgData) {
    const key = org.name.toLowerCase().trim();
    const existing = byName.get(key) || [];
    existing.push(org);
    byName.set(key, existing);
  }

  // 找出重复的
  const duplicates = [...byName.entries()].filter(([, v]) => v.length > 1);

  if (duplicates.length === 0) {
    console.log('✅ 没有发现重复的组织');
    return;
  }

  console.log(`发现 ${duplicates.length} 组重复:\n`);

  let totalMerged = 0;
  let totalDeleted = 0;
  let totalRolesMoved = 0;

  for (const [name, dups] of duplicates) {
    const primary = selectPrimary(dups);
    const toMerge = dups.filter(o => o.id !== primary.id);

    console.log(`【${name}】`);
    console.log(`  保留: ${primary.id.slice(0, 12)}... (qid: ${primary.wikidataQid || 'null'}, roles: ${primary.roleCount})`);

    for (const dup of toMerge) {
      console.log(`  合并: ${dup.id.slice(0, 12)}... (qid: ${dup.wikidataQid || 'null'}, roles: ${dup.roleCount})`);

      if (!dryRun && dup.roleCount > 0) {
        // 获取需要迁移的 roles
        const rolesToMove = await prisma.personRole.findMany({
          where: { organizationId: dup.id }
        });

        for (const role of rolesToMove) {
          // 检查目标组织是否已有相同记录
          const existing = await prisma.personRole.findFirst({
            where: {
              personId: role.personId,
              organizationId: primary.id,
              role: role.role,
              startDate: role.startDate
            }
          });

          if (existing) {
            // 已存在相同记录，删除重复的
            await prisma.personRole.delete({
              where: { id: role.id }
            });
          } else {
            // 迁移到主组织
            await prisma.personRole.update({
              where: { id: role.id },
              data: { organizationId: primary.id }
            });
            totalRolesMoved++;
          }
        }
      }

      if (!dryRun) {
        // 删除重复组织
        await prisma.organization.delete({
          where: { id: dup.id }
        });
        totalDeleted++;
      }
    }

    totalMerged++;
    console.log();
  }

  if (dryRun) {
    console.log(`\n📊 预计: 合并 ${totalMerged} 组, 删除 ${duplicates.reduce((s, [, v]) => s + v.length - 1, 0)} 个组织`);
    console.log('\n运行 `npx tsx scripts/fix/04_dedupe_organizations.ts` (不带 --dry-run) 执行实际合并');
  } else {
    console.log(`\n✅ 完成: 合并 ${totalMerged} 组, 删除 ${totalDeleted} 个组织, 迁移 ${totalRolesMoved} 个角色`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
