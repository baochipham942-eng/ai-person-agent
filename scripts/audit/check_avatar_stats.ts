
import { prisma } from '../lib/db/prisma';


async function main() {
    const total = await prisma.people.count({
        where: { status: { not: 'error' } }
    });

    const missingAvatar = await prisma.people.findMany({
        where: {
            OR: [
                { avatarUrl: null },
                { avatarUrl: '' }
            ],
            status: { not: 'error' }
        },
        select: {
            name: true,
            avatarUrl: true
        }
    });

    console.log(`Total people (non-error): ${total}`);
    console.log(`People with missing avatars: ${missingAvatar.length}`);

    if (missingAvatar.length > 0) {
        console.log('\nList of people with missing avatars:');
        missingAvatar.forEach(p => console.log(`- ${p.name}`));
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
