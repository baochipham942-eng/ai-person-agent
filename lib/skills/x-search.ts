/**
 * X/Twitter Search Skill (via Grok)
 *
 * 通过 Grok API 搜索 X/Twitter 内容：
 * - 真实推文搜索
 * - AI/科技相关过滤
 * - 结构化 JSON 输出
 */

// ============== 类型定义 ==============

export interface XPost {
    id: string;
    text: string;
    date: string;
    url: string;
    author?: string;
}

export interface XSearchResult {
    summary: string;
    sources: string[];
    posts: XPost[];
}

export interface XSearchConfig {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
}

// ============== 默认配置 ==============

const DEFAULT_CONFIG: Required<Omit<XSearchConfig, 'apiKey'>> & { apiKey?: string } = {
    apiKey: undefined,
    baseUrl: 'https://api.x.ai/v1',
    model: 'grok-2-1212',
};

// ============== Skill 实现 ==============

export class XSearchSkill {
    private config: typeof DEFAULT_CONFIG;

    constructor(config: XSearchConfig = {}) {
        this.config = {
            ...DEFAULT_CONFIG,
            ...config,
            baseUrl: config.baseUrl || process.env.XAI_BASE_URL || DEFAULT_CONFIG.baseUrl,
        };
    }

    /**
     * 搜索 X 上的内容
     */
    async search(
        query: string,
        options: {
            maxResults?: number;
            xHandle?: string;
        } = {}
    ): Promise<XSearchResult> {
        const apiKey = this.config.apiKey || process.env.XAI_API_KEY;

        if (!apiKey) {
            console.warn('[XSearch] XAI_API_KEY not configured');
            return { summary: '', sources: [], posts: [] };
        }

        try {
            const systemPrompt = options.xHandle
                ? `You are an AI research assistant. Search for recent posts from @${options.xHandle} on X that are SPECIFICALLY about:
- Artificial Intelligence, Machine Learning, Deep Learning
- AI products, models, research (GPT, Claude, Gemini, LLMs, etc.)
- AI companies and industry news
- Technical insights

IGNORE posts about policies, elections, or personal opinions unrelated to tech.

CRITICAL: Return the result as a STRICT JSON object with a single key "posts", which is an array of objects. Each object MUST have:
- "date": string (e.g. "2024-01-01")
- "text": string (the exact full content of the tweet)
- "url": string (the direct https://x.com link)

Do not output any markdown formatting or explanations, just the raw JSON string.`
                : `You are an AI research assistant. Search for recent posts about "${query}" on X related to AI/ML. Return the result as a STRICT JSON object with a "posts" array containing { "date", "text", "url" }.`;

            const userPrompt = options.xHandle
                ? `Find the ${options.maxResults || 10} most recent AI-related posts from @${options.xHandle}.`
                : `Find ${options.maxResults || 10} recent AI-related posts about: ${query}`;

            const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    search_parameters: {
                        mode: 'on',
                        return_citations: true,
                        max_search_results: options.maxResults || 10,
                        sources: [{ type: 'x' }],
                    },
                    temperature: 0.1,
                    response_format: { type: 'json_object' }
                }),
            });

            if (!response.ok) {
                console.error('[XSearch] API error:', await response.text());
                return { summary: '', sources: [], posts: [] };
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';

            let posts: XPost[] = [];
            try {
                const cleanContent = content.split('\n').filter((line: string) => !line.trim().startsWith('>')).join('\n');
                const jsonStart = cleanContent.indexOf('{');
                const jsonEnd = cleanContent.lastIndexOf('}');
                if (jsonStart === -1) throw new Error('No JSON start found');

                const jsonStr = cleanContent.substring(jsonStart, jsonEnd + 1);
                const parsed = JSON.parse(jsonStr);

                if (parsed.posts && Array.isArray(parsed.posts)) {
                    posts = parsed.posts.map((p: any) => {
                        const idMatch = (p.url || '').match(/status\/(\d+)/);
                        const authorMatch = (p.url || '').match(/x\.com\/([^/]+)/);
                        return {
                            id: idMatch ? idMatch[1] : crypto.randomUUID(),
                            text: p.text || '',
                            date: p.date || '',
                            url: p.url || '',
                            author: authorMatch ? authorMatch[1] : options.xHandle,
                        };
                    });
                }
            } catch (e) {
                console.error('[XSearch] Failed to parse JSON:', e);
            }

            const sources = posts.map(p => p.url).filter(Boolean);

            return {
                summary: JSON.stringify(posts.slice(0, 3)),
                sources,
                posts,
            };
        } catch (error) {
            console.error('[XSearch] Error:', error);
            return { summary: '', sources: [], posts: [] };
        }
    }

    /**
     * 获取人物在 X 上的活动
     */
    async getPersonActivity(
        personName: string,
        xHandle?: string
    ): Promise<XSearchResult> {
        return this.search(personName, {
            maxResults: 15,
            xHandle,
        });
    }
}

// 导出默认实例
export const xSearch = new XSearchSkill();
