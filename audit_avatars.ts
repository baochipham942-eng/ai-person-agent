import { prisma } from './lib/db/prisma';

/**
 * 头像审查报告
 * 检查所有人物的头像状态
 */
async function main() {
    const people = await prisma.people.findMany({
        select: {
            id: true,
            name: true,
            avatarUrl: true,
            officialLinks: true,
        },
        orderBy: { createdAt: 'desc' }
    });

    console.log('=== 人物头像审查报告 ===\n');

    const missing: string[] = [];
    const hasAvatar: { name: string; url: string; xHandle?: string }[] = [];

    for (const person of people) {
        const links = person.officialLinks as any[] || [];
        const xLink = links.find((l: any) => l.type === 'x');
        const xHandle = xLink?.handle?.replace('@', '');

        if (person.avatarUrl) {
            hasAvatar.push({
                name: person.name,
                url: person.avatarUrl,
                xHandle
            });
        } else {
            missing.push(person.name + (xHandle ? ` (@${xHandle})` : ''));
        }
    }

    console.log(`有头像: ${hasAvatar.length}`);
    console.log(`缺失头像: ${missing.length}\n`);

    console.log('=== 有头像的人物 ===');
    hasAvatar.forEach(p => {
        const x = p.xHandle ? ` (@${p.xHandle})` : '';
        console.log(`  ${p.name}${x}: ${p.url}`);
    });

    console.log('\n=== 缺失头像的人物 ===');
    console.log('可从 X/Twitter 头像获取:');
    missing.forEach(p => console.log(`  - ${p}`));

    console.log('\n=== 头像来源建议 ===');
    console.log('1. X/Twitter Profile: https://pbs.twimg.com/profile_images/USER_ID/...');
    console.log('2. GitHub Avatar: https://avatars.githubusercontent.com/USERNAME');
    console.log('3. 百度百科: https://baike.baidu.com/item/人名');
    console.log('4. LinkedIn (需登录)');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
