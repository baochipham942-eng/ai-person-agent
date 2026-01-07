import { prisma } from '../lib/db/prisma';

async function main() {
    console.log('=== People 项目数据库完整状态检查 ===\n');
    
    // 1. 基础计数
    const personCount = await prisma.people.count();
    const rawItemCount = await prisma.rawPoolItem.count();
    
    console.log('📊 数据总量:');
    console.log(`  - Person: ${personCount}`);
    console.log(`  - RawPoolItem: ${rawItemCount}`);
    
    // 2. 最近创建的人物
    const recentPersons = await prisma.people.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { name: true, createdAt: true }
    });
    console.log('\n👤 最近添加的 5 个人物:');
    recentPersons.forEach(p => console.log(`  - ${p.name} | ${p.createdAt.toISOString()}`));
    
    // 3. 最近的 RawPoolItem
    const recentItems = await prisma.rawPoolItem.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { sourceType: true, title: true, createdAt: true }
    });
    console.log('\n📄 最近添加的 5 条内容:');
    recentItems.forEach(i => console.log(`  - [${i.sourceType}] ${(i.title || '').substring(0, 50)} | ${i.createdAt.toISOString()}`));
    
    // 4. 检查一些知名人物
    const checkNames = ['Sam Altman', 'Elon Musk', 'Andrej Karpathy', 'Boris Cherny'];
    console.log('\n✅ 关键人物存在性检查:');
    for (const name of checkNames) {
        const exists = await prisma.people.findFirst({ where: { name: { contains: name } } });
        console.log(`  - ${name}: ${exists ? '✓ 存在' : '✗ 不存在'}`);
    }
    
    // 5. 按来源类型统计内容
    const sourceStats = await prisma.rawPoolItem.groupBy({
        by: ['sourceType'],
        _count: { id: true }
    });
    console.log('\n📈 内容按来源类型统计:');
    sourceStats.forEach(s => console.log(`  - ${s.sourceType}: ${s._count.id}`));
    
    console.log('\n✨ 数据库状态检查完成!');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
