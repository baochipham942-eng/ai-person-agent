/**
 * Check the Neo/MiMo content-review guardrail artifacts.
 *
 * Read-only. This script does not fetch sources, mutate DB rows, or run model
 * review. It fails when the current audit artifacts show content-review
 * regressions that should block new data intake.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const files = {
  prune: 'docs/audit-2026-06/data/prune_tail_review_unresolved_rows.json',
  careerAudit: 'docs/audit-2026-06/data/career_normalization_audit.json',
  careerBuckets: 'docs/audit-2026-06/data/career_review_buckets.json',
  relationBuckets: 'docs/audit-2026-06/data/relation_review_buckets_after_org_review_second.json',
  cardVerify: 'docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_current_verify_log.json',
  conservativeDraft: 'docs/audit-2026-06/data/exa_source_quality_review_dir/conservative_rewrite_decisions_draft_summary.json',
  conservativeCurrent: 'docs/audit-2026-06/data/exa_source_quality_review_dir/conservative_rewrite_decisions_after_generation_summary.json',
};

const failures = [];
const notes = [];

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

function fail(label, message) {
  failures.push(`${label}: ${message}`);
}

function expectZero(label, value) {
  if (Number(value) !== 0) fail(label, `expected 0, got ${value}`);
}

function expectEqual(label, left, right) {
  if (left !== right) fail(label, `expected ${left} to equal ${right}`);
}

function expectEmptyArray(label, value) {
  if (!Array.isArray(value)) {
    fail(label, 'expected an array');
    return;
  }
  if (value.length !== 0) fail(label, `expected empty array, got ${value.length}`);
}

function expectNoPositiveCounts(label, value) {
  if (!value || typeof value !== 'object') {
    fail(label, 'expected count object');
    return;
  }
  const positive = [];
  collectPositiveCounts(value, [], positive);
  if (positive.length) {
    fail(label, `expected no positive counts, got ${positive.map((item) => item.join('=')).join(', ')}`);
  }
}

function collectPositiveCounts(value, pathParts, out) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    const nextPath = [...pathParts, key];
    if (typeof child === 'number' && child > 0) {
      out.push([nextPath.join('.'), child]);
    } else if (child && typeof child === 'object' && !Array.isArray(child)) {
      collectPositiveCounts(child, nextPath, out);
    }
  }
}

function checkPrune() {
  const payload = readJson(files.prune);
  const summary = payload.summary || {};
  expectZero('prune.reviewUnresolvedRows', summary.reviewUnresolvedRows);
  expectZero('prune.dependencyRows', summary.dependencyRows);
  expectEmptyArray('prune.rows', payload.rows || []);
  notes.push(`prune ok: reviewUnresolvedRows=${summary.reviewUnresolvedRows}, dependencyRows=${summary.dependencyRows}`);
}

function checkCareer() {
  const audit = readJson(files.careerAudit);
  const summary = audit.summary || {};
  for (const key of [
    'duplicateOrgClusters',
    'positionLikeOrganizations',
    'duplicateRoleGroups',
    'vagueRoles',
    'peopleOrganizationDuplicates',
    'currentTitleOrgMismatches',
  ]) {
    expectZero(`career.summary.${key}`, summary[key]);
  }
  expectEmptyArray('career.duplicateOrgClusters', audit.duplicateOrgClusters || []);
  expectEmptyArray('career.positionLikeOrganizations', audit.positionLikeOrganizations || []);
  expectEmptyArray('career.duplicateRoleGroups', audit.duplicateRoleGroups || []);
  expectEmptyArray('career.vagueRoles', audit.vagueRoles || []);
  expectEmptyArray('career.peopleOrganizationDuplicates', audit.peopleOrganizationDuplicates || []);
  expectEmptyArray('career.currentTitleOrgMismatches', audit.currentTitleOrgMismatches || []);

  const buckets = readJson(files.careerBuckets);
  expectNoPositiveCounts('careerBuckets.summary', buckets.summary || {});
  notes.push('career ok: duplicate/vague/currentTitle buckets are empty');
}

function checkRelation() {
  const buckets = readJson(files.relationBuckets);
  expectZero('relation.totalNeedsReview', buckets.summary?.totalNeedsReview);
  expectNoPositiveCounts('relation.byBucket', buckets.summary?.byBucket || {});
  expectNoPositiveCounts('relation.byType', buckets.summary?.byType || {});
  expectNoPositiveCounts('relation.bySource', buckets.summary?.bySource || {});
  notes.push(`relation ok: totalNeedsReview=${buckets.summary?.totalNeedsReview}`);
}

function checkCards() {
  const verify = readJson(files.cardVerify);
  expectEqual('cards.peopleEligible', verify.peopleEligible, verify.peopleConsidered);
  expectEqual('cards.existingCards', verify.existingCards, verify.replacementCards);
  expectZero('cards.skippedPeople', verify.skippedPeople);
  notes.push(`cards ok: existingCards=${verify.existingCards}, replacementCards=${verify.replacementCards}`);
}

function checkConservativeRewrite() {
  const draft = readJson(files.conservativeDraft);
  const current = readJson(files.conservativeCurrent);
  expectZero('conservativeDraft.skipped', draft.skipped);
  expectZero('conservativeCurrent.skipped', current.skipped);
  if (Number(draft.decisions) <= 0) fail('conservativeDraft.decisions', `expected positive decisions, got ${draft.decisions}`);
  if (Number(current.decisions) <= 0) fail('conservativeCurrent.decisions', `expected positive decisions, got ${current.decisions}`);
  notes.push(`conservative rewrite ok: draft=${draft.decisions}, current=${current.decisions}, skipped=0`);
}

checkPrune();
checkCareer();
checkRelation();
checkCards();
checkConservativeRewrite();

if (failures.length) {
  console.error('Content review guardrails failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Content review guardrails passed:');
for (const note of notes) console.log(`- ${note}`);
