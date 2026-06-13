/**
 * Apply manual hard-tail source decisions.
 *
 * Default is dry-run. Execute mode writes QAAuditLog verdicts and deletes only
 * RawPoolItem rows explicitly marked delete_raw_pool_item.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const INPUT = getArg('--in')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/hard_tail_manual_decisions.json';
const OUT = getArg('--out')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/hard_tail_manual_apply_log.json';
const ARCHIVE = getArg('--archive')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/hard_tail_manual_apply_archive.json';
const REPORT_OUT = getArg('--report-out')
  || 'docs/audit-2026-06/HARD_TAIL_MANUAL_APPLY.md';
const STAGE = getArg('--stage') || 'manual_hard_tail';
const EXECUTE = process.argv.includes('--execute');

loadExtraEnv();

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function loadExtraEnv() {
  for (const file of [
    path.join(os.homedir(), '.code-agent/.env'),
    path.resolve('.env'),
    path.resolve('.env.local'),
  ]) {
    try {
      const parsed = dotenv.parse(fs.readFileSync(file));
      for (const [key, value] of Object.entries(parsed)) {
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      // Optional env file.
    }
  }
}

function compact(text, max = 140) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function mdEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
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
    ORDER BY p.name ASC, raw.title ASC
  `;
}

async function insertAudit(decision, raw) {
  await sql`
    INSERT INTO "QAAuditLog" (
      id,
      "personId",
      url,
      "urlHash",
      "sourceType",
      stage,
      verdict,
      "aboutPerson",
      "aiRelevant",
      quality,
      reason
    )
    VALUES (
      ${crypto.randomUUID()},
      ${raw.personId},
      ${raw.url},
      ${raw.urlHash},
      ${raw.sourceType},
      ${STAGE},
      ${decision.verdict},
      ${decision.verdict === 'keep' ? 0.9 : 0.05},
      ${decision.verdict === 'keep' ? 0.8 : 0.2},
      ${decision.verdict === 'keep' ? 0.65 : 0.05},
      ${decision.reason}
    )
  `;
}

function renderReport(summary, rows) {
  const title = summary.stage === 'manual_hard_tail'
    ? 'Hard Tail Manual Apply'
    : 'Manual RawPool Apply';
  const lines = [
    `# ${title}`,
    '',
    `Generated at: ${summary.generatedAt}`,
    `Mode: ${summary.mode}`,
    `Input: ${summary.input}`,
    `Archive: ${summary.archive}`,
    `Stage: ${summary.stage}`,
    '',
    '## Counts',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| decisions | ${summary.decisions} |`,
    `| existing targets | ${summary.existingTargets} |`,
    `| missing targets | ${summary.missingTargets} |`,
    `| audit rows ${summary.mode === 'execute' ? 'inserted' : 'to insert'} | ${summary.auditRowsInserted} |`,
    `| RawPoolItem rows ${summary.mode === 'execute' ? 'deleted' : 'to delete'} | ${summary.deleted} |`,
    '',
    '## Actions',
    '',
    '| Action | Count |',
    '| --- | ---: |',
    ...Object.entries(summary.byAction).map(([action, count]) => `| ${mdEscape(action)} | ${count} |`),
    '',
    '## Rows',
    '',
    '| Person | Target | Action | Exists | Reason |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map((row) => [
      row.decision.person,
      row.decision.target?.objectLabel || row.decision.target?.objectId || '',
      row.decision.action,
      row.raw ? 'yes' : 'no',
      compact(row.decision.reason, 180),
    ].map(mdEscape).join(' | ').replace(/^/, '| ').replace(/$/, ' |')),
    '',
  ];
  fs.writeFileSync(REPORT_OUT, `${lines.join('\n')}\n`);
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  const decisions = Array.isArray(payload.decisions) ? payload.decisions : [];
  const ids = [...new Set(decisions.map((row) => row.target?.objectId).filter(Boolean))];
  const rawRows = await loadRawRows(ids);
  const rawById = new Map(rawRows.map((row) => [row.id, row]));
  const rows = decisions.map((decision) => ({
    decision,
    raw: rawById.get(decision.target?.objectId) || null,
  }));

  const existingRows = rows.filter((row) => row.raw);
  const deleteRows = existingRows.filter((row) => row.decision.action === 'delete_raw_pool_item');
  const auditRows = existingRows.filter((row) => ['delete_raw_pool_item', 'keep_raw_pool_item'].includes(row.decision.action));

  let auditRowsInserted = auditRows.length;
  let deleted = deleteRows.length;

  if (EXECUTE) {
    for (const row of auditRows) {
      await insertAudit(row.decision, row.raw);
    }
    if (deleteRows.length) {
      const deletedRows = await sql`
        DELETE FROM "RawPoolItem"
        WHERE id = ANY(${deleteRows.map((row) => row.raw.id)}::text[])
        RETURNING id
      `;
      deleted = deletedRows.length;
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: EXECUTE ? 'execute' : 'dry-run',
    input: INPUT,
    archive: ARCHIVE,
    stage: STAGE,
    decisions: decisions.length,
    existingTargets: existingRows.length,
    missingTargets: rows.length - existingRows.length,
    auditRowsInserted,
    deleted,
    byAction: countBy(rows, (row) => row.decision.action),
    byVerdict: countBy(rows, (row) => row.decision.verdict),
    byPerson: countBy(rows, (row) => row.decision.person),
  };

  const archivePayload = {
    generatedAt: summary.generatedAt,
    summary,
    rows,
  };

  fs.mkdirSync(path.dirname(ARCHIVE), { recursive: true });
  fs.writeFileSync(ARCHIVE, `${JSON.stringify(archivePayload, null, 2)}\n`);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify({ generatedAt: summary.generatedAt, summary }, null, 2)}\n`);
  renderReport(summary, rows);

  console.log(JSON.stringify({
    out: OUT,
    archive: ARCHIVE,
    reportOut: REPORT_OUT,
    summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
