import { createHash } from 'node:crypto';

export type SearchObjectType = 'raw_pool_item' | 'knowledge_source' | 'company_source' | 'card';

export interface SourceSearchDocument {
  objectType: SearchObjectType;
  objectId: string;
  personId?: string | null;
  threadId?: string | null;
  organizationId?: string | null;
  sourceType?: string | null;
  title: string;
  summary?: string | null;
  text: string;
  url?: string | null;
  topics?: string[] | null;
  organizations?: string[] | null;
  publishedAt?: Date | string | null;
  fetchedAt?: Date | string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SearchDocumentRecord {
  id: string;
  objectType: SearchObjectType;
  objectId: string;
  canonicalKey: string;
  personId: string | null;
  threadId: string | null;
  organizationId: string | null;
  sourceType: string | null;
  title: string;
  summary: string | null;
  text: string;
  url: string | null;
  topics: string[];
  organizations: string[];
  publishedAt: Date | null;
  fetchedAt: Date | null;
  textHash: string;
  embeddingStatus: 'pending' | 'ready' | 'skipped';
  metadata: Record<string, unknown>;
  chunks: ContentChunkRecord[];
}

export interface ContentChunkRecord {
  id: string;
  documentId: string;
  objectType: SearchObjectType;
  objectId: string;
  chunkIndex: number;
  title: string;
  text: string;
  tokenEstimate: number;
  textHash: string;
  metadata: Record<string, unknown>;
}

export interface ChunkTextOptions {
  maxChars?: number;
  overlapChars?: number;
  minChars?: number;
}

const DEFAULT_MAX_CHARS = 1600;
const DEFAULT_OVERLAP_CHARS = 180;
const DEFAULT_MIN_CHARS = 80;
const MAX_STORED_TEXT_CHARS = 30000;

export function buildSearchDocumentRecord(source: SourceSearchDocument, options: ChunkTextOptions = {}): SearchDocumentRecord | null {
  const objectId = source.objectId.trim();
  const title = normalizeText(source.title);
  const text = normalizeText(source.text).slice(0, MAX_STORED_TEXT_CHARS);
  if (!objectId || !title || !text) return null;

  const canonicalKey = `${source.objectType}:${objectId}`;
  const id = stableId('search-document', canonicalKey);
  const summary = normalizeOptionalText(source.summary) || firstText(text, 240);
  const topics = uniqueStrings(source.topics || []);
  const organizations = uniqueStrings(source.organizations || []);
  const metadata = compactMetadata({
    ...(source.metadata || {}),
    canonicalKey,
    sourceObjectType: source.objectType,
    sourceObjectId: objectId,
  });

  const chunks = chunkText(text, options).map((chunk, index) => ({
    id: stableId('content-chunk', `${canonicalKey}:${index}`),
    documentId: id,
    objectType: source.objectType,
    objectId,
    chunkIndex: index,
    title,
    text: chunk,
    tokenEstimate: estimateTokenCount(chunk),
    textHash: sha256(chunk),
    metadata: {
      canonicalKey,
      chunkIndex: index,
      sourceObjectType: source.objectType,
      sourceObjectId: objectId,
    },
  }));

  return {
    id,
    objectType: source.objectType,
    objectId,
    canonicalKey,
    personId: source.personId || null,
    threadId: source.threadId || null,
    organizationId: source.organizationId || null,
    sourceType: source.sourceType || null,
    title,
    summary,
    text,
    url: normalizeOptionalText(source.url),
    topics,
    organizations,
    publishedAt: toDate(source.publishedAt),
    fetchedAt: toDate(source.fetchedAt),
    textHash: sha256([title, summary, text].filter(Boolean).join('\n\n')),
    embeddingStatus: chunks.length > 0 ? 'pending' : 'skipped',
    metadata,
    chunks,
  };
}

export function chunkText(value: string, options: ChunkTextOptions = {}): string[] {
  const text = normalizeText(value);
  if (!text) return [];

  const maxChars = Math.max(200, options.maxChars ?? DEFAULT_MAX_CHARS);
  const overlapChars = Math.min(Math.max(0, options.overlapChars ?? DEFAULT_OVERLAP_CHARS), maxChars - 1);
  const minChars = Math.max(1, options.minChars ?? DEFAULT_MIN_CHARS);

  if (text.length <= maxChars) return text.length >= minChars ? [text] : [];

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const hardEnd = Math.min(text.length, start + maxChars);
    const end = chooseChunkEnd(text, start, hardEnd);
    const chunk = text.slice(start, end).trim();
    if (chunk.length >= minChars) chunks.push(chunk);
    if (end >= text.length) break;
    start = Math.max(start + 1, end - overlapChars);
  }
  return chunks;
}

export function estimateTokenCount(text: string): number {
  const normalized = normalizeText(text);
  if (!normalized) return 0;
  const asciiWords = normalized.match(/[A-Za-z0-9_'-]+/g)?.length || 0;
  const nonAsciiChars = normalized.replace(/[A-Za-z0-9_'\-\s.,;:!?()[\]{}"“”‘’/\\|@#$%^&*+=<>~`]/g, '').length;
  return Math.max(1, Math.ceil(asciiWords * 1.25 + nonAsciiChars * 0.9));
}

export function stableId(prefix: string, value: string): string {
  return `${prefix}:${sha256(value).slice(0, 32)}`;
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function firstText(value: string, length: number): string {
  const text = normalizeText(value);
  if (text.length <= length) return text;
  return `${text.slice(0, Math.max(0, length - 1)).trimEnd()}...`;
}

export function normalizeText(value: string | null | undefined): string {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/[\u200B-\u200D\uFE0E\uFE0F]/g, '')
    .replace(/[\uD800-\uDFFF]/g, '')
    .replace(/\\x/gi, '\\ x')
    .replace(/\\/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeOptionalText(value: string | null | undefined): string | null {
  const text = normalizeText(value);
  return text || null;
}

export function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const text = normalizeText(value);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
}

function chooseChunkEnd(text: string, start: number, hardEnd: number): number {
  if (hardEnd >= text.length) return text.length;
  const slice = text.slice(start, hardEnd);
  const sentenceBreak = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('? '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('。'),
    slice.lastIndexOf('？'),
    slice.lastIndexOf('！'),
  );
  if (sentenceBreak > slice.length * 0.55) return start + sentenceBreak + 1;

  const paragraphBreak = slice.lastIndexOf('\n');
  if (paragraphBreak > slice.length * 0.55) return start + paragraphBreak + 1;

  const whitespace = slice.lastIndexOf(' ');
  if (whitespace > slice.length * 0.7) return start + whitespace;

  return hardEnd;
}

function compactMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) continue;
    result[key] = value;
  }
  return result;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
