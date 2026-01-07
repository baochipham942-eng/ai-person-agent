
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

// Hardcoded for reliability
const connectionString = "postgresql://neondb_owner:npg_yJ05EdKOxWlQ@ep-purple-leaf-a11okpqu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

// Robust version
async function updatePersonRobust(update: { name: string, avatarUrl: string }) {
    for (let attempt = 1; attempt <= 3; attempt++) {
        const prisma = new PrismaClient({ adapter: new PrismaNeon(new Pool({ connectionString })) });
        try {
            console.log(`Processing ${update.name} (Attempt ${attempt})...`);

            // Try match
            let person = await prisma.people.findFirst({ where: { name: update.name } });

            // Approximations
            if (!person && update.name === 'Alex Krizhevsky')
                person = await prisma.people.findFirst({ where: { name: { contains: 'Krizhevsky' } } });
            if (!person && update.name === 'Niki Parmar')
                person = await prisma.people.findFirst({ where: { name: { contains: 'Parmar' } } });
            if (!person && update.name === 'Daniel Gross')
                person = await prisma.people.findFirst({ where: { name: { contains: 'Gross' } } });

            // Zuckerberg Special
            if (!person && update.name.includes('Zuckerberg')) {
                const zuckQueries = ["Mark Zuckerberg", "Zuckerberg", "扎克伯格"];
                for (const q of zuckQueries) {
                    const p = await prisma.people.findFirst({ where: { name: { contains: q, mode: 'insensitive' } } });
                    if (p) { person = p; break; }
                }
            }

            if (person) {
                await prisma.people.update({
                    where: { id: person.id },
                    data: { avatarUrl: update.avatarUrl }
                });
                console.log(`✅ Updated ${person.name} (${update.name})`);
            } else {
                console.log(`❌ Not found: ${update.name}`);
            }

            await prisma.$disconnect();
            return; // Success
        } catch (e: any) {
            console.error(`  Error: ${e.message}`);
            await prisma.$disconnect();
            if (attempt < 3) await new Promise(r => setTimeout(r, 2000));
        }
    }
}

async function main() {
    console.log('=== Manual Avatar Updates (Robust) ===');

    // Zuckerberg manual entry
    const allUpdates = [
        { name: '闫俊杰', avatarUrl: '/avatars/manual/yan_junjie.png' },
        { name: 'Boris Cherny', avatarUrl: 'https://pbs.twimg.com/profile_images/1902044548936953856/J2jeik0t_400x400.jpg' },
        { name: 'Daniel Gross', avatarUrl: 'https://pbs.twimg.com/profile_images/1442862182505406468/ss__bm9m_400x400.jpg' },
        { name: 'Niki Parmar', avatarUrl: 'https://pbs.twimg.com/profile_images/1521953851045072897/ysHnB9ON_400x400.jpg' },
        { name: 'Alex Krizhevsky', avatarUrl: 'https://images.squarespace-cdn.com/content/v1/62ec2bc76a27db7b37a2b32f/57e2e8eb-4148-449c-ae2a-629f74228c6f/people-in-ai-alex-krizhevsky-2500.jpg?format=2500w' },
        // Zuckerberg special handling below
    ];

    // Filter duplicates if any (Zuckerberg handled in loop above? No, I need to add him explicitly to the list)
    // Actually the UPDATES list above didn't have him explicitly as an object for the first loop.
    // I will just iterate the combined list.

    const FINAL_UPDATES = [
        { name: '闫俊杰', avatarUrl: '/avatars/manual/yan_junjie.png' },
        { name: 'Boris Cherny', avatarUrl: 'https://pbs.twimg.com/profile_images/1902044548936953856/J2jeik0t_400x400.jpg' },
        { name: 'Daniel Gross', avatarUrl: 'https://pbs.twimg.com/profile_images/1442862182505406468/ss__bm9m_400x400.jpg' },
        { name: 'Niki Parmar', avatarUrl: 'https://pbs.twimg.com/profile_images/1521953851045072897/ysHnB9ON_400x400.jpg' },
        { name: 'Alex Krizhevsky', avatarUrl: 'https://images.squarespace-cdn.com/content/v1/62ec2bc76a27db7b37a2b32f/57e2e8eb-4148-449c-ae2a-629f74228c6f/people-in-ai-alex-krizhevsky-2500.jpg?format=2500w' },
        { name: 'Mark Zuckerberg', avatarUrl: '/avatars/manual/mark_zuckerberg.png' }
    ];

    for (const update of FINAL_UPDATES) {
        await updatePersonRobust(update);
    }
}

main();
