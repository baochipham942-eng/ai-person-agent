/**
 * 质量评分相关的 Inngest 任务
 */

import { inngest } from './client';
import { prisma } from '@/lib/db/prisma';
import { calculateQualityScore } from '@/lib/utils/qualityScore';

/**
 * 定期质量检查任务 - 每周一执行
 */
export const weeklyQualityCheck = inngest.createFunction(
    {
        id: 'quality-weekly-check',
        retries: 1,
    },
    { cron: '0 3 * * 1' }, // 每周一凌晨 3 点
    async ({ step }) => {
        console.log('[Quality] Starting weekly quality check...');

        // 获取所有人物并计算分数
        const people = await step.run('fetch-all-people', async () => {
            return await prisma.people.findMany({
                include: {
                    rawPoolItems: { select: { sourceType: true } },
                    cards: { select: { id: true } }
                }
            });
        });

        // 计算每个人的分数
        const scores = await step.run('calculate-scores', async () => {
            return people.map(person => ({
                id: person.id,
                name: person.name,
                score: calculateQualityScore({
                    avatarUrl: person.avatarUrl,
                    description: person.description,
                    occupation: person.occupation,
                    organization: person.organization,
                    officialLinks: person.officialLinks as any[],
                    rawPoolItems: person.rawPoolItems,
                    cards: person.cards,
                    updatedAt: person.updatedAt
                })
            }));
        });

        // 找出低分人物（< 50 分）触发自动补全
        const lowScorePeople = scores.filter(s => s.score.total < 50);

        console.log(`[Quality] Found ${lowScorePeople.length} people with low scores`);

        // 为低分人物触发数据重建
        for (const person of lowScorePeople.slice(0, 10)) { // 每次最多处理 10 人
            await step.run(`trigger-rebuild-${person.id}`, async () => {
                await inngest.send({
                    name: 'person/created',
                    data: {
                        personId: person.id,
                        personName: person.name,
                        qid: '',
                        officialLinks: [],
                        forceRefresh: true
                    }
                });
                console.log(`[Quality] Triggered rebuild for ${person.name} (${person.score.total}分)`);
            });
        }

        return {
            totalPeople: people.length,
            averageScore: Math.round(scores.reduce((sum, s) => sum + s.score.total, 0) / scores.length),
            lowScoreCount: lowScorePeople.length,
            triggeredRebuilds: Math.min(lowScorePeople.length, 10)
        };
    }
);

/**
 * 手动触发质量检查
 */
export const manualQualityCheck = inngest.createFunction(
    {
        id: 'quality-manual-check',
        retries: 1,
    },
    { event: 'quality/check' },
    async ({ event, step }) => {
        const { personId } = event.data || {};

        if (personId) {
            // 检查单个人物
            const person = await step.run('fetch-person', async () => {
                return await prisma.people.findUnique({
                    where: { id: personId },
                    include: {
                        rawPoolItems: { select: { sourceType: true } },
                        cards: { select: { id: true } }
                    }
                });
            });

            if (!person) return { error: 'Person not found' };

            const score = calculateQualityScore({
                avatarUrl: person.avatarUrl,
                description: person.description,
                occupation: person.occupation,
                organization: person.organization,
                officialLinks: person.officialLinks as any[],
                rawPoolItems: person.rawPoolItems,
                cards: person.cards,
                updatedAt: person.updatedAt
            });

            return { personId, name: person.name, score };
        }

        return { error: 'personId required' };
    }
);
