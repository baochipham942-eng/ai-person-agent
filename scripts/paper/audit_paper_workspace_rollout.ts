#!/usr/bin/env tsx
import { writeFile } from 'node:fs/promises';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const CORE_SECTION_TYPES = ['abstract', 'method', 'experiment', 'limitation', 'result', 'problem'] as const;

interface Options {
  json: boolean;
  sampleLimit: number;
  summaryOutput: string | null;
  help: boolean;
}

type PrismaWakeClient = { people: { count: () => Promise<number> }; $disconnect: () => Promise<void> };
type ArxivExtractor = (input: {
  url?: string | null;
  doi?: string | null;
  openalexWorkId?: string | null;
  landingPageUrl?: string | null;
}) => string | null;

type SourceRow = {
  id: string;
  title: string;
  url: string;
  metadata: unknown;
  paperDocument: {
    id: string;
    status: string;
    pageCount: number | null;
    parseError: string | null;
    _count: { sections: number; chunks: number; figures: number };
    sections: Array<{ sectionType: string }>;
    chunks: Array<{ pageNumber: number | null; sectionId: string | null }>;
  } | null;
};

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });

async function main() {
  const [{ prisma }, { extractArxivIdFromPaperIdentifiers, PAPER_REFERENCES_CACHE_VERSION }] = await Promise.all([
    import('@/lib/db/prisma'),
    import('@/lib/paper-source'),
  ]);
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    await safeDisconnect(prisma);
    return;
  }

  try {
    const sources = await withNeonWakeup(() => prisma.rawPoolItem.findMany({
      where: { sourceType: 'openalex' },
      orderBy: [
        { publishedAt: 'desc' },
        { fetchedAt: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        url: true,
        metadata: true,
        paperDocument: {
          select: {
            id: true,
            status: true,
            pageCount: true,
            parseError: true,
            _count: { select: { sections: true, chunks: true, figures: true } },
            sections: {
              select: { sectionType: true },
              orderBy: { orderIndex: 'asc' },
              take: 80,
            },
            chunks: {
              select: {
                pageNumber: true,
                sectionId: true,
              },
              orderBy: { chunkIndex: 'asc' },
              take: 240,
            },
          },
        },
      },
    }), prisma);

    const [entityReviewGroups, threadLinkCount, productEvidenceGroups] = await Promise.all([
      withNeonWakeup(() => prisma.paperEntityReview.groupBy({
        by: ['entityKind', 'reviewStatus'],
        _count: { _all: true },
      }), prisma),
      withNeonWakeup(() => prisma.knowledgeThreadSource.count({
        where: {
          role: 'paper_foundation',
          rawPoolItem: { sourceType: 'openalex' },
        },
      }), prisma),
      withNeonWakeup(() => prisma.productEvidenceSource.groupBy({
        by: ['role', 'reviewStatus'],
        where: { rawPoolItem: { sourceType: 'openalex' } },
        _count: { _all: true },
      }), prisma),
    ]);

    const rows = sources.map(source => sourceRolloutRow(
      source,
      extractArxivIdFromPaperIdentifiers,
      PAPER_REFERENCES_CACHE_VERSION,
    ));
    const payload = {
      generatedAt: new Date().toISOString(),
      mode: 'read_only',
      sampleLimit: options.sampleLimit,
      summary: buildSummary(rows, entityReviewGroups, threadLinkCount, productEvidenceGroups),
      samples: buildSamples(rows, options.sampleLimit),
    };

    if (options.summaryOutput) {
      await writeFile(options.summaryOutput, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    }

    if (options.json) console.log(JSON.stringify(payload, null, 2));
    else printPretty(payload);
  } finally {
    await safeDisconnect(prisma);
  }
}

function sourceRolloutRow(
  source: SourceRow,
  extractArxivIdFromPaperIdentifiers: ArxivExtractor,
  expectedReferenceVersion: string,
) {
  const metadata = asRecord(source.metadata);
  const paperReferences = asRecord(metadata.paperReferences);
  const paperReferenceVersion = readString(paperReferences.version);
  const referenceCount = readArray(paperReferences.references).length;
  const referenceTitleMismatch = paperReferences.titleMismatch === true;
  const paperReferencesFresh = paperReferenceVersion === expectedReferenceVersion;
  const arxivId = extractArxivIdFromPaperIdentifiers({
    url: source.url,
    doi: readString(metadata.doi),
    openalexWorkId: readString(metadata.openalexWorkId) || readString(metadata.openalexId),
    landingPageUrl: readString(metadata.landingPageUrl),
  });
  const document = source.paperDocument;
  const sectionTypes = [...new Set((document?.sections || []).map(section => section.sectionType))];
  const matchedCoreSectionTypes = CORE_SECTION_TYPES.filter(sectionType => sectionTypes.includes(sectionType));
  const authorshipSource = asRecord(metadata.authorshipSource);
  const citationAnchorChunks = document?.chunks || [];
  const hasPagedCitationChunk = citationAnchorChunks.some(chunk => typeof chunk.pageNumber === 'number');
  const hasSectionCitationChunk = citationAnchorChunks.some(chunk => Boolean(chunk.sectionId));
  const hasPageAndSectionCitationChunk = citationAnchorChunks.some(chunk => (
    typeof chunk.pageNumber === 'number' && Boolean(chunk.sectionId)
  ));

  return {
    id: source.id,
    title: source.title,
    url: source.url,
    arxivId,
    isArxiv: Boolean(arxivId),
    hasMetadataPdfUrl: Boolean(readString(metadata.pdfUrl)),
    hasResolvablePdfCandidate: Boolean(readString(metadata.pdfUrl) || arxivId),
    hasPaperGuide: hasPaperGuide(metadata.paperGuide),
    hasPaperTranslations: hasCachedItems(metadata.paperTranslations),
    hasPaperChatCache: hasCachedItems(metadata.paperChatCache),
    hasPaperNotes: hasCachedItems(metadata.paperNotes),
    hasPaperReferences: Boolean(paperReferenceVersion),
    paperReferenceVersion,
    paperReferencesFresh,
    paperReferencesStale: Boolean(paperReferenceVersion && !paperReferencesFresh),
    referenceCardsReady: paperReferencesFresh && !referenceTitleMismatch && referenceCount > 0,
    referenceEmpty: paperReferencesFresh && !referenceTitleMismatch && referenceCount === 0,
    referenceTitleMismatch,
    referenceMessage: readString(paperReferences.message),
    referenceCount,
    referencesTotal: readNumber(paperReferences.referencesTotal) || 0,
    referenceOpenAlexWorkTitle: readString(paperReferences.openalexWorkTitle),
    referenceTitleSimilarity: readNumber(paperReferences.titleSimilarity),
    hasAuthorship: readArray(metadata.openalexAuthorships).length > 0,
    authorCount: readArray(metadata.openalexAuthorships).length || readArray(metadata.authors).length,
    authorshipTitleMismatch: asRecord(metadata.authorshipSource).titleMismatch === true,
    authorshipIdentityMatches: readStringArray(authorshipSource.identityMatches),
    documentStatus: document?.status || 'missing',
    documentId: document?.id || null,
    pageCount: document?.pageCount || null,
    sectionCount: document?._count.sections || 0,
    chunkCount: document?._count.chunks || 0,
    figureCount: document?._count.figures || 0,
    readyForChat: Boolean(document && document._count.chunks > 0),
    hasPagedCitationChunk,
    hasSectionCitationChunk,
    hasPageAndSectionCitationChunk,
    sectionTypes,
    matchedCoreSectionTypes,
    coreSectionClassCount: matchedCoreSectionTypes.length,
    parseError: document?.parseError || null,
  };
}

function buildSummary(
  rows: Array<ReturnType<typeof sourceRolloutRow>>,
  entityReviewGroups: Array<{ entityKind: string; reviewStatus: string; _count: { _all: number } }>,
  threadLinkCount: number,
  productEvidenceGroups: Array<{ role: string; reviewStatus: string; _count: { _all: number } }>,
) {
  const documents = rows.filter(row => row.documentStatus !== 'missing');
  const parsedDocuments = rows.filter(row => row.documentStatus === 'parsed');
  const readyDocuments = rows.filter(row => row.readyForChat);

  return {
    sourceCoverage: {
      totalOpenAlexSources: rows.length,
      arxivSources: rows.filter(row => row.isArxiv).length,
      nonArxivSources: rows.filter(row => !row.isArxiv).length,
      metadataPdfUrl: rows.filter(row => row.hasMetadataPdfUrl).length,
      resolvablePdfCandidates: rows.filter(row => row.hasResolvablePdfCandidate).length,
    },
    p0ReaderCoverage: {
      paperGuideCached: rows.filter(row => row.hasPaperGuide).length,
      translationsCached: rows.filter(row => row.hasPaperTranslations).length,
      chatCachePresent: rows.filter(row => row.hasPaperChatCache).length,
      notesPresent: rows.filter(row => row.hasPaperNotes).length,
    },
    p1DocumentCoverage: {
      documents: documents.length,
      parsedDocuments: parsedDocuments.length,
      chatReadyDocuments: readyDocuments.length,
      pageCitationReadyDocuments: rows.filter(row => row.readyForChat && row.hasPagedCitationChunk).length,
      sectionCitationReadyDocuments: rows.filter(row => row.readyForChat && row.hasSectionCitationChunk).length,
      pageAndSectionCitationReadyDocuments: rows.filter(row => row.readyForChat && row.hasPageAndSectionCitationChunk).length,
      fallbackCitationOnlyDocuments: rows.filter(row => row.readyForChat && !row.hasPageAndSectionCitationChunk).length,
      withFigures: rows.filter(row => row.figureCount > 0).length,
      parsedWithAtLeast3CoreSectionTypes: rows.filter(row => row.documentStatus === 'parsed' && row.coreSectionClassCount >= 3).length,
      totalSections: sum(rows, row => row.sectionCount),
      totalChunks: sum(rows, row => row.chunkCount),
      totalFigures: sum(rows, row => row.figureCount),
      statusCounts: countBy(rows, row => row.documentStatus),
      sectionTypeCoverage: Object.fromEntries(
        CORE_SECTION_TYPES.map(sectionType => [
          sectionType,
          rows.filter(row => row.sectionTypes.includes(sectionType)).length,
        ]),
      ),
    },
    p2SemanticReaderCoverage: {
      citationReferenceCaches: rows.filter(row => row.hasPaperReferences).length,
      freshCitationReferenceCaches: rows.filter(row => row.paperReferencesFresh).length,
      staleCitationReferenceCaches: rows.filter(row => row.paperReferencesStale).length,
      referenceCardsReadySources: rows.filter(row => row.referenceCardsReady).length,
      referenceCardsReadyDocuments: rows.filter(row => (
        row.documentStatus !== 'missing' && row.referenceCardsReady
      )).length,
      parsedReferenceCardsReadyDocuments: rows.filter(row => (
        row.documentStatus === 'parsed' && row.referenceCardsReady
      )).length,
      fallbackReferenceCardsReadySources: rows.filter(row => (
        row.documentStatus === 'missing' && row.referenceCardsReady
      )).length,
      referenceEmptyDocuments: rows.filter(row => row.referenceEmpty).length,
      referenceTitleMismatches: rows.filter(row => row.referenceTitleMismatch).length,
      totalReferenceCards: sum(rows, row => row.referenceCount),
      totalReferencedWorks: sum(rows, row => row.referencesTotal),
    },
    p3EvidenceCoverage: {
      openalexAuthorships: rows.filter(row => row.hasAuthorship).length,
      authorshipTitleMismatches: rows.filter(row => row.authorshipTitleMismatch).length,
      entityReviewRows: groupCount(entityReviewGroups, ['entityKind', 'reviewStatus']),
      knowledgeThreadPaperLinks: threadLinkCount,
      productEvidenceRows: groupCount(productEvidenceGroups, ['role', 'reviewStatus']),
    },
    rolloutRates: {
      paperGuideCached: rate(rows.filter(row => row.hasPaperGuide).length, rows.length),
      paperDocuments: rate(documents.length, rows.length),
      chatReadyDocuments: rate(readyDocuments.length, rows.length),
      pageAndSectionCitationReadyDocuments: rate(
        rows.filter(row => row.readyForChat && row.hasPageAndSectionCitationChunk).length,
        rows.length,
      ),
      referenceCardsReadySources: rate(rows.filter(row => row.referenceCardsReady).length, rows.length),
      referenceCardsReadyDocuments: rate(
        rows.filter(row => row.documentStatus !== 'missing' && row.referenceCardsReady).length,
        rows.length,
      ),
      openalexAuthorships: rate(rows.filter(row => row.hasAuthorship).length, rows.length),
      knowledgeThreadPaperLinks: rate(threadLinkCount, rows.length),
    },
  };
}

function buildSamples(rows: Array<ReturnType<typeof sourceRolloutRow>>, sampleLimit: number) {
  return {
    missingDocuments: sample(rows.filter(row => row.documentStatus === 'missing'), sampleLimit),
    parseFailures: sample(rows.filter(row => row.parseError), sampleLimit),
    lowSectionCoverage: sample(rows.filter(row => row.documentStatus === 'parsed' && row.coreSectionClassCount < 3), sampleLimit),
    missingCitationAnchors: sample(rows.filter(row => row.readyForChat && !row.hasPageAndSectionCitationChunk), sampleLimit),
    missingAuthorships: sample(rows.filter(row => !row.hasAuthorship), sampleLimit),
    authorshipTitleMismatches: sample(rows.filter(row => row.authorshipTitleMismatch), sampleLimit),
    missingGuides: sample(rows.filter(row => !row.hasPaperGuide), sampleLimit),
    missingReferences: sample(rows.filter(row => row.documentStatus !== 'missing' && !row.paperReferencesFresh), sampleLimit),
    referenceCardReady: sample(rows.filter(row => row.referenceCardsReady), sampleLimit),
    referenceTitleMismatches: sample(rows.filter(row => row.referenceTitleMismatch), sampleLimit),
    referenceEmpty: sample(rows.filter(row => row.referenceEmpty), sampleLimit),
  };
}

function sample(rows: Array<ReturnType<typeof sourceRolloutRow>>, limit: number) {
  return rows.slice(0, limit).map(row => ({
    id: row.id,
    title: row.title,
    url: row.url,
    documentStatus: row.documentStatus,
    authorCount: row.authorCount,
    chunkCount: row.chunkCount,
    figureCount: row.figureCount,
    coreSectionClassCount: row.coreSectionClassCount,
    parseError: row.parseError,
    authorshipIdentityMatches: row.authorshipIdentityMatches,
    paperReferenceVersion: row.paperReferenceVersion,
    referenceCount: row.referenceCount,
    referencesTotal: row.referencesTotal,
    referenceTitleMismatch: row.referenceTitleMismatch,
    referenceMessage: row.referenceMessage,
    referenceOpenAlexWorkTitle: row.referenceOpenAlexWorkTitle,
    referenceTitleSimilarity: row.referenceTitleSimilarity,
  }));
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    json: false,
    sampleLimit: 8,
    summaryOutput: null,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--json') options.json = true;
    else if (arg.startsWith('--sample-limit=')) options.sampleLimit = positiveInt(arg.slice('--sample-limit='.length), options.sampleLimit);
    else if (arg.startsWith('--summary-output=')) options.summaryOutput = nonEmpty(arg.slice('--summary-output='.length));
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function hasPaperGuide(value: unknown): boolean {
  const guide = asRecord(value);
  const data = asRecord(guide.data);
  const legacyGuide = asRecord(guide.guide);
  return Boolean(
    readString(guide.promptVersion)
    && readString(guide.generatedAt)
    && (readString(data.summary) || readString(legacyGuide.summary)),
  );
}

function hasCachedItems(value: unknown): boolean {
  return Object.keys(asRecord(asRecord(value).items)).length > 0;
}

function groupCount<T extends Record<string, unknown>>(rows: T[], keys: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const row of rows) {
    const key = keys.map(item => String(row[item] || 'unknown')).join(':');
    const count = asRecord(row._count)._all;
    result[key] = typeof count === 'number' ? count : 0;
  }
  return result;
}

function countBy<T>(rows: T[], keyFn: (row: T) => string): Record<string, number> {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const key = keyFn(row);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function rate(value: number, total: number): number {
  return total > 0 ? Number((value / total).toFixed(4)) : 0;
}

function sum<T>(rows: T[], valueFn: (row: T) => number): number {
  return rows.reduce((total, row) => total + valueFn(row), 0);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function positiveInt(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function nonEmpty(value: string): string {
  if (!value.trim()) throw new Error('Expected non-empty value.');
  return value;
}

async function withNeonWakeup<T>(action: () => Promise<T>, prisma: PrismaWakeClient): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (!isNeonResetError(error)) throw error;
    await prisma.people.count();
    return action();
  }
}

async function safeDisconnect(prisma: Pick<PrismaWakeClient, '$disconnect'>): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch (error) {
    if (!isNeonResetError(error)) throw error;
  }
}

function isNeonResetError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('ECONNRESET')
    || message.includes('Connection terminated unexpectedly')
    || message.includes('fetch failed')
    || message.includes('ENOTFOUND')
    || message.includes('getaddrinfo')
    || message.includes('UND_ERR_SOCKET')
    || message.includes("Can't reach database server")
    || message.includes('P1001');
}

function printPretty(payload: {
  generatedAt: string;
  summary: {
    sourceCoverage: { totalOpenAlexSources: number };
    p0ReaderCoverage: { paperGuideCached: number };
    p1DocumentCoverage: { documents: number; chatReadyDocuments: number };
    p2SemanticReaderCoverage: {
      referenceCardsReadySources: number;
      referenceCardsReadyDocuments: number;
      referenceTitleMismatches: number;
      totalReferenceCards: number;
    };
    p3EvidenceCoverage: { openalexAuthorships: number; knowledgeThreadPaperLinks: number };
  };
}) {
  console.log('Paper Source Workspace rollout audit');
  console.log(`Generated: ${payload.generatedAt}`);
  console.log(`Sources: ${payload.summary.sourceCoverage.totalOpenAlexSources}`);
  console.log(`P0 guide cache: ${payload.summary.p0ReaderCoverage.paperGuideCached}`);
  console.log(`P1 documents: ${payload.summary.p1DocumentCoverage.documents}`);
  console.log(`P1 chat-ready documents: ${payload.summary.p1DocumentCoverage.chatReadyDocuments}`);
  console.log(`P2 reference-card sources: ${payload.summary.p2SemanticReaderCoverage.referenceCardsReadySources}`);
  console.log(`P2 reference-card documents: ${payload.summary.p2SemanticReaderCoverage.referenceCardsReadyDocuments}`);
  console.log(`P2 reference cards: ${payload.summary.p2SemanticReaderCoverage.totalReferenceCards}`);
  console.log(`P2 reference title mismatches: ${payload.summary.p2SemanticReaderCoverage.referenceTitleMismatches}`);
  console.log(`P3 authorship: ${payload.summary.p3EvidenceCoverage.openalexAuthorships}`);
  console.log(`Thread paper links: ${payload.summary.p3EvidenceCoverage.knowledgeThreadPaperLinks}`);
  console.log('Use --json for full samples and coverage details.');
}

function printHelp() {
  console.log(`
Usage:
  bunx tsx scripts/paper/audit_paper_workspace_rollout.ts
  bunx tsx scripts/paper/audit_paper_workspace_rollout.ts --json
  bunx tsx scripts/paper/audit_paper_workspace_rollout.ts --json --sample-limit=5 --summary-output=/tmp/paper-workspace-rollout.json

Default mode is read-only. It audits Paper Source Workspace rollout coverage across P0 guide/cache, P1 PaperDocument/chunk/figure readiness, P2 Semantic Reader reference cards, and P3 authorship/entity/thread/work evidence.
`);
}
