/**
 * 测试 iTunes Search API 搜索播客单集 (Episodes)
 * 目标：找到人物作为嘉宾的访谈
 */
async function testItunesEpisodes(term: string) {
    const params = new URLSearchParams({
        term: term,
        media: 'podcast',
        entity: 'podcastEpisode', // 改为搜索单集
        limit: '10',
        country: 'CN',
    });

    const url = `https://itunes.apple.com/search?${params}`;
    console.log(`Testing URL: ${url}`);

    try {
        const res = await fetch(url);
        const data = await res.json();

        console.log(`Found ${data.resultCount} episodes for "${term}"`);
        if (data.results) {
            data.results.forEach((item: any, index: number) => {
                console.log(`${index + 1}. [${item.trackName}]`);
                console.log(`   Show: ${item.collectionName}`);
                console.log(`   Link: ${item.trackViewUrl}`);
                console.log(`   Date: ${item.releaseDate}`);
                console.log('---');
            });
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

// 测试人物
const queries = ['Elon Musk', 'Sam Altman', '黄仁勋'];
async function main() {
    for (const q of queries) {
        console.log(`\n=== Searching Episodes: ${q} ===`);
        await testItunesEpisodes(q);
    }
}

main();
