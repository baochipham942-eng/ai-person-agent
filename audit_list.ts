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

    const targets = [];
    for (const p of people) {
        // Only care if avatar is missing/placeholder
        if (!p.avatarUrl || p.avatarUrl.includes('placeholder')) {
            const links = (p.officialLinks as any[]) || [];
            const xLink = links.find((l: any) => l.type === 'x' || l.type === 'twitter');

            targets.push({
                name: p.name,
                currentHandle: xLink ? xLink.url : null
            });
        }
    }

    console.log(JSON.stringify(targets, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
