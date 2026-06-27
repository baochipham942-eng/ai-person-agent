import { z } from 'zod';
import { generateStructured, type ChatMessage, type LlmUsage } from '@/lib/ai/provider';
import { prisma } from '@/lib/db/prisma';
import {
  PAPER_CHAT_CACHE_LIMIT,
  PAPER_CHAT_MAX_CONTEXT_CHARS,
  PAPER_CHAT_PROMPT_VERSION,
  PUBLISHABLE_PRODUCT_EVIDENCE_STATUSES,
} from './constants';
import { CachedPaperChatAnswerSchema, PaperChatAnswerSchema, normalizeSectionType } from './schemas';
import type {
  PaperChatChunk,
  PaperChatCitation,
  PaperChatOptions,
  PaperChatRelatedContextItem,
  PaperChatResult,
  PaperSourceRecord,
} from './types';
import { paperLlmChain } from './llm';
import { getPaperRelatedThreads, isPublishablePaperRelatedThread } from './related-threads';
import { loadPaperSource } from './source';
import { isMissingProductEvidenceSourceTable, mergePaperMetadata } from './storage';
import {
  asRecord,
  cleanCitationQuote,
  cleanText,
  extractSearchTokens,
  hashText,
  normalizeCitationComparableText,
  readString,
  sectionTypeLabel,
  stripCitationTruncationSuffix,
  truncate,
} from './utils';
import { workTypeLabel } from '@/lib/work-taxonomy';

export async function answerPaperQuestion(input: PaperChatOptions): Promise<PaperChatResult | null> {
  const source = await loadPaperSource(input.sourceId);
  if (!source) return null;

  const document = await prisma.paperDocument.findUnique({
    where: { sourceItemId: source.id },
    select: {
      id: true,
      title: true,
      status: true,
      pageCount: true,
      chunks: {
        orderBy: { chunkIndex: 'asc' },
        select: {
          id: true,
          chunkIndex: true,
          text: true,
          textHash: true,
          pageNumber: true,
          section: {
            select: {
              title: true,
              sectionType: true,
            },
          },
        },
      },
    },
  });

  if (!document || document.chunks.length === 0) {
    throw new Error('paper_chunks_unavailable');
  }

  const chunks: PaperChatChunk[] = document.chunks.map(chunk => ({
    id: chunk.id,
    chunkIndex: chunk.chunkIndex,
    text: chunk.text,
    textHash: chunk.textHash,
    pageNumber: chunk.pageNumber,
    sectionTitle: chunk.section?.title || null,
    sectionType: normalizeSectionType(chunk.section?.sectionType),
  }));
  const selectedChunks = selectRelevantPaperChunks(chunks, input.question);
  if (selectedChunks.length === 0) throw new Error('paper_chunks_unavailable');
  const relatedContext = await getPaperChatRelatedContext(source);
  // P1 chat is grounded only in PaperChunk. Related context stays UI-only until P3 cross-source chat has explicit scope.
  const history = input.history || [];
  const chatCache = buildPaperChatCacheLookup({
    metadata: asRecord(source.metadata),
    question: input.question,
    history,
    selectedChunks,
  });
  if (chatCache.cacheable && chatCache.cached) {
    return {
      answer: chatCache.cached.answer,
      citations: chatCache.cached.citations,
      relatedContext,
      provider: chatCache.cached.provider,
      usage: chatCache.cached.usage,
      cacheHit: true,
    };
  }

  const messages = buildPaperChatMessages({
    question: input.question,
    history,
    chunks: selectedChunks,
  });

  try {
    const result = await generateStructured(messages, PaperChatAnswerSchema, {
      chain: paperLlmChain(),
      temperature: 0.1,
      maxTokens: 1800,
      timeoutMs: 60_000,
    });
    const citations = normalizePaperChatCitations(result.data.citations, selectedChunks, chunks);
    if (chatCache.cacheable) {
      await persistPaperChatCache(source.id, chatCache, {
        answer: result.data.answer,
        citations,
        provider: result.provider,
        usage: result.usage,
      });
    }
    return {
      answer: result.data.answer,
      citations,
      relatedContext,
      provider: result.provider,
      usage: result.usage,
      cacheHit: false,
    };
  } catch (error) {
    console.warn('[paper-chat] LLM answer failed:', error);
    const citations = fallbackPaperChatCitations(selectedChunks);
    return {
      answer: buildPaperChatFallbackAnswer(input.question, citations),
      citations,
      relatedContext,
      provider: 'local-paper-fallback',
      cacheHit: false,
    };
  }
}

function buildPaperChatCacheLookup(input: {
  metadata: Record<string, unknown>;
  question: string;
  history: Array<{ role: 'assistant' | 'user'; content: string }>;
  selectedChunks: PaperChatChunk[];
}): {
  cacheable: boolean;
  cacheKey: string;
  questionHash: string;
  contextHash: string;
  existingCache: Record<string, unknown>;
  existingItems: Record<string, unknown>;
  cached: z.infer<typeof CachedPaperChatAnswerSchema> | null;
} {
  const normalizedQuestion = cleanText(input.question).toLowerCase();
  const normalizedHistory = input.history
    .map(item => `${item.role}:${cleanText(item.content)}`)
    .filter(Boolean);
  const questionHash = hashText(JSON.stringify({ question: normalizedQuestion, history: normalizedHistory }));
  const contextHash = hashText(JSON.stringify({
    chunks: input.selectedChunks.map(chunk => ({
      id: chunk.id,
      chunkIndex: chunk.chunkIndex,
      textHash: chunk.textHash,
      pageNumber: chunk.pageNumber,
      sectionType: chunk.sectionType,
    })),
  }));
  const cacheKey = `${PAPER_CHAT_PROMPT_VERSION}:${questionHash}:${contextHash}`;
  const existingCache = asRecord(input.metadata.paperChatCache);
  const existingItems = asRecord(existingCache.items);
  const cached = CachedPaperChatAnswerSchema.safeParse(existingItems[cacheKey]);

  return {
    cacheable: normalizedHistory.length === 0,
    cacheKey,
    questionHash,
    contextHash,
    existingCache,
    existingItems,
    cached: cached.success && cached.data.promptVersion === PAPER_CHAT_PROMPT_VERSION ? cached.data : null,
  };
}

async function persistPaperChatCache(
  sourceId: string,
  cache: ReturnType<typeof buildPaperChatCacheLookup>,
  result: {
    answer: string;
    citations: PaperChatCitation[];
    provider: string;
    usage?: LlmUsage;
  },
) {
  const generatedAt = new Date().toISOString();
  const nextItems = trimPaperChatCacheItems({
    ...cache.existingItems,
    [cache.cacheKey]: {
      promptVersion: PAPER_CHAT_PROMPT_VERSION,
      cacheKey: cache.cacheKey,
      questionHash: cache.questionHash,
      contextHash: cache.contextHash,
      generatedAt,
      provider: result.provider,
      usage: result.usage,
      answer: result.answer,
      citations: result.citations,
    },
  });

  await mergePaperMetadata(sourceId, {
    paperChatCache: {
      ...cache.existingCache,
      version: PAPER_CHAT_PROMPT_VERSION,
      updatedAt: generatedAt,
      items: nextItems,
    },
  });
}

function trimPaperChatCacheItems(items: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(items)
      .sort((left, right) => {
        const leftGeneratedAt = readString(asRecord(left[1]).generatedAt) || '';
        const rightGeneratedAt = readString(asRecord(right[1]).generatedAt) || '';
        return rightGeneratedAt.localeCompare(leftGeneratedAt);
      })
      .slice(0, PAPER_CHAT_CACHE_LIMIT),
  );
}

function selectRelevantPaperChunks(chunks: PaperChatChunk[], question: string): PaperChatChunk[] {
  const tokens = extractSearchTokens(question);
  const ranked = chunks
    .map(chunk => ({
      chunk,
      score: scorePaperChunk(chunk, tokens),
    }))
    .sort((left, right) => right.score - left.score || left.chunk.chunkIndex - right.chunk.chunkIndex);

  const selected = new Map<number, PaperChatChunk>();
  for (const item of ranked.slice(0, 10)) {
    if (item.score <= 0 && selected.size > 0) continue;
    selected.set(item.chunk.chunkIndex, item.chunk);
    const previous = chunks[item.chunk.chunkIndex - 1];
    const next = chunks[item.chunk.chunkIndex + 1];
    if (previous && selected.size < 12) selected.set(previous.chunkIndex, previous);
    if (next && selected.size < 12) selected.set(next.chunkIndex, next);
  }

  if (selected.size === 0) {
    for (const chunk of chunks.slice(0, 8)) selected.set(chunk.chunkIndex, chunk);
  }

  return trimPaperChatContext(Array.from(selected.values()).sort((left, right) => left.chunkIndex - right.chunkIndex));
}

function scorePaperChunk(chunk: PaperChatChunk, tokens: string[]): number {
  const haystack = `${chunk.sectionTitle || ''}\n${chunk.text}`.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (!token) continue;
    const firstIndex = haystack.indexOf(token);
    if (firstIndex >= 0) {
      score += token.length > 3 ? 4 : 2;
      score += Math.min(3, haystack.split(token).length - 1);
      if (chunk.sectionTitle?.toLowerCase().includes(token)) score += 3;
    }
  }
  if (chunk.sectionType === 'abstract') score += 0.5;
  return score;
}

function trimPaperChatContext(chunks: PaperChatChunk[]): PaperChatChunk[] {
  const selected: PaperChatChunk[] = [];
  let chars = 0;
  for (const chunk of chunks) {
    const nextChars = chars + chunk.text.length;
    if (selected.length > 0 && nextChars > PAPER_CHAT_MAX_CONTEXT_CHARS) break;
    selected.push(chunk);
    chars = nextChars;
  }
  return selected;
}

async function getPaperChatRelatedContext(source: PaperSourceRecord): Promise<PaperChatRelatedContextItem[]> {
  const threads = (await getPaperRelatedThreads(source))
    .filter(isPublishablePaperRelatedThread)
    .map(thread => ({
      id: `thread:${thread.slug}`,
      sourceKind: 'thread' as const,
      title: thread.title,
      href: thread.href,
      relation: `KnowledgeThread ${thread.role}`,
      summary: thread.summary,
      evidenceQuote: thread.evidenceQuote,
      confidence: thread.relevanceScore,
    }));
  const workAndCode = await getPaperChatProductEvidenceContext(source.id);

  return dedupePaperChatRelatedContext([...threads, ...workAndCode]).slice(0, 12);
}

async function getPaperChatProductEvidenceContext(sourceId: string): Promise<PaperChatRelatedContextItem[]> {
  try {
    const paperLinks = await prisma.productEvidenceSource.findMany({
      where: {
        rawPoolItemId: sourceId,
        role: 'paper_foundation',
        reviewStatus: { in: PUBLISHABLE_PRODUCT_EVIDENCE_STATUSES },
      },
      select: {
        confidence: true,
        summary: true,
        evidenceQuote: true,
        product: {
          select: {
            id: true,
            slug: true,
            name: true,
            type: true,
            organizationName: true,
          },
        },
      },
      orderBy: [
        { confidence: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: 6,
    });

    const productIds = [...new Set(paperLinks.map(link => link.product.id))];
    const implementationLinks = productIds.length === 0 ? [] : await prisma.productEvidenceSource.findMany({
      where: {
        productId: { in: productIds },
        role: 'implementation_source',
        reviewStatus: { in: PUBLISHABLE_PRODUCT_EVIDENCE_STATUSES },
      },
      select: {
        confidence: true,
        summary: true,
        evidenceQuote: true,
        product: {
          select: {
            slug: true,
            name: true,
          },
        },
        rawPoolItem: {
          select: {
            id: true,
            title: true,
            url: true,
            text: true,
          },
        },
      },
      orderBy: [
        { confidence: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: 6,
    });

    return [
      ...paperLinks.map(link => ({
        id: `work:${link.product.slug}`,
        sourceKind: 'work' as const,
        title: link.product.name,
        href: `/work/${link.product.slug}`,
        relation: `论文根基 · ${workTypeLabel(link.product.type)}${link.product.organizationName ? ` · ${link.product.organizationName}` : ''}`,
        summary: link.summary,
        evidenceQuote: link.evidenceQuote,
        confidence: link.confidence,
      })),
      ...implementationLinks.map(link => ({
        id: `github:${link.rawPoolItem.id}`,
        sourceKind: 'github' as const,
        title: link.rawPoolItem.title,
        href: link.rawPoolItem.url,
        relation: `实现代码 · ${link.product.name}`,
        summary: link.summary || truncate(link.rawPoolItem.text.replace(/\s+/g, ' ').trim(), 260),
        evidenceQuote: link.evidenceQuote,
        confidence: link.confidence,
      })),
    ];
  } catch (error) {
    if (isMissingProductEvidenceSourceTable(error)) return [];
    throw error;
  }
}

function dedupePaperChatRelatedContext(items: PaperChatRelatedContextItem[]): PaperChatRelatedContextItem[] {
  const seen = new Set<string>();
  const result: PaperChatRelatedContextItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result.sort((left, right) => (right.confidence ?? 0) - (left.confidence ?? 0) || left.title.localeCompare(right.title));
}

function buildPaperChatMessages(input: {
  question: string;
  history: Array<{ role: 'assistant' | 'user'; content: string }>;
  chunks: PaperChatChunk[];
}): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        '你是 AI 人物库的论文问答助手。',
        '只能根据输入的 PaperChunk 片段回答，不能使用外部知识或猜测。',
        '如果片段不足以回答，要明确说证据不足，但仍引用最相关 chunk。',
        '回答语言跟随用户问题；用户用中文提问时，用自然中文回答。',
        '每个关键判断都必须能对应 citations；论文内判断引用 chunkIndex。',
        '不要编造论文片段中没有的实验数字、benchmark、作者结论或页码。',
        '只输出 JSON，字段为 answer 和 citations。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        schema: {
          answer: 'string',
          citations: [
            {
              chunkIndex: 'number from provided chunks',
              sourceKind: 'paper_chunk',
              pageNumber: 'page number from provided chunks or null',
              sectionTitle: 'section title from provided chunks',
              quote: 'short exact quote from a provided chunk',
            },
          ],
        },
        question: input.question,
        recentChat: formatPaperChatHistory(input.history),
        chunks: input.chunks.map(chunk => ({
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber,
          sectionTitle: chunk.sectionTitle,
          sectionType: chunk.sectionType,
          text: chunk.text,
        })),
        requirements: [
          'answer 用 1-4 段，直接回答问题。',
          '至少给 1 条 citation，最多 5 条。',
          'quote 必须尽量复用 chunk 原文，不要改写成总结。',
          'citation 的 sourceKind 使用 paper_chunk。',
          '没有足够证据时，不要输出确定结论。',
        ],
      }),
    },
  ];
}

function normalizePaperChatCitations(
  rawCitations: z.infer<typeof PaperChatAnswerSchema>['citations'],
  selectedChunks: PaperChatChunk[],
  allChunks: PaperChatChunk[],
): PaperChatCitation[] {
  const citations: PaperChatCitation[] = [];
  for (const raw of rawCitations) {
    const chunk = findPaperChunkByCitation(raw, selectedChunks) || findPaperChunkByCitation(raw, allChunks);
    if (!chunk) continue;
    citations.push(toPaperChatCitation(chunk, raw.quote ?? undefined));
  }
  if (!citations.some(citation => citation.sourceKind === 'paper_chunk')) {
    citations.unshift(...fallbackPaperChatCitations(selectedChunks).slice(0, 1));
  }
  if (citations.length === 0) return fallbackPaperChatCitations(selectedChunks);
  return dedupePaperChatCitations(citations).slice(0, 5);
}

function findPaperChunkByCitation(
  raw: z.infer<typeof PaperChatAnswerSchema>['citations'][number],
  chunks: PaperChatChunk[],
): PaperChatChunk | null {
  if (typeof raw.chunkIndex === 'number') {
    const byIndex = chunks.find(chunk => chunk.chunkIndex === raw.chunkIndex);
    if (byIndex) return byIndex;
  }
  const quote = raw.quote?.trim().toLowerCase();
  if (quote && quote.length >= 8) {
    const normalizedQuote = quote.slice(0, 160);
    const byQuote = chunks.find(chunk => chunk.text.toLowerCase().includes(normalizedQuote));
    if (byQuote) return byQuote;
  }
  if (typeof raw.pageNumber === 'number') {
    const byPage = chunks.find(chunk => chunk.pageNumber === raw.pageNumber);
    if (byPage) return byPage;
  }
  return null;
}

function fallbackPaperChatCitations(chunks: PaperChatChunk[]): PaperChatCitation[] {
  return chunks
    .filter(chunk => chunk.text.trim().length > 0)
    .slice(0, 4)
    .map(chunk => toPaperChatCitation(chunk));
}

function toPaperChatCitation(chunk: PaperChatChunk, quote?: string): PaperChatCitation {
  const text = groundPaperCitationQuote(chunk.text, quote);
  return {
    chunkId: chunk.id,
    chunkIndex: chunk.chunkIndex,
    pageNumber: chunk.pageNumber,
    sectionTitle: chunk.sectionTitle,
    sectionType: chunk.sectionType,
    quote: text,
    label: chunk.pageNumber ? `p.${chunk.pageNumber}` : sectionTypeLabel(chunk.sectionType),
    sourceKind: 'paper_chunk',
    sourceTitle: null,
    href: null,
  };
}

export function isPaperCitationQuoteGrounded(sourceText: string, quote: string): boolean {
  const normalizedSource = normalizeCitationComparableText(sourceText);
  const normalizedQuote = stripCitationTruncationSuffix(normalizeCitationComparableText(quote));
  return normalizedQuote.length >= 8 && normalizedSource.includes(normalizedQuote);
}

export function groundPaperCitationQuote(sourceText: string, quote?: string | null): string {
  const source = cleanCitationQuote(sourceText);
  const candidate = cleanCitationQuote(quote || '');
  const grounded = candidate && isPaperCitationQuoteGrounded(source, candidate) ? candidate : source;
  return grounded.length > 260 ? `${grounded.slice(0, 257)}...` : grounded;
}

function dedupePaperChatCitations(citations: PaperChatCitation[]): PaperChatCitation[] {
  const seen = new Set<string>();
  const result: PaperChatCitation[] = [];
  for (const citation of citations) {
    const key = `chunk:${citation.chunkIndex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(citation);
  }
  return result;
}

function buildPaperChatFallbackAnswer(question: string, citations: PaperChatCitation[]): string {
  if (citations.length === 0) {
    return `我暂时没法从这篇论文已解析的片段里找到和「${question}」直接相关的证据。`;
  }
  const labels = citations.map(citation => citation.label).join('、');
  return `模型暂时不可用，我先按论文 chunk 检索到了和「${question}」最相关的片段，集中在 ${labels}。可以点引用回到对应 PDF 页核对。`;
}

function formatPaperChatHistory(history: Array<{ role: 'assistant' | 'user'; content: string }>): string {
  if (history.length === 0) return '';
  return history.map(item => `${item.role}: ${truncate(item.content, 700)}`).join('\n');
}
