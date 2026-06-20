/**
 * 教育漏判规则：把"学校/学位类机构 + 非教职 + endDate=null"的 PersonRole 从"当前雇主"里清掉。
 * 两臂命中：
 *   (a) 学术机构 org + 学位/就读/校友类 title（非 professor/researcher/fellow/director 等真实教职）
 *   (b) 高中/中学/secondary school org + 非教职 title（成年 AI 从业者不会"在职"于其高中）
 * 处理：有 startDate → 估算毕业 endDate（按学位类型）保留为过去教育；无日期 → 删除（纯噪声）。
 * 默认 dry-run，--execute 写库，全备份。
 *
 * 用法：npx tsx scripts/audit/fix_education_leak.ts [--execute]
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import { prisma } from '../../lib/db/prisma';

const EXECUTE = process.argv.includes('--execute');

const isStudent = (r?: string | null) => Boolean(r && r.toLowerCase().includes('student'));
const teach = (r: string) => /professor|lecturer|teacher|faculty|fellow|researcher|scientist|director|chair|dean|president|head|postdoc|教授|讲师|研究员|主任|院长|所长|系主任|科学家/i.test(r);
const academicOrg = (n: string, t: string) => t === 'university' || /universit|college|institute of tech|大学|学院/i.test(n);
const highSchoolOrg = (n: string) => /high school|secondary school|senior secondary|preparatory|middle school|中学|高中|附中|baptist institute|laboratory high|academy/i.test(n);
const eduTitle = (r: string) => /degree|bachelor|master|ph\.?d|b\.?s\.?|m\.?s\.?|b\.?tech|mba|m\.?eng|学士|硕士|博士|学位|本科|毕业|alumn|studied|diploma|undergrad|graduate student|校友|secondary education|study/i.test(r);

// 估算就读时长（年）
function durationYears(role: string): number {
  const r = role.toLowerCase();
  if (/ph\.?d|博士|doctor/.test(r)) return 5;
  if (/master|硕士|mba|m\.?s|m\.?eng/.test(r)) return 2;
  if (/high school|secondary|中学|高中/.test(r)) return 3;
  return 4; // bachelor/undergraduate/默认
}

async function main() {
  const roles = await prisma.personRole.findMany({
    where: { endDate: null },
    select: { id: true, role: true, startDate: true, person: { select: { name: true } }, organization: { select: { name: true, type: true } } },
  });

  const setEnd: { id: string; tag: string; end: string }[] = [];
  const del: { id: string; tag: string }[] = [];

  for (const r of roles) {
    if (isStudent(r.role)) continue;
    const orgName = r.organization?.name || '';
    const orgType = r.organization?.type || '';
    const armA = academicOrg(orgName, orgType) && eduTitle(r.role) && !teach(r.role);
    const armB = highSchoolOrg(orgName) && !teach(r.role);
    if (!armA && !armB) continue;

    const tag = `${r.person.name} | ${r.role.slice(0, 45)} @ ${orgName}`;
    if (r.startDate) {
      const end = new Date(r.startDate);
      end.setUTCFullYear(end.getUTCFullYear() + durationYears(r.role));
      setEnd.push({ id: r.id, tag, end: end.toISOString().slice(0, 10) });
    } else {
      del.push({ id: r.id, tag });
    }
  }

  console.log(`\n=== 补毕业 endDate（有起始，保留为过去教育）: ${setEnd.length} 条 ===`);
  for (const s of setEnd) console.log(`  📅 ${s.tag}  → end≈${s.end}`);
  console.log(`\n=== 删除（无日期教育噪声）: ${del.length} 条 ===`);
  for (const d of del) console.log(`  🗑️  ${d.tag}`);

  if (!EXECUTE) { console.log(`\n🔍 dry-run，未写库。确认后加 --execute。`); return; }

  const backup = await prisma.personRole.findMany({ where: { id: { in: [...setEnd.map((s) => s.id), ...del.map((d) => d.id)] } } });
  const bp = path.join(process.cwd(), 'data/audit/education-leak-backup.json');
  fs.writeFileSync(bp, JSON.stringify(backup, null, 2));
  console.log(`📦 备份 ${backup.length} 条 → ${bp}`);

  await prisma.$transaction([
    ...setEnd.map((s) => prisma.personRole.update({ where: { id: s.id }, data: { endDate: new Date(s.end + 'T00:00:00Z') } })),
    prisma.personRole.deleteMany({ where: { id: { in: del.map((d) => d.id) } } }),
  ]);
  console.log(`✅ 已补 ${setEnd.length} 条 endDate，删 ${del.length} 条。可用 backup 回滚。`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
