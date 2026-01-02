import { prisma } from './lib/db/prisma';

async function main() {
    const ids = ['cmjvd3d5v0001kvtpdo7mjnhw', 'cmjvfbygb0003lqwq52xfghrn', 'cmjtxecfs000h5p088f0rb7vd'];

    console.log('=== Checking error people ===\n');

    for (const id of ids) {
        console.log(`\n--- ID: ${id} ---`);
        try {
            const person = await prisma.people.findUnique({
                where: { id },
                include: {
                    cards: { take: 1 },
                    roles: { take: 1, include: { organization: true } },
                    _count: { select: { rawPoolItems: true } }
                }
            });

            if (!person) {
                console.log('NOT FOUND in database!');
            } else {
                console.log(`Name: ${person.name}`);
                console.log(`Avatar: ${person.avatarUrl?.substring(0, 80) || 'null'}`);
                console.log(`Description: ${person.description?.substring(0, 100) || 'null'}`);
                console.log(`officialLinks: ${JSON.stringify(person.officialLinks)}`);
                console.log(`Cards count: ${person.cards.length}`);
                console.log(`Roles count: ${person.roles.length}`);
                console.log(`RawPoolItems count: ${person._count.rawPoolItems}`);
                if (person.roles.length > 0) {
                    console.log(`First role org: ${JSON.stringify(person.roles[0].organization)}`);
                }
            }
        } catch (err) {
            console.error(`Error fetching ${id}:`, err);
        }
    }
}

main().catch(console.error).finally(() => process.exit(0));
