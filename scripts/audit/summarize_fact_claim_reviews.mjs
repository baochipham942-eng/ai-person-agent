/**
 * Summarize fact claim review outputs into one triage report.
 *
 * Usage:
 *   node scripts/audit/summarize_fact_claim_reviews.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const CLAIMS_FILE = getArg('--claims') || 'docs/audit-2026-06/data/fact_claims.jsonl';
const REVIEW_DIR = getArg('--review-dir') || 'docs/audit-2026-06/data';
const OUT = getArg('--out') || 'docs/audit-2026-06/FACT_CLAIM_REVIEW_STATUS.md';
const SUMMARY_OUT = getArg('--summary-out') || 'docs/audit-2026-06/data/fact_claim_review_aggregate_summary.json';

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

function countBy(items, key) {
  const counts = {};
  for (const item of items) {
    const value = key(item);
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

function table(rows, columns) {
  const header = `| ${columns.map((col) => col.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((col) => String(col.value(row) ?? '').replace(/\n/g, '<br>')).join(' | ')} |`);
  return [header, divider, ...body].join('\n');
}

function compact(text, max = 140) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function priorityWeight(review) {
  let score = 0;
  if (review.recommendedAction === 'remove') score += 8;
  if (review.verdict === 'wrong_person') score += 8;
  if (review.verdict === 'unsupported') score += 6;
  if (review.verdict === 'stale') score += 4;
  if (review.verdict === 'over_attributed') score += 3;
  if (review.recommendedAction === 'rewrite') score += 2;
  if (review.verdict === 'needs_source') score += 1;
  return score;
}

function loadReviewFiles() {
  return fs.readdirSync(REVIEW_DIR)
    .filter((name) => /^fact_claim_reviews_.*_mimo\.jsonl$/.test(name))
    .filter((name) => !name.includes('dario_products'))
    .map((name) => path.join(REVIEW_DIR, name))
    .sort();
}

function main() {
  const claims = readJsonl(CLAIMS_FILE);
  const reviewFiles = loadReviewFiles();
  const reviewRows = reviewFiles.flatMap((file) => readJsonl(file).map((review) => ({ ...review, reviewFile: file })));
  const dedupedReviews = [];
  const seen = new Set();
  for (const review of reviewRows) {
    if (seen.has(review.claimId)) continue;
    seen.add(review.claimId);
    dedupedReviews.push(review);
  }

  const claimById = new Map(claims.map((claim) => [claim.claimId, claim]));
  const reviewedClaimIds = new Set(dedupedReviews.map((review) => review.claimId));
  const reviewedClaims = claims.filter((claim) => reviewedClaimIds.has(claim.claimId));
  const unreviewedClaims = claims.filter((claim) => !reviewedClaimIds.has(claim.claimId));

  const byClaimType = countBy(dedupedReviews, (review) => review.claimType);
  const byVerdict = countBy(dedupedReviews, (review) => review.verdict);
  const byAction = countBy(dedupedReviews, (review) => review.recommendedAction);
  const remainingByType = countBy(unreviewedClaims, (claim) => claim.claimType);
  const remainingByPriority = countBy(unreviewedClaims, (claim) => claim.priority);

  const attentionByPerson = new Map();
  for (const review of dedupedReviews) {
    if (review.verdict === 'supported') continue;
    const entry = attentionByPerson.get(review.person) || {
      person: review.person,
      total: 0,
      score: 0,
      remove: 0,
      rewrite: 0,
      needsSource: 0,
      wrongPerson: 0,
      stale: 0,
      unsupported: 0,
      samples: [],
    };
    entry.total += 1;
    entry.score += priorityWeight(review);
    if (review.recommendedAction === 'remove') entry.remove += 1;
    if (review.recommendedAction === 'rewrite') entry.rewrite += 1;
    if (review.verdict === 'needs_source') entry.needsSource += 1;
    if (review.verdict === 'wrong_person') entry.wrongPerson += 1;
    if (review.verdict === 'stale') entry.stale += 1;
    if (review.verdict === 'unsupported') entry.unsupported += 1;
    if (entry.samples.length < 3) {
      entry.samples.push(`${review.claimType}${review.objectLabel ? ` / ${review.objectLabel}` : ''}: ${review.verdict}, ${compact(review.reason, 80)}`);
    }
    attentionByPerson.set(review.person, entry);
  }

  const topPeople = [...attentionByPerson.values()]
    .sort((a, b) => b.score - a.score || b.total - a.total || a.person.localeCompare(b.person))
    .slice(0, 40);

  const removeItems = dedupedReviews
    .filter((review) => review.recommendedAction === 'remove' || review.verdict === 'wrong_person' || review.verdict === 'unsupported')
    .sort((a, b) => priorityWeight(b) - priorityWeight(a) || a.person.localeCompare(b.person))
    .slice(0, 80);

  const sourcePollution = dedupedReviews
    .filter((review) => review.claimType === 'source_item_belongs_to_person' && review.verdict !== 'supported')
    .sort((a, b) => priorityWeight(b) - priorityWeight(a))
    .slice(0, 50);

  const productPolicy = dedupedReviews
    .filter((review) => review.claimType === 'representative_achievement' && review.verdict === 'over_attributed')
    .slice(0, 50);

  const tiboNote = [
    '本库当前没有 `Thibault "Tibo" Sottiaux` / `Tibo` 记录。',
    '公开资料更适合写成 `Codex team lead / Head of Codex / Member of Technical Staff`，不是明确 PM title。',
  ];

  const summary = {
    generatedAt: new Date().toISOString(),
    claims: claims.length,
    reviewed: dedupedReviews.length,
    unreviewed: unreviewedClaims.length,
    reviewedByClaimType: byClaimType,
    reviewedByVerdict: byVerdict,
    reviewedByAction: byAction,
    remainingByType,
    remainingByPriority,
    reviewFiles,
    topPeople,
    removeItems,
    sourcePollution,
    productPolicy,
    tiboNote,
  };

  fs.writeFileSync(SUMMARY_OUT, `${JSON.stringify(summary, null, 2)}\n`);

  const lines = [
    '# Fact Claim Review Status',
    '',
    `Generated at: ${summary.generatedAt}`,
    '',
    '## Coverage',
    '',
    `- Exported claims: ${claims.length}`,
    `- Reviewed claims: ${dedupedReviews.length}`,
    `- Unreviewed claims: ${unreviewedClaims.length}`,
    '',
    'Reviewed claim types:',
    '',
    table(
      Object.entries(byClaimType).sort((a, b) => b[1] - a[1]).map(([claimType, count]) => ({ claimType, count })),
      [
        { label: 'Claim type', value: (row) => row.claimType },
        { label: 'Reviewed', value: (row) => row.count },
      ],
    ),
    '',
    'Verdicts:',
    '',
    table(
      Object.entries(byVerdict).sort((a, b) => b[1] - a[1]).map(([verdict, count]) => ({ verdict, count })),
      [
        { label: 'Verdict', value: (row) => row.verdict },
        { label: 'Count', value: (row) => row.count },
      ],
    ),
    '',
    'Actions:',
    '',
    table(
      Object.entries(byAction).sort((a, b) => b[1] - a[1]).map(([action, count]) => ({ action, count })),
      [
        { label: 'Action', value: (row) => row.action },
        { label: 'Count', value: (row) => row.count },
      ],
    ),
    '',
    '## Top Attention People',
    '',
    table(topPeople, [
      { label: 'Person', value: (row) => row.person },
      { label: 'Total', value: (row) => row.total },
      { label: 'Remove', value: (row) => row.remove },
      { label: 'Wrong', value: (row) => row.wrongPerson },
      { label: 'Stale', value: (row) => row.stale },
      { label: 'Needs source', value: (row) => row.needsSource },
      { label: 'Samples', value: (row) => row.samples.join('<br>') },
    ]),
    '',
    '## Remove / Wrong Person Queue',
    '',
    table(removeItems, [
      { label: 'Person', value: (row) => row.person },
      { label: 'Type', value: (row) => row.claimType },
      { label: 'Object', value: (row) => row.objectLabel || '' },
      { label: 'Verdict', value: (row) => row.verdict },
      { label: 'Action', value: (row) => row.recommendedAction },
      { label: 'Reason', value: (row) => compact(row.reason) },
    ]),
    '',
    '## Source Pollution Examples',
    '',
    table(sourcePollution, [
      { label: 'Person', value: (row) => row.person },
      { label: 'Surface', value: (row) => row.surface },
      { label: 'Object', value: (row) => row.objectLabel || '' },
      { label: 'Verdict', value: (row) => row.verdict },
      { label: 'Action', value: (row) => row.recommendedAction },
      { label: 'Reason', value: (row) => compact(row.reason) },
    ]),
    '',
    '## Representative Achievement Policy Queue',
    '',
    table(productPolicy, [
      { label: 'Person', value: (row) => row.person },
      { label: 'Object', value: (row) => row.objectLabel || '' },
      { label: 'Action', value: (row) => row.recommendedAction },
      { label: 'Reason', value: (row) => compact(row.reason) },
    ]),
    '',
    '## Remaining Review Queue',
    '',
    table(
      Object.entries(remainingByType).sort((a, b) => b[1] - a[1]).map(([claimType, count]) => ({ claimType, count })),
      [
        { label: 'Claim type', value: (row) => row.claimType },
        { label: 'Unreviewed', value: (row) => row.count },
      ],
    ),
    '',
    `Remaining by priority: ${JSON.stringify(remainingByPriority)}`,
    '',
    '## Tibo / Codex Note',
    '',
    tiboNote.map((line) => `- ${line}`).join('\n'),
    '',
  ];

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${lines.join('\n')}\n`);
  console.log(JSON.stringify({
    out: OUT,
    summaryOut: SUMMARY_OUT,
    claims: summary.claims,
    reviewed: summary.reviewed,
    unreviewed: summary.unreviewed,
    byVerdict,
    byAction,
  }, null, 2));
}

main();
