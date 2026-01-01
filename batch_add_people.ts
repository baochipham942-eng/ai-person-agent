
import { prisma } from './lib/db/prisma';
import { searchWikidata, getWikidataEntityWithTranslation } from './lib/datasources/wikidata';
import { downloadAndStoreAvatar } from './lib/storage/avatarStorage';
import { inngest } from './lib/inngest/client';

const TARGET_COUNT = 50;

// List of high-profile people in Tech, AI, Science, Business
// Mixed English and Chinese to test search robustly, but mostly English for better Wikidata match
const CANDIDATES = [
    // AI
    'Yann LeCun', 'Yoshua Bengio', 'Demis Hassabis', 'Dario Amodei', 'Ilya Sutskever',
    'Fei-Fei Li', 'Andrew Ng', 'Mira Murati', 'Noam Shazeer', 'Daniela Amodei',
    'Mustafa Suleyman', 'Shane Legg',

    // Tech Leaders
    'Bill Gates', 'Steve Jobs', 'Mark Zuckerberg', 'Jeff Bezos', 'Satya Nadella',
    'Tim Cook', 'Larry Page', 'Sergey Brin', 'Sundar Pichai', 'Vitalik Buterin',
    'Satoshi Nakamoto', 'Linus Torvalds', 'Guido van Rossum',

    // Science / Physics
    'Albert Einstein', 'Richard Feynman', 'Marie Curie', 'Stephen Hawking',
    'Nikola Tesla', 'Alan Turing', 'Robert Oppenheimer', 'Carl Sagan',

    // Business / Investors
    'Warren Buffett', 'Charlie Munger', 'Masayoshi Son', 'Peter Thiel',
    'Marc Andreessen', 'Paul Graham', 'Reid Hoffman', 'Naval Ravikant',

    // China Tech
    'Jack Ma', 'Pony Ma', 'Robin Li', 'Ren Zhengfei', 'Zhang Yiming',
    'Lei Jun', 'Wang Xing', 'Colin Huang'
];

function extractWhitelistDomains(links: { type: string; url: string }[]): string[] {
    const domains: string[] = [];
    for (const link of links) {
        try {
            const url = new URL(link.url);
            domains.push(url.hostname);
        } catch { }
    }
    return [...new Set(domains)];
}

async function main() {
    console.log('Starting batch import...');

    // Check current count
    const currentCount = await prisma.people.count();
    console.log(`Current count: ${currentCount}`);

    if (currentCount >= TARGET_COUNT) {
        console.log('Target count already reached.');
        return;
    }

    let addedCount = 0;

    for (const name of CANDIDATES) {
        if (currentCount + addedCount >= TARGET_COUNT) break;

        console.log(`\nProcessing candidate: ${name}`);

        try {
            // 1. Check if exists loosely by name (not perfect but saves API calls)
            const existing = await prisma.people.findFirst({
                where: { OR: [{ name: { mode: 'insensitive', contains: name } }, { aliases: { has: name } }] }
            });

            if (existing) {
                console.log(`- Already exists: ${existing.name}`);
                continue;
            }

            // 2. Search Wikidata
            const searchResults = await searchWikidata(name, 1);
            if (searchResults.length === 0) {
                console.log(`- No Wikidata results found for ${name}`);
                continue;
            }

            const firstResult = searchResults[0];
            const qid = firstResult.id;

            // 3. Check stricter by QID
            const existingQid = await prisma.people.findUnique({ where: { qid } });
            if (existingQid) {
                console.log(`- Already exists (by QID): ${existingQid.name}`);
                continue;
            }

            // 4. Get full entity
            const entity = await getWikidataEntityWithTranslation(qid);
            if (!entity) {
                console.log(`- Failed to get entity details for ${qid}`);
                continue;
            }

            // 5. Download Avatar
            let localAvatarUrl: string | null = null;
            if (entity.imageUrl) {
                // Use temporary ID (qid) for filename since we don't have DB ID yet
                // But wait, the previous code used `qid` then updated.
                // Actually `downloadAndStoreAvatar` uses the 2nd arg to generate hash.
                // We can use QID for now or generated CUID. 
                // Let's create person first then update avatar? 
                // Or just use QID for hash is stable.
                localAvatarUrl = await downloadAndStoreAvatar(entity.imageUrl, qid);
            }

            // 6. Create Person
            const newPerson = await prisma.people.create({
                data: {
                    qid: entity.qid,
                    name: entity.label,
                    aliases: entity.aliases,
                    description: entity.description,
                    avatarUrl: localAvatarUrl,
                    occupation: entity.occupation || [],
                    organization: entity.organization || [],
                    officialLinks: entity.officialLinks,
                    sourceWhitelist: extractWhitelistDomains(entity.officialLinks),
                    status: 'pending',
                    completeness: 0,
                }
            });

            console.log(`+ Created: ${newPerson.name} (${newPerson.id})`);
            addedCount++;

            // 7. Trigger Inngest (Optional: might want to skip to avoid rate limits or do it slowly)
            // For now, let's trigger it but log errors if any
            try {
                await inngest.send({
                    name: 'person/created',
                    data: {
                        personId: newPerson.id,
                        personName: newPerson.name,
                        englishName: entity.englishLabel,
                        qid: newPerson.qid,
                        orcid: entity.orcid,
                        officialLinks: entity.officialLinks,
                        aliases: newPerson.aliases,
                    },
                });
                console.log(`  > Triggered enrichment job`);
            } catch (ignore) {
                console.log(`  > Failed to trigger job: ${ignore}`);
            }

            // Sleep to be nice to APIs
            await new Promise(r => setTimeout(r, 1000));

        } catch (error) {
            console.error(`Error processing ${name}:`, error);
        }
    }

    console.log(`\nBatch import finished. Added ${addedCount} people.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
