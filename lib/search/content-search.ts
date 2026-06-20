import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { toPgVectorLiteral } from '@/lib/search/embedding';
import type { SearchObjectType } from '@/lib/search/search-index';

export type SearchContentMode = 'keyword' | 'hybrid' | 'semantic';

export interface SearchContentParams {
  query: string;
  mode?: SearchContentMode;
  queryEmbedding?: number[] | null;
  objectTypes?: SearchObjectType[];
  personId?: string | null;
  threadId?: string | null;
  organizationId?: string | null;
  sourceType?: string | null;
  topics?: string[];
  limit?: number;
  includeChunks?: boolean;
  semanticWeight?: number;
}

export interface SearchContentResult {
  id: string;
  objectType: string;
  objectId: string;
  personId: string | null;
  threadId: string | null;
  organizationId: string | null;
  sourceType: string | null;
  title: string;
  summary: string | null;
  snippet: string;
  url: string | null;
  topics: string[];
  organizations: string[];
  publishedAt: string | null;
  fetchedAt: string | null;
  score: number;
  keywordScore: number;
  semanticScore: number;
  textRank: number;
  titleBoost: number;
  chunks: SearchContentChunkResult[];
}

export interface SearchContentChunkResult {
  id: string;
  documentId: string;
  chunkIndex: number;
  title: string;
  snippet: string;
  score: number;
  textRank: number;
}

export interface SearchSimilarChunkParams {
  embedding: number[];
  objectTypes?: SearchObjectType[];
  personId?: string | null;
  threadId?: string | null;
  organizationId?: string | null;
  sourceType?: string | null;
  topics?: string[];
  limit?: number;
}

export interface SearchSimilarChunkResult extends SearchContentChunkResult {
  objectType: string;
  objectId: string;
  personId: string | null;
  threadId: string | null;
  organizationId: string | null;
  sourceType: string | null;
  url: string | null;
  topics: string[];
  organizations: string[];
  similarity: number;
}

interface SearchDocumentRow {
  id: string;
  objectType: string;
  objectId: string;
  personId: string | null;
  threadId: string | null;
  organizationId: string | null;
  sourceType: string | null;
  title: string;
  summary: string | null;
  snippet: string;
  url: string | null;
  topics: string[];
  organizations: string[];
  publishedAt: Date | null;
  fetchedAt: Date | null;
  score: number;
  keywordScore: number;
  textRank: number;
  titleBoost: number;
  semanticScore: number;
}

interface SearchChunkRow {
  id: string;
  documentId: string;
  chunkIndex: number;
  title: string;
  snippet: string;
  score: number;
  textRank: number;
}

interface SimilarChunkRow extends SearchChunkRow {
  objectType: string;
  objectId: string;
  personId: string | null;
  threadId: string | null;
  organizationId: string | null;
  sourceType: string | null;
  url: string | null;
  topics: string[];
  organizations: string[];
  similarity: number;
}

type SearchDocumentFilterParams = Pick<SearchContentParams,
  'objectTypes' | 'personId' | 'threadId' | 'organizationId' | 'sourceType' | 'topics'
>;

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

export async function searchContentIndex(params: SearchContentParams): Promise<SearchContentResult[]> {
  const query = params.query.trim();
  const limit = clampInteger(params.limit, 1, MAX_LIMIT, DEFAULT_LIMIT);
  if (!query && !hasStructuredFilter(params)) return [];
  const mode = params.mode || 'keyword';
  const hasSemantic = mode !== 'keyword' && Boolean(params.queryEmbedding?.length);

  try {
    const keywordDocuments = mode === 'semantic'
      ? []
      : await searchDocuments(params, query, hasSemantic ? Math.min(MAX_LIMIT, limit * 2) : limit);
    const semanticDocuments = hasSemantic
      ? await searchSemanticDocuments(params, params.queryEmbedding!, Math.min(MAX_LIMIT, limit * 2))
      : [];
    const documents = mergeDocumentRows(keywordDocuments, semanticDocuments, limit, params.semanticWeight);
    if (documents.length === 0) return [];

    const chunkMap = params.includeChunks === false
      ? new Map<string, SearchContentChunkResult[]>()
      : await searchChunksForResults(documents.map(row => row.id), query, hasSemantic ? params.queryEmbedding! : null, params);

    return documents.map(row => ({
      id: row.id,
      objectType: row.objectType,
      objectId: row.objectId,
      personId: row.personId,
      threadId: row.threadId,
      organizationId: row.organizationId,
      sourceType: row.sourceType,
      title: row.title,
      summary: row.summary,
      snippet: row.snippet,
      url: row.url,
      topics: row.topics,
      organizations: row.organizations,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      fetchedAt: row.fetchedAt ? row.fetchedAt.toISOString() : null,
      score: Number(row.score || 0),
      keywordScore: Number(row.keywordScore || 0),
      semanticScore: Number(row.semanticScore || 0),
      textRank: Number(row.textRank || 0),
      titleBoost: Number(row.titleBoost || 0),
      chunks: chunkMap.get(row.id) || [],
    }));
  } catch (error) {
    if (isMissingSearchIndexError(error)) return [];
    throw error;
  }
}

export async function searchSimilarChunks(params: SearchSimilarChunkParams): Promise<SearchSimilarChunkResult[]> {
  const limit = clampInteger(params.limit, 1, MAX_LIMIT, DEFAULT_LIMIT);
  const vector = toPgVectorLiteral(params.embedding);
  const filters = buildDocumentFilters(params);
  filters.push(Prisma.sql`c."embedding" IS NOT NULL`);
  const where = Prisma.join(filters, ' AND ');

  try {
    const rows = await prisma.$queryRaw<SimilarChunkRow[]>(Prisma.sql`
      SELECT
        c.id,
        c."documentId",
        c."chunkIndex",
        c.title,
        substring(c.text from 1 for 520) AS snippet,
        0::float AS score,
        0::float AS "textRank",
        d."objectType",
        d."objectId",
        d."personId",
        d."threadId",
        d."organizationId",
        d."sourceType",
        d.url,
        d.topics,
        d.organizations,
        (1 - (c."embedding" <=> ${vector}::vector))::float AS similarity
      FROM "ContentChunk" c
      JOIN "SearchDocument" d ON d.id = c."documentId"
      WHERE ${where}
      ORDER BY c."embedding" <=> ${vector}::vector, c."documentId", c."chunkIndex"
      LIMIT ${limit}
    `);

    return rows.map(row => ({
      id: row.id,
      documentId: row.documentId,
      chunkIndex: row.chunkIndex,
      title: row.title,
      snippet: row.snippet,
      score: Number(row.similarity || 0),
      textRank: 0,
      objectType: row.objectType,
      objectId: row.objectId,
      personId: row.personId,
      threadId: row.threadId,
      organizationId: row.organizationId,
      sourceType: row.sourceType,
      url: row.url,
      topics: row.topics,
      organizations: row.organizations,
      similarity: Number(row.similarity || 0),
    }));
  } catch (error) {
    if (isMissingSearchIndexError(error)) return [];
    throw error;
  }
}

async function searchDocuments(params: SearchContentParams, query: string, limit: number): Promise<SearchDocumentRow[]> {
  const likeQuery = `%${query}%`;
  const filters = buildDocumentFilters(params);
  const queryFilter = query
    ? Prisma.sql`(
        d."searchVector" @@ websearch_to_tsquery('simple', ${query})
        OR d."title" ILIKE ${likeQuery}
        OR d."summary" ILIKE ${likeQuery}
      )`
    : Prisma.sql`TRUE`;
  filters.push(queryFilter);

  const where = Prisma.join(filters, ' AND ');
  return prisma.$queryRaw<SearchDocumentRow[]>(Prisma.sql`
    WITH q AS (
      SELECT websearch_to_tsquery('simple', ${query}) AS tsq
    )
    SELECT
      d.id,
      d."objectType",
      d."objectId",
      d."personId",
      d."threadId",
      d."organizationId",
      d."sourceType",
      d.title,
      d.summary,
      substring(d.text from 1 for 520) AS snippet,
      d.url,
      d.topics,
      d.organizations,
      d."publishedAt",
      d."fetchedAt",
      (
        ts_rank_cd(d."searchVector", q.tsq)
        + CASE WHEN d.title ILIKE ${likeQuery} THEN 0.45 ELSE 0 END
        + CASE WHEN d.summary ILIKE ${likeQuery} THEN 0.2 ELSE 0 END
      )::float AS score,
      (
        ts_rank_cd(d."searchVector", q.tsq)
        + CASE WHEN d.title ILIKE ${likeQuery} THEN 0.45 ELSE 0 END
        + CASE WHEN d.summary ILIKE ${likeQuery} THEN 0.2 ELSE 0 END
      )::float AS "keywordScore",
      ts_rank_cd(d."searchVector", q.tsq)::float AS "textRank",
      (
        CASE WHEN d.title ILIKE ${likeQuery} THEN 0.45 ELSE 0 END
        + CASE WHEN d.summary ILIKE ${likeQuery} THEN 0.2 ELSE 0 END
      )::float AS "titleBoost",
      0::float AS "semanticScore"
    FROM "SearchDocument" d, q
    WHERE ${where}
    ORDER BY score DESC, d."publishedAt" DESC NULLS LAST, d."fetchedAt" DESC NULLS LAST, d.id ASC
    LIMIT ${limit}
  `);
}

async function searchSemanticDocuments(params: SearchContentParams, embedding: number[], limit: number): Promise<SearchDocumentRow[]> {
  const vector = toPgVectorLiteral(embedding);
  const filters = buildDocumentFilters(params);
  filters.push(Prisma.sql`c."embedding" IS NOT NULL`);
  const where = Prisma.join(filters, ' AND ');

  return prisma.$queryRaw<SearchDocumentRow[]>(Prisma.sql`
    WITH ranked_chunks AS (
      SELECT
        c.id AS "chunkId",
        c."documentId",
        substring(c.text from 1 for 520) AS "chunkSnippet",
        (1 - (c."embedding" <=> ${vector}::vector))::float AS similarity,
        ROW_NUMBER() OVER (
          PARTITION BY c."documentId"
          ORDER BY c."embedding" <=> ${vector}::vector, c."chunkIndex" ASC
        ) AS rank
      FROM "ContentChunk" c
      JOIN "SearchDocument" d ON d.id = c."documentId"
      WHERE ${where}
    )
    SELECT
      d.id,
      d."objectType",
      d."objectId",
      d."personId",
      d."threadId",
      d."organizationId",
      d."sourceType",
      d.title,
      d.summary,
      ranked_chunks."chunkSnippet" AS snippet,
      d.url,
      d.topics,
      d.organizations,
      d."publishedAt",
      d."fetchedAt",
      ranked_chunks.similarity::float AS score,
      0::float AS "keywordScore",
      0::float AS "textRank",
      0::float AS "titleBoost",
      ranked_chunks.similarity::float AS "semanticScore"
    FROM ranked_chunks
    JOIN "SearchDocument" d ON d.id = ranked_chunks."documentId"
    WHERE ranked_chunks.rank = 1
    ORDER BY ranked_chunks.similarity DESC, d."publishedAt" DESC NULLS LAST, d."fetchedAt" DESC NULLS LAST, d.id ASC
    LIMIT ${limit}
  `);
}

async function searchChunksForResults(
  documentIds: string[],
  query: string,
  embedding: number[] | null,
  params: SearchContentParams,
): Promise<Map<string, SearchContentChunkResult[]>> {
  const keywordChunks = await searchChunksForDocuments(documentIds, query);
  if (!embedding) return keywordChunks;

  const semanticChunks = await searchSimilarChunks({
    ...params,
    embedding,
    limit: Math.min(MAX_LIMIT, documentIds.length * 3),
  });
  for (const chunk of semanticChunks) {
    if (!documentIds.includes(chunk.documentId)) continue;
    const chunks = keywordChunks.get(chunk.documentId) || [];
    if (!chunks.some(existing => existing.id === chunk.id)) {
      chunks.push(chunk);
      chunks.sort((left, right) => right.score - left.score || left.chunkIndex - right.chunkIndex);
      keywordChunks.set(chunk.documentId, chunks.slice(0, 3));
    }
  }
  return keywordChunks;
}

async function searchChunksForDocuments(documentIds: string[], query: string): Promise<Map<string, SearchContentChunkResult[]>> {
  if (documentIds.length === 0 || !query.trim()) return new Map();
  const rows = await prisma.$queryRaw<SearchChunkRow[]>(Prisma.sql`
    WITH q AS (
      SELECT websearch_to_tsquery('simple', ${query}) AS tsq
    ),
    ranked AS (
      SELECT
        c.id,
        c."documentId",
        c."chunkIndex",
        c.title,
        substring(c.text from 1 for 520) AS snippet,
        ts_rank_cd(c."searchVector", q.tsq)::float AS "textRank",
        ts_rank_cd(c."searchVector", q.tsq)::float AS score,
        ROW_NUMBER() OVER (
          PARTITION BY c."documentId"
          ORDER BY ts_rank_cd(c."searchVector", q.tsq) DESC, c."chunkIndex" ASC
        ) AS rank
      FROM "ContentChunk" c, q
      WHERE c."documentId" IN (${Prisma.join(documentIds)})
        AND c."searchVector" @@ q.tsq
    )
    SELECT id, "documentId", "chunkIndex", title, snippet, score, "textRank"
    FROM ranked
    WHERE rank <= 3
    ORDER BY "documentId", rank
  `);

  const map = new Map<string, SearchContentChunkResult[]>();
  for (const row of rows) {
    const chunks = map.get(row.documentId) || [];
    chunks.push({
      id: row.id,
      documentId: row.documentId,
      chunkIndex: row.chunkIndex,
      title: row.title,
      snippet: row.snippet,
      score: Number(row.score || 0),
      textRank: Number(row.textRank || 0),
    });
    map.set(row.documentId, chunks);
  }
  return map;
}

function mergeDocumentRows(
  keywordRows: SearchDocumentRow[],
  semanticRows: SearchDocumentRow[],
  limit: number,
  semanticWeight = 0.35,
): SearchDocumentRow[] {
  if (semanticRows.length === 0) return keywordRows.slice(0, limit);
  if (keywordRows.length === 0) return semanticRows.slice(0, limit);

  const keywordMax = Math.max(...keywordRows.map(row => Number(row.keywordScore || row.score || 0)), 0.000001);
  const semanticRatio = clampNumber(semanticWeight, 0, 1, 0.35);
  const rows = new Map<string, SearchDocumentRow>();

  for (const row of keywordRows) {
    const keywordScore = Number(row.keywordScore || row.score || 0);
    rows.set(row.id, {
      ...row,
      keywordScore,
      semanticScore: Number(row.semanticScore || 0),
      score: (keywordScore / keywordMax) * (1 - semanticRatio),
    });
  }

  for (const row of semanticRows) {
    const existing = rows.get(row.id);
    const semanticScore = Number(row.semanticScore || row.score || 0);
    if (!existing) {
      rows.set(row.id, {
        ...row,
        keywordScore: 0,
        semanticScore,
        score: semanticScore * semanticRatio,
      });
      continue;
    }
    rows.set(row.id, {
      ...existing,
      snippet: existing.keywordScore > 0 ? existing.snippet : row.snippet,
      semanticScore: Math.max(existing.semanticScore || 0, semanticScore),
      score: existing.score + semanticScore * semanticRatio,
    });
  }

  return [...rows.values()]
    .sort((left, right) => right.score - left.score
      || Number(right.publishedAt || 0) - Number(left.publishedAt || 0)
      || left.id.localeCompare(right.id))
    .slice(0, limit);
}

function buildDocumentFilters(params: SearchDocumentFilterParams): Prisma.Sql[] {
  const filters: Prisma.Sql[] = [];
  if (params.objectTypes?.length) {
    filters.push(Prisma.sql`d."objectType" IN (${Prisma.join(params.objectTypes)})`);
  }
  if (params.personId) {
    filters.push(Prisma.sql`d."personId" = ${params.personId}`);
  }
  if (params.threadId) {
    filters.push(Prisma.sql`d."threadId" = ${params.threadId}`);
  }
  if (params.organizationId) {
    filters.push(Prisma.sql`d."organizationId" = ${params.organizationId}`);
  }
  if (params.sourceType) {
    filters.push(Prisma.sql`d."sourceType" = ${params.sourceType}`);
  }
  if (params.topics?.length) {
    filters.push(Prisma.sql`d."topics" && ARRAY[${Prisma.join(params.topics)}]::text[]`);
  }
  return filters;
}

function hasStructuredFilter(params: SearchContentParams): boolean {
  return Boolean(
    params.objectTypes?.length
    || params.personId
    || params.threadId
    || params.organizationId
    || params.sourceType
    || params.topics?.length,
  );
}

function clampInteger(value: number | null | undefined, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function clampNumber(value: number | null | undefined, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function isMissingSearchIndexError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return code === 'P2021'
    || message.includes('SearchDocument')
    || message.includes('ContentChunk')
    || message.includes('relation "SearchDocument" does not exist')
    || message.includes('relation "ContentChunk" does not exist');
}
