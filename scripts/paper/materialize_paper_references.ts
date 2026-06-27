#!/usr/bin/env tsx
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

interface Options {
  sourceId: string | null;
  limit: number;
  execute: boolean;
  includeAllSources: boolean;
  threadPaperFoundations: boolean;
  allowRemoteDev: boolean;
  allowVercelEnv: boolean;
  help: boolean;
}

interface DbInfo {
  configured: boolean;
  host: string | null;
  database: string | null;
  local: boolean;
  vercel: boolean;
}

type MaterializeSource = {
  id: string;
  title: string;
  url: string;
  metadata: unknown;
};

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });

async function main() {
  const [{ prisma }, { PAPER_REFERENCES_CACHE_VERSION, materializePaperReferenceCards }] = await Promise.all([
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

    const candidateWindow = options.sourceId ? 1 : Math.max(options.limit * 10, 100);
    const candidates = await withNeonWakeup(() => prisma.rawPoolItem.findMany({
      where: {
        sourceType: 'openalex',
        ...(options.sourceId
          ? { id: options.sourceId }
          : options.includeAllSources
            ? {}
            : { paperDocument: { isNot: null } }),
        ...(!options.sourceId && options.threadPaperFoundations ? {
          knowledgeThreadSources: {
            some: { role: 'paper_foundation' },
          },
        } : {}),
      },
      orderBy: [
        { publishedAt: 'desc' },
        { fetchedAt: 'desc' },
      ],
      take: candidateWindow,
      select: {
        id: true,
        title: true,
        url: true,
        metadata: true,
      },
    }), prisma);
    const sources = options.sourceId
      ? candidates
      : selectReferenceCandidates(candidates, PAPER_REFERENCES_CACHE_VERSION, options.limit);

    const rows = [];
    for (const source of sources) {
      const before = referenceState(source.metadata, PAPER_REFERENCES_CACHE_VERSION);
      if (!options.execute) {
        rows.push({
          sourceId: source.id,
          title: source.title,
          url: source.url,
          before,
          after: null,
        });
        continue;
      }

      const lookup = await materializePaperReferenceCards(source.id);
      rows.push({
        sourceId: source.id,
        title: source.title,
        url: source.url,
        before,
        after: lookup ? lookup.status : null,
        cardCount: lookup?.cards.length ?? 0,
      });
    }

    console.log(JSON.stringify({
      dryRun: !options.execute,
      db,
      options: {
        sourceId: options.sourceId,
        limit: options.limit,
        includeAllSources: options.includeAllSources,
        threadPaperFoundations: options.threadPaperFoundations,
        candidateWindow,
      },
      scannedSources: sources.length,
      statusCounts: buildStatusCounts(rows),
      rows,
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

function selectReferenceCandidates(
  sources: MaterializeSource[],
  expectedVersion: string,
  limit: number,
): MaterializeSource[] {
  return [...sources]
    .sort((left, right) => (
      referenceCandidateRank(left, expectedVersion) - referenceCandidateRank(right, expectedVersion)
    ))
    .slice(0, limit);
}

function referenceCandidateRank(source: MaterializeSource, expectedVersion: string): number {
  const state = referenceState(source.metadata, expectedVersion);
  const referenceCount = state.referenceCount || 0;
  if (state.version && state.stale && referenceCount > 0) return 0;
  if (state.version && state.stale) return 1;
  if (!state.version && hasOpenAlexLookupCandidate(source)) return 2;
  if (!state.version) return 3;
  if (!state.stale && referenceCount === 0) return 4;
  return 5;
}

function hasOpenAlexLookupCandidate(source: MaterializeSource): boolean {
  const metadata = asRecord(source.metadata);
  return Boolean(
    readString(metadata.openalexWorkId)
    || readString(metadata.openalexId)
    || readString(metadata.doi)
    || /(?:openalex\.org|arxiv\.org|doi\.org)/i.test(source.url),
  );
}

function referenceState(metadata: unknown, expectedVersion: string) {
  const references = asRecord(asRecord(metadata).paperReferences);
  const version = readString(references.version);
  return {
    version: version || null,
    stale: version !== expectedVersion,
    openalexWorkId: readString(references.openalexWorkId),
    openalexWorkTitle: readString(references.openalexWorkTitle),
    titleSimilarity: readNumber(references.titleSimilarity),
    titleMismatch: references.titleMismatch === true,
    message: readString(references.message),
    referencesTotal: readNumber(references.referencesTotal),
    referenceCount: Array.isArray(references.references) ? references.references.length : null,
  };
}

function buildStatusCounts(rows: Array<{ after?: { status?: string; message?: string | null } | null }>) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = row.after?.message || row.after?.status || 'dry_run';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    sourceId: null,
    limit: 25,
    execute: false,
    includeAllSources: false,
    threadPaperFoundations: false,
    allowRemoteDev: false,
    allowVercelEnv: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--execute') options.execute = true;
    else if (arg === '--include-all-sources') options.includeAllSources = true;
    else if (arg === '--thread-paper-foundations') options.threadPaperFoundations = true;
    else if (arg === '--allow-remote-dev') options.allowRemoteDev = true;
    else if (arg === '--allow-vercel-env') options.allowVercelEnv = true;
    else if (arg.startsWith('--source-id=')) options.sourceId = arg.slice('--source-id='.length);
    else if (arg.startsWith('--limit=')) options.limit = positiveInt(arg.slice('--limit='.length), options.limit);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function positiveInt(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function getDbInfo(): DbInfo {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return { configured: false, host: null, database: null, local: false, vercel: Boolean(process.env.VERCEL) };
  }
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

function assertWritableDb(db: DbInfo, options: Options) {
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

async function withNeonWakeup<T>(action: () => Promise<T>, prisma: { people: { count: () => Promise<number> } }): Promise<T> {
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
  return message.includes('ECONNRESET')
    || message.includes('socket hang up')
    || message.includes('Connection terminated unexpectedly')
    || message.includes('fetch failed')
    || message.includes('ENOTFOUND')
    || message.includes('getaddrinfo')
    || message.includes('UND_ERR_SOCKET');
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function printHelp() {
  console.log(`
Usage:
  bunx tsx scripts/paper/materialize_paper_references.ts --limit=25
  bunx tsx scripts/paper/materialize_paper_references.ts --limit=25 --include-all-sources
  bunx tsx scripts/paper/materialize_paper_references.ts --limit=25 --thread-paper-foundations --include-all-sources
  bunx tsx scripts/paper/materialize_paper_references.ts --source-id=<rawPoolItemId>
  bunx tsx scripts/paper/materialize_paper_references.ts --source-id=<rawPoolItemId> --execute --allow-remote-dev --allow-vercel-env

Default candidate pool is OpenAlex sources that already have a PaperDocument. Use --include-all-sources when refreshing citation cards for abstract/landing fallback readers too. Use --thread-paper-foundations to restrict candidates to KnowledgeThread paper_foundation sources.
`);
}
