import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  buildSearchDocumentRecord,
  chunkText,
  estimateTokenCount,
  normalizeText,
  stableId,
} from '../../lib/search/search-index';
import {
  defaultEmbeddingModel,
  formatSafeEmbeddingError,
  redactSecretText,
  resolveEmbeddingConfig,
  toPgVectorLiteral,
} from '../../lib/search/embedding';

test('buildSearchDocumentRecord creates deterministic searchable chunks', () => {
  const longText = [
    'Agent memory systems need durable source binding and explicit refresh cadence.',
    'Semantic search helps retrieve related evidence without replacing the relational source of truth.',
    'The retrieval layer should preserve person, thread, source type, and topic filters.',
  ].join(' '.repeat(10)).repeat(12);

  const doc = buildSearchDocumentRecord({
    objectType: 'raw_pool_item',
    objectId: 'raw-1',
    personId: 'person-1',
    sourceType: 'official',
    title: 'Agent Memory Architecture',
    summary: null,
    text: longText,
    url: 'https://example.com/memory',
    topics: ['Agent Memory', 'RAG', 'Agent Memory'],
    organizations: ['OpenAI', 'openai'],
    publishedAt: '2026-06-20T00:00:00.000Z',
    metadata: { sourceTable: 'RawPoolItem' },
  }, { maxChars: 420, overlapChars: 60 });

  assert.ok(doc, 'document should be materializable');
  assert.equal(doc.id, stableId('search-document', 'raw_pool_item:raw-1'));
  assert.equal(doc.canonicalKey, 'raw_pool_item:raw-1');
  assert.equal(doc.topics.join(','), 'Agent Memory,RAG');
  assert.equal(doc.organizations.join(','), 'OpenAI');
  assert.ok(doc.chunks.length > 1, 'long text should be chunked');
  assert.equal(doc.chunks[0].id, stableId('content-chunk', 'raw_pool_item:raw-1:0'));
  assert.ok(doc.chunks.every(chunk => chunk.documentId === doc.id));
  assert.ok(doc.chunks.every(chunk => chunk.tokenEstimate > 0));
  assert.equal(doc.embeddingStatus, 'pending');
});

test('chunkText keeps overlap bounded and skips tiny empty chunks', () => {
  const chunks = chunkText('alpha beta gamma delta epsilon zeta eta theta iota kappa lambda '.repeat(30), {
    maxChars: 220,
    overlapChars: 40,
    minChars: 5,
  });

  assert.ok(chunks.length >= 2);
  assert.ok(chunks.every(chunk => chunk.length >= 5));
  assert.ok(estimateTokenCount(chunks.join(' ')) > 0);
});

test('normalizeText removes bad Postgres escape/control characters from source text', () => {
  const normalized = normalizeText('alpha\\x beta\u0000 gamma\u0007 delta\\x41 🐁\uFE0F');
  assert.equal(normalized, 'alpha x beta gamma delta x41');
});

test('embedding helpers validate vector shape and redact credentials', () => {
  assert.equal(redactSecretText('bad sk-abc123XYZ token'), 'bad [redacted-api-key] token');
  assert.equal(redactSecretText('bad AIzaSyExampleKey token'), 'bad [redacted-google-api-key] token');
  assert.equal(toPgVectorLiteral([0.1, -0.2], 2), '[0.10000000,-0.20000000]');
  assert.throws(() => toPgVectorLiteral([0.1], 2), /Expected 2-dimensional embedding/);
  assert.equal(defaultEmbeddingModel('gemini'), 'gemini-embedding-2');
  assert.equal(resolveEmbeddingConfig({ provider: 'gemini', apiKey: 'k' }).provider, 'gemini');

  const safeError = formatSafeEmbeddingError({
    message: 'Incorrect API key provided: sk-secret123',
    status: 401,
    code: 'invalid_api_key',
    requestID: 'req_test',
  });
  assert.deepEqual(safeError, {
    message: 'Incorrect API key provided: [redacted-api-key]',
    status: 401,
    code: 'invalid_api_key',
    type: undefined,
    requestId: 'req_test',
  });
});

test('search index migration carries relational, FTS, trigram, and vector indexes', async () => {
  const migration = await readFile('prisma/migrations/20260620120000_search_index_foundation/migration.sql', 'utf8');
  const schema = await readFile('prisma/schema.prisma', 'utf8');
  const materializer = await readFile('scripts/search/materialize_search_index.ts', 'utf8');
  const embedder = await readFile('scripts/search/embed_content_chunks.ts', 'utf8');
  const statusScript = await readFile('scripts/search/check_search_readiness.ts', 'utf8');
  const service = await readFile('lib/search/content-search.ts', 'utf8');
  const readiness = await readFile('lib/search/search-readiness.ts', 'utf8');
  const route = await readFile('app/api/content-search/route.ts', 'utf8');
  const statusRoute = await readFile('app/api/content-search/status/route.ts', 'utf8');
  const contentSearchPage = await readFile('app/content-search/page.tsx', 'utf8');
  const contentSearchPanel = await readFile('components/search/ContentSearchPanel.tsx', 'utf8');
  const siteHeader = await readFile('components/common/SiteHeader.tsx', 'utf8');
  const packageJson = await readFile('package.json', 'utf8');

  assert.match(schema, /model SearchDocument/);
  assert.match(schema, /model ContentChunk/);
  assert.match(schema, /Unsupported\("vector\(512\)"\)/);
  assert.match(migration, /"embedding" vector\(512\)/);
  assert.match(migration, /CREATE EXTENSION IF NOT EXISTS pg_trgm/);
  assert.match(migration, /CREATE EXTENSION IF NOT EXISTS vector/);
  assert.match(migration, /USING GIN \("searchVector"\)/);
  assert.match(migration, /USING hnsw \("embedding" vector_cosine_ops\)/);
  assert.match(migration, /RawPoolItem_personId_sourceType_publishedAt_idx/);
  assert.match(migration, /KnowledgeThreadSource_threadId_relevanceScore_createdAt_idx/);
  assert.match(migration, /PersonRelation_personId_reviewStatus_confidence_idx/);
  assert.match(materializer, /buildSearchDocumentRecord/);
  assert.match(materializer, /replaceSources/);
  assert.match(materializer, /objectType: \{ in: options\.sources \}/);
  assert.match(materializer, /searchDocument\.upsert/);
  assert.match(materializer, /contentChunk\.createMany/);
  assert.match(embedder, /createTextEmbeddings/);
  assert.match(embedder, /--provider/);
  assert.match(embedder, /writeChunkEmbeddings/);
  assert.match(embedder, /v\.embedding::vector/);
  assert.match(embedder, /refreshDocumentEmbeddingStatus/);
  assert.match(embedder, /"embeddingStatus" = CASE/);
  assert.match(embedder, /formatSafeEmbeddingError/);
  assert.match(statusScript, /runVectorSmoke/);
  assert.match(statusScript, /--require-semantic/);
  assert.match(statusScript, /--check-provider/);
  assert.match(service, /websearch_to_tsquery\('simple'/);
  assert.match(service, /d\."topics" && ARRAY/);
  assert.match(service, /searchSimilarChunks/);
  assert.match(service, /<=> \$\{vector\}::vector/);
  assert.match(service, /searchSemanticDocuments/);
  assert.match(service, /mergeDocumentRows/);
  assert.match(route, /readSearchMode/);
  assert.match(route, /createQueryEmbedding/);
  assert.match(route, /semanticStatus/);
  assert.match(route, /: 'hybrid'/);
  assert.match(contentSearchPage, /ContentSearchPanel/);
  assert.match(contentSearchPanel, /mode !== 'hybrid'/);
  assert.match(contentSearchPanel, /\/api\/content-search/);
  assert.match(siteHeader, /contentSearch/);
  assert.match(siteHeader, /\/content-search/);
  assert.match(readiness, /getSearchIndexReadiness/);
  assert.match(readiness, /provider: embeddingConfig\.provider/);
  assert.match(readiness, /"embedding" IS NOT NULL/);
  assert.match(readiness, /semanticReady/);
  assert.match(readiness, /no ContentChunk embeddings have been written/);
  assert.match(statusRoute, /getSearchIndexReadiness/);
  assert.match(packageJson, /"search:status"/);
});
