
import { prisma } from '../lib/db/prisma';


async function main() {
    // Fix Melvin Chen -> Chen Mian
    const melvin = await prisma.people.findFirst({
        where: {
            OR: [
                { name: 'Melvin Chen' },
                { name: '陈冕' } // In case already renamed
            ]
        }
    });

    if (melvin) {
        console.log(`Updating Melvin Chen (ID: ${melvin.id})...`);
        // Ensure "Melvin Chen" is in aliases if not already
        const aliases = melvin.aliases || [];
        if (!aliases.includes('Melvin Chen')) {
            aliases.push('Melvin Chen');
        }

        await prisma.people.update({
            where: { id: melvin.id },
            data: {
                name: '陈冕',
                aliases: aliases,
                // Since we couldn't find a direct public avatar URL, we will leave it blank for now 
                // or user can upload one. But for now, we ensure the name is correct.
                // If I had a URL I would set it here: avatarUrl: '...'
            }
        });
        console.log('Updated Melvin Chen to 陈冕');
    } else {
        console.log('Melvin Chen not found');
    }

    // Fix Aidan Gomez Avatar
    const aidan = await prisma.people.findFirst({
        where: { name: { contains: 'Aidan Gomez' } }
    });

    if (aidan) {
        console.log(`Updating Aidan Gomez (ID: ${aidan.id})...`);
        await prisma.people.update({
            where: { id: aidan.id },
            data: {
                avatarUrl: 'https://github.com/aidangomez.png'
            }
        });
        console.log('Updated Aidan Gomez avatar');
    } else {
        console.log('Aidan Gomez not found');
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
