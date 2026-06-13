/**
 * Build an additive refetch queue from the remaining prune reject/review tail.
 *
 * Read-only. It converts exported prune candidates into the same remediation
 * shape consumed by refetch_source_remediation.mjs, plus a compact claims JSONL
 * file for person context and original-source hints.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const INPUT = getArg('--in') || 'docs/audit-2026-06/data/prune_candidates_after_sixteenth_manual_review_prune.json';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl';
const CLAIMS_OUT = getArg('--claims-out') || OUT.replace(/_queue\.jsonl$/i, '_claims.jsonl');
const SUMMARY_OUT = getArg('--summary-out') || OUT.replace(/\.jsonl$/i, '_summary.json');
const REPORT_OUT = getArg('--report-out') || 'docs/audit-2026-06/PRUNE_TAIL_REFETCH_QUEUE.md';
const LIMIT = numberArg('--limit', 0);
const INCLUDE_REVIEW = !process.argv.includes('--reject-only');
const INCLUDE_REJECT = !process.argv.includes('--review-only');

loadExtraEnv();
if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

const LOW_VALUE_TERMS = [
  '仅包含',
  '内容仅为',
  '导航',
  '登录',
  'cookie',
  '页面加载',
  '加载错误',
  '页脚',
  '缺乏实质',
  '信息密度低',
  '信息量低',
  '过于简短',
  '碎片化',
  '标题党',
  '广告',
  '二维码',
  '无实质',
];

const AUTHORITY_HINT_TERMS = [
  'official',
  'profile',
  'interview',
  'transcript',
  'paper',
  'author',
  'blog',
  'news',
  'about',
  'github',
  'youtube',
  'podcast',
];

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function numberArg(name, fallback) {
  const raw = getArg(name);
  if (raw === '0') return 0;
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function loadExtraEnv() {
  for (const file of [
    path.join(os.homedir(), '.code-agent/.env'),
    path.resolve('.env'),
    path.resolve('.env.local'),
  ]) {
    try {
      const parsed = dotenv.parse(fs.readFileSync(file));
      for (const [key, value] of Object.entries(parsed)) {
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      // Optional env file.
    }
  }
}

function compact(text, max = 180) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function mdEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function uniq(values) {
  return [...new Set(values.map((value) => compact(value, 220)).filter(Boolean))];
}

function includesAny(text, terms) {
  const value = String(text || '').toLowerCase();
  return terms.some((term) => value.includes(term.toLowerCase()));
}

function claimIdFor(row) {
  return `prune-tail:${row.rawId || crypto.createHash('sha1').update(`${row.person}:${row.url}`).digest('hex')}`;
}

function splitWords(text) {
  return compact(text, 140)
    .replace(/[|()[\]{}"'“”‘’]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2)
    .slice(0, 12)
    .join(' ');
}

function queryFor(row, person) {
  const title = splitWords(row.title || '');
  const organizations = (person.organization || []).slice(0, 3);
  const topics = (person.topics || []).slice(0, 4);
  const products = (person.products || []).map((product) => product?.name || product?.title || product).filter(Boolean).slice(0, 3);
  const currentTitle = compact(person.currentTitle || '', 80);
  const contextTerms = uniq([...organizations, ...topics, ...products, currentTitle]).slice(0, 5);
  const sourceType = row.sourceType || 'source';
  const base = title ? `${row.person} ${title}` : `${row.person} AI`;
  const queries = [
    `${base} official source`,
    `${base} ${contextTerms.slice(0, 2).join(' ')} evidence`,
    `${row.person} ${title || sourceType} interview transcript`,
  ];
  if (sourceType === 'github') {
    queries.unshift(`${row.person} ${title} GitHub repository machine learning`);
  }
  if (sourceType === 'youtube' || sourceType === 'podcast') {
    queries.unshift(`${row.person} ${title} transcript`);
  }
  if (sourceType === 'openalex' || /paper|arxiv|neurips|icml|acl/i.test(row.title || '')) {
    queries.unshift(`${row.person} ${title} paper authors`);
  }
  if (!title || /^https?:|^\/\/|x\.com|twitter\.com/i.test(row.title || row.url || '')) {
    queries.unshift(`${row.person} official profile AI research`);
  }
  return uniq(queries).slice(0, 6);
}

function priorityScore(row, person) {
  let score = row.verdict === 'review' ? 60 : 35;
  const text = `${row.title || ''} ${row.reason || ''} ${row.url || ''}`;
  if (includesAny(text, AUTHORITY_HINT_TERMS)) score += 10;
  if (includesAny(text, LOW_VALUE_TERMS)) score -= 8;
  if (row.sourceType === 'exa') score += 8;
  if (row.sourceType === 'youtube' || row.sourceType === 'podcast') score += 6;
  if (row.sourceType === 'github') score += 4;
  if (row.sourceType === 'x') score -= 6;
  if ((person.organization || []).length) score += 3;
  return score;
}

function evidenceRequirements(row) {
  const label = compact(row.title || row.url, 120);
  return [
    `Source must name ${row.person} directly.`,
    `Source must support why "${label}" belongs on this person's page, or provide a better authoritative replacement.`,
    'Prefer official profile, institution/company page, paper detail page, author page, interview transcript, or reliable media with clear attribution.',
    'Do not use search pages, login walls, empty captures, generic product pages without person role, or social snippets without context as replace_source.',
  ];
}

function queueRow(row, person) {
  const claimId = claimIdFor(row);
  const score = priorityScore(row, person);
  const sourceQueries = queryFor(row, person);
  return {
    claimId,
    personId: row.personId,
    person: row.person,
    claimType: 'source_item_belongs_to_person',
    verdict: 'needs_source',
    reviewAction: 'needs_source',
    remediationAction: 'refetch_source',
    safeToAutoApply: false,
    confidence: 0,
    target: {
      objectType: 'RawPoolItem',
      objectId: row.rawId,
      objectLabel: row.title || row.url,
    },
    proposedValue: null,
    proposedText: null,
    sourceQueries,
    evidenceRequirements: evidenceRequirements(row),
    rationale: `Remaining prune tail row after conservative delete pass. Latest QA verdict=${row.verdict}; reason=${compact(row.reason, 180)}.`,
    blockers: ['manual_review_required', 'prune_tail_refetch_required'],
    reviewedAt: new Date().toISOString(),
    reviewer: {
      provider: 'codex',
      model: 'build_prune_tail_refetch_queue',
    },
    priority: score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low',
    queueMeta: {
      sourceType: row.sourceType,
      latestVerdict: row.verdict,
      priorityScore: score,
      originalUrl: row.url,
      originalTitle: row.title,
      originalReason: row.reason,
    },
  };
}

function claimRow(row, person) {
  return {
    claimId: claimIdFor(row),
    personId: row.personId,
    person: row.person,
    personContext: {
      matched: {
        names: uniq([row.person, person.name, person.nameZh, person.nameEn]),
        organizations: uniq(person.organization || []),
        topics: uniq(person.topics || []),
      },
      currentTitle: person.currentTitle || null,
      products: person.products || [],
    },
    surface: 'raw_pool_item',
    fieldPath: 'RawPoolItem',
    objectType: 'RawPoolItem',
    objectLabel: row.title || row.url,
    claimType: 'source_item_belongs_to_person',
    priority: row.verdict === 'review' ? 'high' : 'medium',
    claimText: `Evaluate whether this RawPoolItem should remain attached to ${row.person}, or find an authoritative replacement source: ${row.title || row.url}`,
    verificationQuestion: `Does this source or a better authoritative replacement directly support a useful ${row.person} page fact?`,
    sourceHints: [
      {
        url: row.url,
        title: row.title,
        sourceType: row.sourceType,
        reason: row.reason,
      },
    ],
    value: {
      id: row.rawId,
      url: row.url,
      title: row.title,
      sourceType: row.sourceType,
      verdict: row.verdict,
      reason: row.reason,
      auditedAt: row.auditedAt,
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

async function loadPeople(ids) {
  if (!ids.length) return new Map();
  const rows = await sql`
    SELECT id, name, organization, topics, products, "currentTitle"
    FROM "People"
    WHERE id = ANY(${ids}::text[])
  `;
  return new Map(rows.map((row) => [row.id, row]));
}

async function loadRawPeople(ids) {
  if (!ids.length) return new Map();
  const rows = await sql`
    SELECT
      raw.id AS "rawId",
      raw."personId",
      p.name AS person
    FROM "RawPoolItem" raw
    JOIN "People" p ON p.id = raw."personId"
    WHERE raw.id = ANY(${ids}::text[])
  `;
  return new Map(rows.map((row) => [row.rawId, row]));
}

function writeReport(summary, rows) {
  const lines = [
    '# Prune Tail Refetch Queue',
    '',
    `Generated at: ${summary.generatedAt}`,
    `Input: ${summary.input}`,
    '',
    '## Counts',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| source rows | ${summary.sourceRows} |`,
    `| queued rows | ${summary.queuedRows} |`,
    `| review rows queued | ${summary.byVerdict.review || 0} |`,
    `| reject rows queued | ${summary.byVerdict.reject || 0} |`,
    '',
    '## Priority',
    '',
    '| Priority | Count |',
    '| --- | ---: |',
    ...Object.entries(summary.byPriority).map(([key, count]) => `| ${mdEscape(key)} | ${count} |`),
    '',
    '## Source Type',
    '',
    '| Source | Count |',
    '| --- | ---: |',
    ...Object.entries(summary.bySourceType).map(([key, count]) => `| ${mdEscape(key)} | ${count} |`),
    '',
    '## Top People',
    '',
    '| Person | Count |',
    '| --- | ---: |',
    ...Object.entries(summary.topPeople).map(([person, count]) => `| ${mdEscape(person)} | ${count} |`),
    '',
    '## Sample',
    '',
    '| Person | Verdict | Source | Priority | Target | Queries |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.slice(0, 40).map((row) => [
      row.person,
      row.queueMeta.latestVerdict,
      row.queueMeta.sourceType,
      row.priority,
      compact(row.target.objectLabel, 70),
      row.sourceQueries.slice(0, 2).join('<br>'),
    ].map(mdEscape).join(' | ').replace(/^/, '| ').replace(/$/, ' |')),
    '',
    '## Next Command',
    '',
    '```bash',
    `node scripts/audit/refetch_source_remediation.mjs \\`,
    `  --provider=tavily --tavily-search-depth=advanced --tavily-raw-content=text \\`,
    `  --in=${OUT} \\`,
    `  --claims=${CLAIMS_OUT} \\`,
    `  --out=docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo.jsonl \\`,
    `  --summary-out=docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_summary.json \\`,
    `  --report-out=docs/audit-2026-06/PRUNE_TAIL_REFETCH_TAVILY_MIMO.md \\`,
    `  --limit=30 --resume --search-results=5 --max-candidates=10 --concurrency=1`,
    '```',
    '',
    '## Safety',
    '',
    '- This script is read-only and only writes queue/report files.',
    '- The queue is additive refetch only; it does not delete old RawPoolItem rows.',
    '- Any selected sources still need refetch MiMo review and apply dry-run before writes.',
    '',
  ];
  fs.writeFileSync(REPORT_OUT, `${lines.join('\n')}\n`);
}

async function main() {
  const input = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  const exportedRows = [
    ...(INCLUDE_REJECT ? (input.full?.prunable || []) : []),
    ...(INCLUDE_REVIEW ? (input.full?.review || []) : []),
  ];
  const rawPeople = await loadRawPeople([...new Set(exportedRows.map((row) => row.rawId).filter(Boolean))]);
  const sourceRows = exportedRows.map((row) => {
    const raw = rawPeople.get(row.rawId);
    return {
      ...row,
      personId: row.personId || raw?.personId || null,
      person: row.person || raw?.person || '',
    };
  });
  const people = await loadPeople([...new Set(sourceRows.map((row) => row.personId).filter(Boolean))]);
  const ranked = sourceRows
    .map((row) => ({ row, person: people.get(row.personId) || { id: row.personId, name: row.person } }))
    .sort((a, b) => (
      priorityScore(b.row, b.person) - priorityScore(a.row, a.person)
      || a.row.person.localeCompare(b.row.person)
      || String(a.row.title || '').localeCompare(String(b.row.title || ''))
    ));
  const selected = LIMIT > 0 ? ranked.slice(0, LIMIT) : ranked;
  const queueRows = selected.map(({ row, person }) => queueRow(row, person));
  const claimRows = selected.map(({ row, person }) => claimRow(row, person));
  const summary = {
    generatedAt: new Date().toISOString(),
    input: INPUT,
    output: OUT,
    claimsOut: CLAIMS_OUT,
    reportOut: REPORT_OUT,
    sourceRows: sourceRows.length,
    queuedRows: queueRows.length,
    includeReject: INCLUDE_REJECT,
    includeReview: INCLUDE_REVIEW,
    byVerdict: countBy(queueRows, (row) => row.queueMeta.latestVerdict),
    byPriority: countBy(queueRows, (row) => row.priority),
    bySourceType: countBy(queueRows, (row) => row.queueMeta.sourceType),
    topPeople: Object.fromEntries(Object.entries(countBy(queueRows, (row) => row.person)).slice(0, 30)),
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, queueRows.map((row) => JSON.stringify(row)).join('\n') + (queueRows.length ? '\n' : ''));
  fs.writeFileSync(CLAIMS_OUT, claimRows.map((row) => JSON.stringify(row)).join('\n') + (claimRows.length ? '\n' : ''));
  fs.writeFileSync(SUMMARY_OUT, `${JSON.stringify(summary, null, 2)}\n`);
  writeReport(summary, queueRows);

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
