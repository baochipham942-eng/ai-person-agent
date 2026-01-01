import { prisma } from './lib/db/prisma';

async function main() {
    const people = await prisma.people.findMany({
        where: {
            status: { not: 'error' }
        },
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: {
            name: true,
            avatarUrl: true
        }
    });
    console.log(JSON.stringify(people, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
