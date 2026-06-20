import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });
import { writeFileSync, mkdirSync } from 'node:fs';
import { prisma } from '@/lib/db/prisma';

// 修复公司页扫出的个体履历数据错误。默认 dry-run，--execute 才写库。
// 每条按 (人名 + 机构名 + 职位名 + 当前是否 endDate=null) 精确定位，幂等可重入。
const EXECUTE = process.argv.includes('--execute');

// 真实但应已结束的职位 → 补 endDate（学生/访问学者等）
const ENDDATE_FIXES = [
  { person: '乔尔·皮诺', orgContains: 'Carnegie Mellon', roleContains: 'Student', endDate: '2004-12-31', note: 'CMU 博士 ~2004 毕业，现任 Cohere CAIO' },
  { person: 'Haofan Wang', orgContains: 'Berkeley', roleContains: 'Visiting Student', endDate: '2017-12-31', note: '伯克利访问学生，现任 Lovart AI；同期 RA 已 2017-12 结束' },
];

// 明显张冠李戴 / 误抓的职位（此人从未担任）→ 删除（删前备份可恢复）
const DELETE_FIXES = [
  { person: '吉滕德拉·马利克', orgContains: 'Microsoft', roleContains: 'Cloud Solution Architect', note: '同名误抓：真·Jitendra Malik 是 Berkeley/Meta CV 教授，非微软云架构师' },
  { person: '周明', orgContains: 'Jardine Matheson', roleContains: 'Executive Trainee', note: '同名误抓：怡和洋行管培生 ≠ NLP 学者周明（澜舟科技）' },
  { person: '周明', orgContains: 'Tsinghua', roleContains: 'Researcher/Developer', note: '低置信 llm_extraction，与其 MSRA→澜舟 履历冲突，且标 1991 至今现任不实' },
];

type RoleRow = {
  id: string; role: string; roleZh: string | null; endDate: Date | null; startDate: Date | null;
  source: string | null; confidence: number | null;
  organization: { name: string; nameZh: string | null } | null;
  person: { id: string; name: string };
};

async function findRoles(personName: string, orgContains: string, roleContains: string): Promise<RoleRow[]> {
  const rows = await prisma.personRole.findMany({
    where: {
      person: { name: { contains: personName, mode: 'insensitive' } },
      OR: [
        { role: { contains: roleContains, mode: 'insensitive' } },
        { roleZh: { contains: roleContains, mode: 'insensitive' } },
      ],
      organization: { OR: [
        { name: { contains: orgContains, mode: 'insensitive' } },
        { nameZh: { contains: orgContains, mode: 'insensitive' } },
      ] },
    },
    select: { id: true, role: true, roleZh: true, endDate: true, startDate: true, source: true, confidence: true,
      organization: { select: { name: true, nameZh: true } }, person: { select: { id: true, name: true } } },
  });
  return rows;
}

async function main() {
  await prisma.people.count();
  const backup: Record<string, unknown> = { takenAt: new Date().toISOString(), endDateFixes: [], deletes: [] };
  console.log(`模式: ${EXECUTE ? '*** EXECUTE (写库) ***' : 'dry-run (只预览)'}\n`);

  console.log('— 补 endDate —');
  for (const fix of ENDDATE_FIXES) {
    const rows = await findRoles(fix.person, fix.orgContains, fix.roleContains);
    const targets = rows.filter(r => !r.endDate);
    if (targets.length === 0) { console.log(`  · ${fix.person} @ ${fix.orgContains} [${fix.roleContains}]: 无待修(可能已修)`); continue; }
    for (const r of targets) {
      console.log(`  · ${r.person.name} | ${r.organization?.name} | ${r.roleZh || r.role} | 当前 CURRENT → endDate=${fix.endDate}  (${fix.note})`);
      (backup.endDateFixes as unknown[]).push(r);
      if (EXECUTE) {
        try { await prisma.personRole.update({ where: { id: r.id }, data: { endDate: new Date(fix.endDate) } }); }
        catch (e) { console.error(`    ! 失败 ${r.id}:`, (e as Error).message); }
      }
    }
  }

  console.log('\n— 删除误抓职位 —');
  for (const fix of DELETE_FIXES) {
    const rows = await findRoles(fix.person, fix.orgContains, fix.roleContains);
    if (rows.length === 0) { console.log(`  · ${fix.person} @ ${fix.orgContains} [${fix.roleContains}]: 无匹配(可能已删)`); continue; }
    for (const r of rows) {
      console.log(`  · ${r.person.name} | ${r.organization?.name} | ${r.roleZh || r.role} | src=${r.source} conf=${r.confidence} → DELETE  (${fix.note})`);
      (backup.deletes as unknown[]).push(r);
      if (EXECUTE) {
        try { await prisma.personRole.delete({ where: { id: r.id } }); }
        catch (e) { console.error(`    ! 失败 ${r.id}:`, (e as Error).message); }
      }
    }
  }

  if (EXECUTE) {
    mkdirSync('data/audit', { recursive: true });
    const path = `data/audit/stale_individual_roles_backup_${Date.now()}.json`;
    writeFileSync(path, JSON.stringify(backup, null, 2));
    console.log(`\n备份已写: ${path}`);
  } else {
    console.log('\n(dry-run 未写库；加 --execute 执行，执行时会先备份受影响行到 data/audit/)');
  }
  await prisma.$disconnect();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
