import { prisma } from './lib/db/prisma';

async function check() {
    console.log('Checking Liu Zhiyuan...');
    const person = await prisma.people.findFirst({ where: { name: '刘知远' } });

    if (!person) {
        console.log('Person not found');
        return;
    }

    const items = await prisma.rawPoolItem.findMany({
        where: { personId: person.id },
        take: 10
    });

    console.log(`Found ${items.length} items`);

    items.forEach(i => {
        console.log('---');
        console.log(`Title: ${i.title}`);
        console.log(`Source: ${i.sourceType}`);
        console.log(`Date: ${i.publishedAt}`);
        console.log(`Date Type: ${typeof i.publishedAt}`);
    });
}

check().catch(console.error).finally(() => prisma.$disconnect());
