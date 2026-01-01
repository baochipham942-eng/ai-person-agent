import { prisma } from './lib/db/prisma';
import { getWikidataEntity } from './lib/datasources/wikidata';
import { downloadAndStoreAvatar } from './lib/storage/avatarStorage';

// People without avatars
const MISSING_AVATAR_PEOPLE = [
    '肖恩·莱格',      // Shane Legg
    '丹妮拉·阿莫代',  // Daniela Amodei
    '诺姆·沙泽尔',    // Noam Shazeer
    '米拉·穆拉蒂',    // Mira Murati
    '李飞飞',          // Fei-Fei Li
    '伊利亚·苏茨克维' // Ilya Sutskever
];

async function main() {
    for (const name of MISSING_AVATAR_PEOPLE) {
        console.log(`\nProcessing: ${name}`);

        const person = await prisma.people.findFirst({
            where: { name }
        });

        if (!person) {
            console.log(`  Person not found in database`);
            continue;
        }

        console.log(`  Found: ${person.id}, QID: ${person.qid}`);

        // Try to get entity info from Wikidata again
        const entity = await getWikidataEntity(person.qid);

        if (!entity) {
            console.log(`  Could not fetch Wikidata entity`);
            continue;
        }

        console.log(`  Wikidata imageUrl: ${entity.imageUrl || 'NONE'}`);

        if (entity.imageUrl) {
            const localPath = await downloadAndStoreAvatar(entity.imageUrl, person.id);
            if (localPath) {
                await prisma.people.update({
                    where: { id: person.id },
                    data: { avatarUrl: localPath }
                });
                console.log(`  ✓ Updated avatar to: ${localPath}`);
            } else {
                console.log(`  ✗ Failed to download avatar`);
            }
        } else {
            console.log(`  ✗ No image available on Wikidata`);
        }
    }

    console.log('\nDone!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
