
import { prisma } from '../lib/db/prisma';


async function main() {
    console.log('Starting GitHub deduplication...');

    const people = await prisma.people.findMany({
        include: {
            rawPoolItems: {
                where: { sourceType: 'github' }
            }
        }
    });

    let totalDeleted = 0;

    for (const p of people) {
        if (p.rawPoolItems.length === 0) continue;

        const uniqueUrls = new Set();
        const toDeleteIds: string[] = [];

        // Keep the first one encountered, mark others for deletion
        // We can also prefer ones with metadata if we want, but simple URL dedupe is likely enough
        for (const item of p.rawPoolItems) {
            if (uniqueUrls.has(item.url)) {
                toDeleteIds.push(item.id);
            } else {
                uniqueUrls.add(item.url);
            }
        }

        if (toDeleteIds.length > 0) {
            console.log(`User ${p.name}: Found ${toDeleteIds.length} duplicates from ${p.rawPoolItems.length} items.`);
            await prisma.rawPoolItem.deleteMany({
                where: { id: { in: toDeleteIds } }
            });
            totalDeleted += toDeleteIds.length;
        }
    }

    console.log(`\nDeduplication complete. Deleted ${totalDeleted} duplicate items.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
