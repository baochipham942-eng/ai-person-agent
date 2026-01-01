
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findCalculatedNames() {
    const queries = ['Daniel', 'Gross', 'Lukasz', 'Kaiser', 'Wojciech', 'Zaremba'];

    for (const q of queries) {
        console.log(`Searching for ${q}...`);
        const results = await prisma.people.findMany({
            where: {
                name: {
                    contains: q,
                    mode: 'insensitive' // Requires newer Prisma features or PostgreSQL specific, typically default
                }
            },
            select: { id: true, name: true }
        });
        console.log(results);
    }
}

findCalculatedNames()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
