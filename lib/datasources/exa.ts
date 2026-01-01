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
 * @param since 可选，只返回此时间之后发布的内容（用于增量更新）
 */
export async function searchPersonContent(
    personName: string,
    aliases: string[] = [],
    seedDomains: string[] = [],
    since?: Date
): Promise<ExaSearchResult[]> {
    const allResults: ExaSearchResult[] = [];
    const startPublishedDate = since?.toISOString();

    // 策略1：先搜索官方域名（如果有）
    if (seedDomains.length > 0) {
        const officialResults = await searchExa({
            query: personName,
            numResults: 10,
            includeDomains: seedDomains,
            type: 'keyword',
            startPublishedDate,
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
        startPublishedDate,
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

/**
 * 专门搜索传记内容，用于职业时间线补全
 * 目标：获取完整的职业和教育经历时间线
 * @param personName 人物姓名
 */
export async function searchBiographyContent(
    personName: string
): Promise<ExaSearchResult[]> {
    const allResults: ExaSearchResult[] = [];

    // 策略1：搜索包含"biography"或类似关键词的内容
    const biographyQuery = `"${personName}" biography career education history`;
    const biographyResults = await searchExa({
        query: biographyQuery,
        numResults: 5,
        includeDomains: [
            'britannica.com',   // Britannica 有详细传记
            'crunchbase.com',   // Crunchbase 有创业经历
            'linkedin.com',     // LinkedIn 有职业历史
            'forbes.com',       // Forbes 有人物传记
            'bloomberg.com',    // Bloomberg 商业传记
        ],
        type: 'auto',
    });
    allResults.push(...biographyResults);

    // 策略2：搜索 Wikipedia（单独处理，有时间线信息最全）
    const wikiQuery = `"${personName}" site:en.wikipedia.org OR site:zh.wikipedia.org`;
    const wikiResults = await searchExa({
        query: wikiQuery,
        numResults: 2,
        type: 'keyword',
    });
    allResults.push(...wikiResults);

    // 策略3：中文百科（针对中文人名）
    const baikeQuery = `"${personName}" 个人简介 经历`;
    const baikeResults = await searchExa({
        query: baikeQuery,
        numResults: 3,
        type: 'auto',
    });
    allResults.push(...baikeResults);

    // 去重
    const seen = new Set<string>();
    return allResults.filter(r => {
        if (seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
    });
}

