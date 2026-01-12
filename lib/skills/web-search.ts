/**
 * Web Search Skill (Exa.ai)
 *
 * 基于 Exa.ai 的网页搜索能力，支持：
 * - 神经搜索（语义）
 * - 关键词搜索
 * - 自动模式选择
 * - 内容提取
 */

// ============== 类型定义 ==============

export interface WebSearchResult {
    url: string;
    title: string;
    text: string;
    publishedDate?: string;
    author?: string;
}

export interface WebSearchOptions {
    query: string;
    numResults?: number;
    includeDomains?: string[];
    excludeDomains?: string[];
    startPublishedDate?: string;
    endPublishedDate?: string;
    useAutoprompt?: boolean;
    type?: 'neural' | 'keyword' | 'auto';
}

export interface WebSearchConfig {
    apiKey?: string;
    apiUrl?: string;
    maxContentChars?: number;
}

// ============== 默认配置 ==============

const DEFAULT_CONFIG: Required<Omit<WebSearchConfig, 'apiKey'>> & { apiKey?: string } = {
    apiKey: undefined,
    apiUrl: 'https://api.exa.ai',
    maxContentChars: 5000,
};

// ============== Skill 实现 ==============

export class WebSearchSkill {
    private config: typeof DEFAULT_CONFIG;

    constructor(config: WebSearchConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * 执行网页搜索
     */
    async search(options: WebSearchOptions): Promise<WebSearchResult[]> {
        const apiKey = this.config.apiKey || process.env.EXA_API_KEY;

        if (!apiKey) {
            console.warn('[WebSearch] EXA_API_KEY not configured');
            return [];
        }

        try {
            // 1. 搜索
            const searchResponse = await fetch(`${this.config.apiUrl}/search`, {
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
                console.error('[WebSearch] Search failed:', await searchResponse.text());
                return [];
            }

            const searchData = await searchResponse.json();
            const results = searchData.results || [];

            if (results.length === 0) {
                return [];
            }

            // 2. 获取内容
            const urls = results.map((r: any) => r.url);
            const contentsResponse = await fetch(`${this.config.apiUrl}/contents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                },
                body: JSON.stringify({
                    ids: urls,
                    text: { maxCharacters: this.config.maxContentChars },
                }),
            });

            if (!contentsResponse.ok) {
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
            console.error('[WebSearch] Error:', error);
            return [];
        }
    }

    /**
     * 搜索人物相关内容
     */
    async searchPerson(
        personName: string,
        options: {
            aliases?: string[];
            seedDomains?: string[];
            since?: Date;
            aiRelated?: boolean;
        } = {}
    ): Promise<WebSearchResult[]> {
        const allResults: WebSearchResult[] = [];
        const startPublishedDate = options.since?.toISOString();

        // 策略1：搜索官方域名
        if (options.seedDomains && options.seedDomains.length > 0) {
            const officialResults = await this.search({
                query: personName,
                numResults: 10,
                includeDomains: options.seedDomains,
                type: 'keyword',
                startPublishedDate,
            });
            allResults.push(...officialResults);
        }

        // 策略2：泛搜索
        const names = [personName, ...(options.aliases?.slice(0, 2) || [])];
        let query = names.map(n => `"${n}"`).join(' OR ');

        // 如果需要 AI 相关过滤
        if (options.aiRelated !== false) {
            const aiKeywords = '(AI OR "artificial intelligence" OR LLM OR "machine learning" OR "deep learning" OR GPT)';
            query = `(${query}) AND ${aiKeywords}`;
        }

        const generalResults = await this.search({
            query,
            numResults: 20,
            excludeDomains: ['wikipedia.org', 'baike.baidu.com'],
            type: 'auto',
            startPublishedDate,
        });

        allResults.push(...generalResults);

        // 去重
        const seen = new Set<string>();
        return allResults.filter(r => {
            if (seen.has(r.url)) return false;
            seen.add(r.url);
            return true;
        });
    }

    /**
     * 搜索传记内容
     */
    async searchBiography(personName: string): Promise<WebSearchResult[]> {
        const allResults: WebSearchResult[] = [];

        // 策略1：传记类网站
        const biographyResults = await this.search({
            query: `"${personName}" biography career education history`,
            numResults: 5,
            includeDomains: [
                'britannica.com',
                'crunchbase.com',
                'linkedin.com',
                'forbes.com',
                'bloomberg.com',
            ],
            type: 'auto',
        });
        allResults.push(...biographyResults);

        // 策略2：Wikipedia
        const wikiResults = await this.search({
            query: `"${personName}" site:en.wikipedia.org OR site:zh.wikipedia.org`,
            numResults: 2,
            type: 'keyword',
        });
        allResults.push(...wikiResults);

        // 去重
        const seen = new Set<string>();
        return allResults.filter(r => {
            if (seen.has(r.url)) return false;
            seen.add(r.url);
            return true;
        });
    }
}

// 导出默认实例
export const webSearch = new WebSearchSkill();
