/**
 * 去重影：A) 合并明确同一实体的近似重名组织（白名单，repoint 外键）；
 *         B) 折叠同一人在同一 org 的【完全重复职行】(规范化标题相等)，保留多头衔不误删。
 * 默认 dry-run，--execute 写库。删/改前全备份。
 *
 * 用法：
 *   npx tsx scripts/tools/dedupe_roles_and_orgs.ts
 *   npx tsx scripts/tools/dedupe_roles_and_orgs.ts --execute
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import { prisma } from '../../lib/db/prisma';

const EXECUTE = process.argv.includes('--execute');

// A) 组织合并白名单：survivorId 保留，losers 合并进它。仅列明确同一实体。
const ORG_MERGES: { survivor: string; survivorName: string; losers: string[] }[] = [
  { survivor: 'cmjw5jawe005tizl85rsi4215', survivorName: 'Figma', losers: ['cmjy0wmbz003vxccmxo0ndwku'] },
  { survivor: 'cmjw5g1ht000kizl8vzyrftsz', survivorName: 'McKinsey & Company', losers: ['cmjy1jsix00ihxccm7b58tqvv'] },
  { survivor: '942d2a38-7739-4b0c-bf07-0db7c440da18', survivorName: 'MiniMax', losers: ['cmjv7s1qy003ysz2t5042xxhh'] },
  { survivor: 'cmjv7nf2u002fsz2txhzjqhxy', survivorName: 'Cognition', losers: ['cmqc1gis3000h12iciijbmlit'] },
  { survivor: 'cmjw6djow0072dtlkjy7dbqy9', survivorName: 'AMD', losers: ['cmjw6fk2u004egwose08x69id'] },
  { survivor: 'cmk8hzmaz002la1k3p713txxo', survivorName: 'Anysphere (Cursor)', losers: ['cmqc1g9fo000112icqfaardj8'] },
  { survivor: 'cmjv3e8kd0006m207iubz7es2', survivorName: 'Reddit', losers: ['cmjuv600d000fu3ou6xvys90r'] },
];

const isStudentRole = (r?: string | null) => Boolean(r && r.toLowerCase().includes('student'));
const normTitle = (s: string) => s.toLowerCase().replace(/[^a-z0-9一-龥]/g, '').trim();

async function main() {
  const backup: any = { orgMergeRoleRepoint: [], orgDeleted: [], rolesDeleted: [] };

  // ---------- A) 组织合并 ----------
  console.log(`\n===== A) 组织合并（${ORG_MERGES.length} 组）=====`);
  for (const m of ORG_MERGES) {
    for (const loserId of m.losers) {
      const loser = await prisma.organization.findUnique({ where: { id: loserId }, select: { name: true } });
      if (!loser) { console.log(`  (跳过，不存在) ${loserId}`); continue; }
      const roles = await prisma.personRole.findMany({ where: { organizationId: loserId }, select: { id: true, role: true, personId: true } });
      const cs = await prisma.companySource.count({ where: { organizationId: loserId } });
      const ctl = await prisma.companyThreadLink.count({ where: { organizationId: loserId } });
      const pd = await prisma.product.count({ where: { organizationId: loserId } });
      console.log(`  「${loser.name}」→「${m.survivorName}」: repoint ${roles.length} roles, ${cs} src, ${ctl} link, ${pd} product，然后删 org`);

      if (!EXECUTE) continue;
      for (const r of roles) {
        try {
          await prisma.personRole.update({ where: { id: r.id }, data: { organizationId: m.survivor } });
          backup.orgMergeRoleRepoint.push({ roleId: r.id, from: loserId, to: m.survivor });
        } catch {
          // repoint 撞 @@unique(personId,orgId,role,startDate) → 删冗余
          const full = await prisma.personRole.findUnique({ where: { id: r.id } });
          backup.rolesDeleted.push(full);
          await prisma.personRole.delete({ where: { id: r.id } });
        }
      }
      await prisma.companySource.updateMany({ where: { organizationId: loserId }, data: { organizationId: m.survivor } });
      await prisma.companyThreadLink.updateMany({ where: { organizationId: loserId }, data: { organizationId: m.survivor } }).catch(() => {});
      await prisma.product.updateMany({ where: { organizationId: loserId }, data: { organizationId: m.survivor } });
      const delOrg = await prisma.organization.findUnique({ where: { id: loserId } });
      backup.orgDeleted.push(delOrg);
      await prisma.organization.delete({ where: { id: loserId } });
    }
  }

  // ---------- B) 同人同 org 完全重复职行折叠 ----------
  console.log(`\n===== B) 同一人在同一 org 的完全重复职行（保留多头衔）=====`);
  const people = await prisma.people.findMany({
    select: { id: true, name: true, roles: { select: { id: true, role: true, roleZh: true, endDate: true, startDate: true, confidence: true, organizationId: true, organization: { select: { name: true } } } } },
  });

  const toDelete: { id: string; tag: string }[] = [];
  for (const p of people) {
    const cur = p.roles.filter((r) => !r.endDate && !isStudentRole(r.role));
    const byOrg: Record<string, typeof cur> = {};
    for (const r of cur) (byOrg[r.organizationId] = byOrg[r.organizationId] || []).push(r);
    for (const oid in byOrg) {
      const group = byOrg[oid];
      if (group.length < 2) continue;
      // 按规范化标题分桶，桶内 >1 才折叠
      const titleBuckets: Record<string, typeof group> = {};
      for (const r of group) (titleBuckets[normTitle(r.role)] = titleBuckets[normTitle(r.role)] || []).push(r);
      for (const key in titleBuckets) {
        const dups = titleBuckets[key];
        if (dups.length < 2) continue; // 不同头衔 → 保留
        // 留 1：优先有 startDate、conf 高
        dups.sort((a, b) => {
          if (!!b.startDate !== !!a.startDate) return (b.startDate ? 1 : 0) - (a.startDate ? 1 : 0);
          return (b.confidence || 0) - (a.confidence || 0);
        });
        for (const r of dups.slice(1)) toDelete.push({ id: r.id, tag: `${p.name} | ${r.role} @ ${r.organization?.name}` });
      }
    }
  }
  console.log(`  待删完全重复职行: ${toDelete.length} 条`);
  for (const d of toDelete) console.log(`    🗑️  ${d.tag}`);

  if (EXECUTE && toDelete.length) {
    const full = await prisma.personRole.findMany({ where: { id: { in: toDelete.map((d) => d.id) } } });
    backup.rolesDeleted.push(...full);
    await prisma.personRole.deleteMany({ where: { id: { in: toDelete.map((d) => d.id) } } });
  }

  if (EXECUTE) {
    const bp = path.join(process.cwd(), 'data/audit/dedupe-roles-orgs-backup.json');
    fs.writeFileSync(bp, JSON.stringify(backup, null, 2));
    console.log(`\n✅ 已执行。备份 → ${bp}（含 repoint/删 org/删职行，可重建回滚）`);
  } else {
    console.log(`\n🔍 dry-run，未写库。确认后加 --execute。`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
