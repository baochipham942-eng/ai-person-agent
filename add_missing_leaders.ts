
import 'dotenv/config';
import { prisma } from './lib/db/prisma';
import { searchWikidata, getWikidataEntityWithTranslation } from './lib/datasources/wikidata';
import { downloadAndStoreAvatar } from './lib/storage/avatarStorage';

// Use English names for better Wikidata match
const TARGETS = [
    'Kaiming He',      // He Kaiming
    'Shuicheng Yan',   // Yan Shuicheng
    'Jiaya Jia',       // Jia Jiaya
    'Bowen Zhou',      // Zhou Bowen (if needed)
];

// Map back to Chinese for display/alias if needed
const NAME_MAP: Record<string, string> = {
    'Kaiming He': '何恺明',
    'Shuicheng Yan': '颜水成',
    'Jiaya Jia': '贾佳亚',
    'Bowen Zhou': '周伯文',
};

async function main() {
    console.log('Adding missing leaders...');

    for (const name of TARGETS) {
        console.log(`\nProcessing: ${name}`);

        // Check if exists
        const chineseName = NAME_MAP[name];
        const existing = await prisma.people.findFirst({
            where: {
                OR: [
                    { name: { contains: name, mode: 'insensitive' } },
                    { name: { contains: chineseName } },
                    { aliases: { has: chineseName } }
                ]
            }
        });

        if (existing) {
            console.log(`- Already exists: ${existing.name}`);
            continue;
        }

        // Search
        const results = await searchWikidata(name, 1);
        if (results.length === 0) {
            console.log(`- No Wikidata found for ${name}`);
            continue;
        }

        const qid = results[0].id;
        console.log(`- Found QID: ${qid} (${results[0].label})`);

        // Get details
        const entity = await getWikidataEntityWithTranslation(qid);
        if (!entity) continue;

        // Add Chinese alias if missing
        if (!entity.aliases.includes(chineseName)) {
            entity.aliases.push(chineseName);
        }

        // Download avatar
        let avatarUrl = null;
        if (entity.imageUrl) {
            avatarUrl = await downloadAndStoreAvatar(entity.imageUrl, qid);
        }

        // Create
        const p = await prisma.people.create({
            data: {
                qid: entity.qid,
                name: chineseName, // Use Chinese name as primary
                aliases: entity.aliases, // Includes English name
                description: entity.description,
                avatarUrl,
                occupation: entity.occupation || [],
                organization: entity.organization || [],
                officialLinks: entity.officialLinks,
                status: 'pending',
                completeness: 0
            }
        });

        console.log(`+ Created: ${p.name} (${p.id})`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
