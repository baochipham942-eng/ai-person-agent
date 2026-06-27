#!/usr/bin/env tsx
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

interface Options {
  sourceId: string | null;
  limit: number;
  maxPages: number;
  pdfFetchTimeoutMs: number | null;
  pdfFetchRetries: number | null;
  maxPdfBytes: number | null;
  arxivOnly: boolean;
  threadPaperFoundations: boolean;
  execute: boolean;
  refresh: boolean;
  allowRemoteDev: boolean;
  allowVercelEnv: boolean;
  help: boolean;
}

type PrismaWakeClient = { people: { count: () => Promise<number> } };
type RawPoolCandidate = { id: string; url: string; metadata: unknown; paperDocument?: { id: string } | null };
type ArxivExtractor = (input: {
  url?: string | null;
  doi?: string | null;
  openalexWorkId?: string | null;
  landingPageUrl?: string | null;
}) => string | null;

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });

async function main() {
  const [{ prisma }, { extractArxivIdFromPaperIdentifiers, materializePaperDocument }] = await Promise.all([
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
    const db = getDbInfo();
    if (options.execute) assertWritableDb(db, options);

    const { sources, scanned, skippedExisting } = await selectMaterializationSources(
      prisma,
      options,
      extractArxivIdFromPaperIdentifiers,
    );

    const results = [];
    for (const source of sources) {
      const result = await withNeonWakeup(() => materializePaperDocument(source.id, {
        dryRun: !options.execute,
        maxPages: options.maxPages,
        refresh: options.refresh,
        pdfFetchTimeoutMs: options.pdfFetchTimeoutMs ?? undefined,
        pdfFetchRetries: options.pdfFetchRetries ?? undefined,
        maxPdfBytes: options.maxPdfBytes ?? undefined,
      }), prisma);
      results.push(result);
    }

    console.log(JSON.stringify({
      dryRun: !options.execute,
      db,
      options: {
        sourceId: options.sourceId,
        limit: options.limit,
        maxPages: options.maxPages,
        pdfFetchTimeoutMs: options.pdfFetchTimeoutMs,
        pdfFetchRetries: options.pdfFetchRetries,
        maxPdfBytes: options.maxPdfBytes,
        arxivOnly: options.arxivOnly,
        threadPaperFoundations: options.threadPaperFoundations,
        refresh: options.refresh,
      },
      scanned,
      skippedExisting,
      count: results.filter(Boolean).length,
      results,
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    sourceId: null,
    limit: 3,
    maxPages: 16,
    pdfFetchTimeoutMs: null,
    pdfFetchRetries: null,
    maxPdfBytes: null,
    arxivOnly: false,
    threadPaperFoundations: false,
    execute: false,
    refresh: false,
    allowRemoteDev: false,
    allowVercelEnv: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--execute') options.execute = true;
    else if (arg === '--refresh') options.refresh = true;
    else if (arg === '--arxiv-only') options.arxivOnly = true;
    else if (arg === '--thread-paper-foundations') options.threadPaperFoundations = true;
    else if (arg === '--allow-remote-dev') options.allowRemoteDev = true;
    else if (arg === '--allow-vercel-env') options.allowVercelEnv = true;
    else if (arg.startsWith('--source-id=')) options.sourceId = arg.slice('--source-id='.length);
    else if (arg.startsWith('--limit=')) options.limit = positiveInt(arg.slice('--limit='.length), options.limit);
    else if (arg.startsWith('--max-pages=')) options.maxPages = positiveInt(arg.slice('--max-pages='.length), options.maxPages);
    else if (arg.startsWith('--pdf-fetch-timeout-ms=')) options.pdfFetchTimeoutMs = positiveInt(arg.slice('--pdf-fetch-timeout-ms='.length), 120_000);
    else if (arg.startsWith('--pdf-fetch-retries=')) options.pdfFetchRetries = nonNegativeInt(arg.slice('--pdf-fetch-retries='.length), 1);
    else if (arg.startsWith('--max-pdf-bytes=')) options.maxPdfBytes = positiveInt(arg.slice('--max-pdf-bytes='.length), 24 * 1024 * 1024);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function selectMaterializationSources(
  prisma: {
    rawPoolItem: {
      findMany: (args: unknown) => Promise<RawPoolCandidate[]>;
    };
  } & PrismaWakeClient,
  options: Options,
  extractArxivIdFromPaperIdentifiers: ArxivExtractor,
): Promise<{ sources: { id: string }[]; scanned: number; skippedExisting: number }> {
  if (options.sourceId) return { sources: [{ id: options.sourceId }], scanned: 1, skippedExisting: 0 };

  const where = {
    sourceType: 'openalex',
    fetchStatus: 'success',
    ...(options.threadPaperFoundations ? {
      knowledgeThreadSources: {
        some: { role: 'paper_foundation' },
      },
    } : {}),
    ...(!options.refresh ? { paperDocument: null } : {}),
  };

  if (!options.arxivOnly) {
    const sources = await withNeonWakeup(() => prisma.rawPoolItem.findMany({
      where,
      orderBy: [
        { publishedAt: 'desc' },
        { fetchedAt: 'desc' },
      ],
      take: options.limit,
      select: { id: true, url: true, metadata: true, paperDocument: { select: { id: true } } },
    }), prisma);
    return { sources: sources.map(source => ({ id: source.id })), scanned: sources.length, skippedExisting: 0 };
  }

  const sources: { id: string }[] = [];
  const seenArxivIds = new Set<string>();
  const batchSize = Math.max(options.limit * 4, 50);
  let scanned = 0;
  let skippedExisting = 0;

  for (let skip = 0; sources.length < options.limit; skip += batchSize) {
    const batch = await withNeonWakeup(() => prisma.rawPoolItem.findMany({
      where,
      orderBy: [
        { publishedAt: 'desc' },
        { fetchedAt: 'desc' },
      ],
      take: batchSize,
      skip,
      select: { id: true, url: true, metadata: true, paperDocument: { select: { id: true } } },
    }), prisma);
    if (batch.length === 0) break;
    scanned += batch.length;

    for (const source of batch) {
      if (!options.refresh && source.paperDocument) {
        skippedExisting += 1;
        continue;
      }
      const metadata = asRecord(source.metadata);
      const arxivId = extractArxivIdFromPaperIdentifiers({
        url: source.url,
        doi: readString(metadata.doi),
        openalexWorkId: readString(metadata.openalexWorkId) || readString(metadata.openalexId),
        landingPageUrl: readString(metadata.landingPageUrl),
      });
      if (!arxivId) continue;
      const arxivKey = arxivId.toLowerCase();
      if (seenArxivIds.has(arxivKey)) continue;
      seenArxivIds.add(arxivKey);
      sources.push({ id: source.id });
      if (sources.length >= options.limit) break;
    }
  }

  return { sources, scanned, skippedExisting };
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
  const message = errorToSearchableMessage(error);
  return /ECONNRESET|socket hang up|connection.*reset|terminating connection|UND_ERR_SOCKET/i.test(message);
}

function errorToSearchableMessage(error: unknown): string {
  const values: string[] = [];
  if (error instanceof Error) {
    values.push(error.name, error.message, error.stack || '');
  } else {
    values.push(String(error));
  }

  if (error && typeof error === 'object') {
    const record = error as Record<PropertyKey, unknown>;
    for (const key of ['message', 'code', 'name', 'cause']) {
      const value = record[key];
      if (value) values.push(String(value));
    }
    for (const symbol of Object.getOwnPropertySymbols(error)) {
      const value = record[symbol];
      if (value) values.push(String(value));
    }
  }

  return values.join(' ');
}

function positiveInt(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function nonNegativeInt(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function getDbInfo() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return { configured: false, host: null, database: null, local: false, vercel: Boolean(process.env.VERCEL) };
  try {
    const url = new URL(connectionString);
    return {
      configured: true,
      host: url.hostname,
      database: url.pathname.replace(/^\//, '') || null,
      local: ['localhost', '127.0.0.1', '::1'].includes(url.hostname),
      vercel: Boolean(process.env.VERCEL),
    };
  } catch {
    return { configured: true, host: 'unparseable', database: null, local: false, vercel: Boolean(process.env.VERCEL) };
  }
}

function assertWritableDb(db: ReturnType<typeof getDbInfo>, options: Options) {
  if (!db.configured) throw new Error('DATABASE_URL is not configured.');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to write while NODE_ENV=production.');
  }
  if (process.env.VERCEL && !options.allowVercelEnv) {
    throw new Error('Refusing to write while VERCEL is set. Re-run with --allow-vercel-env after confirming this is the intended dev shell.');
  }
  if (!db.local && !options.allowRemoteDev) {
    throw new Error(`Refusing to write to remote database host "${db.host}". Re-run with --allow-remote-dev after confirming this is a dev database.`);
  }
}

function printHelp() {
  console.log(`
Usage:
  bunx tsx scripts/paper/materialize_paper_documents.ts --source-id=<rawPoolItemId>
  bunx tsx scripts/paper/materialize_paper_documents.ts --limit=3 --max-pages=16
  bunx tsx scripts/paper/materialize_paper_documents.ts --limit=5 --thread-paper-foundations --arxiv-only --execute --allow-remote-dev --allow-vercel-env
  bunx tsx scripts/paper/materialize_paper_documents.ts --limit=20 --max-pages=16 --arxiv-only --execute --allow-remote-dev --allow-vercel-env
  bunx tsx scripts/paper/materialize_paper_documents.ts --source-id=<rawPoolItemId> --max-pages=16 --pdf-fetch-timeout-ms=240000 --pdf-fetch-retries=2 --max-pdf-bytes=25165824
  bunx tsx scripts/paper/materialize_paper_documents.ts --source-id=<rawPoolItemId> --execute --allow-remote-dev --allow-vercel-env

Default mode is dry-run and skips RawPoolItem rows that already have a PaperDocument. Use --refresh to re-materialize existing documents. Writes require --execute, and remote/Vercel-like shells require explicit confirmation flags.
`);
}
