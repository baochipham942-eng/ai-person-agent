
import { prisma } from '../lib/db/prisma';


async function main() {
    const total = await prisma.people.count({
        where: { status: { not: 'error' } }
    });
    console.log(`Total non-error people: ${total}`);

    const sample = await prisma.people.findFirst({
        where: { name: { contains: 'Sam Altman' } }
    });

    if (sample) {
        console.log('Sample Person (Sam Altman):');
        console.log('Name:', sample.name);
        console.log('Description:', sample.description);
        console.log('WhyImportant:', sample.whyImportant); // Check if this is populated
        console.log('AI Contribution Score:', sample.aiContributionScore);
    } else {
        console.log('Sam Altman not found');
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
