/**
 * 应用审计修复清单 (docs/audit-2026-06/fixes.json)
 *
 * 默认 dry-run: 只查询 + 打印将发生的变更, 不写库。
 * --execute: 真正写库 (每类用事务)。
 *
 * 用法:
 *   npx tsx scripts/fix/apply_audit_fixes.ts            # dry-run 预览
 *   npx tsx scripts/fix/apply_audit_fixes.ts --execute  # 真正执行
 *   npx tsx scripts/fix/apply_audit_fixes.ts --only=orgMerge,relationDelete
 *
 * 执行顺序约束: orgMerge 先于 orgRename (审计 §1 要求)。
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../../lib/db/prisma';

const EXECUTE = process.argv.includes('--execute');
const onlyArg = process.argv.find(a => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.split('=')[1].split(',') : null;
const want = (phase: string) => !ONLY || ONLY.includes(phase);

const fixes = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'docs/audit-2026-06/fixes.json'), 'utf-8'));

const mode = EXECUTE ? '🔴 EXECUTE (写库)' : '🟢 DRY-RUN (只预览)';
const warns: string[] = [];

/** 替换 People.organization[] 中的旧 nameZh 为新值并去重 */
async function syncPeopleOrgArray(nameZhMap: Map<string, string>, execute: boolean): Promise<{ affected: number }> {
    const oldNames = [...nameZhMap.keys()].filter(Boolean);
    if (oldNames.length === 0) return { affected: 0 };
    const people = await prisma.people.findMany({
        where: { organization: { hasSome: oldNames } },
        select: { id: true, organization: true },
    });
    let affected = 0;
    for (const p of people) {
        const next = [...new Set(p.organization.map(o => nameZhMap.get(o) || o))];
        if (JSON.stringify(next) !== JSON.stringify(p.organization)) {
            affected++;
            if (execute) {
                await prisma.people.update({ where: { id: p.id }, data: { organization: next } });
            }
        }
    }
    return { affected };
}

async function doOrgMerge() {
    console.log('\n========== ① 机构去重合并 ==========');
    let totalRoles = 0, totalPeople = 0, totalDeleted = 0;
    for (const cluster of fixes.orgMerge as Array<{ keep: string; members: string[] }>) {
        const canonical = await prisma.organization.findFirst({ where: { name: cluster.keep } });
        if (!canonical) { warns.push(`[orgMerge] canonical 未找到: "${cluster.keep}" (整簇跳过)`); continue; }

        const memberOrgs = [];
        for (const m of cluster.members) {
            const o = await prisma.organization.findFirst({ where: { name: m } });
            if (o && o.id !== canonical.id) memberOrgs.push(o);
            else if (!o) warns.push(`[orgMerge] member 未找到: "${m}" (簇 ${cluster.keep})`);
        }
        if (memberOrgs.length === 0) continue;

        const memberIds = memberOrgs.map(o => o.id);
        const roleCount = await prisma.personRole.count({ where: { organizationId: { in: memberIds } } });
        const nameZhMap = new Map<string, string>();
        for (const m of memberOrgs) if (m.nameZh && canonical.nameZh) nameZhMap.set(m.nameZh, canonical.nameZh);
        const { affected: peopleCount } = await syncPeopleOrgArray(nameZhMap, false);

        console.log(`  ${cluster.keep}  ← [${memberOrgs.map(o => o.name).join(', ')}]`);
        console.log(`     repoint PersonRole: ${roleCount} 条 | People.organization[] 更新: ${peopleCount} 人 | 删冗余 org: ${memberOrgs.length}`);

        totalRoles += roleCount; totalPeople += peopleCount; totalDeleted += memberOrgs.length;

        if (EXECUTE) {
            try {
                let merged = 0, dedupedDup = 0;
                const roleKey = (r: { personId: string; role: string; startDate: Date | null }) =>
                    `${r.personId}|${r.role}|${r.startDate?.toISOString() ?? 'null'}`;
                await prisma.$transaction(async (tx) => {
                    // 预取 canonical 已有键集合, 内存判重(避免逐条 findFirst 往返导致事务超时)
                    const canonRoles = await tx.personRole.findMany({ where: { organizationId: canonical.id }, select: { personId: true, role: true, startDate: true } });
                    const keys = new Set(canonRoles.map(roleKey));
                    const memberRoles = await tx.personRole.findMany({
                        where: { organizationId: { in: memberIds } },
                        select: { id: true, personId: true, role: true, startDate: true },
                    });
                    for (const r of memberRoles) {
                        const k = roleKey(r);
                        // 撞唯一键(canonical 已有 或 同批已repoint) -> 删 member 侧重复; 否则 repoint
                        if (keys.has(k)) { await tx.personRole.delete({ where: { id: r.id } }); dedupedDup++; }
                        else { await tx.personRole.update({ where: { id: r.id }, data: { organizationId: canonical.id } }); keys.add(k); merged++; }
                    }
                    await tx.organization.deleteMany({ where: { id: { in: memberIds } } });
                }, { timeout: 60000, maxWait: 15000 });
                await syncPeopleOrgArray(nameZhMap, true);
                if (dedupedDup > 0) console.log(`     ↳ repoint ${merged} 条, 另删 ${dedupedDup} 条重复履历`);
            } catch (e) {
                warns.push(`[orgMerge] 簇 "${cluster.keep}" 执行失败(已回滚): ${(e as Error).message?.slice(0, 200)}`);
            }
        }
    }
    console.log(`  小计: repoint ${totalRoles} roles | 更新 ${totalPeople} 人 | 删 ${totalDeleted} 个冗余机构`);
}

async function doOrgRename() {
    console.log('\n========== ② 机构译名修复 ==========');
    for (const r of fixes.orgRename as Array<{ match: string; name: string; nameZh: string }>) {
        const org = await prisma.organization.findFirst({ where: { name: r.match } });
        if (!org) { warns.push(`[orgRename] 未找到: "${r.match}"`); continue; }
        const nameZhMap = new Map<string, string>();
        if (org.nameZh && org.nameZh !== r.nameZh) nameZhMap.set(org.nameZh, r.nameZh);
        const { affected } = await syncPeopleOrgArray(nameZhMap, false);
        console.log(`  "${org.name}" -> name="${r.name}" nameZh="${r.nameZh}" | People[] 同步: ${affected} 人`);
        if (EXECUTE) {
            await prisma.organization.update({ where: { id: org.id }, data: { name: r.name, nameZh: r.nameZh } });
            await syncPeopleOrgArray(nameZhMap, true);
        }
    }
}

async function doRelationDelete() {
    console.log('\n========== ③ 关系删除 (幻觉) ==========');
    let found = 0, notFound = 0;
    for (const d of fixes.relationDelete as Array<{ person: string; related: string; type: string }>) {
        const rels = await prisma.personRelation.findMany({
            where: {
                relationType: d.type,
                person: { name: { contains: d.person } },
                relatedPerson: { name: { contains: d.related } },
            },
            select: { id: true, person: { select: { name: true } }, relatedPerson: { select: { name: true } } },
        });
        if (rels.length === 0) {
            notFound++;
            warns.push(`[relationDelete] 未匹配: ${d.person} -${d.type}-> ${d.related}`);
            continue;
        }
        found += rels.length;
        console.log(`  删: ${rels.map(r => `${r.person.name} -${d.type}-> ${r.relatedPerson.name}`).join('; ')}`);
        if (EXECUTE) await prisma.personRelation.deleteMany({ where: { id: { in: rels.map(r => r.id) } } });
    }
    console.log(`  小计: 匹配删除 ${found} 条 | 未匹配 ${notFound} 条 (见末尾警告)`);
}

async function doDateFix() {
    console.log('\n========== ④ 履历日期修复 ==========');
    let ok = 0, miss = 0;
    for (const f of fixes.dateFix as Array<any>) {
        const person = await prisma.people.findFirst({ where: { name: { contains: f.person } }, select: { id: true } });
        // 同名机构可能有多条(重复未合并), 在所有匹配机构里找 role
        const orgs = await prisma.organization.findMany({ where: { OR: [{ name: f.org }, { nameZh: f.org }] }, select: { id: true } });
        if (!person || orgs.length === 0) { miss++; warns.push(`[dateFix] 定位失败: ${f.person} @ ${f.org} (${f.role})`); continue; }
        const role = await prisma.personRole.findFirst({
            where: { personId: person.id, organizationId: { in: orgs.map(o => o.id) }, role: f.role },
            select: { id: true, startDate: true, endDate: true, source: true },
        });
        if (!role) { miss++; warns.push(`[dateFix] role 未找到: ${f.person} @ ${f.org} (${f.role})`); continue; }
        ok++;
        const data: any = {};
        if (f.start) data.startDate = new Date(f.start);
        if (f.end) data.endDate = new Date(f.end);
        if (f.markEstimate) data.source = 'audit-estimate';
        const before = `start=${role.startDate?.toISOString().slice(0, 10) ?? 'null'} end=${role.endDate?.toISOString().slice(0, 10) ?? 'null'}`;
        const after = `start=${(data.startDate ?? role.startDate)?.toISOString().slice(0, 10) ?? 'null'} end=${(data.endDate ?? role.endDate)?.toISOString().slice(0, 10) ?? 'null'}${f.markEstimate ? ' [audit-estimate]' : ''}`;
        console.log(`  ${f.person} @ ${f.org} (${f.role}): ${before}  ->  ${after}`);
        if (EXECUTE) await prisma.personRole.update({ where: { id: role.id }, data });
    }
    console.log(`  小计: 修复 ${ok} 条 | 定位失败 ${miss} 条`);
}

async function main() {
    console.log(`\n模式: ${mode}${ONLY ? ` | 仅: ${ONLY.join(',')}` : ''}`);
    // 顺序: 合并先于改名
    if (want('orgMerge')) await doOrgMerge();
    if (want('orgRename')) await doOrgRename();
    if (want('relationDelete')) await doRelationDelete();
    if (want('dateFix')) await doDateFix();

    if (warns.length) {
        console.log(`\n⚠️  警告 (${warns.length}):`);
        warns.forEach(w => console.log('   - ' + w));
    }
    console.log(`\n${EXECUTE ? '✅ 已写入数据库' : '🟢 DRY-RUN 完成, 未写库。确认无误后加 --execute 执行。'}`);
    process.exit(0);
}
main().catch(e => { console.error('FATAL:', e.message || e); process.exit(1); });
