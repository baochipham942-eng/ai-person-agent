
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { generateObject } from 'ai';
import { z } from 'zod';

neonConfig.webSocketConstructor = ws;
const connectionString = "postgresql://neondb_owner:npg_yJ05EdKOxWlQ@ep-purple-leaf-a11okpqu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

// Initialize DeepSeek
const deepseek = createDeepSeek({
    apiKey: process.env.DEEPSEEK_API_KEY,
});

async function main() {
    console.log('=== DeepSeek Pollution Audit ===');

    if (!process.env.DEEPSEEK_API_KEY) {
        console.error('Error: DEEPSEEK_API_KEY is not set in .env');
        process.exit(1);
    }

    const MAX_RETRIES = 3;
    let retryCount = 0;

    while (retryCount < MAX_RETRIES) {
        try {
            const pool = new Pool({ connectionString });
            const adapter = new PrismaNeon(pool);
            const prisma = new PrismaClient({ adapter });

            // 1. Get targets
            console.log('Connection established. Fetching people...');
            const people = await prisma.people.findMany({
                select: {
                    id: true,
                    name: true,
                    description: true,
                    occupation: true,
                    organization: true
                }
            });

            console.log(`Scanning ${people.length} people...`);

            for (const person of people) {
                // Fetch GitHub & YouTube
                const items = await prisma.rawPoolItem.findMany({
                    where: {
                        personId: person.id,
                        sourceType: { in: ['github', 'youtube'] }
                    },
                    take: 20, // Sample top 20
                    select: { id: true, title: true, url: true, sourceType: true, text: true }
                });

                if (items.length === 0) continue;

                // Construct prompt context
                const context = `
Person: ${person.name}
Description: ${person.description || 'N/A'}
Occupation: ${person.occupation.join(', ')}
Organization: ${person.organization.join(', ')}
`;

                const itemsPayload = items.map(i => ({
                    id: i.id,
                    type: i.sourceType,
                    title: i.title,
                    snippet: i.text ? i.text.slice(0, 100) : ''
                }));

                try {
                    console.log(`\nAnalyzing ${person.name} (${items.length} items)...`);

                    const { object } = await generateObject({
                        model: deepseek('deepseek-chat'),
                        schema: z.object({
                            pollution: z.array(z.object({
                                id: z.string(),
                                reason: z.string(),
                                confidence: z.number().describe('0-1 score, 1 is definitely pollution/not related')
                            }))
                        }),
                        prompt: `
                        You are a data cleaner. specific instructions:
                        1. Analyze these content items associated with "${person.name}".
                        2. Determine if they belong to THIS person or a different person with the same name (Pollution).
                        3. STRICT Criteria: 
                           - If the person is an AI Researcher, a gaming video or random vlog is POLLUTION.
                           - If the person is a CEO, a random student's homework repo is POLLUTION.
                           - If uncertain, assume relevant.
                        
                        Person Context: ${context}
                        
                        Items to Check:
                        ${JSON.stringify(itemsPayload, null, 2)}
                        
                        Return a list of ONLY the pollution items.
                        `
                    });

                    if (object.pollution.length > 0) {
                        console.log(`⚠️ Found ${object.pollution.length} polluted items:`);
                        for (const p of object.pollution) {
                            const original = items.find(i => i.id === p.id);
                            if (p.confidence > 0.8) {
                                console.log(`  [DELETE CANDIDATE] ${original?.title} (${original?.url})`);
                                console.log(`    Reason: ${p.reason}`);
                            } else {
                                console.log(`  [SUSPICIOUS] ${original?.title} - ${p.reason}`);
                            }
                        }
                    } else {
                        process.stdout.write(' OK.');
                    }

                } catch (e: any) {
                    console.error(`  AI Error: ${e.message}`);
                }
            }

            await prisma.$disconnect();
            console.log('\nAudit Complete.');
            return;

        } catch (e: any) {
            console.error(`Connection Error (Attempt ${retryCount + 1}/${MAX_RETRIES}): ${e.message}`);
            retryCount++;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    console.error('Failed after retries.');
    process.exit(1);
}

main();
