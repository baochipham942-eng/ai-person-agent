import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  POLICY_PATH,
  isStrongCandidateLink,
  isWeakStandaloneLink,
  loadContentReviewPolicy,
} from './content_review_policy.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const seedsPath = argValue('--seeds') || 'docs/audit-2026-06/roster_seeds.json';
const enrichmentPath = argValue('--enrichment') || 'docs/audit-2026-06/roster_enrichment.json';
const verbose = args.includes('--verbose');
const policy = loadContentReviewPolicy(ROOT);
const failures = [];
const notes = [];

function argValue(name) {
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function nameKey(name) {
  return compact(name).toLowerCase();
}

function seedTerms(seed) {
  return [
    seed.name,
    seed.nameZh,
    ...list(seed.aliases),
    ...list(seed.dedupCheck),
  ].map(nameKey).filter(Boolean);
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function addFailure(message) {
  failures.push(message);
}

function tail(text, maxLines = 40) {
  return text.trim().split(/\r?\n/).slice(-maxLines).join('\n');
}

function parseTrailingJson(output, label) {
  const trimmed = output.trim();
  const start = trimmed.lastIndexOf('\n{');
  const jsonText = start >= 0 ? trimmed.slice(start + 1) : trimmed;
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    addFailure(`${label}: could not parse trailing JSON summary (${error.message})`);
    if (verbose) console.log(tail(output));
    return {};
  }
}

function readGeneratedJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    addFailure(`${label}: expected output was not generated (${filePath})`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    addFailure(`${label}: could not read generated JSON (${error.message})`);
    return null;
  }
}

function runStep(label, command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: ROOT,
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10,
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (verbose && output.trim()) {
    console.log(`\n# ${label}`);
    console.log(tail(output, 80));
  }
  if (result.error) {
    addFailure(`${label}: ${result.error.message}`);
    return output;
  }
  if (result.status !== 0) {
    addFailure(`${label}: exited ${result.status}\n${tail(output)}`);
  }
  return output;
}

function requireField(source, field, label) {
  const value = source[field];
  if (Array.isArray(value)) {
    if (value.length === 0) addFailure(`${label}: ${field} is empty`);
    return;
  }
  if (!compact(value)) addFailure(`${label}: ${field} is empty`);
}

function validateStaticInputs() {
  const seedsPayload = readJson(seedsPath);
  const enrichmentPayload = readJson(enrichmentPath);
  const seeds = list(seedsPayload.seeds);
  const enrichmentPeople = list(enrichmentPayload.people);
  const seenSeeds = new Set();
  const enrichmentByName = new Map();

  if (seeds.length === 0) addFailure(`${seedsPath}: seeds is empty`);
  if (enrichmentPeople.length === 0) addFailure(`${enrichmentPath}: people is empty`);

  for (const seed of seeds) {
    const key = nameKey(seed.name);
    if (!key) addFailure(`${seedsPath}: seed name is empty`);
    if (seenSeeds.has(key)) addFailure(`${seedsPath}: duplicate seed ${seed.name}`);
    seenSeeds.add(key);
    for (const field of policy.candidateIntake.requiredSeedFields) {
      requireField(seed, field, `seed ${seed.name || '(missing name)'}`);
    }
  }

  for (const person of enrichmentPeople) {
    const key = nameKey(person.name);
    if (!key) {
      addFailure(`${enrichmentPath}: enrichment name is empty`);
      continue;
    }
    if (enrichmentByName.has(key)) addFailure(`${enrichmentPath}: duplicate enrichment ${person.name}`);
    enrichmentByName.set(key, person);

    for (const field of policy.candidateIntake.requiredEnrichmentFields) {
      requireField(person, field, `enrichment ${person.name}`);
    }

    const links = list(person.officialLinks);
    const strongLinks = links.filter((link) => isStrongCandidateLink(link, policy));
    if (strongLinks.length < policy.candidateIntake.minimumStrongSourceLinks) {
      addFailure(`enrichment ${person.name}: needs at least ${policy.candidateIntake.minimumStrongSourceLinks} non-social fetchable source link`);
    }
    if (links.length > 0 && links.every((link) => isWeakStandaloneLink(link, policy))) {
      addFailure(`enrichment ${person.name}: cannot be supported only by X/Twitter/LinkedIn links`);
    }
  }

  for (const seed of seeds) {
    if (!seedTerms(seed).some((term) => enrichmentByName.has(term))) {
      addFailure(`seed ${seed.name}: missing matching enrichment row`);
    }
  }

  notes.push(`static inputs ok: seeds=${seeds.length}, enrichment=${enrichmentPeople.length}, policy=${policy.version}`);
}

function parseWouldInsertNames(output) {
  return new Set([...output.matchAll(/would insert candidate: (.+?) \(/g)].map((match) => match[1]));
}

function parseMissingNames(output) {
  return [...output.matchAll(/^missing: (.+)$/gm)].map((match) => match[1].trim());
}

function validateRuntimeDryRuns() {
  const candidateOutput = runStep('roster candidate dry-run', 'bun', [
    'scripts/enrich/apply_roster_candidates.ts',
    `--seeds=${seedsPath}`,
  ]);
  const candidateSummary = parseTrailingJson(candidateOutput, 'roster candidate dry-run');
  const wouldInsert = parseWouldInsertNames(candidateOutput);
  if (policy.preflight.failOnAmbiguousSeeds && Number(candidateSummary.ambiguous || 0) > 0) {
    addFailure(`roster candidate dry-run: ambiguous=${candidateSummary.ambiguous}`);
  }
  notes.push(`candidate dry-run ok: inserted=${candidateSummary.inserted || 0}, updated=${candidateSummary.updated || 0}, ambiguous=${candidateSummary.ambiguous || 0}`);

  const enrichmentOutput = runStep('roster enrichment dry-run', 'bun', [
    'scripts/enrich/apply_roster_enrichment.ts',
    `--seeds=${enrichmentPath}`,
  ]);
  const enrichmentSummary = parseTrailingJson(enrichmentOutput, 'roster enrichment dry-run');
  const missing = parseMissingNames(enrichmentOutput);
  const unexpectedMissing = missing.filter((name) => !wouldInsert.has(name));
  if (policy.preflight.failOnMissingEnrichmentForExistingPeople && unexpectedMissing.length > 0) {
    addFailure(`roster enrichment dry-run: missing existing people ${unexpectedMissing.join(', ')}`);
  }
  notes.push(`enrichment dry-run ok: matched=${enrichmentSummary.matched || 0}, missing=${enrichmentSummary.missing || 0}, updated=${enrichmentSummary.updated || 0}`);

  const readinessOut = path.join(os.tmpdir(), 'candidate_readiness_preflight.json');
  runStep('candidate readiness export', 'bun', [
    'scripts/audit/export_candidate_readiness.ts',
    `--out=${readinessOut}`,
  ]);
  const readinessPayload = readGeneratedJson(readinessOut, 'candidate readiness export');
  if (readinessPayload) notes.push(`readiness export ok: ${JSON.stringify(readinessPayload.summary || {})}`);

  const promotionOut = path.join(os.tmpdir(), 'candidate_promotion_preflight.json');
  runStep('candidate promotion dry-run', 'bun', [
    'scripts/fix/promote_candidate_readiness.ts',
    `--out=${promotionOut}`,
  ]);
  const promotionPayload = readGeneratedJson(promotionOut, 'candidate promotion dry-run');
  const promotionSummary = promotionPayload?.summary || {};
  if (promotionPayload && policy.preflight.failOnHeldCandidates && Number(promotionSummary.held || 0) > 0) {
    addFailure(`candidate promotion dry-run: held=${promotionSummary.held}`);
  }
  if (promotionPayload) {
    notes.push(`promotion dry-run ok: candidates=${promotionSummary.candidates || 0}, promotable=${promotionSummary.promotable || 0}, held=${promotionSummary.held || 0}`);
  }

  if (policy.preflight.runContentGuard) {
    runStep('content guard', 'node', ['scripts/audit/check_content_review_guardrails.mjs']);
    notes.push('content guard ok');
  }
}

validateStaticInputs();
if (failures.length === 0) validateRuntimeDryRuns();

if (failures.length > 0) {
  console.error('Newcomer preflight failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(`Policy: ${POLICY_PATH}`);
  process.exit(1);
}

console.log('Newcomer preflight passed:');
for (const note of notes) console.log(`- ${note}`);
