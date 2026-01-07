/**
 * Grok DataSource Adapter
 * 
 * 用于从 X.AI Grok API 获取 X/Twitter 内容
 * 这是 Adapter 模式的模板示例
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
import { isAboutPerson, PersonContext as IdentityContext } from '@/lib/utils/identity';

// ============== 类型定义 ==============

interface XPost {
    id: string;
    text: string;
    date: string;
    url: string;
    author?: string;
}

interface GrokResponse {
    summary: string;
    sources: string[];
    posts: XPost[];
}

// ============== 配置 ==============

const XAI_API_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

// ============== Adapter 实现 ==============

export class GrokAdapter implements DataSourceAdapter {
    readonly sourceType = 'x' as const;
    readonly name = 'Grok X Adapter';

    /**
     * 检查是否应该获取 - 需要 xHandle
     */
    shouldFetch(params: FetchParams): boolean {
        return !!params.handle;
    }

    /**
     * 获取 X 内容
     */
    async fetch(params: FetchParams): Promise<DataSourceResult> {
        const apiKey = process.env.XAI_API_KEY;

        if (!apiKey) {
            console.warn('[GrokAdapter] XAI_API_KEY not configured');
            return createSuccessResult(this.sourceType, []);
        }

        const xHandle = params.handle?.replace('@', '');
        if (!xHandle) {
            return createSuccessResult(this.sourceType, []);
        }

        const searchName = params.person.englishName || params.person.name;
        const maxResults = params.maxResults || 15;

        try {
            // 构建 prompt
            const systemPrompt = `You are an AI research assistant. Search for recent posts from @${xHandle} on X that are SPECIFICALLY about:
- Artificial Intelligence, Machine Learning, Deep Learning
- AI products, models, research (GPT, Claude, Gemini, LLMs, etc.)
- AI companies and industry news
- Technical insights

IGNORE posts about policies, elections, or personal opinions unrelated to tech.

CRITICAL: Return the result as a STRICT JSON object with a single key "posts", which is an array of objects. Each object MUST have:
- "date": string (e.g. "2024-01-01")
- "text": string (the exact full content of the tweet)
- "url": string (the direct https://x.com link)

Do not output any markdown formatting or explanations, just the raw JSON string.`;

            const userPrompt = `Find the ${maxResults} most recent AI-related posts from @${xHandle}.`;

            // 调用 API
            const response = await fetch(`${XAI_API_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'grok-2-1212',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    search_parameters: {
                        mode: 'on',
                        return_citations: true,
                        max_search_results: maxResults,
                        sources: [{ type: 'x' }], // 正确格式：对象数组
                    },
                    temperature: 0.1,
                    response_format: { type: 'json_object' },
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[GrokAdapter] API error:', errorText);
                return createErrorResult(this.sourceType, {
                    code: response.status === 429 ? 'RATE_LIMIT' : 'API_ERROR',
                    message: `Grok API error: ${response.status}`,
                    retryable: response.status === 429 || response.status >= 500,
                });
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';

            // 解析 JSON
            const posts = this.parsePostsFromContent(content, xHandle);
            console.log(`[GrokAdapter] Parsed ${posts.length} posts from response`);

            // 转换为 NormalizedItem
            const rawItems = posts.map(post => createNormalizedItem({
                url: post.url,
                title: post.text || `Post by @${post.author}`,
                text: post.text,
                publishedAt: post.date ? new Date(post.date) : new Date(),
                sourceType: this.sourceType,
                isOfficial: true,
                confidence: 80,
                metadata: {
                    author: post.author,
                    postId: post.id,
                },
            }));

            // 身份验证过滤
            const identityContext: IdentityContext = {
                name: params.person.name,
                englishName: params.person.englishName || searchName,
                aliases: params.person.aliases,
                organizations: params.person.organizations,
                occupations: params.person.occupations,
            };

            const validatedItems: NormalizedItem[] = [];
            const filteredCount = { value: 0 };

            for (const item of rawItems) {
                const textToCheck = `${item.title} ${item.text}`;
                if (isAboutPerson(textToCheck, identityContext)) {
                    validatedItems.push(item);
                } else {
                    filteredCount.value++;
                    console.log(`[GrokAdapter] Filtered irrelevant post: ${item.url}`);
                }
            }

            console.log(`[GrokAdapter] ${rawItems.length} fetched, ${validatedItems.length} validated, ${filteredCount.value} filtered`);

            return createSuccessResult(this.sourceType, validatedItems, {
                fetched: rawItems.length,
                validated: validatedItems.length,
                filtered: filteredCount.value,
            });

        } catch (error) {
            console.error('[GrokAdapter] Error:', error);
            return createErrorResult(this.sourceType, {
                code: 'API_ERROR',
                message: error instanceof Error ? error.message : String(error),
                retryable: true,
                cause: error,
            });
        }
    }

    /**
     * 从 Grok 返回内容解析帖子
     */
    private parsePostsFromContent(content: string, xHandle: string): XPost[] {
        try {
            // 清理工具日志
            const cleanContent = content.split('\n').filter((line: string) => !line.trim().startsWith('>')).join('\n');

            // 提取 JSON
            const jsonStart = cleanContent.indexOf('{');
            const jsonEnd = cleanContent.lastIndexOf('}');
            if (jsonStart === -1) throw new Error('No JSON start found');

            const jsonStr = cleanContent.substring(jsonStart, jsonEnd + 1);
            const parsed = JSON.parse(jsonStr);

            if (!parsed.posts || !Array.isArray(parsed.posts)) {
                return [];
            }

            return parsed.posts.map((p: { url?: string; text?: string; date?: string }) => {
                const idMatch = (p.url || '').match(/status\/(\d+)/);
                const authorMatch = (p.url || '').match(/x\.com\/([^/]+)/);
                return {
                    id: idMatch ? idMatch[1] : crypto.randomUUID(),
                    text: p.text || '',
                    date: p.date || '',
                    url: p.url || '',
                    author: authorMatch ? authorMatch[1] : xHandle,
                };
            });
        } catch (e) {
            console.error('[GrokAdapter] Failed to parse JSON:', e);
            return [];
        }
    }
}

// 导出单例
export const grokAdapter = new GrokAdapter();
