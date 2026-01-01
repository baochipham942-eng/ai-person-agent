import { prisma } from './lib/db/prisma';
import { searchWikidata, getWikidataEntity } from './lib/datasources/wikidata';

// People without avatars - try alternative search
const MISSING = [
    { zh: '肖恩·莱格', en: 'Shane Legg' },
    { zh: '丹妮拉·阿莫代', en: 'Daniela Amodei' },
    { zh: '诺姆·沙泽尔', en: 'Noam Shazeer' },
    { zh: '米拉·穆拉蒂', en: 'Mira Murati' },
    { zh: '李飞飞', en: 'Fei-Fei Li' }
];

async function main() {
    for (const { zh, en } of MISSING) {
        console.log(`\n=== ${zh} (${en}) ===`);

        // Search by English name
        const results = await searchWikidata(en, 3);
        console.log(`Wikidata search results for "${en}":`);

        for (const r of results) {
            console.log(`  - ${r.id}: ${r.label} - ${r.description}`);
            const entity = await getWikidataEntity(r.id);
            if (entity?.imageUrl) {
                console.log(`    ▶ Has image: ${entity.imageUrl}`);
            } else {
                console.log(`    ✗ No image`);
            }
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
