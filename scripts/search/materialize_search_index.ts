import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });
loadEnv({ path: '.env.local' });

import { prisma } from '../../lib/db/prisma';
import {
  buildSearchDocumentRecord,
  firstText,
  uniqueStrings,
  type SearchDocumentRecord,
  type SearchObjectType,
} from '../../lib/search/search-index';

type SourceName = SearchObjectType;

interface Options {
  execute: boolean;
  reset: boolean;
  replaceSources: boolean;
  sources: SourceName[];
  limit: number;
  batchSize: number;
}

interface Summary {
  dryRun: boolean;
  reset: boolean;
  replaceSources: boolean;
  scanned: number;
  materializable: number;
  documentsUpserted: number;
  chunksUpserted: number;
  bySource: Record<string, {
    scanned: number;
    materializable: number;
    documentsUpserted: number;
    chunksUpserted: number;
  }>;
  sample: Array<{ objectType: string; objectId: string; title: string; chunks: number }>;
}

const DEFAULT_SOURCES: SourceName[] = ['raw_pool_item', 'knowledge_source', 'company_source', 'card'];
const SOURCE_ALIASES: Record<string, SourceName> = {
  raw: 'raw_pool_item',
  rawpool: 'raw_pool_item',
  raw_pool_item: 'raw_pool_item',
  knowledge: 'knowledge_source',
  knowledge_source: 'knowledge_source',
  company: 'company_source',
  company_source: 'company_source',
  card: 'card',
};

async function main() {
  const options = parseOptions();
  const summary: Summary = {
    dryRun: !options.execute,
    reset: options.reset,
    replaceSources: options.replaceSources,
    scanned: 0,
    materializable: 0,
    documentsUpserted: 0,
    chunksUpserted: 0,
    bySource: {},
    sample: [],
  };

  if (options.reset) {
    if (!options.execute) {
      console.log('reset requested, but dry-run mode keeps the existing index untouched.');
    } else {
      await prisma.contentChunk.deleteMany({});
      await prisma.searchDocument.deleteMany({});
    }
  } else if (options.replaceSources) {
    if (!options.execute) {
      console.log('replace-sources requested, but dry-run mode keeps the existing index untouched.');
    } else {
      await prisma.searchDocument.deleteMany({
        where: {
          objectType: { in: options.sources },
        },
      });
    }
  }

  for (const source of options.sources) {
    const sourceSummary = initSourceSummary(summary, source);
    const docs = await loadSourceDocuments(source, options.limit);
    sourceSummary.scanned += docs.scanned;
    summary.scanned += docs.scanned;

    for (const doc of docs.documents) {
      sourceSummary.materializable += 1;
      summary.materializable += 1;
      if (summary.sample.length < 5) {
        summary.sample.push({
          objectType: doc.objectType,
          objectId: doc.objectId,
          title: doc.title,
          chunks: doc.chunks.length,
        });
      }
    }

    if (!options.execute) continue;
    const writeResult = options.reset || options.replaceSources
      ? await createSearchDocuments(docs.documents, options.batchSize)
      : await upsertSearchDocuments(docs.documents);
    sourceSummary.documentsUpserted += writeResult.documents;
    sourceSummary.chunksUpserted += writeResult.chunks;
    summary.documentsUpserted += writeResult.documents;
    summary.chunksUpserted += writeResult.chunks;
  }

  console.log(JSON.stringify(summary, null, 2));
  if (!options.execute) {
    console.log('Dry run only. Re-run with --execute to write SearchDocument and ContentChunk rows.');
  }
  await prisma.$disconnect();
}

async function loadSourceDocuments(source: SourceName, limit: number): Promise<{ scanned: number; documents: SearchDocumentRecord[] }> {
  switch (source) {
    case 'raw_pool_item':
      return loadRawPoolDocuments(limit);
    case 'knowledge_source':
      return loadKnowledgeSourceDocuments(limit);
    case 'company_source':
      return loadCompanySourceDocuments(limit);
    case 'card':
      return loadCardDocuments(limit);
    default:
      return { scanned: 0, documents: [] };
  }
}

async function loadRawPoolDocuments(limit: number) {
  const rows = await prisma.rawPoolItem.findMany({
    where: {
      fetchStatus: 'success',
      title: { not: '' },
      text: { not: '' },
    },
    select: {
      id: true,
      personId: true,
      sourceType: true,
      url: true,
      title: true,
      text: true,
      publishedAt: true,
      fetchedAt: true,
      metadata: true,
      person: {
        select: {
          topics: true,
          organization: true,
        },
      },
    },
    orderBy: [{ fetchedAt: 'desc' }, { id: 'asc' }],
    take: limit,
  });

  return {
    scanned: rows.length,
    documents: rows
      .map(row => buildSearchDocumentRecord({
        objectType: 'raw_pool_item',
        objectId: row.id,
        personId: row.personId,
        sourceType: row.sourceType,
        title: row.title,
        summary: textValue(row.metadata, 'gist') || firstText(row.text, 240),
        text: row.text,
        url: row.url,
        topics: uniqueStrings([...row.person.topics, ...arrayValue(row.metadata, 'contentTopics'), ...arrayValue(row.metadata, 'keywords')]),
        organizations: row.person.organization,
        publishedAt: row.publishedAt,
        fetchedAt: row.fetchedAt,
        metadata: {
          sourceTable: 'RawPoolItem',
          sourceKind: textValue(row.metadata, 'sourceKind'),
          isOfficial: booleanValue(row.metadata, 'isOfficial'),
        },
      }))
      .filter((doc): doc is SearchDocumentRecord => Boolean(doc)),
  };
}

async function loadKnowledgeSourceDocuments(limit: number) {
  const rows = await prisma.knowledgeSource.findMany({
    where: {
      title: { not: '' },
      text: { not: '' },
    },
    select: {
      id: true,
      sourceKind: true,
      sourceOwner: true,
      title: true,
      url: true,
      text: true,
      publishedAt: true,
      fetchedAt: true,
      metadata: true,
      threadSources: {
        select: {
          threadId: true,
          role: true,
          relevanceScore: true,
          thread: {
            select: {
              slug: true,
              title: true,
              tags: true,
            },
          },
        },
        orderBy: [{ relevanceScore: 'desc' }, { createdAt: 'asc' }],
      },
    },
    orderBy: [{ fetchedAt: 'desc' }, { id: 'asc' }],
    take: limit,
  });

  return {
    scanned: rows.length,
    documents: rows
      .map(row => {
        const primaryThread = row.threadSources[0] || null;
        const topics = uniqueStrings(row.threadSources.flatMap(source => source.thread.tags));
        return buildSearchDocumentRecord({
          objectType: 'knowledge_source',
          objectId: row.id,
          threadId: primaryThread?.threadId || null,
          sourceType: row.sourceKind,
          title: row.title,
          summary: firstText(row.text, 240),
          text: row.text,
          url: row.url,
          topics,
          organizations: row.sourceOwner ? [row.sourceOwner] : [],
          publishedAt: row.publishedAt,
          fetchedAt: row.fetchedAt,
          metadata: {
            sourceTable: 'KnowledgeSource',
            sourceOwner: row.sourceOwner,
            threadIds: row.threadSources.map(source => source.threadId),
            threadSlugs: row.threadSources.map(source => source.thread.slug),
            threadRoles: row.threadSources.map(source => source.role),
          },
        });
      })
      .filter((doc): doc is SearchDocumentRecord => Boolean(doc)),
  };
}

async function loadCompanySourceDocuments(limit: number) {
  const rows = await prisma.companySource.findMany({
    where: {
      title: { not: '' },
      text: { not: '' },
    },
    select: {
      id: true,
      organizationId: true,
      sourceKind: true,
      role: true,
      title: true,
      url: true,
      text: true,
      summary: true,
      publishedAt: true,
      fetchedAt: true,
      confidence: true,
      metadata: true,
      organization: {
        select: {
          name: true,
          nameZh: true,
          aliases: true,
        },
      },
    },
    orderBy: [{ fetchedAt: 'desc' }, { id: 'asc' }],
    take: limit,
  });

  return {
    scanned: rows.length,
    documents: rows
      .map(row => buildSearchDocumentRecord({
        objectType: 'company_source',
        objectId: row.id,
        organizationId: row.organizationId,
        sourceType: row.sourceKind,
        title: row.title,
        summary: row.summary || firstText(row.text, 240),
        text: row.text,
        url: row.url,
        topics: uniqueStrings([...arrayValue(row.metadata, 'contentTopics'), ...arrayValue(row.metadata, 'keywords')]),
        organizations: uniqueStrings([row.organization.name, row.organization.nameZh || '', ...row.organization.aliases]),
        publishedAt: row.publishedAt,
        fetchedAt: row.fetchedAt,
        metadata: {
          sourceTable: 'CompanySource',
          role: row.role,
          confidence: row.confidence,
        },
      }))
      .filter((doc): doc is SearchDocumentRecord => Boolean(doc)),
  };
}

async function loadCardDocuments(limit: number) {
  const rows = await prisma.card.findMany({
    where: {
      isActive: true,
      title: { not: '' },
      content: { not: '' },
    },
    select: {
      id: true,
      personId: true,
      type: true,
      title: true,
      content: true,
      tags: true,
      sourceUrl: true,
      importance: true,
      createdAt: true,
      updatedAt: true,
      person: {
        select: {
          topics: true,
          organization: true,
        },
      },
    },
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    take: limit,
  });

  return {
    scanned: rows.length,
    documents: rows
      .map(row => buildSearchDocumentRecord({
        objectType: 'card',
        objectId: row.id,
        personId: row.personId,
        sourceType: row.type,
        title: row.title,
        summary: firstText(row.content, 220),
        text: row.content,
        url: row.sourceUrl,
        topics: uniqueStrings([...row.tags, ...row.person.topics]),
        organizations: row.person.organization,
        publishedAt: row.createdAt,
        fetchedAt: row.updatedAt,
        metadata: {
          sourceTable: 'Card',
          importance: row.importance,
        },
      }))
      .filter((doc): doc is SearchDocumentRecord => Boolean(doc)),
  };
}

async function upsertSearchDocuments(docs: SearchDocumentRecord[]) {
  const result = { documents: 0, chunks: 0 };
  for (const doc of docs) {
    await upsertSearchDocument(doc);
    result.documents += 1;
    result.chunks += doc.chunks.length;
  }
  return result;
}

async function upsertSearchDocument(doc: SearchDocumentRecord) {
  const now = new Date();
  await prisma.$transaction(async tx => {
    await tx.searchDocument.upsert({
      where: { canonicalKey: doc.canonicalKey },
      create: {
        id: doc.id,
        objectType: doc.objectType,
        objectId: doc.objectId,
        canonicalKey: doc.canonicalKey,
        personId: doc.personId,
        threadId: doc.threadId,
        organizationId: doc.organizationId,
        sourceType: doc.sourceType,
        title: doc.title,
        summary: doc.summary,
        text: doc.text,
        url: doc.url,
        topics: doc.topics,
        organizations: doc.organizations,
        publishedAt: doc.publishedAt,
        fetchedAt: doc.fetchedAt,
        textHash: doc.textHash,
        embeddingStatus: doc.embeddingStatus,
        metadata: doc.metadata,
      },
      update: {
        personId: doc.personId,
        threadId: doc.threadId,
        organizationId: doc.organizationId,
        sourceType: doc.sourceType,
        title: doc.title,
        summary: doc.summary,
        text: doc.text,
        url: doc.url,
        topics: doc.topics,
        organizations: doc.organizations,
        publishedAt: doc.publishedAt,
        fetchedAt: doc.fetchedAt,
        textHash: doc.textHash,
        embeddingStatus: doc.embeddingStatus,
        metadata: doc.metadata,
      },
    });

    await tx.contentChunk.deleteMany({ where: { documentId: doc.id } });
    if (doc.chunks.length > 0) {
      await tx.contentChunk.createMany({
        data: doc.chunks.map(chunk => ({
          id: chunk.id,
          documentId: chunk.documentId,
          objectType: chunk.objectType,
          objectId: chunk.objectId,
          chunkIndex: chunk.chunkIndex,
          title: chunk.title,
          text: chunk.text,
          tokenEstimate: chunk.tokenEstimate,
          textHash: chunk.textHash,
          metadata: chunk.metadata,
          createdAt: now,
          updatedAt: now,
        })),
      });
    }
  });
}

async function createSearchDocuments(docs: SearchDocumentRecord[], batchSize: number) {
  const result = { documents: 0, chunks: 0 };
  const now = new Date();
  for (const batch of chunk(docs, batchSize)) {
    await createSearchDocumentBatch(batch, now);
    result.documents += batch.length;
  }

  const chunks = docs.flatMap(doc => doc.chunks);
  for (const batch of chunk(chunks, Math.max(1, batchSize * 4))) {
    await createContentChunkBatch(batch, now);
    result.chunks += batch.length;
  }

  return result;
}

async function createSearchDocumentBatch(docs: SearchDocumentRecord[], now: Date): Promise<void> {
  if (docs.length === 0) return;
  try {
    await prisma.searchDocument.createMany({
      data: docs.map(doc => searchDocumentCreateData(doc, now)),
      skipDuplicates: true,
    });
    return;
  } catch (error) {
    if (docs.length === 1) {
      try {
        await prisma.searchDocument.create({ data: searchDocumentCreateData(docs[0], now) });
      } catch (singleError) {
        console.error('SearchDocument single create failed:', JSON.stringify({
          objectType: docs[0].objectType,
          objectId: docs[0].objectId,
          canonicalKey: docs[0].canonicalKey,
          title: docs[0].title,
          textSample: docs[0].text.slice(0, 240),
        }, null, 2));
        throw singleError;
      }
      return;
    }
    const mid = Math.ceil(docs.length / 2);
    await createSearchDocumentBatch(docs.slice(0, mid), now);
    await createSearchDocumentBatch(docs.slice(mid), now);
  }
}

function searchDocumentCreateData(doc: SearchDocumentRecord, now: Date) {
  return {
    id: doc.id,
    objectType: doc.objectType,
    objectId: doc.objectId,
    canonicalKey: doc.canonicalKey,
    personId: doc.personId,
    threadId: doc.threadId,
    organizationId: doc.organizationId,
    sourceType: doc.sourceType,
    title: doc.title,
    summary: doc.summary,
    text: doc.text,
    url: doc.url,
    topics: doc.topics,
    organizations: doc.organizations,
    publishedAt: doc.publishedAt,
    fetchedAt: doc.fetchedAt,
    textHash: doc.textHash,
    embeddingStatus: doc.embeddingStatus,
    metadata: doc.metadata,
    createdAt: now,
    updatedAt: now,
  };
}

async function createContentChunkBatch(chunks: SearchDocumentRecord['chunks'], now: Date): Promise<void> {
  if (chunks.length === 0) return;
  try {
    await prisma.contentChunk.createMany({
      data: chunks.map(contentChunk => ({
        id: contentChunk.id,
        documentId: contentChunk.documentId,
        objectType: contentChunk.objectType,
        objectId: contentChunk.objectId,
        chunkIndex: contentChunk.chunkIndex,
        title: contentChunk.title,
        text: contentChunk.text,
        tokenEstimate: contentChunk.tokenEstimate,
        textHash: contentChunk.textHash,
        metadata: contentChunk.metadata,
        createdAt: now,
        updatedAt: now,
      })),
      skipDuplicates: true,
    });
    return;
  } catch (error) {
    if (chunks.length === 1) {
      const contentChunk = chunks[0];
      await prisma.contentChunk.create({
        data: {
          id: contentChunk.id,
          documentId: contentChunk.documentId,
          objectType: contentChunk.objectType,
          objectId: contentChunk.objectId,
          chunkIndex: contentChunk.chunkIndex,
          title: contentChunk.title,
          text: contentChunk.text,
          tokenEstimate: contentChunk.tokenEstimate,
          textHash: contentChunk.textHash,
          metadata: contentChunk.metadata,
          createdAt: now,
          updatedAt: now,
        },
      });
      return;
    }
    const mid = Math.ceil(chunks.length / 2);
    await createContentChunkBatch(chunks.slice(0, mid), now);
    await createContentChunkBatch(chunks.slice(mid), now);
  }
}

function parseOptions(): Options {
  const args = process.argv.slice(2);
  const valueOf = (flag: string) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const sources = (valueOf('--sources') || DEFAULT_SOURCES.join(','))
    .split(',')
    .map(source => SOURCE_ALIASES[source.trim()])
    .filter((source): source is SourceName => Boolean(source));

  return {
    execute: args.includes('--execute'),
    reset: args.includes('--reset'),
    replaceSources: args.includes('--replace-sources') || args.includes('--replace'),
    sources: sources.length ? [...new Set(sources)] : DEFAULT_SOURCES,
    limit: readBoundedInt(valueOf('--limit'), 1, 50000, 5000),
    batchSize: readBoundedInt(valueOf('--batch-size'), 1, 1000, 250),
  };
}

function initSourceSummary(summary: Summary, source: string) {
  summary.bySource[source] ||= {
    scanned: 0,
    materializable: 0,
    documentsUpserted: 0,
    chunksUpserted: 0,
  };
  return summary.bySource[source];
}

function arrayValue(value: unknown, key: string): string[] {
  const record = asRecord(value);
  const raw = record[key];
  return Array.isArray(raw) ? raw.map(item => String(item)).filter(Boolean) : [];
}

function textValue(value: unknown, key: string): string | null {
  const raw = asRecord(value)[key];
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

function booleanValue(value: unknown, key: string): boolean | null {
  const raw = asRecord(value)[key];
  return typeof raw === 'boolean' ? raw : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readBoundedInt(value: string | undefined, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

main().catch(async error => {
  console.error('Search index materialization failed:', error);
  await prisma.$disconnect();
  process.exit(1);
});
