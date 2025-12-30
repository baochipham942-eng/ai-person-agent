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

            // Update officialLinks to ensure GitHub is included
            // Merging new links if not present
            const currentLinks = (person.officialLinks as any[]) || [];
            const newLinks = entity.officialLinks || [];

            // Check if we found new links (especially github)
            let linksUpdated = false;
            const updatedLinks = [...currentLinks];

            for (const link of newLinks) {
                const exists = currentLinks.some((l: any) => l.type === link.type && l.url === link.url);
                if (!exists) {
                    console.log(`  -> Adding link: ${link.type} - ${link.url}`);
                    updatedLinks.push(link);
                    linksUpdated = true;
                }
            }

            // Manual fix for Sam Altman (if missing)
            if (person.qid === 'Q7407093' && !updatedLinks.some((l: any) => l.type === 'github')) {
                console.log(`  -> Manual add GitHub for Sam Altman`);
                updatedLinks.push({
                    type: 'github',
                    url: 'https://github.com/sama',
                    handle: 'sama'
                });
                linksUpdated = true;
            }

            if (linksUpdated) {
                await prisma.people.update({
                    where: { id: person.id },
                    data: { officialLinks: updatedLinks }
                });
            }

        }
    }

    await prisma.$disconnect();
}

updateAliases();
