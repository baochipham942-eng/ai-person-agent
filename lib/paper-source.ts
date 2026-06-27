import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { generate, generateStructured, type ChatMessage, type LlmUsage } from '@/lib/ai/provider';
import { prisma } from '@/lib/db/prisma';
import { getSourcePacks } from '@/lib/knowledge-threads';
import { workTypeLabel } from '@/lib/work-taxonomy';

export const PAPER_GUIDE_PROMPT_VERSION = 'paper-guide-v2';
export const PAPER_PAGE_TEXT_CACHE_VERSION = 'paper-page-text-v1';
export const PAPER_TRANSLATION_PROMPT_VERSION = 'paper-translation-v2';
export const PAPER_PARSE_VERSION = 'paper-parse-v1';
export const PAPER_REFERENCES_CACHE_VERSION = 'paper-references-v3';
export const PAPER_CHAT_PROMPT_VERSION = 'paper-chat-v4';
export const PAPER_NOTES_VERSION = 'paper-notes-v1';

const OPENALEX_WORKS_URL = 'https://api.openalex.org/works';
const OPENALEX_MAILTO = process.env.OPENALEX_MAILTO || 'ai-person-agent@example.com';
const MAX_CACHED_PAGE_TEXT_CHARS = 12_000;
const MAX_TRANSLATION_SOURCE_CHARS = 6_000;
const DEFAULT_PARSE_MAX_PAGES = 16;
const MAX_PARSE_PAGES = 80;
const DEFAULT_PDF_FETCH_TIMEOUT_MS = 120_000;
const MAX_PDF_FETCH_TIMEOUT_MS = 300_000;
const DEFAULT_PDF_FETCH_RETRIES = 1;
const MAX_PDF_FETCH_RETRIES = 3;
const DEFAULT_MAX_PDF_BYTES = 24 * 1024 * 1024;
const MAX_PDF_BYTES = 96 * 1024 * 1024;
const CHUNK_TARGET_CHARS = 1_500;
const PAPER_CHAT_MAX_CONTEXT_CHARS = 12_000;
const PAPER_CHAT_CACHE_LIMIT = 24;
const PAPER_NOTES_LIMIT = 80;
const PAPER_REFERENCE_FETCH_LIMIT = 16;
const PAPER_REFERENCE_CARD_LIMIT = 8;
const PUBLISHABLE_PRODUCT_EVIDENCE_STATUSES = ['auto', 'confirmed'];
const PAPER_ENTITY_REVIEW_STATUSES = ['needs_review', 'confirmed', 'rejected'] as const;

const SectionTypeSchema = z.enum(['abstract', 'problem', 'method', 'experiment', 'result', 'limitation', 'other']);
const sectionTypes = new Set(SectionTypeSchema.options);

const PaperGuideSchema = z.object({
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

const CachedPaperGuideSchema = z.object({
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

const CachedPaperPageTextSchema = z.object({
  version: z.string(),
  pdfUrlHash: z.string(),
  pageNumber: z.number().int().positive(),
  pageCount: z.number().int().positive(),
  text: z.string(),
  textHash: z.string(),
  extractedAt: z.string(),
});

const CachedPaperTranslationSchema = z.object({
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

const PaperChatAnswerSchema = z.object({
  answer: guideString(2400, '论文片段不足以稳定回答这个问题。'),
  citations: z.array(z.object({
    chunkIndex: z.number().int().nonnegative().optional(),
    sourceKind: z.enum(['paper_chunk']).optional(),
    pageNumber: z.number().int().positive().nullable().optional(),
    sectionTitle: z.string().trim().max(180).nullable().optional(),
    quote: chatCitationQuote(),
  })).max(5).default([]),
});

const CachedPaperChatCitationSchema = z.object({
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

const CachedPaperChatAnswerSchema = z.object({
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

const CachedPaperReferenceCardSchema = z.object({
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

const CachedPaperReferencesSchema = z.object({
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

const CachedPaperNoteSchema = z.object({
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

const CachedPaperNotesSchema = z.object({
  version: z.string(),
  updatedAt: z.string(),
  items: z.array(CachedPaperNoteSchema),
});

export type PaperGuide = z.infer<typeof PaperGuideSchema>;
export type PaperGuideSectionType = z.infer<typeof SectionTypeSchema>;

export interface PaperNote {
  id: string;
  body: string;
  quote: string | null;
  pageNumber: number | null;
  sectionId: string | null;
  sectionTitle: string | null;
  sectionType: PaperGuideSectionType | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaperPageTextResult {
  pageNumber: number;
  pageCount: number;
  text: string;
  textHash: string;
  cacheHit: boolean;
  extractedAt: string;
}

export interface PaperTranslationResult {
  scope: 'page' | 'abstract';
  pageNumber: number | null;
  sourceTextChars: number;
  textHash: string;
  translation: string;
  cacheHit: boolean;
  translatedAt: string;
  provider: string | null;
  usage?: LlmUsage;
}

export interface PaperStructureSection {
  id: string;
  sectionType: PaperGuideSectionType;
  title: string;
  pageStart: number | null;
  pageEnd: number | null;
  orderIndex: number;
  textPreview: string;
  chunkCount: number;
}

export interface PaperStructureView {
  status: 'missing' | 'metadata_only' | 'parsed' | 'parse_failed' | 'pdf_fetch_failed';
  source: 'paper_document' | 'guide_fallback';
  parseVersion: string | null;
  parsedAt: string | null;
  pageCount: number | null;
  sectionCount: number;
  chunkCount: number;
  error: string | null;
  sections: PaperStructureSection[];
}

export interface PaperFigureCard {
  id: string;
  label: string;
  caption: string;
  pageNumber: number | null;
  orderIndex: number;
  imagePath: string | null;
  evidenceRole: PaperFigureEvidenceRole;
  evidenceLabel: string;
  readerQuestion: string;
  readerHint: string;
}

export type PaperFigureEvidenceRole = 'architecture' | 'method' | 'result' | 'ablation' | 'dataset' | 'limitation' | 'overview';

export type PaperSkimmingRole = 'objective' | 'novelty' | 'method' | 'result' | 'limitation';

export interface PaperSkimmingAssistItem {
  id: PaperSkimmingRole;
  role: PaperSkimmingRole;
  label: string;
  sectionType: PaperGuideSectionType;
  body: string;
  sectionId: string | null;
  sectionTitle: string | null;
  pageNumber: number | null;
  pageEnd: number | null;
  textPreview: string | null;
  source: 'paper_document' | 'guide';
}

export type PaperReadingPathStepKind = 'figure' | 'section' | 'skim';

export interface PaperReadingPathStep {
  id: string;
  kind: PaperReadingPathStepKind;
  label: string;
  title: string;
  why: string;
  pageNumber: number | null;
  targetId: string | null;
  sectionType: PaperGuideSectionType | null;
}

export interface PaperReferenceCard {
  openalexId: string;
  openalexUrl: string;
  title: string;
  year: number | null;
  authors: string[];
  venue: string | null;
  abstract: string;
  doi: string | null;
  landingPageUrl: string | null;
  citationCount: number;
  sourceItemId: string | null;
  sourceHref: string | null;
}

export type PaperReferenceQualityIssue =
  | 'openalex_reference_title_mismatch'
  | 'openalex_search_no_title_match';

export interface PaperReferenceStatus {
  status: 'ready' | 'empty' | 'unavailable' | 'failed';
  cacheHit: boolean;
  fetchedAt: string | null;
  referencesTotal: number;
  message: string | null;
  openalexWorkId: string | null;
  openalexWorkTitle: string | null;
  titleSimilarity: number | null;
  qualityIssue: PaperReferenceQualityIssue | null;
}

export interface PaperSemanticReaderView {
  source: 'paper_document' | 'guide_fallback';
  skimmingAssist: PaperSkimmingAssistItem[];
  jumpTargetCount: number;
  figures: PaperFigureCard[];
  readingPath: PaperReadingPathStep[];
  citationCards: PaperReferenceCard[];
  referenceStatus: PaperReferenceStatus;
}

export interface PaperMaterializationResult {
  sourceId: string;
  paperId: string | null;
  dryRun: boolean;
  status: PaperStructureView['status'];
  parseVersion: string;
  pdfUrl: string | null;
  pageCount: number | null;
  sectionCount: number;
  chunkCount: number;
  figureCount: number;
  textHash: string;
  parseError: string | null;
  sections: PaperStructureSection[];
  figures: PaperFigureCard[];
}

export interface PaperMaterializationOptions {
  dryRun?: boolean;
  maxPages?: number;
  refresh?: boolean;
  pdfFetchTimeoutMs?: number;
  pdfFetchRetries?: number;
  maxPdfBytes?: number;
}

export interface PaperChatCitation {
  chunkId: string;
  chunkIndex: number;
  pageNumber: number | null;
  sectionTitle: string | null;
  sectionType: PaperGuideSectionType;
  quote: string;
  label: string;
  sourceKind: 'paper_chunk';
  sourceTitle: string | null;
  href: string | null;
}

export interface PaperChatResult {
  answer: string;
  citations: PaperChatCitation[];
  relatedContext: PaperChatRelatedContextItem[];
  provider: string;
  usage?: LlmUsage;
  cacheHit?: boolean;
}

export interface PaperChatOptions {
  sourceId: string;
  question: string;
  history?: Array<{ role: 'assistant' | 'user'; content: string }>;
}

interface ExtractedPdfPage {
  pageNumber: number;
  pageCount: number;
  text: string;
}

interface PaperSectionDraft {
  id?: string;
  sectionType: PaperGuideSectionType;
  title: string;
  text: string;
  pageStart: number | null;
  pageEnd: number | null;
  orderIndex: number;
}

interface PaperChunkDraft {
  id?: string;
  sectionOrderIndex: number;
  text: string;
  pageNumber: number | null;
  chunkIndex: number;
  anchorHint: Record<string, unknown>;
  tokenEstimate: number;
  textHash: string;
}

interface PaperFigureDraft {
  id?: string;
  label: string;
  caption: string;
  pageNumber: number | null;
  orderIndex: number;
  imagePath: string | null;
  evidenceRole: PaperFigureEvidenceRole;
  evidenceLabel: string;
  readerQuestion: string;
  readerHint: string;
}

interface PaperChatChunk {
  id: string;
  chunkIndex: number;
  text: string;
  textHash: string;
  pageNumber: number | null;
  sectionTitle: string | null;
  sectionType: PaperGuideSectionType;
}

export interface PaperChatRelatedContextItem {
  id: string;
  sourceKind: 'thread' | 'work' | 'github';
  title: string;
  href: string;
  relation: string;
  summary: string | null;
  evidenceQuote: string | null;
  confidence: number | null;
}

interface PaperReferenceLookup {
  cards: PaperReferenceCard[];
  status: PaperReferenceStatus;
}

interface OpenAlexLookupCandidate {
  key: string;
  url: string;
  openalexWorkId: string | null;
}

interface FetchedOpenAlexReferences {
  referencesTotal: number;
  cards: PaperReferenceCard[];
  openalexWorkId: string | null;
  openalexWorkTitle: string | null;
  titleSimilarity: number | null;
  titleMismatch: boolean;
  message: string | null;
}

interface PdfExtractionOptions {
  fetchTimeoutMs?: number;
  fetchRetries?: number;
  maxPdfBytes?: number;
}

function guideString(maxLength: number, fallback: string) {
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

function chatCitationQuote() {
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

export interface PaperSourceViewModel {
  source: {
    id: string;
    title: string;
    url: string;
    landingPageUrl: string;
    publishedAt: string | null;
    sourceLabel: string;
  };
  person: {
    id: string;
    name: string;
    avatarUrl: string | null;
    currentTitle: string | null;
  };
  paper: {
    abstract: string;
    authors: string[];
    authorPeople: PaperAuthorPersonLink[];
    authorReviewCandidates: PaperAuthorReviewCandidate[];
    venue: string | null;
    citationCount: number | null;
    doi: string | null;
    openalexWorkId: string | null;
    openalexUrl: string | null;
    pdfUrl: string | null;
    pdfProxyUrl: string | null;
    pdfResolution: PdfResolution;
  };
  guide: {
    status: 'ready' | 'fallback' | 'failed';
    cacheHit: boolean;
    generatedAt: string | null;
    provider: string | null;
    usage?: LlmUsage;
    message: string | null;
    data: PaperGuide;
  };
  structure: PaperStructureView;
  semanticReader: PaperSemanticReaderView;
  notes: PaperNote[];
  entityReviewQueue: PaperEntityReviewItem[];
  relatedThreads: PaperRelatedThread[];
  relatedWorks: PaperRelatedWork[];
}

export interface PaperAuthorPersonLink {
  id: string;
  name: string;
  href: string;
  avatarUrl: string | null;
  currentTitle: string | null;
  openalexId: string | null;
  matchedAuthorName: string;
  matchReason: 'name_exact' | 'alias_exact';
  confidence: number;
}

export interface PaperAuthorReviewCandidate {
  name: string;
  reason: 'unmatched_author' | 'ambiguous_author';
}

export interface PaperEntityReviewCandidatePerson {
  id: string;
  name: string;
  href: string;
  currentTitle: string | null;
  openalexId: string | null;
  matchedName: string;
  matchReason: 'openalex_exact' | 'name_exact' | 'alias_exact';
  confidence: number;
}

export interface PaperEntityReviewCandidateOrganization {
  id: string;
  name: string;
  aliases: string[];
  matchReason: 'name_exact' | 'alias_exact';
  confidence: number;
}

export interface PaperEntityReviewCandidate {
  sourceItemId: string;
  entityName: string;
  entityKind: 'person' | 'organization';
  mentionType: 'author' | 'affiliation' | 'text_mention';
  matchReason: string;
  confidence: number;
  candidatePeople: PaperEntityReviewCandidatePerson[];
  candidateOrganizations: PaperEntityReviewCandidateOrganization[];
  reviewStatus: typeof PAPER_ENTITY_REVIEW_STATUSES[number];
  evidenceQuote: string | null;
  metadata: Record<string, unknown>;
}

export interface PaperEntityReviewItem extends PaperEntityReviewCandidate {
  id: string;
  createdAt: string;
  updatedAt: string;
  confirmedPerson: {
    id: string;
    name: string;
    href: string;
    currentTitle: string | null;
  } | null;
  confirmedOrganization: {
    id: string;
    name: string;
  } | null;
}

export interface PaperRelatedThread {
  slug: string;
  title: string;
  href: string;
  role: string;
  source: 'knowledge_thread_source' | 'source_pack';
  sourcePackSourceId?: string;
  sourcePackUrl?: string | null;
  relevanceScore: number | null;
  summary: string | null;
  evidenceQuote: string | null;
  matchReason: string;
  status: 'verified' | 'usable' | 'needs_review' | 'needs_capture' | 'thin';
  excludedFromTopicReadiness: boolean;
  reviewReason: string | null;
}

export interface PaperRelatedWork {
  slug: string;
  name: string;
  href: string;
  type: string;
  typeLabel: string;
  organizationName: string | null;
  url: string | null;
  confidence: number;
  matchReason: 'work_url' | 'title_mention' | 'paper_text_mention' | 'thread_overlap';
}

export interface PdfResolution {
  pdfUrl: string | null;
  source: 'metadata' | 'arxiv' | 'openalex_best_oa_location' | 'none';
  attemptedOpenAlex: boolean;
  persisted: boolean;
  message: string | null;
}

export interface PaperSourceRecord {
  id: string;
  sourceType: string;
  title: string;
  url: string;
  text: string;
  publishedAt: Date | null;
  metadata: Prisma.JsonValue | null;
  person: {
    id: string;
    name: string;
    avatarUrl: string | null;
    currentTitle: string | null;
  };
}

export interface PaperSourceViewModelOptions {
  generateGuide?: boolean;
}

export async function getPaperSourceViewModel(id: string, options: PaperSourceViewModelOptions = {}): Promise<PaperSourceViewModel | null> {
  const source = await loadPaperSource(id);
  if (!source) return null;

  const metadata = asRecord(source.metadata);
  const pdfResolution = await resolvePdfUrl(source);
  const guide = options.generateGuide === false ? getCachedOrFallbackPaperGuide(source) : await getOrCreatePaperGuide(source);
  const structure = await getPaperStructureView(source.id, guide.data);
  const figures = await getPaperFigureCards(source.id);
  const referenceLookup = await getOrCreatePaperReferenceCards(source);
  const semanticReader = buildPaperSemanticReader(guide.data, structure, referenceLookup, figures);
  const notes = listPaperNotesFromMetadata(source.metadata);
  const entityReviewQueue = await getPaperEntityReviewQueue(source.id);
  const relatedThreads = await getPaperRelatedThreads(source);
  const relatedWorks = await getPaperRelatedWorks(source, guide.data, relatedThreads);
  const doi = normalizeDoi(readString(metadata.doi));
  const openalexWorkId = readString(metadata.openalexWorkId) || readString(metadata.openalexId);
  const landingPageUrl = readString(metadata.landingPageUrl) || source.url;
  const authors = readPaperAuthorNames(metadata);
  const authorBindings = await getPaperAuthorPeople(authors);

  return {
    source: {
      id: source.id,
      title: source.title,
      url: source.url,
      landingPageUrl,
      publishedAt: formatDate(source.publishedAt),
      sourceLabel: readString(metadata.sourceLabel) || readString(metadata.venue) || 'OpenAlex',
    },
    person: {
      id: source.person.id,
      name: source.person.name,
      avatarUrl: source.person.avatarUrl,
      currentTitle: source.person.currentTitle,
    },
    paper: {
      abstract: paperAbstract(source, metadata),
      authors,
      authorPeople: authorBindings.people,
      authorReviewCandidates: authorBindings.reviewCandidates,
      venue: readString(metadata.venue),
      citationCount: readNumber(metadata.citationCount) ?? readNumber(metadata.citedByCount),
      doi,
      openalexWorkId,
      openalexUrl: openalexUrl(openalexWorkId),
      pdfUrl: pdfResolution.pdfUrl,
      pdfProxyUrl: pdfResolution.pdfUrl ? `/api/source/paper/${source.id}/pdf` : null,
      pdfResolution,
    },
    guide,
    structure,
    semanticReader,
    notes,
    entityReviewQueue,
    relatedThreads,
    relatedWorks,
  };
}

export async function getOrCreatePaperGuideViewModel(sourceId: string): Promise<PaperSourceViewModel | null> {
  return getPaperSourceViewModel(sourceId, { generateGuide: true });
}

export async function getPaperRelatedThreads(source: PaperSourceRecord): Promise<PaperRelatedThread[]> {
  const directLinks = await getPaperKnowledgeThreadLinks(source.id);
  const sourcePackLinks = getPaperSourcePackThreadLinks(source);
  const seen = new Set<string>();
  const links: PaperRelatedThread[] = [];

  for (const link of [...directLinks, ...sourcePackLinks]) {
    const key = `${link.slug}:${link.role}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push(link);
  }

  return links
    .sort((left, right) => (right.relevanceScore ?? 0) - (left.relevanceScore ?? 0))
    .slice(0, 6);
}

export function isPublishablePaperRelatedThread(thread: PaperRelatedThread): boolean {
  return !thread.excludedFromTopicReadiness && (thread.status === 'verified' || thread.status === 'usable');
}

export async function getPaperAuthorPeople(authorNames: string[]): Promise<{
  people: PaperAuthorPersonLink[];
  reviewCandidates: PaperAuthorReviewCandidate[];
}> {
  const normalizedAuthorNames = [...new Set(authorNames.map(name => name.trim()).filter(Boolean))];
  if (normalizedAuthorNames.length === 0) return { people: [], reviewCandidates: [] };

  const people = await withNeonWakeup(() => prisma.people.findMany({
    select: {
      id: true,
      name: true,
      aliases: true,
      avatarUrl: true,
      currentTitle: true,
      openalexId: true,
      influenceScore: true,
    },
  }));

  const candidatesByKey = new Map<string, Array<{
    person: (typeof people)[number];
    matchReason: PaperAuthorPersonLink['matchReason'];
  }>>();

  for (const person of people) {
    const nameKey = normalizeAuthorNameKey(person.name);
    if (nameKey) {
      const list = candidatesByKey.get(nameKey) || [];
      list.push({ person, matchReason: 'name_exact' });
      candidatesByKey.set(nameKey, list);
    }
    for (const alias of person.aliases) {
      const aliasKey = normalizeAuthorNameKey(alias);
      if (!aliasKey || aliasKey === nameKey) continue;
      const list = candidatesByKey.get(aliasKey) || [];
      list.push({ person, matchReason: 'alias_exact' });
      candidatesByKey.set(aliasKey, list);
    }
  }

  const linkedPeople: PaperAuthorPersonLink[] = [];
  const reviewCandidates: PaperAuthorReviewCandidate[] = [];
  const seenPeople = new Set<string>();

  for (const authorName of normalizedAuthorNames) {
    const key = normalizeAuthorNameKey(authorName);
    const matches = key ? candidatesByKey.get(key) || [] : [];
    const uniqueMatches = dedupeAuthorPersonMatches(matches);
    if (uniqueMatches.length === 1) {
      const match = uniqueMatches[0];
      if (!seenPeople.has(match.person.id)) {
        seenPeople.add(match.person.id);
        linkedPeople.push({
          id: match.person.id,
          name: match.person.name,
          href: `/person/${match.person.id}`,
          avatarUrl: match.person.avatarUrl,
          currentTitle: match.person.currentTitle,
          openalexId: match.person.openalexId,
          matchedAuthorName: authorName,
          matchReason: match.matchReason,
          confidence: match.matchReason === 'name_exact' ? 0.92 : 0.86,
        });
      }
    } else {
      reviewCandidates.push({
        name: authorName,
        reason: uniqueMatches.length > 1 ? 'ambiguous_author' : 'unmatched_author',
      });
    }
  }

  linkedPeople.sort((left, right) => right.confidence - left.confidence || left.name.localeCompare(right.name));
  return {
    people: linkedPeople.slice(0, 8),
    reviewCandidates: reviewCandidates.slice(0, 8),
  };
}

export async function getPaperEntityReviewQueue(sourceId: string): Promise<PaperEntityReviewItem[]> {
  try {
    const rows = await withNeonWakeup(() => prisma.paperEntityReview.findMany({
      where: { sourceItemId: sourceId },
      select: {
        id: true,
        sourceItemId: true,
        entityName: true,
        entityKind: true,
        mentionType: true,
        matchReason: true,
        confidence: true,
        candidatePeople: true,
        candidateOrganizations: true,
        reviewStatus: true,
        evidenceQuote: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        confirmedPerson: {
          select: {
            id: true,
            name: true,
            currentTitle: true,
          },
        },
        confirmedOrganization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { reviewStatus: 'asc' },
        { confidence: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: 40,
    }));

    return rows.map(row => ({
      id: row.id,
      sourceItemId: row.sourceItemId,
      entityName: row.entityName,
      entityKind: normalizePaperEntityKind(row.entityKind),
      mentionType: normalizePaperEntityMentionType(row.mentionType),
      matchReason: row.matchReason,
      confidence: row.confidence,
      candidatePeople: parsePaperEntityCandidatePeople(row.candidatePeople),
      candidateOrganizations: parsePaperEntityCandidateOrganizations(row.candidateOrganizations),
      reviewStatus: normalizePaperEntityReviewStatus(row.reviewStatus),
      evidenceQuote: row.evidenceQuote,
      metadata: asRecord(row.metadata),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      confirmedPerson: row.confirmedPerson ? {
        id: row.confirmedPerson.id,
        name: row.confirmedPerson.name,
        href: `/person/${row.confirmedPerson.id}`,
        currentTitle: row.confirmedPerson.currentTitle,
      } : null,
      confirmedOrganization: row.confirmedOrganization ? {
        id: row.confirmedOrganization.id,
        name: row.confirmedOrganization.name,
      } : null,
    }));
  } catch (error) {
    if (isMissingPaperEntityReviewTable(error)) return [];
    throw error;
  }
}

export async function buildPaperEntityReviewCandidates(
  source: PaperSourceRecord,
  options: {
    people?: Array<{
      id: string;
      name: string;
      aliases: string[];
      currentTitle: string | null;
      openalexId: string | null;
      influenceScore: number;
    }>;
    organizations?: Array<{
      id: string;
      name: string;
      aliases: string[];
    }>;
  } = {},
): Promise<PaperEntityReviewCandidate[]> {
  const metadata = asRecord(source.metadata);
  const people = options.people ?? await withNeonWakeup(() => prisma.people.findMany({
    select: {
      id: true,
      name: true,
      aliases: true,
      currentTitle: true,
      openalexId: true,
      influenceScore: true,
    },
  }));
  const organizations = options.organizations ?? await withNeonWakeup(() => prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      aliases: true,
    },
  }));

  const candidates: PaperEntityReviewCandidate[] = [];
  const authors = readPaperAuthorEntries(metadata);
  for (const author of authors) {
    const authorName = author.name;
    const candidatePeople = findPaperAuthorPersonCandidates(authorName, people, author.openalexId);
    const needsReview = candidatePeople.length !== 1;
    if (!needsReview) continue;
    candidates.push({
      sourceItemId: source.id,
      entityName: authorName,
      entityKind: 'person',
      mentionType: 'author',
      matchReason: candidatePeople.length > 1 ? 'ambiguous_author' : 'unmatched_author',
      confidence: candidatePeople.length > 1 ? 0.72 : 0.58,
      candidatePeople,
      candidateOrganizations: [],
      reviewStatus: 'needs_review',
      evidenceQuote: `Author: ${authorName}`,
      metadata: {
        materializedFrom: 'paper_author_entity_review',
        sourceUrl: source.url,
        openalexAuthorId: author.openalexId,
      },
    });
  }

  const organizationsFromMetadata = readPaperOrganizationNames(metadata);
  for (const organizationName of organizationsFromMetadata) {
    const candidateOrganizations = findPaperOrganizationCandidates(organizationName, organizations);
    candidates.push({
      sourceItemId: source.id,
      entityName: organizationName,
      entityKind: 'organization',
      mentionType: 'affiliation',
      matchReason: candidateOrganizations.length > 1
        ? 'ambiguous_affiliation'
        : candidateOrganizations.length === 1
          ? 'candidate_affiliation'
          : 'unmatched_affiliation',
      confidence: candidateOrganizations.length === 1 ? 0.7 : 0.6,
      candidatePeople: [],
      candidateOrganizations,
      reviewStatus: 'needs_review',
      evidenceQuote: `Affiliation: ${organizationName}`,
      metadata: {
        materializedFrom: 'paper_affiliation_entity_review',
        sourceUrl: source.url,
      },
    });
  }

  return dedupePaperEntityReviewCandidates(candidates).slice(0, 30);
}

export async function getPaperRelatedWorks(
  source: PaperSourceRecord,
  guide: PaperGuide,
  relatedThreads: PaperRelatedThread[] = [],
): Promise<PaperRelatedWork[]> {
  const metadata = asRecord(source.metadata);
  const identifiers = buildPaperIdentityKeys(source, metadata);
  const abstract = paperAbstract(source, metadata);
  const titleKey = normalizePaperTitleKey(source.title);
  const paperTextKey = normalizePaperTitleKey([
    abstract,
    guide.summary,
    guide.problem,
    guide.novelty,
    guide.method,
    guide.experiments,
    guide.limitations,
    guide.fit.whyRelevantToProduct,
  ].join(' '));
  const threadSlugs = new Set(relatedThreads.map(thread => thread.slug));

  const products = await withNeonWakeup(() => prisma.product.findMany({
    select: {
      slug: true,
      name: true,
      aliases: true,
      type: true,
      organizationName: true,
      url: true,
      threadSlugs: true,
      priorityScore: true,
    },
    orderBy: { priorityScore: 'desc' },
    take: 200,
  }));

  const matches: PaperRelatedWork[] = [];
  for (const product of products) {
    const urlKey = normalizeComparablePaperUrl(product.url);
    if (urlKey && identifiers.urls.has(urlKey)) {
      matches.push(paperRelatedWorkFromProduct(product, 'work_url', 0.96));
      continue;
    }

    const names = [product.name, ...product.aliases];
    const nameKeys = [...new Set(names.map(normalizePaperTitleKey).filter(isSafeWorkNeedle))];
    if (nameKeys.some(nameKey => containsNormalizedPhrase(titleKey, nameKey))) {
      matches.push(paperRelatedWorkFromProduct(product, 'title_mention', 0.9));
      continue;
    }

    if (nameKeys.some(nameKey => containsNormalizedPhrase(paperTextKey, nameKey))) {
      matches.push(paperRelatedWorkFromProduct(product, 'paper_text_mention', 0.76));
      continue;
    }

    if (product.threadSlugs.some(slug => threadSlugs.has(slug))) {
      matches.push(paperRelatedWorkFromProduct(product, 'thread_overlap', 0.68));
    }
  }

  return matches
    .sort((left, right) => right.confidence - left.confidence || left.name.localeCompare(right.name))
    .slice(0, 6);
}

function paperRelatedWorkFromProduct(
  product: {
    slug: string;
    name: string;
    type: string;
    organizationName: string | null;
    url: string | null;
  },
  matchReason: PaperRelatedWork['matchReason'],
  confidence: number,
): PaperRelatedWork {
  return {
    slug: product.slug,
    name: product.name,
    href: `/work/${product.slug}`,
    type: product.type,
    typeLabel: workTypeLabel(product.type),
    organizationName: product.organizationName,
    url: product.url,
    confidence,
    matchReason,
  };
}

const GENERIC_WORK_NEEDLES = new Set([
  'ai',
  'agent',
  'agents',
  'code',
  'datasets',
  'framework',
  'github',
  'gpt',
  'model',
  'models',
  'paper',
  'papers',
  'research',
  'tool',
]);

function isSafeWorkNeedle(value: string): boolean {
  if (!value || GENERIC_WORK_NEEDLES.has(value)) return false;
  const tokens = value.split(/\s+/).filter(Boolean);
  return value.length >= 7 || tokens.length >= 2;
}

function containsNormalizedPhrase(haystack: string, needle: string): boolean {
  return ` ${haystack} `.includes(` ${needle} `);
}

function dedupeAuthorPersonMatches<T extends { person: { id: string; influenceScore: number }; matchReason: PaperAuthorPersonLink['matchReason'] }>(matches: T[]): T[] {
  const byPerson = new Map<string, T>();
  for (const match of matches) {
    const existing = byPerson.get(match.person.id);
    if (!existing) {
      byPerson.set(match.person.id, match);
      continue;
    }
    if (existing.matchReason !== 'name_exact' && match.matchReason === 'name_exact') {
      byPerson.set(match.person.id, match);
    }
  }
  return [...byPerson.values()].sort((left, right) => {
    if (left.matchReason !== right.matchReason) return left.matchReason === 'name_exact' ? -1 : 1;
    return right.person.influenceScore - left.person.influenceScore;
  });
}

async function getPaperKnowledgeThreadLinks(sourceId: string): Promise<PaperRelatedThread[]> {
  const rows = await withNeonWakeup(() => prisma.knowledgeThreadSource.findMany({
    where: { rawPoolItemId: sourceId },
    select: {
      role: true,
      relevanceScore: true,
      summary: true,
      evidenceQuote: true,
      metadata: true,
      thread: {
        select: {
          slug: true,
          title: true,
        },
      },
    },
    orderBy: [
      { relevanceScore: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 6,
  }));

  return rows.map(row => {
    const metadata = asRecord(row.metadata);
    const matchReason = readString(metadata.matchReason) || '已绑定到 KnowledgeThreadSource';
    const quality = paperThreadQualityFromMetadata(metadata, matchReason);
    return {
      slug: row.thread.slug,
      title: row.thread.title,
      href: `/threads/${row.thread.slug}`,
      role: row.role,
      source: 'knowledge_thread_source',
      relevanceScore: row.relevanceScore,
      summary: row.summary,
      evidenceQuote: row.evidenceQuote,
      matchReason,
      status: quality.status,
      excludedFromTopicReadiness: quality.excludedFromTopicReadiness,
      reviewReason: quality.reviewReason,
    };
  });
}

export function getPaperSourcePackThreadLinks(source: PaperSourceRecord): PaperRelatedThread[] {
  const metadata = asRecord(source.metadata);
  const identifiers = buildPaperIdentityKeys(source, metadata);
  const links: PaperRelatedThread[] = [];

  for (const pack of getSourcePacks()) {
    for (const packSource of pack.sources) {
      if (packSource.role !== 'paper_foundation') continue;
      const matchReason = matchPaperSourcePackEntry(identifiers, packSource.title || '', packSource.url || '');
      if (!matchReason) continue;
      const relevanceScore = Math.min(0.96, readNumber(packSource.confidence) ?? 0.82);
      const quality = paperThreadQualityFromMetadata(asRecord(packSource.metadata), matchReason);
      links.push({
        slug: pack.thread.slug,
        title: pack.thread.title,
        href: `/threads/${pack.thread.slug}`,
        role: 'paper_foundation',
        source: 'source_pack',
        sourcePackSourceId: packSource.id,
        sourcePackUrl: packSource.url || null,
        relevanceScore,
        summary: packSource.whyRelevant || packSource.reviewNotes || null,
        evidenceQuote: packSource.evidenceQuote || null,
        matchReason,
        status: quality.status,
        excludedFromTopicReadiness: quality.excludedFromTopicReadiness,
        reviewReason: quality.reviewReason,
      });
    }
  }

  return links;
}

interface PaperIdentityKeys {
  urls: Set<string>;
  arxivIds: Set<string>;
  dois: Set<string>;
  titleKey: string;
}

function buildPaperIdentityKeys(source: PaperSourceRecord, metadata: Record<string, unknown>): PaperIdentityKeys {
  const urls = new Set<string>();
  const arxivIds = new Set<string>();
  const dois = new Set<string>();

  const openalexWorkId = readString(metadata.openalexWorkId) || readString(metadata.openalexId);
  const doi = normalizeDoi(readString(metadata.doi));
  const values = [
    source.url,
    readString(metadata.landingPageUrl),
    readString(metadata.openalexUrl),
    readString(metadata.pdfUrl),
    openalexUrl(openalexWorkId),
    doi ? `https://doi.org/${doi}` : null,
  ];

  for (const value of values) {
    const url = normalizeComparablePaperUrl(value);
    if (url) urls.add(url);
    const arxivId = extractArxivId(value);
    if (arxivId) {
      arxivIds.add(normalizeArxivVersionless(arxivId));
      urls.add(`arxiv.org/abs/${normalizeArxivVersionless(arxivId)}`);
    }
    const extractedDoi = extractDoiKey(value);
    if (extractedDoi) dois.add(extractedDoi);
  }

  if (doi) dois.add(doi.toLowerCase());

  return {
    urls,
    arxivIds,
    dois,
    titleKey: normalizePaperTitleKey(source.title),
  };
}

function matchPaperSourcePackEntry(identifiers: PaperIdentityKeys, title: string, url: string): string | null {
  const urlKey = normalizeComparablePaperUrl(url);
  if (urlKey && identifiers.urls.has(urlKey)) return 'source-pack URL 匹配';

  const arxivId = extractArxivId(url);
  if (arxivId && identifiers.arxivIds.has(normalizeArxivVersionless(arxivId))) return 'arXiv id 匹配';

  const doi = extractDoiKey(url);
  if (doi && identifiers.dois.has(doi)) return 'DOI 匹配';

  const sourceTitle = normalizePaperTitleKey(title);
  if (sourceTitle && identifiers.titleKey === sourceTitle) return '论文标题匹配';
  if (sourceTitle.length >= 40 && identifiers.titleKey.length >= 40) {
    if (identifiers.titleKey.includes(sourceTitle) || sourceTitle.includes(identifiers.titleKey)) {
      return '论文标题匹配';
    }
  }

  return null;
}

function paperThreadQualityFromMetadata(metadata: Record<string, unknown>, matchReason: string): {
  status: PaperRelatedThread['status'];
  excludedFromTopicReadiness: boolean;
  reviewReason: string | null;
} {
  const status = normalizePaperThreadStatus(metadata.status ?? metadata.reviewStatus);
  const strongMatch = isStrongPaperThreadMatchReason(matchReason);
  if (status) {
    return {
      status,
      excludedFromTopicReadiness: metadata.excludedFromTopicReadiness === true || status === 'needs_review' || status === 'thin',
      reviewReason: readString(metadata.reviewReason) || null,
    };
  }

  const autoCandidate = metadata.autoLinked === true
    || metadata.materializedFrom === 'source_pack_paper_foundation'
    || matchReason.includes('source-pack')
    || matchReason.includes('标题');
  const needsReview = metadata.excludedFromTopicReadiness === true || (autoCandidate && !strongMatch);
  return {
    status: needsReview ? 'needs_review' : 'verified',
    excludedFromTopicReadiness: needsReview,
    reviewReason: needsReview
      ? (readString(metadata.reviewReason) || `${matchReason || '自动绑定'} 需要人工复核后才计入主题 ready。`)
      : null,
  };
}

function normalizePaperThreadStatus(value: unknown): PaperRelatedThread['status'] | null {
  if (value === 'verified' || value === 'usable' || value === 'needs_review' || value === 'needs_capture' || value === 'thin') return value;
  if (value === 'confirmed') return 'verified';
  if (value === 'rejected') return 'thin';
  if (value === 'auto') return null;
  return null;
}

function isStrongPaperThreadMatchReason(value: string): boolean {
  return value.includes('DOI') || value.includes('arXiv') || value.includes('URL');
}

export function buildPaperSemanticReader(
  guide: PaperGuide,
  structure: PaperStructureView,
  referenceLookup: PaperReferenceLookup = emptyPaperReferenceLookup('not_requested'),
  figures: PaperFigureCard[] = [],
): PaperSemanticReaderView {
  const skimmingAssist = buildSkimmingAssistItems(guide, structure);
  const readingPath = buildSemanticReadingPath(skimmingAssist, structure.sections, figures);
  return {
    source: structure.source,
    skimmingAssist,
    jumpTargetCount: skimmingAssist.filter(item => item.pageNumber !== null).length,
    figures,
    readingPath,
    citationCards: referenceLookup.cards,
    referenceStatus: referenceLookup.status,
  };
}

export async function loadPaperSource(id: string): Promise<PaperSourceRecord | null> {
  const source = await withNeonWakeup(() => prisma.rawPoolItem.findUnique({
    where: { id },
    select: {
      id: true,
      sourceType: true,
      title: true,
      url: true,
      text: true,
      publishedAt: true,
      metadata: true,
      person: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          currentTitle: true,
        },
      },
    },
  }));

  if (!source || source.sourceType !== 'openalex') return null;
  return source;
}

export async function resolvePdfUrl(source: PaperSourceRecord, options: { persist?: boolean } = {}): Promise<PdfResolution> {
  const persist = options.persist ?? true;
  const metadata = asRecord(source.metadata);
  const metadataPdfUrl = normalizeUrl(readString(metadata.pdfUrl));
  if (metadataPdfUrl) {
    return {
      pdfUrl: metadataPdfUrl,
      source: 'metadata',
      attemptedOpenAlex: false,
      persisted: false,
      message: null,
    };
  }

  const arxivId = extractArxivIdFromPaperIdentifiers({
    url: source.url,
    doi: readString(metadata.doi),
    openalexWorkId: readString(metadata.openalexWorkId) || readString(metadata.openalexId),
    landingPageUrl: readString(metadata.landingPageUrl),
  });
  if (arxivId) {
    const pdfUrl = `https://arxiv.org/pdf/${arxivId}`;
    if (persist) {
      await mergePaperMetadata(source.id, {
        pdfUrl,
        pdfUrlSource: 'arxiv',
        pdfResolvedAt: new Date().toISOString(),
      });
    }
    return {
      pdfUrl,
      source: 'arxiv',
      attemptedOpenAlex: false,
      persisted: persist,
      message: null,
    };
  }

  const openalexResult = await fetchOpenAlexBestPdfUrl(metadata);
  if (openalexResult.pdfUrl) {
    if (persist) {
      await mergePaperMetadata(source.id, {
        pdfUrl: openalexResult.pdfUrl,
        pdfUrlSource: 'openalex_best_oa_location',
        pdfResolvedAt: new Date().toISOString(),
      });
    }
    return {
      pdfUrl: openalexResult.pdfUrl,
      source: 'openalex_best_oa_location',
      attemptedOpenAlex: true,
      persisted: persist,
      message: null,
    };
  }

  return {
    pdfUrl: null,
    source: 'none',
    attemptedOpenAlex: openalexResult.attempted,
    persisted: false,
    message: openalexResult.message,
  };
}

export function extractArxivIdFromPaperIdentifiers(input: {
  url?: string | null;
  doi?: string | null;
  openalexWorkId?: string | null;
  landingPageUrl?: string | null;
}): string | null {
  for (const value of [input.url, input.doi, input.openalexWorkId, input.landingPageUrl]) {
    const id = extractArxivId(value);
    if (id) return id;
  }
  return null;
}

export function internalPaperSourceHref(sourceItemId: string | null | undefined): string | null {
  if (!sourceItemId) return null;
  return `/source/paper/${sourceItemId}`;
}

export interface CreatePaperNoteInput {
  sourceId: string;
  body: string;
  quote?: string | null;
  pageNumber?: number | null;
  sectionId?: string | null;
  sectionTitle?: string | null;
  sectionType?: PaperGuideSectionType | null;
}

export async function getPaperNotes(sourceId: string): Promise<PaperNote[] | null> {
  const source = await loadPaperSource(sourceId);
  if (!source) return null;
  return listPaperNotesFromMetadata(source.metadata);
}

export async function createPaperNote(input: CreatePaperNoteInput): Promise<{ note: PaperNote; notes: PaperNote[] } | null> {
  const source = await loadPaperSource(input.sourceId);
  if (!source) return null;

  const now = new Date().toISOString();
  const note: PaperNote = {
    id: randomUUID(),
    body: truncate(sanitizePaperTextForStorage(input.body).trim(), 1400),
    quote: normalizeOptionalNoteText(input.quote, 700),
    pageNumber: normalizeNotePage(input.pageNumber),
    sectionId: normalizeOptionalNoteText(input.sectionId, 160),
    sectionTitle: normalizeOptionalNoteText(input.sectionTitle, 240),
    sectionType: input.sectionType ? normalizeSectionType(input.sectionType) : null,
    createdAt: now,
    updatedAt: now,
  };
  if (!note.body) throw new Error('paper_note_body_empty');

  const existing = listPaperNotesFromMetadata(source.metadata);
  const notes = [note, ...existing.filter(item => item.id !== note.id)].slice(0, PAPER_NOTES_LIMIT);
  await persistPaperNotes(source.id, notes, now);
  return { note, notes };
}

export async function deletePaperNote(sourceId: string, noteId: string): Promise<{ deleted: boolean; notes: PaperNote[] } | null> {
  const source = await loadPaperSource(sourceId);
  if (!source) return null;

  const existing = listPaperNotesFromMetadata(source.metadata);
  const notes = existing.filter(note => note.id !== noteId);
  const deleted = notes.length !== existing.length;
  if (deleted) await persistPaperNotes(source.id, notes);
  return { deleted, notes };
}

export function paperAbstractFromText(text: string | null | undefined): string {
  const cleaned = cleanText(text || '');
  return cleaned || '这条 OpenAlex 论文资料暂时没有摘要。';
}

export function isPaperGuideCacheUsable(value: unknown, abstractHash: string): boolean {
  const parsed = CachedPaperGuideSchema.safeParse(value);
  return parsed.success
    && parsed.data.promptVersion === PAPER_GUIDE_PROMPT_VERSION
    && parsed.data.abstractHash === abstractHash;
}

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
    chain: ['deepseek'],
    temperature: 0.1,
    maxTokens: 3000,
    timeoutMs: 90_000,
  });
  const translatedAt = new Date().toISOString();
  const translation = cleanText(result.text);
  if (!translation) throw new Error('paper_translation_empty');

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

export async function materializePaperReferenceCards(sourceId: string): Promise<PaperReferenceLookup | null> {
  const source = await loadPaperSource(sourceId);
  if (!source) return null;
  return getOrCreatePaperReferenceCards(source);
}

async function getOrCreatePaperReferenceCards(source: PaperSourceRecord): Promise<PaperReferenceLookup> {
  const metadata = asRecord(source.metadata);
  const lookupCandidates = openAlexLookupCandidates(source, metadata);
  const cached = CachedPaperReferencesSchema.safeParse(metadata.paperReferences);
  if (cached.success && cached.data.version === PAPER_REFERENCES_CACHE_VERSION) {
    const cachedLookupKey = cached.data.openalexWorkId;
    const hasAlternativeLookup = Boolean(
      cachedLookupKey
      && lookupCandidates.some(candidate => (
        candidate.openalexWorkId !== cachedLookupKey && candidate.key !== cachedLookupKey
      )),
    );
    if (cached.data.titleMismatch) {
      if (!hasAlternativeLookup) {
        return {
          cards: [],
          status: {
            status: 'failed',
            cacheHit: true,
            fetchedAt: cached.data.fetchedAt,
            referencesTotal: cached.data.referencesTotal,
            message: cached.data.message || 'openalex_reference_title_mismatch',
            openalexWorkId: cached.data.openalexWorkId,
            openalexWorkTitle: cached.data.openalexWorkTitle ?? null,
            titleSimilarity: cached.data.titleSimilarity ?? null,
            qualityIssue: paperReferenceQualityIssue(cached.data.message || 'openalex_reference_title_mismatch'),
          },
        };
      }
    } else {
      const cards = await enrichPaperReferenceLinks(cached.data.references);
      return {
        cards,
        status: {
          status: cards.length > 0 ? 'ready' : 'empty',
          cacheHit: true,
          fetchedAt: cached.data.fetchedAt,
          referencesTotal: cached.data.referencesTotal,
          message: cards.length > 0 ? null : 'openalex_no_referenced_works',
          openalexWorkId: cached.data.openalexWorkId,
          openalexWorkTitle: cached.data.openalexWorkTitle ?? null,
          titleSimilarity: cached.data.titleSimilarity ?? null,
          qualityIssue: null,
        },
      };
    }
  }

  if (lookupCandidates.length === 0) return emptyPaperReferenceLookup('missing_openalex_identifier');

  let lastTitleMismatch: { candidate: OpenAlexLookupCandidate; fetched: FetchedOpenAlexReferences } | null = null;
  let lastErrorMessage: string | null = null;
  for (const candidate of lookupCandidates) {
    try {
      const fetched = await fetchOpenAlexReferencedWorks(candidate.url, source.title);
      if (fetched.titleMismatch) {
        lastTitleMismatch = { candidate, fetched };
        continue;
      }
      return persistPaperReferenceLookup(source.id, candidate, fetched);
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : 'openalex_references_failed';
    }
  }

  if (lastTitleMismatch) {
    return persistPaperReferenceLookup(source.id, lastTitleMismatch.candidate, lastTitleMismatch.fetched);
  }
  return emptyPaperReferenceLookup(lastErrorMessage || 'openalex_references_failed', 'failed');
}

async function persistPaperReferenceLookup(
  sourceId: string,
  candidate: OpenAlexLookupCandidate,
  fetched: FetchedOpenAlexReferences,
): Promise<PaperReferenceLookup> {
  const fetchedAt = new Date().toISOString();
  const lookupKey = fetched.openalexWorkId
    || candidate.openalexWorkId
    || (candidate.key.startsWith('title:') ? null : candidate.key);
  await mergePaperMetadata(sourceId, {
    paperReferences: {
      version: PAPER_REFERENCES_CACHE_VERSION,
      openalexWorkId: lookupKey,
      openalexWorkTitle: fetched.openalexWorkTitle,
      titleSimilarity: fetched.titleSimilarity,
      titleMismatch: fetched.titleMismatch,
      message: fetched.message,
      fetchedAt,
      referencesTotal: fetched.referencesTotal,
      references: fetched.cards.map(toCachedPaperReferenceCard),
    },
  });

  if (fetched.titleMismatch) {
    return {
      cards: [],
      status: {
        status: 'failed',
        cacheHit: false,
        fetchedAt,
        referencesTotal: fetched.referencesTotal,
        message: fetched.message || 'openalex_reference_title_mismatch',
        openalexWorkId: fetched.openalexWorkId,
        openalexWorkTitle: fetched.openalexWorkTitle,
        titleSimilarity: fetched.titleSimilarity,
        qualityIssue: paperReferenceQualityIssue(fetched.message || 'openalex_reference_title_mismatch'),
      },
    };
  }

  const cards = await enrichPaperReferenceLinks(fetched.cards);
  return {
    cards,
    status: {
      status: cards.length > 0 ? 'ready' : 'empty',
      cacheHit: false,
      fetchedAt,
      referencesTotal: fetched.referencesTotal,
      message: cards.length > 0 ? null : 'openalex_no_referenced_works',
      openalexWorkId: fetched.openalexWorkId,
      openalexWorkTitle: fetched.openalexWorkTitle,
      titleSimilarity: fetched.titleSimilarity,
      qualityIssue: null,
    },
  };
}

async function fetchOpenAlexReferencedWorks(
  lookupUrl: string,
  sourceTitle: string,
): Promise<FetchedOpenAlexReferences> {
  const workResponse = await fetch(lookupUrl, {
    headers: {
      Accept: 'application/json',
      'User-Agent': `ai-person-agent/0.5.0 (mailto:${OPENALEX_MAILTO})`,
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!workResponse.ok) throw new Error(`openalex_http_${workResponse.status}`);

  const work = selectOpenAlexWorkFromLookupPayload(await workResponse.json(), sourceTitle);
  if (!work) {
    return {
      referencesTotal: 0,
      cards: [],
      openalexWorkId: null,
      openalexWorkTitle: null,
      titleSimilarity: 0,
      titleMismatch: true,
      message: 'openalex_search_no_title_match',
    };
  }
  const openalexWorkId = cleanOpenAlexWorkId(readString(work.id));
  const openalexWorkTitle = readString(work.title) || readString(work.display_name);
  const titleSimilarity = comparePaperTitles(sourceTitle, openalexWorkTitle);
  const titleMismatch = titleSimilarity !== null && titleSimilarity < 0.25;
  if (titleMismatch) {
    return {
      referencesTotal: 0,
      cards: [],
      openalexWorkId,
      openalexWorkTitle,
      titleSimilarity,
      titleMismatch: true,
      message: 'openalex_reference_title_mismatch',
    };
  }

  const referencedWorkIds = readStringArray(work.referenced_works)
    .map(cleanOpenAlexWorkId)
    .filter((value): value is string => Boolean(value));
  const uniqueIds = [...new Set(referencedWorkIds)];
  const referencesTotal = readNumber(work.referenced_works_count) ?? uniqueIds.length;
  if (uniqueIds.length === 0) {
    return {
      referencesTotal,
      cards: [],
      openalexWorkId,
      openalexWorkTitle,
      titleSimilarity,
      titleMismatch: false,
      message: null,
    };
  }

  const params = new URLSearchParams({
    filter: `openalex:${uniqueIds.slice(0, PAPER_REFERENCE_FETCH_LIMIT).join('|')}`,
    per_page: String(PAPER_REFERENCE_FETCH_LIMIT),
    mailto: OPENALEX_MAILTO,
  });
  if (process.env.OPENALEX_API_KEY) params.set('api_key', process.env.OPENALEX_API_KEY);
  const referencesResponse = await fetch(`${OPENALEX_WORKS_URL}?${params}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': `ai-person-agent/0.5.0 (mailto:${OPENALEX_MAILTO})`,
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!referencesResponse.ok) throw new Error(`openalex_references_http_${referencesResponse.status}`);

  const payload = asRecord(await referencesResponse.json());
  const results = Array.isArray(payload.results) ? payload.results : [];
  const cards = results
    .map(toPaperReferenceCard)
    .filter((card): card is PaperReferenceCard => Boolean(card))
    .sort((left, right) => right.citationCount - left.citationCount || String(left.year || '').localeCompare(String(right.year || '')))
    .slice(0, PAPER_REFERENCE_CARD_LIMIT);

  return {
    referencesTotal,
    cards,
    openalexWorkId,
    openalexWorkTitle,
    titleSimilarity,
    titleMismatch: false,
    message: null,
  };
}

export function selectOpenAlexWorkFromLookupPayload(payload: unknown, sourceTitle: string): Record<string, unknown> | null {
  const record = asRecord(payload);
  const results = Array.isArray(record.results) ? record.results.map(asRecord) : [];
  if (results.length === 0) return record;
  const ranked = results
    .map(work => {
      const title = readString(work.title) || readString(work.display_name);
      return {
        work,
        similarity: comparePaperTitles(sourceTitle, title) ?? 0,
        citationCount: readNumber(work.cited_by_count) ?? 0,
      };
    })
    .sort((left, right) => (
      right.similarity - left.similarity
      || right.citationCount - left.citationCount
    ));
  const best = ranked[0];
  return best?.similarity >= 0.5 ? best.work : null;
}

export function comparePaperTitles(left: string | null | undefined, right: string | null | undefined): number | null {
  const leftTokens = titleTokens(left);
  const rightTokens = titleTokens(right);
  if (leftTokens.length === 0 || rightTokens.length === 0) return null;
  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);
  let intersection = 0;
  for (const token of leftSet) {
    if (rightSet.has(token)) intersection += 1;
  }
  const union = new Set([...leftSet, ...rightSet]).size;
  const jaccard = union > 0 ? intersection / union : 0;
  const smallerTitleSize = Math.min(leftSet.size, rightSet.size);
  const smallerTitleCoverage = smallerTitleSize > 0 ? intersection / smallerTitleSize : 0;
  if (smallerTitleSize >= 2 && smallerTitleCoverage >= 0.85) return Math.max(jaccard, 0.85);
  return jaccard;
}

function titleTokens(value: string | null | undefined): string[] {
  const normalized = (value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!normalized) return [];
  const stopWords = new Set(['a', 'an', 'and', 'are', 'for', 'from', 'in', 'is', 'of', 'on', 'the', 'to', 'via', 'with']);
  return normalized
    .split(/\s+/)
    .filter(token => token.length > 1 && !stopWords.has(token));
}

function toPaperReferenceCard(value: unknown): PaperReferenceCard | null {
  const work = asRecord(value);
  const openalexId = cleanOpenAlexWorkId(readString(work.id));
  const title = readString(work.title);
  if (!openalexId || !title) return null;

  const primaryLocation = asRecord(work.primary_location);
  const source = asRecord(primaryLocation.source);
  const authorships = Array.isArray(work.authorships) ? work.authorships : [];
  const authors = authorships
    .map(item => readString(asRecord(asRecord(item).author).display_name))
    .filter((item): item is string => Boolean(item))
    .slice(0, 5);
  const abstract = truncate(openAlexInvertedIndexToText(work.abstract_inverted_index), 520);

  return {
    openalexId,
    openalexUrl: `https://openalex.org/${openalexId}`,
    title,
    year: readNumber(work.publication_year),
    authors,
    venue: readString(source.display_name),
    abstract: abstract || 'OpenAlex 暂未提供摘要。',
    doi: normalizeDoi(readString(work.doi)),
    landingPageUrl: normalizeUrl(readString(primaryLocation.landing_page_url)),
    citationCount: readNumber(work.cited_by_count) ?? 0,
    sourceItemId: null,
    sourceHref: null,
  };
}

function toCachedPaperReferenceCard(card: PaperReferenceCard): z.infer<typeof CachedPaperReferenceCardSchema> {
  return {
    openalexId: card.openalexId,
    openalexUrl: card.openalexUrl,
    title: card.title,
    year: card.year,
    authors: card.authors,
    venue: card.venue,
    abstract: card.abstract,
    doi: card.doi,
    landingPageUrl: card.landingPageUrl,
    citationCount: card.citationCount,
  };
}

async function enrichPaperReferenceLinks(cards: Array<z.infer<typeof CachedPaperReferenceCardSchema> | PaperReferenceCard>): Promise<PaperReferenceCard[]> {
  const normalizedCards = cards.map(card => ({
    ...card,
    sourceItemId: 'sourceItemId' in card ? card.sourceItemId : null,
    sourceHref: 'sourceHref' in card ? card.sourceHref : null,
  }));
  const urls = new Set<string>();
  const urlsByCard = new Map<string, string[]>();
  for (const card of normalizedCards) {
    const candidates = [
      card.openalexUrl,
      card.doi ? `https://doi.org/${card.doi}` : null,
      card.landingPageUrl,
    ].filter((value): value is string => Boolean(value));
    urlsByCard.set(card.openalexId, candidates);
    for (const url of candidates) urls.add(url);
  }
  if (urls.size === 0) return normalizedCards;

  const rows = await withNeonWakeup(() => prisma.rawPoolItem.findMany({
    where: {
      sourceType: 'openalex',
      url: { in: [...urls] },
    },
    select: {
      id: true,
      url: true,
    },
  }));
  const sourceIdByUrl = new Map(rows.map(row => [row.url, row.id]));

  return normalizedCards.map(card => {
    const sourceItemId = (urlsByCard.get(card.openalexId) || [])
      .map(url => sourceIdByUrl.get(url))
      .find((value): value is string => Boolean(value)) || null;
    return {
      ...card,
      sourceItemId,
      sourceHref: internalPaperSourceHref(sourceItemId),
    };
  });
}

function emptyPaperReferenceLookup(
  message: string,
  status: PaperReferenceStatus['status'] = 'unavailable',
): PaperReferenceLookup {
  return {
    cards: [],
    status: {
      status,
      cacheHit: false,
      fetchedAt: null,
      referencesTotal: 0,
      message,
      openalexWorkId: null,
      openalexWorkTitle: null,
      titleSimilarity: null,
      qualityIssue: paperReferenceQualityIssue(message),
    },
  };
}

function paperReferenceQualityIssue(message: string | null | undefined): PaperReferenceQualityIssue | null {
  if (message === 'openalex_reference_title_mismatch' || message === 'openalex_search_no_title_match') {
    return message;
  }
  return null;
}

export async function getPaperStructureView(
  sourceId: string,
  guide?: PaperGuide,
): Promise<PaperStructureView> {
  try {
    const document = await withNeonWakeup(() => prisma.paperDocument.findUnique({
      where: { sourceItemId: sourceId },
      select: {
        id: true,
        status: true,
        parseVersion: true,
        parsedAt: true,
        pageCount: true,
        parseError: true,
      },
    }));
    if (!document) return guideStructureFallback(guide);

    const [sections, chunkCount] = await withNeonWakeup(() => Promise.all([
      prisma.paperSection.findMany({
        where: { paperId: document.id },
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          sectionType: true,
          title: true,
          text: true,
          pageStart: true,
          pageEnd: true,
          orderIndex: true,
          _count: { select: { chunks: true } },
        },
      }),
      prisma.paperChunk.count({ where: { paperId: document.id } }),
    ]));

    return {
      status: normalizePaperStatus(document.status),
      source: 'paper_document',
      parseVersion: document.parseVersion,
      parsedAt: document.parsedAt?.toISOString() || null,
      pageCount: document.pageCount,
      sectionCount: sections.length,
      chunkCount,
      error: document.parseError,
      sections: sections.map(section => ({
        id: section.id,
        sectionType: normalizeSectionType(section.sectionType),
        title: section.title,
        pageStart: section.pageStart,
        pageEnd: section.pageEnd,
        orderIndex: section.orderIndex,
        textPreview: truncate(section.text, 220),
        chunkCount: section._count.chunks,
      })),
    };
  } catch (error) {
    if (isMissingPaperDocumentTable(error)) return guideStructureFallback(guide);
    throw error;
  }
}

async function getPaperFigureCards(sourceId: string): Promise<PaperFigureCard[]> {
  try {
    const document = await withNeonWakeup(() => prisma.paperDocument.findUnique({
      where: { sourceItemId: sourceId },
      select: {
        figures: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            label: true,
            caption: true,
            pageNumber: true,
            orderIndex: true,
            imagePath: true,
          },
        },
      },
    }));
    return (document?.figures || []).map(figure => toPaperFigureCard({
      id: figure.id,
      label: figure.label,
      caption: figure.caption || '',
      pageNumber: figure.pageNumber,
      orderIndex: figure.orderIndex,
      imagePath: figure.imagePath,
      ...buildFigureReaderInsight(figure.label, figure.caption || ''),
    }));
  } catch (error) {
    if (isMissingPaperDocumentTable(error)) return [];
    throw error;
  }
}

export async function materializePaperDocument(
  sourceId: string,
  options: PaperMaterializationOptions = {},
): Promise<PaperMaterializationResult | null> {
  const source = await loadPaperSource(sourceId);
  if (!source) return null;

  const dryRun = Boolean(options.dryRun);
  const materialized = await buildPaperMaterialization(source, options);
  if (dryRun) {
    return toPaperMaterializationResult(materialized, source.id, null, true);
  }

  const metadata = asRecord(source.metadata);
  const authors = readPaperAuthorNames(metadata);
  const doi = normalizeDoi(readString(metadata.doi));
  const openalexId = readString(metadata.openalexWorkId) || readString(metadata.openalexId);
  const citationCount = readNumber(metadata.citationCount) ?? readNumber(metadata.citedByCount) ?? 0;
  const now = new Date();

  const paperId = await withNeonWakeup(async () => {
    const document = await prisma.$transaction(async tx => {
      const persisted = await tx.paperDocument.upsert({
        where: { sourceItemId: source.id },
        update: {
          openalexId,
          doi,
          title: source.title,
          abstract: materialized.abstract,
          pdfUrl: materialized.pdfUrl,
          landingPageUrl: materialized.landingPageUrl,
          authors: authors as Prisma.InputJsonValue,
          venue: readString(metadata.venue),
          citationCount,
          status: materialized.status,
          parseVersion: PAPER_PARSE_VERSION,
          pageCount: materialized.pageCount,
          textHash: materialized.textHash,
          parseError: materialized.parseError,
          parsedAt: now,
          metadata: materialized.metadata as Prisma.InputJsonValue,
        },
        create: {
          sourceItemId: source.id,
          openalexId,
          doi,
          title: source.title,
          abstract: materialized.abstract,
          pdfUrl: materialized.pdfUrl,
          landingPageUrl: materialized.landingPageUrl,
          authors: authors as Prisma.InputJsonValue,
          venue: readString(metadata.venue),
          citationCount,
          status: materialized.status,
          parseVersion: PAPER_PARSE_VERSION,
          pageCount: materialized.pageCount,
          textHash: materialized.textHash,
          parseError: materialized.parseError,
          parsedAt: now,
          metadata: materialized.metadata as Prisma.InputJsonValue,
        },
      });

      await tx.paperFigure.deleteMany({ where: { paperId: persisted.id } });
      await tx.paperChunk.deleteMany({ where: { paperId: persisted.id } });
      await tx.paperSection.deleteMany({ where: { paperId: persisted.id } });

      const sectionIdByOrder = new Map<number, string>();
      const sectionRows = materialized.sections.map(section => {
        const sectionId = `paper-section:${persisted.id}:${section.orderIndex}`;
        sectionIdByOrder.set(section.orderIndex, sectionId);
        return {
          id: sectionId,
          paperId: persisted.id,
          sectionType: section.sectionType,
          title: section.title,
          text: section.text,
          pageStart: section.pageStart,
          pageEnd: section.pageEnd,
          orderIndex: section.orderIndex,
        };
      });
      if (sectionRows.length) await tx.paperSection.createMany({ data: sectionRows });

      const chunkRows = materialized.chunks.map(chunk => ({
        id: `paper-chunk:${persisted.id}:${chunk.chunkIndex}`,
        paperId: persisted.id,
        sectionId: sectionIdByOrder.get(chunk.sectionOrderIndex) || null,
        text: chunk.text,
        pageNumber: chunk.pageNumber,
        chunkIndex: chunk.chunkIndex,
        anchorHint: chunk.anchorHint as Prisma.InputJsonValue,
        tokenEstimate: chunk.tokenEstimate,
        textHash: chunk.textHash,
      }));
      if (chunkRows.length) await tx.paperChunk.createMany({ data: chunkRows });

      const figureRows = materialized.figures.map(figure => ({
        id: `paper-figure:${persisted.id}:${figure.orderIndex}`,
        paperId: persisted.id,
        label: figure.label,
        caption: figure.caption,
        pageNumber: figure.pageNumber,
        bbox: Prisma.JsonNull,
        imagePath: figure.imagePath,
        orderIndex: figure.orderIndex,
      }));
      if (figureRows.length) await tx.paperFigure.createMany({ data: figureRows });

      return persisted;
    }, { maxWait: 10_000, timeout: 60_000 });
    return document.id;
  });

  return toPaperMaterializationResult(materialized, source.id, paperId, false);
}

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
      chain: ['deepseek'],
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

function toPaperMaterializationResult(
  materialized: Awaited<ReturnType<typeof buildPaperMaterialization>>,
  sourceId: string,
  paperId: string | null,
  dryRun: boolean,
): PaperMaterializationResult {
  return {
    sourceId,
    paperId,
    dryRun,
    status: materialized.status,
    parseVersion: materialized.parseVersion,
    pdfUrl: materialized.pdfUrl,
    pageCount: materialized.pageCount,
    sectionCount: materialized.sections.length,
    chunkCount: materialized.chunks.length,
    figureCount: materialized.figures.length,
    textHash: materialized.textHash,
    parseError: materialized.parseError,
    sections: summarizeSectionDrafts(materialized.sections, materialized.chunks),
    figures: materialized.figures.map(toPaperFigureCard),
  };
}

async function buildPaperMaterialization(
  source: PaperSourceRecord,
  options: PaperMaterializationOptions,
): Promise<{
  status: Exclude<PaperStructureView['status'], 'missing'>;
  parseVersion: string;
  pdfUrl: string | null;
  landingPageUrl: string;
  abstract: string;
  pageCount: number | null;
  textHash: string;
  parseError: string | null;
  metadata: Record<string, unknown>;
  sections: PaperSectionDraft[];
  chunks: PaperChunkDraft[];
  figures: PaperFigureDraft[];
}> {
  const metadata = asRecord(source.metadata);
  const abstract = paperAbstract(source, metadata);
  const landingPageUrl = readString(metadata.landingPageUrl) || source.url;
  const resolution = await resolvePdfUrl(source, { persist: !options.dryRun });
  const maxPages = clampParsePages(options.maxPages ?? DEFAULT_PARSE_MAX_PAGES);
  let status: Exclude<PaperStructureView['status'], 'missing'> = resolution.pdfUrl ? 'parse_failed' : 'metadata_only';
  let pageCount: number | null = null;
  let parseError: string | null = resolution.pdfUrl ? null : resolution.message;
  let pages: ExtractedPdfPage[] = [];

	  if (resolution.pdfUrl) {
	    try {
	      const extracted = await extractPdfPagesText(resolution.pdfUrl, maxPages, 1, {
	        fetchTimeoutMs: options.pdfFetchTimeoutMs,
	        fetchRetries: options.pdfFetchRetries,
	        maxPdfBytes: options.maxPdfBytes,
	      });
	      pages = extracted.pages;
	      pageCount = extracted.pageCount;
      status = pages.length > 0 ? 'parsed' : 'parse_failed';
      parseError = pages.length > 0 ? null : 'paper_pdf_text_empty';
    } catch (error) {
	      const message = normalizePaperParseError(error);
	      status = message.startsWith('paper_pdf_fetch') || message.startsWith('paper_pdf_too_large')
	        ? 'pdf_fetch_failed'
	        : 'parse_failed';
	      parseError = message;
	    }
  }

  const sections = buildPaperSectionDrafts({ source, abstract, pages });
  const chunks = buildPaperChunkDrafts(sections);
  const figures = buildPaperFigureDrafts(pages);
  const textHash = hashText(sections.map(section => section.text).join('\n\n'));

  return {
    status,
    parseVersion: PAPER_PARSE_VERSION,
    pdfUrl: resolution.pdfUrl,
    landingPageUrl,
    abstract,
    pageCount,
    textHash,
    parseError,
	    metadata: {
	      pdfResolution: resolution,
	      parsedPageLimit: maxPages,
	      pdfFetchTimeoutMs: clampPdfFetchTimeoutMs(options.pdfFetchTimeoutMs ?? DEFAULT_PDF_FETCH_TIMEOUT_MS),
	      pdfFetchRetries: clampPdfFetchRetries(options.pdfFetchRetries ?? DEFAULT_PDF_FETCH_RETRIES),
	      maxPdfBytes: clampMaxPdfBytes(options.maxPdfBytes ?? DEFAULT_MAX_PDF_BYTES),
	      parsedPageCount: pages.length,
	      sourceType: source.sourceType,
	    },
    sections,
    chunks,
    figures,
  };
}

function buildPaperSectionDrafts(input: {
  source: PaperSourceRecord;
  abstract: string;
  pages: ExtractedPdfPage[];
}): PaperSectionDraft[] {
  const sections: PaperSectionDraft[] = [];
  const abstractText = paperAbstractFromText(input.abstract);
  if (abstractText && input.pages.length === 0) {
    sections.push({
      sectionType: 'abstract',
      title: 'Abstract',
      text: abstractText,
      pageStart: input.pages.length ? 1 : null,
      pageEnd: input.pages.length ? 1 : null,
      orderIndex: sections.length,
    });
  }

  for (const page of input.pages) {
    const text = truncatePageText(page.text, MAX_CACHED_PAGE_TEXT_CHARS);
    if (!text || text.length < 40) continue;
    const heading = detectPaperHeading(text);
    const sectionType = heading?.sectionType || classifyPaperSectionType(text);
    const title = heading?.title || `${sectionTypeLabel(sectionType)} · Page ${page.pageNumber}`;
    sections.push({
      sectionType,
      title,
      text,
      pageStart: page.pageNumber,
      pageEnd: page.pageNumber,
      orderIndex: sections.length,
    });
  }

  if (sections.length === 0) {
    sections.push({
      sectionType: 'other',
      title: input.source.title,
      text: input.source.title,
      pageStart: null,
      pageEnd: null,
      orderIndex: 0,
    });
  }

  return sections;
}

function buildPaperChunkDrafts(sections: PaperSectionDraft[]): PaperChunkDraft[] {
  const chunks: PaperChunkDraft[] = [];
  for (const section of sections) {
    const parts = splitIntoTextChunks(section.text, CHUNK_TARGET_CHARS);
    for (const part of parts) {
      chunks.push({
        sectionOrderIndex: section.orderIndex,
        text: part,
        pageNumber: section.pageStart,
        chunkIndex: chunks.length,
        anchorHint: {
          sectionType: section.sectionType,
          sectionTitle: section.title,
          pageStart: section.pageStart,
          pageEnd: section.pageEnd,
        },
        tokenEstimate: estimateTokens(part),
        textHash: hashText(part),
      });
    }
  }
  return chunks;
}

export function extractPaperFigureCaptionsFromText(text: string, pageNumber: number | null = null): PaperFigureCard[] {
  return buildPaperFigureDrafts([{ pageNumber: pageNumber || 1, pageCount: pageNumber || 1, text }]).map(toPaperFigureCard);
}

function buildPaperFigureDrafts(pages: ExtractedPdfPage[]): PaperFigureDraft[] {
  const figures: PaperFigureDraft[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    const normalized = page.text
      .replace(/\s+/g, ' ')
      .replace(/\b(Fig|Figure|Table)\s*([.:])\s*/gi, '$1$2 ')
      .trim();
    if (!normalized) continue;

    const pattern = /\b(Fig\.?|Figure|Table)\s+([A-Za-z0-9IVXivx.-]+)\s*[:.]?\s+/g;
    const matches = [...normalized.matchAll(pattern)];
    for (let index = 0; index < matches.length; index += 1) {
      const match = matches[index];
      if (typeof match.index !== 'number') continue;
      const next = matches[index + 1]?.index ?? normalized.length;
      const raw = normalized.slice(match.index, next);
      const label = normalizeFigureLabel(match[1], match[2]);
      const caption = cleanFigureCaption(raw, label);
      if (!label || caption.length < 24) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      figures.push({
        label,
        caption,
        pageNumber: page.pageNumber,
        orderIndex: figures.length,
        imagePath: null,
        ...buildFigureReaderInsight(label, caption),
      });
      if (figures.length >= 24) return figures;
    }
  }
  return figures;
}

function normalizeFigureLabel(kind: string, rawNumber: string): string {
  const lower = kind.toLowerCase();
  const number = rawNumber.replace(/[.:-]+$/g, '').trim();
  if (!number) return lower.startsWith('t') ? 'Table' : 'Figure';
  return lower.startsWith('t') ? `Table ${number}` : `Figure ${number}`;
}

function cleanFigureCaption(raw: string, label: string): string {
  const withoutLabel = raw
    .replace(/^\s*(?:Fig\.?|Figure|Table)\s+[A-Za-z0-9IVXivx.-]+\s*[:.]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const sentenceLimited = limitCaptionSentences(withoutLabel);
  const caption = truncate(sentenceLimited, 520);
  return caption || label;
}

function limitCaptionSentences(value: string): string {
  const clean = value.trim();
  if (clean.length <= 520) return clean;
  const boundary = clean.slice(0, 520).lastIndexOf('. ');
  if (boundary >= 120) return clean.slice(0, boundary + 1).trim();
  return clean.slice(0, 520).trim();
}

function buildFigureReaderInsight(label: string, caption: string): Pick<PaperFigureDraft, 'evidenceRole' | 'evidenceLabel' | 'readerQuestion' | 'readerHint'> {
  const lower = `${label} ${caption}`.toLowerCase();
  if (/\b(ablation|variant|component|remove|without|sensitivity|robustness|stress|stress-test)\b/.test(lower)) {
    return {
      evidenceRole: 'ablation',
      evidenceLabel: '消融/稳健性',
      readerQuestion: '去掉关键组件或换设置后，论文主张还站得住吗？',
      readerHint: '这张图或表适合用来检查方法是不是依赖单一设置，能帮你判断结论是否稳健。',
    };
  }
  if (/\b(result|performance|benchmark|evaluation|accuracy|score|win rate|chrf|mmlu|f1|bleu)\b/.test(lower)) {
    return {
      evidenceRole: 'result',
      evidenceLabel: '结果证据',
      readerQuestion: '这里的数字是否直接支撑论文最核心的 claim？',
      readerHint: '这张图或表更像结果证据，适合用来判断方法是否真的有效。',
    };
  }
  if (/\b(dataset|data set|corpus|sample|distribution|split|language|domain|collection)\b/.test(lower)) {
    return {
      evidenceRole: 'dataset',
      evidenceLabel: '数据/任务',
      readerQuestion: '评估数据和任务范围是否足以支撑论文的泛化结论？',
      readerHint: '这张图或表主要说明数据、任务或样本分布，适合先确认实验边界。',
    };
  }
  if (/\barchitecture|pipeline|framework|system|design\b/.test(lower)) {
    return {
      evidenceRole: 'architecture',
      evidenceLabel: '系统结构',
      readerQuestion: '论文的方法由哪些模块组成，信息或控制流怎么走？',
      readerHint: '先看这张图，能快速把论文的系统结构和关键组件串起来。',
    };
  }
  if (/\b(limitation|failure|error|bias|risk|safety|unsafe|jailbreak|constraint)\b/.test(lower)) {
    return {
      evidenceRole: 'limitation',
      evidenceLabel: '局限/风险',
      readerQuestion: '这里暴露的失败模式会不会限制论文方法的适用范围？',
      readerHint: '这张图或表更适合用来检查边界条件和失败模式，不只看正向结果。',
    };
  }
  if (/\bmethod|algorithm|training|model|workflow\b/.test(lower)) {
    return {
      evidenceRole: 'method',
      evidenceLabel: '方法流程',
      readerQuestion: '这一步具体改变了训练、推理或评估流程里的什么？',
      readerHint: '这张图或表主要解释方法流程，适合在读方法段前后对照。',
    };
  }
  return {
    evidenceRole: 'overview',
    evidenceLabel: '扫读入口',
    readerQuestion: '这张图或表能帮你先定位哪一段论证最值得继续读？',
    readerHint: '这张图或表可作为快速扫读入口，用来定位论文论证链里的具体证据。',
  };
}

function toPaperFigureCard(figure: PaperFigureDraft): PaperFigureCard {
  const insight = buildFigureReaderInsight(figure.label, figure.caption);
  return {
    id: figure.id || `figure:${figure.orderIndex}`,
    label: figure.label,
    caption: figure.caption,
    pageNumber: figure.pageNumber,
    orderIndex: figure.orderIndex,
    imagePath: figure.imagePath,
    evidenceRole: figure.evidenceRole || insight.evidenceRole,
    evidenceLabel: figure.evidenceLabel || insight.evidenceLabel,
    readerQuestion: figure.readerQuestion || insight.readerQuestion,
    readerHint: figure.readerHint || insight.readerHint,
  };
}

export function classifyPaperSectionType(text: string): PaperGuideSectionType {
  const lower = normalizeSectionDetectionText(text);
  if (/\babstract\b/.test(lower) || hasSpacedHeading(text, 'abstract')) return 'abstract';
  if (/\b(limitations?|limitations and future work|threats? to validity|failure cases?|future work|broader impacts?)\b/.test(lower)) return 'limitation';
  if (/\b(main results?|results?|discussion|conclusion|findings?|analysis)\b/.test(lower)) return 'result';
  if (/\b(experiments?|evaluation|benchmark|benchmarks|ablation|empirical|case stud(?:y|ies)|datasets?)\b/.test(lower)) return 'experiment';
  if (/\b(position\s+\d|design space|system architecture|architecture|methods?|methodology|approach|algorithm|training|implementation|preliminaries|framework|model architecture|data pipeline|reinforcement learning|policy optimization)\b/.test(lower)) return 'method';
  if (/\b(introduction|problem|motivation|background|objective|setting)\b/.test(lower)) return 'problem';
  if (/\b(novelty|contribution|we propose|we introduce|our contributions?)\b/.test(lower)) return 'result';
  return 'other';
}

function detectPaperHeading(text: string): { title: string; sectionType: PaperGuideSectionType } | null {
  const earlyText = text.slice(0, 1_200);
  if (hasSpacedHeading(earlyText, 'abstract') || /^\s*abstract\b/i.test(normalizeSectionDetectionText(earlyText))) {
    return { title: 'Abstract', sectionType: 'abstract' };
  }

  const lines = text
    .split(/\n+/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 24);

  for (const line of lines) {
    const normalizedLine = normalizeSectionDetectionText(line);
    if (line.length > 120 && !/^(?:abstract|introduction|background|method|approach|experiments?|evaluation|results?|discussion|limitations?|conclusion)\b/i.test(normalizedLine)) continue;
    const match = normalizedLine.match(/^(?:\d+(?:\.\d+)*\.?\s+)?(abstract|introduction|background|related work|method|methods|methodology|approach|architecture|algorithm|experiments?|evaluation|results?|main results|discussion|analysis|limitations?|conclusion|future work|references)\b[:.\s-]*(.*)$/i);
    if (!match) continue;
    const head = `${match[1]} ${match[2] || ''}`.replace(/\s+/g, ' ').trim();
    const sectionType = classifyPaperSectionType(match[1]);
    return {
      title: sectionType === 'abstract' ? 'Abstract' : titleCaseHeading(head),
      sectionType,
    };
  }

  return null;
}

function splitIntoTextChunks(text: string, targetChars: number): string[] {
  const units = text
    .split(/\n{2,}|\n(?=[A-Z0-9])/)
    .map(unit => unit.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const unit of units.length ? units : [text]) {
    const pieces = unit.length > targetChars * 1.4 ? hardSplit(unit, targetChars) : [unit];
    for (const piece of pieces) {
      if (!current) {
        current = piece;
      } else if (current.length + piece.length + 2 <= targetChars) {
        current = `${current}\n\n${piece}`;
      } else {
        chunks.push(current);
        current = piece;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function hardSplit(text: string, targetChars: number): string[] {
  const chunks: string[] = [];
  for (let start = 0; start < text.length; start += targetChars) {
    chunks.push(text.slice(start, start + targetChars).trim());
  }
  return chunks.filter(Boolean);
}

function summarizeSectionDrafts(
  sections: PaperSectionDraft[],
  chunks: PaperChunkDraft[],
): PaperStructureSection[] {
  const chunkCounts = chunks.reduce((map, chunk) => {
    map.set(chunk.sectionOrderIndex, (map.get(chunk.sectionOrderIndex) || 0) + 1);
    return map;
  }, new Map<number, number>());

  return sections.map(section => ({
    id: section.id || `draft-section:${section.orderIndex}`,
    sectionType: section.sectionType,
    title: section.title,
    pageStart: section.pageStart,
    pageEnd: section.pageEnd,
    orderIndex: section.orderIndex,
    textPreview: truncate(section.text, 220),
    chunkCount: chunkCounts.get(section.orderIndex) || 0,
  }));
}

function buildSkimmingAssistItems(
  guide: PaperGuide,
  structure: PaperStructureView,
): PaperSkimmingAssistItem[] {
  const specs: Array<{
    role: PaperSkimmingRole;
    label: string;
    sectionType: PaperGuideSectionType;
    body: string;
    preferredTypes: PaperGuideSectionType[];
    keywords: string[];
  }> = [
    {
      role: 'objective',
      label: 'Objective',
      sectionType: 'problem',
      body: guide.problem,
      preferredTypes: ['problem', 'abstract', 'other'],
      keywords: ['objective', 'problem', 'motivation', 'aim', 'goal', 'task', 'challenge'],
    },
    {
      role: 'novelty',
      label: 'Novelty',
      sectionType: 'problem',
      body: guide.novelty,
      preferredTypes: ['problem', 'abstract', 'method', 'other'],
      keywords: ['novel', 'novelty', 'contribution', 'propose', 'introduce', 'new', 'first'],
    },
    {
      role: 'method',
      label: 'Method',
      sectionType: 'method',
      body: guide.method,
      preferredTypes: ['method', 'experiment', 'other'],
      keywords: ['method', 'approach', 'framework', 'model', 'algorithm', 'pipeline', 'training'],
    },
    {
      role: 'result',
      label: 'Result',
      sectionType: 'result',
      body: guide.experiments,
      preferredTypes: ['result', 'experiment', 'method', 'other'],
      keywords: ['result', 'experiment', 'evaluation', 'benchmark', 'performance', 'outperform', 'accuracy'],
    },
    {
      role: 'limitation',
      label: 'Limitation',
      sectionType: 'limitation',
      body: guide.limitations,
      preferredTypes: ['limitation', 'result', 'experiment', 'other'],
      keywords: ['limitation', 'future work', 'failure', 'risk', 'constraint', 'ablation', 'discussion'],
    },
  ];

  return specs.map(spec => {
    const section = findSkimmingSection(structure.sections, spec.preferredTypes, spec.keywords);
    return {
      id: spec.role,
      role: spec.role,
      label: spec.label,
      sectionType: spec.sectionType,
      body: spec.body,
      sectionId: section?.id || null,
      sectionTitle: section?.title || null,
      pageNumber: section?.pageStart || null,
      pageEnd: section?.pageEnd || null,
      textPreview: section?.textPreview || null,
      source: section && structure.source === 'paper_document' ? 'paper_document' : 'guide',
    };
  });
}

function buildSemanticReadingPath(
  skimmingAssist: PaperSkimmingAssistItem[],
  sections: PaperStructureSection[],
  figures: PaperFigureCard[],
): PaperReadingPathStep[] {
  const steps: PaperReadingPathStep[] = [];
  const seen = new Set<string>();

  const push = (step: PaperReadingPathStep | null) => {
    if (!step) return;
    const key = `${step.kind}:${step.targetId || step.sectionType || step.title}`;
    if (seen.has(key)) return;
    seen.add(key);
    steps.push(step);
  };

  const firstFigure = figures.find(figure => figure.pageNumber !== null) || figures[0];
  if (firstFigure) {
    push({
      id: `reading-figure:${firstFigure.id}`,
      kind: 'figure',
      label: '先看图表',
      title: `先看 ${firstFigure.label}`,
      why: firstFigure.readerHint,
      pageNumber: firstFigure.pageNumber,
      targetId: firstFigure.id,
      sectionType: null,
    });
  }

  push(readingPathStepFromSectionOrSkim({
    label: steps.length > 0 ? '再看方法' : '先看方法',
    title: '理解方法和系统结构',
    why: '把论文的方法流程、系统组件或实验设置先连起来，后面的结果和局限才有上下文。',
    sectionTypes: ['method', 'experiment'],
    skimRoles: ['method'],
    sections,
    skimmingAssist,
  }));

  push(readingPathStepFromSectionOrSkim({
    label: '核对结果',
    title: '核对结果证据',
    why: '看论文用什么实验、数字或论证证明主张，避免只停留在摘要判断。',
    sectionTypes: ['result', 'experiment'],
    skimRoles: ['result'],
    sections,
    skimmingAssist,
  }));

  push(readingPathStepFromSectionOrSkim({
    label: '最后看局限',
    title: '检查边界和风险',
    why: '确认论文自己承认的限制、适用范围和可能偏差，判断是否值得深读或引用。',
    sectionTypes: ['limitation'],
    skimRoles: ['limitation'],
    sections,
    skimmingAssist,
  }));

  if (steps.length < 3) {
    push(readingPathStepFromSectionOrSkim({
      label: steps.length > 0 ? '补看问题' : '先看问题',
      title: '确认研究问题',
      why: '先确认论文到底想解决什么问题，再决定是否继续读方法和证据。',
      sectionTypes: ['problem', 'abstract'],
      skimRoles: ['objective', 'novelty'],
      sections,
      skimmingAssist,
    }));
  }

  return steps.slice(0, 5).map((step, index) => ({
    ...step,
    label: `${String(index + 1).padStart(2, '0')} · ${step.label}`,
  }));
}

function readingPathStepFromSectionOrSkim(input: {
  label: string;
  title: string;
  why: string;
  sectionTypes: PaperGuideSectionType[];
  skimRoles: PaperSkimmingRole[];
  sections: PaperStructureSection[];
  skimmingAssist: PaperSkimmingAssistItem[];
}): PaperReadingPathStep | null {
  for (const type of input.sectionTypes) {
    const section = input.sections.find(item => item.sectionType === type && (item.pageStart || item.textPreview));
    if (section) {
      return {
        id: `reading-section:${section.id}`,
        kind: 'section',
        label: input.label,
        title: section.title || input.title,
        why: input.why,
        pageNumber: section.pageStart,
        targetId: section.id,
        sectionType: section.sectionType,
      };
    }
  }

  for (const role of input.skimRoles) {
    const item = input.skimmingAssist.find(skim => skim.role === role);
    if (item) {
      return {
        id: `reading-skim:${item.id}`,
        kind: 'skim',
        label: input.label,
        title: item.sectionTitle || item.label || input.title,
        why: item.body || input.why,
        pageNumber: item.pageNumber,
        targetId: item.sectionId,
        sectionType: item.sectionType,
      };
    }
  }

  return null;
}

function findSkimmingSection(
  sections: PaperStructureSection[],
  preferredTypes: PaperGuideSectionType[],
  keywords: string[],
): PaperStructureSection | null {
  for (const type of preferredTypes) {
    const section = sections.find(item => item.sectionType === type && (item.pageStart || item.textPreview));
    if (section) return section;
  }

  const normalizedKeywords = keywords.map(keyword => keyword.toLowerCase());
  const scored = sections
    .map(section => {
      const haystack = `${section.title}\n${section.textPreview}`.toLowerCase();
      const score = normalizedKeywords.reduce((total, keyword) => total + (haystack.includes(keyword) ? 1 : 0), 0);
      return { section, score };
    })
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score || left.section.orderIndex - right.section.orderIndex);

  return scored[0]?.section || sections.find(section => section.pageStart || section.textPreview) || null;
}

function guideStructureFallback(guide?: PaperGuide): PaperStructureView {
  const sections = (guide?.readingPath || []).map((item, index) => ({
    id: `guide-fallback:${index}`,
    sectionType: item.sectionType,
    title: item.title,
    pageStart: null,
    pageEnd: null,
    orderIndex: index,
    textPreview: item.why,
    chunkCount: 0,
  }));

  return {
    status: 'missing',
    source: 'guide_fallback',
    parseVersion: null,
    parsedAt: null,
    pageCount: null,
    sectionCount: sections.length,
    chunkCount: 0,
    error: null,
    sections,
  };
}

function getCachedOrFallbackPaperGuide(source: PaperSourceRecord): PaperSourceViewModel['guide'] {
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

async function getOrCreatePaperGuide(source: PaperSourceRecord): Promise<PaperSourceViewModel['guide']> {
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

  try {
    const result = await generateStructured(buildGuideMessages(source, metadata, abstract), PaperGuideSchema, {
      chain: ['deepseek'],
      temperature: 0.1,
      maxTokens: 1600,
      timeoutMs: 60_000,
    });
    const generatedAt = new Date().toISOString();
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
    return {
      status: 'ready',
      cacheHit: false,
      generatedAt,
      provider: result.provider,
      usage: result.usage,
      message: null,
      data: result.data,
    };
  } catch (error) {
    return {
      status: 'fallback',
      cacheHit: false,
      generatedAt: null,
      provider: null,
      message: error instanceof Error ? error.message : 'DeepSeek guide failed',
      data: fallbackGuide(source, metadata, abstract),
    };
  }
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
      whyRelevantToProduct: '这篇论文可作为人物页和主题页里的研究证据来源，但 P0 导读需要 DeepSeek 成功生成后才更完整。',
    },
  };
}

async function getOrExtractPaperPageText(source: PaperSourceRecord, requestedPage: number): Promise<PaperPageTextResult> {
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

async function extractPdfPageText(pdfUrl: string, requestedPage: number): Promise<{ pageNumber: number; pageCount: number; text: string }> {
  const extracted = await extractPdfPagesText(pdfUrl, requestedPage, requestedPage);
  const page = extracted.pages[0];
  if (!page) throw new Error('paper_page_text_empty');
  return page;
}

async function extractPdfPagesText(
  pdfUrl: string,
  maxPages: number,
  startPage = 1,
  options: PdfExtractionOptions = {},
): Promise<{ pageCount: number; pages: ExtractedPdfPage[] }> {
  const data = await fetchPdfBytes(pdfUrl, options);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
  const documentInit = {
    data,
    disableFontFace: true,
    useSystemFonts: true,
  } as unknown as Parameters<typeof pdfjs.getDocument>[0];
  const loadingTask = pdfjs.getDocument(documentInit);

  try {
    const pdf = await loadingTask.promise as {
      numPages: number;
      getPage: (pageNumber: number) => Promise<{
        getTextContent: () => Promise<{ items: unknown[] }>;
      }>;
    };
    const firstPage = Math.min(Math.max(1, startPage), pdf.numPages);
    const lastPage = Math.min(pdf.numPages, Math.max(firstPage, firstPage + clampParsePages(maxPages) - 1));
    const pages: ExtractedPdfPage[] = [];
    for (let pageNumber = firstPage; pageNumber <= lastPage; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = normalizePdfTextItems(content.items);
      if (text) pages.push({ pageNumber, pageCount: pdf.numPages, text });
    }
    if (pages.length === 0) throw new Error('paper_page_text_empty');
    return { pageCount: pdf.numPages, pages };
  } finally {
    await loadingTask.destroy?.();
  }
}

async function fetchPdfBytes(pdfUrl: string, options: PdfExtractionOptions = {}): Promise<Uint8Array> {
  const timeoutMs = clampPdfFetchTimeoutMs(options.fetchTimeoutMs ?? DEFAULT_PDF_FETCH_TIMEOUT_MS);
  const retryCount = clampPdfFetchRetries(options.fetchRetries ?? DEFAULT_PDF_FETCH_RETRIES);
  const maxPdfBytes = clampMaxPdfBytes(options.maxPdfBytes ?? DEFAULT_MAX_PDF_BYTES);
  const candidateUrls = pdfFetchCandidateUrls(pdfUrl);
  let lastError: unknown = null;

  for (const candidateUrl of candidateUrls) {
    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      try {
        const contentLength = await fetchPdfContentLength(candidateUrl, timeoutMs);
        if (contentLength && contentLength > maxPdfBytes) {
          throw new Error(`paper_pdf_too_large:${contentLength}`);
        }
        const response = await fetch(candidateUrl, {
          redirect: 'follow',
          headers: {
            Accept: 'application/pdf,*/*;q=0.8',
            'User-Agent': 'ai-person-agent/0.5.0 paper-source-workspace',
          },
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) throw new Error(`paper_pdf_fetch_${response.status}`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength > maxPdfBytes) throw new Error(`paper_pdf_too_large:${bytes.byteLength}`);
        return bytes;
      } catch (error) {
        lastError = error;
        if (error instanceof Error && error.message.startsWith('paper_pdf_too_large:')) throw error;
      }
    }
  }

  throw new Error(normalizePaperPdfFetchError(lastError));
}

async function fetchPdfContentLength(pdfUrl: string, timeoutMs: number): Promise<number | null> {
  try {
    const response = await fetch(pdfUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        Accept: 'application/pdf,*/*;q=0.8',
        'User-Agent': 'ai-person-agent/0.5.0 paper-source-workspace',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const value = response.headers.get('content-length');
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function normalizePdfTextItems(items: unknown[]): string {
  const parts: string[] = [];
  let previousY: number | null = null;

  for (const item of items) {
    const record = asRecord(item);
    const str = readString(record.str);
    if (!str) continue;
    const transform = Array.isArray(record.transform) ? record.transform : [];
    const y = typeof transform[5] === 'number' ? transform[5] : null;
    if (previousY !== null && y !== null && Math.abs(previousY - y) > 8) parts.push('\n');
    parts.push(str);
    previousY = y;
  }

  return parts
    .join(' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

async function fetchOpenAlexBestPdfUrl(metadata: Record<string, unknown>): Promise<{ attempted: boolean; pdfUrl: string | null; message: string | null }> {
  const lookupUrl = openAlexLookupUrl(metadata);
  if (!lookupUrl) {
    return { attempted: false, pdfUrl: null, message: 'missing_openalex_identifier' };
  }

  try {
    const response = await fetch(lookupUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': `ai-person-agent/0.5.0 (mailto:${OPENALEX_MAILTO})`,
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      return { attempted: true, pdfUrl: null, message: `openalex_http_${response.status}` };
    }
    const work = asRecord(await response.json());
    const bestLocation = asRecord(work.best_oa_location);
    const bestPdfUrl = normalizeUrl(readString(bestLocation.pdf_url));
    if (bestPdfUrl) return { attempted: true, pdfUrl: bestPdfUrl, message: null };

    const primaryLocation = asRecord(work.primary_location);
    const primaryPdfUrl = normalizeUrl(readString(primaryLocation.pdf_url));
    if (primaryPdfUrl) return { attempted: true, pdfUrl: primaryPdfUrl, message: null };

    return { attempted: true, pdfUrl: null, message: 'openalex_no_pdf_url' };
  } catch (error) {
    return {
      attempted: true,
      pdfUrl: null,
      message: error instanceof Error ? error.message : 'openalex_fetch_failed',
    };
  }
}

async function mergePaperMetadata(sourceId: string, patch: Record<string, unknown>): Promise<void> {
  const write = async () => {
    const current = await prisma.rawPoolItem.findUnique({
      where: { id: sourceId },
      select: { metadata: true },
    });
    const next = {
      ...asRecord(current?.metadata ?? null),
      ...patch,
    };
    await prisma.rawPoolItem.update({
      where: { id: sourceId },
      data: { metadata: next as Prisma.InputJsonValue },
    });
  };

  try {
    await write();
  } catch (error) {
    if (!isNeonResetError(error)) throw error;
    await prisma.people.count();
    await write();
  }
}

function listPaperNotesFromMetadata(metadata: Prisma.JsonValue | null): PaperNote[] {
  const cached = CachedPaperNotesSchema.safeParse(asRecord(metadata).paperNotes);
  if (!cached.success || cached.data.version !== PAPER_NOTES_VERSION) return [];
  return cached.data.items
    .map(note => ({
      id: note.id,
      body: note.body,
      quote: note.quote,
      pageNumber: note.pageNumber,
      sectionId: note.sectionId,
      sectionTitle: note.sectionTitle,
      sectionType: note.sectionType,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    }))
    .filter(note => note.id && note.body)
    .slice(0, PAPER_NOTES_LIMIT);
}

async function persistPaperNotes(sourceId: string, notes: PaperNote[], updatedAt = new Date().toISOString()): Promise<void> {
  await mergePaperMetadata(sourceId, {
    paperNotes: {
      version: PAPER_NOTES_VERSION,
      updatedAt,
      items: notes.slice(0, PAPER_NOTES_LIMIT),
    },
  });
}

function openAlexLookupCandidates(source: PaperSourceRecord, metadata: Record<string, unknown>): OpenAlexLookupCandidate[] {
  const candidates: OpenAlexLookupCandidate[] = [];
  const seen = new Set<string>();
  const add = (candidate: OpenAlexLookupCandidate | null) => {
    if (!candidate || seen.has(candidate.key)) return;
    seen.add(candidate.key);
    candidates.push(candidate);
  };

  add(openAlexLookupCandidateFromWorkId(readString(metadata.openalexWorkId) || readString(metadata.openalexId)));
  add(openAlexLookupCandidateFromDoi(readString(metadata.doi)));
  add(openAlexLookupCandidateFromDoi(extractDoiKey(source.url)));
  add(openAlexLookupCandidateFromDoi(readString(metadata.landingPageUrl)));

  const arxivId = extractArxivIdFromPaperIdentifiers({
    url: source.url,
    doi: readString(metadata.doi),
    openalexWorkId: readString(metadata.openalexWorkId) || readString(metadata.openalexId),
    landingPageUrl: readString(metadata.landingPageUrl),
  });
  add(openAlexLookupCandidateFromDoi(arxivId ? `10.48550/arXiv.${arxivId.replace(/v\d+$/i, '')}` : null));
  add(openAlexLookupCandidateFromTitle(source.title));

  return candidates;
}

function openAlexLookupUrl(metadata: Record<string, unknown>): string | null {
  const openalexWorkId = readString(metadata.openalexWorkId) || readString(metadata.openalexId);
  const doi = readString(metadata.doi);
  return openAlexLookupCandidateFromWorkId(openalexWorkId)?.url
    || openAlexLookupCandidateFromDoi(doi)?.url
    || null;
}

function openAlexLookupCandidateFromWorkId(value: string | null): OpenAlexLookupCandidate | null {
  const openalexWorkId = cleanOpenAlexWorkId(value);
  const params = new URLSearchParams({ mailto: OPENALEX_MAILTO });
  if (process.env.OPENALEX_API_KEY) params.set('api_key', process.env.OPENALEX_API_KEY);
  return openalexWorkId
    ? {
      key: `openalex:${openalexWorkId}`,
      url: `${OPENALEX_WORKS_URL}/${openalexWorkId}?${params}`,
      openalexWorkId,
    }
    : null;
}

function openAlexLookupCandidateFromDoi(value: string | null): OpenAlexLookupCandidate | null {
  const doi = normalizeDoi(value);
  const params = new URLSearchParams({ mailto: OPENALEX_MAILTO });
  if (process.env.OPENALEX_API_KEY) params.set('api_key', process.env.OPENALEX_API_KEY);
  return doi
    ? {
      key: `doi:${doi.toLowerCase()}`,
      url: `${OPENALEX_WORKS_URL}/doi:${encodeURIComponent(doi)}?${params}`,
      openalexWorkId: null,
    }
    : null;
}

function openAlexLookupCandidateFromTitle(value: string | null | undefined): OpenAlexLookupCandidate | null {
  const title = cleanText(value || '');
  if (title.length < 12) return null;
  const params = new URLSearchParams({
    search: title,
    per_page: '5',
    mailto: OPENALEX_MAILTO,
  });
  if (process.env.OPENALEX_API_KEY) params.set('api_key', process.env.OPENALEX_API_KEY);
  return {
    key: `title:${hashText(title)}`,
    url: `${OPENALEX_WORKS_URL}?${params}`,
    openalexWorkId: null,
  };
}

function cleanOpenAlexWorkId(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/(?:openalex\.org\/)?(W\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

function cleanOpenAlexAuthorId(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/(?:openalex\.org\/)?(A\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

function openalexUrl(value: string | null): string | null {
  if (!value) return null;
  const workId = cleanOpenAlexWorkId(value);
  if (workId) return `https://openalex.org/${workId}`;
  if (value.startsWith('http')) return value;
  return null;
}

function extractArxivId(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = decodeURIComponent(String(value)).trim();
  const arxivUrl = text.match(/arxiv\.org\/(?:abs|pdf|html)\/([^?#\s]+)/i);
  if (arxivUrl) return normalizeArxivId(arxivUrl[1]);

  const doiArxiv = text.match(/10\.48550\/arxiv\.([A-Za-z0-9._/-]+(?:v\d+)?)/i);
  if (doiArxiv) return normalizeArxivId(doiArxiv[1]);

  const labeled = text.match(/arxiv[:.]\s*([A-Za-z0-9._/-]+(?:v\d+)?)/i);
  if (labeled) return normalizeArxivId(labeled[1]);

  return null;
}

function normalizeArxivId(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .trim()
    .replace(/\.pdf$/i, '')
    .replace(/^abs\//i, '')
    .replace(/^pdf\//i, '')
    .replace(/[).,;]+$/g, '');
  const modern = cleaned.match(/^\d{4}\.\d{4,5}(?:v\d+)?$/i);
  const legacy = cleaned.match(/^[a-z-]+(?:\.[A-Z]{2})?\/\d{7}(?:v\d+)?$/i);
  if (!modern && !legacy) return null;
  return cleaned;
}

function paperAbstract(source: PaperSourceRecord, metadata: Record<string, unknown>): string {
  return paperAbstractFromText(readString(metadata.abstract) || source.text);
}

function readPaperAuthorEntries(metadata: Record<string, unknown>): Array<{ name: string; openalexId: string | null }> {
  const authors = metadata.authors;
  const entries: Array<{ name: string; openalexId: string | null }> = [];

  if (Array.isArray(authors)) {
    entries.push(...authors.map(author => {
      if (typeof author === 'string') return { name: author.trim(), openalexId: null };
      const record = asRecord(author);
      const nestedAuthor = asRecord(record.author);
      const name = (
        readString(record.display_name)
        || readString(record.name)
        || readString(record.authorName)
        || readString(nestedAuthor.display_name)
        || readString(nestedAuthor.name)
        || ''
      );
      return {
        name,
        openalexId: cleanOpenAlexAuthorId(
          readString(record.openalexAuthorId)
          || readString(record.openalexId)
          || readString(nestedAuthor.id)
          || readString(nestedAuthor.openalexId),
        ),
      };
    }).filter(author => author.name));
  }

  entries.push(...readTargetEntityNames(metadata, ['person', 'people', 'author']).map(name => ({ name, openalexId: null })));

  const seen = new Set<string>();
  return entries.filter(author => {
    const key = `${normalizeAuthorNameKey(author.name)}:${author.openalexId || ''}`;
    if (!key.trim() || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function readPaperAuthorNames(metadata: Record<string, unknown>): string[] {
  return [...new Set(readPaperAuthorEntries(metadata).map(author => author.name).filter(Boolean))];
}

function readPaperOrganizationNames(metadata: Record<string, unknown>): string[] {
  const names: string[] = [];
  const organizations = metadata.organizations;
  if (Array.isArray(organizations)) {
    names.push(...organizations.map(item => {
      if (typeof item === 'string') return item;
      const record = asRecord(item);
      return readString(record.display_name)
        || readString(record.name)
        || readString(record.label)
        || '';
    }).filter(Boolean));
  }

  names.push(...readTargetEntityNames(metadata, ['organization', 'org', 'institution']));

  const authors = metadata.authors;
  if (!Array.isArray(authors)) return [...new Set(names.map(cleanOrganizationName).filter(Boolean))].slice(0, 20);
  for (const author of authors) {
    const record = asRecord(author);
    const rawAffiliations = [
      record.affiliations,
      record.institutions,
      record.raw_affiliation_strings,
      record.rawAffiliationStrings,
    ];
    for (const value of rawAffiliations) {
      if (!Array.isArray(value)) continue;
      for (const item of value) {
        if (typeof item === 'string') {
          names.push(item);
          continue;
        }
        const affiliation = asRecord(item);
        const institution = asRecord(affiliation.institution);
        const displayName = readString(affiliation.display_name)
          || readString(affiliation.name)
          || readString(institution.display_name)
          || readString(institution.name);
        if (displayName) names.push(displayName);
      }
    }
  }

  return [...new Set(names.map(cleanOrganizationName).filter(Boolean))].slice(0, 20);
}

function readTargetEntityNames(metadata: Record<string, unknown>, acceptedTypes: string[]): string[] {
  const targetEntities = metadata.targetEntities;
  if (!Array.isArray(targetEntities)) return [];
  const typeSet = new Set(acceptedTypes.map(type => type.toLowerCase()));
  return targetEntities.map(entity => {
    const record = asRecord(entity);
    const type = readString(record.type)?.toLowerCase();
    if (!type || !typeSet.has(type)) return '';
    return readString(record.label)
      || readString(record.name)
      || readString(record.display_name)
      || '';
  }).filter(Boolean);
}

function findPaperAuthorPersonCandidates(
  authorName: string,
  people: Array<{
    id: string;
    name: string;
    aliases: string[];
    currentTitle: string | null;
    openalexId: string | null;
    influenceScore: number;
  }>,
  openalexAuthorId: string | null = null,
): PaperEntityReviewCandidatePerson[] {
  const authorKey = normalizeAuthorNameKey(authorName);
  const cleanAuthorId = cleanOpenAlexAuthorId(openalexAuthorId);
  if (!authorKey && !cleanAuthorId) return [];
  const matches: PaperEntityReviewCandidatePerson[] = [];
  for (const person of people) {
    if (cleanAuthorId && cleanOpenAlexAuthorId(person.openalexId) === cleanAuthorId) {
      matches.push({
        id: person.id,
        name: person.name,
        href: `/person/${person.id}`,
        currentTitle: person.currentTitle,
        openalexId: person.openalexId,
        matchedName: authorName || person.name,
        matchReason: 'openalex_exact',
        confidence: 0.96,
      });
      continue;
    }
    const nameKey = normalizeAuthorNameKey(person.name);
    if (nameKey === authorKey) {
      matches.push({
        id: person.id,
        name: person.name,
        href: `/person/${person.id}`,
        currentTitle: person.currentTitle,
        openalexId: person.openalexId,
        matchedName: person.name,
        matchReason: 'name_exact',
        confidence: 0.92,
      });
      continue;
    }
    const matchedAlias = person.aliases.find(alias => normalizeAuthorNameKey(alias) === authorKey);
    if (matchedAlias) {
      matches.push({
        id: person.id,
        name: person.name,
        href: `/person/${person.id}`,
        currentTitle: person.currentTitle,
        openalexId: person.openalexId,
        matchedName: matchedAlias,
        matchReason: 'alias_exact',
        confidence: 0.86,
      });
    }
  }
  return dedupePaperEntityPersonCandidates(matches)
    .sort((left, right) => right.confidence - left.confidence || left.name.localeCompare(right.name))
    .slice(0, 5);
}

function dedupePaperEntityPersonCandidates(candidates: PaperEntityReviewCandidatePerson[]): PaperEntityReviewCandidatePerson[] {
  const byId = new Map<string, PaperEntityReviewCandidatePerson>();
  for (const candidate of candidates) {
    const existing = byId.get(candidate.id);
    if (!existing || candidate.confidence > existing.confidence) byId.set(candidate.id, candidate);
  }
  return [...byId.values()];
}

function findPaperOrganizationCandidates(
  organizationName: string,
  organizations: Array<{
    id: string;
    name: string;
    aliases: string[];
  }>,
): PaperEntityReviewCandidateOrganization[] {
  const organizationKey = normalizeEntityNameKey(organizationName);
  if (!organizationKey) return [];
  const matches: PaperEntityReviewCandidateOrganization[] = [];
  for (const organization of organizations) {
    if (normalizeEntityNameKey(organization.name) === organizationKey) {
      matches.push({
        id: organization.id,
        name: organization.name,
        aliases: organization.aliases,
        matchReason: 'name_exact',
        confidence: 0.9,
      });
      continue;
    }
    if (organization.aliases.some(alias => normalizeEntityNameKey(alias) === organizationKey)) {
      matches.push({
        id: organization.id,
        name: organization.name,
        aliases: organization.aliases,
        matchReason: 'alias_exact',
        confidence: 0.82,
      });
    }
  }
  return matches.sort((left, right) => right.confidence - left.confidence || left.name.localeCompare(right.name)).slice(0, 5);
}

function dedupePaperEntityReviewCandidates(candidates: PaperEntityReviewCandidate[]): PaperEntityReviewCandidate[] {
  const byKey = new Map<string, PaperEntityReviewCandidate>();
  for (const candidate of candidates) {
    const key = `${candidate.sourceItemId}:${candidate.entityKind}:${candidate.mentionType}:${normalizeEntityNameKey(candidate.entityName)}`;
    const existing = byKey.get(key);
    if (!existing || candidate.confidence > existing.confidence) byKey.set(key, candidate);
  }
  return [...byKey.values()].sort((left, right) => {
    const byKind = left.entityKind.localeCompare(right.entityKind);
    if (byKind !== 0) return byKind;
    return right.confidence - left.confidence || left.entityName.localeCompare(right.entityName);
  });
}

function parsePaperEntityCandidatePeople(value: unknown): PaperEntityReviewCandidatePerson[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    const record = asRecord(item);
    const id = readString(record.id);
    const name = readString(record.name);
    if (!id || !name) return null;
    return {
      id,
      name,
      href: readString(record.href) || `/person/${id}`,
      currentTitle: readString(record.currentTitle),
      openalexId: readString(record.openalexId),
      matchedName: readString(record.matchedName) || name,
      matchReason: normalizePaperEntityPersonMatchReason(record.matchReason),
      confidence: readNumber(record.confidence) ?? 0.7,
    };
  }).filter((item): item is PaperEntityReviewCandidatePerson => Boolean(item));
}

function normalizePaperEntityPersonMatchReason(value: unknown): PaperEntityReviewCandidatePerson['matchReason'] {
  if (value === 'openalex_exact' || value === 'alias_exact') return value;
  return 'name_exact';
}

function parsePaperEntityCandidateOrganizations(value: unknown): PaperEntityReviewCandidateOrganization[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    const record = asRecord(item);
    const id = readString(record.id);
    const name = readString(record.name);
    if (!id || !name) return null;
    return {
      id,
      name,
      aliases: readStringArray(record.aliases),
      matchReason: record.matchReason === 'alias_exact' ? 'alias_exact' as const : 'name_exact' as const,
      confidence: readNumber(record.confidence) ?? 0.7,
    };
  }).filter((item): item is PaperEntityReviewCandidateOrganization => Boolean(item));
}

function normalizePaperEntityKind(value: string): PaperEntityReviewCandidate['entityKind'] {
  return value === 'organization' ? 'organization' : 'person';
}

function normalizePaperEntityMentionType(value: string): PaperEntityReviewCandidate['mentionType'] {
  if (value === 'affiliation' || value === 'text_mention') return value;
  return 'author';
}

function normalizePaperEntityReviewStatus(value: string): typeof PAPER_ENTITY_REVIEW_STATUSES[number] {
  if (PAPER_ENTITY_REVIEW_STATUSES.includes(value as typeof PAPER_ENTITY_REVIEW_STATUSES[number])) {
    return value as typeof PAPER_ENTITY_REVIEW_STATUSES[number];
  }
  return 'needs_review';
}

function cleanOrganizationName(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/\.$/, '').trim();
}

function normalizeEntityNameKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeDoi(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/^https?:\/\/doi\.org\//i, '').trim() || null;
}

function extractDoiKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = decodeURIComponent(String(value)).match(/10\.\d{4,9}\/[^\s"'<>]+/i);
  if (!match) return null;
  return normalizeDoi(match[0].replace(/[).,;]+$/g, ''))?.toLowerCase() ?? null;
}

function normalizeUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeComparablePaperUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    let pathname = decodeURIComponent(parsed.pathname).replace(/\/+$/g, '');
    if (hostname === 'arxiv.org') {
      const arxivId = extractArxivId(value);
      if (arxivId) pathname = `/abs/${normalizeArxivVersionless(arxivId)}`;
    }
    return `${hostname}${pathname}${parsed.search}`.toLowerCase();
  } catch {
    return null;
  }
}

function normalizeArxivVersionless(value: string): string {
  return value.replace(/v\d+$/i, '').toLowerCase();
}

function pdfFetchCandidateUrls(pdfUrl: string): string[] {
  const urls = [pdfUrl];
  try {
    const parsed = new URL(pdfUrl);
    if (parsed.hostname === 'arxiv.org' && parsed.pathname.startsWith('/pdf/')) {
      const exportUrl = new URL(pdfUrl);
      exportUrl.hostname = 'export.arxiv.org';
      urls.push(exportUrl.toString());
    }
  } catch {
    // keep the original URL only
  }
  return [...new Set(urls)];
}

export function normalizeAuthorNameKey(value: string | null | undefined): string {
  const tokens = (value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&[a-z]+;/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(token => token.length > 1);
  return tokens.join(' ');
}

function normalizePaperTitleKey(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .replace(/&[a-z]+;/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function openAlexInvertedIndexToText(value: unknown): string {
  const invertedIndex = asRecord(value);
  const words: Array<[string, number]> = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    if (!Array.isArray(positions)) continue;
    for (const position of positions) {
      if (typeof position === 'number') words.push([word, position]);
    }
  }
  return words
    .sort((left, right) => left[1] - right[1])
    .map(([word]) => word)
    .join(' ')
    .trim();
}

function hashText(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function clampPdfFetchTimeoutMs(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_PDF_FETCH_TIMEOUT_MS;
  return Math.min(MAX_PDF_FETCH_TIMEOUT_MS, Math.max(20_000, Math.floor(value)));
}

function clampPdfFetchRetries(value: number): number {
  if (!Number.isFinite(value) || value < 0) return DEFAULT_PDF_FETCH_RETRIES;
  return Math.min(MAX_PDF_FETCH_RETRIES, Math.floor(value));
}

function clampMaxPdfBytes(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_MAX_PDF_BYTES;
  return Math.min(MAX_PDF_BYTES, Math.max(1 * 1024 * 1024, Math.floor(value)));
}

function normalizeOptionalNoteText(value: string | null | undefined, maxLength: number): string | null {
  const text = sanitizePaperTextForStorage(value || '').trim();
  return text ? truncate(text, maxLength) : null;
}

function normalizeNotePage(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return Math.min(2000, Math.floor(value));
}

function normalizePaperParseError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || 'paper_parse_failed');
  if (/aborted due to timeout|AbortError|timed out/i.test(message)) return 'paper_pdf_fetch_timeout';
  if (/^paper_pdf_too_large:/i.test(message)) return message;
  return message || 'paper_parse_failed';
}

function normalizePaperPdfFetchError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || 'paper_pdf_fetch_failed');
  if (/aborted due to timeout|AbortError|timed out/i.test(message)) return 'paper_pdf_fetch_timeout';
  if (/^paper_pdf_too_large:/i.test(message)) return message;
  if (/^paper_pdf_fetch_/i.test(message)) return message;
  return `paper_pdf_fetch_failed:${message}`;
}

function normalizePageNumber(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
}

export function sanitizePaperTextForStorage(value: string): string {
  return value
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ');
}

function cleanText(value: string): string {
  return sanitizePaperTextForStorage(value).replace(/\s+/g, ' ').trim();
}

function normalizeSectionDetectionText(value: string): string {
  return sanitizePaperTextForStorage(value)
    .replace(/([A-Za-z])\s+(?=[A-Za-z]\b)/g, '$1')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function hasSpacedHeading(text: string, word: string): boolean {
  const pattern = word
    .split('')
    .map(char => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s*');
  return new RegExp(`\\b${pattern}\\b`, 'i').test(text.slice(0, 1_600));
}

function truncate(value: string, maxLength: number): string {
  const clean = cleanText(value);
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}...` : clean;
}

function truncatePageText(value: string, maxLength: number): string {
  const clean = sanitizePaperTextForStorage(value)
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}...` : clean;
}

function truncateForTranslation(value: string): string {
  const clean = value
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return clean.length > MAX_TRANSLATION_SOURCE_CHARS
    ? `${clean.slice(0, MAX_TRANSLATION_SOURCE_CHARS - 1)}…`
    : clean;
}

function cleanCitationQuote(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

function normalizeCitationComparableText(value: string): string {
  return cleanCitationQuote(value).toLowerCase();
}

function stripCitationTruncationSuffix(value: string): string {
  return value.replace(/(?:\.{3}|…)+$/u, '').trim();
}

function extractSearchTokens(value: string): string[] {
  const matches = value.toLowerCase().match(/[\p{Script=Han}]+|[a-z0-9][a-z0-9_-]*/gu) || [];
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'what', 'when', 'where', 'why', 'how',
    'are', 'was', 'were', 'does', 'did', 'about', 'paper', '论文', '这篇', '什么', '如何',
    '为什么', '是否', '请问', '介绍', '说明',
  ]);
  const tokens: string[] = [];
  for (const match of matches) {
    if (match.length <= 1 && !/[\p{Script=Han}]/u.test(match)) continue;
    if (stopWords.has(match)) continue;
    tokens.push(match);
    if (/[\p{Script=Han}]/u.test(match) && match.length > 2) {
      for (let index = 0; index < match.length - 1; index += 1) {
        tokens.push(match.slice(index, index + 2));
      }
    }
  }
  return [...new Set(tokens)].slice(0, 24);
}

function clampParsePages(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PARSE_MAX_PAGES;
  return Math.min(MAX_PARSE_PAGES, Math.max(1, Math.floor(value)));
}

function estimateTokens(value: string): number {
  return Math.max(1, Math.ceil(value.length / 4));
}

function normalizeSectionType(value: string | null | undefined): PaperGuideSectionType {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return sectionTypes.has(normalized as PaperGuideSectionType) ? normalized as PaperGuideSectionType : 'other';
}

function normalizePaperStatus(value: string | null | undefined): PaperStructureView['status'] {
  if (value === 'metadata_only' || value === 'parsed' || value === 'parse_failed' || value === 'pdf_fetch_failed') return value;
  return 'metadata_only';
}

function sectionTypeLabel(value: PaperGuideSectionType): string {
  switch (value) {
    case 'abstract': return 'Abstract';
    case 'problem': return 'Problem';
    case 'method': return 'Method';
    case 'experiment': return 'Experiment';
    case 'result': return 'Result';
    case 'limitation': return 'Limitation';
    default: return 'Reading';
  }
}

function titleCaseHeading(value: string): string {
  return value
    .split(/\s+/)
    .map(word => word.length <= 3 ? word.toLowerCase() : `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ')
    .replace(/\bAi\b/g, 'AI')
    .replace(/\bPdf\b/g, 'PDF');
}

async function withNeonWakeup<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (!isNeonResetError(error)) throw error;
    await prisma.people.count();
    return action();
  }
}

function isNeonResetError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /ECONNRESET|connection.*reset|terminating connection/i.test(message);
}

function isMissingPaperDocumentTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /PaperDocument|PaperSection|PaperChunk|does not exist|P2021/i.test(message);
}

function isMissingProductEvidenceSourceTable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }
  const message = error instanceof Error ? error.message : String(error);
  return /ProductEvidenceSource|does not exist|P2021/i.test(message);
}

function isMissingPaperEntityReviewTable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }
  const message = error instanceof Error ? error.message : String(error);
  return /PaperEntityReview|does not exist|P2021/i.test(message);
}

function formatDate(value: Date | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(value);
}
