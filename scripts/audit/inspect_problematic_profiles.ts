
import { prisma } from '../lib/db/prisma';


async function main() {
    const people = await prisma.people.findMany({
        where: {
            OR: [
                { name: { contains: '张鹏' } },
                { name: { contains: 'Zhang Peng' } },
                { name: { contains: '丁洁' } },
                { name: { contains: 'Ding Jie' } },
            ]
        },
        include: {
            rawPoolItems: {
                where: { sourceType: 'github' }
            }
        }
    });

    console.log(`Found ${people.length} records.`);

    for (const p of people) {
        console.log(`\nName: ${p.name}`);
        console.log(`ID: ${p.id}`);
        console.log(`Description: ${p.description}`);
        console.log(`Occupation: ${p.occupation}`);
        console.log(`Avatar: ${p.avatarUrl}`);
        console.log(`WhyImportant: ${p.whyImportant}`);
        console.log(`GitHub Items: ${p.rawPoolItems.length}`);
        p.rawPoolItems.forEach(item => {
            console.log(` - Repo: ${item.url} (${item.title})`);
        });
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
