
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Verifying ranking...');
    // Use raw SQL to bypass "cached plan" error
    const people = await prisma.$queryRaw<any[]>`
        SELECT name, "aiContributionScore" 
        FROM "People" 
        WHERE status != 'error' 
        ORDER BY "aiContributionScore" DESC, name ASC 
        LIMIT 20
    `;

    console.log('Top 20 People by AI Contribution Score:');
    people.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name}: ${p.aiContributionScore}`);
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
