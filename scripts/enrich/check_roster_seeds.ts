/**
 * 名册种子去重核对: 插入前检查每个种子是否已在库 (按 name/nameZh/aliases/dedupCheck 模糊匹配)。
 * 只读, 不写库。
 * 用法: npx tsx scripts/enrich/check_roster_seeds.ts
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../../lib/db/prisma';

async function main() {
    const { seeds } = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'docs/audit-2026-06/roster_seeds.json'), 'utf-8'));

    let newCount = 0, dupCount = 0;
    const toInsert: string[] = [], toUpdate: string[] = [];

    for (const s of seeds) {
        // 收集所有可能的匹配词
        const terms = [s.name, s.nameZh, ...(s.aliases || []), ...(s.dedupCheck || [])].filter(Boolean);
        const matches = await prisma.people.findMany({
            where: { OR: terms.flatMap((t: string) => [{ name: { contains: t } }, { aliases: { has: t } }]) },
            select: { id: true, name: true, influenceScore: true, currentTitle: true },
        });

        if (matches.length > 0) {
            dupCount++;
            toUpdate.push(s.name);
            console.log(`  ⚠️  "${s.name}" (${s.nameZh}) 疑似已存在:`);
            matches.forEach(m => console.log(`        库内: "${m.name}" score=${m.influenceScore} title="${m.currentTitle || ''}"`));
        } else {
            newCount++;
            toInsert.push(s.name);
            console.log(`  ✅ "${s.name}" (${s.nameZh}) — 全新, 可入库`);
        }
    }

    console.log(`\n=== 汇总 ===`);
    console.log(`  全新可入库 (${newCount}): ${toInsert.join(', ')}`);
    console.log(`  疑似已存在需走更新 (${dupCount}): ${toUpdate.join(', ')}`);
    process.exit(0);
}
main().catch(e => { console.error('ERR:', e.message); process.exit(1); });
