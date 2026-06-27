import { z } from 'zod';

export const SectionTypeSchema = z.enum(['abstract', 'problem', 'method', 'experiment', 'result', 'limitation', 'other']);

export const sectionTypes = new Set(SectionTypeSchema.options);

export const PaperGuideSchema = z.object({
  summary: guideString(800, '摘要未提供足够信息稳定总结论文主张。'),
  problem: guideString(800, '摘要未提供足够信息稳定判断研究问题。'),
  novelty: guideString(800, '摘要未提供足够信息稳定判断新意。'),
  method: guideString(900, '摘要未提供足够信息稳定还原方法。'),
  experiments: guideString(900, '摘要未提供明确实验设置或关键数字。'),
  limitations: guideString(800, '摘要未提供足够信息稳定判断局限。'),
  readingPath: z.array(z.object({
    title: guideString(120, '继续阅读'),
    sectionType: z.preprocess(value => {
      const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
      return sectionTypes.has(normalized as PaperGuideSectionType) ? normalized : 'other';
    }, SectionTypeSchema),
    why: guideString(400, '这一段有助于确认论文主张和证据边界。'),
    anchor: z.preprocess(value => typeof value === 'string' && value.trim() ? value.trim() : null, z.string().nullable()),
  })).min(1).max(6),
  fit: z.object({
    whoShouldRead: guideString(500, '关注这位研究者和相关主题的读者。'),
    whyRelevantToProduct: guideString(700, '这篇论文可作为 AI 人物库里人物和主题关系的证据来源。'),
  }),
});

export const CachedPaperGuideSchema = z.object({
  promptVersion: z.string(),
  abstractHash: z.string(),
  generatedAt: z.string(),
  provider: z.string().nullable().optional(),
  usage: z.object({
    inputTokens: z.number().optional(),
    outputTokens: z.number().optional(),
    totalTokens: z.number().optional(),
  }).optional(),
  guide: PaperGuideSchema,
});

export const CachedPaperPageTextSchema = z.object({
  version: z.string(),
  pdfUrlHash: z.string(),
  pageNumber: z.number().int().positive(),
  pageCount: z.number().int().positive(),
  text: z.string(),
  textHash: z.string(),
  extractedAt: z.string(),
});

export const CachedPaperTranslationSchema = z.object({
  promptVersion: z.string(),
  scope: z.enum(['page', 'abstract']),
  pageNumber: z.number().int().positive().nullable(),
  textHash: z.string(),
  translatedAt: z.string(),
  provider: z.string().nullable().optional(),
  usage: z.object({
    inputTokens: z.number().optional(),
    outputTokens: z.number().optional(),
    totalTokens: z.number().optional(),
  }).optional(),
  translation: z.string(),
});

export const PaperChatAnswerSchema = z.object({
  answer: guideString(2400, '论文片段不足以稳定回答这个问题。'),
  citations: z.array(z.object({
    chunkIndex: z.number().int().nonnegative().optional(),
    sourceKind: z.enum(['paper_chunk']).optional(),
    pageNumber: z.number().int().positive().nullable().optional(),
    sectionTitle: z.string().trim().max(180).nullable().optional(),
    quote: chatCitationQuote(),
  })).max(5).default([]),
});

export const CachedPaperChatCitationSchema = z.object({
  chunkId: z.string(),
  chunkIndex: z.number().int(),
  pageNumber: z.number().int().positive().nullable(),
  sectionTitle: z.string().nullable(),
  sectionType: z.preprocess(value => normalizeSectionType(typeof value === 'string' ? value : null), SectionTypeSchema),
  quote: z.string(),
  label: z.string(),
  sourceKind: z.enum(['paper_chunk']),
  sourceTitle: z.string().nullable(),
  href: z.string().nullable(),
});

export const CachedPaperChatAnswerSchema = z.object({
  promptVersion: z.string(),
  cacheKey: z.string(),
  contextHash: z.string(),
  questionHash: z.string(),
  generatedAt: z.string(),
  provider: z.string(),
  usage: z.object({
    inputTokens: z.number().optional(),
    outputTokens: z.number().optional(),
    totalTokens: z.number().optional(),
  }).optional(),
  answer: z.string(),
  citations: z.array(CachedPaperChatCitationSchema),
});

export const CachedPaperReferenceCardSchema = z.object({
  openalexId: z.string(),
  openalexUrl: z.string(),
  title: z.string(),
  year: z.number().int().nullable(),
  authors: z.array(z.string()),
  venue: z.string().nullable(),
  abstract: z.string(),
  doi: z.string().nullable(),
  landingPageUrl: z.string().nullable(),
  citationCount: z.number().int().nonnegative(),
});

export const CachedPaperReferencesSchema = z.object({
  version: z.string(),
  openalexWorkId: z.string().nullable(),
  openalexWorkTitle: z.string().nullable().optional(),
  titleSimilarity: z.number().min(0).max(1).nullable().optional(),
  titleMismatch: z.boolean().optional(),
  message: z.string().nullable().optional(),
  fetchedAt: z.string(),
  referencesTotal: z.number().int().nonnegative(),
  references: z.array(CachedPaperReferenceCardSchema),
});

export const CachedPaperNoteSchema = z.object({
  id: z.string(),
  body: z.string(),
  quote: z.string().nullable(),
  pageNumber: z.number().int().positive().nullable(),
  sectionId: z.string().nullable(),
  sectionTitle: z.string().nullable(),
  sectionType: z.preprocess(value => normalizeSectionType(typeof value === 'string' ? value : null), SectionTypeSchema).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CachedPaperNotesSchema = z.object({
  version: z.string(),
  updatedAt: z.string(),
  items: z.array(CachedPaperNoteSchema),
});

export type PaperGuide = z.infer<typeof PaperGuideSchema>;

export type PaperGuideSectionType = z.infer<typeof SectionTypeSchema>;

export function guideString(maxLength: number, fallback: string) {
  return z.preprocess(value => {
    if (typeof value === 'string') return value.trim() || fallback;
    if (Array.isArray(value)) {
      const joined = value
        .map(item => typeof item === 'string' ? item : JSON.stringify(item))
        .join('；')
        .trim();
      return joined || fallback;
    }
    if (value && typeof value === 'object') {
      const text = JSON.stringify(value);
      return text.trim() || fallback;
    }
    return fallback;
  }, z.string().trim().min(1).max(maxLength));
}

export function chatCitationQuote() {
  return z.preprocess(value => {
    return normalizePaperChatCitationQuote(value);
  }, z.string().trim().max(1_600).nullable().optional());
}

export function normalizePaperChatCitationQuote(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, 1_600) : null;
}

export function normalizeSectionType(value: string | null | undefined): PaperGuideSectionType {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return sectionTypes.has(normalized as PaperGuideSectionType) ? normalized as PaperGuideSectionType : 'other';
}
