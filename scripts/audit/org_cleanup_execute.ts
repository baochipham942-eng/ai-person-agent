/**
 * Organization 梳理执行（dry-run 默认，--execute 才写库）
 *
 * 决策（产品负责人拍板）：DeepMind 独立保留 / 噪声删除 / 合并旧名存进 aliases
 *
 * 步骤：备份 → ① type 重分类(学术机构) → ② 合并重复簇(旧名进 aliases) → ③ 删噪声
 * 全程可逆：执行前把全部 Organization 导出到 backups/org-backup-<ts>.json
 *
 * 用法：
 *   npx tsx scripts/audit/org_cleanup_execute.ts            # dry-run
 *   npx tsx scripts/audit/org_cleanup_execute.ts --execute
 */

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });
loadEnv({ path: '.env.local' });

import { writeFileSync, mkdirSync } from 'node:fs';
import { prisma } from '../../lib/db/prisma';

const ACADEMIC_RE = /\b(university|universit[eé]|institute of technology|college|polytechnic|école|ecole|matriculation)\b|大学|学院|研究院/i;
const SCHOOL_RE = /high school|primary school|secondary school|matriculation|grammar school|中学|小学|高中|初中/i;

// canonical -> 并入的名字片段（小写归一匹配）。DeepMind 不在内（独立保留）
const MERGE_CLUSTERS: Record<string, string[]> = {
    Google: ['google brain', 'google research', 'google x', 'google ai'],
    Meta: ['facebook', 'facebook ai research', 'fair', 'meta ai', 'facebook ai research (fair)'],
    Microsoft: ['microsoft research', 'microsoft research asia'],
    OpenAI: ['openai llc', 'openai inc'],
};

const execute = process.argv.includes('--execute');
const norm = (s: string) => (s || '').toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();

async function main() {
    console.log(`=== Organization 梳理执行 [${execute ? 'EXECUTE' : 'DRY-RUN'}] ===\n`);

    const orgs = await prisma.organization.findMany({
        select: { id: true, name: true, type: true, wikidataQid: true, aliases: true },
    });
    const roles = await prisma.personRole.findMany({ select: { organizationId: true, personId: true } });
    const peopleByOrg = new Map<string, number>();
    for (const r of roles) if (r.organizationId) peopleByOrg.set(r.organizationId, (peopleByOrg.get(r.organizationId) ?? 0) + 1);
    const cs = await prisma.companySource.findMany({ select: { organizationId: true } }).catch(() => []);
    const csByOrg = new Map<string, number>();
    for (const c of cs) csByOrg.set(c.organizationId, (csByOrg.get(c.organizationId) ?? 0) + 1);

    // 备份
    if (execute) {
        mkdirSync('scripts/audit/backups', { recursive: true });
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const path = `scripts/audit/backups/org-backup-${stamp}.json`;
        writeFileSync(path, JSON.stringify({ orgs, roleCount: roles.length, csCount: cs.length }, null, 2));
        console.log(`✓ 备份已写 ${path}（${orgs.length} 条 org）\n`);
    }

    // ① 重分类
    const reclass: Array<{ id: string; name: string; to: string }> = [];
    for (const o of orgs) {
        if (o.type !== 'company') continue;
        if (SCHOOL_RE.test(o.name)) reclass.push({ id: o.id, name: o.name, to: 'school' });
        else if (ACADEMIC_RE.test(o.name)) reclass.push({ id: o.id, name: o.name, to: 'university' });
    }
    console.log(`① 重分类 company→学术：${reclass.length} 家`);
    if (execute) {
        for (const r of reclass) await prisma.organization.update({ where: { id: r.id }, data: { type: r.to } });
        console.log(`   ✓ 已改 ${reclass.length} 条 type`);
    }

    // ② 合并重复簇
    const mergedMemberIds = new Set<string>();
    let totalRepointRoles = 0, totalRepointCs = 0, deletedMembers = 0;
    for (const [canonical, fragments] of Object.entries(MERGE_CLUSTERS)) {
        const members = orgs.filter(o => {
            const n = norm(o.name);
            return n === norm(canonical) || fragments.some(f => n === f || n.startsWith(f));
        });
        if (members.length <= 1) continue;
        const canon = members.find(m => norm(m.name) === norm(canonical)) ?? members[0];
        const toMerge = members.filter(m => m.id !== canon.id);
        console.log(`② 合并 ${canonical}（保留 ${canon.name}，并入 ${toMerge.map(m => m.name).join(', ')}）`);
        if (!execute) continue;

        const memberIds = toMerge.map(m => m.id);
        const rRoles = await prisma.personRole.updateMany({ where: { organizationId: { in: memberIds } }, data: { organizationId: canon.id } });
        const rCs = await prisma.companySource.updateMany({ where: { organizationId: { in: memberIds } }, data: { organizationId: canon.id } });
        await prisma.companyThreadLink.updateMany({ where: { organizationId: { in: memberIds } }, data: { organizationId: canon.id } }).catch(() => {});
        // 旧名进 aliases
        const newAliases = Array.from(new Set([...(canon.aliases ?? []), ...toMerge.map(m => m.name)]));
        await prisma.organization.update({ where: { id: canon.id }, data: { aliases: newAliases } });
        await prisma.organization.deleteMany({ where: { id: { in: memberIds } } });
        memberIds.forEach(id => mergedMemberIds.add(id));
        totalRepointRoles += rRoles.count; totalRepointCs += rCs.count; deletedMembers += memberIds.length;
        console.log(`   ✓ 重指 role ${rRoles.count} / source ${rCs.count}，aliases+${toMerge.length}，删 ${memberIds.length} 条`);
    }

    // ③ 删噪声（0 人物 + 无 QID + 无源；排除刚合并的 canonical 与已删成员）
    const noise = orgs.filter(o =>
        !mergedMemberIds.has(o.id)
        && (peopleByOrg.get(o.id) ?? 0) === 0
        && !o.wikidataQid
        && (csByOrg.get(o.id) ?? 0) === 0,
    );
    console.log(`③ 删噪声：${noise.length} 家（0人物+无QID+无源）`);
    if (execute && noise.length) {
        const del = await prisma.organization.deleteMany({ where: { id: { in: noise.map(o => o.id) } } });
        console.log(`   ✓ 已删 ${del.count} 条`);
    }

    const after = await prisma.organization.count();
    console.log(`\n=== ${execute ? '完成' : 'DRY-RUN 预览'} ===`);
    console.log(`重分类 ${reclass.length} | 合并删冗余 ${execute ? deletedMembers : '(待执行)'} | 删噪声 ${noise.length}`);
    console.log(`Organization: ${orgs.length} → ${execute ? after : orgs.length + '(未变)'}`);
    if (!execute) console.log(`\n（DRY-RUN，未写库。加 --execute 执行，会先自动备份）`);

    await prisma.$disconnect();
    process.exit(0);
}

main().catch(async e => { console.error('失败:', e); await prisma.$disconnect(); process.exit(1); });
