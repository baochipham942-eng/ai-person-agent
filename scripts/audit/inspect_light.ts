
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const connectionString = "postgresql://neondb_owner:npg_yJ05EdKOxWlQ@ep-purple-leaf-a11okpqu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

const TARGETS = ['丁洁', '徐立', '张鹏', '周明'];

async function main() {
    console.log('=== Light Inspection ===');

    for (const name of TARGETS) {
        console.log(`\n--- ${name} ---`);
        const person = await prisma.people.findFirst({
            where: { name: name },
            select: {
                id: true,
                name: true,
                aliases: true,
                _count: { select: { rawPoolItems: true } }
            }
        });

        if (!person) {
            console.log('Not Found');
            continue;
        }

        console.log(`Name: "${person.name}"`);
        console.log(`Aliases: ${JSON.stringify(person.aliases)}`);
        console.log(`Total Items: ${person._count.rawPoolItems}`);

        // Sample GitHub items (limit 5)
        const github = await prisma.rawPoolItem.findMany({
            where: { personId: person.id, sourceType: 'github' },
            take: 5,
            select: { title: true, url: true }
        });
        if (github.length > 0) {
            console.log(`  Sample GitHub (${github.length}):`);
            github.forEach(i => console.log(`   - ${i.title} (${i.url})`));
        } else {
            console.log(`  Sample GitHub: 0`);
        }

        // Sample YouTube items (limit 5)
        const youtube = await prisma.rawPoolItem.findMany({
            where: { personId: person.id, sourceType: 'youtube' },
            take: 5,
            select: { title: true, url: true }
        });
        if (youtube.length > 0) {
            console.log(`  Sample YouTube (${youtube.length}):`);
            youtube.forEach(i => console.log(`   - ${i.title} (${i.url})`));
        } else {
            console.log(`  Sample YouTube: 0`);
        }
    }

    await prisma.$disconnect();
}

main();
