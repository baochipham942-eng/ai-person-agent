/**
 * 批量触发所有人物的数据刷新任务
 * 这会使用新的 career 数据模型 (Organization + PersonRole)
 */
import { prisma } from './lib/db/prisma';
import { inngest } from './lib/inngest/client';

async function triggerAllRefresh() {
    console.log('=== 批量触发人物数据刷新 ===\n');

    const people = await prisma.people.findMany({
        select: {
            id: true,
            name: true,
            qid: true,
            aliases: true,
            officialLinks: true
        }
    });

    console.log(`共 ${people.length} 个人物需要刷新\n`);

    let triggered = 0;

    for (const person of people) {
        // 提取英文名
        const englishName = person.aliases?.find(a => /^[a-zA-Z\s]+$/.test(a)) || undefined;

        // 提取 ORCID (如果有)
        const orcidLink = (person.officialLinks as any[])?.find(l => l.type === 'orcid');
        const orcid = orcidLink?.handle;

        try {
            await inngest.send({
                name: 'person/created',
                data: {
                    personId: person.id,
                    personName: person.name,
                    qid: person.qid,
                    officialLinks: person.officialLinks,
                    aliases: person.aliases,
                    englishName,
                    orcid,
                }
            });

            triggered++;
            console.log(`✓ ${person.name} (${person.qid})`);

            // 避免触发太快
            await new Promise(r => setTimeout(r, 500));

        } catch (error) {
            console.error(`✗ ${person.name}: ${error}`);
        }
    }

    console.log(`\n=== 完成：触发了 ${triggered}/${people.length} 个刷新任务 ===`);
    console.log('任务将在 Inngest 后台队列中执行');
}

triggerAllRefresh()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
