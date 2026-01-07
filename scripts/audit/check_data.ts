
import 'dotenv/config';
import { prisma } from '../lib/db/prisma';


async function main() {
    const people = await prisma.people.findMany({
        take: 5,
        orderBy: { aiContributionScore: 'desc' },
        select: {
            name: true,
            whyImportant: true,
            description: true,
            aiContributionScore: true,
        },
    });

    console.log('Top 5 people by AI Score:');
    people.forEach(p => {
        console.log(`Name: ${p.name}`);
        console.log(`Score: ${p.aiContributionScore}`);
        console.log(`WhyImportant: ${p.whyImportant}`);
        console.log(`Description: ${p.description?.substring(0, 20)}...`);
        console.log('---');
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
