/**
 * xAI/Grok API 封装
 * 用于获取 X/Twitter 相关内容（真实推文搜索）
 * 
 * 支持中转服务：设置 XAI_BASE_URL 环境变量（如 https://k2api.aivue.cn/v1）
 */

interface XPost {
    id: string;
    text: string;
    date: string;
    url: string;
    author?: string;
}

// 支持自定义 base URL（用于中转服务）
const XAI_API_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

/**
 * 从 Grok 返回的内容中解析推文链接和内容
 * 支持多种格式:
 * - December 27: "内容" (备注) https://x.com/...
 * - **日期**: "内容" https://x.com/...
 * - - 内容描述 https://x.com/...
 */
function parseXPostsFromContent(content: string): XPost[] {
    const posts: XPost[] = [];
    const lines = content.split('\n');

    // 用于匹配URL的正则
    const urlRegex = /https:\/\/x\.com\/(\w+)\/status\/(\d+)/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const urlMatch = line.match(urlRegex);

        // 如果当前行有URL
        if (urlMatch) {
            const url = urlMatch[0];
            const author = urlMatch[1];
            const postId = urlMatch[2];

            // 尝试从前一行或当前行提取内容
            let text = '';
            let date = '';

            // 当前行和前一行都要检查
            const linesToCheck = [lines[i - 1], line].filter(Boolean);

            for (const checkLine of linesToCheck) {
                // 提取引号内的内容
                const quoteMatch = checkLine.match(/"([^"]+)"/);
                if (quoteMatch && !text) {
                    text = quoteMatch[1];
                }

                // 提取日期 (December 27, **Dec 27**, 等)
                const dateMatch = checkLine.match(/\*\*([^*]+)\*\*/) ||
                    checkLine.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+/i);
                if (dateMatch && !date) {
                    date = dateMatch[1] || dateMatch[0];
                }

                // 如果没有引号格式，尝试提取冒号后的内容
                if (!text && checkLine.includes(':')) {
                    const colonMatch = checkLine.match(/:\s*[""]?([^"""\n]+)[""]?\s*(?:\(|$)/);
                    if (colonMatch) {
                        text = colonMatch[1].trim();
                    }
                }
            }

            // 如果还是没有文本，用整行（去除URL部分）作为描述
            if (!text) {
                const prevLine = lines[i - 1] || '';
                text = prevLine.replace(/^[-*]\s*/, '').replace(/\*\*[^*]+\*\*:?\s*/, '').trim();
            }

            posts.push({
                id: postId,
                text: text || '',
                date: date || '',
                url: url,
                author: author,
            });
        }
    }

    return posts;
}

/**
 * 使用 Grok Live Search 搜索 X 上的真实内容
 * 启用 search_parameters 获取真实推文链接
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
        const systemPrompt = options.xHandle
            ? `You are an AI research assistant. Search for recent posts from @${options.xHandle} on X that are SPECIFICALLY about:
- Artificial Intelligence, Machine Learning, Deep Learning
- AI products, models, research (GPT, Claude, Gemini, LLMs, etc.)
- AI companies and industry news
- Technical insights

IGNORE posts about policies, elections, or personal opinions unrelated to tech.

CRITICAL: Return the result as a STRICT JSON object with a single key "posts", which is an array of objects. Each object MUST have:
- "date": string (e.g. "2024-01-01")
- "text": string (the exact full content of the tweet)
- "url": string (the direct https://x.com link)

Do not output any markdown formatting or explanations, just the raw JSON string.`
            : `You are an AI research assistant. Search for recent posts about "${query}" on X related to AI/ML. Return the result as a STRICT JSON object with a "posts" array containing { "date", "text", "url" }.`;

        const userPrompt = options.xHandle
            ? `Find the ${options.maxResults || 10} most recent AI-related posts from @${options.xHandle}.`
            : `Find ${options.maxResults || 10} recent AI-related posts about: ${query}`;

        const response = await fetch(`${XAI_API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'grok-2-1212', // 使用更稳定的模型版本，或者 grok-beta
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                // 启用 Live Search 获取真实数据
                search_parameters: {
                    mode: 'on',
                    return_citations: true,
                    max_search_results: options.maxResults || 10,
                    sources: [{ type: 'x' }], // 正确格式：对象数组
                },
                temperature: 0.1, // Lower temperature for more deterministic JSON
                response_format: { type: 'json_object' } // Enforce JSON
            }),
        });

        if (!response.ok) {
            console.error('Grok API error:', await response.text());
            return { summary: '', sources: [], posts: [] };
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        // 解析 JSON
        let posts: XPost[] = [];
        try {
            // Strip tool logs
            const cleanContent = content.split('\n').filter((line: string) => !line.trim().startsWith('>')).join('\n');

            // Robust JSON extraction
            const jsonStart = cleanContent.indexOf('{');
            const jsonEnd = cleanContent.lastIndexOf('}');
            if (jsonStart === -1) throw new Error('No JSON start found');

            const jsonStr = cleanContent.substring(jsonStart, jsonEnd + 1);
            const parsed = JSON.parse(jsonStr);

            if (parsed.posts && Array.isArray(parsed.posts)) {
                posts = parsed.posts.map((p: any) => {
                    // Extract ID from URL
                    const idMatch = (p.url || '').match(/status\/(\d+)/);
                    const authorMatch = (p.url || '').match(/x\.com\/([^/]+)/);
                    return {
                        id: idMatch ? idMatch[1] : crypto.randomUUID(),
                        text: p.text || '',
                        date: p.date || '',
                        url: p.url || '',
                        author: authorMatch ? authorMatch[1] : options.xHandle,
                    };
                });
            }
        } catch (e) {
            console.error('Failed to parse Grok JSON:', e, content.slice(0, 100));
            // Fallback: try parsing content as text if JSON failed (though response_format should prevent this)
            // posts = parseXPostsFromContent(content); 
        }

        const sources = posts.map(p => p.url).filter(Boolean);

        return {
            summary: JSON.stringify(posts.slice(0, 3)), // summary now is just debug info
            sources,
            posts,
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
