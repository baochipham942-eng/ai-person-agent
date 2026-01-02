/**
 * 调查职业经历问题的脚本
 * 1. 只有教育经历没有工作经验的人
 * 2. 使用占位符 QID 的中文人物
 * 3. 组织名称不一致的问题
 */

import { PrismaClient } from '@prisma/client';
import { fetchRawCareerData } from './lib/datasources/career';

const prisma = new PrismaClient();

async function investigate() {
    console.log('🔍 开始调查职业经历问题...\n');
    console.log('='.repeat(60));

    // ============================================
    // 1. 查看只有教育经历没有工作经验的人
    // ============================================
    console.log('\n📚 一、只有教育经历的人物\n');

    const people = await prisma.people.findMany({
        include: {
            roles: {
                include: { organization: true }
            }
        }
    });

    const educationOnlyPeople: any[] = [];

    for (const person of people) {
        const roles = person.roles;
        const educationRoles = roles.filter((r: any) =>
            r.organization.type === 'university' ||
            r.role.toLowerCase().includes('student')
        );
        const workRoles = roles.filter((r: any) =>
            r.organization.type === 'company' &&
            !r.role.toLowerCase().includes('student')
        );

        if (educationRoles.length > 0 && workRoles.length === 0) {
            educationOnlyPeople.push({
                name: person.name,
                qid: person.qid,
                education: educationRoles.map((r: any) => r.organization.name)
            });
        }
    }

    console.log(`发现 ${educationOnlyPeople.length} 位只有教育经历的人物：\n`);

    for (const p of educationOnlyPeople) {
        console.log(`  👤 ${p.name} (QID: ${p.qid})`);
        console.log(`     教育: ${p.education.join(', ')}`);

        // 检查 Wikidata 是否有工作经历
        if (p.qid && !p.qid.includes('BAIKE') && !p.qid.includes('PLACEHOLDER')) {
            try {
                const rawData = await fetchRawCareerData(p.qid);
                const workData = rawData.filter(r => r.type === 'career' || r.type === 'career_position');
                if (workData.length > 0) {
                    console.log(`     ⚠️ Wikidata 有 ${workData.length} 条工作经历未同步！`);
                    for (const w of workData.slice(0, 3)) {
                        console.log(`        - ${w.orgName} (${w.role || 'Employee'})`);
                    }
                } else {
                    console.log(`     ✓ Wikidata 也没有工作经历`);
                }
            } catch (e) {
                console.log(`     ❌ 无法获取 Wikidata 数据`);
            }
            await new Promise(r => setTimeout(r, 300));
        }
    }

    // ============================================
    // 2. 使用占位符 QID 的中文人物
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('\n🔖 二、使用占位符 QID 的人物\n');

    const placeholderPeople = await prisma.people.findMany({
        where: {
            OR: [
                { qid: { startsWith: 'BAIKE_' } },
                { qid: { contains: 'PLACEHOLDER' } },
            ]
        },
        include: { roles: { include: { organization: true } } }
    });

    console.log(`发现 ${placeholderPeople.length} 位使用占位符 QID：\n`);

    for (const p of placeholderPeople) {
        console.log(`  👤 ${p.name} (QID: ${p.qid})`);
        if (p.roles.length > 0) {
            console.log(`     经历: ${p.roles.map((r: any) => r.organization.name).join(', ')}`);
        } else {
            console.log(`     ⚠️ 没有任何经历记录`);
        }
    }

    // ============================================
    // 3. 组织名称不一致分析
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('\n🏢 三、组织名称一致性分析\n');

    // 随机选择几个人对比
    const samplePeople = people
        .filter(p => p.qid.startsWith('Q') && p.roles.length > 0)
        .slice(0, 5);

    for (const person of samplePeople) {
        console.log(`\n👤 ${person.name}:`);

        try {
            const rawData = await fetchRawCareerData(person.qid);

            console.log('  数据库组织名 vs Wikidata组织名:');

            for (const role of person.roles) {
                const org = (role as any).organization;
                const match = rawData.find(r =>
                    r.orgName.toLowerCase() === org.name.toLowerCase() ||
                    r.orgName.toLowerCase().includes(org.name.toLowerCase()) ||
                    org.name.toLowerCase().includes(r.orgName.toLowerCase())
                );

                if (match) {
                    if (match.orgName !== org.name) {
                        console.log(`    ⚠️ "${org.name}" ≠ Wikidata: "${match.orgName}"`);
                    } else {
                        console.log(`    ✓ "${org.name}" 一致`);
                    }
                } else {
                    // 尝试模糊匹配
                    const fuzzyMatch = rawData.find(r => {
                        const words1 = org.name.toLowerCase().split(/\s+/);
                        const words2 = r.orgName.toLowerCase().split(/\s+/);
                        return words1.some((w: string) => w.length > 3 && words2.some((w2: string) => w2.includes(w)));
                    });

                    if (fuzzyMatch) {
                        console.log(`    ⚠️ "${org.name}" ~ Wikidata: "${fuzzyMatch.orgName}" (模糊匹配)`);
                    } else {
                        console.log(`    ❌ "${org.name}" 在 Wikidata 中未找到`);
                    }
                }
            }
        } catch (e) {
            console.log('  ❌ 无法获取 Wikidata 数据');
        }

        await new Promise(r => setTimeout(r, 300));
    }

    // ============================================
    // 总结和建议
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 总结\n');
    console.log(`  • 只有教育经历的人物: ${educationOnlyPeople.length} 位`);
    console.log(`  • 使用占位符 QID 的人物: ${placeholderPeople.length} 位`);
    console.log('\n💡 建议：');
    console.log('  1. 对于占位符 QID 的中文人物，尝试使用百度百科 API 获取数据');
    console.log('  2. 以 Wikidata 组织名为准，更新数据库中的组织名称');
    console.log('  3. 对于只有教育经历的人物，重新同步 Wikidata 的工作经历');

    await prisma.$disconnect();
}

investigate().catch(console.error);
