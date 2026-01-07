import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const people = await prisma.people.findMany({
        select: {
            name: true,
            avatarUrl: true,
            officialLinks: true
        }
    });

    console.log('--- Missing Avatars & X Handles ---');
    for (const p of people) {
        if (!p.avatarUrl || p.avatarUrl.includes('placeholder')) {
            const links = (p.officialLinks as any[]) || [];
            const xLink = links.find((l: any) => l.type === 'x' || l.type === 'twitter');

            console.log(`Name: ${p.name}`);
            console.log(`  Avatar: ${p.avatarUrl}`);
            console.log(`  X Handle: ${xLink ? xLink.url : 'None'}`);
            console.log('---');
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
