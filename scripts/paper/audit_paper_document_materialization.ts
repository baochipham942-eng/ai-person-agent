#!/usr/bin/env tsx
import { writeFile } from 'node:fs/promises';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const CORE_SECTION_TYPES = ['abstract', 'method', 'experiment', 'limitation', 'result', 'problem'] as const;

interface Options {
  sourceId: string | null;
  limit: number;
  arxivOnly: boolean;
  json: boolean;
  summaryOutput: string | null;
  help: boolean;
}

type PrismaWakeClient = { people: { count: () => Promise<number> }; $disconnect: () => Promise<void> };
type SectionCandidate = {
  sectionType: string;
  title: string;
  pageStart: number | null;
  pageEnd: number | null;
  orderIndex: number;
};
type PaperDocumentCandidate = {
  id: string;
  status: string;
  parseVersion: string | null;
  pdfUrl: string | null;
  pageCount: number | null;
  parseError: string | null;
  parsedAt: Date | null;
  _count: { sections: number; chunks: number; figures: number };
  sections: SectionCandidate[];
};
type RawPoolCandidate = {
  id: string;
  title: string;
  url: string;
  metadata: unknown;
  publishedAt: Date | null;
  paperDocument: PaperDocumentCandidate | null;
};
type ArxivExtractor = (input: {
  url?: string | null;
  doi?: string | null;
  openalexWorkId?: string | null;
  landingPageUrl?: string | null;
}) => string | null;
type AuditRow = ReturnType<typeof buildAuditRow>;

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });

async function main() {
  const [{ prisma }, { extractArxivIdFromPaperIdentifiers }] = await Promise.all([
    import('@/lib/db/prisma'),
    import('@/lib/paper-source'),
  ]);
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    await prisma.$disconnect();
    return;
  }

  try {
    const { sources, scanned } = await loadCandidates(prisma, options, extractArxivIdFromPaperIdentifiers);
    const rows = sources.map(source => buildAuditRow(source, extractArxivIdFromPaperIdentifiers));
    const payload = {
      generatedAt: new Date().toISOString(),
      options: {
        sourceId: options.sourceId,
        limit: options.limit,
        arxivOnly: options.arxivOnly,
      },
      scanned,
      summary: buildSummary(rows),
      rows,
    };

    if (options.summaryOutput) {
      await writeFile(options.summaryOutput, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    }

    if (options.json) console.log(JSON.stringify(payload, null, 2));
    else printPretty(payload);
  } finally {
    await prisma.$disconnect();
  }
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    sourceId: null,
    limit: 20,
    arxivOnly: true,
    json: false,
    summaryOutput: null,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--include-non-arxiv') options.arxivOnly = false;
    else if (arg === '--arxiv-only') options.arxivOnly = true;
    else if (arg.startsWith('--source-id=')) options.sourceId = arg.slice('--source-id='.length);
    else if (arg.startsWith('--limit=')) options.limit = positiveInt(arg.slice('--limit='.length), options.limit);
    else if (arg.startsWith('--summary-output=')) options.summaryOutput = arg.slice('--summary-output='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function loadCandidates(
  prisma: {
    rawPoolItem: {
      findMany: (args: unknown) => Promise<RawPoolCandidate[]>;
    };
  } & PrismaWakeClient,
  options: Options,
  extractArxivIdFromPaperIdentifiers: ArxivExtractor,
): Promise<{ sources: RawPoolCandidate[]; scanned: number }> {
  const where = {
    sourceType: 'openalex',
    fetchStatus: 'success',
    ...(options.sourceId ? { id: options.sourceId } : {}),
  };
  const sources: RawPoolCandidate[] = [];
  const seenArxivIds = new Set<string>();
  const batchSize = options.sourceId ? 1 : Math.max(options.limit * 4, 50);
  let scanned = 0;

  for (let skip = 0; sources.length < options.limit; skip += batchSize) {
    const batch = await withNeonWakeup(() => prisma.rawPoolItem.findMany({
      where,
      orderBy: [
        { publishedAt: 'desc' },
        { fetchedAt: 'desc' },
      ],
      take: batchSize,
      skip,
      select: {
        id: true,
        title: true,
        url: true,
        metadata: true,
        publishedAt: true,
        paperDocument: {
          select: {
            id: true,
            status: true,
            parseVersion: true,
            pdfUrl: true,
            pageCount: true,
            parseError: true,
            parsedAt: true,
            _count: { select: { sections: true, chunks: true, figures: true } },
            sections: {
              orderBy: { orderIndex: 'asc' },
              take: 60,
              select: {
                sectionType: true,
                title: true,
                pageStart: true,
                pageEnd: true,
                orderIndex: true,
              },
            },
          },
        },
      },
    }), prisma);
    if (batch.length === 0) break;
    scanned += batch.length;

    for (const source of batch) {
      const arxivId = arxivIdForSource(source, extractArxivIdFromPaperIdentifiers);
      if (options.arxivOnly && !arxivId) continue;
      if (options.arxivOnly && arxivId) {
        const arxivKey = arxivId.toLowerCase();
        if (seenArxivIds.has(arxivKey)) continue;
        seenArxivIds.add(arxivKey);
      }
      sources.push(source);
      if (sources.length >= options.limit) break;
    }

    if (options.sourceId) break;
  }

  return { sources, scanned };
}

function buildAuditRow(source: RawPoolCandidate, extractArxivIdFromPaperIdentifiers: ArxivExtractor) {
  const document = source.paperDocument;
  const sectionTypes = document?.sections.map(section => section.sectionType) || [];
  const uniqueSectionTypes = [...new Set(sectionTypes)];
  const matchedCoreSectionTypes = CORE_SECTION_TYPES.filter(sectionType => uniqueSectionTypes.includes(sectionType));

  return {
    sourceId: source.id,
    title: source.title,
    url: source.url,
    arxivId: arxivIdForSource(source, extractArxivIdFromPaperIdentifiers),
    publishedAt: source.publishedAt?.toISOString() || null,
    documentId: document?.id || null,
    status: document?.status || 'missing',
    parseVersion: document?.parseVersion || null,
    pdfUrl: document?.pdfUrl || null,
    pageCount: document?.pageCount || null,
    sectionCount: document?._count.sections || 0,
    chunkCount: document?._count.chunks || 0,
    figureCount: document?._count.figures || 0,
    sectionTypes: uniqueSectionTypes,
    matchedCoreSectionTypes,
    coreSectionClassCount: matchedCoreSectionTypes.length,
    readyForChat: Boolean(document && document._count.chunks > 0),
    parsedAt: document?.parsedAt?.toISOString() || null,
    parseError: document?.parseError || null,
  };
}

function buildSummary(rows: AuditRow[]) {
  const statusCounts = rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.status] = (counts[row.status] || 0) + 1;
    return counts;
  }, {});
  const sectionTypeCoverage = CORE_SECTION_TYPES.reduce<Record<string, number>>((coverage, sectionType) => {
    coverage[sectionType] = rows.filter(row => row.sectionTypes.includes(sectionType)).length;
    return coverage;
  }, {});

  return {
    sampleSize: rows.length,
    documents: rows.filter(row => row.documentId).length,
    parsed: rows.filter(row => row.status === 'parsed').length,
    missing: rows.filter(row => row.status === 'missing').length,
    readyForChat: rows.filter(row => row.readyForChat).length,
    withFigures: rows.filter(row => row.figureCount > 0).length,
    parsedWithAtLeast3CoreSectionTypes: rows.filter(row => row.status === 'parsed' && row.coreSectionClassCount >= 3).length,
    totalSections: rows.reduce((sum, row) => sum + row.sectionCount, 0),
    totalChunks: rows.reduce((sum, row) => sum + row.chunkCount, 0),
    totalFigures: rows.reduce((sum, row) => sum + row.figureCount, 0),
    statusCounts,
    sectionTypeCoverage,
  };
}

function arxivIdForSource(source: Pick<RawPoolCandidate, 'url' | 'metadata'>, extractArxivIdFromPaperIdentifiers: ArxivExtractor): string | null {
  const metadata = asRecord(source.metadata);
  return extractArxivIdFromPaperIdentifiers({
    url: source.url,
    doi: readString(metadata.doi),
    openalexWorkId: readString(metadata.openalexWorkId) || readString(metadata.openalexId),
    landingPageUrl: readString(metadata.landingPageUrl),
  });
}

function positiveInt(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
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

function isNeonResetError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /ECONNRESET|connection.*reset|terminating connection/i.test(message);
}

function printPretty(payload: {
  generatedAt: string;
  options: Pick<Options, 'sourceId' | 'limit' | 'arxivOnly'>;
  scanned: number;
  summary: ReturnType<typeof buildSummary>;
  rows: AuditRow[];
}) {
  console.log('PaperDocument materialization audit');
  console.log(`generatedAt=${payload.generatedAt}`);
  console.log(`sampleSize=${payload.summary.sampleSize} scanned=${payload.scanned} arxivOnly=${payload.options.arxivOnly}`);
  console.log(JSON.stringify(payload.summary, null, 2));
  for (const row of payload.rows) {
    console.log([
      row.status.padEnd(13),
      String(row.sectionCount).padStart(2),
      'sections',
      String(row.chunkCount).padStart(2),
      'chunks',
      String(row.figureCount).padStart(2),
      'figures',
      row.readyForChat ? 'chat=ready' : 'chat=missing',
      row.sourceId,
      row.title,
    ].join(' '));
  }
}

function printHelp() {
  console.log(`
Usage:
  bunx tsx scripts/paper/audit_paper_document_materialization.ts --limit=20
  bunx tsx scripts/paper/audit_paper_document_materialization.ts --limit=20 --json --summary-output=/tmp/paper-doc-audit.json
  bunx tsx scripts/paper/audit_paper_document_materialization.ts --source-id=<rawPoolItemId>

Default mode is read-only and audits arXiv OpenAlex sources. Use --include-non-arxiv to sample all OpenAlex paper sources.
`);
}
