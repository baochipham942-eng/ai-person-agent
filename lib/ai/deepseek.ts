/**
 * DeepSeek AI 集成
 * 使用官方 @ai-sdk/deepseek 包
 */

import { createDeepSeek } from '@ai-sdk/deepseek';
import { generateText } from 'ai';

// 创建 DeepSeek provider（使用官方 SDK）
export const deepseek = createDeepSeek({
    apiKey: process.env.DEEPSEEK_API_KEY,
});

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * 通用 DeepSeek 调用
 */
export async function chatCompletion(
    messages: ChatMessage[],
    options?: {
        temperature?: number;
        maxTokens?: number;
    }
): Promise<string> {
    if (!process.env.DEEPSEEK_API_KEY) {
        throw new Error('DEEPSEEK_API_KEY is not configured');
    }

    const result = await generateText({
        model: deepseek('deepseek-chat'),
        messages: messages.map(m => ({
            role: m.role,
            content: m.content,
        })),
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 2000,
    } as any);

    return result.text;
}

/**
 * 结构化 JSON 输出
 */
export async function chatStructuredCompletion<T>(
    messages: ChatMessage[],
    options?: {
        temperature?: number;
        maxTokens?: number;
    }
): Promise<T> {
    // 添加 JSON 输出指令
    const messagesWithJsonHint = [
        ...messages,
        {
            role: 'user' as const,
            content: '请确保你的回复是有效的 JSON 格式，不要包含其他文字。',
        },
    ];

    const response = await chatCompletion(messagesWithJsonHint, options);

    // 尝试解析 JSON
    let json: T;
    try {
        // 移除可能的 Markdown 标记
        const cleanedReply = response.trim()
            .replace(/^```json\n?/, '')
            .replace(/\n?```$/, '');
        json = JSON.parse(cleanedReply);
    } catch {
        // 尝试提取 JSON 代码块
        const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/)
            || response.match(/{[\s\S]*}/);

        if (jsonMatch) {
            const extracted = (jsonMatch[1] || jsonMatch[0]).trim();
            json = JSON.parse(extracted);
        } else {
            throw new Error('Failed to parse JSON from AI response');
        }
    }

    return json;
}
