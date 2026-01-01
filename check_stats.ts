import { prisma } from './lib/db/prisma';

async function check() {
    // 统计各数据源的数据量
    const stats = await prisma.rawPoolItem.groupBy({
        by: ['sourceType'],
        _count: { id: true }
    });

    console.log('=== 数据源统计 ===');
    stats.forEach(s => console.log(`${s.sourceType}: ${s._count.id}`));

    const total = stats.reduce((sum, s) => sum + s._count.id, 0);
    console.log(`\n总计: ${total} 条数据`);

    // 人物状态
    const statusStats = await prisma.people.groupBy({
        by: ['status'],
        _count: { id: true }
    });

    console.log('\n=== 人物状态 ===');
    statusStats.forEach(s => console.log(`${s.status}: ${s._count.id}`));

    // 头像情况
    const withAvatar = await prisma.people.count({ where: { avatarUrl: { not: null } } });
    const total_p = await prisma.people.count();
    console.log(`\n=== 头像情况 ===`);
    console.log(`有头像: ${withAvatar}/${total_p}`);
}

check().catch(console.error).finally(() => prisma.$disconnect());
