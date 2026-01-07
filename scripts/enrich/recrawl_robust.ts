
/**
 * Robust Recrawl: Wikidata → Exa → Perplexity
 * Strategy: Connect -> Process One Person -> Disconnect
 * This prevents WebSocket timeouts/hangs during long processing
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const connectionString = "postgresql://neondb_owner:npg_yJ05EdKOxWlQ@ep-purple-leaf-a11okpqu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

// Factory to get fresh client
function getClient() {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    return new PrismaClient({ adapter });
}

// ===== Data Source Functions (Same as before) =====

async function fetchFromWikidata(personName: string, qid?: string): Promise<any[]> {
    try {
        if (!qid) {
            const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(personName)}&language=en&format=json&origin=*`;
            const searchRes = await fetch(searchUrl);
            const searchData = await searchRes.json();
            if (!searchData.search?.length) return [];
            qid = searchData.search[0].id;
        }

        const sparql = `
            SELECT ?orgLabel ?roleLabel ?startTime ?endTime WHERE {
                wd:${qid} (wdt:P108|wdt:P69|wdt:P39) ?org .
                OPTIONAL { ?org rdfs:label ?orgLabel . FILTER(LANG(?orgLabel) = "en") }
                OPTIONAL { wd:${qid} p:P108 ?stmt . ?stmt ps:P108 ?org ; pq:P580 ?startTime ; pq:P582 ?endTime . }
                OPTIONAL { wd:${qid} p:P39 ?stmt2 . ?stmt2 ps:P39 ?role . ?role rdfs:label ?roleLabel . FILTER(LANG(?roleLabel) = "en") }
            }
            LIMIT 10
        `;
        const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
        const res = await fetch(url, { headers: { 'User-Agent': 'AI-Person-Agent/1.0' } });
        const data = await res.json();

        return (data.results?.bindings || []).map((b: any) => ({
            title: b.orgLabel?.value || '',
            role: b.roleLabel?.value || 'Member',
            startDate: b.startTime?.value?.substring(0, 4),
            endDate: b.endTime?.value?.substring(0, 4),
        })).filter((e: any) => e.title);
    } catch (e) {
        return [];
    }
}

async function fetchFromExa(personName: string): Promise<any[]> {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) return [];

    try {
        const res = await fetch('https://api.exa.ai/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
            body: JSON.stringify({
                query: `"${personName}" AI career history biography -ancient`,
                numResults: 5,
                type: 'neural',
                text: { maxCharacters: 3000 },
            }),
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data.results || [];
    } catch (e) {
        return [];
    }
}

async function fetchFromPerplexity(personName: string): Promise<string> {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) return '';

    try {
        const res = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'sonar',
                messages: [
                    { role: 'system', content: 'Return JSON array only.' },
                    {
                        role: 'user', content: `Career/education history of ${personName} in AI/tech?
Return JSON: [{"title": "Company", "role": "Position", "startDate": "YYYY", "endDate": "YYYY"}]` }
                ],
                temperature: 0.1,
            }),
        });
        if (!res.ok) return '';
        const data = await res.json();
        return data.choices?.[0]?.message?.content || '';
    } catch (e) {
        return '';
    }
}

async function extractWithAI(personName: string, text: string): Promise<any[]> {
    try {
        const { generateText } = await import('ai');
        const { createDeepSeek } = await import('@ai-sdk/deepseek');
        const deepseek = createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY });

        const result = await generateText({
            model: deepseek('deepseek-chat'),
            prompt: `Extract career/education for "${personName}".
Return JSON array: [{"title": "Company", "role": "Position", "startDate": "YYYY", "endDate": "YYYY"}]
Text: ${text.slice(0, 6000)}`,
            temperature: 0,
        });

        const json = result.text.replace(/```json|```/g, '').trim();
        const match = json.match(/\[[\s\S]*\]/);
        return match ? JSON.parse(match[0]) : [];
    } catch (e) {
        return [];
    }
}

async function main() {
    console.log('=== Robust Recrawl (Reconnect per Person) ===\n');

    // 1. Get List (Brief connection) with Retry
    console.log('Fetching sparse list...');
    let sparse: any[] = [];

    for (let attempt = 1; attempt <= 3; attempt++) {
        let listClient = getClient();
        try {
            console.log(`  Attempt ${attempt}/3...`);
            sparse = await listClient.$queryRaw<{ id: string, name: string, qid: string }[]>`
                SELECT p.id, p.name, p.qid
                FROM "People" p
                LEFT JOIN "PersonRole" pr ON p.id = pr."personId"
                GROUP BY p.id, p.name, p.qid
                HAVING COUNT(pr.id) < 3
            `;
            await listClient.$disconnect();
            break; // Success
        } catch (e: any) {
            console.error(`  Attempt ${attempt} failed: ${e.message}`);
            try { await listClient.$disconnect(); } catch { }
            if (attempt === 3) {
                console.error('Fatal: Could not fetch list after 3 attempts.');
                process.exit(1);
            }
            await new Promise(r => setTimeout(r, 2000)); // Wait before retry
        }
    }

    console.log(`Found ${sparse.length} sparse people to process.\n`);

    // 2. Process individually
    let added = 0;

    for (let i = 0; i < sparse.length; i++) {
        const person = sparse[i];
        console.log(`[${i + 1}/${sparse.length}] ${person.name}`);

        try {
            // STEP A: Fetch Data (No DB needed)
            let events: any[] = [];

            // Wiki
            console.log('  Fetching info...');
            events = await fetchFromWikidata(person.name, person.qid);

            // Exa
            if (events.length === 0) {
                const exaResults = await fetchFromExa(person.name);
                if (exaResults.length > 0) {
                    const text = exaResults.map((r: any) => `${r.title}: ${r.text || ''}`).join('\n\n');
                    events = await extractWithAI(person.name, text);
                }
            }

            // Perplexity
            if (events.length === 0) {
                const pplxResult = await fetchFromPerplexity(person.name);
                if (pplxResult) {
                    try {
                        const match = pplxResult.match(/\[[\s\S]*\]/);
                        if (match) events = JSON.parse(match[0]);
                    } catch (e) { }
                }
            }

            console.log(`  Found ${events.length} events`);
            if (events.length === 0) continue;

            // STEP B: Save to DB (Fresh connection) with Retry
            for (let attempt = 1; attempt <= 3; attempt++) {
                const db = getClient();
                try {
                    for (const ev of events) {
                        if (!ev.title) continue;

                        // Ensure Org
                        let org = await db.organization.findFirst({ where: { name: ev.title } });
                        if (!org) {
                            org = await db.organization.create({
                                data: { name: ev.title, type: 'company' }
                            });
                        }

                        // Ensure Role
                        const exists = await db.personRole.findFirst({
                            where: { personId: person.id, organizationId: org.id }
                        });

                        if (!exists) {
                            const start = ev.startDate ? new Date(ev.startDate) : null;
                            const end = ev.endDate && ev.endDate !== 'present' ? new Date(ev.endDate) : null;
                            if (start && isNaN(start.getTime())) continue;
                            if (end && isNaN(end.getTime())) continue;

                            await db.personRole.create({
                                data: {
                                    personId: person.id,
                                    organizationId: org.id,
                                    role: ev.role || 'Member',
                                    startDate: start,
                                    endDate: end,
                                    source: 'ROBUST_RECRAWL'
                                }
                            });
                            added++;
                            console.log(`  + Saved: ${ev.title}`);
                        }
                    }
                    await db.$disconnect();
                    break; // Success
                } catch (e: any) {
                    console.error(`  Save attempt ${attempt} failed: ${e.message}`);
                    try { await db.$disconnect(); } catch { }
                    if (attempt === 3) throw e; // Rethrow on last failure
                    await new Promise(r => setTimeout(r, 2000));
                }
            }

        } catch (e: any) {
            console.error(`  Error processing ${person.name}: ${e.message}`);
            // Continue to next person even if this one fails
        }

        // Small delay
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\n=== Done ===\nAdded ${added} new roles.`);
}

main();
