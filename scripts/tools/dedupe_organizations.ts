/**
 * 组织去重：合并 Organization 表中【精确同名】(忽略大小写/首尾空格) 但不同 id 的重复记录。
 * - 只自动合并精确同名（安全）；近似名（Figma|Figma Inc 等）只打印到审查清单，不动。
 * - 重定向外键：PersonRole / CompanySource / CompanyThreadLink / Product(软引用)。
 * - 处理唯一键冲突：PersonRole(@@unique personId,orgId,role,startDate) /
 *   CompanyThreadLink(@@unique orgId,threadSlug,relationType) 冲突时删冗余行而非更新。
 *
 * 用法：
 *   npx tsx scripts/tools/dedupe_organizations.ts            # dry-run，只报告
 *   npx tsx scripts/tools/dedupe_organizations.ts --execute  # 实际写库
 */
import { prisma } from '../../lib/db/prisma';

const EXECUTE = process.argv.includes('--execute');

const norm = (s: string) => s.toLowerCase().trim();
// 规范化近似名，用于"近似重复"提示（不自动合并）
const normLoose = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)|（.*?）/g, '')
    .replace(/\b(inc|ltd|llc|corp|co|company)\b\.?/g, '')
    .replace(/[^a-z0-9一-龥]/g, '')
    .trim();

// 选 survivor 的优先级：真 QID > 半生成 QID > 无 QID；同档按 PersonRole 引用数
function qidRank(qid: string | null): number {
  if (!qid) return 0;
  if (/^(ai-gen|baike|TEMP)/i.test(qid)) return 1;
  return 2;
}

async function main() {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, nameZh: true, type: true, wikidataQid: true },
  });

  // 按精确同名分组
  const groups = new Map<string, typeof orgs>();
  for (const o of orgs) {
    const k = norm(o.name);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(o);
  }

  const dupGroups = [...groups.entries()].filter(([, v]) => v.length > 1);

  // 引用计数
  async function refCount(orgId: string) {
    const [pr, cs, ctl, pd] = await Promise.all([
      prisma.personRole.count({ where: { organizationId: orgId } }),
      prisma.companySource.count({ where: { organizationId: orgId } }),
      prisma.companyThreadLink.count({ where: { organizationId: orgId } }),
      prisma.product.count({ where: { organizationId: orgId } }),
    ]);
    return { pr, cs, ctl, pd, total: pr + cs + ctl + pd };
  }

  console.log(`\n组织总数: ${orgs.length}`);
  console.log(`精确同名重复组: ${dupGroups.length}\n${'='.repeat(70)}`);

  let mergedOrgs = 0;
  let repointed = 0;
  let deletedRoles = 0;

  for (const [name, members] of dupGroups) {
    // 选 survivor
    const withRefs = await Promise.all(
      members.map(async (m) => ({ ...m, refs: await refCount(m.id) }))
    );
    withRefs.sort((a, b) => {
      const q = qidRank(b.wikidataQid) - qidRank(a.wikidataQid);
      if (q !== 0) return q;
      return b.refs.total - a.refs.total;
    });
    const survivor = withRefs[0];
    const losers = withRefs.slice(1);

    console.log(`\n【${name}】 ${members.length} 条`);
    console.log(`  ✓ 保留: id=${survivor.id} qid=${survivor.wikidataQid ?? 'null'} refs=${JSON.stringify(survivor.refs)}`);
    for (const l of losers) {
      console.log(`  ✗ 合并: id=${l.id} qid=${l.wikidataQid ?? 'null'} refs=${JSON.stringify(l.refs)}`);
    }

    if (!EXECUTE) continue;

    for (const l of losers) {
      // PersonRole：逐条 repoint，撞唯一键则删
      const roles = await prisma.personRole.findMany({ where: { organizationId: l.id } });
      for (const r of roles) {
        try {
          await prisma.personRole.update({
            where: { id: r.id },
            data: { organizationId: survivor.id },
          });
          repointed++;
        } catch {
          await prisma.personRole.delete({ where: { id: r.id } });
          deletedRoles++;
        }
      }
      // CompanyThreadLink：同理
      const ctls = await prisma.companyThreadLink.findMany({ where: { organizationId: l.id } });
      for (const c of ctls) {
        try {
          await prisma.companyThreadLink.update({ where: { id: c.id }, data: { organizationId: survivor.id } });
        } catch {
          await prisma.companyThreadLink.delete({ where: { id: c.id } });
        }
      }
      // CompanySource：urlHash 全局唯一，无冲突
      await prisma.companySource.updateMany({ where: { organizationId: l.id }, data: { organizationId: survivor.id } });
      // Product：软引用
      await prisma.product.updateMany({ where: { organizationId: l.id }, data: { organizationId: survivor.id } });

      await prisma.organization.delete({ where: { id: l.id } });
      mergedOrgs++;
    }
  }

  // 近似重复（不自动处理，仅提示）
  const looseGroups = new Map<string, Set<string>>();
  for (const o of orgs) {
    const k = normLoose(o.name);
    if (!k) continue;
    if (!looseGroups.has(k)) looseGroups.set(k, new Set());
    looseGroups.get(k)!.add(o.name);
  }
  const nearDups = [...looseGroups.values()].filter((s) => s.size > 1);
  console.log(`\n${'='.repeat(70)}\n近似同名（需人工确认，未自动合并）: ${nearDups.length} 组`);
  for (const s of nearDups) console.log(`  - ${[...s].join('  |  ')}`);

  console.log(`\n${'='.repeat(70)}`);
  if (EXECUTE) {
    console.log(`✅ 已执行：合并 ${mergedOrgs} 个组织，repoint ${repointed} 条 PersonRole，删冗余 ${deletedRoles} 条`);
  } else {
    console.log('🔍 dry-run（未写库）。确认无误后加 --execute 执行。');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
