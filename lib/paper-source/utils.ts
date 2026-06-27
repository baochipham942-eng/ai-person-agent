import { createHash } from 'node:crypto';
import {
  DEFAULT_PARSE_MAX_PAGES,
  DEFAULT_PDF_FETCH_RETRIES,
  DEFAULT_PDF_FETCH_TIMEOUT_MS,
  DEFAULT_MAX_PDF_BYTES,
  MAX_PARSE_PAGES,
  MAX_PDF_BYTES,
  MAX_PDF_FETCH_RETRIES,
  MAX_PDF_FETCH_TIMEOUT_MS,
  MAX_TRANSLATION_SOURCE_CHARS,
} from './constants';
import type { PaperGuideSectionType } from './schemas';

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

export function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function normalizeDoi(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/^https?:\/\/doi\.org\//i, '').trim() || null;
}

export function extractDoiKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = decodeURIComponent(String(value)).match(/10\.\d{4,9}\/[^\s"'<>]+/i);
  if (!match) return null;
  return normalizeDoi(match[0].replace(/[).,;]+$/g, ''))?.toLowerCase() ?? null;
}

export function normalizeUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeComparablePaperUrl(value: string | null | undefined): string | null {
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

export function normalizeArxivVersionless(value: string): string {
  return value.replace(/v\d+$/i, '').toLowerCase();
}

export function pdfFetchCandidateUrls(pdfUrl: string): string[] {
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

export function normalizePaperTitleKey(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .replace(/&[a-z]+;/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function openAlexInvertedIndexToText(value: unknown): string {
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

export function hashText(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

export function clampPdfFetchTimeoutMs(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_PDF_FETCH_TIMEOUT_MS;
  return Math.min(MAX_PDF_FETCH_TIMEOUT_MS, Math.max(20_000, Math.floor(value)));
}

export function clampPdfFetchRetries(value: number): number {
  if (!Number.isFinite(value) || value < 0) return DEFAULT_PDF_FETCH_RETRIES;
  return Math.min(MAX_PDF_FETCH_RETRIES, Math.floor(value));
}

export function clampMaxPdfBytes(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_MAX_PDF_BYTES;
  return Math.min(MAX_PDF_BYTES, Math.max(1 * 1024 * 1024, Math.floor(value)));
}

export function normalizeOptionalNoteText(value: string | null | undefined, maxLength: number): string | null {
  const text = sanitizePaperTextForStorage(value || '').trim();
  return text ? truncate(text, maxLength) : null;
}

export function normalizeNotePage(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return Math.min(2000, Math.floor(value));
}

export function normalizePaperParseError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || 'paper_parse_failed');
  if (/aborted due to timeout|AbortError|timed out/i.test(message)) return 'paper_pdf_fetch_timeout';
  if (/^paper_pdf_too_large:/i.test(message)) return message;
  return message || 'paper_parse_failed';
}

export function normalizePaperPdfFetchError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || 'paper_pdf_fetch_failed');
  if (/aborted due to timeout|AbortError|timed out/i.test(message)) return 'paper_pdf_fetch_timeout';
  if (/^paper_pdf_too_large:/i.test(message)) return message;
  if (/^paper_pdf_fetch_/i.test(message)) return message;
  return `paper_pdf_fetch_failed:${message}`;
}

export function normalizePageNumber(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
}

export function sanitizePaperTextForStorage(value: string): string {
  return value
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ');
}

export function cleanText(value: string): string {
  return sanitizePaperTextForStorage(value).replace(/\s+/g, ' ').trim();
}

export function normalizeSectionDetectionText(value: string): string {
  return sanitizePaperTextForStorage(value)
    .replace(/([A-Za-z])\s+(?=[A-Za-z]\b)/g, '$1')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

export function hasSpacedHeading(text: string, word: string): boolean {
  const pattern = word
    .split('')
    .map(char => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s*');
  return new RegExp(`\\b${pattern}\\b`, 'i').test(text.slice(0, 1_600));
}

export function truncate(value: string, maxLength: number): string {
  const clean = cleanText(value);
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}...` : clean;
}

export function truncatePageText(value: string, maxLength: number): string {
  const clean = sanitizePaperTextForStorage(value)
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}...` : clean;
}

export function truncateForTranslation(value: string): string {
  const clean = value
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return clean.length > MAX_TRANSLATION_SOURCE_CHARS
    ? `${clean.slice(0, MAX_TRANSLATION_SOURCE_CHARS - 1)}…`
    : clean;
}

export function cleanCitationQuote(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

export function normalizeCitationComparableText(value: string): string {
  return cleanCitationQuote(value).toLowerCase();
}

export function stripCitationTruncationSuffix(value: string): string {
  return value.replace(/(?:\.{3}|…)+$/u, '').trim();
}

export function extractSearchTokens(value: string): string[] {
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

export function clampParsePages(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PARSE_MAX_PAGES;
  return Math.min(MAX_PARSE_PAGES, Math.max(1, Math.floor(value)));
}

export function estimateTokens(value: string): number {
  return Math.max(1, Math.ceil(value.length / 4));
}

export function sectionTypeLabel(value: PaperGuideSectionType): string {
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

export function titleCaseHeading(value: string): string {
  return value
    .split(/\s+/)
    .map(word => word.length <= 3 ? word.toLowerCase() : `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ')
    .replace(/\bAi\b/g, 'AI')
    .replace(/\bPdf\b/g, 'PDF');
}

export function formatDate(value: Date | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(value);
}

export function extractArxivId(value: string | null | undefined): string | null {
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

export function normalizeArxivId(value: string | null | undefined): string | null {
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
