
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
// Hardcoded for reliability
const connectionString = "postgresql://neondb_owner:npg_yJ05EdKOxWlQ@ep-purple-leaf-a11okpqu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function main() {
    console.log('=== Data Pollution & Issue Detection ===');
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    const prisma = new PrismaClient({ adapter });

    // 1. Get all people
    const people = await prisma.people.findMany({
        select: { id: true, name: true, aliases: true }
    });

    const personMap = new Map(people.map(p => [p.id, p]));

    // 2. Aggregate Item Counts
    console.log('Scanning item counts...');
    const counts = await prisma.rawPoolItem.groupBy({
        by: ['personId', 'sourceType'],
        _count: {
            id: true
        }
    });

    const pollutionCandidates: any[] = [];

    // Process counts
    const personCounts = new Map<string, { github: number, youtube: number }>();

    for (const c of counts) {
        if (!c.personId) continue;
        if (!personCounts.has(c.personId)) {
            personCounts.set(c.personId, { github: 0, youtube: 0 });
        }
        const entry = personCounts.get(c.personId)!;
        if (c.sourceType === 'github') entry.github = c._count.id;
        if (c.sourceType === 'youtube') entry.youtube = c._count.id;
    }

    // Thresholds
    const GITHUB_THRESHOLD = 5;
    const YOUTUBE_THRESHOLD = 5;

    console.log('\n--- High Item Counts (Potential Pollution) ---');
    console.log('Thresholds: GitHub > 5, YouTube > 5\n');
    console.log('| Name | GitHub | YouTube | Status |');
    console.log('|---|---|---|---|');

    for (const [id, count] of personCounts.entries()) {
        const person = personMap.get(id);
        if (!person) continue;

        if (count.github > GITHUB_THRESHOLD || count.youtube > YOUTUBE_THRESHOLD) {
            console.log(`| ${person.name} | ${count.github} | ${count.youtube} | ⚠️ Check |`);
        }
    }

    // 3. Name Checks
    console.log('\n--- Double Name Detection (Name Check) ---');
    for (const p of people) {
        const parts = p.name.trim().split(/\s+/);
        // Check if name is "X X"
        if (parts.length === 2 && parts[0] === parts[1]) {
            console.log(`[NAME] "${p.name}" (ID: ${p.id})`);
        }

        // Check aliases
        if (p.aliases && Array.isArray(p.aliases)) {
            for (const alias of p.aliases) {
                const aParts = alias.trim().split(/\s+/);
                if (aParts.length === 2 && aParts[0] === aParts[1]) {
                    console.log(`[ALIAS] "${p.name}" has double alias: "${alias}"`);
                }
            }
        }
    }

    await prisma.$disconnect();
    console.log('\nDone.');
}

main();
