/**
 * 修人物身份数据：①清掉张冠李戴的脏别名/脏机构 ②给中文名补正确英文别名（让 OpenAlex 能搜到）。
 *
 * 背景：backfill_openalex_identity 靠 ASCII 别名搜 OpenAlex；纯中文名（唐杰/朱军等）搜不到 →
 * 这些人永远拿不到 openalexId、抓不到论文。补正确英文别名后再跑 backfill 即可解锁。
 * 贾扬清(Yangqing Jia)的记录被另一个人邓嘉(Jia Deng)污染：别名 "Jia Deng" + org "普林斯顿大学"
 * 都是邓嘉的（贾扬清真实=NVIDIA VP + Lepton AI CEO，曾 Berkeley/Google/Alibaba/Meta）。
 *
 * 英文名均经核实（famous Chinese AI 研究者 + 丁洁经 web 查证=Jie Ding, UMN 统计系）。
 *
 * 用法：
 *   npx tsx scripts/fix/fix_identity_aliases.ts            # dry-run
 *   npx tsx scripts/fix/fix_identity_aliases.ts --execute  # 写库（改前备份到 data/audit/）
 *
 * 安全：dry-run 默认；改前把受影响记录快照到 data/audit/；幂等（别名已有不重复加，脏值不存在则跳过）。
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

import { prisma } from '@/lib/db/prisma';
import { mkdirSync, writeFileSync } from 'node:fs';

interface Fix {
  name: string;            // 主名（唯一定位）
  addAliases?: string[];   // 要补的别名
  removeAliases?: string[];// 要删的脏别名
  removeOrgs?: string[];   // 要删的脏机构
  note: string;
}

const FIXES: Fix[] = [
  { name: '贾扬清', addAliases: ['Yangqing Jia'], removeAliases: ['Jia Deng'], removeOrgs: ['普林斯顿大学'],
    note: 'Yangqing Jia(Caffe作者/NVIDIA VP/Lepton CEO)；Jia Deng+普林斯顿是邓嘉的污染' },
  { name: '唐杰', addAliases: ['Jie Tang'], note: '清华教授/智谱AI/AMiner/GLM' },
  { name: '印奇', addAliases: ['Qi Yin'], note: '旷视科技(Face++)联创CEO' },
  { name: '朱军', addAliases: ['Jun Zhu'], note: '清华教授/贝叶斯深度学习/生数科技(Vidu)' },
  { name: '黄铁军', addAliases: ['Tiejun Huang'], note: '北大教授/智源研究院' },
  { name: '周明', addAliases: ['Ming Zhou'], note: '前MSRA NLP/澜舟科技创始人' },
  { name: '丁洁', addAliases: ['Jie Ding'], note: 'UMN 统计系副教授(web核实)' },
];

const uniq = (arr: string[]) => [...new Set(arr.map(s => s.trim()).filter(Boolean))];

async function main() {
  const execute = process.argv.includes('--execute');
  console.log(`🧹 fix_identity_aliases — ${execute ? '执行写库' : 'DRY-RUN'}`);
  await prisma.people.count();

  const stats = { processed: 0, changed: 0, notFound: 0, noop: 0 };
  const backups: unknown[] = [];

  for (const fix of FIXES) {
    stats.processed++;
    const p = await prisma.people.findFirst({
      where: { name: fix.name },
      select: { id: true, name: true, aliases: true, organization: true },
    });
    if (!p) { stats.notFound++; console.log(`  ✗ 未找到: ${fix.name}`); continue; }

    const curAliases = (p.aliases as string[]) || [];
    const curOrgs = (p.organization as string[]) || [];

    let nextAliases = curAliases.filter(a => !(fix.removeAliases || []).includes(a));
    nextAliases = uniq([...nextAliases, ...(fix.addAliases || [])]);
    const nextOrgs = curOrgs.filter(o => !(fix.removeOrgs || []).includes(o));

    const aliasChanged = JSON.stringify(curAliases) !== JSON.stringify(nextAliases);
    const orgChanged = JSON.stringify(curOrgs) !== JSON.stringify(nextOrgs);
    if (!aliasChanged && !orgChanged) { stats.noop++; console.log(`  · ${fix.name}: 已是目标状态，跳过`); continue; }

    console.log(`  ✓ ${fix.name} [${fix.note}]`);
    if (aliasChanged) console.log(`      aliases: ${JSON.stringify(curAliases)} → ${JSON.stringify(nextAliases)}`);
    if (orgChanged) console.log(`      org:     ${JSON.stringify(curOrgs)} → ${JSON.stringify(nextOrgs)}`);

    backups.push({ id: p.id, name: p.name, aliases: curAliases, organization: curOrgs });
    stats.changed++;

    if (!execute) continue;
    await prisma.people.update({ where: { id: p.id }, data: { aliases: nextAliases, organization: nextOrgs } });
  }

  if (execute && backups.length > 0) {
    mkdirSync('data/audit', { recursive: true });
    const path = `data/audit/fix_identity_aliases_backup.json`;
    writeFileSync(path, JSON.stringify(backups, null, 2));
    console.log(`\n💾 改前快照已备份: ${path}`);
  }

  console.log(`\n📊 ${execute ? '已改' : '将改'} ${stats.changed} 人（未找到 ${stats.notFound}，已达标 ${stats.noop}）`);
  if (!execute) console.log('加 --execute 写库。之后跑 backfill_openalex_identity --names 解锁这些人的 openalexId。');
  await prisma.$disconnect();
}

main().catch(error => { console.error(error); process.exit(1); });
