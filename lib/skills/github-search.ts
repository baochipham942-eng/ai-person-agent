/**
 * GitHub Search Skill
 *
 * GitHub API 搜索能力：
 * - 获取用户公开仓库
 * - 按 star 排序
 * - 支持增量更新
 */

// ============== 类型定义 ==============

export interface GitHubRepo {
    id: number;
    name: string;
    fullName: string;
    description: string | null;
    url: string;
    stars: number;
    forks: number;
    language: string | null;
    updatedAt: string;
    topics: string[];
}

export interface GitHubSearchConfig {
    token?: string;
    apiUrl?: string;
}

// ============== 默认配置 ==============

const DEFAULT_CONFIG: Required<Omit<GitHubSearchConfig, 'token'>> & { token?: string } = {
    token: undefined,
    apiUrl: 'https://api.github.com',
};

// ============== Skill 实现 ==============

export class GitHubSearchSkill {
    private config: typeof DEFAULT_CONFIG;

    constructor(config: GitHubSearchConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * 获取用户的公开仓库
     */
    async getUserRepos(
        username: string,
        options: {
            limit?: number;
            since?: Date;
        } = {}
    ): Promise<GitHubRepo[]> {
        if (!username) {
            console.warn('[GitHubSearch] No username provided');
            return [];
        }

        const limit = options.limit || 20;

        try {
            const headers: HeadersInit = {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'GitHubSearchSkill',
            };

            const token = this.config.token || process.env.GITHUB_TOKEN;
            if (token) {
                headers['Authorization'] = `token ${token}`;
            }

            // 构建查询条件
            let query = `user:${username}`;
            if (options.since) {
                const pushedAfter = options.since.toISOString().split('T')[0];
                query += ` pushed:>${pushedAfter}`;
            }

            // 使用 Search API 按 star 排序
            const response = await fetch(
                `${this.config.apiUrl}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${limit}`,
                { headers }
            );

            if (!response.ok) {
                // Fallback: 直接获取用户仓库列表
                console.warn(`[GitHubSearch] Search API failed (${response.status}), trying fallback...`);
                return this.getUserReposDirect(username, limit, headers);
            }

            const data = await response.json();
            const items = data.items || [];

            return items.map((repo: any) => ({
                id: repo.id,
                name: repo.name,
                fullName: repo.full_name,
                description: repo.description,
                url: repo.html_url,
                stars: repo.stargazers_count || 0,
                forks: repo.forks_count || 0,
                language: repo.language,
                updatedAt: repo.updated_at,
                topics: repo.topics || [],
            }));
        } catch (error) {
            console.error('[GitHubSearch] getUserRepos error:', error);
            return [];
        }
    }

    /**
     * 直接获取用户仓库（fallback）
     */
    private async getUserReposDirect(
        username: string,
        limit: number,
        headers: HeadersInit
    ): Promise<GitHubRepo[]> {
        try {
            const response = await fetch(
                `${this.config.apiUrl}/users/${username}/repos?sort=updated&per_page=${limit}`,
                { headers }
            );

            if (!response.ok) {
                const error = await response.json();
                console.error('[GitHubSearch] API error:', error.message || response.statusText);
                return [];
            }

            const data = await response.json();

            return data.map((repo: any) => ({
                id: repo.id,
                name: repo.name,
                fullName: repo.full_name,
                description: repo.description,
                url: repo.html_url,
                stars: repo.stargazers_count || 0,
                forks: repo.forks_count || 0,
                language: repo.language,
                updatedAt: repo.updated_at,
                topics: repo.topics || [],
            }));
        } catch (error) {
            console.error('[GitHubSearch] getUserReposDirect error:', error);
            return [];
        }
    }

    /**
     * 搜索仓库
     */
    async searchRepos(
        query: string,
        options: {
            limit?: number;
            language?: string;
            sort?: 'stars' | 'forks' | 'updated';
        } = {}
    ): Promise<GitHubRepo[]> {
        const limit = options.limit || 20;

        try {
            const headers: HeadersInit = {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'GitHubSearchSkill',
            };

            const token = this.config.token || process.env.GITHUB_TOKEN;
            if (token) {
                headers['Authorization'] = `token ${token}`;
            }

            let searchQuery = query;
            if (options.language) {
                searchQuery += ` language:${options.language}`;
            }

            const response = await fetch(
                `${this.config.apiUrl}/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=${options.sort || 'stars'}&order=desc&per_page=${limit}`,
                { headers }
            );

            if (!response.ok) {
                console.error('[GitHubSearch] Search error:', await response.text());
                return [];
            }

            const data = await response.json();
            const items = data.items || [];

            return items.map((repo: any) => ({
                id: repo.id,
                name: repo.name,
                fullName: repo.full_name,
                description: repo.description,
                url: repo.html_url,
                stars: repo.stargazers_count || 0,
                forks: repo.forks_count || 0,
                language: repo.language,
                updatedAt: repo.updated_at,
                topics: repo.topics || [],
            }));
        } catch (error) {
            console.error('[GitHubSearch] searchRepos error:', error);
            return [];
        }
    }
}

// 导出默认实例
export const githubSearch = new GitHubSearchSkill();
