import { prisma } from './lib/db/prisma';
import { inngest } from './lib/inngest/client';

/**
 * 检查数据缺口并触发 Inngest 任务填充
 */
async function main() {
    console.log('=== 检查数据缺口 ===\n');

    const people = await prisma.people.findMany({
        include: {
            _count: {
                select: { rawPoolItems: true, cards: true }
            }
        }
    });

    console.log(`总人数: ${people.length}\n`);

    // 分类统计
    const noContent = people.filter(p => p._count.rawPoolItems === 0);
    const lowContent = people.filter(p => p._count.rawPoolItems > 0 && p._count.rawPoolItems < 5);
    const goodContent = people.filter(p => p._count.rawPoolItems >= 5);

    console.log(`无内容: ${noContent.length}`);
    console.log(`低内容 (<5): ${lowContent.length}`);
    console.log(`有内容 (>=5): ${goodContent.length}`);

    // 列出无内容的人物
    if (noContent.length > 0) {
        console.log('\n=== 无内容的人物 ===');
        noContent.forEach(p => console.log(`  - ${p.name} (${p.status})`));
    }

    // 触发 Inngest 任务
    console.log('\n=== 触发内容抓取任务 ===');

    const toProcess = [...noContent, ...lowContent];
    console.log(`将处理 ${toProcess.length} 个人物\n`);

    let triggeredCount = 0;

    for (const person of toProcess) {
        console.log(`触发: ${person.name}...`);

        try {
            await inngest.send({
                name: 'person/created',
                data: {
                    personId: person.id,
                    personName: person.name,
                    englishName: person.aliases.find(a => /^[a-zA-Z\s\-]+$/.test(a)),
                    qid: person.qid,
                    officialLinks: person.officialLinks || [],
                    aliases: person.aliases,
                },
            });

            triggeredCount++;
            console.log(`  ✓ 已发送`);

        } catch (error) {
            console.log(`  ✗ 失败`);
        }

        await new Promise(r => setTimeout(r, 300));
    }

    console.log(`\n=== 完成 ===`);
    console.log(`触发了 ${triggeredCount} 个任务`);
    console.log(`\n请确保 Inngest Dev Server 正在运行`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
