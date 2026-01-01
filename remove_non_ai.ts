import { prisma } from './lib/db/prisma';

async function main() {
    const namesToRemove = ['张一鸣', '王兴', '雷军', '王慧文'];
    console.log(`=== Removing ${namesToRemove.length} people ===`);

    const result = await prisma.people.deleteMany({
        where: {
            name: { in: namesToRemove }
        }
    });

    console.log(`Deleted ${result.count} people.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
