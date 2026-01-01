import { searchWikidata, getWikidataEntity } from './lib/datasources/wikidata';
import { prisma } from './lib/db/prisma';

/**
 * 搜索更多 AI 大厂人物
 */

// 按公司分类的候选人物
const AI_PEOPLE_BY_COMPANY = {
    'OpenAI': [
        'Wojciech Zaremba',     // 联合创始人
        'Alec Radford',         // GPT 发明者
        'Lilian Weng',          // 研究主管
        'Jan Leike',            // 对齐研究 (已有)
        'John Schulman',        // PPO 发明者 (已有)
    ],

    'Anthropic': [
        'Chris Olah',           // 可解释性专家
        'Tom Brown',            // GPT-3 作者
        'Jared Kaplan',         // Scaling Laws
    ],

    'DeepMind': [
        'David Silver',         // AlphaGo
        'Koray Kavukcuoglu',    // VP Research
        'Oriol Vinyals',        // 研究总监 (已有)
    ],

    'Meta AI': [
        'Joelle Pineau',        // VP AI Research
        'Mike Schroepfer',      // 前 CTO
    ],

    'Google': [
        'Jeff Dean',            // Google AI 负责人
        'Sundar Pichai',        // CEO (AI 战略)
    ],

    'Microsoft': [
        'Kevin Scott',          // CTO
        'Eric Horvitz',         // 首席科学家
    ],

    'NVIDIA': [
        'Bryan Catanzaro',      // AI 研究副总裁
    ],

    'Transformer 论文作者': [
        'Ashish Vaswani',       // Attention is All You Need
        'Noam Shazeer',         // (已有)
        'Jakob Uszkoreit',      // Insilico
        'Lukasz Kaiser',        // OpenAI
    ],

    '中国 AI': [
        '宿华',                 // 快手创始人
        '张一鸣',               // 字节跳动
        '王兴',                 // 美团 (AI)
        '雷军',                 // 小米 AI
    ],
};

async function main() {
    console.log('=== 搜索可添加的 AI 大厂人物 ===\n');

    // 获取已存在的人物
    const existing = await prisma.people.findMany({
        select: { name: true, aliases: true }
    });
    const existingNames = new Set(existing.flatMap(p => [p.name, ...p.aliases]));

    const available: { name: string; company: string; qid: string; hasImage: boolean }[] = [];
    const notFound: { name: string; company: string }[] = [];
    const alreadyExists: string[] = [];

    for (const [company, people] of Object.entries(AI_PEOPLE_BY_COMPANY)) {
        console.log(`\n=== ${company} ===`);

        for (const name of people) {
            // 检查是否已存在
            if (existingNames.has(name)) {
                console.log(`  - ${name}: 已存在`);
                alreadyExists.push(name);
                continue;
            }

            try {
                const results = await searchWikidata(name, 1);

                if (results.length === 0) {
                    console.log(`  ✗ ${name}: Wikidata 未找到`);
                    notFound.push({ name, company });
                    continue;
                }

                const entity = await getWikidataEntity(results[0].id);
                const hasImage = !!entity?.imageUrl;
                const icon = hasImage ? '✓' : '○';

                console.log(`  ${icon} ${name} (${results[0].id}): ${results[0].description || '-'}`);

                available.push({
                    name,
                    company,
                    qid: results[0].id,
                    hasImage
                });

            } catch (error) {
                console.log(`  ✗ ${name}: 错误`);
                notFound.push({ name, company });
            }

            await new Promise(r => setTimeout(r, 500));
        }
    }

    console.log('\n\n====== 汇总 ======\n');

    console.log(`已存在: ${alreadyExists.length}`);
    console.log(`可添加: ${available.length}`);
    console.log(`未找到: ${notFound.length}`);

    if (available.length > 0) {
        console.log('\n=== 可添加的人物 ===');
        for (const p of available) {
            const img = p.hasImage ? '📷' : '  ';
            console.log(`${img} ${p.name} (${p.company}) - ${p.qid}`);
        }
    }

    if (notFound.length > 0) {
        console.log('\n=== Wikidata 未找到 ===');
        for (const p of notFound) {
            console.log(`  - ${p.name} (${p.company})`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
