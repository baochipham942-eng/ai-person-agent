/**
 * Build remediation queues from the Exa source-quality report.
 *
 * Read-only. This script does not modify database records.
 *
 * Usage:
 *   node scripts/audit/build_exa_source_quality_remediation.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const REPORT_IN = getArg('--report-in') || 'docs/audit-2026-06/data/exa_source_quality_report.json';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/exa_source_quality_remediation.json';
const CLAIMS_OUT = getArg('--claims-out') || 'docs/audit-2026-06/data/exa_source_quality_mimo_claims.jsonl';
const MARKDOWN_OUT = getArg('--markdown-out') || 'docs/audit-2026-06/EXA_SOURCE_QUALITY_REMEDIATION.md';

const DEDICATED_SOURCE_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'github.com',
  'gist.github.com',
  'scholar.google.',
  'docs.google.com',
  'forms.gle',
];

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function compact(text, max = 220) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function groupCount(rows, getKey) {
  return rows.reduce((acc, row) => {
    const key = getKey(row) || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function sortedCounts(counts, limit = 50) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function table(rows, columns) {
  const header = `| ${columns.map((col) => col.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((col) => String(col.value(row) ?? '').replace(/\n/g, '<br>').replace(/\|/g, '\\|')).join(' | ')} |`);
  return [header, divider, ...body].join('\n');
}

function isDedicatedSource(row) {
  const host = hostOf(row.url);
  return DEDICATED_SOURCE_DOMAINS.some((domain) => host.includes(domain));
}

function isStrictPruneCandidate(row) {
  if (row.action !== 'reject') return false;
  const flags = new Set(row.flags || []);
  if (flags.has('search_or_index_page')) return true;
  if (flags.has('download_shell')) return true;
  if (flags.has('missing_person_name') && (row.matched?.names || []).length === 0) return true;
  return false;
}

function priorityFor(row) {
  if (row.action === 'reject') return 'high';
  if (row.action === 'review') return 'medium';
  return 'low';
}

function sourceQueries(row) {
  const person = row.person;
  const title = row.title && row.title !== person ? row.title : '';
  const orgs = [
    ...(row.matched?.organizations || []),
  ].slice(0, 2);
  const terms = [person, ...orgs, title].filter(Boolean);
  return [
    terms.join(' '),
    `${person} ${hostOf(row.url)}`.trim(),
  ];
}

function toClaim(row) {
  return {
    claimId: `source-quality:${row.rawPoolItemId}`,
    personId: row.personId,
    person: row.person,
    status: row.status,
    surface: 'source_quality.exa',
    fieldPath: `RawPoolItem[${row.rawPoolItemId}]`,
    objectType: 'rawPoolItem',
    objectId: row.rawPoolItemId,
    objectLabel: row.title || row.url,
    claimType: 'source_item_belongs_to_person',
    priority: priorityFor(row),
    claimText: `Exa source item "${row.title || row.url}" is attached to ${row.person}. Source-quality gate classified it as ${row.action} with flags: ${(row.flags || []).join(', ')}. Text preview: ${compact(row.textPreview, 700)}`,
    verificationQuestion: 'Does this external Exa source truly belong to the target person and remain suitable for that person page? If not, should it be deleted, refetched via a dedicated source, rewritten conservatively, or sent to human review?',
    expectedVerdicts: ['supported', 'unsupported', 'over_attributed', 'wrong_person', 'stale', 'needs_source', 'unclear'],
    value: {
      id: row.rawPoolItemId,
      sourceType: 'exa',
      url: row.url,
      title: row.title,
      text: row.textPreview,
      sourceQualityAction: row.action,
      sourceQualityScore: row.score,
      sourceQualityFlags: row.flags,
      sourceQualityReasons: row.reasons,
      host: hostOf(row.url),
    },
    sourceHints: [{ url: row.url, label: 'exa' }],
    personContext: {
      matched: row.matched,
      status: row.status,
    },
    remediationHints: {
      deterministicPruneCandidate: isStrictPruneCandidate(row),
      dedicatedSourceCandidate: isDedicatedSource(row),
      sourceQueries: sourceQueries(row),
      safeToAutoApply: false,
      reason: 'Rule-based source-quality gate can block future ingestion, but existing deletes still need MiMo or human confirmation.',
    },
  };
}

function main() {
  const payload = readJson(REPORT_IN);
  const rows = (payload.rows || []).filter((row) => row.action !== 'accept');
  const strictPruneCandidates = rows.filter(isStrictPruneCandidate);
  const dedicatedSourceCandidates = rows.filter(isDedicatedSource);
  const mimoReviewCandidates = rows.map(toClaim);
  const humanReviewCandidates = rows.filter((row) => row.action === 'review' || row.action === 'demote');

  fs.mkdirSync(path.dirname(CLAIMS_OUT), { recursive: true });
  fs.writeFileSync(CLAIMS_OUT, mimoReviewCandidates.map((claim) => JSON.stringify(claim)).join('\n') + (mimoReviewCandidates.length ? '\n' : ''));

  const summary = {
    generatedAt: new Date().toISOString(),
    reportIn: REPORT_IN,
    claimsOut: CLAIMS_OUT,
    scanned: payload.summary?.scanned ?? null,
    problemRows: rows.length,
    strictPruneCandidates: strictPruneCandidates.length,
    dedicatedSourceCandidates: dedicatedSourceCandidates.length,
    mimoReviewCandidates: mimoReviewCandidates.length,
    humanReviewCandidates: humanReviewCandidates.length,
    byAction: groupCount(rows, (row) => row.action),
    byHost: groupCount(rows, (row) => hostOf(row.url)),
    topPeople: groupCount(rows, (row) => row.person),
    topFlags: groupCount(rows.flatMap((row) => (row.flags || []).map((flag) => ({ flag }))), (row) => row.flag),
  };

  const output = {
    summary,
    queues: {
      strictPruneCandidates: strictPruneCandidates.map((row) => ({
        rawPoolItemId: row.rawPoolItemId,
        person: row.person,
        title: row.title,
        url: row.url,
        action: row.action,
        score: row.score,
        flags: row.flags,
        reasons: row.reasons,
        safeToAutoApply: false,
      })),
      dedicatedSourceCandidates: dedicatedSourceCandidates.map((row) => ({
        rawPoolItemId: row.rawPoolItemId,
        person: row.person,
        title: row.title,
        url: row.url,
        host: hostOf(row.url),
        sourceQueries: sourceQueries(row),
      })),
      humanReviewCandidates: humanReviewCandidates.map((row) => ({
        rawPoolItemId: row.rawPoolItemId,
        person: row.person,
        title: row.title,
        url: row.url,
        action: row.action,
        score: row.score,
        flags: row.flags,
        reasons: row.reasons,
      })),
    },
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(output, null, 2)}\n`);

  const topPeopleRows = sortedCounts(summary.topPeople, 30);
  const topHostRows = sortedCounts(summary.byHost, 30);
  const strictExamples = output.queues.strictPruneCandidates.slice(0, 30);
  const humanExamples = output.queues.humanReviewCandidates.slice(0, 30);

  const lines = [
    '# Exa Source Quality Remediation',
    '',
    `Generated at: ${summary.generatedAt}`,
    `Report input: ${REPORT_IN}`,
    `MiMo claims output: ${CLAIMS_OUT}`,
    '',
    '## Queue Sizes',
    '',
    table([
      { queue: 'strict prune candidates', count: summary.strictPruneCandidates },
      { queue: 'dedicated source candidates', count: summary.dedicatedSourceCandidates },
      { queue: 'MiMo review claims', count: summary.mimoReviewCandidates },
      { queue: 'human review candidates', count: summary.humanReviewCandidates },
    ], [
      { label: 'Queue', value: (row) => row.queue },
      { label: 'Count', value: (row) => row.count },
    ]),
    '',
    '## Top People',
    '',
    table(topPeopleRows, [
      { label: 'Person', value: (row) => row.key },
      { label: 'Count', value: (row) => row.count },
    ]),
    '',
    '## Top Hosts',
    '',
    table(topHostRows, [
      { label: 'Host', value: (row) => row.key },
      { label: 'Count', value: (row) => row.count },
    ]),
    '',
    '## Strict Prune Examples',
    '',
    table(strictExamples, [
      { label: 'Person', value: (row) => row.person },
      { label: 'Title', value: (row) => compact(row.title, 90) },
      { label: 'Flags', value: (row) => (row.flags || []).join(', ') },
      { label: 'Reason', value: (row) => compact((row.reasons || []).join('; '), 120) },
      { label: 'URL', value: (row) => row.url },
    ]),
    '',
    '## Review Examples',
    '',
    table(humanExamples, [
      { label: 'Person', value: (row) => row.person },
      { label: 'Action', value: (row) => row.action },
      { label: 'Title', value: (row) => compact(row.title, 90) },
      { label: 'Flags', value: (row) => (row.flags || []).join(', ') },
      { label: 'Reason', value: (row) => compact((row.reasons || []).join('; '), 120) },
      { label: 'URL', value: (row) => row.url },
    ]),
    '',
    '## Execution Rule',
    '',
    '- This script is read-only and marks no queue as auto-applicable.',
    '- Existing RawPoolItem deletion should still pass MiMo review or explicit human confirmation.',
    '- Future ingestion is already protected by `lib/skills/source-quality-policy.ts`.',
    '',
  ];

  fs.mkdirSync(path.dirname(MARKDOWN_OUT), { recursive: true });
  fs.writeFileSync(MARKDOWN_OUT, `${lines.join('\n')}\n`);

  console.log(JSON.stringify({
    out: OUT,
    claimsOut: CLAIMS_OUT,
    markdownOut: MARKDOWN_OUT,
    summary,
  }, null, 2));
}

main();
