/**
 * 依据核验队列(concurrent-roles-review.json)给"已离职但 endDate 为空"的 PersonRole 补 endDate。
 * - 默认 dry-run，逐条打印 diff；--execute 才写库（事务，可回滚）。
 * - 只处理 status=past 且 confidence>=阈值 的角色；status=error/unknown 单独列出不自动写。
 * - 安全闸：endApprox 缺失，或解析出的 endDate <= startDate(模型把入职当离职了) → 标记可疑、跳过，
 *   除非在 OVERRIDES 里手工给了正确日期。
 *
 * 用法：
 *   npx tsx scripts/audit/apply_enddate_backfill.ts              # dry-run
 *   npx tsx scripts/audit/apply_enddate_backfill.ts --execute    # 写库
 *   npx tsx scripts/audit/apply_enddate_backfill.ts --min-conf 0.7
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import { prisma } from '../../lib/db/prisma';

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const MIN_CONF = args.includes('--min-conf') ? Number(args[args.indexOf('--min-conf') + 1]) : 0.6;
const NAMES = args.includes('--names') ? args[args.indexOf('--names') + 1].split(',').map((s) => s.trim()) : null;
const QUEUE = path.join(process.cwd(), 'data/audit/concurrent-roles-review.json');

// 人工修正：roleId -> 'YYYY-MM-DD'(强制此日期) | 'SKIP'(本轮不动)。
// 用于覆盖模型把"入职日"当"离职日"等错误。复审 dry-run 后在此补。
const OVERRIDES: Record<string, string> = {
  // Boris Cherny @ Anysphere(Cursor)：模型把入职月当离职月。实际 2025 年中加入 Cursor、~11 月回 Anthropic。
  cmk8hznn4002na1k3f8opzc2s: '2025-11-30',
  // 肖弘 @ Manus / 北京蝴蝶效应：判 past 依据"被 Meta 收购"系未证实传闻，Manus 仍在运营，本轮不动。
  cmjv7lswn001zsz2tkrd4p6o6: 'SKIP',
  cmjv7lv970021sz2ty4kh0f3o: 'SKIP',
  // Kevin Weil @ OpenAI：模型据 bio "Prev: OpenAI" 判离职，但 CPO 是其招牌职、证据不够硬，待确认前不动。
  cmjw6m5k2000k13kll5op4eij: 'SKIP',
  cmjw5o2zt000236ipvcn6dqtm: 'SKIP',
};

interface RoleEntry { roleId: string; idx: number; role: string; org: string; orgType: string; startDate: string | null }
interface Verdict { status: string; endApprox: string | null; confidence: number; note: string }
interface ReviewItem { personId: string; name: string; roles: RoleEntry[]; verdicts: Record<string, Verdict>; error?: string }

// "YYYY-MM" -> 当月最后一天; "YYYY" -> 12-31
function endApproxToDate(s: string | null): Date | null {
  if (!s) return null;
  const ym = s.match(/^(\d{4})-(\d{1,2})$/);
  if (ym) {
    const y = +ym[1], m = +ym[2];
    return new Date(Date.UTC(y, m, 0)); // m 月最后一天
  }
  const y = s.match(/^(\d{4})$/);
  if (y) return new Date(Date.UTC(+y[1], 11, 31));
  const full = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (full) return new Date(Date.UTC(+full[1], +full[2] - 1, +full[3]));
  return null;
}

async function main() {
  const queue: ReviewItem[] = JSON.parse(fs.readFileSync(QUEUE, 'utf8'));

  const writes: { roleId: string; person: string; org: string; role: string; start: string | null; end: string; conf: number; note: string }[] = [];
  const suspicious: string[] = [];
  const errors: string[] = [];
  const unknowns: string[] = [];

  for (const item of queue) {
    if (item.error) { console.log(`(队列错误，跳过) ${item.name}: ${item.error}`); continue; }
    if (NAMES && !NAMES.some((n) => item.name.includes(n))) continue;
    for (const r of item.roles) {
      const v = item.verdicts[String(r.idx)] || item.verdicts[r.idx as any];
      if (!v) continue;
      const tag = `${item.name} | ${r.role} @ ${r.org}`;
      if (v.status === 'error') { errors.push(`  ${tag}  → ${v.note}`); continue; }
      if (v.status === 'unknown') { unknowns.push(`  ${tag}  → ${v.note}`); continue; }
      if (v.status !== 'past') continue; // current 不动
      if (v.confidence < MIN_CONF) { suspicious.push(`  [低置信 ${v.confidence}] ${tag}`); continue; }

      const override = OVERRIDES[r.roleId];
      if (override === 'SKIP') { suspicious.push(`  [手工跳过] ${tag}`); continue; }

      let endDate = override ? endApproxToDate(override) : endApproxToDate(v.endApprox);
      const startD = r.startDate ? new Date(r.startDate) : null;

      if (!endDate) { suspicious.push(`  [无离职日期] ${tag}  endApprox=${v.endApprox}`); continue; }
      if (startD && endDate.getTime() <= startD.getTime() && !override) {
        suspicious.push(`  [离职日<=入职日，疑模型错] ${tag}  start=${r.startDate} endApprox=${v.endApprox}`);
        continue;
      }
      writes.push({
        roleId: r.roleId, person: item.name, org: r.org, role: r.role,
        start: r.startDate, end: endDate.toISOString().slice(0, 10), conf: v.confidence, note: v.note,
      });
    }
  }

  console.log(`\n${'='.repeat(80)}\n将补 endDate 的角色（status=past, conf>=${MIN_CONF}, 日期通过安全闸）: ${writes.length} 条\n`);
  for (const w of writes) {
    console.log(`  ✏️  ${w.person} | ${w.role} @ ${w.org}\n       ${w.start || '无起始'}  →  endDate=${w.end}  (conf=${w.conf})  ${w.note.slice(0, 70)}`);
  }
  console.log(`\n--- ⚠️ 可疑/跳过（需手工定夺，未写）: ${suspicious.length} 条 ---\n${suspicious.join('\n')}`);
  console.log(`\n--- ❌ status=error（疑数据污染，非真雇主；建议单独删除/标记，未写）: ${errors.length} 条 ---\n${errors.join('\n')}`);
  console.log(`\n--- ❔ status=unknown（证据不足，未写）: ${unknowns.length} 条 ---\n${unknowns.join('\n')}`);

  if (!EXECUTE) {
    console.log(`\n🔍 dry-run，未写库。复审无误后加 --execute。`);
    return;
  }

  // 写前备份：存目标 roleId 的当前 endDate（用于回滚）
  const backup = await prisma.personRole.findMany({
    where: { id: { in: writes.map((w) => w.roleId) } },
    select: { id: true, endDate: true },
  });
  const backupPath = path.join(process.cwd(), 'data/audit/enddate-backfill-backup.json');
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`📦 已备份 ${backup.length} 条原 endDate → ${backupPath}`);

  console.log(`开始写库（事务）...`);
  await prisma.$transaction(
    writes.map((w) =>
      prisma.personRole.update({ where: { id: w.roleId }, data: { endDate: new Date(w.end + 'T00:00:00Z') } })
    )
  );
  console.log(`✅ 已写入 ${writes.length} 条 endDate。回滚：用 backup 文件把这些 id 的 endDate 还原为 null。`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
