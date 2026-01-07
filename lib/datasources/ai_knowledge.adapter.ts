/**
 * AI Knowledge DataSource Adapter
 * 
 * 兜底策略：当其他数据源找不到数据时，使用 LLM 知识库生成
 */

import {
    DataSourceAdapter,
    DataSourceResult,
    FetchParams,
    createNormalizedItem,
    createSuccessResult,
    createErrorResult,
} from './adapter';
import { fetchCareerFromAiKnowledge } from './ai_knowledge';

export class AIKnowledgeAdapter implements DataSourceAdapter {
    readonly sourceType = 'ai_knowledge' as const;
    readonly name = 'AI Knowledge Fallback Adapter';

    /**
     * AI 知识库是兜底策略，默认不自动执行
     * 需要 forceRefresh 显式触发
     */
    shouldFetch(params: FetchParams): boolean {
        return !!params.forceRefresh;
    }

    async fetch(params: FetchParams): Promise<DataSourceResult> {
        const searchName = params.person.englishName || params.person.name;
        const context = params.person.organizations.join(', ');

        try {
            const careerItems = await fetchCareerFromAiKnowledge(searchName, context);

            if (!careerItems || careerItems.length === 0) {
                return createSuccessResult(this.sourceType, []);
            }

            const items = careerItems.map(item => createNormalizedItem({
                url: `ai-knowledge:${searchName}#${item.orgName}`,
                title: item.orgName,
                text: item.role || item.type,
                publishedAt: item.startDate ? new Date(item.startDate) : null,
                sourceType: this.sourceType,
                isOfficial: false,
                confidence: 60, // AI 生成的置信度较低
                metadata: {
                    type: item.type,
                    endDate: item.endDate,
                    source: 'llm-generated',
                },
            }));

            return createSuccessResult(this.sourceType, items);

        } catch (error) {
            console.error('[AIKnowledgeAdapter] Error:', error);
            return createErrorResult(this.sourceType, {
                code: 'API_ERROR',
                message: error instanceof Error ? error.message : String(error),
                retryable: true,
                cause: error,
            });
        }
    }
}

export const aiKnowledgeAdapter = new AIKnowledgeAdapter();
