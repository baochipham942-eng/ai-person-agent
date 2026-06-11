/**
 * Build a second-pass refetch queue from unresolved/blocked refetch results.
 *
 * Read-only. The output is shaped like remediation rows and can be passed to
 * scripts/audit/refetch_source_remediation.mjs via --in.
 */
import fs from 'node:fs';
import path from 'node:path';

const INPUT = getArg('--in')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_exa_mimo.jsonl';
const OUT = getArg('--out')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_followup_queue.jsonl';
const SUMMARY_OUT = getArg('--summary-out')
  || OUT.replace(/\.jsonl$/i, '_summary.json');
const REPORT_OUT = getArg('--report-out')
  || 'docs/audit-2026-06/REFETCH_SOURCE_FOLLOWUP_QUEUE.md';
const INCLUDE_REPLACE_AUX_BLOCKERS = !process.argv.includes('--exclude-replace-aux-blockers');

const HARD_RETRY_BLOCKERS = new Set([
  'refetch_error',
  'no_candidates',
  'replacement_needs_primary_or_credible_source',
]);
const AUXILIARY_RETRY_BLOCKERS = new Set([
  'replacement_contains_auxiliary_low_authority_source',
]);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function compact(text, max = 140) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function uniq(values) {
  return [...new Set(values.map((value) => compact(value, 180)).filter(Boolean))];
}

function targetLabel(row) {
  return row.target?.objectLabel || row.target?.objectId || '';
}

function baseQueries(row) {
  const original = row.remediation?.sourceQueries || [];
  const proposed = row.proposedSourceQueries || [];
  const label = targetLabel(row);
  const evidence = row.remediation?.evidenceRequirements || [];
  const generated = [
    label ? `${row.person} ${label} official source` : '',
    label ? `${row.person} ${label} author role` : '',
    label ? `${row.person} ${label} interview transcript` : '',
    evidence[0] ? `${row.person} ${evidence[0]}` : '',
  ];
  return uniq([...proposed, ...original, ...generated]).slice(0, 6);
}

function retryReasons(row) {
  const reasons = [];
  if (['no_good_source', 'human_review'].includes(row.decision)) reasons.push(row.decision);
  const blockers = row.blockers || [];
  for (const blocker of blockers) {
    if (HARD_RETRY_BLOCKERS.has(blocker)) reasons.push(blocker);
    if (INCLUDE_REPLACE_AUX_BLOCKERS && AUXILIARY_RETRY_BLOCKERS.has(blocker)) reasons.push(blocker);
  }
  return uniq(reasons);
}

function shouldRetry(row) {
  return retryReasons(row).length > 0;
}

function buildRow(row) {
  const reasons = retryReasons(row);
  return {
    claimId: row.claimId,
    personId: row.personId,
    person: row.person,
    claimType: 'source_item_belongs_to_person',
    verdict: 'needs_source',
    reviewAction: 'needs_source',
    remediationAction: 'refetch_source',
    safeToAutoApply: false,
    confidence: 0,
    target: row.target,
    proposedValue: null,
    proposedText: null,
    sourceQueries: baseQueries(row),
    evidenceRequirements: row.remediation?.evidenceRequirements || [],
    rationale: [
      `Second-pass refetch after first-pass decision=${row.decision}.`,
      reasons.length ? `Retry reasons: ${reasons.join(', ')}.` : '',
      row.rationale ? `Prior rationale: ${compact(row.rationale, 260)}` : '',
    ].filter(Boolean).join(' '),
    blockers: ['manual_review_required', ...reasons],
    reviewedAt: new Date().toISOString(),
    reviewer: {
      provider: 'codex',
      model: 'build_refetch_followup_queue',
    },
    followup: {
      sourceResultDecision: row.decision,
      sourceResultConfidence: row.confidence,
      retryReasons: reasons,
      previousSelectedSources: (row.selectedSources || []).map((source) => ({
        url: source.url,
        title: source.title,
        host: source.host,
      })),
      previousBlockers: row.blockers || [],
      previousProvider: row.search?.provider || null,
      previousCandidateCount: row.search?.candidateCount || 0,
    },
  };
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
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ')
    .trim();
}

function renderReport(summary, rows) {
  const lines = [];
  lines.push('# Refetch Source Follow-up Queue');
  lines.push('');
  lines.push(`Generated at: ${summary.generatedAt}`);
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | ---: |');
  lines.push(`| input rows | ${summary.inputRows} |`);
  lines.push(`| follow-up rows | ${summary.followupRows} |`);
  lines.push(`| include auxiliary replace blockers | ${summary.includeReplaceAuxBlockers ? 'yes' : 'no'} |`);
  lines.push('');
  lines.push('## Retry Reasons');
  lines.push('');
  lines.push('| Reason | Count |');
  lines.push('| --- | ---: |');
  for (const [reason, count] of Object.entries(summary.byRetryReason)) {
    lines.push(`| ${mdEscape(reason)} | ${count} |`);
  }
  lines.push('');
  lines.push('## Sample');
  lines.push('');
  lines.push('| Person | Target | Reasons | Queries |');
  lines.push('| --- | --- | --- | --- |');
  for (const row of rows.slice(0, 40)) {
    lines.push([
      row.person,
      targetLabel(row),
      row.followup.retryReasons.join(', '),
      row.sourceQueries.slice(0, 3).join('<br>'),
    ].map(mdEscape).join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }
  lines.push('');
  lines.push('## Next Command');
  lines.push('');
  lines.push('```bash');
  lines.push('node scripts/audit/refetch_source_remediation.mjs \\');
  lines.push('  --in=docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_followup_queue.jsonl \\');
  lines.push('  --out=docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_followup_tavily_mimo.jsonl \\');
  lines.push('  --provider=tavily --tavily-search-depth=advanced --search-results=4 --limit=30 --resume --concurrency=1');
  lines.push('```');
  return `${lines.join('\n')}\n`;
}

function main() {
  const rows = readJsonl(INPUT);
  const followupRows = rows.filter(shouldRetry).map(buildRow);
  const summary = {
    generatedAt: new Date().toISOString(),
    input: INPUT,
    output: OUT,
    inputRows: rows.length,
    followupRows: followupRows.length,
    includeReplaceAuxBlockers: INCLUDE_REPLACE_AUX_BLOCKERS,
    bySourceDecision: countBy(followupRows, (row) => row.followup.sourceResultDecision),
    byRetryReason: countBy(followupRows.flatMap((row) => row.followup.retryReasons.map((reason) => ({ reason }))), (row) => row.reason),
    byPerson: countBy(followupRows, (row) => row.person),
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, followupRows.map((row) => JSON.stringify(row)).join('\n') + (followupRows.length ? '\n' : ''));
  fs.writeFileSync(SUMMARY_OUT, `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(REPORT_OUT, renderReport(summary, followupRows));
  console.log(JSON.stringify(summary, null, 2));
}

main();
