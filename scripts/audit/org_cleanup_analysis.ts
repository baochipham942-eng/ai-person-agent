/**
 * Organization 梳理分析（只读 dry-run，不写库）
 *
 * 产出三类问题清单，供人工确认后再执行合并/重分类：
 *   1. type 错标：标成 company 但名字像大学/学院/研究机构
 *   2. 重复簇：同一实体被拆成多条（Google 系 / Meta 系 / Microsoft 系等）
 *   3. 噪声：零人物关联且无 wikidataQid（多为履历串抽出的脏数据）
 *
 * 用法：npx tsx scripts/audit/org_cleanup_analysis.ts
 */

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });
loadEnv({ path: '.env.local' });

import { prisma } from '../../lib/db/prisma';

// 学术机构名特征（type 重分类用）
const ACADEMIC_RE = /\b(university|universit[eé]|institute of technology|college|polytechnic|école|ecole)\b|大学|学院|研究院|École/i;

// 重复簇候选：canonical -> 该并入它的别名片段（小写、归一后匹配 name）
// 只列「确属同一母体的部门/旧名」；独立品牌(如 DeepMind)单列由人决定是否并
const MERGE_CLUSTERS: Record<string, string[]> = {
    Google: ['google brain', 'google research', 'google x', 'google ai', 'google llc'],
    Meta: ['facebook', 'facebook ai research', 'fair', 'meta ai', 'meta platforms'],
    Microsoft: ['microsoft research', 'microsoft corporation'],
    OpenAI: ['openai llc', 'openai inc'],
};
// 独立品牌：疑似关联但不自动并，单独列出由人定
const REVIEW_BRANDS = ['google deepmind', 'deepmind'];

function norm(s: string): string {
    return (s || '').toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
}

async function main() {
    const orgs = await prisma.organization.findMany({
        select: { id: true, name: true, nameZh: true, type: true, wikidataQid: true },
    });
    const roles = await prisma.personRole.findMany({ select: { organizationId: true, personId: true } });
    const peopleByOrg = new Map<string, Set<string>>();
    for (const r of roles) {
        if (!r.organizationId) continue;
        if (!peopleByOrg.has(r.organizationId)) peopleByOrg.set(r.organizationId, new Set());
        peopleByOrg.get(r.organizationId)!.add(r.personId);
    }
    const csRows = await prisma.companySource.findMany({ select: { organizationId: true } }).catch(() => []);
    const csByOrg = new Map<string, number>();
    for (const c of csRows) csByOrg.set(c.organizationId, (csByOrg.get(c.organizationId) ?? 0) + 1);

    const peopleOf = (id: string) => peopleByOrg.get(id)?.size ?? 0;

    console.log(`=== Organization 梳理分析（只读）===`);
    console.log(`总数 ${orgs.length}\n`);

    // 1. type 错标
    const misTyped = orgs.filter(o => o.type === 'company' && ACADEMIC_RE.test(o.name || ''));
    console.log(`【1. type 错标】标成 company 但名字像学术机构：${misTyped.length} 家`);
    for (const o of misTyped.sort((a, b) => peopleOf(b.id) - peopleOf(a.id)).slice(0, 20)) {
        console.log(`   ${String(peopleOf(o.id)).padStart(3)}人  ${o.name}  → 建议 university`);
    }

    // 2. 重复簇
    console.log(`\n【2. 重复簇】可合并的同体多条记录：`);
    for (const [canonical, fragments] of Object.entries(MERGE_CLUSTERS)) {
        const members = orgs.filter(o => {
            const n = norm(o.name);
            return n === norm(canonical) || fragments.some(f => n === f || n.startsWith(f));
        });
        if (members.length <= 1) continue;
        const canon = members.find(m => norm(m.name) === norm(canonical)) ?? members[0];
        console.log(`   ${canonical}（保留 ${canon.name}，并入 ${members.length - 1} 条）:`);
        for (const m of members) {
            const isCanon = m.id === canon.id;
            console.log(`      ${isCanon ? '✓保留' : ' 并入'}  ${String(peopleOf(m.id)).padStart(3)}人 ${csByOrg.get(m.id) ?? 0}源  ${m.name}`);
        }
    }
    console.log(`   【待你定的独立品牌】（疑似关联但不自动并）：`);
    for (const b of REVIEW_BRANDS) {
        const m = orgs.find(o => norm(o.name) === b);
        if (m) console.log(`      ? ${String(peopleOf(m.id)).padStart(3)}人  ${m.name}（并入 Google？还是独立保留？）`);
    }

    // 3. 噪声
    const noise = orgs.filter(o => peopleOf(o.id) === 0 && !o.wikidataQid && (csByOrg.get(o.id) ?? 0) === 0);
    console.log(`\n【3. 噪声】零人物关联 + 无 QID + 无公司源：${noise.length} 家（建议归档/删除）`);
    console.log(`   样本：${noise.slice(0, 15).map(o => o.name).join(' | ')}`);

    // 汇总
    const academic = orgs.filter(o => o.type === 'university' || o.type === 'school').length + misTyped.length;
    console.log(`\n=== 汇总 ===`);
    console.log(`总 ${orgs.length} → 学术机构约 ${academic}、噪声 ${noise.length}、重复簇待并若干`);
    console.log(`清理后「真公司」估算 ≈ ${orgs.length - academic - noise.length} 家上下（再减去合并）`);
    console.log(`\n（只读，未写库。确认方案后我再写执行脚本）`);

    await prisma.$disconnect();
    process.exit(0);
}

main().catch(async e => { console.error('失败:', e); await prisma.$disconnect(); process.exit(1); });
