/**
 * Build manual delete decisions for original-review prune-tail rows after
 * refetch. Read-only.
 *
 * Default scope is conservative: rows from PRUNE_TAIL_REVIEW_UNRESOLVED whose
 * refetch curation ended as no_good_source and that have no active display
 * dependency.
 */
import fs from 'node:fs';
import path from 'node:path';

const INPUT = getArg('--in') || 'docs/audit-2026-06/data/prune_tail_review_unresolved_rows.json';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/prune_tail_review_manual_decisions.json';
const REPORT_OUT = getArg('--report-out') || 'docs/audit-2026-06/PRUNE_TAIL_REVIEW_MANUAL_DECISIONS.md';
const DECISIONS = new Set((getArg('--decisions') || 'no_good_source').split(',').map((item) => item.trim()).filter(Boolean));
const IDS = new Set((getArg('--ids') || '').split(',').map((item) => item.trim()).filter(Boolean));
const LIMIT = numberArg('--limit', 0);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function numberArg(name, fallback) {
  const raw = getArg(name);
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function compact(text, max = 180) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function mdEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function reasonFor(row) {
  return [
    '删除。',
    '该行原始 QA verdict 为 review，未进入自动删除。',
    `原始复核原因：${compact(row.originalReason, 220)}`,
    `Refetch curation 判为 ${row.curatedDecision}，原因：${compact(row.curatedReason, 260)}`,
    '已确认无 active Card.sourceUrl 或 People display/source JSON 依赖。',
  ].join(' ');
}

function decisionFor(row) {
  return {
    claimId: row.claimId,
    personId: row.personId,
    person: row.person,
    target: {
      objectType: 'RawPoolItem',
      objectId: row.rawId,
      objectLabel: row.originalTitle || row.originalUrl,
    },
    action: 'delete_raw_pool_item',
    verdict: 'reject',
    confidence: 0.82,
    reason: reasonFor(row),
    reviewedAt: new Date().toISOString(),
    reviewer: {
      provider: 'codex',
      model: 'prune_tail_review_manual_adjudication',
    },
    evidence: {
      batch: row.batch,
      refetchDecision: row.curatedDecision,
      latestVerdict: row.originalLatestVerdict,
      priority: row.priority,
      sourceType: row.sourceType,
      originalUrl: row.originalUrl,
    },
  };
}

function writeReport(payload) {
  const lines = [
    '# Prune Tail Review Manual Decisions',
    '',
    `Generated at: ${payload.generatedAt}`,
    `Input: ${payload.input}`,
    `Decision filter: ${IDS.size ? `explicit ids (${IDS.size})` : [...DECISIONS].join(', ')}`,
    '',
    '## Counts',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| input rows | ${payload.summary.inputRows} |`,
    `| dependency skipped | ${payload.summary.dependencySkipped} |`,
    `| decision rows | ${payload.decisions.length} |`,
    '',
    '## Source Type',
    '',
    '| Source | Count |',
    '| --- | ---: |',
    ...Object.entries(payload.bySourceType).map(([source, count]) => `| ${mdEscape(source)} | ${count} |`),
    '',
    '## People',
    '',
    '| Person | Count |',
    '| --- | ---: |',
    ...Object.entries(payload.byPerson).map(([person, count]) => `| ${mdEscape(person)} | ${count} |`),
    '',
    '## Decisions',
    '',
    '| Person | Source | Refetch | Target | Reason |',
    '| --- | --- | --- | --- | --- |',
    ...payload.selectedRows.map((row) => [
      row.person,
      row.sourceType,
      row.curatedDecision,
      compact(row.originalTitle || row.originalUrl, 90),
      compact(row.originalReason, 150),
    ].map(mdEscape).join(' | ').replace(/^/, '| ').replace(/$/, ' |')),
    '',
    '## Safety',
    '',
    '- This file only converts already-exported review rows into an explicit manual decision queue.',
    '- Rows with active Card.sourceUrl or People display/source JSON dependencies are skipped.',
    '- Apply with `apply_hard_tail_manual_decisions.mjs`; default mode there is dry-run.',
    '',
  ];
  fs.writeFileSync(REPORT_OUT, `${lines.join('\n')}\n`);
}

function main() {
  const input = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  const candidates = (input.rows || [])
    .filter((row) => (IDS.size ? IDS.has(row.rawId) : DECISIONS.has(row.curatedDecision)))
    .filter((row) => !row.dependency);
  const limitedRows = LIMIT > 0 ? candidates.slice(0, LIMIT) : candidates;
  const decisions = limitedRows.map(decisionFor);
  const payload = {
    generatedAt: new Date().toISOString(),
    input: INPUT,
    limit: LIMIT,
    summary: {
      inputRows: input.rows?.length || 0,
      dependencySkipped: (input.rows || [])
        .filter((row) => (IDS.size ? IDS.has(row.rawId) : DECISIONS.has(row.curatedDecision)) && row.dependency)
        .length,
      missingExplicitIds: IDS.size
        ? [...IDS].filter((id) => !(input.rows || []).some((row) => row.rawId === id)).length
        : 0,
      decisionRows: decisions.length,
    },
    byPerson: countBy(decisions, (row) => row.person),
    bySourceType: countBy(decisions, (row) => row.evidence?.sourceType),
    selectedRows: limitedRows,
    decisions,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  writeReport(payload);

  console.log(JSON.stringify({
    out: OUT,
    reportOut: REPORT_OUT,
    summary: payload.summary,
    bySourceType: payload.bySourceType,
  }, null, 2));
}

main();
