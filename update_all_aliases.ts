import { PrismaClient } from '@prisma/client';
import { getWikidataEntity } from './lib/datasources/wikidata';

const prisma = new PrismaClient();

async function updateAliases() {
    const people = await prisma.people.findMany();
    console.log(`Checking ${people.length} people...`);

    for (const person of people) {
        if (!person.qid) continue;

        console.log(`Processing ${person.name} (${person.qid})...`);
        const entity = await getWikidataEntity(person.qid);

        if (entity) {
            const englishLabel = entity.englishLabel || entity.label;
            const currentAliases = person.aliases || [];

            // Check if English label is missing
            if (englishLabel && !currentAliases.includes(englishLabel)) {
                console.log(`  -> Adding alias: ${englishLabel}`);
                const newAliases = [...new Set([...currentAliases, englishLabel])];

                await prisma.people.update({
                    where: { id: person.id },
                    data: { aliases: newAliases }
                });
            } else {
                console.log(`  -> Aliases OK`);
            }
        }
    }

    await prisma.$disconnect();
}

updateAliases();
