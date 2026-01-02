/**
 * 修复只有教育经历的人物，重新同步 Wikidata 的工作经历
 */

import { PrismaClient } from '@prisma/client';
import { fetchRawCareerData } from './lib/datasources/career';
import { translateBatch } from './lib/ai/translator';

const prisma = new PrismaClient();

async function syncMissingWorkExperience() {
    console.log('🔄 开始同步缺失的工作经历...\n');

    // 1. 找到只有教育经历的人物
    const people = await prisma.people.findMany({
        include: {
            roles: {
                include: { organization: true }
            }
        }
    });

    const educationOnlyPeople = people.filter(person => {
        const roles = person.roles;
        const educationRoles = roles.filter((r: any) =>
            r.organization.type === 'university' ||
            r.role.toLowerCase().includes('student')
        );
        const workRoles = roles.filter((r: any) =>
            r.organization.type === 'company' &&
            !r.role.toLowerCase().includes('student')
        );
        return educationRoles.length > 0 && workRoles.length === 0;
    });

    console.log(`📊 发现 ${educationOnlyPeople.length} 位只有教育经历的人物\n`);

    let syncedCount = 0;
    let failedCount = 0;

    for (const person of educationOnlyPeople) {
        // 跳过占位符 QID
        if (person.qid.includes('BAIKE') || person.qid.includes('PLACEHOLDER')) {
            console.log(`⏭️ 跳过 ${person.name} (占位符 QID)`);
            continue;
        }

        console.log(`\n👤 ${person.name} (QID: ${person.qid})`);

        try {
            // 从 Wikidata 获取数据
            const rawData = await fetchRawCareerData(person.qid);
            const workData = rawData.filter(r => r.type === 'career' || r.type === 'career_position');

            if (workData.length === 0) {
                console.log(`   ✓ Wikidata 也没有工作经历`);
                continue;
            }

            console.log(`   📥 发现 ${workData.length} 条工作经历待同步`);

            // 批量翻译组织名和职位
            const textsToTranslate: string[] = [];
            workData.forEach(item => {
                textsToTranslate.push(item.orgName);
                if (item.role) textsToTranslate.push(item.role);
            });

            const translations = await translateBatch(textsToTranslate);

            // 重建翻译映射
            const translateMap = new Map<string, string>();
            let idx = 0;
            workData.forEach(item => {
                translateMap.set(item.orgName, translations[idx++] || item.orgName);
                if (item.role) {
                    translateMap.set(item.role, translations[idx++] || item.role);
                }
            });

            // 保存到数据库
            for (const item of workData) {
                // 创建或更新 Organization (type = company)
                const org = await prisma.organization.upsert({
                    where: { wikidataQid: item.orgQid || `no-qid-${item.orgName}` },
                    create: {
                        name: item.orgName,
                        nameZh: translateMap.get(item.orgName),
                        type: 'company',  // 工作经历 = company
                        wikidataQid: item.orgQid,
                    },
                    update: {
                        nameZh: translateMap.get(item.orgName),
                        // 确保类型正确
                        type: 'company',
                    },
                });

                // 处理日期
                const startDate = item.startDate ? new Date(item.startDate) : null;
                const endDate = item.endDate ? new Date(item.endDate) : null;
                const role = item.role || 'Employee';
                const roleZh = translateMap.get(item.role || '') || '员工';

                // 检查是否已存在
                const existing = await prisma.personRole.findFirst({
                    where: {
                        personId: person.id,
                        organizationId: org.id,
                        role,
                    },
                });

                if (existing) {
                    // 更新
                    await prisma.personRole.update({
                        where: { id: existing.id },
                        data: { roleZh, startDate, endDate },
                    });
                    console.log(`   ↻ 更新: ${item.orgName} - ${role}`);
                } else {
                    // 创建
                    await prisma.personRole.create({
                        data: {
                            personId: person.id,
                            organizationId: org.id,
                            role,
                            roleZh,
                            startDate,
                            endDate,
                            source: 'wikidata',
                        },
                    });
                    console.log(`   ✚ 新增: ${item.orgName} - ${role}`);
                }
                syncedCount++;
            }
        } catch (error) {
            console.error(`   ❌ 错误:`, error);
            failedCount++;
        }

        await new Promise(r => setTimeout(r, 500));
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ 同步完成！`);
    console.log(`   ├─ 成功同步: ${syncedCount} 条工作经历`);
    console.log(`   └─ 失败: ${failedCount} 个人物`);

    await prisma.$disconnect();
}

syncMissingWorkExperience().catch(console.error);
