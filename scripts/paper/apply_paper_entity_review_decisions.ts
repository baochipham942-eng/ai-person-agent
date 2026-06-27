#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
import { readFile, writeFile } from 'node:fs/promises';

const prisma = new PrismaClient();
const SUPPORTED_REVIEW_STATUSES = new Set(['confirmed', 'rejected', 'needs_review']);

interface Options {
  file: string | null;
  execute: boolean;
  limit: number;
  resumeOffset: number;
  batchSize: number;
  summaryOutputPath: string | null;
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
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (!options.file) throw new Error('Missing --file=<decision-template.json>');

  const db = getDbInfo();
  if (options.execute) assertWritableDb(db, options);

  const payload = JSON.parse(await readFile(options.file, 'utf8'));
  const allDecisions = Array.isArray(payload.decisions) ? payload.decisions : [];
  const decisions = allDecisions.slice(options.resumeOffset, options.resumeOffset + options.limit);
  const results = [];
  let batches = 0;

  for (let start = 0; start < decisions.length; start += options.batchSize) {
    const batch = decisions.slice(start, start + options.batchSize);
    batches += 1;
    for (const decision of batch) {
      try {
        if (decision.action === 'paper_entity_review') {
          results.push(await withNeonWakeup(() => applyPaperEntityReview(decision, options)));
        } else {
          results.push({
            action: decision.action || 'unknown',
            status: 'skipped',
            reason: 'unsupported action',
          });
        }
      } catch (error) {
        results.push({
          action: decision.action || 'unknown',
          status: 'error',
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const summary = summarize(results, options, db, {
    totalDecisions: allDecisions.length,
    processedDecisions: decisions.length,
    batches,
  });
  if (options.summaryOutputPath) {
    await writeFile(options.summaryOutputPath, JSON.stringify(summary, null, 2));
    console.error(`Wrote paper entity apply summary: ${options.summaryOutputPath}`);
  }
  console.log(JSON.stringify(summary, null, 2));

  if (summary.errors > 0) process.exitCode = 1;
}

async function applyPaperEntityReview(decision: Record<string, unknown>, options: Options) {
  const id = stringOrNull(decision.paperEntityReviewId);
  const reviewStatus = stringOrNull(decision.reviewStatus);
  if (!id) return skipped('paper_entity_review', 'missing paperEntityReviewId', decision);
  if (!SUPPORTED_REVIEW_STATUSES.has(reviewStatus || '')) {
    return skipped('paper_entity_review', `unsupported reviewStatus: ${reviewStatus || '-'}`, decision);
  }

  const current = await prisma.paperEntityReview.findUnique({
    where: { id },
    select: {
      id: true,
      entityName: true,
      entityKind: true,
      mentionType: true,
      matchReason: true,
      confidence: true,
      reviewStatus: true,
      confirmedPersonId: true,
      confirmedOrganizationId: true,
      metadata: true,
      sourceItem: {
        select: {
          id: true,
          title: true,
          url: true,
          sourceType: true,
        },
      },
    },
  });
  if (!current) return skipped('paper_entity_review', 'PaperEntityReview row not found', decision);

  const confirmedPersonId = stringOrNull(decision.confirmedPersonId);
  const confirmedOrganizationId = stringOrNull(decision.confirmedOrganizationId);
  const data: {
    reviewStatus?: string;
    confidence?: number;
    confirmedPersonId?: string | null;
    confirmedOrganizationId?: string | null;
    metadata?: Record<string, unknown>;
  } = {};

  if (reviewStatus === 'confirmed') {
    const validation = await validateConfirmedEntity(current.entityKind, confirmedPersonId, confirmedOrganizationId);
    if (validation.status === 'skipped') return validation;
    data.confirmedPersonId = current.entityKind === 'person' ? confirmedPersonId : null;
    data.confirmedOrganizationId = current.entityKind === 'organization' ? confirmedOrganizationId : null;
  } else if (reviewStatus === 'rejected') {
    data.confirmedPersonId = null;
    data.confirmedOrganizationId = null;
  } else if (reviewStatus === 'needs_review') {
    data.confirmedPersonId = null;
    data.confirmedOrganizationId = null;
  }

  if (current.reviewStatus !== reviewStatus) data.reviewStatus = reviewStatus || undefined;

  const confidence = numberOrNull(decision.confidence);
  if (confidence !== null) {
    if (confidence < 0 || confidence > 1) return skipped('paper_entity_review', 'confidence must be 0..1', decision);
    if (current.confidence !== confidence) data.confidence = confidence;
  }

  const reason = nonEmptyString(decision.reason);
  const currentMetadata = asRecord(current.metadata);
  const currentReview = asRecord(currentMetadata.review);
  data.metadata = {
    ...currentMetadata,
    review: {
      ...currentReview,
      status: reviewStatus,
      reason: reason || stringOrNull(currentReview.reason),
      confirmedPersonId: data.confirmedPersonId ?? null,
      confirmedOrganizationId: data.confirmedOrganizationId ?? null,
      reviewedBy: 'paper_entity_review_script',
      reviewedAt: new Date().toISOString(),
    },
  };

  const normalizedData = removeNoopFields(data, current);
  if (Object.keys(normalizedData).length === 0) return noop('paper_entity_review', current.id, decision);

  if (options.execute) {
    await prisma.paperEntityReview.update({
      where: { id: current.id },
      data: normalizedData,
    });
  }

  return changed('paper_entity_review', current.id, decision, {
    before: {
      reviewStatus: current.reviewStatus,
      confidence: current.confidence,
      confirmedPersonId: current.confirmedPersonId,
      confirmedOrganizationId: current.confirmedOrganizationId,
    },
    after: {
      reviewStatus: normalizedData.reviewStatus || current.reviewStatus,
      confidence: normalizedData.confidence ?? current.confidence,
      confirmedPersonId: normalizedData.confirmedPersonId !== undefined ? normalizedData.confirmedPersonId : current.confirmedPersonId,
      confirmedOrganizationId: normalizedData.confirmedOrganizationId !== undefined ? normalizedData.confirmedOrganizationId : current.confirmedOrganizationId,
    },
    executed: options.execute,
    context: {
      rawPoolItemId: current.sourceItem.id,
      sourceType: current.sourceItem.sourceType,
      sourceTitle: current.sourceItem.title,
      sourceUrl: current.sourceItem.url,
      entityName: current.entityName,
      entityKind: current.entityKind,
      mentionType: current.mentionType,
      matchReason: current.matchReason,
    },
  });
}

async function validateConfirmedEntity(entityKind: string, confirmedPersonId: string | null, confirmedOrganizationId: string | null) {
  if (entityKind === 'person') {
    if (!confirmedPersonId) return skipped('paper_entity_review', 'confirmed person review requires confirmedPersonId', {});
    if (confirmedOrganizationId) return skipped('paper_entity_review', 'person review cannot set confirmedOrganizationId', {});
    const person = await prisma.people.findUnique({ where: { id: confirmedPersonId }, select: { id: true } });
    if (!person) return skipped('paper_entity_review', 'confirmedPersonId does not exist', {});
    return { status: 'ok' as const };
  }
  if (entityKind === 'organization') {
    if (!confirmedOrganizationId) return skipped('paper_entity_review', 'confirmed organization review requires confirmedOrganizationId', {});
    if (confirmedPersonId) return skipped('paper_entity_review', 'organization review cannot set confirmedPersonId', {});
    const organization = await prisma.organization.findUnique({ where: { id: confirmedOrganizationId }, select: { id: true } });
    if (!organization) return skipped('paper_entity_review', 'confirmedOrganizationId does not exist', {});
    return { status: 'ok' as const };
  }
  return skipped('paper_entity_review', `unsupported entityKind: ${entityKind}`, {});
}

function removeNoopFields(
  data: {
    reviewStatus?: string;
    confidence?: number;
    confirmedPersonId?: string | null;
    confirmedOrganizationId?: string | null;
    metadata?: Record<string, unknown>;
  },
  current: {
    reviewStatus: string;
    confidence: number;
    confirmedPersonId: string | null;
    confirmedOrganizationId: string | null;
  },
) {
  const next = { ...data };
  if (next.reviewStatus === current.reviewStatus) delete next.reviewStatus;
  if (next.confidence === current.confidence) delete next.confidence;
  if (next.confirmedPersonId === current.confirmedPersonId) delete next.confirmedPersonId;
  if (next.confirmedOrganizationId === current.confirmedOrganizationId) delete next.confirmedOrganizationId;
  return next;
}

function changed(action: string, id: string, decision: Record<string, unknown>, detail: Record<string, unknown>) {
  return {
    action,
    id,
    status: detail.executed ? 'applied' : 'dry_run',
    entityName: decision.entityName || null,
    ...detail,
  };
}

function noop(action: string, id: string, decision: Record<string, unknown>) {
  return {
    action,
    id,
    status: 'noop',
    entityName: decision.entityName || null,
  };
}

function skipped(action: string, reason: string, decision: Record<string, unknown>) {
  return {
    action,
    status: 'skipped',
    reason,
    entityName: decision.entityName || null,
  };
}

function summarize(results: Array<{ status: string }>, options: Options, db: DbInfo, audit: Record<string, unknown>) {
  const nextResumeOffset = options.resumeOffset + results.length;
  return {
    mode: options.execute ? 'execute' : 'dry_run',
    file: options.file,
    execute: options.execute,
    db,
    limit: options.limit,
    resumeOffset: options.resumeOffset,
    nextResumeOffset,
    batchSize: options.batchSize,
    ...audit,
    applied: results.filter(result => result.status === 'applied').length,
    dryRun: results.filter(result => result.status === 'dry_run').length,
    noop: results.filter(result => result.status === 'noop').length,
    skipped: results.filter(result => result.status === 'skipped').length,
    errors: results.filter(result => result.status === 'error').length,
    results,
  };
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    file: null,
    execute: false,
    limit: 100,
    resumeOffset: 0,
    batchSize: 25,
    summaryOutputPath: null,
    allowRemoteDev: false,
    allowVercelEnv: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--execute') options.execute = true;
    else if (arg === '--allow-remote-dev') options.allowRemoteDev = true;
    else if (arg === '--allow-vercel-env') options.allowVercelEnv = true;
    else if (arg.startsWith('--file=')) options.file = nonEmptyString(arg.slice('--file='.length));
    else if (arg.startsWith('--limit=')) options.limit = positiveInt(arg.slice('--limit='.length), options.limit);
    else if (arg.startsWith('--resume-offset=')) options.resumeOffset = nonNegativeInt(arg.slice('--resume-offset='.length), options.resumeOffset);
    else if (arg.startsWith('--batch-size=')) options.batchSize = positiveInt(arg.slice('--batch-size='.length), options.batchSize);
    else if (arg.startsWith('--summary-output=')) options.summaryOutputPath = nonEmptyString(arg.slice('--summary-output='.length));
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
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

async function withNeonWakeup<T>(action: () => Promise<T>): Promise<T> {
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
    || message.includes('UND_ERR_SOCKET')
    || message.includes("Can't reach database server")
    || message.includes('P1001');
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function nonEmptyString(value: unknown): string | null {
  return stringOrNull(value);
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function positiveInt(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function nonNegativeInt(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function printHelp() {
  console.log(`
Usage:
  bunx tsx scripts/paper/apply_paper_entity_review_decisions.ts --file=/tmp/paper-entity-decisions.json
  bunx tsx scripts/paper/apply_paper_entity_review_decisions.ts --file=/tmp/paper-entity-decisions.json --execute --allow-remote-dev --allow-vercel-env

Default mode is dry-run. Writes update PaperEntityReview.reviewStatus and confirmedPersonId/confirmedOrganizationId by id. The script never creates People or Organization records.
`);
}
