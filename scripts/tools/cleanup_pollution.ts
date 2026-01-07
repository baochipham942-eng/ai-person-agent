
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

const deepseek = createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY });

// Configuration
const DRY_RUN = process.argv.includes('--dry-run'); // Add --dry-run to preview without deleting
const CONFIDENCE_THRESHOLD = 0.8;

async function main() {
    console.log(`=== Auto Cleanup Pollution (${DRY_RUN ? 'DRY RUN' : 'LIVE DELETE'}) ===`);
    console.log(`Confidence threshold: ${CONFIDENCE_THRESHOLD}\n`);

    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    const prisma = new PrismaClient({ adapter });

    let totalDeleted = 0;
    let totalSkipped = 0;

    const people = await prisma.people.findMany({
        select: { id: true, name: true, description: true, occupation: true, organization: true }
    });

    console.log(`Processing ${people.length} people...\n`);

    for (const person of people) {
        try {
            const items = await prisma.rawPoolItem.findMany({
                where: { personId: person.id, sourceType: { in: ['github', 'youtube'] } },
                take: 20,
                select: { id: true, title: true, url: true, sourceType: true, text: true }
            });

            if (items.length === 0) continue;

            const context = `Person: ${person.name}\nDescription: ${person.description || 'N/A'}\nOccupation: ${person.occupation.join(', ')}\nOrganization: ${person.organization.join(', ')}`;
            const itemsPayload = items.map(i => ({ id: i.id, type: i.sourceType, title: i.title, snippet: i.text?.slice(0, 100) || '' }));

            console.log(`Analyzing ${person.name} (${items.length} items)...`);

            const { object } = await generateObject({
                model: deepseek('deepseek-chat'),
                schema: z.object({
                    pollution: z.array(z.object({
                        id: z.string(),
                        reason: z.string(),
                        confidence: z.number()
                    }))
                }),
                prompt: `You are a data cleaner. Analyze items for "${person.name}". Identify if they belong to THIS person or a DIFFERENT person with the same name. Context: ${context}\nItems: ${JSON.stringify(itemsPayload)}\nReturn ONLY pollution items with confidence 0-1.`
            });

            const toDelete = object.pollution.filter(p => p.confidence >= CONFIDENCE_THRESHOLD);

            if (toDelete.length > 0) {
                console.log(`  ⚠️ Deleting ${toDelete.length} items:`);

                for (const p of toDelete) {
                    const orig = items.find(i => i.id === p.id);
                    console.log(`    - ${orig?.title?.slice(0, 50)}... (${p.confidence.toFixed(2)})`);

                    if (!DRY_RUN) {
                        await prisma.rawPoolItem.delete({ where: { id: p.id } });
                    }
                    totalDeleted++;
                }
            }

            totalSkipped += object.pollution.filter(p => p.confidence < CONFIDENCE_THRESHOLD).length;

        } catch (e: any) {
            console.error(`  Error: ${e.message}`);
        }
    }

    await prisma.$disconnect();

    console.log('\n=== Summary ===');
    console.log(`Deleted: ${totalDeleted} items${DRY_RUN ? ' (DRY RUN - not actually deleted)' : ''}`);
    console.log(`Skipped (low confidence): ${totalSkipped} items`);
}

main();
