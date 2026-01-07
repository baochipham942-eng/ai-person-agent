/**
 * Podcast (iTunes) DataSource Adapter
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
import { searchPodcasts } from './itunes';
import { isAboutPerson, PersonContext as IdentityContext } from '@/lib/utils/identity';

export class PodcastAdapter implements DataSourceAdapter {
    readonly sourceType = 'podcast' as const;
    readonly name = 'Podcast (iTunes) Adapter';

    async fetch(params: FetchParams): Promise<DataSourceResult> {
        const searchName = params.person.englishName || params.person.name;

        try {
            const contextKeywords = [...params.person.organizations, 'AI', 'Tech', 'Startup'];
            const podcasts = await searchPodcasts(searchName, params.maxResults || 5, [searchName, ...contextKeywords]);

            if (!podcasts || podcasts.length === 0) {
                return createSuccessResult(this.sourceType, []);
            }

            const rawItems = podcasts.map(p => createNormalizedItem({
                url: p.url,
                title: p.title,
                text: p.author,
                publishedAt: p.publishedAt || null,
                sourceType: this.sourceType,
                isOfficial: false,
                confidence: 60,
                metadata: {
                    thumbnailUrl: p.thumbnailUrl,
                    feedUrl: p.feedUrl,
                    categories: p.categories,
                },
            }));

            // 身份验证
            const identityContext: IdentityContext = {
                name: params.person.name,
                englishName: params.person.englishName || searchName,
                aliases: params.person.aliases,
                organizations: params.person.organizations,
                occupations: params.person.occupations,
            };

            const validated = rawItems.filter(item =>
                isAboutPerson(`${item.title} ${item.text}`, identityContext)
            );

            return createSuccessResult(this.sourceType, validated, {
                fetched: rawItems.length,
                validated: validated.length,
                filtered: rawItems.length - validated.length,
            });

        } catch (error) {
            console.error('[PodcastAdapter] Error:', error);
            return createErrorResult(this.sourceType, {
                code: 'API_ERROR',
                message: error instanceof Error ? error.message : String(error),
                retryable: true,
                cause: error,
            });
        }
    }
}

export const podcastAdapter = new PodcastAdapter();
