
import { prisma } from '../lib/db/prisma';
import { isAboutPerson, PersonContext } from '../lib/utils/identity';


async function main() {
    console.log('Starting X content cleanup...');

    const people = await prisma.people.findMany({
        include: {
            // These are scalar lists, no include needed. But check if we need them?
            // Actually 'organization' and 'occupation' are string[] in schema.
            // Prisma findMany returns scalars by default.
            // So 'include' is only for relations like rawPoolItems.
            // We can just remove the whole include block or only include rawPoolItems if we want to optimize fetch? 
            // Wait, we query rawPoolItems later separately.
            // So we don't need 'include' here at all for scalar fields.
        },
    });

    let totalDeleted = 0;

    for (const p of people) {
        // Fetch X/Grok items
        const xItems = await prisma.rawPoolItem.findMany({
            where: {
                personId: p.id,
                sourceType: { in: ['x', 'grok'] }
            }
        });

        if (xItems.length === 0) continue;

        const context: PersonContext = {
            name: p.name,
            // englishName: p.englishName || undefined, // Not in schema
            aliases: p.aliases || [],
            organizations: p.organization,
            occupations: p.occupation,
        };

        const toDeleteIds: string[] = [];

        for (const item of xItems) {
            // Skip "User on X" summary items
            if (item.title === `${p.name} on X`) continue;

            const textToCheck = `${item.title} ${item.text}`;
            if (!isAboutPerson(textToCheck, context)) {
                console.log(`[${p.name}] Marking irrelevant X item: ${item.title.slice(0, 50)}...`);
                toDeleteIds.push(item.id);
            }
        }

        if (toDeleteIds.length > 0) {
            await prisma.rawPoolItem.deleteMany({
                where: { id: { in: toDeleteIds } }
            });
            console.log(`[${p.name}] Deleted ${toDeleteIds.length} irrelevant X items.`);
            totalDeleted += toDeleteIds.length;
        }
    }

    console.log(`\nX cleanup complete. Deleted ${totalDeleted} items.`);
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
