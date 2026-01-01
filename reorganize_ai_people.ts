import { prisma } from './lib/db/prisma';
import { searchWikidata, getWikidataEntityWithTranslation } from './lib/datasources/wikidata';
import { downloadAndStoreAvatar } from './lib/storage/avatarStorage';

// ===== 需要删除的非 AI 人物 =====
const TO_REMOVE = [
    '马化腾', '马云', '蒂姆·库克', '史蒂夫·乔布斯', '杰夫·贝索斯',
    '谢尔盖·布林', '拉里·佩奇', '桑达尔·皮查伊',
    '沃伦·巴菲特', '查理·芒格', '孙正义', '彼得·蒂尔', '马克·安德森',
    '保罗·格雷厄姆', '里德·霍夫曼', '纳瓦尔·拉维坎特',
    '阿尔伯特·爱因斯坦', '理查德·费曼', '玛丽·居里', '斯蒂芬·霍金',
    '尼古拉·特斯拉', '艾伦·图灵', '罗伯特·奥本海默', '卡尔·萨根',
    '吉多·范罗苏姆', '林纳斯·托瓦兹', '中本聪', '维塔利克·布特林'
];

// ===== 需要添加的 AI 人物 =====
const AI_PEOPLE_TO_ADD = [
    // 国内 AI 人物
    'Shengshu Yao',     // 姚舜禹 - Stepfun 创始人
    'YiChao Ji',        // 季逸超 - 面壁智能创始人
    'Tang Jie',         // 唐杰 - 清华教授，智谱AI
    'Wang Xiaochuan',   // 王小川 - 百川智能创始人
    'Yang Zhilin',      // 杨植麟 - 月之暗面创始人
    'Zhu Jun',          // 朱军 - 清华教授，生数科技
    'Zhou Ming',        // 周明 - NLP专家，澜舟科技
    'Dai Wenyuan',      // 戴文渊 - 第四范式创始人
    'Huang Tiejun',     // 黄铁军 - 北大教授，智源研究院
    'Li Meng',          // 黎萌 - MiniMax创始人

    // 国际 AI 人物（近年活跃）
    'Joanna Jiang',     // OpenAI
    'Aidan Gomez',      // Cohere 创始人
    'Arthur Mensch',    // Mistral AI 创始人
    'Guillaume Lample', // Mistral AI
    'Alexandr Wang',    // Scale AI 创始人
    'Dylan Field',      // Figma (AI features)
    'Emad Mostaque',    // Stability AI 创始人
    'Christina Zhang',  // Notion AI
    'Jan Leike',        // OpenAI Alignment
    'John Schulman',    // OpenAI, PPO 发明者
    'Oriol Vinyals',    // DeepMind
    'Quoc Le',          // Google Brain
    'David Ha',         // Sakana AI 创始人
    'Percy Liang',      // Stanford HAI
    'Christopher Manning', // Stanford NLP
    'Jason Wei',        // Google, Chain-of-Thought
    'Hyung Won Chung',  // OpenAI
];

function extractWhitelistDomains(links: { type: string; url: string }[]): string[] {
    const domains: string[] = [];
    for (const link of links) {
        try {
            const url = new URL(link.url);
            domains.push(url.hostname);
        } catch { }
    }
    return [...new Set(domains)];
}

async function main() {
    // Step 1: 删除非 AI 人物
    console.log('===== Step 1: 删除非 AI 人物 =====\n');

    let deletedCount = 0;
    for (const name of TO_REMOVE) {
        const person = await prisma.people.findFirst({ where: { name } });
        if (person) {
            // 先删除关联的 RawPoolItem 和 Card
            await prisma.rawPoolItem.deleteMany({ where: { personId: person.id } });
            await prisma.card.deleteMany({ where: { personId: person.id } });
            await prisma.people.delete({ where: { id: person.id } });
            console.log(`✓ 删除: ${name}`);
            deletedCount++;
        }
    }
    console.log(`\n共删除 ${deletedCount} 人\n`);

    // Step 2: 添加 AI 人物
    console.log('===== Step 2: 添加 AI 人物 =====\n');

    let addedCount = 0;
    for (const name of AI_PEOPLE_TO_ADD) {
        console.log(`\n处理: ${name}`);

        try {
            // 搜索 Wikidata
            const results = await searchWikidata(name, 1);
            if (results.length === 0) {
                console.log(`  ✗ Wikidata 未找到`);
                continue;
            }

            const qid = results[0].id;

            // 检查是否已存在
            const existing = await prisma.people.findUnique({ where: { qid } });
            if (existing) {
                console.log(`  - 已存在: ${existing.name}`);
                continue;
            }

            // 获取详情
            const entity = await getWikidataEntityWithTranslation(qid);
            if (!entity) {
                console.log(`  ✗ 无法获取实体详情`);
                continue;
            }

            // 下载头像
            let avatarUrl: string | null = null;
            if (entity.imageUrl) {
                avatarUrl = await downloadAndStoreAvatar(entity.imageUrl, qid);
            }

            // 创建记录
            const newPerson = await prisma.people.create({
                data: {
                    qid: entity.qid,
                    name: entity.label,
                    aliases: entity.aliases,
                    description: entity.description,
                    avatarUrl,
                    occupation: entity.occupation || [],
                    organization: entity.organization || [],
                    officialLinks: entity.officialLinks,
                    sourceWhitelist: extractWhitelistDomains(entity.officialLinks),
                    status: 'pending',
                    completeness: 0,
                }
            });

            console.log(`  ✓ 添加: ${newPerson.name} (${avatarUrl ? '有头像' : '无头像'})`);
            addedCount++;

            // 延迟
            await new Promise(r => setTimeout(r, 500));

        } catch (error) {
            console.error(`  ✗ 错误:`, error);
        }
    }

    console.log(`\n共添加 ${addedCount} 人`);

    // 汇总
    const finalCount = await prisma.people.count();
    console.log(`\n===== 完成 =====`);
    console.log(`最终人物数量: ${finalCount}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
