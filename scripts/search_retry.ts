import { searchWikidata, getWikidataEntity } from './lib/datasources/wikidata';

// 重新尝试更精确的搜索
const RETRY_SEARCHES = [
    { name: 'Jeff Dean Google', displayName: 'Jeff Dean' },
    { name: 'David Silver DeepMind', displayName: 'David Silver' },
    { name: 'Kai-Fu Lee AI', displayName: '李开复' },
    { name: 'Ashish Vaswani Transformer', displayName: 'Ashish Vaswani' },
    { name: 'Chris Olah neural', displayName: 'Chris Olah' },
    { name: 'Joelle Pineau Meta', displayName: 'Joelle Pineau' },
    { name: 'Tom Brown GPT', displayName: 'Tom Brown' },
    { name: 'Lu Qi Baidu', displayName: '陆奇' },
    { name: 'Satoshi creator', displayName: 'Manus团队' },
];

async function main() {
    console.log('精确搜索 AI 人物...\n');

    for (const { name, displayName } of RETRY_SEARCHES) {
        console.log(`\n=== ${displayName} (搜索: "${name}") ===`);
        const results = await searchWikidata(name, 3);

        for (const r of results) {
            const entity = await getWikidataEntity(r.id);
            const hasImage = entity?.imageUrl ? '✓' : '✗';
            console.log(`  ${hasImage} ${r.label} (${r.id}): ${r.description || '-'}`);
        }

        if (results.length === 0) {
            console.log('  未找到结果');
        }

        await new Promise(r => setTimeout(r, 500));
    }
}

main().catch(console.error);
