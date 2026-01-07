
import { prisma } from '../lib/db/prisma';


async function main() {
    // Check duplicates and dates for a few people
    const people = await prisma.people.findMany({
        take: 5,
        include: {
            rawPoolItems: {
                where: { sourceType: 'github' }
            }
        }
    });

    for (const p of people) {
        console.log(`\n--- ${p.name} ---`);
        console.log('Roles: use PersonRole table instead');

        // Check GitHub duplicates
        const urls = p.rawPoolItems.map(i => i.url);
        const uniqueUrls = new Set(urls);
        if (urls.length !== uniqueUrls.size) {
            console.log(`!! Has duplicates: ${urls.length} items, ${uniqueUrls.size} unique.`);
            // List duplicates
            const counts: Record<string, number> = {};
            urls.forEach(u => { counts[u] = (counts[u] || 0) + 1; });
            Object.keys(counts).filter(u => counts[u] > 1).forEach(u => {
                console.log(`   Duplicate: ${u} (x${counts[u]})`);
            });
        } else {
            console.log(`GitHub items: ${urls.length} (No duplicates)`);
        }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
