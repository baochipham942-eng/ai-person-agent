/**
 * 使用 AI 知识库修复特定人物的职业经历
 */

import { PrismaClient } from '@prisma/client';
import { fetchCareerFromAiKnowledge } from './lib/datasources/ai_knowledge';

const prisma = new PrismaClient();

const TARGET_PEOPLE = [
    'Kevin Weil',
    'Bob McGrew',
    'Joanne Jang',
    'Rob Bensinger',
    'Boris Power',
    'Santiago Valdarrama',
    'Cat Wu',
];

// 附加上下文，帮助 AI 更准确
const CONTEXT_MAP: Record<string, string> = {
    'Kevin Weil': 'OpenAI CPO, ex-Instagram VP Product, ex-Twitter SVP Product, Planet Labs President',
    'Bob McGrew': 'OpenAI Chief Research Officer (CRO), worked on GPT-3, GPT-4',
    'Joanne Jang': 'OpenAI Product Lead for DALL·E, Model Behavior',
    'Rob Bensinger': 'Research Communications Manager at Machine Intelligence Research Institute (MIRI)',
    'Boris Power': 'OpenAI Head of Applied Research',
    'Santiago Valdarrama': 'Machine Learning Educator, Levatas Director of Computer Vision',
    'Cat Wu': 'Anthropic Product Lead for Claude Code (NOT the MIT professor)',
};

async function fixWithAiKnowledge() {
    console.log('🤖 开始使用 AI 知识库修复数据...\n');

    for (const name of TARGET_PEOPLE) {
        const person = await prisma.people.findFirst({ where: { name } });

        if (!person) {
            console.log(`⚠️ 未找到人物: ${name}`);
            continue;
        }

        console.log(`\n👤 处理: ${person.name}`);

        // 检查是否已有丰富数据
        const existingRoles = await prisma.personRole.count({ where: { personId: person.id } });
        if (existingRoles > 5) {
            console.log(`   ⏭️ 已有 ${existingRoles} 条记录，跳过`);
            // Kevin Weil 之前可能已经补了一些，但 AI 可能更全，我们在 AI 数据量大时进行合并
        }

        try {
            const context = CONTEXT_MAP[name];
            const careers = await fetchCareerFromAiKnowledge(name, context);

            if (careers.length === 0) {
                console.log(`   ⚠️ AI 未生成任何数据`);
                continue;
            }

            console.log(`   📥 生成了 ${careers.length} 条经历`);

            let savedCount = 0;
            for (const item of careers) {
                const orgType = item.type === 'education' ? 'university' : 'company';
                const orgId = `ai-gen-${item.orgName.toLowerCase().replace(/\s+/g, '-')}`;

                // Upsert Organization
                const org = await prisma.organization.upsert({
                    where: { wikidataQid: orgId },
                    create: {
                        name: item.orgName,
                        nameZh: item.orgName, // 暂无法自动翻译，保留英文
                        type: orgType,
                        wikidataQid: orgId
                    },
                    update: {},
                });

                const role = item.role || (item.type === 'education' ? 'Student' : 'Employee');

                // Check exist
                const existing = await prisma.personRole.findFirst({
                    where: { personId: person.id, organizationId: org.id }
                });

                if (!existing) {
                    await prisma.personRole.create({
                        data: {
                            personId: person.id,
                            organizationId: org.id,
                            role,
                            roleZh: item.role, // 暂保留英文
                            startDate: item.startDate ? new Date(item.startDate) : null,
                            endDate: item.endDate ? new Date(item.endDate) : null,
                            source: 'ai-knowledge',
                        }
                    });
                    savedCount++;
                    console.log(`   ✚ 新增: ${item.orgName} - ${role}`);
                } else {
                    // Update Date if missing
                    if (!existing.startDate && item.startDate) {
                        await prisma.personRole.update({
                            where: { id: existing.id },
                            data: {
                                startDate: new Date(item.startDate),
                                endDate: item.endDate ? new Date(item.endDate) : null,
                            }
                        });
                        savedCount++;
                        console.log(`   ↻ 更新日期: ${item.orgName}`);
                    }
                }
            }
            console.log(`   ✅ 成功保存/更新 ${savedCount} 条记录`);

        } catch (e) {
            console.error(`   ❌ 失败:`, e);
        }

        // 避免 Rate Limit
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('\n✅ 修复完成');
    await prisma.$disconnect();
}

fixWithAiKnowledge().catch(console.error);
