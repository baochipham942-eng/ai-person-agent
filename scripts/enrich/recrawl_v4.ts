
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

// Force hardcoded URL
const connectionString = "postgresql://neondb_owner:npg_yJ05EdKOxWlQ@ep-purple-leaf-a11okpqu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('=== Recrawl V4 (Final Mode) ===');

    // 1. Fetch Aggregation (Iterative Strategy for Stability)
    let targets: { id: string, name: string }[] = [];
    try {
        console.log('Fetching people list...');
        const allPeople = await prisma.people.findMany({ select: { id: true, name: true } });
        console.log(`Got ${allPeople.length} people. Checking role counts...`);

        // Check counts one by one to avoid large query hangs
        for (const person of allPeople) {
            const count = await prisma.personRole.count({ where: { personId: person.id } });
            if (count < 3) {
                targets.push(person);
                // console.log(`  -> ${person.name}: ${count} roles (Candidate)`);
            }
        }
        console.log(`Targets found: ${targets.length}`);
    } catch (e: any) {
        console.error('Fetch failed:', e.message);
        return;
    }

    if (targets.length === 0) return;

    // Dynamic Imports to avoid side-effects affecting DB connection
    const { searchExa } = await import('../lib/datasources/exa');
    const { generateText } = await import('ai');
    // We construct DeepSeek manually to avoid importing the whole file if it has static side effects
    const { createOpenAI } = await import('@ai-sdk/openai');
    const deepseek = createOpenAI({
        baseURL: 'https://api.deepseek.com/v1',
        apiKey: process.env.DEEPSEEK_API_KEY,
    });

    let added = 0;
    let processed = 0;

    for (const person of targets) {
        processed++;
        console.log(`[${processed}/${targets.length}] ${person.name}`);

        try {
            // EXA
            const query = `"${person.name}" AI career history biography linkedin -history -emperor -dynasty -ancient -novel`;
            const searchResults = await searchExa({ query, numResults: 5, type: 'neural', useAutoprompt: true });

            if (!searchResults.length) {
                console.log('  Skipped (No results)');
                continue;
            }

            const text = searchResults.map((r: any) => `Source: ${r.title}\n${r.text.slice(0, 2000)}`).join('\n\n');

            // AI
            const prompt = `Extract career/education for "${person.name}".
Ignore ancient history.
Return JSON array: { title, role, startDate (YYYY), endDate, type }
Text: ${text.slice(0, 6000)}`;

            const aiRes = await generateText({
                model: deepseek('deepseek-chat'),
                prompt,
                temperature: 0,
            });

            let events: any[] = [];
            try {
                const json = aiRes.text.replace(/```json|```/g, '').trim();
                if (json.startsWith('[')) events = JSON.parse(json);
            } catch (e) { }

            if (events.length) console.log(`  Found ${events.length} events`);

            // SAVE
            for (const ev of events) {
                if (!ev.title) continue;

                let org = await prisma.organization.findFirst({ where: { name: ev.title } });
                if (!org) {
                    org = await prisma.organization.create({
                        data: { name: ev.title, type: 'company' }
                    });
                }

                const exists = await prisma.personRole.findFirst({
                    where: { personId: person.id, organizationId: org.id, role: { contains: ev.role || '' } }
                });

                if (!exists) {
                    await prisma.personRole.create({
                        data: {
                            personId: person.id,
                            organizationId: org.id,
                            role: ev.role || 'Member',
                            startDate: ev.startDate ? new Date(ev.startDate) : null,
                            endDate: ev.endDate && ev.endDate !== 'present' ? new Date(ev.endDate) : null,
                            source: 'AI_RECRAWL_FINAL'
                        }
                    });
                    added++;
                    console.log('  + Added:', ev.title);
                }
            }

            await new Promise(r => setTimeout(r, 1000));

        } catch (e: any) {
            console.error(`  Failed: ${e.message}`);
        }
    }
    console.log(`\nDone. Added ${added} roles.`);
}

main().finally(() => prisma.$disconnect());
