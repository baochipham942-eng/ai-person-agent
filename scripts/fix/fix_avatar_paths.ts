import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';
import fs from 'fs';
import path from 'path';

neonConfig.webSocketConstructor = ws;
const connectionString = 'postgresql://neondb_owner:npg_yJ05EdKOxWlQ@ep-purple-leaf-a11okpqu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

async function fix() {
    const people = await prisma.people.findMany({
        where: { avatarUrl: { not: null } },
        select: { id: true, name: true, avatarUrl: true }
    });

    let fixed = 0;

    for (const p of people) {
        if (p.avatarUrl?.startsWith('/avatars/')) {
            const filePath = path.join(process.cwd(), 'public', p.avatarUrl);

            if (!fs.existsSync(filePath)) {
                // Check for webp version
                const base = p.avatarUrl.replace(/\.(jpg|png)$/, '');
                const webpPath = path.join(process.cwd(), 'public', base + '.webp');

                if (fs.existsSync(webpPath)) {
                    const newUrl = base + '.webp';
                    await prisma.people.update({
                        where: { id: p.id },
                        data: { avatarUrl: newUrl }
                    });
                    console.log(`✅ Fixed: ${p.name}`);
                    console.log(`   ${p.avatarUrl} -> ${newUrl}`);
                    fixed++;
                }
            }
        }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Fixed ${fixed} avatar paths`);

    await prisma.$disconnect();
}

fix();
