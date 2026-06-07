/**
 * 语义清洗层 (L1)
 *
 * 替代 QA Agent 的关键词规则判定 (isAIRelevant 子串命中 / isAboutPerson org 子串)。
 * 用 gemini-3-flash-preview 批量给每条 item 打分:
 *   - aboutPerson: 是否真的关于目标人物 (0-1)
 *   - aiRelevant:  是否 AI/科技相关 (0-1)
 *   - quality:     内容质量/信息密度/原创性 (0-1)
 *   - verdict:     keep / reject / review
 *
 * 设计要点:
 * - 批量喂 (默认 8 条/请求) 省成本; flash 单价极低
 * - 走 provider 抽象, 默认 chain ['gemini']; 失败降级
 * - 基础设施失败(整批报错) -> 该批默认 'review', 不误杀 (保守)
 */

import { z } from 'zod';
import { generateStructured, type ChatMessage, type ProviderName } from '@/lib/ai/provider';
import type { NormalizedItem, PersonContext } from '@/lib/datasources/adapter';

const ScoreSchema = z.object({
    scores: z.array(z.object({
        index: z.number(),
        aboutPerson: z.number().min(0).max(1),
        aiRelevant: z.number().min(0).max(1),
        quality: z.number().min(0).max(1),
        verdict: z.enum(['keep', 'reject', 'review']),
        reason: z.string(),
    })),
});

export interface SemanticScore {
    aboutPerson: number;
    aiRelevant: number;
    quality: number;
    verdict: 'keep' | 'reject' | 'review';
    reason: string;
}

export interface SemanticQAConfig {
    batchSize: number;
    chain: ProviderName[];
    maxTextChars: number;
}

const DEFAULT_CONFIG: SemanticQAConfig = {
    batchSize: 8,
    chain: ['gemini', 'deepseek'],
    maxTextChars: 600,
};

export interface SemanticQAResult {
    scored: Array<{ item: NormalizedItem; score: SemanticScore }>;
    keep: NormalizedItem[];
    review: Array<{ item: NormalizedItem; score: SemanticScore }>;
    reject: Array<{ item: NormalizedItem; score: SemanticScore }>;
    stats: { total: number; keep: number; review: number; reject: number; failedBatches: number };
}

function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

function buildPrompt(items: NormalizedItem[], person: PersonContext, maxChars: number): ChatMessage[] {
    const personDesc = [
        `姓名: ${person.name}${person.englishName && person.englishName !== person.name ? ` (${person.englishName})` : ''}`,
        person.aliases?.length ? `别名: ${person.aliases.join(', ')}` : '',
        person.organizations?.length ? `机构: ${person.organizations.join(', ')}` : '',
        person.occupations?.length ? `职业: ${person.occupations.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    const itemList = items.map((it, i) => {
        const text = (it.text || '').slice(0, maxChars);
        return `[${i}] 来源:${it.sourceType}${it.isOfficial ? '(官方)' : ''}\n标题: ${it.title || '(无)'}\n内容: ${text}`;
    }).join('\n\n');

    return [
        {
            role: 'system',
            content: `你是 AI 人物库的内容质检员。对每条内容判断三个维度并给出 verdict。
- aboutPerson (0-1): 内容是否真的关于这位特定人物本人 (不是同名者, 不是仅提到其所在机构)。仅提到 "Google" 不代表关于这个人。
- aiRelevant (0-1): 是否与 AI/机器学习/科技行业相关。
- quality (0-1): 信息密度与价值 (原创观点/事实>泛泛而谈; 空洞/营销/标题党给低分)。
- verdict: keep(三项都达标,值得入库) / reject(明显不相关或抓错人或低质) / review(模糊,需人工)。
官方来源(标注"官方")通常 aboutPerson 高, 但仍要判断 aiRelevant 和 quality。
对每条按其 index 返回。reason 用一句话中文说明。`,
        },
        {
            role: 'user',
            content: `目标人物:\n${personDesc}\n\n待质检内容 (共 ${items.length} 条):\n\n${itemList}\n\n返回 JSON: {"scores":[{"index","aboutPerson","aiRelevant","quality","verdict","reason"},...]}`,
        },
    ];
}

export async function semanticQA(
    items: NormalizedItem[],
    person: PersonContext,
    config: Partial<SemanticQAConfig> = {}
): Promise<SemanticQAResult> {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const scored: SemanticQAResult['scored'] = [];
    let failedBatches = 0;

    const batches = chunk(items, cfg.batchSize);
    for (const batch of batches) {
        try {
            const { data } = await generateStructured(
                buildPrompt(batch, person, cfg.maxTextChars),
                ScoreSchema,
                { chain: cfg.chain, maxTokens: 1500, temperature: 0.2 }
            );
            const byIndex = new Map(data.scores.map(s => [s.index, s]));
            batch.forEach((item, i) => {
                const s = byIndex.get(i);
                if (s) {
                    scored.push({ item, score: { aboutPerson: s.aboutPerson, aiRelevant: s.aiRelevant, quality: s.quality, verdict: s.verdict, reason: s.reason } });
                } else {
                    // 模型漏了这条 -> review
                    scored.push({ item, score: { aboutPerson: 0, aiRelevant: 0, quality: 0, verdict: 'review', reason: '模型未返回该条评分' } });
                }
            });
        } catch (e) {
            failedBatches++;
            console.warn(`[semanticQA] batch failed, marking ${batch.length} items as review: ${(e as Error).message?.slice(0, 120)}`);
            for (const item of batch) {
                scored.push({ item, score: { aboutPerson: 0, aiRelevant: 0, quality: 0, verdict: 'review', reason: '质检服务失败,待重试' } });
            }
        }
    }

    const keep = scored.filter(s => s.score.verdict === 'keep').map(s => s.item);
    const review = scored.filter(s => s.score.verdict === 'review');
    const reject = scored.filter(s => s.score.verdict === 'reject');

    console.log(`[semanticQA] ${items.length} 条 -> keep ${keep.length} / review ${review.length} / reject ${reject.length} (失败批次 ${failedBatches})`);

    return {
        scored,
        keep,
        review,
        reject,
        stats: { total: items.length, keep: keep.length, review: review.length, reject: reject.length, failedBatches },
    };
}
