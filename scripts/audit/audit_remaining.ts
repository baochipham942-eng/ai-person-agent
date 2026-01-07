
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

const deepseek = createDeepSeek({
    apiKey: process.env.DEEPSEEK_API_KEY,
});

// Already processed names from previous run (ended at Paul Graham)
const PROCESSED = new Set([
    'Matthew Berman', 'Bob McGrew', '季逸超', '迈克·施罗普费尔', 'Richard Socher',
    'David Ha', 'Aakash Gupta', '李开复', 'Han Xiao', 'Daniel Gross', '姚舜禹',
    '雅各布·乌什科雷特', '亚历克·拉德福德', 'Wojciech Zaremba', 'Sam Altman', '刘知远',
    '纳特·弗里德曼', 'Lukasz Kaiser', '黄仁勋', '朱军', '乔尔·皮诺', '李莲', '闫俊杰',
    'Noam Shazeer', 'James Manyika', '凯文·斯科特', 'Richard Ngo', '汤姆·布朗',
    'John Schulman', 'Jan Leike', 'Scott Wu', 'Dylan Field', 'Demis Hassabis',
    'Allie K. Miller', 'Greg Brockman', 'Joanne Jang', '吴恩达', 'Rob Bensinger',
    '戴文渊', '李飞飞', 'Ethan Mollick', 'Boris Cherny', '妮基·帕尔玛',
    'Christopher Manning', 'Oriol Vinyals', 'Kevin Weil', 'Percy Liang', '杨植麟',
    '颜水成', '塞巴斯蒂安·布贝克', 'Marc Andreessen', 'Emad Mostaque', 'Ilya Sutskever',
    'Chip Huyen', 'Geoffrey Hinton', '黄铁军', 'Alexandr Wang', 'Shane Legg',
    'Daniela Amodei', 'Dario Amodei', '吉滕德拉·马利克', 'Andrej Karpathy', 'Hyung Won Chung',
    'Quoc Le', '肖弘', '阿希什·瓦斯瓦尼', 'Santiago Valdarrama', 'Mustafa Suleyman',
    '埃里克·霍维茨', '汤晓鸥', 'Yoshua Bengio', '桑达尔·皮查伊', 'Chamath Palihapitiya',
    '布莱恩·卡坦扎罗', 'Jason Wei', '唐杰', '贾里德·卡普兰', '罗福莉', '沈向洋',
    'Rachel Thomas', '吉多·范罗苏姆', 'Elon Musk', 'Yann LeCun', '科拉伊·卡武克丘奥卢',
    'Guillaume Lample', '杰夫·迪恩', 'Mira Murati', 'Chris Olah', 'Jeremy Howard',
    'Arthur Mensch', 'Paul Graham'
]);

async function main() {
    console.log('=== Auditing REMAINING People ===');

    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    const prisma = new PrismaClient({ adapter });

    const people = await prisma.people.findMany({
        select: { id: true, name: true, description: true, occupation: true, organization: true }
    });

    const remaining = people.filter(p => !PROCESSED.has(p.name));
    console.log(`Found ${remaining.length} remaining people to audit.\n`);

    for (const person of remaining) {
        try {
            const items = await prisma.rawPoolItem.findMany({
                where: { personId: person.id, sourceType: { in: ['github', 'youtube'] } },
                take: 20,
                select: { id: true, title: true, url: true, sourceType: true, text: true }
            });

            if (items.length === 0) {
                console.log(`${person.name}: No items.`);
                continue;
            }

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
                prompt: `You are a data cleaner. Analyze items for "${person.name}". Identify if they belong to THIS person or a DIFFERENT person with the same name. Context: ${context}\nItems: ${JSON.stringify(itemsPayload)}\nReturn ONLY pollution items.`
            });

            if (object.pollution.length > 0) {
                console.log(`⚠️ Found ${object.pollution.length} polluted items:`);
                object.pollution.forEach(p => {
                    const orig = items.find(i => i.id === p.id);
                    console.log(`  [${p.confidence > 0.8 ? 'DELETE' : 'SUSPICIOUS'}] ${orig?.title} - ${p.reason}`);
                });
            } else {
                console.log(' OK.');
            }
        } catch (e: any) {
            console.error(`  Error for ${person.name}: ${e.message}`);
        }
    }

    await prisma.$disconnect();
    console.log('\nDone.');
}

main();
