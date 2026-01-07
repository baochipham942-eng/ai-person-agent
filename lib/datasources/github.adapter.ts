/**
 * GitHub DataSource Adapter
 */

import {
    DataSourceAdapter,
    DataSourceResult,
    FetchParams,
    createNormalizedItem,
    createSuccessResult,
    createErrorResult,
} from './adapter';
import { getUserRepos } from './github';

export class GitHubAdapter implements DataSourceAdapter {
    readonly sourceType = 'github' as const;
    readonly name = 'GitHub Adapter';

    shouldFetch(params: FetchParams): boolean {
        return !!params.handle;
    }

    async fetch(params: FetchParams): Promise<DataSourceResult> {
        if (!params.handle) {
            return createSuccessResult(this.sourceType, []);
        }

        try {
            const repos = await getUserRepos(params.handle, params.maxResults || 20, params.since);

            if (!repos || repos.length === 0) {
                return createSuccessResult(this.sourceType, []);
            }

            const items = repos.map(repo => createNormalizedItem({
                url: repo.url,
                title: repo.name,
                text: repo.description || '',
                publishedAt: repo.updatedAt ? new Date(repo.updatedAt) : null,
                sourceType: this.sourceType,
                isOfficial: true, // GitHub 官方账号
                confidence: 95,
                metadata: {
                    stars: repo.stars,
                    forks: repo.forks,
                    language: repo.language,
                    topics: repo.topics,
                },
            }));

            return createSuccessResult(this.sourceType, items);

        } catch (error) {
            console.error('[GitHubAdapter] Error:', error);
            return createErrorResult(this.sourceType, {
                code: 'API_ERROR',
                message: error instanceof Error ? error.message : String(error),
                retryable: true,
                cause: error,
            });
        }
    }
}

export const githubAdapter = new GitHubAdapter();
