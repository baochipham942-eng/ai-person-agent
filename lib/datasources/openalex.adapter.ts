/**
 * OpenAlex DataSource Adapter
 */

import {
    DataSourceAdapter,
    DataSourceResult,
    FetchParams,
    createNormalizedItem,
    createSuccessResult,
    createErrorResult,
} from './adapter';
import { getAuthorByOrcid, getAuthorWorks } from './openalex';

export class OpenAlexAdapter implements DataSourceAdapter {
    readonly sourceType = 'openalex' as const;
    readonly name = 'OpenAlex Academic Adapter';

    shouldFetch(params: FetchParams): boolean {
        return !!params.orcid;
    }

    async fetch(params: FetchParams): Promise<DataSourceResult> {
        if (!params.orcid) {
            return createSuccessResult(this.sourceType, []);
        }

        try {
            const author = await getAuthorByOrcid(params.orcid);
            if (!author) {
                return createSuccessResult(this.sourceType, []);
            }

            const works = await getAuthorWorks(author.id, params.maxResults || 20, params.since);

            if (!works || works.length === 0) {
                return createSuccessResult(this.sourceType, []);
            }

            const items = works.map(w => createNormalizedItem({
                url: w.url || w.id,
                title: w.title,
                text: w.abstract || `${w.title}. ${w.venue || ''}. Cited by ${w.citationCount}.`,
                publishedAt: w.publicationDate ? new Date(w.publicationDate) : null,
                sourceType: this.sourceType,
                isOfficial: true,
                confidence: 95,
                metadata: {
                    doi: w.doi,
                    citationCount: w.citationCount,
                    venue: w.venue,
                    authors: w.authors,
                },
            }));

            return createSuccessResult(this.sourceType, items);

        } catch (error) {
            console.error('[OpenAlexAdapter] Error:', error);
            return createErrorResult(this.sourceType, {
                code: 'API_ERROR',
                message: error instanceof Error ? error.message : String(error),
                retryable: true,
                cause: error,
            });
        }
    }
}

export const openalexAdapter = new OpenAlexAdapter();
