import { generate } from '@/lib/ai/provider';
import { prisma } from '@/lib/db/prisma';
import {
  MAX_CACHED_PAGE_TEXT_CHARS,
  PAPER_PAGE_TEXT_CACHE_VERSION,
  PAPER_TRANSLATION_PROMPT_VERSION,
} from './constants';
import { CachedPaperPageTextSchema, CachedPaperTranslationSchema } from './schemas';
import type { PaperPageTextResult, PaperSourceRecord, PaperTranslationResult } from './types';
import { paperLlmChain } from './llm';
import { paperAbstract } from './metadata';
import { extractPdfPageText } from './pdf-extract';
import { resolvePdfUrl } from './pdf-resolve';
import { loadPaperSource } from './source';
import { mergePaperMetadata, withNeonWakeup } from './storage';
import {
  asRecord,
  cleanText,
  hashText,
  normalizePageNumber,
  readString,
  truncateForTranslation,
  truncatePageText,
} from './utils';

export function isPaperTranslationCacheUsable(value: unknown, textHash: string): boolean {
  const parsed = CachedPaperTranslationSchema.safeParse(value);
  return parsed.success
    && parsed.data.promptVersion === PAPER_TRANSLATION_PROMPT_VERSION
    && parsed.data.textHash === textHash
    && parsed.data.translation.trim().length > 0;
}

export async function getPaperPageText(sourceId: string, pageNumber: number): Promise<PaperPageTextResult | null> {
  const source = await loadPaperSource(sourceId);
  if (!source) return null;
  return getOrExtractPaperPageText(source, pageNumber);
}

export async function translatePaperToChinese(input: {
  sourceId: string;
  scope: 'page' | 'abstract';
  pageNumber?: number | null;
}): Promise<PaperTranslationResult | null> {
  const source = await loadPaperSource(input.sourceId);
  if (!source) return null;

  const metadata = asRecord(source.metadata);
  const scope = input.scope;
  const sourceText = scope === 'page'
    ? (await getOrExtractPaperPageText(source, input.pageNumber || 1)).text
    : paperAbstract(source, metadata);
  const pageNumber = scope === 'page' ? normalizePageNumber(input.pageNumber || 1) : null;
  const trimmedSource = truncateForTranslation(sourceText);
  const textHash = hashText(trimmedSource);
  const cacheKey = paperTranslationCacheKey(scope, pageNumber, textHash);

  const translationCache = asRecord(metadata.paperTranslations);
  const cachedItems = asRecord(translationCache.items);
  const cached = CachedPaperTranslationSchema.safeParse(cachedItems[cacheKey]);
  if (
    cached.success
    && cached.data.promptVersion === PAPER_TRANSLATION_PROMPT_VERSION
    && cached.data.textHash === textHash
    && cached.data.translation.trim()
  ) {
    return {
      scope,
      pageNumber,
      sourceTextChars: trimmedSource.length,
      textHash,
      translation: cached.data.translation,
      cacheHit: true,
      translatedAt: cached.data.translatedAt,
      provider: cached.data.provider || null,
      usage: cached.data.usage,
    };
  }

  if (!trimmedSource) {
    throw new Error(scope === 'page' ? 'paper_page_text_empty' : 'paper_abstract_empty');
  }

  const result = await generate(buildTranslationMessages(source, metadata, trimmedSource, scope, pageNumber), {
    chain: paperLlmChain(),
    temperature: 0.1,
    maxTokens: 3000,
    timeoutMs: 90_000,
  });
  const translatedAt = new Date().toISOString();
  const translation = cleanText(result.text);
  if (!translation) throw new Error('paper_translation_empty');

  // 缓存写失败（如 Neon 存储满拒写）不应丢弃已生成的翻译：写不进就不缓存，照常返回。
  try {
    await mergePaperMetadata(source.id, {
      paperTranslations: {
        ...translationCache,
        version: PAPER_TRANSLATION_PROMPT_VERSION,
        updatedAt: translatedAt,
        items: {
          ...cachedItems,
          [cacheKey]: {
            promptVersion: PAPER_TRANSLATION_PROMPT_VERSION,
            scope,
            pageNumber,
            textHash,
            translatedAt,
            provider: result.provider,
            usage: result.usage,
            sourceTextChars: trimmedSource.length,
            translation,
          },
        },
      },
    });
  } catch {
    // 缓存不可用，翻译仍然有效，只是下次访问会重新生成。
  }

  return {
    scope,
    pageNumber,
    sourceTextChars: trimmedSource.length,
    textHash,
    translation,
    cacheHit: false,
    translatedAt,
    provider: result.provider,
    usage: result.usage,
  };
}

export async function getOrExtractPaperPageText(source: PaperSourceRecord, requestedPage: number): Promise<PaperPageTextResult> {
  const pageNumber = normalizePageNumber(requestedPage);
  const documentPageText = await getPaperDocumentPageText(source.id, pageNumber);
  if (documentPageText) return documentPageText;

  const metadata = asRecord(source.metadata);
  const resolution = await resolvePdfUrl(source);
  if (!resolution.pdfUrl) throw new Error('paper_pdf_unavailable');

  const pdfUrlHash = hashText(resolution.pdfUrl);
  const textCache = asRecord(metadata.paperTextCache);
  const cachedPages = asRecord(textCache.pages);
  const cached = CachedPaperPageTextSchema.safeParse(cachedPages[String(pageNumber)]);
  if (
    cached.success
    && cached.data.version === PAPER_PAGE_TEXT_CACHE_VERSION
    && cached.data.pdfUrlHash === pdfUrlHash
    && cached.data.text.trim()
  ) {
    return {
      pageNumber: cached.data.pageNumber,
      pageCount: cached.data.pageCount,
      text: cached.data.text,
      textHash: cached.data.textHash,
      cacheHit: true,
      extractedAt: cached.data.extractedAt,
    };
  }

  const extracted = await extractPdfPageText(resolution.pdfUrl, pageNumber);
  const extractedAt = new Date().toISOString();
  const text = truncatePageText(extracted.text, MAX_CACHED_PAGE_TEXT_CHARS);
  const textHash = hashText(text);
  const entry = {
    version: PAPER_PAGE_TEXT_CACHE_VERSION,
    pdfUrlHash,
    pageNumber: extracted.pageNumber,
    pageCount: extracted.pageCount,
    text,
    textHash,
    extractedAt,
  };

  // 缓存写失败（如 Neon 存储满拒写）不应丢弃已提取的页文本。
  try {
    await mergePaperMetadata(source.id, {
      paperTextCache: {
        ...textCache,
        version: PAPER_PAGE_TEXT_CACHE_VERSION,
        pdfUrlHash,
        updatedAt: extractedAt,
        pages: {
          ...cachedPages,
          [String(extracted.pageNumber)]: entry,
        },
      },
    });
  } catch {
    // 缓存不可用，页文本仍然有效，只是下次访问会重新提取。
  }

  return {
    ...entry,
    cacheHit: false,
  };
}

async function getPaperDocumentPageText(sourceId: string, pageNumber: number): Promise<PaperPageTextResult | null> {
  const document = await withNeonWakeup(() => prisma.paperDocument.findUnique({
    where: { sourceItemId: sourceId },
    select: {
      pageCount: true,
      parsedAt: true,
      chunks: {
        where: { pageNumber },
        orderBy: { chunkIndex: 'asc' },
        select: { text: true },
      },
    },
  }));
  if (!document || document.chunks.length === 0) return null;

  const text = truncatePageText(
    document.chunks
      .map(chunk => chunk.text)
      .filter(Boolean)
      .join('\n\n'),
    MAX_CACHED_PAGE_TEXT_CHARS,
  );
  if (!text) return null;

  return {
    pageNumber,
    pageCount: document.pageCount || pageNumber,
    text,
    textHash: hashText(text),
    cacheHit: true,
    extractedAt: document.parsedAt?.toISOString() || new Date().toISOString(),
  };
}

function buildTranslationMessages(
  source: PaperSourceRecord,
  metadata: Record<string, unknown>,
  text: string,
  scope: 'page' | 'abstract',
  pageNumber: number | null,
) {
  return [
    {
      role: 'system' as const,
      content: [
        '你是 AI 人物库的论文翻译助手。',
        '把输入的英文学术论文内容翻译成自然、准确的简体中文。',
        '保留公式、变量名、论文标题、模型名、benchmark 名、引用编号和专有名词；不要添加解释或摘要。',
        '保留原文顺序和段落；原文没有 Markdown 标题或项目符号时，不要自行添加。',
        '只输出译文。',
      ].join('\n'),
    },
    {
      role: 'user' as const,
      content: JSON.stringify({
        paper: {
          title: source.title,
          doi: readString(metadata.doi),
          venue: readString(metadata.venue),
          person: source.person.name,
        },
        scope,
        pageNumber,
        text,
      }),
    },
  ];
}

function paperTranslationCacheKey(scope: 'page' | 'abstract', pageNumber: number | null, textHash: string): string {
  return `${scope}:${pageNumber ?? 'abstract'}:${textHash}`;
}
