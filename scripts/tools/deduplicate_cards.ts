
import { prisma } from '../lib/db/prisma';
import crypto from 'crypto';


async function main() {
    console.log('Starting Learning Card deduplication...');

    const people = await prisma.people.findMany();
    let totalDeleted = 0;

    for (const p of people) {
        const cards = await prisma.card.findMany({
            where: { personId: p.id },
            orderBy: { createdAt: 'desc' } // Keep newest? Or oldest? Maybe newest is better.
        });

        if (cards.length <= 1) continue;

        const uniqueContent = new Set<string>();
        const toDeleteIds: string[] = [];

        for (const card of cards) {
            // Dedupe based on Title + Description content
            // Note: Card model has 'content' not 'description'
            const content = `${card.title}|${card.content}`.toLowerCase().trim();
            const hash = crypto.createHash('md5').update(content).digest('hex');

            if (uniqueContent.has(hash)) {
                toDeleteIds.push(card.id);
            } else {
                uniqueContent.add(hash);
            }
        }

        if (toDeleteIds.length > 0) {
            await prisma.card.deleteMany({
                where: { id: { in: toDeleteIds } }
            });
            console.log(`[${p.name}] Deleted ${toDeleteIds.length} duplicate cards.`);
            totalDeleted += toDeleteIds.length;
        }
    }

    console.log(`\nCard deduplication complete. Deleted ${totalDeleted} items.`);
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
