/**
 * 为使用占位符 QID 的中文人物补充百度百科数据
 */

import { PrismaClient } from '@prisma/client';
import { fetchBaikeCareerData, getBaikePersonInfoByApi } from './lib/datasources/baike';

const prisma = new PrismaClient();

async function enrichChinesePeople() {
    console.log('🇨🇳 开始从百度百科补充中文人物数据...\n');

    // 找到所有使用占位符 QID 的人物
    const placeholderPeople = await prisma.people.findMany({
        where: {
            OR: [
                { qid: { startsWith: 'BAIKE_' } },
                { qid: { contains: 'PLACEHOLDER' } },
            ]
        },
        include: {
            roles: { include: { organization: true } }
        }
    });

    console.log(`📊 发现 ${placeholderPeople.length} 位使用占位符 QID 的人物\n`);

    let enrichedCount = 0;
    let failedCount = 0;

    for (const person of placeholderPeople) {
        console.log(`\n👤 ${person.name}`);

        try {
            // 1. 获取百度百科信息
            const baikeInfo = await getBaikePersonInfoByApi(person.name);

            if (!baikeInfo) {
                console.log(`   ⚠️ 百度百科未找到`);
                failedCount++;
                continue;
            }

            console.log(`   📖 ${baikeInfo.desc}`);

            // 2. 提取职业经历
            const careers = await fetchBaikeCareerData(person.name);

            if (careers.length === 0) {
                console.log(`   ⚠️ 无法提取职业经历`);
                continue;
            }

            console.log(`   📥 提取到 ${careers.length} 条经历`);

            // 3. 保存到数据库
            for (const career of careers) {
                const orgType = career.type === 'education' ? 'university' : 'company';

                // 创建或获取组织
                const orgId = `baike-${career.orgName}`;
                const org = await prisma.organization.upsert({
                    where: { wikidataQid: orgId },
                    create: {
                        name: career.orgName,
                        nameZh: career.orgName,
                        type: orgType,
                        wikidataQid: orgId,
                    },
                    update: {},
                });

                // 处理日期
                let startDate: Date | null = null;
                let endDate: Date | null = null;

                if (career.startDate) {
                    try {
                        startDate = new Date(career.startDate);
                        if (isNaN(startDate.getTime())) startDate = null;
                    } catch { }
                }

                if (career.endDate) {
                    try {
                        endDate = new Date(career.endDate);
                        if (isNaN(endDate.getTime())) endDate = null;
                    } catch { }
                }

                const role = career.role || (career.type === 'education' ? '学生' : '员工');

                // 检查是否已存在
                const existing = await prisma.personRole.findFirst({
                    where: {
                        personId: person.id,
                        organizationId: org.id,
                    },
                });

                if (!existing) {
                    await prisma.personRole.create({
                        data: {
                            personId: person.id,
                            organizationId: org.id,
                            role,
                            roleZh: role,
                            startDate,
                            endDate,
                            source: 'baike',
                        },
                    });
                    console.log(`   ✚ 新增: ${career.orgName} - ${role}`);
                    enrichedCount++;
                } else {
                    // 更新日期（如果原来为空）
                    if (!existing.startDate && startDate) {
                        await prisma.personRole.update({
                            where: { id: existing.id },
                            data: { startDate, endDate },
                        });
                        console.log(`   ↻ 更新日期: ${career.orgName}`);
                        enrichedCount++;
                    } else {
                        console.log(`   ✓ 已存在: ${career.orgName}`);
                    }
                }
            }
        } catch (error) {
            console.error(`   ❌ 错误:`, error);
            failedCount++;
        }

        // 避免请求过快
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ 补充完成！`);
    console.log(`   ├─ 成功补充: ${enrichedCount} 条经历`);
    console.log(`   └─ 失败: ${failedCount} 个人物`);

    await prisma.$disconnect();
}

enrichChinesePeople().catch(console.error);
