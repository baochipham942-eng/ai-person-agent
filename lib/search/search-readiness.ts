import { prisma } from '@/lib/db/prisma';
import { resolveEmbeddingConfig } from '@/lib/search/embedding';
import { searchContentIndex } from '@/lib/search/content-search';

export interface CountRow {
  key: string;
  count: number;
}

export interface SearchIndexReadiness {
  status: 'ready' | 'degraded' | 'blocked';
  keywordReady: boolean;
  semanticReady: boolean;
  migrationApplied: boolean;
  extensions: {
    vector: boolean;
    pgTrgm: boolean;
  };
  counts: {
    documents: number;
    chunks: number;
    embeddedChunks: number;
    pendingChunks: number;
    byObjectType: CountRow[];
    byEmbeddingStatus: CountRow[];
  };
  embedding: {
    configured: boolean;
    provider: string;
    model: string;
    dimensions: number;
  };
  keywordSmoke: {
    query: string;
    hits: number;
    firstTitle: string | null;
  };
  issues: string[];
}

export async function getSearchIndexReadiness(sampleQuery = 'agent'): Promise<SearchIndexReadiness> {
  const [documents, chunks, embeddedChunks, byObjectType, byEmbeddingStatus, migrationApplied, extensions, keywordHits] = await Promise.all([
    prisma.searchDocument.count(),
    prisma.contentChunk.count(),
    countEmbeddedChunks(),
    countByObjectType(),
    countByEmbeddingStatus(),
    hasSearchIndexMigration(),
    readExtensions(),
    searchContentIndex({ query: sampleQuery, mode: 'keyword', limit: 1, includeChunks: false }),
  ]);
  const pendingChunks = Math.max(0, chunks - embeddedChunks);
  const embeddingConfig = resolveEmbeddingConfig();
  const keywordReady = migrationApplied
    && extensions.vector
    && extensions.pgTrgm
    && documents > 0
    && chunks > 0
    && keywordHits.length > 0;
  const semanticReady = keywordReady && chunks > 0 && embeddedChunks === chunks;
  const issues = buildIssues({
    migrationApplied,
    extensions,
    documents,
    chunks,
    keywordHits: keywordHits.length,
    embeddedChunks,
    embeddingConfigured: Boolean(embeddingConfig.apiKey),
  });

  return {
    status: !keywordReady ? 'blocked' : semanticReady ? 'ready' : 'degraded',
    keywordReady,
    semanticReady,
    migrationApplied,
    extensions,
    counts: {
      documents,
      chunks,
      embeddedChunks,
      pendingChunks,
      byObjectType,
      byEmbeddingStatus,
    },
    embedding: {
      configured: Boolean(embeddingConfig.apiKey),
      provider: embeddingConfig.provider || 'openai',
      model: embeddingConfig.model,
      dimensions: embeddingConfig.dimensions,
    },
    keywordSmoke: {
      query: sampleQuery,
      hits: keywordHits.length,
      firstTitle: keywordHits[0]?.title || null,
    },
    issues,
  };
}

async function countByObjectType(): Promise<CountRow[]> {
  const rows = await prisma.$queryRaw<Array<{ key: string; count: bigint | number }>>`
    SELECT "objectType"::text AS key, count(*) AS count
    FROM "SearchDocument"
    GROUP BY 1
    ORDER BY 1
  `;
  return rows.map(row => ({ key: row.key, count: Number(row.count) }));
}

async function countByEmbeddingStatus(): Promise<CountRow[]> {
  const rows = await prisma.$queryRaw<Array<{ key: string; count: bigint | number }>>`
    SELECT "embeddingStatus"::text AS key, count(*) AS count
    FROM "SearchDocument"
    GROUP BY 1
    ORDER BY 1
  `;
  return rows.map(row => ({ key: row.key, count: Number(row.count) }));
}

async function countEmbeddedChunks(): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
    SELECT count(*) AS count
    FROM "ContentChunk"
    WHERE "embedding" IS NOT NULL
  `;
  return Number(rows[0]?.count || 0);
}

async function hasSearchIndexMigration(): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM "_prisma_migrations"
      WHERE migration_name = '20260620120000_search_index_foundation'
        AND finished_at IS NOT NULL
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function readExtensions() {
  const rows = await prisma.$queryRaw<Array<{ extname: string }>>`
    SELECT extname::text AS extname
    FROM pg_extension
    WHERE extname IN ('vector', 'pg_trgm')
  `;
  const names = new Set(rows.map(row => row.extname));
  return {
    vector: names.has('vector'),
    pgTrgm: names.has('pg_trgm'),
  };
}

function buildIssues(params: {
  migrationApplied: boolean;
  extensions: { vector: boolean; pgTrgm: boolean };
  documents: number;
  chunks: number;
  keywordHits: number;
  embeddedChunks: number;
  embeddingConfigured: boolean;
}): string[] {
  const issues: string[] = [];
  if (!params.migrationApplied) issues.push('search index migration is not applied');
  if (!params.extensions.vector) issues.push('pgvector extension is missing');
  if (!params.extensions.pgTrgm) issues.push('pg_trgm extension is missing');
  if (params.documents === 0) issues.push('SearchDocument is empty');
  if (params.chunks === 0) issues.push('ContentChunk is empty');
  if (params.keywordHits === 0) issues.push('keyword search smoke returned no hits');
  if (!params.embeddingConfigured) issues.push('embedding API key is not configured');
  if (params.embeddedChunks === 0) issues.push('no ContentChunk embeddings have been written');
  if (params.embeddedChunks > 0 && params.embeddedChunks < params.chunks) issues.push('ContentChunk embeddings are only partially written');
  return issues;
}
