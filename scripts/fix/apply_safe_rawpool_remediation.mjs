/**
 * Apply the safe subset of MiMo fact-claim remediation decisions.
 *
 * Default is dry-run. The only executable action is deleting RawPoolItem rows
 * that passed the strict safe-auto-apply gate:
 * - safeToAutoApply = true
 * - claimType = source_item_belongs_to_person
 * - verdict = wrong_person | unsupported
 * - remediationAction = delete_raw_pool_item
 * - confidence >= 0.85
 *
 * Usage:
 *   node scripts/fix/apply_safe_rawpool_remediation.mjs
 *   node scripts/fix/apply_safe_rawpool_remediation.mjs --execute
 *   node scripts/fix/apply_safe_rawpool_remediation.mjs --verdicts=wrong_person
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const INPUT = getArg('--in') || 'docs/audit-2026-06/data/fact_claim_remediation_mimo_summary.json';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/safe_rawpool_remediation_apply_log.json';
const ARCHIVE = getArg('--archive') || 'docs/audit-2026-06/data/safe_rawpool_remediation_archive.json';
const EXECUTE = process.argv.includes('--execute');
const VERDICT_FILTER = (getArg('--verdicts') || '')
  .split(',')
  .map((verdict) => verdict.trim())
  .filter(Boolean);
const ACTIVE_VERDICTS = VERDICT_FILTER.length ? VERDICT_FILTER : ['wrong_person', 'unsupported'];

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function groupCount(rows, getKey) {
  return rows.reduce((acc, row) => {
    const key = getKey(row);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function topEntries(counts, limit = 25) {
  return Object.fromEntries(
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit),
  );
}

function loadSafeQueue() {
  const payload = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  const rows = Array.isArray(payload.safeAutoApplyQueue) ? payload.safeAutoApplyQueue : [];
  const safeRows = rows.filter((row) => (
    row.safeToAutoApply === true
    && row.claimType === 'source_item_belongs_to_person'
    && ACTIVE_VERDICTS.includes(row.verdict)
    && row.remediationAction === 'delete_raw_pool_item'
    && Number(row.confidence) >= 0.85
    && row.target?.objectId
  ));

  const rejected = rows.filter((row) => !safeRows.includes(row));
  const ids = [...new Set(safeRows.map((row) => row.target.objectId))];
  return { payload, safeRows, rejected, ids };
}

async function loadRawRows(ids) {
  if (!ids.length) return [];
  return await sql`
    SELECT
      raw.id,
      raw."personId",
      p.name AS person,
      raw."sourceType",
      raw.url,
      raw."urlHash",
      raw."contentHash",
      raw.title,
      raw.text,
      raw."publishedAt",
      raw.metadata,
      raw."fetchStatus",
      raw."errorCode",
      raw."fetchedAt",
      raw.processed
    FROM "RawPoolItem" raw
    JOIN "People" p ON p.id = raw."personId"
    WHERE raw.id = ANY(${ids}::text[])
    ORDER BY p.name ASC, raw."sourceType" ASC, raw.title ASC
  `;
}

async function main() {
  const { safeRows, rejected, ids } = loadSafeQueue();
  const rawRows = await loadRawRows(ids);
  const existingIds = new Set(rawRows.map((row) => row.id));
  const missingIds = ids.filter((id) => !existingIds.has(id));

  const decisionByRawId = new Map(safeRows.map((row) => [row.target.objectId, row]));
  const archiveRows = rawRows.map((raw) => ({
    raw,
    decision: decisionByRawId.get(raw.id) || null,
  }));

  const summary = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    input: INPUT,
    safeDecisions: safeRows.length,
    rejectedSafeQueueRows: rejected.length,
    uniqueTargetIds: ids.length,
    existingTargets: rawRows.length,
    missingTargets: missingIds.length,
    deleted: 0,
    affectedPeople: Object.keys(groupCount(rawRows, (row) => row.personId)).length,
    bySourceType: groupCount(rawRows, (row) => row.sourceType),
    byVerdict: groupCount(safeRows, (row) => row.verdict),
    topPeople: topEntries(groupCount(rawRows, (row) => row.person)),
  };

  const archivePayload = {
    generatedAt: new Date().toISOString(),
    criteria: {
      safeToAutoApply: true,
      claimType: 'source_item_belongs_to_person',
      verdict: ACTIVE_VERDICTS,
      remediationAction: 'delete_raw_pool_item',
      confidence: '>= 0.85',
      destructiveAction: EXECUTE ? 'deleted RawPoolItem rows only' : 'dry-run only',
    },
    summary,
    missingIds,
    rows: archiveRows,
  };

  fs.mkdirSync(path.dirname(ARCHIVE), { recursive: true });
  fs.writeFileSync(ARCHIVE, `${JSON.stringify(archivePayload, null, 2)}\n`);

  if (EXECUTE && rawRows.length > 0) {
    const deletedRows = await sql`
      DELETE FROM "RawPoolItem"
      WHERE id = ANY(${rawRows.map((row) => row.id)}::text[])
      RETURNING id
    `;
    summary.deleted = deletedRows.length;
  }

  const reportPayload = {
    generatedAt: new Date().toISOString(),
    archive: ARCHIVE,
    summary,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(reportPayload, null, 2)}\n`);

  console.log(JSON.stringify({
    out: OUT,
    archive: ARCHIVE,
    summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
