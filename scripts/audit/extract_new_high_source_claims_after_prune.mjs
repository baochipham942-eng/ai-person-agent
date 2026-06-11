/**
 * Build a review input for source claims that became high-priority after pruning.
 *
 * It compares a fresh post-prune source-claim export with a previous source-item
 * review file. Claims already reviewed by claimId are excluded.
 *
 * Usage:
 *   node scripts/audit/extract_new_high_source_claims_after_prune.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const CLAIMS_IN = getArg('--claims-in') || 'docs/audit-2026-06/data/fact_claims_source_items_after_safe_prune.jsonl';
const REVIEWS_IN = getArg('--reviews-in') || 'docs/audit-2026-06/data/fact_claim_reviews_source_item_high_mimo.jsonl';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/fact_claims_source_items_after_safe_prune_new_high.jsonl';
const SUMMARY_OUT = getArg('--summary-out') || OUT.replace(/\.jsonl$/i, '_summary.json');

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function readJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function readJsonlFiles(filePaths) {
  return filePaths.flatMap((filePath) => readJsonl(filePath));
}

function groupCount(rows, getKey) {
  return rows.reduce((acc, row) => {
    const key = getKey(row) || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function topRows(rows, getKey, limit = 30) {
  return Object.entries(groupCount(rows, getKey))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function main() {
  const claims = readJsonl(CLAIMS_IN);
  const reviewFiles = REVIEWS_IN.split(',')
    .map((filePath) => filePath.trim())
    .filter(Boolean);
  const reviews = readJsonlFiles(reviewFiles);
  const reviewedIds = new Set(reviews.map((review) => review.claimId));
  const highSourceClaims = claims.filter((claim) => (
    claim.claimType === 'source_item_belongs_to_person'
    && claim.priority === 'high'
  ));
  const alreadyReviewed = highSourceClaims.filter((claim) => reviewedIds.has(claim.claimId));
  const newHighClaims = highSourceClaims.filter((claim) => !reviewedIds.has(claim.claimId));

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, newHighClaims.map((claim) => JSON.stringify(claim)).join('\n') + (newHighClaims.length ? '\n' : ''));

  const summary = {
    generatedAt: new Date().toISOString(),
    claimsIn: CLAIMS_IN,
    reviewsIn: reviewFiles,
    out: OUT,
    postPruneHighSourceClaims: highSourceClaims.length,
    previouslyReviewedHighSourceClaims: alreadyReviewed.length,
    newHighSourceClaims: newHighClaims.length,
    previousReviewClaims: reviews.length,
    bySurface: groupCount(newHighClaims, (claim) => claim.surface),
    bySourceType: groupCount(newHighClaims, (claim) => claim.value?.sourceType),
    topPeople: topRows(newHighClaims, (claim) => claim.person, 40),
    examples: newHighClaims.slice(0, 20).map((claim) => ({
      claimId: claim.claimId,
      person: claim.person,
      surface: claim.surface,
      sourceType: claim.value?.sourceType || null,
      sourceRank: claim.value?.sourceRank || null,
      objectLabel: claim.objectLabel,
      url: claim.value?.url || null,
    })),
  };

  fs.writeFileSync(SUMMARY_OUT, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify({
    out: OUT,
    summaryOut: SUMMARY_OUT,
    postPruneHighSourceClaims: summary.postPruneHighSourceClaims,
    previouslyReviewedHighSourceClaims: summary.previouslyReviewedHighSourceClaims,
    newHighSourceClaims: summary.newHighSourceClaims,
    bySourceType: summary.bySourceType,
  }, null, 2));
}

main();
