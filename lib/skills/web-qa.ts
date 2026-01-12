/**
 * Web Q&A Skill (Perplexity)
 *
 * 基于 Perplexity API 的问答搜索能力：
 * - 带引用的问答
 * - 成本敏感（使用 sonar 模型）
 * - 适合 gap-filling 和 fact-checking
 */

// ============== 类型定义 ==============

export interface WebQAResponse {
    content: string;
    citations: string[];
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export interface WebQAConfig {
    apiKey?: string;
    apiUrl?: string;
    model?: string;
}

// ============== 默认配置 ==============

const DEFAULT_CONFIG: Required<Omit<WebQAConfig, 'apiKey'>> & { apiKey?: string } = {
    apiKey: undefined,
    apiUrl: 'https://api.perplexity.ai/chat/completions',
    model: 'sonar',
};

// ============== Skill 实现 ==============

export class WebQASkill {
    private config: typeof DEFAULT_CONFIG;

    constructor(config: WebQAConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * 执行带引用的问答搜索
     */
    async ask(
        query: string,
        options: {
            systemPrompt?: string;
            temperature?: number;
            returnCitations?: boolean;
        } = {}
    ): Promise<WebQAResponse> {
        const apiKey = this.config.apiKey || process.env.PERPLEXITY_API_KEY;

        if (!apiKey) {
            throw new Error('PERPLEXITY_API_KEY is not configured');
        }

        try {
            const messages = [
                {
                    role: 'system',
                    content: options.systemPrompt || 'You are a helpful research assistant. Be precise and concise.'
                },
                { role: 'user', content: query }
            ];

            const response = await fetch(this.config.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages,
                    temperature: options.temperature || 0.1,
                    return_citations: options.returnCitations ?? true,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Perplexity API error (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            const choice = data.choices?.[0];

            return {
                content: choice?.message?.content || '',
                citations: data.citations || [],
                usage: {
                    promptTokens: data.usage?.prompt_tokens || 0,
                    completionTokens: data.usage?.completion_tokens || 0,
                    totalTokens: data.usage?.total_tokens || 0,
                }
            };
        } catch (error) {
            console.error('[WebQA] Error:', error);
            throw error;
        }
    }

    /**
     * 查找人物信息
     */
    async findPersonInfo(
        personName: string,
        question: string
    ): Promise<WebQAResponse> {
        const systemPrompt = `You are a research assistant specializing in AI/tech industry figures.
Your task is to find accurate, factual information about ${personName}.
Focus on verified facts and provide sources when available.
If information is uncertain or unavailable, clearly state that.`;

        return this.ask(`About ${personName}: ${question}`, {
            systemPrompt,
            temperature: 0.1,
            returnCitations: true,
        });
    }

    /**
     * 验证事实
     */
    async verifyFact(
        statement: string
    ): Promise<{
        isVerified: boolean;
        explanation: string;
        citations: string[];
    }> {
        const systemPrompt = `You are a fact-checker. Verify the following statement and respond with:
1. Whether it's TRUE, FALSE, or UNCERTAIN
2. A brief explanation
3. Keep your response concise.`;

        const response = await this.ask(statement, {
            systemPrompt,
            temperature: 0.1,
            returnCitations: true,
        });

        const content = response.content.toLowerCase();
        const isVerified = content.includes('true') && !content.includes('false');

        return {
            isVerified,
            explanation: response.content,
            citations: response.citations,
        };
    }
}

// 导出默认实例
export const webQA = new WebQASkill();
