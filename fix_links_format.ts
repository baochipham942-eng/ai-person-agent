import { prisma } from './lib/db/prisma';

async function main() {
    console.log('=== Checking and fixing officialLinks format ===\n');

    const people = await prisma.people.findMany({
        where: {
            officialLinks: { not: { equals: null } }
        },
        select: {
            id: true,
            name: true,
            officialLinks: true
        }
    });

    let fixedCount = 0;
    let problemPeople: any[] = [];

    for (const person of people) {
        const links = person.officialLinks as any[];
        if (!links || links.length === 0) continue;

        let needsFix = false;
        const fixedLinks = links.map(link => {
            // Check if link uses platform instead of type
            if (link.platform && !link.type) {
                needsFix = true;
                problemPeople.push({
                    name: person.name,
                    id: person.id,
                    oldLink: { ...link }
                });

                // Convert platform to type
                const { platform, ...rest } = link;
                return {
                    ...rest,
                    type: platform === 'twitter' ? 'twitter' : platform  // Normalize
                };
            }
            return link;
        });

        if (needsFix) {
            console.log(`Fixing ${person.name}:`);
            console.log(`  Before: ${JSON.stringify(links)}`);
            console.log(`  After:  ${JSON.stringify(fixedLinks)}`);

            await prisma.people.update({
                where: { id: person.id },
                data: { officialLinks: fixedLinks }
            });
            fixedCount++;
        }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Fixed ${fixedCount} people with incorrect data format`);
    console.log(`\nAffected people:`);
    for (const p of problemPeople) {
        console.log(`- ${p.name}: ${JSON.stringify(p.oldLink)}`);
    }
}

main().catch(console.error).finally(() => process.exit(0));
