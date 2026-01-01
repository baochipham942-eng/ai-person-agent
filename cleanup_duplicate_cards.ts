/**
 * 清理重复的学习卡片
 * 保留每组重复卡片中最早创建的那张
 */
import { prisma } from './lib/db/prisma';

async function cleanupDuplicateCards() {
    console.log('=== 开始清理重复卡片 ===\n');

    // 获取所有人物
    const people = await prisma.people.findMany({
        select: { id: true, name: true }
    });

    let totalDeleted = 0;

    for (const person of people) {
        const cards = await prisma.card.findMany({
            where: { personId: person.id },
            orderBy: { createdAt: 'asc' } // 最早的排前面
        });

        if (cards.length === 0) continue;

        // 按 title + content前50字 去重
        const seen = new Map<string, string>(); // key -> cardId (first seen)
        const toDelete: string[] = [];

        for (const card of cards) {
            const key = `${card.type}|${card.title}|${card.content?.slice(0, 50) || ''}`;

            if (seen.has(key)) {
                // 这是重复的，标记删除
                toDelete.push(card.id);
            } else {
                seen.set(key, card.id);
            }
        }

        if (toDelete.length > 0) {
            await prisma.card.deleteMany({
                where: { id: { in: toDelete } }
            });
            console.log(`${person.name}: 删除 ${toDelete.length} 张重复卡片`);
            totalDeleted += toDelete.length;
        }
    }

    console.log(`\n=== 完成：共删除 ${totalDeleted} 张重复卡片 ===`);
}

cleanupDuplicateCards()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
