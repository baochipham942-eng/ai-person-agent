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

async function check() {
    const people = await prisma.people.findMany({
        where: { avatarUrl: { not: null } },
        select: { id: true, name: true, avatarUrl: true }
    });

    let missing: { id: string; name: string; avatarUrl: string }[] = [];
    let ok = 0;

    for (const p of people) {
        if (p.avatarUrl?.startsWith('/avatars/')) {
            const filePath = path.join(process.cwd(), 'public', p.avatarUrl);
            if (!fs.existsSync(filePath)) {
                missing.push({ id: p.id, name: p.name, avatarUrl: p.avatarUrl });
            } else {
                ok++;
            }
        }
    }

    console.log(`\n=== Avatar Path Check ===`);
    console.log(`✅ OK: ${ok} people with valid avatars`);
    console.log(`❌ MISSING: ${missing.length} people with broken paths\n`);

    if (missing.length > 0) {
        console.log('Missing avatars:');
        for (const m of missing.slice(0, 20)) {
            console.log(`  ${m.name}: ${m.avatarUrl}`);

            // Check if there's a webp version
            const base = m.avatarUrl.replace(/\.(jpg|png)$/, '');
            const webpPath = path.join(process.cwd(), 'public', base + '.webp');
            if (fs.existsSync(webpPath)) {
                console.log(`    -> Found webp: ${base}.webp`);
            }
        }
        if (missing.length > 20) {
            console.log(`  ... and ${missing.length - 20} more`);
        }
    }

    await prisma.$disconnect();
    return missing;
}

check();
