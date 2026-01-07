/**
 * Perplexity DataSource Adapter
 * 
 * 高精度搜索，成本敏感，用于填充缺失信息和身份验证
 */

import {
    DataSourceAdapter,
    DataSourceResult,
    FetchParams,
    createNormalizedItem,
    createSuccessResult,
    createErrorResult,
} from './adapter';
import { searchPerplexity } from './perplexity';

export class PerplexityAdapter implements DataSourceAdapter {
    readonly sourceType = 'perplexity' as const;
    readonly name = 'Perplexity Sniper Adapter';

    /**
     * Perplexity 是成本敏感的精准搜索，默认不自动执行
     * 需要显式设置 forceRefresh 或特定条件才触发
     */
    shouldFetch(params: FetchParams): boolean {
        return !!params.forceRefresh;
    }

    async fetch(params: FetchParams): Promise<DataSourceResult> {
        const searchName = params.person.englishName || params.person.name;

        try {
            const query = `Who is ${searchName}? What are their key contributions to AI/technology? Provide specific facts with dates.`;

            const result = await searchPerplexity(query,
                'You are a precise research assistant. Provide only verified facts about the person.'
            );

            if (!result.content) {
                return createSuccessResult(this.sourceType, []);
            }

            const item = createNormalizedItem({
                url: `perplexity:${searchName}`,
                title: `${searchName} - Perplexity Research`,
                text: result.content,
                publishedAt: new Date(),
                sourceType: this.sourceType,
                isOfficial: false,
                confidence: 85,
                metadata: {
                    citations: result.citations,
                    usage: result.usage,
                },
            });

            return createSuccessResult(this.sourceType, [item]);

        } catch (error) {
            console.error('[PerplexityAdapter] Error:', error);
            return createErrorResult(this.sourceType, {
                code: 'API_ERROR',
                message: error instanceof Error ? error.message : String(error),
                retryable: false, // Perplexity 错误通常不应重试以节省成本
                cause: error,
            });
        }
    }
}

export const perplexityAdapter = new PerplexityAdapter();
