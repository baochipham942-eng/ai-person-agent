import { searchWikidata, getWikidataEntity } from './lib/datasources/wikidata';

// AI 大厂的更多人物
const AI_COMPANY_PEOPLE = [
    // OpenAI
    'Wojciech Zaremba',     // OpenAI 联合创始人
    'Alec Radford',         // GPT 论文作者
    'Lilian Weng',          // OpenAI 研究
    'Mark Chen',            // OpenAI 研究

    // Anthropic
    'Chris Olah',           // Anthropic, 可解释性专家
    'Tom Brown',            // GPT-3 第一作者
    'Jared Kaplan',         // Scaling Laws

    // DeepMind
    'David Silver',         // AlphaGo 创造者
    'Koray Kavukcuoglu',    // DeepMind VP
    'Raia Hadsell',         // DeepMind 机器人研究

    // Meta AI (FAIR)
    'Mike Schroepfer',      // Meta CTO
    'Joelle Pineau',        // Meta AI 负责人

    // Google AI
    'Jeff Dean',            // Google AI 负责人
    'Ashish Vaswani',       // Transformer 论文作者

    // Microsoft
    'Peter Lee',            // Microsoft Research 负责人
    'Sébastien Bubeck',     // Microsoft LLM 研究

    // NVIDIA
    '黄仁勋',               // 已有
    'Bryan Catanzaro',      // NVIDIA AI 研究负责人

    // Character.AI
    'Daniel De Freitas',    // Character.AI 创始人

    // 中国 AI
    'Qi Lu',                // 前百度 COO
    'Kai-Fu Lee',           // 创新工场，AI 启蒙者

    // Manus / Monica AI 团队
    'Xiao Yi',              // Monica/Manus (尝试搜索)
    'Chen Di',              // 可能的 Manus 相关
];

async function main() {
    console.log('搜索可添加的 AI 人物...\n');

    const available: string[] = [];
    const notFound: string[] = [];

    for (const name of AI_COMPANY_PEOPLE) {
        const results = await searchWikidata(name, 1);

        if (results.length > 0) {
            const entity = await getWikidataEntity(results[0].id);
            const hasImage = entity?.imageUrl ? '✓' : '✗';
            console.log(`${hasImage} ${name} -> ${results[0].label} (${results[0].id})`);
            console.log(`   ${results[0].description || 'No description'}`);

            // 检查是否是 AI 相关
            if (results[0].description?.toLowerCase().includes('ai') ||
                results[0].description?.toLowerCase().includes('machine learning') ||
                results[0].description?.toLowerCase().includes('computer scientist') ||
                results[0].description?.toLowerCase().includes('researcher') ||
                results[0].description?.toLowerCase().includes('engineer') ||
                results[0].description?.toLowerCase().includes('executive') ||
                results[0].description?.toLowerCase().includes('ceo') ||
                results[0].description?.toLowerCase().includes('cto') ||
                entity?.occupation?.some(o => o.toLowerCase().includes('computer') || o.toLowerCase().includes('engineer'))) {
                available.push(`${name} (${results[0].id})`);
            }
        } else {
            console.log(`✗ ${name} -> 未找到`);
            notFound.push(name);
        }

        await new Promise(r => setTimeout(r, 300));
    }

    console.log('\n===== 可添加的人物 =====');
    available.forEach(p => console.log('  + ' + p));

    console.log('\n===== 未找到的人物 =====');
    notFound.forEach(p => console.log('  - ' + p));
}

main().catch(console.error);
