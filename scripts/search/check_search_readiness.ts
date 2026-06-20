import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });
loadEnv({ path: '.env.local' });

import { prisma } from '../../lib/db/prisma';
import { formatSafeEmbeddingError, createQueryEmbedding, toPgVectorLiteral } from '../../lib/search/embedding';
import { searchContentIndex } from '../../lib/search/content-search';
import { getSearchIndexReadiness } from '../../lib/search/search-readiness';

interface Options {
  sampleQuery: string;
  checkProvider: boolean;
  vectorSmoke: boolean;
  requireSemantic: boolean;
}

interface ProviderSmoke {
  status: 'skipped' | 'ready' | 'failed';
  error?: ReturnType<typeof formatSafeEmbeddingError>;
}

interface VectorSmoke {
  status: 'skipped' | 'ready' | 'failed';
  hits?: number;
  firstTitle?: string | null;
  error?: string;
}

async function main() {
  const options = parseOptions();
  const readiness = await getSearchIndexReadiness(options.sampleQuery);
  const providerSmoke = options.checkProvider
    ? await runProviderSmoke(options.sampleQuery)
    : { status: 'skipped' } satisfies ProviderSmoke;
  const vectorSmoke = options.vectorSmoke
    ? await runVectorSmoke()
    : { status: 'skipped' } satisfies VectorSmoke;

  const summary = {
    ...readiness,
    providerSmoke,
    vectorSmoke,
  };

  console.log(JSON.stringify(summary, null, 2));
  await prisma.$disconnect();

  if (!readiness.keywordReady || vectorSmoke.status === 'failed') {
    process.exit(1);
  }
  if (options.requireSemantic && !readiness.semanticReady) {
    process.exit(1);
  }
  if (options.checkProvider && providerSmoke.status === 'failed') {
    process.exit(1);
  }
}

async function runProviderSmoke(query: string): Promise<ProviderSmoke> {
  try {
    await createQueryEmbedding(query);
    return { status: 'ready' };
  } catch (error) {
    return { status: 'failed', error: formatSafeEmbeddingError(error) };
  }
}

async function runVectorSmoke(): Promise<VectorSmoke> {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const documentId = `search-readiness-smoke-doc-${suffix}`;
  const chunkId = `search-readiness-smoke-chunk-${suffix}`;
  const objectId = `search-readiness-smoke-${suffix}`;
  const canonicalKey = `knowledge_source:${objectId}`;
  const embedding = unitVector(512, 0);

  try {
    await prisma.searchDocument.create({
      data: {
        id: documentId,
        objectType: 'knowledge_source',
        objectId,
        canonicalKey,
        title: 'Search readiness vector smoke',
        summary: 'Temporary row for validating pgvector search.',
        text: 'Temporary row for validating pgvector semantic search. This row is deleted after the smoke test.',
        topics: ['search-readiness'],
        organizations: [],
        textHash: `search-readiness-${suffix}`,
        embeddingStatus: 'ready',
        metadata: { smoke: true },
      },
    });
    await prisma.contentChunk.create({
      data: {
        id: chunkId,
        documentId,
        objectType: 'knowledge_source',
        objectId,
        chunkIndex: 0,
        title: 'Search readiness vector smoke',
        text: 'Temporary vector smoke chunk.',
        tokenEstimate: 5,
        textHash: `search-readiness-chunk-${suffix}`,
        embeddingModel: 'readiness-smoke',
        embeddingUpdatedAt: new Date(),
        metadata: { smoke: true },
      },
    });
    await prisma.$executeRaw`
      UPDATE "ContentChunk"
      SET "embedding" = ${toPgVectorLiteral(embedding)}::vector
      WHERE id = ${chunkId}
    `;

    const hits = await searchContentIndex({
      query: 'vector smoke',
      mode: 'semantic',
      queryEmbedding: embedding,
      objectTypes: ['knowledge_source'],
      topics: ['search-readiness'],
      limit: 1,
      includeChunks: true,
    });
    return {
      status: hits[0]?.id === documentId ? 'ready' : 'failed',
      hits: hits.length,
      firstTitle: hits[0]?.title || null,
      error: hits[0]?.id === documentId ? undefined : 'semantic vector smoke did not return the temporary row',
    };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await prisma.searchDocument.deleteMany({ where: { canonicalKey } });
  }
}

function unitVector(size: number, activeIndex: number): number[] {
  return Array.from({ length: size }, (_, index) => (index === activeIndex ? 1 : 0));
}

function parseOptions(): Options {
  const args = process.argv.slice(2);
  const valueOf = (flag: string) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };
  return {
    sampleQuery: valueOf('--query') || 'agent',
    checkProvider: args.includes('--check-provider'),
    vectorSmoke: args.includes('--vector-smoke'),
    requireSemantic: args.includes('--require-semantic'),
  };
}

main().catch(async error => {
  console.error('Search readiness check failed:', error instanceof Error ? error.message : String(error));
  await prisma.$disconnect();
  process.exit(1);
});
