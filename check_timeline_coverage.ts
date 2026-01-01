import { prisma } from './lib/db/prisma';

async function main() {
    console.log('=== Timeline 数据覆盖率检查 ===\n');

    const people = await prisma.people.findMany({
        select: {
            id: true,
            name: true,
            _count: {
                select: {
                    rawPoolItems: {
                        where: { publishedAt: { not: null } }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    console.log(`总人数: ${people.length}\n`);

    const noData = [];
    const lowData = []; // < 3 items for career
    const goodData = []; // >= 3 items for career

    console.log('姓名         | 数量  | 状态');
    console.log('---------------------------------');

    for (const person of people) {
        // 统计 Career 数据
        const careerCount = await prisma.rawPoolItem.count({
            where: {
                personId: person.id,
                sourceType: 'career'
            }
        });

        let status = '';
        if (careerCount === 0) {
            status = '无数据';
            noData.push(person.name);
        } else if (careerCount < 3) { // New threshold
            status = '数据较少';
            lowData.push(person.name); // Format changed to just name
        } else {
            status = '数据充足';
            goodData.push(person.name); // Format changed to just name
        }
        console.log(`${person.name.padEnd(10)} | ${careerCount.toString().padEnd(5)} | ${status}`);
    }

    console.log('\n=== Summary (Career Data) ===');
    console.log(`无 Career 数据: ${noData.length}`);
    if (noData.length > 0) {
        console.log('列表:', noData.join(', '));
    }

    console.log(`\n数据较少 (<3): ${lowData.length}`);
    if (lowData.length > 0) {
        console.log('列表:', lowData.join(', '));
    }

    console.log(`\n数据充足 (>=5): ${goodData.length}`);

    console.log('\n典型人物数据量示例:');
    goodData.slice(0, 5).forEach(p => console.log(`  - ${p}`));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
