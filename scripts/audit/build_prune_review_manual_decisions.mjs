/**
 * Build a conservative manual-prune decision batch from the remaining
 * reject/review tail.
 *
 * This is read-only. It only proposes RawPoolItem deletes for latest `reject`
 * rows whose capture is clearly unusable, and skips any row currently used by
 * active Card.sourceUrl or People display/source JSON.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const INPUT = getArg('--in') || 'docs/audit-2026-06/data/prune_candidates_after_seventh_manual_review_prune.json';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/prune_review_manual_decisions_eighth_2026_06_10.json';
const REPORT_OUT = getArg('--report-out') || 'docs/audit-2026-06/PRUNE_REVIEW_MANUAL_EIGHTH_DECISIONS.md';
const LIMIT = numberArg('--limit', 40);
const PER_PERSON = numberArg('--per-person', 3);
const INCLUDE_REVIEW = process.argv.includes('--include-review');

loadExtraEnv();
if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

const deleteSignals = [
  'google scholar',
  'github',
  'linkedin',
  'medium',
  'crunchbase',
  'handwiki',
  'the org',
  '登录',
  '导航',
  '网页框架',
  '网页菜单',
  '系统错误',
  '抓取失败',
  '无实质',
  '缺乏实质',
  '内容仅为',
  '仅为',
  'ui',
];

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function numberArg(name, fallback) {
  const raw = getArg(name);
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

function normalizeUrl(value) {
  return String(value || '')
    .trim()
    .replace(/#.*$/, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

function compact(text, max = 180) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function mdEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function includesSignal(row) {
  const text = [row.title, row.url, row.reason].join(' ').toLowerCase();
  return deleteSignals.some(signal => text.includes(signal.toLowerCase()));
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

async function loadRawRows(ids) {
  if (!ids.length) return [];
  return await sql`
    SELECT
      raw.id,
      raw."personId",
      p.name AS person,
      raw."sourceType",
      raw.url,
      raw.title
    FROM "RawPoolItem" raw
    JOIN "People" p ON p.id = raw."personId"
    WHERE raw.id = ANY(${ids}::text[])
  `;
}

async function loadCards() {
  return await sql`
    SELECT id, "personId", title, "sourceUrl"
    FROM "Card"
    WHERE "isActive" = true
      AND "sourceUrl" IS NOT NULL
  `;
}

async function loadPeople() {
  return await sql`
    SELECT
      id,
      name,
      "officialLinks",
      products,
      education,
      quotes,
      "topicDetails",
      highlights,
      "sourceWhitelist",
      "avatarUrl",
      "whyImportant",
      description
    FROM "People"
  `;
}

function buildPeopleHaystack(person) {
  return JSON.stringify({
    officialLinks: person.officialLinks,
    products: person.products,
    education: person.education,
    quotes: person.quotes,
    topicDetails: person.topicDetails,
    highlights: person.highlights,
    sourceWhitelist: person.sourceWhitelist,
    avatarUrl: person.avatarUrl,
    whyImportant: person.whyImportant,
    description: person.description,
  }).toLowerCase();
}

function dependencyFor(row, cardByUrl, peopleHaystacks) {
  const url = normalizeUrl(row.url);
  if (!url) return null;

  const cardDeps = cardByUrl.get(url) || [];
  if (cardDeps.length) {
    return {
      type: 'active_card_source_url',
      refs: cardDeps.map(card => ({ id: card.id, personId: card.personId, title: card.title })),
    };
  }

  const peopleDeps = [];
  for (const person of peopleHaystacks) {
    if (person.haystack.includes(row.url.toLowerCase()) || person.haystack.includes(url)) {
      peopleDeps.push({ id: person.id, name: person.name });
    }
  }
  if (peopleDeps.length) return { type: 'people_display_or_source_json', refs: peopleDeps };

  return null;
}

function decisionFor(row) {
  return {
    personId: row.personId,
    person: row.person,
    target: {
      objectType: 'RawPoolItem',
      objectId: row.rawId,
      objectLabel: row.title || row.url,
    },
    action: 'delete_raw_pool_item',
    verdict: 'reject',
    confidence: 0.9,
    reason: `${compact(row.reason, 180)} No active Card.sourceUrl or People display/source JSON dependency was found.`,
    reviewedAt: new Date().toISOString(),
    reviewer: {
      provider: 'codex',
      model: 'manual_prune_low_information_capture',
    },
  };
}

function writeReport(payload) {
  const lines = [
    '# Prune Review Manual Decisions',
    '',
    `Generated at: ${payload.generatedAt}`,
    `Input: ${payload.input}`,
    '',
    '## Counts',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| source rows scanned | ${payload.summary.sourceRowsScanned} |`,
    `| signal rows | ${payload.summary.signalRows} |`,
    `| missing RawPoolItem rows | ${payload.summary.missingRawRows} |`,
    `| dependency skipped | ${payload.summary.dependencySkipped} |`,
    `| decisions | ${payload.decisions.length} |`,
    '',
    '## By Person',
    '',
    '| Person | Count |',
    '| --- | ---: |',
    ...Object.entries(payload.byPerson).map(([person, count]) => `| ${mdEscape(person)} | ${count} |`),
    '',
    '## Decisions',
    '',
    '| Person | Source | Target | Reason |',
    '| --- | --- | --- | --- |',
    ...payload.selectedRows.map(row => [
      row.person,
      row.sourceType,
      compact(row.title || row.url, 90),
      compact(row.reason, 160),
    ].map(mdEscape).join(' | ').replace(/^/, '| ').replace(/$/, ' |')),
    '',
    '## Safety',
    '',
    '- Only latest `reject` rows are included by default.',
    '- Rows with active Card.sourceUrl dependencies are skipped.',
    '- Rows whose URL appears in People display/source JSON are skipped.',
    '- This file is a decision queue only; use the manual apply script for dry-run/execute.',
    '',
  ];
  fs.writeFileSync(REPORT_OUT, `${lines.join('\n')}\n`);
}

async function main() {
  const input = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  const sourceRows = [
    ...(input.full?.prunable || []),
    ...(INCLUDE_REVIEW ? (input.full?.review || []) : []),
  ].filter(row => INCLUDE_REVIEW || row.verdict === 'reject');

  const signalRows = sourceRows
    .filter(includesSignal)
    .sort((a, b) => a.person.localeCompare(b.person) || a.sourceType.localeCompare(b.sourceType) || a.title.localeCompare(b.title));

  const rawRows = await loadRawRows([...new Set(signalRows.map(row => row.rawId).filter(Boolean))]);
  const rawById = new Map(rawRows.map(row => [row.id, row]));
  const cards = await loadCards();
  const cardByUrl = new Map();
  for (const card of cards) {
    const key = normalizeUrl(card.sourceUrl);
    if (!key) continue;
    cardByUrl.set(key, [...(cardByUrl.get(key) || []), card]);
  }
  const peopleHaystacks = (await loadPeople()).map(person => ({
    id: person.id,
    name: person.name,
    haystack: buildPeopleHaystack(person),
  }));

  const selectedRows = [];
  const skipped = [];
  const byPerson = new Map();

  for (const row of signalRows) {
    const raw = rawById.get(row.rawId);
    if (!raw) {
      skipped.push({ row, reason: 'missing_raw_pool_item' });
      continue;
    }
    const dependency = dependencyFor(row, cardByUrl, peopleHaystacks);
    if (dependency) {
      skipped.push({ row, reason: 'display_dependency', dependency });
      continue;
    }
    const current = byPerson.get(row.person) || 0;
    if (current >= PER_PERSON) continue;
    selectedRows.push({ ...row, personId: raw.personId });
    byPerson.set(row.person, current + 1);
    if (selectedRows.length >= LIMIT) break;
  }

  const decisions = selectedRows.map(decisionFor);
  const payload = {
    generatedAt: new Date().toISOString(),
    input: INPUT,
    scope: 'eighth manual prune batch; latest reject tail only by default; selected after active Card/source URL and People JSON dependency checks',
    criteria: {
      includeReview: INCLUDE_REVIEW,
      limit: LIMIT,
      perPerson: PER_PERSON,
      signals: deleteSignals,
    },
    summary: {
      sourceRowsScanned: sourceRows.length,
      signalRows: signalRows.length,
      missingRawRows: skipped.filter(row => row.reason === 'missing_raw_pool_item').length,
      dependencySkipped: skipped.filter(row => row.reason === 'display_dependency').length,
      decisions: decisions.length,
    },
    decisions,
    byPerson: countBy(decisions, row => row.person),
    selectedRows,
    skipped,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  writeReport(payload);

  console.log(JSON.stringify({
    out: OUT,
    reportOut: REPORT_OUT,
    summary: payload.summary,
    byPerson: payload.byPerson,
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
