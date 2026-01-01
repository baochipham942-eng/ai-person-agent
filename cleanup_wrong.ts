import { prisma } from './lib/db/prisma';

// 需要删除的错误匹配
const WRONG_MATCHES = [
    '戴维·苏特',   // 法学家，不是 David Ha
    '李梦',        // 演员，不是黎萌
    '李邦华',      // 政治家，不是黄铁军
    '朱骏',        // 错误匹配
    '杨志林',      // 可能不是杨植麟
    '唐杰',        // 需要验证
    '克里斯蒂娜·池·张', // 可能不是 Christina Zhang

    // 通用科技领袖（保留AI核心人物）
    '马克·扎克伯格',
    '比尔·盖茨',
    '萨提亚·纳德拉',
    '苏姿丰',  // AMD CEO, 芯片为主
];

async function main() {
    console.log('删除错误匹配的人物...\n');

    let count = 0;
    for (const name of WRONG_MATCHES) {
        const person = await prisma.people.findFirst({ where: { name } });
        if (person) {
            await prisma.rawPoolItem.deleteMany({ where: { personId: person.id } });
            await prisma.card.deleteMany({ where: { personId: person.id } });
            await prisma.people.delete({ where: { id: person.id } });
            console.log(`✓ 删除: ${name}`);
            count++;
        } else {
            console.log(`- 未找到: ${name}`);
        }
    }

    const finalCount = await prisma.people.count();
    console.log(`\n删除 ${count} 人，剩余 ${finalCount} 人`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
