/**
 * X/Twitter Search Skill (via Grok)
 *
 * 通过 Grok API 搜索 X/Twitter 内容：
 * - 真实推文搜索
 * - AI/科技相关过滤
 * - 结构化 JSON 输出
 */

import { fetchXPostsWithXaiSearch } from '@/lib/datasources/xai-x-search';

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
    model: 'grok-4.3',
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
            const result = await fetchXPostsWithXaiSearch({
                apiKey,
                baseUrl: this.config.baseUrl,
                model: this.config.model,
                query,
                maxResults: options.maxResults || 10,
                xHandle: options.xHandle,
            });

            const sources = result.posts.map(p => p.url).filter(Boolean);

            return {
                summary: JSON.stringify(result.posts.slice(0, 3)),
                sources,
                posts: result.posts,
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
