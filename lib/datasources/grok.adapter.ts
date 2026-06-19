/**
 * Grok DataSource Adapter
 * 
 * 用于从 X.AI Grok API 获取 X/Twitter 内容
 * 这是 Adapter 模式的模板示例
 */

import {
    DataSourceAdapter,
    DataSourceResult,
    FetchParams,
    createNormalizedItem,
    createSuccessResult,
    createErrorResult,
} from './adapter';
import { fetchXPostsWithXaiSearch, normalizeXHandle } from './xai-x-search';

// ============== 配置 ==============

const XAI_API_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

// ============== Adapter 实现 ==============

export class GrokAdapter implements DataSourceAdapter {
    readonly sourceType = 'x' as const;
    readonly name = 'Grok X Adapter';

    /**
     * 检查是否应该获取 - 需要 xHandle
     */
    shouldFetch(params: FetchParams): boolean {
        return Boolean(normalizeXHandle(params.handle));
    }

    /**
     * 获取 X 内容
     */
    async fetch(params: FetchParams): Promise<DataSourceResult> {
        const apiKey = process.env.XAI_API_KEY;

        if (!apiKey) {
            console.warn('[GrokAdapter] XAI_API_KEY not configured');
            return createSuccessResult(this.sourceType, []);
        }

        const xHandle = normalizeXHandle(params.handle);
        if (!xHandle) {
            return createSuccessResult(this.sourceType, []);
        }

        const searchName = params.person.englishName || params.person.name;
        const maxResults = params.maxResults || 15;

        try {
            const result = await fetchXPostsWithXaiSearch({
                apiKey,
                baseUrl: XAI_API_URL,
                query: searchName,
                maxResults,
                xHandle,
                since: params.since,
            });
            const posts = result.posts;
            console.log(`[GrokAdapter] Parsed ${posts.length} posts from response`);

            // 转换为 NormalizedItem
            const rawItems = posts
                .filter(post => normalizeXHandle(post.author)?.toLowerCase() === xHandle.toLowerCase())
                .map(post => createNormalizedItem({
                    url: post.url,
                    title: post.text || `Post by @${post.author}`,
                    text: post.text,
                    publishedAt: parsePostDate(post.date),
                    sourceType: this.sourceType,
                    isOfficial: true,
                    confidence: 85,
                    metadata: {
                        author: post.author,
                        postId: post.id,
                        citations: result.citations,
                    },
                }));

            const filtered = posts.length - rawItems.length;
            console.log(`[GrokAdapter] ${posts.length} fetched, ${rawItems.length} validated, ${filtered} filtered`);

            return createSuccessResult(this.sourceType, rawItems, {
                fetched: posts.length,
                validated: rawItems.length,
                filtered,
            });

        } catch (error) {
            console.error('[GrokAdapter] Error:', error);
            return createErrorResult(this.sourceType, {
                code: 'API_ERROR',
                message: error instanceof Error ? error.message : String(error),
                retryable: true,
                cause: error,
            });
        }
    }

}

function parsePostDate(value: string): Date {
    const parsed = value ? new Date(value) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
}

// 导出单例
export const grokAdapter = new GrokAdapter();
