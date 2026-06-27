#!/usr/bin/env tsx
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

interface Options {
  sourceId: string | null;
  limit: number;
  execute: boolean;
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

interface CandidateLink {
  sourceId: string;
  sourceTitle: string;
  threadSlug: string;
  threadTitle: string;
  role: string;
  sourcePackSourceId: string;
  sourcePackUrl: string | null;
  relevanceScore: number;
  summary: string | null;
  evidenceQuote: string | null;
  matchReason: string;
  matchRank: number;
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });

async function main() {
  const [{ prisma }, { getPaperSourcePackThreadLinks }] = await Promise.all([
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

    const sources = options.sourceId
      ? await withNeonWakeup(() => prisma.rawPoolItem.findMany({
        where: { id: options.sourceId, sourceType: 'openalex' },
        select: paperSourceSelect(),
      }), prisma)
      : await withNeonWakeup(() => prisma.rawPoolItem.findMany({
        where: { sourceType: 'openalex' },
        orderBy: [
          { publishedAt: 'desc' },
          { fetchedAt: 'desc' },
        ],
        take: options.limit,
        select: paperSourceSelect(),
      }), prisma);

    const rawCandidates: CandidateLink[] = [];
    for (const source of sources) {
      const links = getPaperSourcePackThreadLinks(source)
        .filter(link => link.source === 'source_pack' && link.role === 'paper_foundation');
      for (const link of links) {
        rawCandidates.push({
          sourceId: source.id,
          sourceTitle: source.title,
          threadSlug: link.slug,
          threadTitle: link.title,
          role: link.role,
          sourcePackSourceId: link.sourcePackSourceId || `${link.slug}:${link.title}`,
          sourcePackUrl: link.sourcePackUrl || null,
          relevanceScore: link.relevanceScore ?? 0.82,
          summary: link.summary,
          evidenceQuote: link.evidenceQuote,
          matchReason: link.matchReason,
          matchRank: matchRank(link.matchReason),
        });
      }
    }
    const candidates = dedupeCandidates(rawCandidates);

    const threadSlugs = [...new Set(candidates.map(candidate => candidate.threadSlug))];
    const threads = await withNeonWakeup(() => prisma.knowledgeThread.findMany({
      where: { slug: { in: threadSlugs } },
      select: { id: true, slug: true },
    }), prisma);
    const threadIdBySlug = new Map(threads.map(thread => [thread.slug, thread.id]));
    const missingThreadSlugs = threadSlugs.filter(slug => !threadIdBySlug.has(slug));

    if (options.execute && missingThreadSlugs.length > 0) {
      throw new Error(`Missing KnowledgeThread rows for ${missingThreadSlugs.join(', ')}. Run scripts/threads/seed_threads_to_db.ts --execute first.`);
    }

    let upserted = 0;
    if (options.execute) {
      for (const candidate of candidates) {
        const threadId = threadIdBySlug.get(candidate.threadSlug);
        if (!threadId) continue;
        await withNeonWakeup(() => prisma.knowledgeThreadSource.upsert({
          where: {
            threadId_rawPoolItemId_role: {
              threadId,
              rawPoolItemId: candidate.sourceId,
              role: candidate.role,
            },
          },
          create: {
            threadId,
            rawPoolItemId: candidate.sourceId,
            role: candidate.role,
            relevanceScore: candidate.relevanceScore,
            summary: candidate.summary,
            evidenceQuote: candidate.evidenceQuote,
            metadata: linkMetadata(candidate),
          },
          update: {
            relevanceScore: candidate.relevanceScore,
            summary: candidate.summary,
            evidenceQuote: candidate.evidenceQuote,
            metadata: linkMetadata(candidate),
          },
        }), prisma);
        upserted += 1;
      }
    }

    console.log(JSON.stringify({
      dryRun: !options.execute,
      db,
      options: {
        sourceId: options.sourceId,
        limit: options.limit,
      },
      scannedSources: sources.length,
      candidateLinks: candidates.length,
      duplicateRawMatches: rawCandidates.length - candidates.length,
      missingThreadSlugs,
      upserted,
      links: candidates.slice(0, 50),
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

function paperSourceSelect() {
  return {
    id: true,
    sourceType: true,
    title: true,
    url: true,
    text: true,
    publishedAt: true,
    metadata: true,
    person: {
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        currentTitle: true,
      },
    },
  } as const;
}

function linkMetadata(candidate: CandidateLink) {
  const strongMatch = isStrongPaperThreadMatchReason(candidate.matchReason);
  return {
    materializedFrom: 'source_pack_paper_foundation',
    autoLinked: true,
    sourcePackSlug: candidate.threadSlug,
    sourcePackSourceId: candidate.sourcePackSourceId,
    sourcePackUrl: candidate.sourcePackUrl,
    matchReason: candidate.matchReason,
    status: strongMatch ? 'verified' : 'needs_review',
    reviewStatus: strongMatch ? 'confirmed' : 'needs_review',
    excludedFromTopicReadiness: !strongMatch,
    reviewReason: strongMatch ? null : '弱身份匹配，需人工复核后才计入主题 ready。',
    linkedAt: new Date().toISOString(),
  };
}

function dedupeCandidates(candidates: CandidateLink[]): CandidateLink[] {
  const byPackSource = new Map<string, CandidateLink>();
  for (const candidate of candidates) {
    const key = `${candidate.threadSlug}:${candidate.role}:${candidate.sourcePackSourceId}`;
    const existing = byPackSource.get(key);
    if (!existing || compareCandidateQuality(candidate, existing) > 0) {
      byPackSource.set(key, candidate);
    }
  }
  return [...byPackSource.values()].sort((left, right) => {
    const byThread = left.threadSlug.localeCompare(right.threadSlug);
    if (byThread !== 0) return byThread;
    return left.sourcePackSourceId.localeCompare(right.sourcePackSourceId);
  });
}

function compareCandidateQuality(left: CandidateLink, right: CandidateLink): number {
  if (left.matchRank !== right.matchRank) return left.matchRank - right.matchRank;
  if (left.relevanceScore !== right.relevanceScore) return left.relevanceScore - right.relevanceScore;
  return right.sourceId.localeCompare(left.sourceId);
}

function matchRank(reason: string): number {
  if (reason.includes('DOI') || reason.includes('arXiv') || reason.includes('URL')) return 3;
  if (reason.includes('标题')) return 1;
  return 0;
}

function isStrongPaperThreadMatchReason(reason: string): boolean {
  return matchRank(reason) >= 3;
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    sourceId: null,
    limit: Number.MAX_SAFE_INTEGER,
    execute: false,
    allowRemoteDev: false,
    allowVercelEnv: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--execute') options.execute = true;
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
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('ECONNRESET')
    || message.includes('Connection terminated unexpectedly')
    || message.includes('fetch failed')
    || message.includes('UND_ERR_SOCKET');
}

function printHelp() {
  console.log(`
Usage:
  bunx tsx scripts/paper/link_paper_foundations_to_threads.ts --source-id=<rawPoolItemId>
  bunx tsx scripts/paper/link_paper_foundations_to_threads.ts --limit=1200
  bunx tsx scripts/paper/link_paper_foundations_to_threads.ts --execute --allow-remote-dev --allow-vercel-env

Default mode is dry-run. It matches reviewed source-pack paper_foundation entries to OpenAlex RawPoolItem rows and writes KnowledgeThreadSource(rawPoolItemId=...) only with --execute.
`);
}
