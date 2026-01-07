
/**
 * 多源 Recrawl：Wikidata → Exa → Perplexity
 * 优先使用免费数据源，逐步降级到付费源
 */

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

// ===== 数据源函数 =====

// Wikidata SPARQL 查询
async function fetchFromWikidata(personName: string, qid?: string): Promise<any[]> {
    try {
        // 如果没有 QID，先搜索
        if (!qid) {
            const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(personName)}&language=en&format=json&origin=*`;
            const searchRes = await fetch(searchUrl);
            const searchData = await searchRes.json();
            if (!searchData.search?.length) return [];
            qid = searchData.search[0].id;
        }

        // SPARQL 查询职业经历
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
        console.log('  Wikidata error:', (e as Error).message);
        return [];
    }
}

// Exa 搜索
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
        console.log('  Exa error:', (e as Error).message);
        return [];
    }
}

// Perplexity 搜索
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
        console.log('  Perplexity error:', (e as Error).message);
        return '';
    }
}

// AI 提取 (从 Exa 结果)
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
    console.log('=== 多源 Recrawl (Wiki → Exa → Perplexity) ===\n');

    try {
        // 获取稀缺人物
        const sparse = await prisma.$queryRaw<{ id: string, name: string, qid: string }[]>`
            SELECT p.id, p.name, p.qid
            FROM "People" p
            LEFT JOIN "PersonRole" pr ON p.id = pr."personId"
            GROUP BY p.id, p.name, p.qid
            HAVING COUNT(pr.id) < 3
        `;

        console.log(`Found ${sparse.length} sparse people\n`);
        let added = 0;

        for (let i = 0; i < sparse.length; i++) {
            const person = sparse[i];
            console.log(`[${i + 1}/${sparse.length}] ${person.name}`);

            let events: any[] = [];

            // 1️⃣ Try Wikidata first (free)
            console.log('  1. Wikidata...');
            events = await fetchFromWikidata(person.name, person.qid);

            // 2️⃣ Try Exa if Wikidata fails
            if (events.length === 0) {
                console.log('  2. Exa...');
                const exaResults = await fetchFromExa(person.name);
                if (exaResults.length > 0) {
                    const text = exaResults.map((r: any) => `${r.title}: ${r.text || ''}`).join('\n\n');
                    events = await extractWithAI(person.name, text);
                }
            }

            // 3️⃣ Try Perplexity as last resort
            if (events.length === 0) {
                console.log('  3. Perplexity...');
                const pplxResult = await fetchFromPerplexity(person.name);
                if (pplxResult) {
                    try {
                        const match = pplxResult.match(/\[[\s\S]*\]/);
                        if (match) events = JSON.parse(match[0]);
                    } catch (e) { }
                }
            }

            console.log(`  Found ${events.length} events`);

            // Save events
            for (const ev of events) {
                if (!ev.title) continue;

                let org = await prisma.organization.findFirst({ where: { name: ev.title } });
                if (!org) {
                    org = await prisma.organization.create({
                        data: { name: ev.title, type: 'company' }
                    });
                }

                const exists = await prisma.personRole.findFirst({
                    where: { personId: person.id, organizationId: org.id }
                });

                if (!exists) {
                    const start = ev.startDate ? new Date(ev.startDate) : null;
                    const end = ev.endDate && ev.endDate !== 'present' ? new Date(ev.endDate) : null;

                    // Skip invalid dates
                    if (start && isNaN(start.getTime())) continue;
                    if (end && isNaN(end.getTime())) continue;

                    await prisma.personRole.create({
                        data: {
                            personId: person.id,
                            organizationId: org.id,
                            role: ev.role || 'Member',
                            startDate: start,
                            endDate: end,
                            source: 'MULTI_SOURCE_RECRAWL'
                        }
                    });
                    added++;
                    console.log(`  + Added: ${ev.title}`);
                }
            }

            await new Promise(r => setTimeout(r, 1500));
        }

        console.log(`\n=== Done ===\nAdded ${added} new roles.`);

    } catch (e) {
        console.error('Fatal:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
