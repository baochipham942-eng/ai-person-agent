

export const PAPER_GUIDE_PROMPT_VERSION = 'paper-guide-v2';

export const PAPER_PAGE_TEXT_CACHE_VERSION = 'paper-page-text-v1';

export const PAPER_TRANSLATION_PROMPT_VERSION = 'paper-translation-v2';

export const PAPER_PARSE_VERSION = 'paper-parse-v1';

export const PAPER_REFERENCES_CACHE_VERSION = 'paper-references-v3';

export const PAPER_CHAT_PROMPT_VERSION = 'paper-chat-v4';

export const PAPER_NOTES_VERSION = 'paper-notes-v1';

export const OPENALEX_WORKS_URL = 'https://api.openalex.org/works';

export const OPENALEX_MAILTO = process.env.OPENALEX_MAILTO || 'ai-person-agent@example.com';

export const MAX_CACHED_PAGE_TEXT_CHARS = 12_000;

export const MAX_TRANSLATION_SOURCE_CHARS = 6_000;

export const DEFAULT_PARSE_MAX_PAGES = 16;

export const MAX_PARSE_PAGES = 80;

export const DEFAULT_PDF_FETCH_TIMEOUT_MS = 120_000;

export const MAX_PDF_FETCH_TIMEOUT_MS = 300_000;

export const DEFAULT_PDF_FETCH_RETRIES = 1;

export const MAX_PDF_FETCH_RETRIES = 3;

export const DEFAULT_MAX_PDF_BYTES = 24 * 1024 * 1024;

export const MAX_PDF_BYTES = 96 * 1024 * 1024;

export const CHUNK_TARGET_CHARS = 1_500;

export const PAPER_CHAT_MAX_CONTEXT_CHARS = 12_000;

export const PAPER_CHAT_CACHE_LIMIT = 24;

export const PAPER_NOTES_LIMIT = 80;

export const PAPER_REFERENCE_FETCH_LIMIT = 16;

export const PAPER_REFERENCE_CARD_LIMIT = 8;

export const PUBLISHABLE_PRODUCT_EVIDENCE_STATUSES = ['auto', 'confirmed'];

export const PAPER_ENTITY_REVIEW_STATUSES = ['needs_review', 'confirmed', 'rejected'] as const;
