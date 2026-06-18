#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_INPUT = 'docs/knowledge-threads/batch-thread-seeds.json';
const REQUIRED_ROLES = [
  'signal',
  'official_definition',
  'transcript_context',
  'paper_foundation',
  'implementation_signal',
];
const READINESS_EXCLUDED_SOURCE_KINDS = new Set([
  'earnings_transcript',
  'sec_filing',
  'investor_relations',
  'annual_report',
  'shareholder_letter',
]);

main();

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const inputPath = path.resolve(options.input);
  const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const issues = validatePayload(payload);
  const summary = {
    input: inputPath,
    pass: issues.length === 0,
    topicCount: Array.isArray(payload.topics) ? payload.topics.length : 0,
    selectedTopics: payload.selection?.selectedTopics || [],
    issues,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (issues.length) process.exitCode = 1;
}

function parseArgs(argv) {
  const options = {
    input: DEFAULT_INPUT,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg.startsWith('--input=')) options.input = arg.slice('--input='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function validatePayload(payload) {
  const issues = [];
  if (payload.schemaVersion !== 'knowledge-thread-batch-seeds/v1') {
    issues.push(issue('root', 'invalid_schema_version', payload.schemaVersion || null));
  }
  if (payload.mode !== 'dry-run') issues.push(issue('root', 'mode_must_be_dry_run', payload.mode || null));

  const selectedTopics = payload.selection?.selectedTopics;
  if (!Array.isArray(selectedTopics) || selectedTopics.length < 3) {
    issues.push(issue('selection.selectedTopics', 'expected_at_least_3_selected_topics'));
  }

  const sourceRequirements = payload.sourceRequirements || {};
  const requiredRoles = sourceRequirements.requiredRoles || [];
  for (const role of REQUIRED_ROLES) {
    if (!requiredRoles.includes(role)) {
      issues.push(issue('sourceRequirements.requiredRoles', 'missing_required_role', role));
    }
  }

  const topics = Array.isArray(payload.topics) ? payload.topics : [];
  if (topics.length < 3) issues.push(issue('topics', 'expected_at_least_3_topics'));

  const seenSlugs = new Set();
  for (const [index, topic] of topics.entries()) {
    validateTopic(topic, index, selectedTopics || [], seenSlugs, issues);
  }

  return issues;
}

function validateTopic(topic, index, selectedTopics, seenSlugs, issues) {
  const base = `topics[${index}]`;
  for (const field of ['slug', 'title', 'definitionDraft']) {
    if (!nonEmptyString(topic[field])) issues.push(issue(`${base}.${field}`, 'missing_or_empty'));
  }

  if (seenSlugs.has(topic.slug)) issues.push(issue(`${base}.slug`, 'duplicate_slug', topic.slug));
  seenSlugs.add(topic.slug);

  if (Array.isArray(selectedTopics) && selectedTopics.length && !selectedTopics.includes(topic.slug)) {
    issues.push(issue(`${base}.slug`, 'topic_not_listed_in_selection', topic.slug));
  }

  for (const role of REQUIRED_ROLES) {
    if (!Array.isArray(topic.requiredRoles) || !topic.requiredRoles.includes(role)) {
      issues.push(issue(`${base}.requiredRoles`, 'missing_required_role', role));
    }
    const queries = topic.sourceQueries?.[role];
    if (!Array.isArray(queries) || !queries.some(query => nonEmptyString(query.query))) {
      issues.push(issue(`${base}.sourceQueries.${role}`, 'missing_role_query'));
    }
  }

  if (!Array.isArray(topic.mustHaveSources) || topic.mustHaveSources.length < 5) {
    issues.push(issue(`${base}.mustHaveSources`, 'expected_at_least_5_sources'));
  } else {
    validateMustHaveSources(topic.mustHaveSources, base, issues);
  }

  if (!Array.isArray(topic.weakSpots) || topic.weakSpots.length < 3) {
    issues.push(issue(`${base}.weakSpots`, 'expected_at_least_3_weak_spots'));
  }
  if (!Array.isArray(topic.edgeIdeas) || topic.edgeIdeas.length < 4) {
    issues.push(issue(`${base}.edgeIdeas`, 'expected_at_least_4_edge_ideas'));
  }
  validateCompanyStrategyTargets(topic.companyStrategyContextTargets || [], base, issues);
}

function validateMustHaveSources(sources, base, issues) {
  const roles = new Set();
  for (const [index, source] of sources.entries()) {
    const sourcePath = `${base}.mustHaveSources[${index}]`;
    if (!REQUIRED_ROLES.includes(source.role)) {
      issues.push(issue(`${sourcePath}.role`, 'invalid_source_role', source.role || null));
    } else {
      roles.add(source.role);
    }
    if (!nonEmptyString(source.sourceKind)) issues.push(issue(`${sourcePath}.sourceKind`, 'missing_or_empty'));
    if (!nonEmptyString(source.title)) issues.push(issue(`${sourcePath}.title`, 'missing_or_empty'));
    if (!nonEmptyString(source.whyRequired)) issues.push(issue(`${sourcePath}.whyRequired`, 'missing_or_empty'));
    if (source.url && !isValidUrl(source.url)) issues.push(issue(`${sourcePath}.url`, 'invalid_url', source.url));
    if (READINESS_EXCLUDED_SOURCE_KINDS.has(source.sourceKind)) {
      issues.push(issue(`${sourcePath}.sourceKind`, 'financial_or_ir_source_counted_for_readiness', source.sourceKind));
    }
  }

  for (const role of ['official_definition', 'paper_foundation', 'implementation_signal']) {
    if (!roles.has(role)) issues.push(issue(`${base}.mustHaveSources`, 'missing_core_must_have_role', role));
  }
}

function validateCompanyStrategyTargets(targets, base, issues) {
  if (!Array.isArray(targets)) {
    issues.push(issue(`${base}.companyStrategyContextTargets`, 'must_be_array'));
    return;
  }

  for (const [index, target] of targets.entries()) {
    const targetPath = `${base}.companyStrategyContextTargets[${index}]`;
    if (!nonEmptyString(target.company)) issues.push(issue(`${targetPath}.company`, 'missing_or_empty'));
    if (target.excludedFromTopicReadiness !== true) {
      issues.push(issue(`${targetPath}.excludedFromTopicReadiness`, 'must_be_true'));
    }
  }
}

function issue(pathName, reason, value = undefined) {
  return value === undefined ? { path: pathName, reason } : { path: pathName, reason, value };
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function printHelp() {
  console.log(`
Usage:
  node scripts/knowledge/check_batch_thread_seeds.mjs
  node scripts/knowledge/check_batch_thread_seeds.mjs --input=docs/knowledge-threads/batch-thread-seeds.json
`);
}
