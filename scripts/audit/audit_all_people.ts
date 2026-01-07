
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. 删除 Haider Khan
    console.log('=== 删除 Haider Khan ===\n');
    const haider = await prisma.people.findFirst({
        where: { name: 'Haider Khan' }
    });

    if (haider) {
        await prisma.people.delete({ where: { id: haider.id } });
        console.log(`已删除: Haider Khan (${haider.id})\n`);
    } else {
        console.log('未找到 Haider Khan\n');
    }

    // 2. 列出所有人物
    console.log('=== 所有人物列表 ===\n');
    const allPeople = await prisma.people.findMany({
        select: {
            id: true,
            name: true,
            description: true,
            avatarUrl: true,
            qid: true
        },
        orderBy: { name: 'asc' }
    });

    console.log(`共 ${allPeople.length} 人\n`);
    console.log('| # | 姓名 | 有头像 | 描述 |');
    console.log('|---|------|--------|------|');

    allPeople.forEach((p, i) => {
        const hasAvatar = p.avatarUrl ? '✅' : '❌';
        const desc = (p.description || '无描述').substring(0, 50);
        console.log(`| ${i + 1} | ${p.name} | ${hasAvatar} | ${desc}... |`);
    });
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
