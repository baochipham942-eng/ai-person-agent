
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const connectionString = "postgresql://neondb_owner:npg_yJ05EdKOxWlQ@ep-purple-leaf-a11okpqu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function main() {
    console.log('=== Cleaning Pollution & Name Issues ===');
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    const prisma = new PrismaClient({ adapter });

    const TARGETS = ['丁洁', '徐立', '张鹏', '周明'];

    for (const name of TARGETS) {
        console.log(`\nProcessing ${name}...`);
        const person = await prisma.people.findFirst({
            where: { name: name }
        });

        if (!person) {
            console.log(' - Not found');
            continue;
        }

        // 1. Fix Aliases (for Ding Jie)
        if (name === '丁洁') {
            console.log(` - Current Aliases: ${JSON.stringify(person.aliases)}`);
            // Check if any alias is "丁洁 丁洁"
            const badAlias = person.aliases.find(a => a.includes('丁洁 丁洁'));
            if (badAlias) {
                console.log(` - Found bad alias: "${badAlias}". Removing...`);
                const newAliases = person.aliases.filter(a => a !== badAlias);
                await prisma.people.update({
                    where: { id: person.id },
                    data: { aliases: newAliases }
                });
                console.log(' - Aliases updated.');
            } else {
                // Check if `name` is "丁洁 丁洁"
                if (person.name === '丁洁 丁洁') {
                    console.log(' - Name is "丁洁 丁洁". Fixing...');
                    await prisma.people.update({
                        where: { id: person.id },
                        data: { name: '丁洁' }
                    });
                }
            }

            // Wait, what if the display logic prints "Name Alias"?
            // No, code says {displayName} only.
            // What if `country` and `gender` logic is rendering something weird?
            // User: "图里，展示了2遍名字" and "丁洁 丁洁".
            // It strongly suggests the `<h1>` inner text is "丁洁 丁洁".
        }

        // 2. Nuke Pollution (GitHub & YouTube)
        console.log(' - Deleting polluted GitHub/YouTube items...');
        const delGithub = await prisma.rawPoolItem.deleteMany({
            where: { personId: person.id, sourceType: 'github' }
        });
        console.log(`   Deleted ${delGithub.count} GitHub items.`);

        const delYoutube = await prisma.rawPoolItem.deleteMany({
            where: { personId: person.id, sourceType: 'youtube' }
        });
        console.log(`   Deleted ${delYoutube.count} YouTube items.`);
    }

    await prisma.$disconnect();
}

main();
