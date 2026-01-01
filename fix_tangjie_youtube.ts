import { prisma } from './lib/db/prisma';
import { inngest } from './lib/inngest/client';

async function main() {
    console.log('=== 清理并重新抓取唐杰的数据 ===\n');

    const person = await prisma.people.findFirst({
        where: { name: '唐杰' }
    });

    if (!person) {
        console.log('Person "唐杰" not found');
        return;
    }

    console.log(`找到人物: ${person.name} (${person.id})`);

    // 1. 删除现有的 YouTube 数据
    const deleteResult = await prisma.rawPoolItem.deleteMany({
        where: {
            personId: person.id,
            sourceType: 'youtube'
        }
    });

    console.log(`已删除 ${deleteResult.count} 条旧的 YouTube 数据`);

    // 2. 触发重新抓取
    console.log('触发 Inngest 重新抓取...');

    await inngest.send({
        name: 'person/created',
        data: {
            personId: person.id,
            personName: person.name,
            englishName: person.aliases.find(a => /^[a-zA-Z\s\-]+$/.test(a)), // "Jie Tang"
            qid: person.qid,
            officialLinks: person.officialLinks || [],
            aliases: person.aliases,
            // 注意：organization 数据现在会在 job 内部从 DB 读取
        },
    });

    console.log('✓ 任务已发送');
    console.log('请等待几分钟让后台任务完成。');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
