import { prisma } from './lib/db/prisma';
import * as fs from 'fs';
import * as path from 'path';

async function check() {
    const people = await prisma.people.findMany({
        select: { name: true, avatarUrl: true },
        orderBy: { createdAt: 'desc' }
    });

    console.log('=== 头像状态检查 ===');
    const issues: string[] = [];
    let valid = 0;

    for (const p of people) {
        if (!p.avatarUrl) {
            issues.push(`${p.name}: 无头像`);
        } else {
            const filePath = path.join(process.cwd(), 'public', p.avatarUrl);
            if (fs.existsSync(filePath)) {
                valid++;
            } else {
                issues.push(`${p.name}: 文件不存在 ${p.avatarUrl}`);
            }
        }
    }

    console.log(`有效头像: ${valid}/${people.length}`);

    if (issues.length > 0) {
        console.log('\n=== 问题列表 ===');
        issues.forEach(i => console.log('✗ ' + i));
    }

    // 检查 Timeline 数据
    const rawItems = await prisma.rawPoolItem.count();
    const withDate = await prisma.rawPoolItem.count({
        where: { publishedAt: { not: null } }
    });

    console.log('\n=== Timeline 数据 ===');
    console.log(`RawPoolItem 总数: ${rawItems}`);
    console.log(`有发布日期: ${withDate}`);
}

check().catch(console.error).finally(() => prisma.$disconnect());
