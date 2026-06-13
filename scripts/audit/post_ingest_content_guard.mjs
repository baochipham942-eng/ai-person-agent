/**
 * Refresh lightweight audit artifacts and run the content guard.
 *
 * Read-only for product data. This script queries the DB and updates audit
 * reports under docs/audit-2026-06, but it does not fetch sources, call models,
 * delete rows, or mutate People/RawPoolItem/Card/Relation data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const OUT = getArg('--out') || 'docs/audit-2026-06/data/post_ingest_content_guard.json';
const REPORT_OUT = getArg('--report-out') || 'docs/audit-2026-06/POST_INGEST_CONTENT_GUARD.md';

function getArg(name) {
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function tail(text, maxLines = 60) {
  return String(text || '').trim().split(/\r?\n/).filter(Boolean).slice(-maxLines).join('\n');
}

function runStep(label, command, commandArgs) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, commandArgs, {
    cwd: ROOT,
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10,
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  const ok = !result.error && result.status === 0;

  if (verbose && output.trim()) {
    console.log(`\n# ${label}`);
    console.log(tail(output, 100));
  }

  return {
    label,
    command: [command, ...commandArgs].join(' '),
    ok,
    status: result.status,
    error: result.error?.message || null,
    startedAt,
    finishedAt: new Date().toISOString(),
    outputTail: tail(output),
  };
}

function writeOutputs(payload) {
  fs.mkdirSync(path.dirname(path.join(ROOT, OUT)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(payload, null, 2)}\n`);

  const lines = [
    '# Post-Ingest Content Guard',
    '',
    `Generated at: ${payload.generatedAt}`,
    `Status: ${payload.ok ? 'passed' : 'failed'}`,
    '',
    '## Steps',
    '',
    '| Step | Result | Command |',
    '| --- | --- | --- |',
    ...payload.steps.map((step) => [
      step.label,
      step.ok ? 'passed' : 'failed',
      `\`${step.command.replace(/\|/g, '\\|')}\``,
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |')),
    '',
    '## Output Tails',
    '',
    ...payload.steps.flatMap((step) => [
      `### ${step.label}`,
      '',
      '```text',
      step.outputTail || '(empty)',
      '```',
      '',
    ]),
    '## Scope',
    '',
    '- Queries DB and refreshes audit artifacts only.',
    '- Does not fetch remote sources, call models, delete RawPoolItem, or mutate product tables.',
    '- Intended to run after new imports, source writes, relation/career writes, or card generation.',
    '',
  ];

  fs.writeFileSync(path.join(ROOT, REPORT_OUT), `${lines.join('\n')}\n`);
}

const steps = [
  runStep('prune unresolved refresh', 'node', [
    'scripts/audit/export_prune_tail_review_unresolved.mjs',
    '--out=docs/audit-2026-06/data/prune_tail_review_unresolved_rows.json',
    '--report-out=docs/audit-2026-06/PRUNE_TAIL_REVIEW_UNRESOLVED.md',
  ]),
  runStep('career normalization refresh', 'bun', [
    'scripts/audit/audit_career_normalization.ts',
    '--out=docs/audit-2026-06/data/career_normalization_audit.json',
  ]),
  runStep('career buckets refresh', 'bun', [
    'scripts/audit/export_career_review_buckets.ts',
    '--input=docs/audit-2026-06/data/career_normalization_audit.json',
    '--out=docs/audit-2026-06/data/career_review_buckets.json',
  ]),
  runStep('relation review refresh', 'bun', [
    'scripts/audit/export_relation_review.ts',
    '--out=docs/audit-2026-06/data/relation_review.json',
  ]),
  runStep('relation buckets refresh', 'bun', [
    'scripts/audit/export_relation_review_buckets.ts',
    '--input=docs/audit-2026-06/data/relation_review.json',
    '--out=docs/audit-2026-06/data/relation_review_buckets_after_org_review_second.json',
  ]),
  runStep('card reaggregation current verify', 'node', [
    'scripts/fix/apply_card_reaggregation_plan.mjs',
    '--out=docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_current_verify_log.json',
    '--archive=docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_current_verify_archive.json',
    '--report-out=docs/audit-2026-06/CARD_REAGGREGATION_CURRENT_VERIFY.md',
  ]),
  runStep('conservative rewrite dry-run', 'bun', [
    'scripts/fix/apply_product_review_decisions.ts',
    '--decisions=docs/audit-2026-06/data/exa_source_quality_review_dir/conservative_rewrite_decisions_draft.json',
  ]),
  runStep('content guard', 'node', [
    'scripts/audit/check_content_review_guardrails.mjs',
  ]),
];

const payload = {
  generatedAt: new Date().toISOString(),
  ok: steps.every((step) => step.ok),
  steps,
  out: OUT,
  reportOut: REPORT_OUT,
};

writeOutputs(payload);

if (!payload.ok) {
  console.error('Post-ingest content guard failed:');
  for (const step of steps.filter((item) => !item.ok)) {
    console.error(`- ${step.label}: ${step.error || `exit ${step.status}`}`);
    if (step.outputTail) console.error(step.outputTail);
  }
  process.exit(1);
}

console.log('Post-ingest content guard passed:');
for (const step of steps) console.log(`- ${step.label}`);
