import { Prisma } from '@prisma/client';
import type { LlmUsage } from '@/lib/ai/provider';
import { PAPER_ENTITY_REVIEW_STATUSES } from './constants';
import type { PaperGuide, PaperGuideSectionType } from './schemas';

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

export interface ExtractedPdfPage {
  pageNumber: number;
  pageCount: number;
  text: string;
}

export interface PaperSectionDraft {
  id?: string;
  sectionType: PaperGuideSectionType;
  title: string;
  text: string;
  pageStart: number | null;
  pageEnd: number | null;
  orderIndex: number;
}

export interface PaperChunkDraft {
  id?: string;
  sectionOrderIndex: number;
  text: string;
  pageNumber: number | null;
  chunkIndex: number;
  anchorHint: Record<string, unknown>;
  tokenEstimate: number;
  textHash: string;
}

export interface PaperFigureDraft {
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

export interface PaperChatChunk {
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

export interface PaperReferenceLookup {
  cards: PaperReferenceCard[];
  status: PaperReferenceStatus;
}

export interface OpenAlexLookupCandidate {
  key: string;
  url: string;
  openalexWorkId: string | null;
}

export interface FetchedOpenAlexReferences {
  referencesTotal: number;
  cards: PaperReferenceCard[];
  openalexWorkId: string | null;
  openalexWorkTitle: string | null;
  titleSimilarity: number | null;
  titleMismatch: boolean;
  message: string | null;
}

export interface PdfExtractionOptions {
  fetchTimeoutMs?: number;
  fetchRetries?: number;
  maxPdfBytes?: number;
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

export interface CreatePaperNoteInput {
  sourceId: string;
  body: string;
  quote?: string | null;
  pageNumber?: number | null;
  sectionId?: string | null;
  sectionTitle?: string | null;
  sectionType?: PaperGuideSectionType | null;
}
