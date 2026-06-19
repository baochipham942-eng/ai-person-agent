/**
 * 内容关键词 / 实体提取（字幕、博客全文等长文本通用）
 *
 * 产出用于：① 主题页自动挂载的相关性匹配（keywords/topics vs KnowledgeThread.tags/aliases）
 *           ② 内容检索与交叉引用
 * 走统一 provider 层（deepseek -> gemini 降级 + JSON 校验）。
 */

import { z } from 'zod';
import { generateStructured, type ChatMessage } from './provider';

export const ContentKeywordsSchema = z.object({
    // AI/技术领域的概念关键词（用于主题匹配，落到工业界公认概念名）
    keywords: z.array(z.string()).max(20).default([]),
    // 命名实体：人名 / 公司 / 产品 / 模型
    entities: z.array(z.string()).max(20).default([]),
    // 归一化主题词（贴近 KnowledgeThread.tags 的粒度，如 "agentic coding"、"rag"）
    topics: z.array(z.string()).max(12).default([]),
    // 一句话主旨（中文），便于人看
    gist: z.string().max(400).default(''),
});

export type ContentKeywords = z.infer<typeof ContentKeywordsSchema>;

/**
 * 长文本采样：取开头 + 中段 + 结尾各一段，避免只看开头丢失核心论点，
 * 同时控制 token 成本（字幕可达 10 万+ 字）。
 */
function sampleLongText(text: string, perChunk = 2500): string {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean.length <= perChunk * 3) return clean;
    const head = clean.slice(0, perChunk);
    const midStart = Math.floor(clean.length / 2 - perChunk / 2);
    const mid = clean.slice(midStart, midStart + perChunk);
    const tail = clean.slice(clean.length - perChunk);
    return `${head}\n...\n${mid}\n...\n${tail}`;
}

export interface ExtractKeywordsOptions {
    /** 内容类型标签，影响 prompt 语气，如 'YouTube 访谈字幕' / '官方博客文章' */
    contentType?: string;
    perChunk?: number;
}

/**
 * 从标题 + 正文提取关键词/实体/主题。
 * 失败（所有 provider 挂）时抛错，由调用方决定跳过还是中止。
 */
export async function extractContentKeywords(
    title: string,
    text: string,
    options: ExtractKeywordsOptions = {},
): Promise<ContentKeywords> {
    const contentType = options.contentType ?? '内容';
    const sample = sampleLongText(text || '', options.perChunk);

    const messages: ChatMessage[] = [
        {
            role: 'system',
            content:
                '你是 AI 行业内容分析助手。从给定标题与正文中提取用于知识图谱检索的结构化标签。' +
                '要求：keywords/topics 必须落到工业界公认的概念名（如 "agentic coding"、"retrieval-augmented generation"、"mixture of experts"），' +
                '不要用泛词（如 "AI"、"技术"、"未来"）。entities 只填确切出现的人名/公司/产品/模型名。' +
                'topics 比 keywords 更粗粒度、更接近话题标签。所有标签用英文小写（专有名词保留原写法），gist 用中文。',
        },
        {
            role: 'user',
            content: `内容类型：${contentType}\n标题：${title}\n\n正文（已采样）：\n${sample}`,
        },
    ];

    const { data } = await generateStructured(messages, ContentKeywordsSchema, {
        temperature: 0.2,
        maxTokens: 800,
    });

    // 去重 + 去空
    const norm = (arr: string[]) =>
        Array.from(new Set(arr.map(s => s.trim()).filter(Boolean)));
    return {
        keywords: norm(data.keywords),
        entities: norm(data.entities),
        topics: norm(data.topics),
        gist: data.gist?.trim() ?? '',
    };
}
