import { prisma } from './lib/db/prisma';

// 需要删除的非 AI 人物
const TO_REMOVE = [
    // 传统科技/商业人物（非AI核心）
    '马化腾', '马云', '蒂姆·库克', '史蒂夫·乔布斯', '杰夫·贝索斯',
    '谢尔盖·布林', '拉里·佩奇', '桑达尔·皮查伊',

    // 投资/商业人物
    '沃伦·巴菲特', '查理·芒格', '孙正义', '彼得·蒂尔', '马克·安德森',
    '保罗·格雷厄姆', '里德·霍夫曼', '纳瓦尔·拉维坎特',

    // 历史科学家（非现代AI）
    '阿尔伯特·爱因斯坦', '理查德·费曼', '玛丽·居里', '斯蒂芬·霍金',
    '尼古拉·特斯拉', '艾伦·图灵', '罗伯特·奥本海默', '卡尔·萨根',

    // 编程语言/区块链（非AI核心）
    '吉多·范罗苏姆', '林纳斯·托瓦兹', '中本聪', '维塔利克·布特林'
];

async function main() {
    console.log('检查要删除的人物...\n');

    for (const name of TO_REMOVE) {
        const person = await prisma.people.findFirst({
            where: { name },
            select: { id: true, name: true }
        });

        if (person) {
            console.log(`找到: ${person.name} (${person.id})`);
        } else {
            console.log(`未找到: ${name}`);
        }
    }

    const currentCount = await prisma.people.count();
    console.log(`\n当前总数: ${currentCount}`);
    console.log(`计划删除: ${TO_REMOVE.length}`);
    console.log(`删除后剩余: ${currentCount - TO_REMOVE.length} (估计)`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
