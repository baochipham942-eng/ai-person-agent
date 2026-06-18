#!/usr/bin/env node
import fs from 'node:fs';
import {
  SOURCE_ROLES,
  hashUrl,
  parseArgs,
  writeJson,
} from './common.mjs';

const SCRIPT = 'review_thread_pack';

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

function main() {
  const options = parseReviewArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const parsedInputs = options.input.map(readPack);
  const parseErrors = parsedInputs.filter(item => !item.ok).map(item => item.error);
  const sources = parsedInputs.flatMap(item => item.ok ? extractSources(item.path, item.json) : []);
  const duplicateGroups = findDuplicateGroups(sources);
  const roleCounts = countRoles(sources);
  const missingRoles = options.requiredRole.filter(role => !roleCounts[role]);
  const sourceIssues = validateSources(sources);

  const review = {
    schemaVersion: 'knowledge-thread-review/v1',
    mode: 'dry-run',
    script: SCRIPT,
    generatedAt: new Date().toISOString(),
    inputs: {
      input: options.input,
      requiredRole: options.requiredRole,
    },
    stats: {
      inputFiles: options.input.length,
      parseErrors: parseErrors.length,
      sources: sources.length,
      roles: roleCounts,
      duplicateGroups: duplicateGroups.length,
      sourceIssues: sourceIssues.length,
    },
    review: {
      publishReadiness: parseErrors.length || missingRoles.length || sourceIssues.length ? 'thin' : 'review_ready',
      missingRoles,
      duplicateGroups,
      sourceIssues,
      parseErrors,
    },
    sources,
    notes: [
      'This is a dry-run pack review. It does not write KnowledgeSource.',
      'Use missingRoles and duplicateGroups before handing the pack to Mimo or a materialize script.',
    ],
  };

  writeJson(review, options.output);
}

function parseReviewArgs(argv) {
  const options = parseArgs(argv);
  options.input = [];
  options.requiredRole = [
    SOURCE_ROLES.signal,
    SOURCE_ROLES.official,
    SOURCE_ROLES.youtube,
    SOURCE_ROLES.paper,
    SOURCE_ROLES.implementation,
  ];

  for (const arg of argv) {
    if (arg.startsWith('--input=')) options.input.push(arg.slice('--input='.length));
    else if (arg.startsWith('--required-role=')) {
      if (options.requiredRole.join('|') === [
        SOURCE_ROLES.signal,
        SOURCE_ROLES.official,
        SOURCE_ROLES.youtube,
        SOURCE_ROLES.paper,
        SOURCE_ROLES.implementation,
      ].join('|')) options.requiredRole = [];
      options.requiredRole.push(arg.slice('--required-role='.length));
    }
  }

  return options;
}

function readPack(path) {
  try {
    return {
      ok: true,
      path,
      json: JSON.parse(fs.readFileSync(path, 'utf8')),
    };
  } catch (error) {
    return {
      ok: false,
      path,
      error: {
        path,
        reason: error.message || String(error),
      },
    };
  }
}

function extractSources(path, json) {
  const sources = Array.isArray(json) ? json : json.sources;
  if (!Array.isArray(sources)) return [];
  return sources.map(source => ({
    ...source,
    _review: {
      inputPath: path,
      role: source.metadata?.role || source.role || null,
    },
  }));
}

function countRoles(sources) {
  const counts = {};
  for (const source of sources) {
    const role = source._review?.role || source.metadata?.role || source.role || 'unknown';
    counts[role] = (counts[role] || 0) + 1;
  }
  return counts;
}

function findDuplicateGroups(sources) {
  const byHash = new Map();
  for (const source of sources) {
    const key = source.urlHash || hashUrl(source.url);
    if (!byHash.has(key)) byHash.set(key, []);
    byHash.get(key).push({
      title: source.title || null,
      url: source.url,
      role: source._review?.role || null,
      inputPath: source._review?.inputPath || null,
    });
  }
  return [...byHash.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([urlHash, items]) => ({ urlHash, items }));
}

function validateSources(sources) {
  const issues = [];
  for (const [index, source] of sources.entries()) {
    const path = source._review?.inputPath || '<inline>';
    if (!source.url) issues.push({ index, path, severity: 'error', reason: 'missing_url' });
    if (!source.urlHash) issues.push({ index, path, severity: 'warn', reason: 'missing_url_hash', url: source.url || null });
    if (!source.title) issues.push({ index, path, severity: 'warn', reason: 'missing_title', url: source.url || null });
    if (!source.sourceKind) issues.push({ index, path, severity: 'warn', reason: 'missing_source_kind', url: source.url || null });
    if (!source._review?.role) issues.push({ index, path, severity: 'warn', reason: 'missing_role', url: source.url || null });
    if (!source.text || source.text.trim().length < 80) {
      issues.push({
        index,
        path,
        severity: 'warn',
        reason: 'thin_or_missing_text',
        url: source.url || null,
        textLength: source.text?.length || 0,
      });
    }
  }
  return issues;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/knowledge/review_thread_pack.mjs --input=official.json --input=youtube.json

Options:
  --input=PATH           Dry-run JSON pack or raw sources array. Repeatable.
  --required-role=ROLE   Override required roles. Repeatable.
  --output=PATH          Write JSON to file instead of stdout.
`);
}
