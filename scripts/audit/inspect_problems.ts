
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

// Robust connection
const connectionString = "postgresql://neondb_owner:npg_yJ05EdKOxWlQ@ep-purple-leaf-a11okpqu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

const TARGETS = ['丁洁', '徐立', '张鹏', '周明'];

async function main() {
    console.log('=== Inspecting Problematic People ===');

    for (const name of TARGETS) {
        console.log(`\n--- ${name} ---`);
        const person = await prisma.people.findFirst({
            where: { name: name },
            include: {
                rawPoolItems: {
                    select: { id: true, sourceType: true, title: true, url: true }
                }
            }
        });

        if (!person) {
            console.log('Not Found');
            continue;
        }

        console.log(`Name: "${person.name}"`);
        console.log(`Aliases: ${JSON.stringify(person.aliases)}`);
        console.log(`Total Items: ${person.rawPoolItems.length}`);

        // Analyze GitHub items
        const github = person.rawPoolItems.filter(i => i.sourceType === 'github');
        console.log(`GitHub Items: ${github.length}`);
        // Check for duplicates
        const seen = new Set();
        github.forEach(i => {
            if (seen.has(i.url)) console.log(`  DUPLICATE: ${i.url}`);
            seen.add(i.url);
        });
        if (github.length > 0) {
            console.log('  Top 5 GitHub:');
            github.slice(0, 5).forEach(i => console.log(`   - ${i.title} (${i.url})`));
        }

        // Analyze YouTube items
        const youtube = person.rawPoolItems.filter(i => i.sourceType === 'youtube');
        console.log(`YouTube Items: ${youtube.length}`);
        if (youtube.length > 0) {
            console.log('  Top 5 YouTube:');
            youtube.slice(0, 5).forEach(i => console.log(`   - ${i.title} (${i.url})`));
        }
    }

    await prisma.$disconnect();
}

main();
