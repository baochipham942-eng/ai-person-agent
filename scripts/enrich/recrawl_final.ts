
/**
 * 重新抓取数据稀缺人物的职业经历 (Final Version)
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const connectionString = "postgresql://neondb_owner:npg_yJ05EdKOxWlQ@ep-purple-leaf-a11okpqu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('=== Recrawl Final ===');
    console.log('DB:', connectionString.substring(0, 30) + '...');

    try {
        // 1. Fetch Stats
        console.log('Fetching counts...');
        const total = await prisma.personRole.count();
        console.log('Total roles:', total);

        // 2. Fetch Aggregation (In Memory to avoid group-by issues)
        console.log('Fetching aggregation data...');
        const allRoles = await prisma.personRole.findMany({ select: { personId: true } });
        const countMap = new Map<string, number>();
        for (const r of allRoles) {
            countMap.set(r.personId, (countMap.get(r.personId) || 0) + 1);
        }

        const allPeople = await prisma.people.findMany({ select: { id: true, name: true } });
        const targets = allPeople.filter(p => (countMap.get(p.id) || 0) < 3);
        console.log(`Targets found: ${targets.length}`);

        if (targets.length === 0) return;

        // Dynamic Imports
        const { searchExa } = await import('../lib/datasources/exa');
        const { generateText } = await import('ai');
        const { deepseek } = await import('../lib/ai/deepseek');

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
                        console.timeLog('  + Added:', ev.title);
                    }
                }

                // Rate limit
                await new Promise(r => setTimeout(r, 1000));

            } catch (e: any) {
                console.error(`  Failed: ${e.message}`);
            }
        }
        console.log(`\nDone. Added ${added} roles.`);

    } catch (e) {
        console.error('Fatal:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
