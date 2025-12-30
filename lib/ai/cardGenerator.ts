/**
 * 卡片生成服务
 */

import { chatStructuredCompletion, ChatMessage } from './deepseek';
import { CARD_GENERATION_SYSTEM_PROMPT, CARD_GENERATION_USER_PROMPT, TOPIC_EXTRACTION_PROMPT } from './prompts';
import { prisma } from '@/lib/db/prisma';

export interface Card {
    type: 'insight' | 'quote' | 'story' | 'method' | 'fact';
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

/**
 * 为人物生成学习卡片
 * @param personId 人物 ID
 * @param personName 人物名称
 * @param rawItems 原始数据项
 */
export async function generateCardsForPerson(
    personId: string,
    personName: string,
    rawItems: { title: string; text: string; url: string }[]
): Promise<Card[]> {
    if (rawItems.length === 0) {
        console.log(`[CardGeneration] No raw items for person ${personId}`);
        return [];
    }

    // 限制输入大小，避免 token 超限
    const limitedItems = rawItems.slice(0, 10).map(item => ({
        title: item.title,
        text: item.text.slice(0, 2000), // 每个 item 最多 2000 字符
        sourceUrl: item.url,
    }));

    const messages: ChatMessage[] = [
        {
            role: 'system',
            content: CARD_GENERATION_SYSTEM_PROMPT,
        },
        {
            role: 'user',
            content: CARD_GENERATION_USER_PROMPT(personName, limitedItems),
        },
    ];

    try {
        const cards = await chatStructuredCompletion<Card[]>(messages, {
            temperature: 0.5,
            maxTokens: 3000,
        });

        console.log(`[CardGeneration] Generated ${cards.length} cards for ${personName}`);
        return cards;
    } catch (error) {
        console.error('[CardGeneration] Error generating cards:', error);
        return [];
    }
}

/**
 * 提取人物主题标签
 */
export async function extractTopicsForPerson(
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

    const messages: ChatMessage[] = [
        {
            role: 'system',
            content: TOPIC_EXTRACTION_PROMPT,
        },
        {
            role: 'user',
            content: `人物: ${personName}\n\n内容:\n${combinedText.slice(0, 8000)}`,
        },
    ];

    try {
        const result = await chatStructuredCompletion<{ topics: TopicWeight[] }>(messages, {
            temperature: 0.3,
            maxTokens: 500,
        });

        return result.topics || [];
    } catch (error) {
        console.error('[TopicExtraction] Error:', error);
        return [];
    }
}

/**
 * 保存卡片到数据库
 */
export async function saveCardsToDatabase(
    personId: string,
    cards: Card[]
): Promise<void> {
    if (cards.length === 0) return;

    // 批量创建卡片
    await prisma.card.createMany({
        data: cards.map(card => ({
            personId,
            type: card.type,
            title: card.title,
            content: card.content,
            tags: card.tags,
            sourceUrl: card.sourceUrl,
            importance: card.importance,
        })),
        skipDuplicates: true,
    });

    console.log(`[CardGeneration] Saved ${cards.length} cards for person ${personId}`);
}

