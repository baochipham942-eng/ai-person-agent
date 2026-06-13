/**
 * Apply the strict subset from reject/review bucket analysis.
 *
 * Default is dry-run. Execute mode deletes only RawPoolItem rows listed in
 * strictDeleteCandidates from analyze_prune_reject_review_buckets.mjs.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const INPUT = getArg('--in') || 'docs/audit-2026-06/data/prune_reject_review_buckets.json';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/prune_reject_review_strict_apply_log.json';
const ARCHIVE = getArg('--archive') || 'docs/audit-2026-06/data/prune_reject_review_strict_archive.json';
const REPORT_OUT = getArg('--report-out') || 'docs/audit-2026-06/PRUNE_REJECT_REVIEW_STRICT_APPLY.md';
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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function compact(text, max = 140) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
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
      p.status,
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

function writeReport(summary, rows) {
  const lines = [
    '# Prune Reject / Review Strict Apply',
    '',
    `Generated at: ${summary.generatedAt}`,
    `Mode: ${summary.mode}`,
    `Input: ${summary.input}`,
    `Archive: ${summary.archive}`,
    '',
    '## Counts',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| strict candidates | ${summary.strictCandidates} |`,
    `| existing targets | ${summary.existingTargets} |`,
    `| missing targets | ${summary.missingTargets} |`,
    `| RawPoolItem rows ${summary.mode === 'execute' ? 'deleted' : 'to delete'} | ${summary.deleted} |`,
    '',
    '## Buckets',
    '',
    '| Bucket | Count |',
    '| --- | ---: |',
    ...Object.entries(summary.byBucket).map(([bucket, count]) => `| ${mdEscape(bucket)} | ${count} |`),
    '',
    '## Top People',
    '',
    '| Person | Count |',
    '| --- | ---: |',
    ...Object.entries(summary.topPeople).map(([person, count]) => `| ${mdEscape(person)} | ${count} |`),
    '',
    '## Samples',
    '',
    '| Person | Bucket | Source | Title | Reason | Exists |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.slice(0, 60).map((row) => [
      row.candidate.person,
      row.candidate.bucket,
      row.candidate.sourceType,
      compact(row.candidate.title, 80),
      compact(row.candidate.reason, 110),
      row.raw ? 'yes' : 'no',
    ].map(mdEscape).join(' | ').replace(/^/, '| ').replace(/$/, ' |')),
    '',
    '## Safety',
    '',
    '- Only `strictDeleteCandidates` from the read-only bucket analysis are targeted.',
    '- This deletes RawPoolItem rows only. QAAuditLog, People, Card, products, roles, and relations are not deleted.',
    '- Review rows and non-strict reject buckets are deferred.',
    '',
  ];
  fs.writeFileSync(REPORT_OUT, `${lines.join('\n')}\n`);
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  const candidates = Array.isArray(payload.strictDeleteCandidates) ? payload.strictDeleteCandidates : [];
  const ids = [...new Set(candidates.map((row) => row.rawId).filter(Boolean))];
  const rawRows = await loadRawRows(ids);
  const rawById = new Map(rawRows.map((row) => [row.id, row]));
  const rows = candidates.map((candidate) => ({
    candidate,
    raw: rawById.get(candidate.rawId) || null,
  }));
  const existingRows = rows.filter((row) => row.raw);
  let deleted = existingRows.length;

  if (EXECUTE && existingRows.length) {
    const deletedRows = await sql`
      DELETE FROM "RawPoolItem"
      WHERE id = ANY(${existingRows.map((row) => row.raw.id)}::text[])
      RETURNING id
    `;
    deleted = deletedRows.length;
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: EXECUTE ? 'execute' : 'dry-run',
    input: INPUT,
    archive: ARCHIVE,
    strictCandidates: candidates.length,
    existingTargets: existingRows.length,
    missingTargets: rows.length - existingRows.length,
    deleted,
    byBucket: countBy(rows, (row) => row.candidate.bucket),
    bySourceType: countBy(rows, (row) => row.candidate.sourceType),
    topPeople: Object.fromEntries(Object.entries(countBy(rows, (row) => row.candidate.person)).slice(0, 25)),
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
  writeReport(summary, rows);

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
