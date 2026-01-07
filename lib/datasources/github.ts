/**
 * GitHub API 封装
 * 用于获取用户的公开仓库
 * https://docs.github.com/en/rest/repos/repos
 */

import { type PersonContext, filterVerifiedItems } from '../utils/identity-verifier';

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
            // Fallback: 如果 Search API 失败 (e.g. 422 Validation Failed)，尝试直接获取用户仓库列表
            console.warn(`[GitHub] Search API failed (${response.status}), trying direct repo list fallback...`);
            const directResponse = await fetch(
                `${GITHUB_API_URL}/users/${username}/repos?sort=updated&per_page=${limit}`,
                { headers }
            );

            if (!directResponse.ok) {
                const error = await directResponse.json();
                console.error('[GitHub] API error:', error.message || directResponse.statusText);
                return [];
            }

            const directData = await directResponse.json();
            // Direct API returns array directly
            return directData.map((repo: any) => ({
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

/**
 * 获取用户仓库（带身份验证过滤）
 * @param username GitHub 用户名
 * @param person 人物上下文，用于过滤不相关仓库
 * @param limit 最大返回数量
 * @param since 可选，只返回此日期之后更新的仓库
 */
export async function getUserReposForPerson(
    username: string,
    person: PersonContext,
    limit: number = 20,
    since?: Date
): Promise<GitHubRepo[]> {
    // 获取原始仓库列表
    const repos = await getUserRepos(username, limit * 2, since);

    // 将 GitHubRepo 转换为 ContentItem 格式并过滤
    const verifiedRepos = filterVerifiedItems(
        person,
        repos.map(r => ({
            title: r.name,
            description: r.description || '',
            url: r.url,
            authorName: r.fullName.split('/')[0], // owner username
        })),
        0.4 // GitHub 使用较低阈值，因为已经是直接用户名匹配
    );

    // 返回对应的原始仓库对象
    const verifiedNames = new Set(verifiedRepos.map(v => v.title));
    return repos.filter(r => verifiedNames.has(r.name)).slice(0, limit);
}

