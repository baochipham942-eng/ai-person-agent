
import 'dotenv/config';
import { prisma } from './lib/db/prisma';

async function main() {
    console.log('--- Avatar Audit ---');
    const people = await prisma.people.findMany({
        select: { id: true, name: true, avatarUrl: true }
    });

    const badList: any[] = [];
    const unavatarList: any[] = [];
    const defaultList: any[] = [];

    for (const p of people) {
        if (!p.avatarUrl) {
            badList.push(p);
        } else if (p.avatarUrl.includes('unavatar.io')) {
            unavatarList.push(p);
        } else if (p.avatarUrl.includes('default_')) {
            defaultList.push(p);
        }
    }

    console.log(`\n=== Unavatar (Risk of ASCII Face) [${unavatarList.length}] ===`);
    unavatarList.forEach(p => console.log(`- ${p.name}: ${p.avatarUrl}`));

    console.log(`\n=== Default SVGs (Colored Letters) [${defaultList.length}] ===`);
    defaultList.forEach(p => console.log(`- ${p.name}: ${p.avatarUrl}`));

    console.log(`\n=== Missing Avatars [${badList.length}] ===`);
    badList.forEach(p => console.log(`- ${p.name}`));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
