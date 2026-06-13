#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const config = JSON.parse(fs.readFileSync(path.join(repoRoot, 'lib/influence-scoring-config.json'), 'utf8'));
const prisma = new PrismaClient();

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const APPLY_SCORE = args.includes('--apply-score');
const LIMIT = clampInteger(readNumberArg('--limit', 24), 1, 24);
const BATCH_SIZE = clampInteger(readNumberArg('--batch-size', 8), 1, 8);
const PERSON_ID = readStringArg('--person-id');
const STATUS = readStringArg('--status') || 'all';
const RESUME_AFTER_PERSON_ID = readStringArg('--resume-after-person-id');
const DECISION_TEMPLATE_PATH = readStringArg('--decision-template');
const DECISIONS_PATH = readStringArg('--decisions');
const SUMMARY_OUTPUT_PATH = readStringArg('--summary-output');
const REVIEWER = readStringArg('--reviewer') || 'script';
const REASON = readStringArg('--reason');
const decisionsPayload = DECISIONS_PATH ? readDecisionPayload(DECISIONS_PATH) : null;
const decisionRows = Array.isArray(decisionsPayload?.decisions) ? decisionsPayload.decisions : [];
const decisionPersonIds = uniqueStrings(decisionRows.map(decision => stringOrNull(decision.personId)).filter(Boolean));

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

async function main() {
  const where = PERSON_ID
    ? { id: PERSON_ID }
    : decisionPersonIds.length > 0
      ? { id: { in: decisionPersonIds } }
    : { status: { in: ['ready', 'active'] } };
  const people = await prisma.people.findMany({
    where,
    select: {
      id: true,
      name: true,
      influenceScore: true,
      citationCount: true,
      hIndex: true,
      githubStars: true,
      weeklyViewCount: true,
      products: true,
      cards: {
        where: { isActive: true },
        select: { sourceUrl: true },
      },
      roles: {
        select: { endDate: true },
      },
    },
    orderBy: [{ influenceScore: 'desc' }, { name: 'asc' }],
    take: PERSON_ID || decisionPersonIds.length > 0 ? Math.max(decisionPersonIds.length, 1) : Math.max(LIMIT * 3, LIMIT),
  });

  const personIds = people.map(person => person.id);
  const sourceTypeGroups = personIds.length
    ? await prisma.rawPoolItem.groupBy({
        by: ['personId', 'sourceType'],
        where: { personId: { in: personIds } },
        _count: true,
      })
    : [];
  const sourceTypeCountsByPerson = new Map();
  for (const group of sourceTypeGroups) {
    const counts = sourceTypeCountsByPerson.get(group.personId) || {};
    counts[group.sourceType] = group._count;
    sourceTypeCountsByPerson.set(group.personId, counts);
  }

  const allRows = people.map(person => {
    const scoreResult = computeInfluenceScore({
      citationCount: person.citationCount,
      hIndex: person.hIndex,
      githubStars: person.githubStars,
      weeklyViewCount: person.weeklyViewCount,
      products: normalizeProducts(person.products),
      personRoles: person.roles,
      cards: person.cards,
      sourceTypeCounts: sourceTypeCountsByPerson.get(person.id) || {},
    });
    const computedScore = Number(scoreResult.weightedScore.toFixed(1));
    const storedScore = Number(person.influenceScore || 0);
    const delta = Number((computedScore - storedScore).toFixed(1));
    return {
      personId: person.id,
      name: person.name,
      storedScore,
      computedScore,
      delta,
      absDelta: Math.abs(delta),
      status: classifyDelta(Math.abs(delta)),
      scoreResult,
    };
  });
  const outputRows = buildOutputRows(allRows);
  const rankedRows = DECISIONS_PATH
    ? outputRows
    : outputRows
      .sort((left, right) => right.absDelta - left.absDelta || right.storedScore - left.storedScore || left.name.localeCompare(right.name));
  const resumeIndex = RESUME_AFTER_PERSON_ID
    ? rankedRows.findIndex(row => row.personId === RESUME_AFTER_PERSON_ID)
    : -1;
  const rows = rankedRows
    .slice(resumeIndex >= 0 ? resumeIndex + 1 : 0)
    .slice(0, LIMIT);
  const nextResumeAfterPersonId = rows.length > 0 ? rows[rows.length - 1].personId : null;

  const summary = {
    mode: EXECUTE ? APPLY_SCORE ? 'execute_apply_score' : 'execute_audit_only' : 'dry_run',
    version: config.version,
    limit: LIMIT,
    batchSize: BATCH_SIZE,
    status: STATUS,
    resumeAfterPersonId: RESUME_AFTER_PERSON_ID || null,
    resumeAfterFound: RESUME_AFTER_PERSON_ID ? resumeIndex >= 0 : null,
    nextResumeAfterPersonId,
    decisions: decisionRows.length,
    scanned: people.length,
    returned: rows.length,
    largeGap: rows.filter(row => row.status === 'large_gap').length,
    review: rows.filter(row => row.status === 'review').length,
    aligned: rows.filter(row => row.status === 'aligned').length,
  };

  console.log(JSON.stringify(summary, null, 2));
  console.table(rows.map(row => ({
    name: row.name,
    stored: row.storedScore,
    computed: row.computedScore,
    delta: row.delta,
    status: row.status,
    decision: row.decisionAction || '',
  })));

  if (DECISION_TEMPLATE_PATH) {
    fs.writeFileSync(DECISION_TEMPLATE_PATH, JSON.stringify(buildDecisionTemplate(rows, summary), null, 2));
    console.error(`wrote influence decision template: ${DECISION_TEMPLATE_PATH}`);
  }

  if (DECISIONS_PATH) {
    const results = await replayDecisions(rows);
    const decisionSummary = summarizeDecisionResults(results);
    console.log(JSON.stringify(decisionSummary, null, 2));
    writeSummaryOutput({ summary, decisionSummary, rows });
    if (decisionSummary.errors > 0) process.exitCode = 1;
    return;
  }

  if (!EXECUTE) {
    writeSummaryOutput({ summary, rows });
    return;
  }

  for (const batch of chunkRows(rows, BATCH_SIZE)) {
    for (const row of batch) {
      await writeAuditRow(row, {
        status: APPLY_SCORE ? 'applied' : 'reviewed',
        appliedScore: APPLY_SCORE ? row.computedScore : null,
        reason: REASON || 'script calibration run',
        reviewer: REVIEWER,
        applyScore: APPLY_SCORE,
      });
    }
  }

  console.log(`wrote ${rows.length} influence score audit rows${APPLY_SCORE ? ' and updated People.influenceScore' : ''}`);
  writeSummaryOutput({ summary, rows });
}

function buildOutputRows(allRows) {
  if (!DECISIONS_PATH) {
    return allRows.filter(row => STATUS === 'all' || row.status === STATUS);
  }

  const rowsByPerson = new Map(allRows.map(row => [row.personId, row]));
  return decisionRows
    .map(decision => {
      const personId = stringOrNull(decision.personId);
      const row = personId ? rowsByPerson.get(personId) : null;
      if (!row) {
        return {
          personId: personId || '',
          name: stringOrNull(decision.personName) || personId || 'unknown',
          storedScore: 0,
          computedScore: 0,
          delta: 0,
          absDelta: 0,
          status: 'missing',
          scoreResult: null,
          decision,
          decisionAction: stringOrNull(decision.action) || 'unknown',
          decisionError: 'person not found in current calibration query',
        };
      }
      return {
        ...row,
        decision,
        decisionAction: normalizeDecisionAction(decision),
      };
    });
}

function buildDecisionTemplate(rows, summary) {
  return {
    generatedAt: new Date().toISOString(),
    scoreVersion: config.version,
    mode: summary.mode,
    instructions: [
      'Set action to reviewed, ignored, or applied.',
      'Use applied only after manual review; score changes still require --execute --apply-score.',
      'Leave calibratedScore empty to use computedScore when applying.',
      'Default replay is dry-run. Add --execute to write audit logs.',
    ],
    decisions: rows.map(row => ({
      action: row.status === 'aligned' ? 'reviewed' : 'reviewed',
      personId: row.personId,
      personName: row.name,
      storedScore: row.storedScore,
      computedScore: row.computedScore,
      delta: row.delta,
      status: row.status,
      calibratedScore: null,
      reviewer: '',
      reason: '',
      notes: '',
    })),
  };
}

async function replayDecisions(rows) {
  const results = [];
  for (const batch of chunkRows(rows, BATCH_SIZE)) {
    for (const row of batch) {
      try {
        if (row.decisionError) {
          results.push({
            personId: row.personId,
            personName: row.name,
            action: row.decisionAction,
            status: 'error',
            reason: row.decisionError,
          });
          continue;
        }

        const action = normalizeDecisionAction(row.decision);
        if (!action) {
          results.push({
            personId: row.personId,
            personName: row.name,
            action: stringOrNull(row.decision?.action) || 'unknown',
            status: 'skipped',
            reason: 'unsupported action',
          });
          continue;
        }

        const calibratedScore = numberOrNull(row.decision?.calibratedScore);
        const appliedScore = action === 'applied' ? clampScore(calibratedScore ?? row.computedScore) : null;
        const applyScore = action === 'applied' && APPLY_SCORE;
        if (action === 'applied' && EXECUTE && !APPLY_SCORE) {
          results.push({
            personId: row.personId,
            personName: row.name,
            action,
            status: 'skipped',
            reason: 'applied decisions require --apply-score to change People.influenceScore',
            before: row.storedScore,
            computedScore: row.computedScore,
            appliedScore,
          });
          continue;
        }

        if (EXECUTE) {
          await writeAuditRow(row, {
            status: action,
            appliedScore,
            reason: stringOrNull(row.decision?.reason) || REASON || 'decision file calibration',
            reviewer: stringOrNull(row.decision?.reviewer) || REVIEWER,
            applyScore,
          });
        }

        results.push({
          personId: row.personId,
          personName: row.name,
          action,
          status: EXECUTE ? applyScore ? 'applied' : 'audit_written' : 'dry_run',
          before: row.storedScore,
          computedScore: row.computedScore,
          appliedScore,
          reason: stringOrNull(row.decision?.reason) || null,
          reviewer: stringOrNull(row.decision?.reviewer) || REVIEWER,
        });
      } catch (error) {
        results.push({
          personId: row.personId,
          personName: row.name,
          action: row.decisionAction || 'unknown',
          status: 'error',
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
  return results;
}

async function writeAuditRow(row, options) {
  await prisma.$transaction(async tx => {
    if (options.applyScore && options.appliedScore !== null) {
      await tx.people.update({
        where: { id: row.personId },
        data: { influenceScore: options.appliedScore },
      });
    }

    await tx.influenceScoreAuditLog.create({
      data: {
        personId: row.personId,
        scoreVersion: row.scoreResult.version,
        previousScore: row.storedScore,
        computedScore: row.computedScore,
        appliedScore: options.appliedScore,
        dimensions: row.scoreResult.dimensions,
        signals: row.scoreResult.signals,
        weights: row.scoreResult.weights,
        status: options.status,
        reason: options.reason,
        reviewer: options.reviewer,
      },
    });
  });
}

function summarizeDecisionResults(results) {
  return {
    mode: EXECUTE ? APPLY_SCORE ? 'execute_apply_score_decisions' : 'execute_audit_decisions' : 'dry_run_decisions',
    batchSize: BATCH_SIZE,
    decisions: results.length,
    dryRun: results.filter(result => result.status === 'dry_run').length,
    auditWritten: results.filter(result => result.status === 'audit_written').length,
    applied: results.filter(result => result.status === 'applied').length,
    skipped: results.filter(result => result.status === 'skipped').length,
    errors: results.filter(result => result.status === 'error').length,
    results,
  };
}

function normalizeDecisionAction(decision) {
  const action = stringOrNull(decision?.action);
  if (action === 'review' || action === 'reviewed') return 'reviewed';
  if (action === 'ignore' || action === 'ignored') return 'ignored';
  if (action === 'apply_score' || action === 'applied') return 'applied';
  return null;
}

function clampScore(value) {
  return Math.min(config.scale, Math.max(0, value));
}

function computeInfluenceScore(input) {
  const signals = buildSignals(input);
  const weightsByKey = new Map(config.weights.map(weight => [weight.key, weight]));
  const dimensions = [
    {
      key: 'academic',
      score: clamp100(normalizeLog(signals.citationCount, 100000) * 65 + normalizeLinear(signals.hIndex, 100) * 35),
      signal: `${formatCompactNumber(signals.citationCount)} 引用 · H-index ${signals.hIndex}`,
    },
    {
      key: 'opensource',
      score: clamp100(normalizeLog(signals.githubStars, 200000) * 100),
      signal: `${formatCompactNumber(signals.githubStars)} GitHub stars`,
    },
    {
      key: 'industry',
      score: clamp100(signals.productCount * 18 + signals.roleCount * 8 + signals.currentRoleCount * 14),
      signal: `${signals.productCount} 个代表贡献 · ${signals.roleCount} 条履历`,
    },
    {
      key: 'content',
      score: clamp100(signals.mediaSignals * 5 + signals.sourceBackedCards * 6),
      signal: `${signals.mediaSignals} 条媒体/内容 · ${signals.sourceBackedCards} 张有源卡片`,
    },
    {
      key: 'recent',
      score: clamp100(signals.weeklyViewCount * 3 + signals.mediaSignals * 2),
      signal: `近 7 天 ${signals.weeklyViewCount} 次访问`,
    },
  ].map(dimension => {
    const weight = weightsByKey.get(dimension.key) || {};
    return {
      ...dimension,
      label: weight.label || dimension.key,
      weight: weight.weight || 0,
      note: weight.note || '',
    };
  });
  const weightedScore100 = dimensions.reduce((sum, dimension) => sum + dimension.score * dimension.weight, 0) / 100;
  const weightedScore = Math.min(config.scale, Math.max(0, weightedScore100));

  return {
    version: config.version,
    scale: config.scale,
    dimensions,
    weightedScore,
    weightedScore100,
    confidence: buildConfidence(signals),
    weights: config.weights,
    signals,
  };
}

function buildSignals(input) {
  const products = input.products || [];
  const personRoles = input.personRoles || [];
  const cards = input.cards || [];
  const sourceRows = input.sourceTypeCounts || {};
  const mediaSignals = (sourceRows.youtube || 0) + (sourceRows.podcast || 0) + (sourceRows.exa || 0);
  return {
    citationCount: safeNumber(input.citationCount),
    hIndex: safeNumber(input.hIndex),
    githubStars: safeNumber(input.githubStars),
    weeklyViewCount: safeNumber(input.weeklyViewCount),
    productCount: products.length,
    roleCount: personRoles.length,
    currentRoleCount: personRoles.filter(role => !role.endDate).length,
    mediaSignals,
    sourceBackedCards: cards.filter(card => card.sourceUrl).length,
  };
}

function buildConfidence(signals) {
  let confidence = 0.35;
  if (signals.citationCount > 0 || signals.hIndex > 0) confidence += 0.18;
  if (signals.githubStars > 0) confidence += 0.12;
  if (signals.productCount > 0) confidence += 0.14;
  if (signals.roleCount > 0) confidence += 0.12;
  if (signals.sourceBackedCards > 0) confidence += 0.09;
  return Math.min(1, Number(confidence.toFixed(2)));
}

function normalizeProducts(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(entry => entry && typeof entry === 'object' && typeof entry.name === 'string');
}

function classifyDelta(absDelta) {
  if (absDelta >= 20) return 'large_gap';
  if (absDelta >= 8) return 'review';
  return 'aligned';
}

function normalizeLog(value, max) {
  if (value <= 0) return 0;
  return Math.min(1, Math.log10(value + 1) / Math.log10(max + 1)) * 100;
}

function normalizeLinear(value, max) {
  if (value <= 0) return 0;
  return Math.min(1, value / max) * 100;
}

function clamp100(value) {
  return Math.min(100, Math.max(0, value));
}

function safeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function formatCompactNumber(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(value || 0);
}

function readStringArg(name) {
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1] || null;

  const prefix = `${name}=`;
  const paired = args.find(arg => arg.startsWith(prefix));
  return paired ? paired.slice(prefix.length) : null;
}

function readNumberArg(name, fallback) {
  const value = Number(readStringArg(name));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readDecisionPayload(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function stringOrNull(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function numberOrNull(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function uniqueStrings(values) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function chunkRows(rows, size) {
  const chunks = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

function writeSummaryOutput(payload) {
  if (!SUMMARY_OUTPUT_PATH) return;
  const safeRows = payload.rows.map(row => ({
    personId: row.personId,
    name: row.name,
    storedScore: row.storedScore,
    computedScore: row.computedScore,
    delta: row.delta,
    status: row.status,
    decisionAction: row.decisionAction || null,
  }));
  fs.writeFileSync(SUMMARY_OUTPUT_PATH, JSON.stringify({
    generatedAt: new Date().toISOString(),
    ...payload,
    rows: safeRows,
  }, null, 2));
  console.error(`wrote influence calibration summary: ${SUMMARY_OUTPUT_PATH}`);
}

function clampInteger(value, min, max) {
  const integer = Math.floor(value);
  if (!Number.isFinite(integer)) return min;
  return Math.min(max, Math.max(min, integer));
}
