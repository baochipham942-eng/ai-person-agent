import { prisma } from './lib/db/prisma';
import { downloadAndStoreAvatar } from './lib/storage/avatarStorage';

async function main() {
    const names = ['Greg Brockman', '安德烈·卡帕西'];
    const people = await prisma.people.findMany({
        where: {
            name: {
                in: names
            }
        }
    });

    for (const person of people) {
        if (person.avatarUrl && person.avatarUrl.startsWith('http')) {
            console.log(`Fixing avatar for ${person.name}...`);
            const localPath = await downloadAndStoreAvatar(person.avatarUrl, person.id);

            if (localPath) {
                await prisma.people.update({
                    where: { id: person.id },
                    data: { avatarUrl: localPath }
                });
                console.log(`Updated ${person.name} to use ${localPath}`);
            } else {
                console.error(`Failed to download avatar for ${person.name}`);
            }
        } else {
            console.log(`${person.name} already has local avatar or none: ${person.avatarUrl}`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
