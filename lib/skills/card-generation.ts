/**
 * Card Generation Skill
 *
 * 从原始内容生成知识卡片：
 * - 洞察卡片
 * - 引用卡片
 * - 故事卡片
 * - 方法卡片
 * - 事实卡片
 */

import { generateText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';

// ============== 类型定义 ==============

export type CardType = 'insight' | 'quote' | 'story' | 'method' | 'fact';

export interface Card {
    type: CardType;
    title: string;
    content: string;
    tags: string[];
    sourceUrl?: string;
    importance: number;
}

export interface TopicWeight {
    name: string;
    weight: number;
}

export interface RawItem {
    title: string;
    text: string;
    url: string;
}

export interface CardGenerationConfig {
    apiKey?: string;
    model?: string;
    maxCardsPerBatch?: number;
}

// ============== 默认配置 ==============

const DEFAULT_CONFIG: Required<Omit<CardGenerationConfig, 'apiKey'>> & { apiKey?: string } = {
    apiKey: undefined,
    model: 'deepseek-chat',
    maxCardsPerBatch: 10,
};

// ============== Prompts ==============

const CARD_GENERATION_SYSTEM_PROMPT = `你是一个知识提取专家。从给定的内容中提取有价值的知识点，生成学习卡片。

卡片类型：
- insight: 深刻的洞察或观点
- quote: 值得记住的原话引用
- story: 有启发性的故事或经历
- method: 可操作的方法或技巧
- fact: 重要的事实或数据

每张卡片需要：
- type: 卡片类型
- title: 简洁的标题（10-20字）
- content: 卡片内容（50-200字）
- tags: 3-5个相关标签
- sourceUrl: 来源URL
- importance: 重要性评分（1-10）

只提取真正有价值的知识点，避免冗余和低质量内容。`;

// ============== Skill 实现 ==============

export class CardGenerationSkill {
    private config: typeof DEFAULT_CONFIG;
    private provider: ReturnType<typeof createDeepSeek>;

    constructor(config: CardGenerationConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.provider = createDeepSeek({
            apiKey: this.config.apiKey || process.env.DEEPSEEK_API_KEY,
        });
    }

    /**
     * 从原始内容生成卡片
     */
    async generateCards(
        personName: string,
        rawItems: RawItem[],
        existingCards: { title: string; content: string }[] = []
    ): Promise<Card[]> {
        if (rawItems.length === 0) {
            return [];
        }

        const limitedItems = rawItems.slice(0, this.config.maxCardsPerBatch).map(item => ({
            title: item.title,
            text: item.text.slice(0, 2000),
            sourceUrl: item.url,
        }));

        const existingContext = existingCards.length > 0
            ? `\n\n已有卡片（避免重复）：\n${existingCards.slice(0, 20).map(c => `- ${c.title}`).join('\n')}`
            : '';

        const userPrompt = `为 ${personName} 从以下内容中提取知识卡片：

${JSON.stringify(limitedItems, null, 2)}
${existingContext}

返回 JSON 数组格式的卡片列表。`;

        try {
            const result = await generateText({
                model: this.provider(this.config.model),
                system: CARD_GENERATION_SYSTEM_PROMPT,
                prompt: userPrompt,
                temperature: 0.5,
                maxTokens: 3000,
            } as any);

            const content = result.text?.trim() || '[]';

            let jsonStr = content;
            if (content.startsWith('```')) {
                jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
            }

            const cards = JSON.parse(jsonStr) as Card[];

            console.log(`[CardGeneration] Generated ${cards.length} cards for ${personName}`);
            return cards;
        } catch (error) {
            console.error('[CardGeneration] Error:', error);
            return [];
        }
    }

    /**
     * 提取主题标签
     */
    async extractTopics(
        personName: string,
        rawItems: { title: string; text: string }[]
    ): Promise<TopicWeight[]> {
        if (rawItems.length === 0) {
            return [];
        }

        const combinedText = rawItems
            .slice(0, 10)
            .map(item => `${item.title}\n${item.text.slice(0, 1000)}`)
            .join('\n\n');

        const systemPrompt = `分析以下关于 ${personName} 的内容，提取主要主题和权重。

返回 JSON 格式：
{
  "topics": [
    {"name": "主题名", "weight": 0.0-1.0}
  ]
}

主题应该是具体的技术领域或专业方向，权重表示该主题在内容中的重要程度。`;

        try {
            const result = await generateText({
                model: this.provider(this.config.model),
                system: systemPrompt,
                prompt: combinedText.slice(0, 8000),
                temperature: 0.3,
                maxTokens: 500,
            } as any);

            const content = result.text?.trim() || '{"topics": []}';

            let jsonStr = content;
            if (content.startsWith('```')) {
                jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
            }

            const parsed = JSON.parse(jsonStr) as { topics: TopicWeight[] };
            return parsed.topics || [];
        } catch (error) {
            console.error('[CardGeneration] Extract topics error:', error);
            return [];
        }
    }

    /**
     * 生成单张卡片
     */
    async generateSingleCard(
        content: string,
        type: CardType,
        sourceUrl?: string
    ): Promise<Card | null> {
        const prompt = `从以下内容生成一张 ${type} 类型的知识卡片：

${content}

返回单个 JSON 对象格式的卡片。`;

        try {
            const result = await generateText({
                model: this.provider(this.config.model),
                system: CARD_GENERATION_SYSTEM_PROMPT,
                prompt,
                temperature: 0.5,
                maxTokens: 500,
            } as any);

            const jsonContent = result.text?.trim() || '{}';

            let jsonStr = jsonContent;
            if (jsonContent.startsWith('```')) {
                jsonStr = jsonContent.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
            }

            const card = JSON.parse(jsonStr) as Card;
            card.sourceUrl = sourceUrl;

            return card;
        } catch (error) {
            console.error('[CardGeneration] Single card error:', error);
            return null;
        }
    }
}

// 导出默认实例
export const cardGeneration = new CardGenerationSkill();
