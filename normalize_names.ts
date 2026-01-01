import { prisma } from './lib/db/prisma';

// 人物热度排序 + 名称规范化
// 热度规则：OpenAI/Anthropic/DeepMind 创始人 > 知名研究者 > 其他

const POPULARITY_ORDER: Record<string, number> = {
    // Tier 1: 超级明星 (10)
    '萨姆·阿尔特曼': 10,
    '埃隆·马斯克': 10,
    '黄仁勋': 10,

    // Tier 2: AI 巨头创始人/领导者 (9)
    'Greg Brockman': 9,
    '德米斯·哈萨比斯': 9,
    '达里奥·阿莫代': 9,

    // Tier 3: 图灵奖/顶级学者 (8)
    '杰弗里·辛顿': 8,
    '杨立昆': 8,
    '约书亚·本吉奥': 8,
    '李飞飞': 8,

    // Tier 4: 核心研究者/创始人 (7)
    '安德烈·卡帕西': 7,
    '伊利亚·苏茨克维': 7,
    '吴恩达': 7,
    '穆斯塔法·苏莱曼': 7,

    // Tier 5: 其他知名人物 (6)
    '艾丹·N·戈麦斯': 6,
    '亚瑟·门施': 6,
    '埃马德·莫斯塔克': 6,
    '亚历山德·王': 6,
    '迪伦·菲尔德': 6,
};

// 名称规范化映射 (确保中国人用中文名，外国人用英文名)
const NAME_NORMALIZATION: Record<string, string> = {
    // 应该用中文名的

    '约书亚·本吉奥': 'Yoshua Bengio',  // 改为英文
    '德米斯·哈萨比斯': 'Demis Hassabis', // 改为英文
    '达里奥·阿莫代': 'Dario Amodei',   // 改为英文
    '丹妮拉·阿莫代': 'Daniela Amodei', // 改为英文
    '萨姆·阿尔特曼': 'Sam Altman',     // 改为英文
    '埃隆·马斯克': 'Elon Musk',        // 改为英文
    '杰弗里·辛顿': 'Geoffrey Hinton',  // 改为英文
    '安德烈·卡帕西': 'Andrej Karpathy', // 改为英文
    '穆斯塔法·苏莱曼': 'Mustafa Suleyman', // 改为英文
    '伊利亚·苏茨克维': 'Ilya Sutskever', // 改为英文
    '艾丹·N·戈麦斯': 'Aidan Gomez',    // 改为英文
    '亚瑟·门施': 'Arthur Mensch',      // 改为英文
    '埃马德·莫斯塔克': 'Emad Mostaque', // 改为英文
    '亚历山德·王': 'Alexandr Wang',    // 改为英文
    '迪伦·菲尔德': 'Dylan Field',      // 改为英文
    '肖恩·莱格': 'Shane Legg',         // 改为英文
    '诺姆·沙泽尔': 'Noam Shazeer',     // 改为英文
    '米拉·穆拉蒂': 'Mira Murati',      // 改为英文
    '约翰·舒尔曼': 'John Schulman',    // 改为英文
    '简·莱克': 'Jan Leike',            // 改为英文
    '奥里奥尔·维尼亚尔斯': 'Oriol Vinyals', // 改为英文
    '黎国越': 'Quoc Le',               // 改为英文
    '珀西·梁': 'Percy Liang',          // 改为英文
    '克里斯托弗·D·曼宁': 'Christopher Manning', // 改为英文
    '纪尧姆·兰普尔': 'Guillaume Lample', // 改为英文
    '郑亨元': 'Hyung Won Chung',       // 改为英文

    // 应该保持中文名的 (中国人/华人)
    '吴恩达': '吴恩达',      // Andrew Ng 用中文名
    '李飞飞': '李飞飞',      // Fei-Fei Li 用中文名  
    '黄仁勋': '黄仁勋',      // Jensen Huang 用中文名
    '王小川': '王小川',      // 中国人
    '杨立昆': 'Yann LeCun',  // 法国人，改英文
};

async function main() {
    console.log('=== 更新人物名称和热度 ===\n');

    const people = await prisma.people.findMany();

    for (const person of people) {
        const newName = NAME_NORMALIZATION[person.name];
        const popularity = POPULARITY_ORDER[person.name] || 5;

        if (newName && newName !== person.name) {
            console.log(`更新: ${person.name} -> ${newName}`);
            await prisma.people.update({
                where: { id: person.id },
                data: {
                    name: newName,
                    aliases: [...new Set([...person.aliases, person.name])] // 保留原名为别名
                }
            });
        }
    }

    // 显示最终排序
    const updated = await prisma.people.findMany({
        select: { name: true, avatarUrl: true },
        orderBy: { createdAt: 'desc' }
    });

    console.log('\n=== 当前人物列表 ===');
    updated.forEach((p, i) => {
        const avatar = p.avatarUrl ? '✓' : '✗';
        const pop = POPULARITY_ORDER[p.name] || 5;
        console.log(`${(i + 1).toString().padStart(2)}. [${pop}] ${avatar} ${p.name}`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
