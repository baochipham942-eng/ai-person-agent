/**
 * Exa API 封装
 * 用于搜索网页内容
 * https://exa.ai/
 */

interface ExaSearchResult {
    url: string;
    title: string;
    text: string;
    publishedDate?: string;
    author?: string;
}

interface ExaSearchOptions {
    query: string;
    numResults?: number;
    includeDomains?: string[];
    excludeDomains?: string[];
    startPublishedDate?: string;
    endPublishedDate?: string;
    useAutoprompt?: boolean;
    type?: 'neural' | 'keyword' | 'auto';
}

const EXA_API_URL = 'https://api.exa.ai';

/**
 * 使用 Exa 搜索网页内容
 */
export async function searchExa(options: ExaSearchOptions): Promise<ExaSearchResult[]> {
    const apiKey = process.env.EXA_API_KEY;

    if (!apiKey) {
        console.warn('EXA_API_KEY not configured');
        return [];
    }

    try {
        // 1. 搜索
        const searchResponse = await fetch(`${EXA_API_URL}/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
            body: JSON.stringify({
                query: options.query,
                numResults: options.numResults || 10,
                includeDomains: options.includeDomains,
                excludeDomains: options.excludeDomains,
                startPublishedDate: options.startPublishedDate,
                endPublishedDate: options.endPublishedDate,
                useAutoprompt: options.useAutoprompt ?? true,
                type: options.type || 'auto',
            }),
        });

        if (!searchResponse.ok) {
            console.error('Exa search failed:', await searchResponse.text());
            return [];
        }

        const searchData = await searchResponse.json();
        const results = searchData.results || [];

        if (results.length === 0) {
            return [];
        }

        // 2. 获取内容
        const urls = results.map((r: any) => r.url);
        const contentsResponse = await fetch(`${EXA_API_URL}/contents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
            body: JSON.stringify({
                ids: urls,
                text: { maxCharacters: 5000 },
            }),
        });

        if (!contentsResponse.ok) {
            // 如果获取内容失败，返回基本结果
            return results.map((r: any) => ({
                url: r.url,
                title: r.title || '',
                text: '',
                publishedDate: r.publishedDate,
                author: r.author,
            }));
        }

        const contentsData = await contentsResponse.json();
        const contentsMap = new Map(
            (contentsData.results || []).map((c: any) => [c.url, c])
        );

        return results.map((r: any) => {
            const content = contentsMap.get(r.url) as any;
            return {
                url: r.url,
                title: r.title || content?.title || '',
                text: content?.text || '',
                publishedDate: r.publishedDate || content?.publishedDate,
                author: r.author || content?.author,
            };
        });
    } catch (error) {
        console.error('Exa search error:', error);
        return [];
    }
}

/**
 * 搜索人物相关内容
 * @param personName 人物姓名
 * @param aliases 别名列表
 * @param seedDomains 优先搜索的域名（官方网站）
 */
export async function searchPersonContent(
    personName: string,
    aliases: string[] = [],
    seedDomains: string[] = []
): Promise<ExaSearchResult[]> {
    const allResults: ExaSearchResult[] = [];

    // 策略1：先搜索官方域名（如果有）
    if (seedDomains.length > 0) {
        const officialResults = await searchExa({
            query: personName,
            numResults: 10,
            includeDomains: seedDomains,
            type: 'keyword',
        });
        allResults.push(...officialResults);
    }

    // 策略2：泛搜索 (严格限制 AI 相关)
    const names = [personName, ...aliases.slice(0, 2)]; // 最多用3个名字
    const nameQuery = names.map(n => `"${n}"`).join(' OR ');

    // 强制包含 AI 相关词汇
    const aiKeywords = '(AI OR "artificial intelligence" OR LLM OR "large language model" OR "machine learning" OR "deep learning" OR GPT)';
    const query = `(${nameQuery}) AND ${aiKeywords}`;

    const generalResults = await searchExa({
        query,
        numResults: 20,
        excludeDomains: ['wikipedia.org', 'baike.baidu.com'], // 排除百科类
        type: 'auto',
    });

    allResults.push(...generalResults);

    // 去重（按 URL）
    const seen = new Set<string>();
    return allResults.filter(r => {
        if (seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
    });
}
