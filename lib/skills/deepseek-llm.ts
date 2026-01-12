/**
 * DeepSeek LLM Skill
 *
 * DeepSeek AI 调用能力：
 * - 通用文本生成
 * - 结构化 JSON 输出
 * - 可配置模型和参数
 */

import { createDeepSeek } from '@ai-sdk/deepseek';
import { generateText } from 'ai';

// ============== 类型定义 ==============

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface DeepSeekConfig {
    apiKey?: string;
    model?: string;
}

export interface CompletionOptions {
    temperature?: number;
    maxTokens?: number;
}

// ============== 默认配置 ==============

const DEFAULT_CONFIG: Required<Omit<DeepSeekConfig, 'apiKey'>> & { apiKey?: string } = {
    apiKey: undefined,
    model: 'deepseek-chat',
};

// ============== Skill 实现 ==============

export class DeepSeekLLMSkill {
    private config: typeof DEFAULT_CONFIG;
    private provider: ReturnType<typeof createDeepSeek>;

    constructor(config: DeepSeekConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.provider = createDeepSeek({
            apiKey: this.config.apiKey || process.env.DEEPSEEK_API_KEY,
        });
    }

    /**
     * 通用文本生成
     */
    async chat(
        messages: ChatMessage[],
        options: CompletionOptions = {}
    ): Promise<string> {
        if (!this.config.apiKey && !process.env.DEEPSEEK_API_KEY) {
            throw new Error('DEEPSEEK_API_KEY is not configured');
        }

        const result = await generateText({
            model: this.provider(this.config.model),
            messages: messages.map(m => ({
                role: m.role,
                content: m.content,
            })),
            temperature: options.temperature ?? 0.7,
            maxTokens: options.maxTokens ?? 2000,
        } as any);

        return result.text;
    }

    /**
     * 结构化 JSON 输出
     */
    async chatJSON<T>(
        messages: ChatMessage[],
        options: CompletionOptions = {}
    ): Promise<T> {
        const messagesWithJsonHint = [
            ...messages,
            {
                role: 'user' as const,
                content: '请确保你的回复是有效的 JSON 格式，不要包含其他文字。',
            },
        ];

        const response = await this.chat(messagesWithJsonHint, options);

        let json: T;
        try {
            const cleanedReply = response.trim()
                .replace(/^```json\n?/, '')
                .replace(/\n?```$/, '');
            json = JSON.parse(cleanedReply);
        } catch {
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

    /**
     * 简单问答
     */
    async ask(question: string, options: CompletionOptions = {}): Promise<string> {
        return this.chat([
            { role: 'user', content: question }
        ], options);
    }

    /**
     * 带系统提示的问答
     */
    async askWithSystem(
        systemPrompt: string,
        question: string,
        options: CompletionOptions = {}
    ): Promise<string> {
        return this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question }
        ], options);
    }

    /**
     * 提取结构化信息
     */
    async extract<T>(
        text: string,
        schema: string,
        options: CompletionOptions = {}
    ): Promise<T> {
        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `Extract information from the text according to this schema:\n${schema}\n\nReturn ONLY valid JSON, no explanations.`
            },
            {
                role: 'user',
                content: text
            }
        ];

        return this.chatJSON<T>(messages, {
            ...options,
            temperature: options.temperature ?? 0.1,
        });
    }
}

// 导出默认实例
export const deepseekLLM = new DeepSeekLLMSkill();
