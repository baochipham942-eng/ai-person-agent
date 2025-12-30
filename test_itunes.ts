/**
 * 测试 iTunes Search API 搜索中文播客
 */
async function testItunesSearch(term: string) {
    const params = new URLSearchParams({
        term: term,
        media: 'podcast',
        entity: 'podcast',
        limit: '5',
        country: 'CN', // 搜索中国区
    });

    const url = `https://itunes.apple.com/search?${params}`;
    console.log(`Testing URL: ${url}`);

    try {
        const res = await fetch(url);
        const data = await res.json();

        console.log(`Found ${data.resultCount} results for "${term}"`);
        if (data.results) {
            data.results.forEach((item: any) => {
                console.log(`- [${item.collectionName}] by ${item.artistName}`);
                console.log(`  Feed: ${item.feedUrl}`);
                console.log(`  URL: ${item.collectionViewUrl}`);
            });
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

// 测试几个人物
const queries = ['Geoffrey Hinton', '李飞飞', 'Sam Altman', '乱翻书']; // 乱翻书是知名中文播客
async function main() {
    for (const q of queries) {
        console.log(`\n=== Searching: ${q} ===`);
        await testItunesSearch(q);
    }
}

main();
