import { PrismaClient } from '@prisma/client';
import { readFile, writeFile } from 'node:fs/promises';

const prisma = new PrismaClient();

const SUPPORTED_QA_VERDICTS = new Set(['keep', 'reject', 'review', 'duplicate']);
const SUPPORTED_RELATION_STATUSES = new Set(['trusted', 'confirmed', 'needs_review']);

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.file) {
    throw new Error('Missing --file=<decision-template.json>');
  }

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
        if (decision.action === 'qa_verdict') {
          results.push(await applyQaVerdict(decision, options));
        } else if (decision.action === 'relation_review') {
          results.push(await applyRelationReview(decision, options));
        } else if (decision.action === 'card_source') {
          results.push(await applyCardSource(decision, options));
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

  const summary = summarize(results, options, {
    totalDecisions: allDecisions.length,
    processedDecisions: decisions.length,
    batches,
  });
  if (options.summaryOutputPath) {
    await writeFile(options.summaryOutputPath, JSON.stringify(summary, null, 2));
    console.error(`Wrote apply summary: ${options.summaryOutputPath}`);
  }
  console.log(JSON.stringify(summary, null, 2));

  if (summary.errors > 0) {
    process.exitCode = 1;
  }
}

async function applyQaVerdict(decision, options) {
  const id = stringOrNull(decision.qaAuditLogId);
  const verdict = stringOrNull(decision.verdict);
  if (!id) return skipped('qa_verdict', 'missing qaAuditLogId', decision);
  if (!SUPPORTED_QA_VERDICTS.has(verdict)) return skipped('qa_verdict', `unsupported verdict: ${verdict || '-'}`, decision);

  const current = await prisma.qAAuditLog.findUnique({
    where: { id },
    select: {
      id: true,
      personId: true,
      url: true,
      sourceType: true,
      stage: true,
      verdict: true,
      reason: true,
    },
  });
  if (!current) return skipped('qa_verdict', 'QAAuditLog row not found', decision);

  const data = {};
  if (current.verdict !== verdict) data.verdict = verdict;
  const reason = nonEmptyString(decision.reason);
  if (reason && current.reason !== reason) data.reason = reason;
  if (Object.keys(data).length === 0) return noop('qa_verdict', current.id, decision);

  if (options.execute) {
    await prisma.qAAuditLog.update({ where: { id: current.id }, data });
  }

  return changed('qa_verdict', current.id, decision, {
    before: {
      verdict: current.verdict,
      reason: current.reason,
    },
    after: {
      verdict: data.verdict || current.verdict,
      reason: data.reason || current.reason,
    },
    executed: options.execute,
    context: {
      personId: current.personId,
      sourceType: current.sourceType,
      stage: current.stage,
      url: current.url,
    },
  });
}

async function applyRelationReview(decision, options) {
  const id = stringOrNull(decision.relationId);
  if (!id) return skipped('relation_review', 'missing relationId', decision);

  const current = await prisma.personRelation.findUnique({
    where: { id },
    select: {
      id: true,
      personId: true,
      relatedPersonId: true,
      relationType: true,
      reviewStatus: true,
      confidence: true,
      evidenceUrl: true,
      evidenceNote: true,
      description: true,
    },
  });
  if (!current) return skipped('relation_review', 'PersonRelation row not found', decision);

  const data = {};
  const reviewStatus = nonEmptyString(decision.reviewStatus);
  if (reviewStatus) {
    if (!SUPPORTED_RELATION_STATUSES.has(reviewStatus)) {
      return skipped('relation_review', `unsupported reviewStatus: ${reviewStatus}`, decision);
    }
    if (current.reviewStatus !== reviewStatus) data.reviewStatus = reviewStatus;
  }

  const confidence = numberOrNull(decision.confidence);
  if (confidence !== null) {
    if (confidence < 0 || confidence > 1) return skipped('relation_review', 'confidence must be 0..1', decision);
    if (current.confidence !== confidence) data.confidence = confidence;
  }

  for (const field of ['evidenceUrl', 'evidenceNote', 'description']) {
    const value = nonEmptyString(decision[field]);
    if (value && current[field] !== value) data[field] = value;
  }

  if (Object.keys(data).length === 0) return noop('relation_review', current.id, decision);

  if (options.execute) {
    await prisma.personRelation.update({ where: { id: current.id }, data });
  }

  return changed('relation_review', current.id, decision, {
    before: {
      reviewStatus: current.reviewStatus,
      confidence: current.confidence,
      evidenceUrl: current.evidenceUrl,
      evidenceNote: current.evidenceNote,
      description: current.description,
    },
    after: {
      reviewStatus: data.reviewStatus || current.reviewStatus,
      confidence: data.confidence ?? current.confidence,
      evidenceUrl: data.evidenceUrl || current.evidenceUrl,
      evidenceNote: data.evidenceNote || current.evidenceNote,
      description: data.description || current.description,
    },
    executed: options.execute,
    context: {
      personId: current.personId,
      relatedPersonId: current.relatedPersonId,
      relationType: current.relationType,
    },
  });
}

async function applyCardSource(decision, options) {
  const id = stringOrNull(decision.cardId);
  const sourceUrl = nonEmptyString(decision.sourceUrl);
  if (!id) return skipped('card_source', 'missing cardId', decision);
  if (!sourceUrl) return skipped('card_source', 'missing sourceUrl', decision);

  const current = await prisma.card.findUnique({
    where: { id },
    select: {
      id: true,
      personId: true,
      title: true,
      type: true,
      sourceUrl: true,
    },
  });
  if (!current) return skipped('card_source', 'Card row not found', decision);
  if (current.sourceUrl === sourceUrl) return noop('card_source', current.id, decision);

  if (options.execute) {
    await prisma.card.update({ where: { id: current.id }, data: { sourceUrl } });
  }

  return changed('card_source', current.id, decision, {
    before: {
      sourceUrl: current.sourceUrl,
    },
    after: {
      sourceUrl,
    },
    executed: options.execute,
    context: {
      personId: current.personId,
      title: current.title,
      type: current.type,
    },
  });
}

function changed(action, id, decision, detail) {
  return {
    action,
    id,
    status: detail.executed ? 'applied' : 'dry_run',
    personId: decision.personId || null,
    personName: decision.personName || null,
    ...detail,
  };
}

function noop(action, id, decision) {
  return {
    action,
    id,
    status: 'noop',
    personId: decision.personId || null,
    personName: decision.personName || null,
  };
}

function skipped(action, reason, decision) {
  return {
    action,
    status: 'skipped',
    reason,
    personId: decision.personId || null,
    personName: decision.personName || null,
  };
}

function summarize(results, options, audit) {
  const nextResumeOffset = options.resumeOffset + results.length;
  return {
    mode: options.execute ? 'execute' : 'dry_run',
    file: options.file,
    execute: options.execute,
    limit: options.limit,
    batchSize: options.batchSize,
    resumeOffset: options.resumeOffset,
    nextResumeOffset,
    completed: nextResumeOffset >= audit.totalDecisions,
    totalDecisions: audit.totalDecisions,
    processedDecisions: audit.processedDecisions,
    batches: audit.batches,
    total: results.length,
    dryRun: results.filter(result => result.status === 'dry_run').length,
    applied: results.filter(result => result.status === 'applied').length,
    noop: results.filter(result => result.status === 'noop').length,
    skipped: results.filter(result => result.status === 'skipped').length,
    errors: results.filter(result => result.status === 'error').length,
    results,
  };
}

function parseArgs(args) {
  const options = {
    file: null,
    execute: false,
    limit: 500,
    batchSize: 50,
    resumeOffset: 0,
    summaryOutputPath: null,
  };

  for (const arg of args) {
    if (arg === '--execute') options.execute = true;
    if (arg.startsWith('--file=')) options.file = arg.slice('--file='.length);
    if (arg.startsWith('--limit=')) options.limit = clampInteger(arg.slice('--limit='.length), 1, 5000, options.limit);
    if (arg.startsWith('--batch-size=')) options.batchSize = clampInteger(arg.slice('--batch-size='.length), 1, 500, options.batchSize);
    if (arg.startsWith('--resume-offset=')) options.resumeOffset = clampInteger(arg.slice('--resume-offset='.length), 0, 1000000, options.resumeOffset);
    if (arg.startsWith('--summary-output=')) options.summaryOutputPath = arg.slice('--summary-output='.length);
  }

  options.batchSize = Math.min(options.batchSize, options.limit);
  return options;
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function stringOrNull(value) {
  return typeof value === 'string' ? value.trim() : null;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
