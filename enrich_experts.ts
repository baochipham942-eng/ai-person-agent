import { PrismaClient } from '@prisma/client';
import { getWikidataEntityWithTranslation } from './lib/datasources/wikidata';
import { inngest } from './lib/inngest/client';

const prisma = new PrismaClient();

const EXPERTS = [
    { name: 'Andrej Karpathy', qid: 'Q28532454' },
    { name: 'Greg Brockman', qid: 'Q100604534' }
];

async function enrichExperts() {
    console.log(`Starting enrichment for ${EXPERTS.length} experts...`);

    for (const expert of EXPERTS) {
        console.log(`\nProcessing ${expert.name} (${expert.qid})...`);

        // 1. Fetch and translate data from Wikidata
        const entity = await getWikidataEntityWithTranslation(expert.qid);
        if (!entity) {
            console.error(`Failed to fetch Wikidata entity for ${expert.qid}`);
            continue;
        }

        // 2. Upsert into database
        const person = await prisma.people.upsert({
            where: { qid: expert.qid },
            update: {
                name: entity.label,
                description: entity.description,
                avatarUrl: entity.imageUrl || null,
                occupation: entity.occupation || [],
                organization: entity.organization || [],
                aliases: entity.aliases || [],
                officialLinks: entity.officialLinks || [],
                status: 'pending' // Reset status to trigger enrichment
            },
            create: {
                qid: expert.qid,
                name: entity.label,
                description: entity.description,
                avatarUrl: entity.imageUrl || null,
                occupation: entity.occupation || [],
                organization: entity.organization || [],
                aliases: entity.aliases || [],
                officialLinks: entity.officialLinks || [],
                status: 'pending'
            }
        });

        console.log(`  -> Saved to DB: ${person.name} (${person.id})`);

        // 3. Trigger Inngest background job (Optional, failing locally won't stop DB update)
        try {
            await inngest.send({
                name: 'person/created',
                data: {
                    personId: person.id,
                    personName: person.name,
                    englishName: entity.englishLabel,
                    qid: person.qid,
                    orcid: entity.orcid,  // 用于 OpenAlex 精准匹配
                    officialLinks: person.officialLinks as any,
                    aliases: person.aliases
                }
            });
            console.log(`  -> Inngest event sent for ${person.name}`);
        } catch (e) {
            console.warn(`  -> Inngest send failed (expected locally), proceeding...`);
        }
    }

    console.log('\nEnrichment trigger complete.');
    await prisma.$disconnect();
}

enrichExperts().catch(err => {
    console.error('Enrichment failed:', err);
    process.exit(1);
});
