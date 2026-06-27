import { generateStructured } from '@/lib/ai/provider';
import { PAPER_GUIDE_PROMPT_VERSION } from './constants';
import { CachedPaperGuideSchema, PaperGuideSchema, type PaperGuide } from './schemas';
import type { PaperSourceRecord, PaperSourceViewModel } from './types';
import { paperLlmChain } from './llm';
import { paperAbstract } from './metadata';
import { mergePaperMetadata } from './storage';
import {
  asRecord,
  hashText,
  readNumber,
  readString,
  readStringArray,
  truncate,
} from './utils';

export function isPaperGuideCacheUsable(value: unknown, abstractHash: string): boolean {
  const parsed = CachedPaperGuideSchema.safeParse(value);
  return parsed.success
    && parsed.data.promptVersion === PAPER_GUIDE_PROMPT_VERSION
    && parsed.data.abstractHash === abstractHash;
}

export function getCachedOrFallbackPaperGuide(source: PaperSourceRecord): PaperSourceViewModel['guide'] {
  const metadata = asRecord(source.metadata);
  const abstract = paperAbstract(source, metadata);
  const abstractHash = hashText(abstract);
  const cached = CachedPaperGuideSchema.safeParse(metadata.paperGuide);

  if (
    cached.success
    && cached.data.promptVersion === PAPER_GUIDE_PROMPT_VERSION
    && cached.data.abstractHash === abstractHash
  ) {
    return {
      status: 'ready',
      cacheHit: true,
      generatedAt: cached.data.generatedAt,
      provider: cached.data.provider || null,
      usage: cached.data.usage,
      message: null,
      data: cached.data.guide,
    };
  }

  const staleCache = cached.success && cached.data.promptVersion === PAPER_GUIDE_PROMPT_VERSION;
  return {
    status: 'fallback',
    cacheHit: false,
    generatedAt: null,
    provider: null,
    message: staleCache
      ? '导读缓存已过期，页面会通过站内 API 重新生成并缓存。'
      : '页面已先使用摘要生成本地导读，结构化导读会通过站内 API 生成并缓存。',
    data: fallbackGuide(source, metadata, abstract),
  };
}

export async function getOrCreatePaperGuide(source: PaperSourceRecord): Promise<PaperSourceViewModel['guide']> {
  const metadata = asRecord(source.metadata);
  const abstract = paperAbstract(source, metadata);
  const abstractHash = hashText(abstract);
  const cached = CachedPaperGuideSchema.safeParse(metadata.paperGuide);

  if (
    cached.success
    && cached.data.promptVersion === PAPER_GUIDE_PROMPT_VERSION
    && cached.data.abstractHash === abstractHash
  ) {
    return {
      status: 'ready',
      cacheHit: true,
      generatedAt: cached.data.generatedAt,
      provider: cached.data.provider || null,
      usage: cached.data.usage,
      message: null,
      data: cached.data.guide,
    };
  }

  let result;
  try {
    result = await generateStructured(buildGuideMessages(source, metadata, abstract), PaperGuideSchema, {
      chain: paperLlmChain(),
      temperature: 0.1,
      maxTokens: 1600,
      timeoutMs: 60_000,
    });
  } catch (error) {
    return {
      status: 'fallback',
      cacheHit: false,
      generatedAt: null,
      provider: null,
      message: error instanceof Error ? error.message : 'paper guide LLM failed',
      data: fallbackGuide(source, metadata, abstract),
    };
  }

  const generatedAt = new Date().toISOString();
  // 缓存写失败（如 Neon 存储满拒写）不应丢弃已生成的真导读：写不进就不缓存，照常返回。
  try {
    await mergePaperMetadata(source.id, {
      paperGuide: {
        promptVersion: PAPER_GUIDE_PROMPT_VERSION,
        abstractHash,
        generatedAt,
        provider: result.provider,
        usage: result.usage,
        guide: result.data,
      },
    });
  } catch {
    // 缓存不可用，导读仍然有效，只是下次访问会重新生成。
  }
  return {
    status: 'ready',
    cacheHit: false,
    generatedAt,
    provider: result.provider,
    usage: result.usage,
    message: null,
    data: result.data,
  };
}

function buildGuideMessages(source: PaperSourceRecord, metadata: Record<string, unknown>, abstract: string) {
  return [
    {
      role: 'system' as const,
      content: [
        '你是 AI 人物库的论文导读助手。',
        '只根据输入的论文 metadata 和 abstract 生成结构化导读。',
        '不要编造 abstract 中没有的实验数字、benchmark、结论或页码；没有就明确说摘要未提供。',
        '输出必须是 JSON，字段严格为 summary/problem/novelty/method/experiments/limitations/readingPath/fit。',
        '所有叶子字段都必须输出字符串；readingPath[].why 不能是数组或对象。',
        'readingPath 的 sectionType 只能是 abstract/problem/method/experiment/result/limitation/other。',
      ].join('\n'),
    },
    {
      role: 'user' as const,
      content: JSON.stringify({
        paper: {
          title: source.title,
          abstract,
          url: source.url,
          publishedAt: source.publishedAt?.toISOString() || null,
          doi: readString(metadata.doi),
          venue: readString(metadata.venue),
          citationCount: readNumber(metadata.citationCount),
          authors: readStringArray(metadata.authors),
          concepts: readStringArray(metadata.concepts),
        },
        person: {
          name: source.person.name,
          currentTitle: source.person.currentTitle,
        },
        productContext: 'AI 人物库会把论文作为人物、主题和实现线索的证据来源。',
        requirements: [
          'summary 用一句话说这篇论文讲什么。',
          'problem/novelty/method/experiments/limitations 都必须非空。',
          'experiments 中没有明确数字时，不要补数字。',
          'fit.whyRelevantToProduct 说明它和 AI 人物库/主题页的关系。',
          'readingPath 给 3 到 5 个可执行阅读顺序；title 和 why 必须是短字符串；anchor 可为 null。',
        ],
      }),
    },
  ];
}

function fallbackGuide(source: PaperSourceRecord, metadata: Record<string, unknown>, abstract: string): PaperGuide {
  const shortAbstract = truncate(abstract, 220);
  return {
    summary: shortAbstract,
    problem: shortAbstract,
    novelty: '摘要里没有足够信息稳定判断新意，需要打开原文或 PDF 继续确认。',
    method: '摘要里没有足够信息稳定还原方法细节。',
    experiments: '摘要里没有足够信息稳定提取实验设置和关键数字。',
    limitations: '摘要里没有足够信息稳定判断局限。',
    readingPath: [
      {
        title: '先读摘要',
        sectionType: 'abstract',
        why: '当前站内资料以 abstract 为主要证据，先确认论文问题和贡献边界。',
        anchor: null,
      },
      {
        title: '再打开原文',
        sectionType: 'other',
        why: readString(metadata.pdfUrl) ? 'PDF 可用于继续核方法、实验和局限。' : '没有开放 PDF 时，只能从 DOI/OpenAlex landing page 继续读。',
        anchor: null,
      },
    ],
    fit: {
      whoShouldRead: `${source.person.name} 相关主题的读者。`,
      whyRelevantToProduct: '这篇论文可作为人物页和主题页里的研究证据来源，但 P0 导读需要 LLM 成功生成后才更完整。',
    },
  };
}
