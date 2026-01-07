import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const people = await prisma.people.findMany({
        select: {
            id: true,
            name: true,
            avatarUrl: true,
        },
    });

    console.log('--- Avatar Audit ---');
    let missingCount = 0;
    for (const person of people) {
        if (!person.avatarUrl || person.avatarUrl.includes('placeholder')) {
            console.log(`[MISSING] ${person.name} (${person.id}): ${person.avatarUrl}`);
            missingCount++;
        }
    }
    console.log(`Total missing/placeholder: ${missingCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
