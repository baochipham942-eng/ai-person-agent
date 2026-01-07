import { prisma } from './lib/db/prisma';
import { inngest } from './lib/inngest/client';

/**
 * 为所有人物触发 Inngest 任务
 * 这会从多个数据源抓取内容，填充时光轴
 */
async function main() {
    console.log('=== 触发内容抓取任务 ===\n');

    const people = await prisma.people.findMany({
        where: {
            status: {
                in: ['pending', 'partial', 'error']  // 只处理未完成的
            }
        },
        include: {
            _count: {
                select: { rawPoolItems: true }
            }
        }
    });

    console.log(`找到 ${people.length} 个需要处理的人物\n`);

    let triggeredCount = 0;
    let skippedCount = 0;

    for (const person of people) {
        // 如果已有数据，跳过
        if (person._count.rawPoolItems > 10) {
            console.log(`- 跳过 ${person.name}: 已有 ${person._count.rawPoolItems} 条数据`);
            skippedCount++;
            continue;
        }

        console.log(`+ 触发 ${person.name} (${person.id})...`);

        try {
            await inngest.send({
                name: 'person/created',
                data: {
                    personId: person.id,
                    personName: person.name,
                    englishName: person.aliases.find(a => /^[a-zA-Z\s]+$/.test(a)) || undefined,
                    qid: person.qid,
                    orcid: undefined, // 需要手动添加
                    officialLinks: person.officialLinks || [],
                    aliases: person.aliases,
                },
            });

            triggeredCount++;
            console.log(`  ✓ 任务已发送`);

            // 避免过快触发
            await new Promise(r => setTimeout(r, 500));

        } catch (error) {
            console.error(`  ✗ 失败:`, error);
        }
    }

    console.log(`\n=== 完成 ===`);
    console.log(`触发: ${triggeredCount}`);
    console.log(`跳过: ${skippedCount}`);
    console.log(`\n注意: 任务会在 Inngest Dev Server 上执行`);
    console.log(`请确保 Inngest Dev Server 正在运行: npx inngest-cli@latest dev`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
