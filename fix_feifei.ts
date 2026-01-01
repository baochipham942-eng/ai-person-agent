import { prisma } from './lib/db/prisma';
import { getWikidataEntity } from './lib/datasources/wikidata';
import { downloadAndStoreAvatar } from './lib/storage/avatarStorage';

async function main() {
    // 李飞飞 has wrong QID, let's fix it
    const feifei = await prisma.people.findFirst({
        where: { name: '李飞飞' }
    });

    if (!feifei) {
        console.log('李飞飞 not found');
        return;
    }

    console.log('Current 李飞飞:', feifei.id, 'QID:', feifei.qid);

    // Get correct entity (American computer scientist)
    const correctQID = 'Q18686107';
    const entity = await getWikidataEntity(correctQID);

    if (!entity) {
        console.log('Could not fetch entity');
        return;
    }

    console.log('Correct entity:', entity.label, 'Image:', entity.imageUrl);

    if (entity.imageUrl) {
        const localPath = await downloadAndStoreAvatar(entity.imageUrl, feifei.id);
        if (localPath) {
            await prisma.people.update({
                where: { id: feifei.id },
                data: {
                    qid: correctQID,
                    avatarUrl: localPath
                }
            });
            console.log('✓ Updated 李飞飞 with correct QID and avatar:', localPath);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
