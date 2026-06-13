/**
 * Summarize iterative source-item safe-prune runs.
 *
 * Usage:
 *   node scripts/audit/summarize_source_prune_iterations.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const FINAL_CLAIMS = getArg('--claims') || 'docs/audit-2026-06/data/fact_claims_source_items_after_ninth_safe_prune.jsonl';
const OUT_JSON = getArg('--out-json') || 'docs/audit-2026-06/data/source_item_safe_prune_status.json';
const OUT_MD = getArg('--out-md') || 'docs/audit-2026-06/SOURCE_ITEM_SAFE_PRUNE_STATUS.md';

const REVIEW_FILES = [
  'docs/audit-2026-06/data/fact_claim_reviews_source_item_high_mimo.jsonl',
  'docs/audit-2026-06/data/fact_claim_reviews_source_item_new_high_after_safe_prune_mimo.jsonl',
  'docs/audit-2026-06/data/fact_claim_reviews_source_item_second_new_high_after_safe_prune_mimo.jsonl',
  'docs/audit-2026-06/data/fact_claim_reviews_source_item_third_new_high_after_safe_prune_mimo.jsonl',
  'docs/audit-2026-06/data/fact_claim_reviews_source_item_fourth_new_high_after_safe_prune_mimo.jsonl',
  'docs/audit-2026-06/data/fact_claim_reviews_source_item_fifth_new_high_after_safe_prune_mimo.jsonl',
  'docs/audit-2026-06/data/fact_claim_reviews_source_item_sixth_new_high_after_safe_prune_mimo.jsonl',
  'docs/audit-2026-06/data/fact_claim_reviews_source_item_seventh_new_high_after_safe_prune_mimo.jsonl',
  'docs/audit-2026-06/data/fact_claim_reviews_source_item_eighth_new_high_after_safe_prune_mimo.jsonl',
];

const APPLY_LOGS = [
  'docs/audit-2026-06/data/safe_rawpool_remediation_apply_log.json',
  'docs/audit-2026-06/data/safe_rawpool_remediation_new_high_after_safe_prune_apply_log.json',
  'docs/audit-2026-06/data/safe_rawpool_remediation_second_new_high_after_safe_prune_apply_log.json',
  'docs/audit-2026-06/data/safe_rawpool_remediation_third_new_high_after_safe_prune_apply_log.json',
  'docs/audit-2026-06/data/safe_rawpool_remediation_fourth_new_high_after_safe_prune_apply_log.json',
  'docs/audit-2026-06/data/safe_rawpool_remediation_fifth_new_high_after_safe_prune_apply_log.json',
  'docs/audit-2026-06/data/safe_rawpool_remediation_sixth_new_high_after_safe_prune_apply_log.json',
  'docs/audit-2026-06/data/safe_rawpool_remediation_seventh_new_high_after_safe_prune_apply_log.json',
  'docs/audit-2026-06/data/safe_rawpool_remediation_eighth_new_high_after_safe_prune_apply_log.json',
];

const EXPORT_SUMMARIES = [
  'docs/audit-2026-06/data/fact_claims_source_items_after_safe_prune_summary.json',
  'docs/audit-2026-06/data/fact_claims_source_items_after_second_safe_prune_summary.json',
  'docs/audit-2026-06/data/fact_claims_source_items_after_third_safe_prune_summary.json',
  'docs/audit-2026-06/data/fact_claims_source_items_after_fourth_safe_prune_summary.json',
  'docs/audit-2026-06/data/fact_claims_source_items_after_fifth_safe_prune_summary.json',
  'docs/audit-2026-06/data/fact_claims_source_items_after_sixth_safe_prune_summary.json',
  'docs/audit-2026-06/data/fact_claims_source_items_after_seventh_safe_prune_summary.json',
  'docs/audit-2026-06/data/fact_claims_source_items_after_eighth_safe_prune_summary.json',
  'docs/audit-2026-06/data/fact_claims_source_items_after_ninth_safe_prune_summary.json',
];

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function topEntries(counts, limit = 20) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function table(rows, columns) {
  const header = `| ${columns.map((col) => col.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((col) => String(col.value(row) ?? '').replace(/\n/g, '<br>')).join(' | ')} |`);
  return [header, divider, ...body].join('\n');
}

function main() {
  const finalClaims = readJsonl(FINAL_CLAIMS);
  const finalHighClaims = finalClaims.filter((claim) => claim.priority === 'high');
  const finalHighIds = new Set(finalHighClaims.map((claim) => claim.claimId));
  const finalHighById = new Map(finalHighClaims.map((claim) => [claim.claimId, claim]));

  const reviewRows = REVIEW_FILES.flatMap((filePath) => readJsonl(filePath).map((review) => ({ ...review, reviewFile: filePath })));
  const reviewById = new Map();
  for (const review of reviewRows) {
    if (!reviewById.has(review.claimId)) reviewById.set(review.claimId, review);
  }
  const finalHighReviews = finalHighClaims.map((claim) => reviewById.get(claim.claimId)).filter(Boolean);
  const unreviewedFinalHigh = finalHighClaims.filter((claim) => !reviewById.has(claim.claimId));
  const finalProblemReviews = finalHighReviews.filter((review) => review.verdict !== 'supported');

  const applyRuns = APPLY_LOGS.map((filePath, index) => {
    const payload = readJson(filePath);
    return {
      wave: index + 1,
      filePath,
      ...payload.summary,
    };
  });

  const exportRuns = EXPORT_SUMMARIES.map((filePath, index) => {
    const payload = readJson(filePath);
    return {
      wave: index + 1,
      filePath,
      claims: payload.claims,
      high: payload.byPriority?.high || 0,
      low: payload.byPriority?.low || 0,
    };
  });

  const deletedTotal = applyRuns.reduce((sum, run) => sum + (run.deleted || 0), 0);
  const deletedBySourceType = {};
  const deletedByPerson = {};
  for (const run of applyRuns) {
    for (const [sourceType, count] of Object.entries(run.bySourceType || {})) {
      deletedBySourceType[sourceType] = (deletedBySourceType[sourceType] || 0) + count;
    }
    for (const [person, count] of Object.entries(run.topPeople || {})) {
      deletedByPerson[person] = (deletedByPerson[person] || 0) + count;
    }
  }

  const finalProblemSamples = finalProblemReviews.slice(0, 80).map((review) => {
    const claim = finalHighById.get(review.claimId);
    return {
      person: review.person,
      verdict: review.verdict,
      action: review.recommendedAction,
      objectLabel: review.objectLabel,
      sourceType: claim?.value?.sourceType || null,
      reason: review.reason,
    };
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    finalClaims: FINAL_CLAIMS,
    finalSourceClaims: finalClaims.length,
    finalHighSourceClaims: finalHighClaims.length,
    finalLowSourceClaims: finalClaims.length - finalHighClaims.length,
    finalReviewedHighSourceClaims: finalHighReviews.length,
    finalUnreviewedHighSourceClaims: unreviewedFinalHigh.length,
    finalHighVerdicts: countBy(finalHighReviews, (review) => review.verdict),
    finalHighActions: countBy(finalHighReviews, (review) => review.recommendedAction),
    finalProblemHighSourceClaims: finalProblemReviews.length,
    finalProblemByPerson: topEntries(countBy(finalProblemReviews, (review) => review.person), 30),
    finalProblemSamples,
    safeDeletedRawPoolItems: deletedTotal,
    deletedBySourceType,
    topDeletedPeople: topEntries(deletedByPerson, 30),
    applyRuns,
    exportRuns,
    reviewFiles: REVIEW_FILES,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(summary, null, 2)}\n`);

  const lines = [
    '# Source Item Safe Prune Status',
    '',
    `Generated at: ${summary.generatedAt}`,
    '',
    '## Result',
    '',
    `- Safe-deleted RawPoolItem rows: ${summary.safeDeletedRawPoolItems}`,
    `- Final source claims: ${summary.finalSourceClaims}`,
    `- Final high-priority source claims: ${summary.finalHighSourceClaims}`,
    `- Final high-priority reviewed claims: ${summary.finalReviewedHighSourceClaims}`,
    `- Final high-priority unreviewed claims: ${summary.finalUnreviewedHighSourceClaims}`,
    '',
    'Final high-priority verdicts:',
    '',
    table(Object.entries(summary.finalHighVerdicts).map(([verdict, count]) => ({ verdict, count })), [
      { label: 'Verdict', value: (row) => row.verdict },
      { label: 'Count', value: (row) => row.count },
    ]),
    '',
    '## Safe Delete Waves',
    '',
    table(summary.applyRuns, [
      { label: 'Wave', value: (row) => row.wave },
      { label: 'Deleted', value: (row) => row.deleted },
      { label: 'Targets', value: (row) => row.uniqueTargetIds },
      { label: 'Missing', value: (row) => row.missingTargets },
      { label: 'Source types', value: (row) => JSON.stringify(row.bySourceType || {}) },
    ]),
    '',
    '## Export Snapshots',
    '',
    table(summary.exportRuns, [
      { label: 'Wave', value: (row) => row.wave },
      { label: 'Claims', value: (row) => row.claims },
      { label: 'High', value: (row) => row.high },
      { label: 'Low', value: (row) => row.low },
    ]),
    '',
    '## Deleted Source Types',
    '',
    table(Object.entries(summary.deletedBySourceType).map(([sourceType, count]) => ({ sourceType, count })), [
      { label: 'Source type', value: (row) => row.sourceType },
      { label: 'Deleted', value: (row) => row.count },
    ]),
    '',
    '## Top Deleted People',
    '',
    table(summary.topDeletedPeople, [
      { label: 'Person', value: (row) => row.key },
      { label: 'Deleted', value: (row) => row.count },
    ]),
    '',
    '## Remaining Non-supported High Claims',
    '',
    `Remaining non-supported high source claims: ${summary.finalProblemHighSourceClaims}`,
    '',
    table(summary.finalProblemSamples.slice(0, 40), [
      { label: 'Person', value: (row) => row.person },
      { label: 'Verdict', value: (row) => row.verdict },
      { label: 'Action', value: (row) => row.action },
      { label: 'Source', value: (row) => row.sourceType || '' },
      { label: 'Object', value: (row) => row.objectLabel || '' },
      { label: 'Reason', value: (row) => row.reason || '' },
    ]),
    '',
    '## Cause And Prevention',
    '',
    '- The repeated refill came from display-window ranking. Deleting visible wrong-person items promoted lower-ranked RawPoolItem rows into the high-priority window.',
    '- The long tail was concentrated in `exa`, mostly same-name or similar-name pages, search-result pages, empty summaries, company/team pages, and generic profile/directory pages.',
    '- Upstream prevention should add person disambiguators to source fetch queries and demote or block weak source shapes before they enter RawPool: directory/profile pages without matching org, empty summaries, search-result pages, company/team pages without explicit personal authorship, and same-name pages whose org/topic conflicts with the person context.',
    '- Remaining non-supported high claims are no longer safe auto-deletes by the current gate; they need source refetch, conservative rewrite, or human review.',
    '',
  ];

  fs.writeFileSync(OUT_MD, `${lines.join('\n')}\n`);
  console.log(JSON.stringify({
    outJson: OUT_JSON,
    outMd: OUT_MD,
    safeDeletedRawPoolItems: summary.safeDeletedRawPoolItems,
    finalSourceClaims: summary.finalSourceClaims,
    finalHighSourceClaims: summary.finalHighSourceClaims,
    finalUnreviewedHighSourceClaims: summary.finalUnreviewedHighSourceClaims,
    finalHighVerdicts: summary.finalHighVerdicts,
  }, null, 2));
}

main();
