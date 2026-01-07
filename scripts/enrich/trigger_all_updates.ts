
import { prisma } from './lib/db/prisma';
import { inngest } from './lib/inngest/client';

async function main() {
    const people = await prisma.people.findMany();
    console.log(`Found ${people.length} people. Triggering updates...`);

    for (const p of people) {
        console.log(`Triggering for ${p.name}...`);
        await inngest.send({
            name: 'person/created',
            data: {
                personId: p.id,
                personName: p.name,
                englishName: null, // Let job infer
                qid: p.qid || '',
                aliases: p.aliases,
                organization: p.organization,
                officialLinks: p.officialLinks || [],
                orcid: null,
            }
        });
    }
    console.log('Done.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
