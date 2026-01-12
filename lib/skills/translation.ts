/**
 * Translation Skill
 *
 * 文本翻译能力（基于 DeepSeek）：
 * - 翻译到简体中文
 * - 批量翻译
 * - 人物信息翻译
 */

import { generateText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';

// ============== 类型定义 ==============

export interface TranslationConfig {
    apiKey?: string;
    model?: string;
}

export interface PersonInfo {
    name: string;
    description: string | null;
    occupation: string[];
    organization: string[];
}

// ============== 默认配置 ==============

const DEFAULT_CONFIG: Required<Omit<TranslationConfig, 'apiKey'>> & { apiKey?: string } = {
    apiKey: undefined,
    model: 'deepseek-chat',
};

// ============== Skill 实现 ==============

export class TranslationSkill {
    private config: typeof DEFAULT_CONFIG;
    private provider: ReturnType<typeof createDeepSeek>;

    constructor(config: TranslationConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.provider = createDeepSeek({
            apiKey: this.config.apiKey || process.env.DEEPSEEK_API_KEY,
        });
    }

    /**
     * 翻译到简体中文
     */
    async toSimplifiedChinese(text: string): Promise<string> {
        if (!text || text.trim() === '') return text;

        if (this.isSimplifiedChinese(text)) {
            return text;
        }

        try {
            const result = await generateText({
                model: this.provider(this.config.model),
                system: `你是一个专业翻译，将任何语言翻译成简体中文。
规则：
1. 人名翻译要符合中文习惯（如 Elon Musk → 埃隆·马斯克）
2. 公司/组织名保留官方中文名（如 Tesla → 特斯拉，OpenAI → OpenAI）
3. 如果已经是繁体中文，转换为简体中文
4. 保持原意，不要添加解释
5. 只返回翻译结果，不要其他内容`,
                prompt: text,
                temperature: 0.3,
                maxTokens: 500,
            } as any);

            return result.text.trim() || text;
        } catch (error) {
            console.error('[Translation] Error:', error);
            return text;
        }
    }

    /**
     * 批量翻译
     */
    async translateBatch(texts: string[]): Promise<string[]> {
        if (texts.length === 0) return [];

        const nonEmpty = texts.filter(t => t && t.trim());
        if (nonEmpty.length === 0) return texts;

        try {
            const result = await generateText({
                model: this.provider(this.config.model),
                system: `你是一个专业翻译，将每行文本翻译成简体中文。
规则：
1. 每行输入对应一行输出
2. 人名翻译要符合中文习惯
3. 公司/组织名保留官方中文名
4. 繁体中文转换为简体中文
5. 保持行数一致，不要添加解释`,
                prompt: nonEmpty.join('\n'),
                temperature: 0.3,
                maxTokens: 1000,
            } as any);

            const translated = result.text.trim().split('\n');

            let idx = 0;
            return texts.map(original => {
                if (!original || !original.trim()) return original;
                return translated[idx++] || original;
            });
        } catch (error) {
            console.error('[Translation] Batch error:', error);
            return texts;
        }
    }

    /**
     * 翻译人物信息
     */
    async translatePersonInfo(info: PersonInfo): Promise<PersonInfo> {
        try {
            const textsToTranslate = [
                info.name,
                info.description || '',
                ...info.occupation,
                ...info.organization,
            ];

            const translated = await this.translateBatch(textsToTranslate);

            let idx = 0;
            return {
                name: translated[idx++] || info.name,
                description: info.description ? (translated[idx++] || info.description) : null,
                occupation: info.occupation.map(() => translated[idx++] || ''),
                organization: info.organization.map(() => translated[idx++] || ''),
            };
        } catch (error) {
            console.error('[Translation] Person info error:', error);
            return info;
        }
    }

    /**
     * 翻译到英文
     */
    async toEnglish(text: string): Promise<string> {
        if (!text || text.trim() === '') return text;

        try {
            const result = await generateText({
                model: this.provider(this.config.model),
                system: `You are a professional translator. Translate the text to English.
Rules:
1. Keep proper nouns (names, companies) in their original form
2. Maintain the original meaning
3. Only return the translation, no explanations`,
                prompt: text,
                temperature: 0.3,
                maxTokens: 500,
            } as any);

            return result.text.trim() || text;
        } catch (error) {
            console.error('[Translation] To English error:', error);
            return text;
        }
    }

    /**
     * 检测是否为简体中文
     */
    private isSimplifiedChinese(text: string): boolean {
        const traditionalChars = /[東說車馬時寵藝國華開發電創業務機會語學圖書館製構編輯議區際網傳統]/;
        return !traditionalChars.test(text);
    }
}

// 导出默认实例
export const translation = new TranslationSkill();
