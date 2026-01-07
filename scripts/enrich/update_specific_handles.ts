
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const UPDATES = [
    { name: 'Joanne Jang', handle: '@joannejang' },
    { name: 'Aakash Gupta', handle: '@aakashg0' },
    { name: 'Daniel Gross', handle: '@danielgross' },
    { name: 'Lukasz Kaiser', handle: '@lukaszkaiser' },
    { name: 'Wojciech Zaremba', handle: '@woj_zaremba' },
];

async function updateHandles() {
    for (const update of UPDATES) {
        const person = await prisma.people.findFirst({
            where: { name: update.name },
        });

        if (!person) {
            console.log(`Person not found: ${update.name}`);
            continue;
        }

        console.log(`Updating ${update.name}...`);

        // Get existing links or initialize
        let links = (person.officialLinks as any[]) || [];

        // Remove old twitter/x links to avoid duplicates
        links = links.filter(link => {
            if (typeof link === 'string') return !link.includes('twitter.com') && !link.includes('x.com');
            if (typeof link === 'object' && link.url) return !link.url.includes('twitter.com') && !link.url.includes('x.com');
            return true;
        });

        // Add new handle
        const newLink = {
            title: 'X (Twitter)',
            url: `https://x.com/${update.handle.replace('@', '')}`,
            platform: 'twitter'
        };

        console.log(`  Setting handle to ${update.handle}`);

        links.push(newLink);

        await prisma.people.update({
            where: { id: person.id },
            data: {
                officialLinks: links,
            },
        });

        console.log(`  Updated.`);
    }
}

updateHandles()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
