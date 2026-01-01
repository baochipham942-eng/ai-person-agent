/**
 * GitHub API 封装
 * 用于获取用户的公开仓库
 * https://docs.github.com/en/rest/repos/repos
 */

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

const GITHUB_API_URL = 'https://api.github.com';

/**
 * 获取用户的公开仓库（按 star 排序）
 * @param username GitHub 用户名
 * @param limit 最大返回数量
 * @param since 可选，只返回此日期之后更新的仓库（用于增量更新）
 */
export async function getUserRepos(
    username: string,
    limit: number = 20,
    since?: Date
): Promise<GitHubRepo[]> {
    if (!username) {
        console.warn('[GitHub] No username provided');
        return [];
    }

    try {
        const headers: HeadersInit = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'AI-Person-Agent',
        };

        // 使用 token 提高 rate limit
        if (process.env.GITHUB_TOKEN) {
            headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        }

        // 构建查询条件
        let query = `user:${username}`;
        if (since) {
            const pushedAfter = since.toISOString().split('T')[0];
            query += ` pushed:>${pushedAfter}`;
        }

        // 使用 Search API 按 star 排序
        const response = await fetch(
            `${GITHUB_API_URL}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${limit}`,
            { headers }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error('[GitHub] API error:', error.message || response.statusText);
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
        console.error('[GitHub] getUserRepos error:', error);
        return [];
    }
}

