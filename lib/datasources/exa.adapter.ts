/**
 * Exa DataSource Adapter
 * 用于从 Exa (Metaphor) API 搜索网页内容
 */

import {
    DataSourceAdapter,
    DataSourceResult,
    FetchParams,
    NormalizedItem,
    createNormalizedItem,
    createSuccessResult,
    createErrorResult,
} from './adapter';
import { searchExa, searchPersonContent } from './exa';
import { isAboutPerson, PersonContext as IdentityContext } from '@/lib/utils/identity';

export class ExaAdapter implements DataSourceAdapter {
    readonly sourceType = 'exa' as const;
    readonly name = 'Exa Web Search Adapter';

    async fetch(params: FetchParams): Promise<DataSourceResult> {
        const searchName = params.person.englishName || params.person.name;

        try {
            const results = await searchPersonContent(
                searchName,
                params.person.aliases,
                params.seedDomains || [],
                params.since
            );

            if (!results || results.length === 0) {
                return createSuccessResult(this.sourceType, []);
            }

            // 转换为 NormalizedItem
            const rawItems = results.map(r => {
                let isOfficial = false;
                if (params.seedDomains && params.seedDomains.length > 0) {
                    try {
                        const hostname = new URL(r.url).hostname;
                        isOfficial = params.seedDomains.some(d => hostname.includes(d));
                    } catch { }
                }

                return createNormalizedItem({
                    url: r.url,
                    title: r.title,
                    text: r.text,
                    publishedAt: r.publishedDate ? new Date(r.publishedDate) : null,
                    sourceType: this.sourceType,
                    isOfficial,
                    confidence: isOfficial ? 90 : 70,
                    metadata: { author: r.author },
                });
            });

            // 身份验证过滤
            const identityContext: IdentityContext = {
                name: params.person.name,
                englishName: params.person.englishName || searchName,
                aliases: params.person.aliases,
                organizations: params.person.organizations,
                occupations: params.person.occupations,
            };

            const validatedItems: NormalizedItem[] = [];
            let filteredCount = 0;

            for (const item of rawItems) {
                if (item.isOfficial || isAboutPerson(`${item.title} ${item.text}`, identityContext)) {
                    validatedItems.push(item);
                } else {
                    filteredCount++;
                }
            }

            console.log(`[ExaAdapter] ${rawItems.length} fetched, ${validatedItems.length} validated, ${filteredCount} filtered`);

            return createSuccessResult(this.sourceType, validatedItems, {
                fetched: rawItems.length,
                validated: validatedItems.length,
                filtered: filteredCount,
            });

        } catch (error) {
            console.error('[ExaAdapter] Error:', error);
            return createErrorResult(this.sourceType, {
                code: 'API_ERROR',
                message: error instanceof Error ? error.message : String(error),
                retryable: true,
                cause: error,
            });
        }
    }
}

export const exaAdapter = new ExaAdapter();
