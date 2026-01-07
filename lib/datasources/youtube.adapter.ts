/**
 * YouTube DataSource Adapter
 */

import {
    DataSourceAdapter,
    DataSourceResult,
    FetchParams,
    createNormalizedItem,
    createSuccessResult,
    createErrorResult,
} from './adapter';
import { getChannelVideos, searchYouTubeVideos } from './youtube';
import { isAboutPerson, PersonContext as IdentityContext } from '@/lib/utils/identity';

export class YouTubeAdapter implements DataSourceAdapter {
    readonly sourceType = 'youtube' as const;
    readonly name = 'YouTube Adapter';

    async fetch(params: FetchParams): Promise<DataSourceResult> {
        const searchName = params.person.englishName || params.person.name;

        try {
            let videos;
            const isOfficial = !!params.channelId;

            if (params.channelId) {
                videos = await getChannelVideos(params.channelId, params.maxResults || 20, params.since);
            } else {
                const contextKeywords = [...params.person.organizations, 'AI', 'Artificial Intelligence'];
                const query = `"${searchName}" (${contextKeywords.map(k => `"${k}"`).join(' | ')})`;
                videos = await searchYouTubeVideos(query, params.maxResults || 10, [searchName, ...params.person.organizations], params.since);
            }

            if (!videos || videos.length === 0) {
                return createSuccessResult(this.sourceType, []);
            }

            const rawItems = videos.map(v => createNormalizedItem({
                url: v.url,
                title: v.title,
                text: v.description,
                publishedAt: v.publishedAt ? new Date(v.publishedAt) : null,
                sourceType: this.sourceType,
                isOfficial,
                confidence: isOfficial ? 90 : 60,
                metadata: { videoId: v.id, thumbnailUrl: v.thumbnailUrl },
            }));

            // 非官方频道需要身份验证
            if (isOfficial) {
                return createSuccessResult(this.sourceType, rawItems);
            }

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
            console.error('[YouTubeAdapter] Error:', error);
            return createErrorResult(this.sourceType, {
                code: 'API_ERROR',
                message: error instanceof Error ? error.message : String(error),
                retryable: true,
                cause: error,
            });
        }
    }
}

export const youtubeAdapter = new YouTubeAdapter();
