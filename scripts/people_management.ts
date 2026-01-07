
import 'dotenv/config';
import { prisma } from './lib/db/prisma';

async function main() {
    console.log('--- Cleaning up Non-AI Figures ---');
    const toDelete = ['Steve Jobs', 'Jeff Bezos', 'Bill Gates', 'Warren Buffett', 'Charlie Munger'];

    for (const name of toDelete) {
        const person = await prisma.people.findFirst({
            where: { name: { contains: name, mode: 'insensitive' } }
        });

        if (person) {
            await prisma.people.delete({ where: { id: person.id } });
            console.log(`✅ Deleted: ${name}`);
        } else {
            console.log(`- Not found: ${name}`);
        }
    }

    console.log('\n--- Checking Chinese AI Leaders candidates ---');
    const candidates = [
        '李开复', // 01.AI
        '王小川', // Baichuan
        '杨植麟', // Moonshot
        '张鹏',   // Zhipu
        '何恺明', // ResNet
        '周伯文', // Xianhao
        '颜水成', // 
        '李彦宏', // Baidu
        '马化腾', // Tencent
        '马云',   // Alibaba
        '张一鸣'  // ByteDance
    ];

    const missing: string[] = [];

    for (const name of candidates) {
        const exists = await prisma.people.findFirst({
            where: {
                OR: [
                    { name: { contains: name } },
                    { aliases: { has: name } }
                ]
            }
        });

        if (exists) {
            console.log(`[Existing] ${name} -> ${exists.name}`);
        } else {
            console.log(`[MISSING] ${name}`);
            missing.push(name);
        }
    }

    console.log('\n--- Summary ---');
    console.log(`Missing Candidates: ${JSON.stringify(missing)}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
