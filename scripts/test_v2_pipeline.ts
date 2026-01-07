/**
 * 测试 V2 Pipeline - 添加 Jaana Dogan 并执行数据获取
 * 
 * Jaana Dogan (rakyll):
 * - Google Principal Engineer, Gemini API
 * - 前 Google Compute Engine, Spanner 工程师
 * - Go 语言社区知名贡献者
 * - Twitter: @rakyll, GitHub: rakyll
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

neonConfig.webSocketConstructor = ws;
const connectionString = process.env.DATABASE_URL!;

// 导入 V2 Pipeline 的直接执行函数
import {
    adapters,
    safeFetch,
    FetchParams,
    PersonContext,
} from '../lib/datasources';
import { routerAgent, RouterInput } from '../lib/agents/router-agent';
import { qaAgent } from '../lib/agents/qa-agent';

async function main() {
    console.log('=== V2 Pipeline Test: Jaana Dogan ===\n');

    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        // 1. 创建或获取人物
        const personData = {
            name: 'Jaana Dogan',
            englishName: 'Jaana Dogan',
            description: 'Google Principal Engineer working on Gemini API. Former Google Compute Engine, Spanner engineer. Known Go language contributor.',
            occupation: ['Principal Engineer', 'Software Engineer'],
            organization: ['Google', 'Gemini API', 'Google Cloud'],
            aliases: ['rakyll', 'JBD'],
            officialLinks: [
                { type: 'x', url: 'https://x.com/rakyll', handle: 'rakyll' },
                { type: 'github', url: 'https://github.com/rakyll', handle: 'rakyll' },
                { type: 'website', url: 'https://jbd.dev' },
            ],
        };

        let person = await prisma.people.findFirst({
            where: { name: personData.name },
        });

        if (!person) {
            console.log('Creating new person: Jaana Dogan');
            person = await prisma.people.create({
                data: {
                    name: personData.name,
                    description: personData.description,
                    occupation: personData.occupation,
                    organization: personData.organization,
                    aliases: personData.aliases,
                    officialLinks: personData.officialLinks as any,
                    qid: '', // No Wikidata QID available
                    status: 'building',
                },
            });
            console.log(`Created person with ID: ${person.id}`);
        } else {
            console.log(`Found existing person: ${person.id}`);
            await prisma.people.update({
                where: { id: person.id },
                data: { status: 'building' },
            });
        }

        // 2. 构建上下文
        const personContext: PersonContext = {
            id: person.id,
            name: personData.name,
            englishName: personData.englishName,
            aliases: personData.aliases,
            organizations: personData.organization,
            occupations: personData.occupation,
        };

        const fetchParams: FetchParams = {
            person: personContext,
            forceRefresh: true,
            handle: 'rakyll',
            seedDomains: ['jbd.dev'],
        };

        // 3. Router Agent 决策
        console.log('\n--- Router Agent Decision ---');
        const routerInput: RouterInput = {
            person: personContext,
            officialLinks: personData.officialLinks,
        };
        const decision = routerAgent.analyze(routerInput);
        console.log(`Enabled sources: ${decision.enabledSources.map(s => `${s.source}(${s.priority})`).join(', ')}`);
        console.log(`Confidence threshold: ${decision.confidenceThreshold}`);

        // 4. 调用各 Adapter
        console.log('\n--- Fetching Data ---');
        const results = [];

        for (const sourceDecision of decision.enabledSources) {
            const adapter = adapters[sourceDecision.source];
            if (!adapter) {
                console.log(`⚠️ Adapter not found: ${sourceDecision.source}`);
                continue;
            }

            console.log(`\nFetching ${sourceDecision.source}...`);
            const result = await safeFetch(adapter, fetchParams);

            if (result.success) {
                console.log(`  ✓ ${result.items.length} items (fetched: ${result.stats.fetched}, validated: ${result.stats.validated}, filtered: ${result.stats.filtered})`);
                results.push(result);
            } else {
                console.log(`  ✗ Error: ${result.error?.message}`);
            }
        }

        // 5. 收集所有 items
        const allItems = results.flatMap(r => r.items);
        console.log(`\n--- Total Items: ${allItems.length} ---`);

        // 6. QA Agent 质检
        console.log('\n--- QA Agent Check ---');
        const existingItems = await prisma.rawPoolItem.findMany({
            where: { personId: person.id },
            select: { urlHash: true },
        });
        const existingHashes = new Set(existingItems.map(i => i.urlHash));

        const qaResult = await qaAgent.check(allItems, personContext, existingHashes);
        console.log(`Approved: ${qaResult.report.approvedCount}`);
        console.log(`Fixed: ${qaResult.report.fixedCount}`);
        console.log(`Rejected: ${qaResult.report.rejectedCount}`);

        if (qaResult.rejected.length > 0) {
            console.log('\nRejected items:');
            for (const item of qaResult.rejected.slice(0, 5)) {
                console.log(`  - ${item.item.title}: ${item.reason}`);
            }
        }

        // 7. 保存到数据库
        console.log('\n--- Saving to Database ---');
        let savedCount = 0;
        const itemsToSave = [...qaResult.approved, ...qaResult.fixed.map(f => f.fixed)];

        for (const item of itemsToSave) {
            try {
                const existing = await prisma.rawPoolItem.findFirst({
                    where: { personId: person.id, urlHash: item.urlHash },
                });

                if (existing) {
                    await prisma.rawPoolItem.update({
                        where: { id: existing.id },
                        data: {
                            contentHash: item.contentHash,
                            title: item.title,
                            text: item.text,
                            publishedAt: item.publishedAt,
                            metadata: item.metadata as any,
                        },
                    });
                } else {
                    await prisma.rawPoolItem.create({
                        data: {
                            personId: person.id,
                            sourceType: item.sourceType,
                            url: item.url,
                            urlHash: item.urlHash,
                            contentHash: item.contentHash,
                            title: item.title,
                            text: item.text,
                            publishedAt: item.publishedAt,
                            metadata: item.metadata as any,
                        },
                    });
                }
                savedCount++;
            } catch (e: any) {
                console.error(`Failed to save: ${item.url} - ${e.message}`);
            }
        }

        console.log(`Saved ${savedCount} items`);

        // 8. 更新状态
        await prisma.people.update({
            where: { id: person.id },
            data: { status: 'ready' },
        });

        console.log('\n=== Test Complete ===');
        console.log(`Person ID: ${person.id}`);
        console.log(`Total items in DB: ${await prisma.rawPoolItem.count({ where: { personId: person.id } })}`);

    } catch (e: any) {
        console.error('Error:', e.message);
        throw e;
    } finally {
        await prisma.$disconnect();
    }
}

main();
