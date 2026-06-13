/**
 * 导出全库数据供审计 workflow 使用
 * 输出到 docs/audit-2026-06/data/*.json
 * 用法: npx tsx scripts/audit/export_for_audit.ts
 */
import { prisma } from '../../lib/db/prisma';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(process.cwd(), 'docs/audit-2026-06/data');

async function main() {
    fs.mkdirSync(OUT, { recursive: true });

    // 1. 机构
    const orgs = await prisma.organization.findMany({
        select: { id: true, name: true, nameZh: true, type: true, wikidataQid: true, _count: { select: { roles: true } } },
        orderBy: { name: 'asc' },
    });
    const orgsOut = orgs.map(o => ({ id: o.id, name: o.name, nameZh: o.nameZh, type: o.type, qid: o.wikidataQid, roleCount: o._count.roles }));
    fs.writeFileSync(path.join(OUT, 'organizations.json'), JSON.stringify(orgsOut, null, 2));

    // 2. 人物（精简，用于名册/排序审计）
    const people = await prisma.people.findMany({
        select: { id: true, name: true, organization: true, currentTitle: true, influenceScore: true, occupation: true, roleCategory: true, status: true, topics: true },
        orderBy: { influenceScore: 'desc' },
    });
    fs.writeFileSync(path.join(OUT, 'people.json'), JSON.stringify(people, null, 2));

    // 3. 履历（用于日期合理性 + 机构译名审计）
    const roles = await prisma.personRole.findMany({
        select: {
            personId: true, role: true, roleZh: true, startDate: true, endDate: true, source: true, confidence: true,
            person: { select: { name: true } },
            organization: { select: { name: true, nameZh: true } },
        },
    });
    const rolesOut = roles.map(r => ({
        person: r.person.name, role: r.role, roleZh: r.roleZh,
        org: r.organization.name, orgZh: r.organization.nameZh,
        start: r.startDate?.toISOString().slice(0, 10) ?? null,
        end: r.endDate?.toISOString().slice(0, 10) ?? null,
        source: r.source, confidence: r.confidence,
    }));
    fs.writeFileSync(path.join(OUT, 'roles.json'), JSON.stringify(rolesOut, null, 2));

    // 4. 关联人物（用于关系幻觉审计）
    const rels = await prisma.personRelation.findMany({
        select: {
            relationType: true, description: true, source: true, confidence: true,
            person: { select: { name: true } },
            relatedPerson: { select: { name: true } },
        },
    });
    const relsOut = rels.map(r => ({
        person: r.person.name, related: r.relatedPerson.name,
        type: r.relationType, description: r.description, source: r.source, confidence: r.confidence,
    }));
    fs.writeFileSync(path.join(OUT, 'relations.json'), JSON.stringify(relsOut, null, 2));

    console.log(`✅ 导出完成 -> ${OUT}`);
    console.log(`   机构: ${orgsOut.length} | 人物: ${people.length} | 履历: ${rolesOut.length} | 关系: ${relsOut.length}`);
    // 快速统计
    const dupOrgs = orgsOut.filter((o, i, arr) => arr.findIndex(x => x.name === o.name) !== i).length;
    const cjkOrgs = orgsOut.filter(o => /[一-龥]/.test(o.name)).length;
    console.log(`   同名机构(疑似重复): ${dupOrgs} | name 字段含中文的机构: ${cjkOrgs}`);
    process.exit(0);
}

main().catch(e => { console.error('ERR:', e.message); process.exit(1); });
