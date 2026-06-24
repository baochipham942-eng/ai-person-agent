/**
 * 安全清理脚本 - 只删除明确属于"同名不同人"的污染数据
 * 
 * 规则：
 * 1. 只删除置信度 >= 0.95 的内容
 * 2. 排除本人的演讲、访谈、课程等合法内容
 * 3. 使用更精准的 prompt 让 AI 区分"不同人"vs"本人的内容"
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { generateObject } from 'ai';
import { z } from 'zod';

neonConfig.webSocketConstructor = ws;
const connectionString = process.env.DATABASE_URL!;

const deepseek = createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY });

const DRY_RUN = process.argv.includes('--dry-run');
const CONFIDENCE_THRESHOLD = 0.95; // 提高阈值到 0.95

// 白名单：这些人的内容不删除（他们的访谈/演讲容易被误判）
const WHITELIST_PEOPLE = [
    'Demis Hassabis',
    '沈向洋',
    'Quoc Le',
    '塞巴斯蒂安·布贝克',
    'Christopher Manning',
    '纳特·弗里德曼',
    'Kevin Weil',
    'Paul Graham',
    'Geoffrey Hinton',
    'Yoshua Bengio',
    'Yann LeCun',
    '吴恩达',
    '李飞飞',
    '李开复',
    'Lukasz Kaiser',
    'Noam Shazeer',
    'Ilya Sutskever',
    'Jan Leike',
    'John Schulman',
];

// 必须清理的人（明确有同名问题）
const MUST_CLEAN_PEOPLE = [
    '刘知远',      // 五代十国历史人物
    '闫俊杰',      // 演员
    '汤姆·布朗',  // 音乐家 Tom Browne
    '朱军',        // 主持人
    '李莲',        // 清朝太监李莲英
    '戴文渊',      // 同名用户
    '姚舜禹',      // 同名用户
    '颜水成',      // 同名电视节目
    '唐杰',        // 同名用户
    '吉滕德拉·马利克', // 足球新闻
    '凯文·斯科特',  // 滑板运动员
    '汤晓鸥',      // 商汤商业视频
    '罗福莉',      // 同名用户
];

async function main() {
    console.log(`=== Safe Cleanup (${DRY_RUN ? 'DRY RUN' : 'LIVE DELETE'}) ===`);
    console.log(`Confidence threshold: ${CONFIDENCE_THRESHOLD}`);
    console.log(`Must clean: ${MUST_CLEAN_PEOPLE.length} people\n`);

    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    const prisma = new PrismaClient({ adapter });

    let totalDeleted = 0;

    // 只处理必须清理的人
    for (const personName of MUST_CLEAN_PEOPLE) {
        try {
            const person = await prisma.people.findFirst({
                where: { name: { contains: personName } },
                select: { id: true, name: true, description: true, occupation: true, organization: true }
            });

            if (!person) {
                console.log(`⚠️ Person not found: ${personName}`);
                continue;
            }

            const items = await prisma.rawPoolItem.findMany({
                where: { personId: person.id, sourceType: { in: ['github', 'youtube'] } },
                select: { id: true, title: true, url: true, sourceType: true, text: true }
            });

            if (items.length === 0) {
                console.log(`✓ ${personName}: No items to clean`);
                continue;
            }

            console.log(`\nAnalyzing ${personName} (${items.length} items)...`);

            const context = `
Person: ${person.name}
Description: ${person.description || 'N/A'}
Occupation: ${person.occupation.join(', ')}
Organization: ${person.organization.join(', ')}

IMPORTANT: This person is in the AI field. Only mark content as pollution if it clearly belongs to a COMPLETELY DIFFERENT PERSON with the same name.
- Historical figures, actors, musicians, athletes with same name = POLLUTION
- The person's own interviews, talks, papers = NOT pollution (keep it)
`;
            const itemsPayload = items.map(i => ({
                id: i.id,
                type: i.sourceType,
                title: i.title,
                url: i.url,
                snippet: i.text?.slice(0, 150) || ''
            }));

            const { object } = await generateObject({
                model: deepseek('deepseek-chat'),
                schema: z.object({
                    pollution: z.array(z.object({
                        id: z.string(),
                        reason: z.string(),
                        confidence: z.number().describe('0-1, only 0.95+ means definitely wrong person')
                    }))
                }),
                prompt: `Analyze items for "${person.name}". Mark ONLY items that belong to a DIFFERENT person (same name, different identity).
                
Context: ${context}
Items: ${JSON.stringify(itemsPayload)}

Return pollution items with confidence 0.95-1.0 ONLY if you are CERTAIN it's a different person.`
            });

            const toDelete = object.pollution.filter(p => p.confidence >= CONFIDENCE_THRESHOLD);

            if (toDelete.length > 0) {
                console.log(`  🗑️ Deleting ${toDelete.length} items:`);

                for (const p of toDelete) {
                    const orig = items.find(i => i.id === p.id);
                    console.log(`    - ${orig?.title?.slice(0, 50)}... (${p.confidence.toFixed(2)})`);
                    console.log(`      Reason: ${p.reason}`);

                    if (!DRY_RUN) {
                        await prisma.rawPoolItem.delete({ where: { id: p.id } });
                    }
                    totalDeleted++;
                }
            } else {
                console.log(`  ✓ No pollution found`);
            }

        } catch (e: any) {
            console.error(`  Error processing ${personName}: ${e.message}`);
        }
    }

    await prisma.$disconnect();

    console.log('\n=== Summary ===');
    console.log(`Deleted: ${totalDeleted} items${DRY_RUN ? ' (DRY RUN)' : ''}`);
}

main();
