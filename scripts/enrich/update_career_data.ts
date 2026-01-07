import { prisma } from './lib/db/prisma';
import { inngest } from './lib/inngest/client';

async function main() {
    console.log('=== 触发职业 Career 数据抓取 ===\n');

    const names = ['Sam Altman', '唐杰', 'Jeff Dean', '李飞飞'];

    for (const name of names) {
        const person = await prisma.people.findFirst({
            where: {
                OR: [
                    { name: { contains: name } },
                    { aliases: { has: name } }
                ]
            }
        });

        if (!person) {
            console.log(`❌ 未找到: ${name}`);
            continue;
        }

        console.log(`触发: ${person.name}...`);

        await inngest.send({
            name: 'person/created',
            data: {
                personId: person.id,
                personName: person.name,
                englishName: person.aliases.find(a => /^[a-zA-Z\s\-]+$/.test(a)) || person.name,
                qid: person.qid,
                officialLinks: person.officialLinks || [],
                aliases: person.aliases,
            },
        });

        console.log(`  ✓ 任务已发送`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
