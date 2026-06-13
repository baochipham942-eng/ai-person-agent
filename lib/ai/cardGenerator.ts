/**
 * 卡片生成服务
 *
 * 聚合优化 (2026-06-07):
 * - A1: 喂 LLM 前按 身份分 + 信息密度 排序取 Top-N (不再无序 slice 前 10)
 * - A2: 卡片去重升级为 归一化标题 + SimHash 内容近似 (不再仅精确标题)
 * - A3: 换 generateStructured + zod 校验, 失败非静默 (明确告警)
 */

import { z } from 'zod';
import { generateStructured, type ChatMessage } from './provider';
import { CARD_GENERATION_SYSTEM_PROMPT, CARD_GENERATION_USER_PROMPT, TOPIC_EXTRACTION_PROMPT } from './prompts';
import { getIdentityScore } from '@/lib/utils/identity';
import { simhash, hammingDistance } from '@/lib/utils/dedup';

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

export interface SaveCardsOptions {
    generationId?: string;
}

const CardSchema = z.object({
    type: z.enum(['insight', 'quote', 'story', 'method', 'fact']),
    title: z.string(),
    content: z.string(),
    tags: z.array(z.string()).default([]),
    sourceUrl: z.string().optional(),
    importance: z.coerce.number().default(3).transform(value => Math.min(5, Math.max(1, Math.round(value)))),
});
const CardArraySchema = z.object({ cards: z.array(CardSchema) });

async function loadPrisma() {
    const db = await import('@/lib/db/prisma');
    return db.prisma;
}

/** 归一化标题用于去重 (小写 + 去空白标点) */
function normalizeTitle(s: string): string {
    return s.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
}

/**
 * 为人物生成学习卡片
 * @param rawItems 原始数据项 (会按身份分+信息密度排序后取 Top-N)
 */
export async function generateCardsForPerson(
    personId: string,
    personName: string,
    rawItems: { title: string; text: string; url: string }[],
    options: { topN?: number; englishName?: string; existingCards?: { title: string; content: string }[] } = {}
): Promise<Card[]> {
    if (rawItems.length === 0) {
        console.log(`[CardGeneration] No raw items for person ${personId}`);
        return [];
    }

    const topN = options.topN ?? 10;

    // A1: 按 身份分 + 信息密度 排序, 取最有价值的 Top-N (替代无序 slice)
    const ctx = { name: personName, englishName: options.englishName || personName };
    const scoreItem = (it: { title: string; text: string }) => {
        const combined = `${it.title} ${it.text}`;
        const identity = getIdentityScore(combined, ctx);     // 0-1, 是否真关于本人
        const density = Math.min(1, (it.text?.length || 0) / 1500); // 信息密度代理
        return identity * 0.6 + density * 0.4;
    };
    const ranked = [...rawItems].sort((a, b) => scoreItem(b) - scoreItem(a));

    const limitedItems = ranked.slice(0, topN).map(item => ({
        title: item.title,
        text: item.text.slice(0, 2000),
        sourceUrl: item.url,
    }));

    // 取最近 20 张已有卡片作为去重上下文
    const existingCards = options.existingCards ?? await (await loadPrisma()).card.findMany({
        where: { personId, isActive: true },
        select: { title: true, content: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
    });

    const messages: ChatMessage[] = [
        { role: 'system', content: CARD_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: CARD_GENERATION_USER_PROMPT(personName, limitedItems, existingCards) },
        { role: 'user', content: '以 JSON 对象返回: {"cards": [{type,title,content,tags,sourceUrl,importance}, ...]}。type 只能是 insight/quote/story/method/fact, importance 为 1-5 的数字。' },
    ];

    try {
        const { data } = await generateStructured(messages, CardArraySchema, {
            chain: ['gemini', 'deepseek'],
            temperature: 0.5,
            maxTokens: 3000,
        });
        console.log(`[CardGeneration] Generated ${data.cards.length} cards for ${personName}`);
        return data.cards as Card[];
    } catch (error) {
        // A3: 非静默 — 明确告警
        console.error(`[CardGeneration] ⚠️ 卡片生成失败 (${personName}, ${rawItems.length} items): ${(error as Error).message?.slice(0, 200)}`);
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
    if (rawItems.length === 0) return [];

    const combinedText = rawItems
        .slice(0, 10)
        .map(item => `${item.title}\n${item.text.slice(0, 1000)}`)
        .join('\n\n');

    const messages: ChatMessage[] = [
        { role: 'system', content: TOPIC_EXTRACTION_PROMPT },
        { role: 'user', content: `人物: ${personName}\n\n内容:\n${combinedText.slice(0, 8000)}` },
        { role: 'user', content: '以 JSON 对象返回: {"topics": [{"name": string, "weight": number}, ...]}' },
    ];

    try {
        const { data } = await generateStructured(
            messages,
            z.object({ topics: z.array(z.object({ name: z.string(), weight: z.number() })) }),
            { chain: ['gemini', 'deepseek'], temperature: 0.3, maxTokens: 500 }
        );
        return data.topics;
    } catch (error) {
        console.error(`[TopicExtraction] ⚠️ 失败 (${personName}): ${(error as Error).message?.slice(0, 150)}`);
        return [];
    }
}

/**
 * 保存卡片到数据库 (A2: 归一化标题 + SimHash 内容近似去重)
 */
export async function saveCardsToDatabase(personId: string, cards: Card[], options: SaveCardsOptions = {}): Promise<void> {
    if (cards.length === 0) return;

    const prisma = await loadPrisma();
    const generationId = options.generationId ?? `cardgen:${new Date().toISOString()}`;
    const existingCards = await prisma.card.findMany({
        where: { personId, isActive: true },
        select: { title: true, content: true },
    });

    const existingTitleSet = new Set(existingCards.map(c => normalizeTitle(c.title)));
    const existingHashes = existingCards.map(c => simhash(c.content || ''));
    const batchTitleSet = new Set<string>();
    const batchHashes: bigint[] = [];

    const uniqueCards = cards.filter(card => {
        const nt = normalizeTitle(card.title);
        // 标题归一化重复 (vs 已有 + 同批次)
        if (existingTitleSet.has(nt) || batchTitleSet.has(nt)) return false;
        // 内容 SimHash 近似重复 (vs 已有 + 同批次), 阈值 3
        const h = simhash(card.content || '');
        const isDup = [...existingHashes, ...batchHashes].some(eh => hammingDistance(h, eh) <= 3);
        if (isDup) return false;
        batchTitleSet.add(nt);
        batchHashes.push(h);
        return true;
    });

    if (uniqueCards.length === 0) {
        console.log(`[CardGeneration] All ${cards.length} cards were duplicates, skipping.`);
        return;
    }

    await prisma.card.createMany({
        data: uniqueCards.map(card => ({
            personId,
            type: card.type,
            title: card.title,
            content: card.content,
            tags: card.tags,
            sourceUrl: card.sourceUrl,
            importance: card.importance,
            generationId,
            isActive: true,
        })),
        skipDuplicates: true,
    });

    console.log(`[CardGeneration] Saved ${uniqueCards.length} new cards for person ${personId} (filtered ${cards.length - uniqueCards.length} duplicates)`);
}
