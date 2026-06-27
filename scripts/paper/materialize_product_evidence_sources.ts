#!/usr/bin/env tsx
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

interface Options {
  productSlug: string | null;
  limit: number;
  candidateLimit: number;
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
  const [{ prisma }, { listCandidateEvidenceSourcesForWork, listWorkEvidenceCandidatePool }] = await Promise.all([
    import('@/lib/db/prisma'),
    import('@/lib/products'),
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
      await withNeonWakeup(() => ensureProductEvidenceSourceTable(prisma), prisma);
    }

    const products = await withNeonWakeup(() => prisma.product.findMany({
      where: options.productSlug ? { slug: options.productSlug } : undefined,
      select: {
        id: true,
        slug: true,
        name: true,
        aliases: true,
        url: true,
        type: true,
      },
      orderBy: { priorityScore: 'desc' },
      take: options.productSlug ? 1 : options.limit,
    }), prisma);
    const candidateRows = await withNeonWakeup(() => listWorkEvidenceCandidatePool(options.candidateLimit), prisma);

    const links = [];
    let upserted = 0;
    for (const product of products) {
      const candidates = await listCandidateEvidenceSourcesForWork(product, { candidateRows });
      for (const candidate of candidates) {
        const role = candidate.kind === 'paper' ? 'paper_foundation' : 'implementation_source';
        const reviewStatus = initialReviewStatus(candidate);
        const link = {
          productSlug: product.slug,
          productName: product.name,
          rawPoolItemId: candidate.id,
          sourceKind: candidate.kind,
          sourceTitle: candidate.title,
          role,
          reviewStatus,
          matchReason: candidate.matchReason,
          confidence: candidate.confidence,
          href: candidate.href,
          externalUrl: candidate.externalUrl,
        };
        links.push(link);

        if (options.execute) {
          await withNeonWakeup(() => prisma.productEvidenceSource.upsert({
            where: {
              productId_rawPoolItemId_role: {
                productId: product.id,
                rawPoolItemId: candidate.id,
                role,
              },
            },
            create: {
              productId: product.id,
              rawPoolItemId: candidate.id,
              role,
              matchReason: candidate.matchReason,
              confidence: candidate.confidence,
              summary: candidate.summary,
              evidenceQuote: firstText(candidate.summary, 260),
              reviewStatus,
              metadata: linkMetadata(candidate),
            },
            update: {
              matchReason: candidate.matchReason,
              confidence: candidate.confidence,
              summary: candidate.summary,
              evidenceQuote: firstText(candidate.summary, 260),
              metadata: linkMetadata(candidate),
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
        productSlug: options.productSlug,
        limit: options.limit,
        candidateLimit: options.candidateLimit,
      },
      scannedProducts: products.length,
      candidatePoolRows: candidateRows.length,
      candidateLinks: links.length,
      upserted,
      links: links.slice(0, 80),
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

function linkMetadata(candidate: {
  kind: string;
  href: string;
  externalUrl: string;
  sourceLabel: string;
  matchReason: string;
  publishedAt: string | null;
  person: { id: string; name: string };
}) {
  return {
    materializedFrom: 'work_evidence_candidate',
    autoLinked: true,
    sourceKind: candidate.kind,
    href: candidate.href,
    externalUrl: candidate.externalUrl,
    sourceLabel: candidate.sourceLabel,
    matchReason: candidate.matchReason,
    publishedAt: candidate.publishedAt,
    personId: candidate.person.id,
    personName: candidate.person.name,
    linkedAt: new Date().toISOString(),
  };
}

function initialReviewStatus(candidate: {
  matchReason: string;
  confidence: number;
}): 'auto' | 'needs_review' {
  return candidate.matchReason === 'url_exact' && candidate.confidence >= 0.95 ? 'auto' : 'needs_review';
}

function firstText(value: string | null | undefined, length: number): string | null {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length <= length ? text : `${text.slice(0, length - 1)}...`;
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    productSlug: null,
    limit: 25,
    candidateLimit: 5000,
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
    else if (arg.startsWith('--product-slug=')) options.productSlug = arg.slice('--product-slug='.length).trim().toLowerCase();
    else if (arg.startsWith('--limit=')) options.limit = positiveInt(arg.slice('--limit='.length), options.limit);
    else if (arg.startsWith('--candidate-limit=')) options.candidateLimit = positiveInt(arg.slice('--candidate-limit='.length), options.candidateLimit);
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

async function ensureProductEvidenceSourceTable(prisma: { $executeRawUnsafe: (query: string) => Promise<unknown> }) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS "ProductEvidenceSource" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "rawPoolItemId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "matchReason" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "summary" TEXT,
    "evidenceQuote" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'auto',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductEvidenceSource_pkey" PRIMARY KEY ("id")
);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "ProductEvidenceSource_productId_rawPoolItemId_role_key"
    ON "ProductEvidenceSource"("productId", "rawPoolItemId", "role");`,
    `CREATE INDEX IF NOT EXISTS "ProductEvidenceSource_productId_idx" ON "ProductEvidenceSource"("productId");`,
    `CREATE INDEX IF NOT EXISTS "ProductEvidenceSource_rawPoolItemId_idx" ON "ProductEvidenceSource"("rawPoolItemId");`,
    `CREATE INDEX IF NOT EXISTS "ProductEvidenceSource_role_idx" ON "ProductEvidenceSource"("role");`,
    `CREATE INDEX IF NOT EXISTS "ProductEvidenceSource_reviewStatus_idx" ON "ProductEvidenceSource"("reviewStatus");`,
    `DO $$ BEGIN
    ALTER TABLE "ProductEvidenceSource"
        ADD CONSTRAINT "ProductEvidenceSource_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;`,
    `DO $$ BEGIN
    ALTER TABLE "ProductEvidenceSource"
        ADD CONSTRAINT "ProductEvidenceSource_rawPoolItemId_fkey"
        FOREIGN KEY ("rawPoolItemId") REFERENCES "RawPoolItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
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
  bunx tsx scripts/paper/materialize_product_evidence_sources.ts --product-slug=deepseekmath
  bunx tsx scripts/paper/materialize_product_evidence_sources.ts --limit=25
  bunx tsx scripts/paper/materialize_product_evidence_sources.ts --product-slug=colbert --candidate-limit=5000
  bunx tsx scripts/paper/materialize_product_evidence_sources.ts --execute --allow-remote-dev --allow-vercel-env

Default mode is dry-run. It computes strong ProductEvidenceSource candidates from OpenAlex/GitHub RawPoolItem rows. Writes require --execute and are idempotent by productId/rawPoolItemId/role.
`);
}
