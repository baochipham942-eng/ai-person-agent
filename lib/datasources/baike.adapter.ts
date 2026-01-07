/**
 * 百度百科 DataSource Adapter
 */

import {
    DataSourceAdapter,
    DataSourceResult,
    FetchParams,
    createNormalizedItem,
    createSuccessResult,
    createErrorResult,
} from './adapter';
import { getBaikePersonInfoByApi, fetchBaikeCareerData } from './baike';

export class BaikeAdapter implements DataSourceAdapter {
    readonly sourceType = 'baike' as const;
    readonly name = 'Baidu Baike Adapter';

    /**
     * 百度百科主要用于中文人物
     */
    shouldFetch(params: FetchParams): boolean {
        const chineseRegex = /[\u4e00-\u9fff]/;
        return chineseRegex.test(params.person.name) ||
            params.person.aliases.some(a => chineseRegex.test(a));
    }

    async fetch(params: FetchParams): Promise<DataSourceResult> {
        // 优先使用中文名
        const chineseRegex = /[\u4e00-\u9fff]/;
        const searchName = chineseRegex.test(params.person.name)
            ? params.person.name
            : params.person.aliases.find(a => chineseRegex.test(a)) || params.person.name;

        try {
            const info = await getBaikePersonInfoByApi(searchName);

            if (!info) {
                return createSuccessResult(this.sourceType, []);
            }

            const items = [];

            // 基本信息作为一条记录
            if (info.desc) {
                items.push(createNormalizedItem({
                    url: info.url,
                    title: info.name,
                    text: info.desc,
                    publishedAt: null,
                    sourceType: this.sourceType,
                    isOfficial: false,
                    confidence: 75,
                    metadata: {
                        gender: info.gender,
                        birthDate: info.birthDate,
                        nationality: info.nationality,
                        education: info.education,
                        achievements: info.achievements,
                        imageUrl: info.imageUrl,
                    },
                }));
            }

            // 尝试提取职业经历
            const careerItems = await fetchBaikeCareerData(searchName);
            for (const career of careerItems) {
                items.push(createNormalizedItem({
                    url: `${info.url}#${career.orgName}`,
                    title: career.orgName,
                    text: career.role || career.type,
                    publishedAt: career.startDate ? new Date(career.startDate) : null,
                    sourceType: this.sourceType,
                    isOfficial: false,
                    confidence: 70,
                    metadata: {
                        type: career.type,
                        endDate: career.endDate,
                    },
                }));
            }

            return createSuccessResult(this.sourceType, items);

        } catch (error) {
            console.error('[BaikeAdapter] Error:', error);
            return createErrorResult(this.sourceType, {
                code: 'API_ERROR',
                message: error instanceof Error ? error.message : String(error),
                retryable: true,
                cause: error,
            });
        }
    }
}

export const baikeAdapter = new BaikeAdapter();
