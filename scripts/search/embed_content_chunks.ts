import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });
loadEnv({ path: '.env.local' });

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db/prisma';
import {
  createTextEmbeddings,
  defaultEmbeddingDimensions,
  defaultEmbeddingModel,
  defaultEmbeddingProvider,
  type EmbeddingProvider,
  formatSafeEmbeddingError,
  resolveEmbeddingConfig,
  toPgVectorLiteral,
} from '../../lib/search/embedding';

interface Options {
  execute: boolean;
  all: boolean;
  limit: number;
  batchSize: number;
  provider: EmbeddingProvider;
  model: string;
  dimensions: number;
}

interface Summary {
  dryRun: boolean;
  provider: EmbeddingProvider;
  model: string;
  dimensions: number;
  scanned: number;
  embedded: number;
  skipped: number;
  sample: Array<{ id: string; title: string; tokenEstimate: number }>;
}

interface ChunkEmbeddingWrite {
  chunkId: string;
  documentId: string;
  embedding: number[];
}

async function main() {
  const options = parseOptions();
  const chunks = await loadPendingChunks(options);

  const summary: Summary = {
    dryRun: !options.execute,
    provider: options.provider,
    model: options.model,
    dimensions: options.dimensions,
    scanned: chunks.length,
    embedded: 0,
    skipped: 0,
    sample: chunks.slice(0, 5).map(chunk => ({
      id: chunk.id,
      title: chunk.title,
      tokenEstimate: chunk.tokenEstimate,
    })),
  };

  if (!options.execute) {
    console.log(JSON.stringify(summary, null, 2));
    console.log('Dry run only. Re-run with --execute to call embeddings API and write ContentChunk.embedding.');
    await prisma.$disconnect();
    return;
  }

  const embeddingConfig = resolveEmbeddingConfig({
    provider: options.provider,
    model: options.model,
    dimensions: options.dimensions,
  });
  if (!embeddingConfig.apiKey) {
    throw new Error('SEARCH_EMBEDDING_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY is required when --execute is used.');
  }

  for (let index = 0; index < chunks.length; index += options.batchSize) {
    const batch = chunks.slice(index, index + options.batchSize);
    const input = batch.map(chunk => `${chunk.title}\n\n${chunk.text}`.slice(0, 8000));
    const embeddings = await createTextEmbeddings(input, {
      provider: options.provider,
      model: options.model,
      dimensions: options.dimensions,
    });
    const writes: ChunkEmbeddingWrite[] = [];
    const embeddedDocumentIds = new Set<string>();
    for (let i = 0; i < batch.length; i += 1) {
      const embedding = embeddings[i];
      if (!embedding || embedding.length !== options.dimensions) {
        summary.skipped += 1;
        continue;
      }
      writes.push({
        chunkId: batch[i].id,
        documentId: batch[i].documentId,
        embedding,
      });
      embeddedDocumentIds.add(batch[i].documentId);
      summary.embedded += 1;
    }
    await writeChunkEmbeddings(writes, options.model);
    await refreshDocumentEmbeddingStatus([...embeddedDocumentIds]);
  }

  await refreshAllDocumentEmbeddingStatuses();

  console.log(JSON.stringify(summary, null, 2));
  await prisma.$disconnect();
}

async function loadPendingChunks(options: Options) {
  try {
    return await prisma.contentChunk.findMany({
      where: options.all ? {} : { embeddingModel: null },
      select: {
        id: true,
        documentId: true,
        title: true,
        text: true,
        tokenEstimate: true,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: options.limit,
    });
  } catch (error) {
    if (isMissingSearchIndexError(error)) return [];
    throw error;
  }
}

async function writeChunkEmbeddings(writes: ChunkEmbeddingWrite[], model: string) {
  if (writes.length === 0) return;
  const values = Prisma.join(writes.map(write => Prisma.sql`(${write.chunkId}, ${toPgVectorLiteral(write.embedding)})`));
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "ContentChunk" AS c
    SET
      "embedding" = v.embedding::vector,
      "embeddingModel" = ${model},
      "embeddingUpdatedAt" = now(),
      "updatedAt" = now()
    FROM (VALUES ${values}) AS v(id, embedding)
    WHERE c.id = v.id
  `);
}

async function refreshDocumentEmbeddingStatus(documentIds: string[]) {
  if (documentIds.length === 0) return;
  await prisma.$executeRaw`
    UPDATE "SearchDocument" d
    SET
      "embeddingStatus" = CASE
        WHEN NOT EXISTS (
          SELECT 1 FROM "ContentChunk" c WHERE c."documentId" = d.id
        ) THEN 'skipped'
        WHEN EXISTS (
          SELECT 1
          FROM "ContentChunk" c
          WHERE c."documentId" = d.id
            AND c."embeddingModel" IS NULL
        ) THEN 'pending'
        ELSE 'ready'
      END,
      "updatedAt" = now()
    WHERE d.id IN (${Prisma.join(documentIds)})
  `;
}

async function refreshAllDocumentEmbeddingStatuses() {
  await prisma.$executeRaw`
    UPDATE "SearchDocument" d
    SET
      "embeddingStatus" = CASE
        WHEN NOT EXISTS (
          SELECT 1 FROM "ContentChunk" c WHERE c."documentId" = d.id
        ) THEN 'skipped'
        WHEN EXISTS (
          SELECT 1
          FROM "ContentChunk" c
          WHERE c."documentId" = d.id
            AND c."embeddingModel" IS NULL
        ) THEN 'pending'
        ELSE 'ready'
      END,
      "updatedAt" = now()
  `;
}

function parseOptions(): Options {
  const args = process.argv.slice(2);
  const valueOf = (flag: string) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };
  return {
    execute: args.includes('--execute'),
    all: args.includes('--all'),
    limit: readBoundedInt(valueOf('--limit'), 1, 50000, 500),
    batchSize: readBoundedInt(valueOf('--batch-size'), 1, 128, 64),
    provider: readProvider(valueOf('--provider')),
    model: valueOf('--model') || defaultEmbeddingModel(readProvider(valueOf('--provider'))),
    dimensions: readBoundedInt(valueOf('--dimensions') || process.env.SEARCH_EMBEDDING_DIMENSIONS, 1, 3072, defaultEmbeddingDimensions()),
  };
}

function readProvider(value: string | undefined): EmbeddingProvider {
  return value === 'openai' || value === 'gemini' ? value : defaultEmbeddingProvider();
}

function readBoundedInt(value: string | undefined, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function isMissingSearchIndexError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return code === 'P2021'
    || message.includes('ContentChunk')
    || message.includes('relation "ContentChunk" does not exist');
}

main().catch(async error => {
  console.error('Content chunk embedding failed:', formatSafeEmbeddingError(error));
  await prisma.$disconnect();
  process.exit(1);
});
