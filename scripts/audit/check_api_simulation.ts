
import { prisma } from '../lib/db/prisma';


async function main() {
    // Mimic the API query exactly
    const people = await prisma.people.findMany({
        where: {
            status: {
                not: 'error',
            },
            name: 'Sam Altman' // Filter for Sam to check him specifically
        },
        orderBy: [
            { aiContributionScore: 'desc' },
            { name: 'asc' },
        ],
        select: {
            id: true,
            name: true,
            avatarUrl: true,
            occupation: true,
            description: true,
            whyImportant: true,
            status: true,
            aiContributionScore: true,
        },
        take: 1,
    });

    console.log('API Query Result for Sam Altman:');
    if (people.length > 0) {
        console.log(JSON.stringify(people[0], null, 2));
    } else {
        console.log('No results found');
    }

    // Also check count logic
    const totalCount = await prisma.people.count({
        where: {
            status: {
                not: 'error',
            },
        },
    });
    console.log('Total count from DB:', totalCount);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
