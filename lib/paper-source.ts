export {
  PAPER_GUIDE_PROMPT_VERSION,
  PAPER_PAGE_TEXT_CACHE_VERSION,
  PAPER_TRANSLATION_PROMPT_VERSION,
  PAPER_PARSE_VERSION,
  PAPER_REFERENCES_CACHE_VERSION,
  PAPER_CHAT_PROMPT_VERSION,
  PAPER_NOTES_VERSION,
} from './paper-source/constants';

export type {
  PaperGuide,
  PaperGuideSectionType,
} from './paper-source/schemas';
export { normalizePaperChatCitationQuote } from './paper-source/schemas';

export type {
  CreatePaperNoteInput,
  PaperAuthorPersonLink,
  PaperAuthorReviewCandidate,
  PaperChatCitation,
  PaperChatOptions,
  PaperChatRelatedContextItem,
  PaperChatResult,
  PaperEntityReviewCandidate,
  PaperEntityReviewCandidateOrganization,
  PaperEntityReviewCandidatePerson,
  PaperEntityReviewItem,
  PaperFigureCard,
  PaperFigureEvidenceRole,
  PaperMaterializationOptions,
  PaperMaterializationResult,
  PaperNote,
  PaperPageTextResult,
  PaperReadingPathStep,
  PaperReadingPathStepKind,
  PaperReferenceCard,
  PaperReferenceQualityIssue,
  PaperReferenceStatus,
  PaperRelatedThread,
  PaperRelatedWork,
  PaperSemanticReaderView,
  PaperSkimmingAssistItem,
  PaperSkimmingRole,
  PaperSourceRecord,
  PaperSourceViewModel,
  PaperSourceViewModelOptions,
  PaperStructureSection,
  PaperStructureView,
  PaperTranslationResult,
  PdfResolution,
} from './paper-source/types';

export {
  getOrCreatePaperGuideViewModel,
  getPaperSourceViewModel,
} from './paper-source/view-model';
export {
  answerPaperQuestion,
  groundPaperCitationQuote,
  isPaperCitationQuoteGrounded,
} from './paper-source/chat';
export {
  getPaperAuthorPeople,
  getPaperEntityReviewQueue,
  buildPaperEntityReviewCandidates,
} from './paper-source/entity-review';
export {
  extractPaperFigureCaptionsFromText,
} from './paper-source/figures';
export {
  isPaperGuideCacheUsable,
} from './paper-source/guide';
export {
  DEFAULT_PAPER_LLM_CHAIN,
  paperLlmChain,
} from './paper-source/llm';
export {
  paperAbstractFromText,
} from './paper-source/metadata';
export {
  materializePaperDocument,
} from './paper-source/materialization';
export {
  getPaperNotes,
  createPaperNote,
  deletePaperNote,
} from './paper-source/notes';
export {
  comparePaperTitles,
  materializePaperReferenceCards,
  selectOpenAlexWorkFromLookupPayload,
} from './paper-source/references';
export {
  extractArxivIdFromPaperIdentifiers,
} from './paper-source/openalex';
export {
  resolvePdfUrl,
} from './paper-source/pdf-resolve';
export {
  getPaperRelatedThreads,
  getPaperSourcePackThreadLinks,
  isPublishablePaperRelatedThread,
} from './paper-source/related-threads';
export {
  getPaperRelatedWorks,
} from './paper-source/related-works';
export {
  buildPaperSemanticReader,
} from './paper-source/semantic-reader';
export {
  loadPaperSource,
  internalPaperSourceHref,
} from './paper-source/source';
export {
  classifyPaperSectionType,
} from './paper-source/section-utils';
export {
  getPaperStructureView,
} from './paper-source/structure';
export {
  getPaperPageText,
  isPaperTranslationCacheUsable,
  translatePaperToChinese,
} from './paper-source/translation';
export {
  normalizeAuthorNameKey,
  sanitizePaperTextForStorage,
} from './paper-source/utils';
