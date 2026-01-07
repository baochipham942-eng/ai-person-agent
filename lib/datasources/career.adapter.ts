/**
 * Career DataSource Adapter
 * 从 Wikidata 获取职业经历
 */

import {
    DataSourceAdapter,
    DataSourceResult,
    FetchParams,
    createNormalizedItem,
    createSuccessResult,
    createErrorResult,
} from './adapter';
import { fetchRawCareerData } from './career';

export class CareerAdapter implements DataSourceAdapter {
    readonly sourceType = 'career' as const;
    readonly name = 'Career (Wikidata) Adapter';

    shouldFetch(params: FetchParams): boolean {
        return !!params.qid;
    }

    async fetch(params: FetchParams): Promise<DataSourceResult> {
        if (!params.qid) {
            return createSuccessResult(this.sourceType, []);
        }

        try {
            const rawData = await fetchRawCareerData(params.qid);

            if (!rawData || rawData.length === 0) {
                return createSuccessResult(this.sourceType, []);
            }

            const items = rawData.map(item => createNormalizedItem({
                url: `wikidata:${params.qid}#${item.orgName}`,
                title: item.orgName,
                text: item.role || item.type,
                publishedAt: item.startDate ? new Date(item.startDate) : null,
                sourceType: this.sourceType,
                isOfficial: true,
                confidence: 85,
                metadata: {
                    type: item.type,
                    orgQid: item.orgQid,
                    role: item.role,
                    endDate: item.endDate,
                    _rawData: item, // 保留原始数据用于后续处理
                },
            }));

            return createSuccessResult(this.sourceType, items);

        } catch (error) {
            console.error('[CareerAdapter] Error:', error);
            return createErrorResult(this.sourceType, {
                code: 'API_ERROR',
                message: error instanceof Error ? error.message : String(error),
                retryable: true,
                cause: error,
            });
        }
    }
}

export const careerAdapter = new CareerAdapter();
