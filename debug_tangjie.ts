import { prisma } from './lib/db/prisma';

async function check() {
    const person = await prisma.people.findFirst({ where: { name: '唐杰' } });
    if (!person) {
        console.log('Person "唐杰" not found');
        return;
    }

    const items = await prisma.rawPoolItem.findMany({
        where: { personId: person.id, sourceType: 'youtube' },
        take: 20
    });

    console.log(`Found ${items.length} YouTube items for ${person.name}`);
    console.log('---');
    items.forEach(i => {
        console.log(`Title: ${i.title}`);
        console.log(`URL: ${i.url}`);
        console.log('---');
    });
}

check().catch(console.error).finally(() => prisma.$disconnect());
