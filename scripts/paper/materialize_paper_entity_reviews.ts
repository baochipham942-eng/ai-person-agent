#!/usr/bin/env tsx
import type { Prisma } from '@prisma/client';
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

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });

async function main() {
  const [{ prisma }, { buildPaperEntityReviewCandidates }] = await Promise.all([
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
    if (options.execute) {
      assertWritableDb(db, options);
      await withNeonWakeup(() => ensurePaperEntityReviewTable(prisma), prisma);
    }

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

    const [people, organizations] = await Promise.all([
      withNeonWakeup(() => prisma.people.findMany({
        select: {
          id: true,
          name: true,
          aliases: true,
          currentTitle: true,
          openalexId: true,
          influenceScore: true,
        },
      }), prisma),
      withNeonWakeup(() => prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          aliases: true,
        },
      }), prisma),
    ]);

    const reviews = [];
    let upserted = 0;
    for (const source of sources) {
      const candidates = await buildPaperEntityReviewCandidates(source, { people, organizations });
      for (const candidate of candidates) {
        const review = {
          sourceItemId: candidate.sourceItemId,
          sourceTitle: source.title,
          entityName: candidate.entityName,
          entityKind: candidate.entityKind,
          mentionType: candidate.mentionType,
          matchReason: candidate.matchReason,
          confidence: candidate.confidence,
          reviewStatus: candidate.reviewStatus,
          candidatePeople: candidate.candidatePeople.map(item => ({
            id: item.id,
            name: item.name,
            matchedName: item.matchedName,
            matchReason: item.matchReason,
            confidence: item.confidence,
          })),
          candidateOrganizations: candidate.candidateOrganizations.map(item => ({
            id: item.id,
            name: item.name,
            matchReason: item.matchReason,
            confidence: item.confidence,
          })),
          evidenceQuote: candidate.evidenceQuote,
        };
        reviews.push(review);

        if (options.execute) {
          await withNeonWakeup(() => prisma.paperEntityReview.upsert({
            where: {
              sourceItemId_entityKind_mentionType_entityName: {
                sourceItemId: candidate.sourceItemId,
                entityKind: candidate.entityKind,
                mentionType: candidate.mentionType,
                entityName: candidate.entityName,
              },
            },
            create: {
              sourceItemId: candidate.sourceItemId,
              entityName: candidate.entityName,
              entityKind: candidate.entityKind,
              mentionType: candidate.mentionType,
              matchReason: candidate.matchReason,
              confidence: candidate.confidence,
              candidatePeople: toJson(candidate.candidatePeople),
              candidateOrganizations: toJson(candidate.candidateOrganizations),
              reviewStatus: 'needs_review',
              evidenceQuote: candidate.evidenceQuote,
              metadata: reviewMetadata(candidate.metadata, 'created'),
            },
            update: {
              matchReason: candidate.matchReason,
              confidence: candidate.confidence,
              candidatePeople: toJson(candidate.candidatePeople),
              candidateOrganizations: toJson(candidate.candidateOrganizations),
              evidenceQuote: candidate.evidenceQuote,
              metadata: reviewMetadata(candidate.metadata, 'refreshed'),
            },
          }), prisma);
          upserted += 1;
        }
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
      peopleIndexed: people.length,
      organizationsIndexed: organizations.length,
      candidateReviews: reviews.length,
      upserted,
      reviews: reviews.slice(0, 80),
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

function reviewMetadata(metadata: Record<string, unknown>, action: 'created' | 'refreshed'): Prisma.InputJsonValue {
  return toJson({
    ...metadata,
    materializedBy: 'materialize_paper_entity_reviews',
    materializedAction: action,
    materializedAt: new Date().toISOString(),
  });
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    sourceId: null,
    limit: 50,
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
  const message = errorToSearchableMessage(error);
  return message.includes('ECONNRESET')
    || message.includes('socket hang up')
    || message.includes('Connection terminated unexpectedly')
    || message.includes('fetch failed')
    || message.includes('UND_ERR_SOCKET');
}

function errorToSearchableMessage(error: unknown): string {
  const parts: string[] = [];
  if (error instanceof Error) {
    parts.push(error.name, error.message, error.stack ?? '');
  } else {
    parts.push(String(error));
  }

  if (error && typeof error === 'object') {
    for (const key of ['name', 'message', 'code', 'cause'] as const) {
      const value = (error as Record<string, unknown>)[key];
      if (value !== undefined) parts.push(String(value));
    }
    for (const symbol of Object.getOwnPropertySymbols(error)) {
      const value = (error as Record<PropertyKey, unknown>)[symbol];
      if (value !== undefined) parts.push(String(value));
    }
  }

  return parts.join('\n');
}

async function ensurePaperEntityReviewTable(prisma: { $executeRawUnsafe: (query: string) => Promise<unknown> }) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS "PaperEntityReview" (
    "id" TEXT NOT NULL,
    "sourceItemId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityKind" TEXT NOT NULL,
    "mentionType" TEXT NOT NULL,
    "matchReason" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "candidatePeople" JSONB,
    "candidateOrganizations" JSONB,
    "reviewStatus" TEXT NOT NULL DEFAULT 'needs_review',
    "confirmedPersonId" TEXT,
    "confirmedOrganizationId" TEXT,
    "evidenceQuote" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaperEntityReview_pkey" PRIMARY KEY ("id")
);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "PaperEntityReview_sourceItemId_entityKind_mentionType_entityName_key"
    ON "PaperEntityReview"("sourceItemId", "entityKind", "mentionType", "entityName");`,
    `CREATE INDEX IF NOT EXISTS "PaperEntityReview_sourceItemId_idx" ON "PaperEntityReview"("sourceItemId");`,
    `CREATE INDEX IF NOT EXISTS "PaperEntityReview_entityKind_idx" ON "PaperEntityReview"("entityKind");`,
    `CREATE INDEX IF NOT EXISTS "PaperEntityReview_reviewStatus_idx" ON "PaperEntityReview"("reviewStatus");`,
    `CREATE INDEX IF NOT EXISTS "PaperEntityReview_confirmedPersonId_idx" ON "PaperEntityReview"("confirmedPersonId");`,
    `CREATE INDEX IF NOT EXISTS "PaperEntityReview_confirmedOrganizationId_idx" ON "PaperEntityReview"("confirmedOrganizationId");`,
    `CREATE INDEX IF NOT EXISTS "PaperEntityReview_entityKind_reviewStatus_confidence_idx"
    ON "PaperEntityReview"("entityKind", "reviewStatus", "confidence");`,
    `DO $$ BEGIN
    ALTER TABLE "PaperEntityReview"
        ADD CONSTRAINT "PaperEntityReview_sourceItemId_fkey"
        FOREIGN KEY ("sourceItemId") REFERENCES "RawPoolItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;`,
    `DO $$ BEGIN
    ALTER TABLE "PaperEntityReview"
        ADD CONSTRAINT "PaperEntityReview_confirmedPersonId_fkey"
        FOREIGN KEY ("confirmedPersonId") REFERENCES "People"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;`,
    `DO $$ BEGIN
    ALTER TABLE "PaperEntityReview"
        ADD CONSTRAINT "PaperEntityReview_confirmedOrganizationId_fkey"
        FOREIGN KEY ("confirmedOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;`,
  ];
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}

function printHelp() {
  console.log(`
Usage:
  bunx tsx scripts/paper/materialize_paper_entity_reviews.ts --source-id=<rawPoolItemId>
  bunx tsx scripts/paper/materialize_paper_entity_reviews.ts --limit=50
  bunx tsx scripts/paper/materialize_paper_entity_reviews.ts --execute --allow-remote-dev --allow-vercel-env

Default mode is dry-run. It materializes PaperEntityReview rows for OpenAlex paper authors and affiliations that need human confirmation. Writes require --execute and are idempotent by sourceItemId/entityKind/mentionType/entityName. It never creates or auto-links People or Organization records.
`);
}
