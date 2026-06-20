/**
 * 删除核验队列里 status=error 的 PersonRole（确认非真实雇主：学位被当雇主 / 认错人 / 数据矛盾）。
 * - 默认 dry-run；--execute 才删。删前备份完整行，可重建。
 * - 安全闸：只删 confidence>=阈值 且 不在 KEEP 白名单 的；KEEP 用于人工保留误判项。
 *
 * 用法：
 *   npx tsx scripts/audit/delete_error_roles.ts                 # dry-run
 *   npx tsx scripts/audit/delete_error_roles.ts --execute
 *   npx tsx scripts/audit/delete_error_roles.ts --min-conf 0.8
 *   npx tsx scripts/audit/delete_error_roles.ts --execute --backup data/audit/deleted-error-roles-backup.custom.json
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import { prisma } from '../../lib/db/prisma';

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const MIN_CONF = args.includes('--min-conf') ? Number(args[args.indexOf('--min-conf') + 1]) : 0.7;
const NAMES = args.includes('--names') ? args[args.indexOf('--names') + 1].split(',').map((s) => s.trim()) : null;
const QUEUE = path.join(process.cwd(), 'data/audit/concurrent-roles-review.json');
const BACKUP_ARG = args.includes('--backup') ? args[args.indexOf('--backup') + 1] : null;
const DEFAULT_BACKUP_PATH = `data/audit/deleted-error-roles-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
const BACKUP_PATH = resolvePath(BACKUP_ARG || DEFAULT_BACKUP_PATH);

function resolvePath(value: string) {
  return path.isAbsolute(value) ? value : path.join(process.cwd(), value);
}

// 人工保留：roleId 列表，模型判 error 但实际应保留的，加进来跳过删除。
const KEEP = new Set<string>([
  // 机构真实、仅元数据(日期/头衔)错，删了会抹掉真实当前职 → 保留，另行修日期
  'cmjw5jt0l006qizl8to3gs2cd', // 桑达尔·皮查伊 @ Google（现任 CEO，模型嫌入职职级标错）
  // 科拉伊·卡武克丘奥卢 真是 Google DeepMind 研究 VP，模型"生于2000矛盾"系库里生日错，全保护，另行修生日
  'cmjv5gkcc0064p9gn8s278xx2',
  'cmjy1hme600gzxccm8o6dp322',
  'cmjy1ho9b00h3xccmqqeomk5j',
]);

interface RoleEntry { roleId: string; idx: number; role: string; org: string; startDate: string | null }
interface Verdict { status: string; confidence: number; note: string }
interface ReviewItem { personId: string; name: string; roles: RoleEntry[]; verdicts: Record<string, Verdict>; error?: string }

async function main() {
  const queue: ReviewItem[] = JSON.parse(fs.readFileSync(QUEUE, 'utf8'));
  let targets: { roleId: string; person: string; org: string; role: string; conf: number; note: string }[] = [];
  const lowConf: string[] = [];

  for (const item of queue) {
    if (item.error) continue;
    if (NAMES && !NAMES.some((n) => item.name.includes(n))) continue;
    for (const r of item.roles) {
      const v = item.verdicts[String(r.idx)];
      if (!v || v.status !== 'error') continue;
      if (KEEP.has(r.roleId)) continue;
      const tag = `${item.name} | ${r.role} @ ${r.org}`;
      if (v.confidence < MIN_CONF) { lowConf.push(`  [低置信 ${v.confidence}] ${tag} → ${v.note.slice(0, 80)}`); continue; }
      targets.push({ roleId: r.roleId, person: item.name, org: r.org, role: r.role, conf: v.confidence, note: v.note });
    }
  }

  const existingRows = targets.length > 0
    ? await prisma.personRole.findMany({
      where: { id: { in: targets.map((target) => target.roleId) } },
      select: { id: true },
    })
    : [];
  const existingIds = new Set(existingRows.map((row) => row.id));
  const missingTargets = targets.filter((target) => !existingIds.has(target.roleId));
  targets = targets.filter((target) => existingIds.has(target.roleId));

  console.log(`\n将删除的 error 角色 (conf>=${MIN_CONF}): ${targets.length} 条\n`);
  for (const t of targets) console.log(`  🗑️  ${t.person} | ${t.role} @ ${t.org}  (c=${t.conf})\n       ${t.note.slice(0, 90)}`);
  console.log(`\n--- 已不在当前库中的 error 角色（跳过）: ${missingTargets.length} 条 ---`);
  console.log(`\n--- 低置信 error（未删，需手工）: ${lowConf.length} 条 ---\n${lowConf.join('\n')}`);

  if (!EXECUTE) { console.log(`\n🔍 dry-run，未删。确认后加 --execute。`); return; }

  const ids = targets.map((t) => t.roleId);
  const backup = await prisma.personRole.findMany({ where: { id: { in: ids } } });
  fs.mkdirSync(path.dirname(BACKUP_PATH), { recursive: true });
  fs.writeFileSync(BACKUP_PATH, JSON.stringify(backup, null, 2));
  console.log(`📦 已备份 ${backup.length} 条完整行 → ${BACKUP_PATH}`);

  const res = await prisma.personRole.deleteMany({ where: { id: { in: ids } } });
  console.log(`✅ 已删除 ${res.count} 条 error 角色。回滚：用 backup 文件 recreate。`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
