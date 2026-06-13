/**
 * Apply manual card/source decisions after source QA.
 *
 * Default is dry-run. Execute mode can archive active cards, update a card
 * source URL, repair a RawPoolItem, or delete a RawPoolItem. All RawPoolItem
 * keep/reject decisions write QAAuditLog rows.
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
  || 'docs/audit-2026-06/data/card_source_manual_decisions_after_refetch.json';
const OUT = getArg('--out')
  || 'docs/audit-2026-06/data/card_source_manual_apply_log.json';
const ARCHIVE = getArg('--archive')
  || 'docs/audit-2026-06/data/card_source_manual_apply_archive.json';
const REPORT_OUT = getArg('--report-out')
  || 'docs/audit-2026-06/CARD_SOURCE_MANUAL_APPLY.md';
const STAGE = getArg('--stage') || 'manual_card_source_after_refetch';
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

function sha256(text) {
  return crypto.createHash('sha256').update(String(text || '')).digest('hex');
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

async function loadCard(id) {
  const rows = await sql`
    SELECT c.*, p.name AS person
    FROM "Card" c
    JOIN "People" p ON p.id = c."personId"
    WHERE c.id = ${id}
  `;
  return rows[0] || null;
}

async function loadRaw(id) {
  const rows = await sql`
    SELECT r.*, p.name AS person
    FROM "RawPoolItem" r
    JOIN "People" p ON p.id = r."personId"
    WHERE r.id = ${id}
  `;
  return rows[0] || null;
}

async function insertAudit(raw, verdict, reason, sourceType = raw.sourceType) {
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
      ${sourceType},
      ${STAGE},
      ${verdict},
      ${verdict === 'keep' ? 0.9 : 0.05},
      ${verdict === 'keep' ? 0.7 : 0.1},
      ${verdict === 'keep' ? 0.65 : 0.05},
      ${reason}
    )
  `;
}

async function applyDecision(decision, before) {
  if (decision.action === 'archive_card') {
    if (!before.card?.isActive) return { applied: false, skippedReason: 'card_not_active' };
    await sql`
      UPDATE "Card"
      SET "isActive" = false,
          "archivedAt" = NOW(),
          "updatedAt" = NOW()
      WHERE id = ${decision.cardId}
        AND "isActive" = true
    `;
    return { applied: true };
  }

  if (decision.action === 'update_card_source') {
    if (!before.card?.isActive) return { applied: false, skippedReason: 'card_not_active' };
    if (decision.fromSourceUrl && before.card.sourceUrl !== decision.fromSourceUrl) {
      return { applied: false, skippedReason: 'source_url_mismatch' };
    }
    await sql`
      UPDATE "Card"
      SET "sourceUrl" = ${decision.toSourceUrl},
          "updatedAt" = NOW()
      WHERE id = ${decision.cardId}
    `;
    return { applied: true };
  }

  if (decision.action === 'update_raw_item') {
    if (!before.raw) return { applied: false, skippedReason: 'missing_raw' };
    const nextSourceType = decision.sourceType || before.raw.sourceType;
    const nextMetadata = {
      ...(before.raw.metadata || {}),
      manualCardSourceFix: {
        stage: STAGE,
        reason: decision.reason,
        evidenceUrl: decision.evidenceUrl || null,
      },
    };
    await sql`
      UPDATE "RawPoolItem"
      SET title = ${decision.title ?? before.raw.title},
          text = ${decision.text ?? before.raw.text},
          "sourceType" = ${nextSourceType},
          "contentHash" = ${sha256(decision.text ?? before.raw.text)},
          metadata = ${JSON.stringify(nextMetadata)}::jsonb,
          "fetchStatus" = ${'success'},
          "errorCode" = NULL,
          "fetchedAt" = NOW()
      WHERE id = ${decision.rawId}
    `;
    await insertAudit({ ...before.raw, sourceType: nextSourceType }, 'keep', decision.reason, nextSourceType);
    return { applied: true };
  }

  if (decision.action === 'delete_raw_pool_item') {
    if (!before.raw) return { applied: false, skippedReason: 'missing_raw' };
    await insertAudit(before.raw, 'reject', decision.reason);
    const deleted = await sql`
      DELETE FROM "RawPoolItem"
      WHERE id = ${decision.rawId}
      RETURNING id
    `;
    return { applied: deleted.length === 1 };
  }

  throw new Error(`Unsupported action: ${decision.action}`);
}

async function beforeFor(decision) {
  const [card, raw] = await Promise.all([
    decision.cardId ? loadCard(decision.cardId) : Promise.resolve(null),
    decision.rawId ? loadRaw(decision.rawId) : Promise.resolve(null),
  ]);
  return { card, raw };
}

function renderReport(summary, rows) {
  const lines = [
    '# Card Source Manual Apply',
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
    `| applicable | ${summary.applicable} |`,
    `| applied | ${summary.applied} |`,
    `| skipped | ${summary.skipped} |`,
    '',
    '## Actions',
    '',
    '| Action | Count |',
    '| --- | ---: |',
    ...Object.entries(summary.byAction).map(([action, count]) => `| ${mdEscape(action)} | ${count} |`),
    '',
    '## Rows',
    '',
    '| Person | Action | Target | Applicable | Applied | Reason |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map((row) => [
      row.decision.person,
      row.decision.action,
      row.before.card?.title || row.before.raw?.title || row.decision.cardId || row.decision.rawId,
      row.applicable ? 'yes' : 'no',
      row.result?.applied ? 'yes' : 'no',
      row.result?.skippedReason || compact(row.decision.reason, 180),
    ].map(mdEscape).join(' | ').replace(/^/, '| ').replace(/$/, ' |')),
    '',
  ];
  fs.writeFileSync(REPORT_OUT, `${lines.join('\n')}\n`);
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  const decisions = Array.isArray(payload.decisions) ? payload.decisions : [];
  const rows = [];

  for (const decision of decisions) {
    const before = await beforeFor(decision);
    const applicable = Boolean(
      decision.action === 'archive_card' ? before.card?.isActive
        : decision.action === 'update_card_source' ? before.card?.isActive
        : decision.action === 'update_raw_item' ? before.raw
        : decision.action === 'delete_raw_pool_item' ? before.raw
        : false,
    );
    const result = EXECUTE && applicable
      ? await applyDecision(decision, before)
      : { applied: false, skippedReason: applicable ? null : 'not_applicable' };
    rows.push({ decision, before, applicable, result });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: EXECUTE ? 'execute' : 'dry-run',
    input: INPUT,
    archive: ARCHIVE,
    stage: STAGE,
    decisions: decisions.length,
    applicable: rows.filter((row) => row.applicable).length,
    applied: rows.filter((row) => row.result?.applied).length,
    skipped: rows.filter((row) => !row.applicable || row.result?.skippedReason).length,
    byAction: countBy(rows, (row) => row.decision.action),
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
