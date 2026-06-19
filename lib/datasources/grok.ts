/**
 * xAI/Grok API 封装
 * 用于获取 X/Twitter 相关内容（真实推文搜索）
 * 
 * 支持中转服务：设置 XAI_BASE_URL 环境变量（如 https://k2api.aivue.cn/v1）
 */

import { fetchXPostsWithXaiSearch } from './xai-x-search';

interface XPost {
    id: string;
    text: string;
    date: string;
    url: string;
    author?: string;
}

/**
 * 使用 Grok Live Search 搜索 X 上的真实内容
 * 使用 xAI Responses API 的 x_search tool 获取真实推文链接
 */
export async function searchWithGrok(
    query: string,
    options: {
        maxResults?: number;
        xHandle?: string;
    } = {}
): Promise<{ summary: string; sources: string[]; posts: XPost[] }> {
    const apiKey = process.env.XAI_API_KEY;

    if (!apiKey) {
        console.warn('XAI_API_KEY not configured');
        return { summary: '', sources: [], posts: [] };
    }

    try {
        const result = await fetchXPostsWithXaiSearch({
            apiKey,
            query,
            maxResults: options.maxResults || 10,
            xHandle: options.xHandle,
        });
        const sources = result.posts.map(p => p.url).filter(Boolean);

        return {
            summary: JSON.stringify(result.posts.slice(0, 3)),
            sources,
            posts: result.posts,
        };
    } catch (error) {
        console.error('Grok search error:', error);
        return { summary: '', sources: [], posts: [] };
    }
}

/**
 * 获取人物在 X 上的活动
 * @param personName 人物姓名
 * @param xHandle X 用户名（如果有）
 */
export async function getPersonXActivity(
    personName: string,
    xHandle?: string
): Promise<{ summary: string; sources: string[]; posts: XPost[] }> {
    return searchWithGrok(personName, {
        maxResults: 15,
        xHandle,
    });
}
