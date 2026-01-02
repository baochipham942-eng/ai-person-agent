/**
 * 修复职业经历缺失日期的脚本
 * 问题：很多人物的 PersonRole 记录中 startDate/endDate 为空
 * 原因：数据抓取时没有正确保存日期
 * 解决：重新从 Wikidata 获取数据并更新
 */

import { PrismaClient } from '@prisma/client';
import { fetchRawCareerData } from './lib/datasources/career';

const prisma = new PrismaClient();

async function fixCareerDates() {
    console.log('🔍 查找缺少日期的职业经历...\n');

    // 1. 找到所有 startDate 为空的 PersonRole
    const rolesWithoutDates = await prisma.personRole.findMany({
        where: {
            startDate: null,
        },
        include: {
            person: { select: { id: true, name: true, qid: true } },
            organization: { select: { name: true } },
        },
    });

    console.log(`📊 发现 ${rolesWithoutDates.length} 条缺少日期的记录\n`);

    // 2. 按人物分组
    const personMap = new Map<string, {
        personId: string;
        personName: string;
        qid: string;
        roles: typeof rolesWithoutDates;
    }>();

    for (const role of rolesWithoutDates) {
        const key = role.person.id;
        if (!personMap.has(key)) {
            personMap.set(key, {
                personId: role.person.id,
                personName: role.person.name,
                qid: role.person.qid,
                roles: [],
            });
        }
        personMap.get(key)!.roles.push(role);
    }

    console.log(`👤 涉及 ${personMap.size} 位人物\n`);

    // 3. 逐个人物重新获取数据
    let fixedCount = 0;
    let errorCount = 0;

    for (const [_, person] of personMap) {
        console.log(`\n🔄 处理: ${person.personName} (QID: ${person.qid})`);
        console.log(`   ├─ 缺少日期的记录: ${person.roles.length} 条`);

        try {
            // 从 Wikidata 重新获取
            const rawData = await fetchRawCareerData(person.qid);
            console.log(`   ├─ 从 Wikidata 获取到: ${rawData.length} 条记录`);

            // 匹配并更新
            for (const role of person.roles) {
                const orgName = role.organization.name.toLowerCase();

                // 找到匹配的 Wikidata 记录
                const match = rawData.find(r => {
                    const wikidataOrg = r.orgName.toLowerCase();
                    return orgName.includes(wikidataOrg) || wikidataOrg.includes(orgName);
                });

                if (match && (match.startDate || match.endDate)) {
                    const startDate = match.startDate ? new Date(match.startDate) : null;
                    const endDate = match.endDate ? new Date(match.endDate) : null;

                    await prisma.personRole.update({
                        where: { id: role.id },
                        data: {
                            startDate,
                            endDate,
                        },
                    });

                    console.log(`   ├─ ✅ 更新: ${role.organization.name}`);
                    console.log(`   │     ${match.startDate || '?'} → ${match.endDate || '至今'}`);
                    fixedCount++;
                } else {
                    console.log(`   ├─ ⚠️ 无匹配: ${role.organization.name}`);
                }
            }
        } catch (error) {
            console.error(`   └─ ❌ 错误:`, error);
            errorCount++;
        }

        // 避免请求过快
        await new Promise(r => setTimeout(r, 500));
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ 修复完成！`);
    console.log(`   ├─ 成功更新: ${fixedCount} 条记录`);
    console.log(`   └─ 失败: ${errorCount} 个人物`);

    await prisma.$disconnect();
}

fixCareerDates().catch(console.error);
