/**
 * Export unresolved prune-tail rows whose original latest QA verdict was review.
 *
 * Read-only. This is the worklist after reject rows and card/source dependencies
 * have been handled.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const QUEUE = getArg('--queue') || 'docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl';
const BATCH_PREFIX = getArg('--batch-prefix') || 'docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/prune_tail_review_unresolved_rows.json';
const REPORT_OUT = getArg('--report-out') || 'docs/audit-2026-06/PRUNE_TAIL_REVIEW_UNRESOLVED.md';
const BATCHES = numberArg('--batches', 26);

loadExtraEnv();
if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

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

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function batchPath(index) {
  const tag = index === 1 ? '' : `_batch${index}`;
  return `${BATCH_PREFIX}${tag}_curated.jsonl`;
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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
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

function loadCuratedRows() {
  const queueByClaim = new Map(readJsonl(QUEUE).map((row) => [row.claimId, row]));
  const rows = [];
  for (let index = 1; index <= BATCHES; index += 1) {
    for (const row of readJsonl(batchPath(index))) {
      if (!['human_review', 'no_good_source'].includes(row.decision)) continue;
      const queueRow = queueByClaim.get(row.claimId);
      if (!queueRow) continue;
      rows.push({
        claimId: row.claimId,
        batch: index,
        personId: row.personId,
        person: row.person,
        rawId: row.target?.objectId,
        curatedDecision: row.decision,
        curatedReason: row.rationale || row.reason || '',
        originalLatestVerdict: queueRow.queueMeta?.latestVerdict || queueRow.verdict,
        priority: queueRow.priority,
        originalUrl: queueRow.queueMeta?.originalUrl || row.originalSource?.url,
        originalTitle: queueRow.queueMeta?.originalTitle || row.target?.objectLabel,
        originalReason: queueRow.queueMeta?.originalReason || queueRow.rationale || '',
        sourceType: queueRow.queueMeta?.sourceType || row.originalSource?.sourceType,
      });
    }
  }
  return rows;
}

async function dependencyFor(row, cardByUrl, peopleHaystacks) {
  const url = normalizeUrl(row.originalUrl);
  if (!url) return null;

  const cardDeps = cardByUrl.get(url) || [];
  if (cardDeps.length) {
    return {
      type: 'active_card_source_url',
      refs: cardDeps.map((card) => ({ id: card.id, personId: card.personId, title: card.title })),
    };
  }

  const peopleDeps = [];
  for (const person of peopleHaystacks) {
    if (person.haystack.includes(String(row.originalUrl || '').toLowerCase()) || person.haystack.includes(url)) {
      peopleDeps.push({ id: person.id, name: person.name });
    }
  }
  if (peopleDeps.length) return { type: 'people_display_or_source_json', refs: peopleDeps };
  return null;
}

function writeReport(payload) {
  const lines = [
    '# Prune Tail Review Unresolved',
    '',
    `Generated at: ${payload.generatedAt}`,
    `Queue: ${payload.queue}`,
    `Batches: ${payload.batches}`,
    '',
    '## Counts',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| curated unresolved rows | ${payload.summary.curatedUnresolvedRows} |`,
    `| existing RawPoolItem rows | ${payload.summary.existingRawPoolItems} |`,
    `| latest keep rows excluded | ${payload.summary.latestKeepRowsExcluded} |`,
    `| review unresolved rows | ${payload.rows.length} |`,
    `| dependency rows | ${payload.summary.dependencyRows} |`,
    '',
    '## Source Type',
    '',
    '| Source | Count |',
    '| --- | ---: |',
    ...Object.entries(payload.bySourceType).map(([source, count]) => `| ${mdEscape(source)} | ${count} |`),
    '',
    '## Curated Decision',
    '',
    '| Decision | Count |',
    '| --- | ---: |',
    ...Object.entries(payload.byCuratedDecision).map(([decision, count]) => `| ${mdEscape(decision)} | ${count} |`),
    '',
    '## Top People',
    '',
    '| Person | Count |',
    '| --- | ---: |',
    ...Object.entries(payload.topPeople).map(([person, count]) => `| ${mdEscape(person)} | ${count} |`),
    '',
    '## Rows',
    '',
    '| Person | Source | Refetch | Dependency | Target | Original Review Reason |',
    '| --- | --- | --- | --- | --- | --- |',
    ...payload.rows.map((row) => [
      row.person,
      row.sourceType,
      row.curatedDecision,
      row.dependency?.type || '',
      compact(row.originalTitle || row.originalUrl, 90),
      compact(row.originalReason || row.curatedReason, 160),
    ].map(mdEscape).join(' | ').replace(/^/, '| ').replace(/$/, ' |')),
    '',
    '## Safety',
    '',
    '- This report is read-only.',
    '- Rows here were original `review`, not `reject`.',
    '- They should not be batch-deleted without an explicit manual decision.',
    '',
  ];
  fs.writeFileSync(REPORT_OUT, `${lines.join('\n')}\n`);
}

async function main() {
  const curatedRows = loadCuratedRows();
  const ids = [...new Set(curatedRows.map((row) => row.rawId).filter(Boolean))];
  const rawRows = await sql`
    SELECT id, "personId", "urlHash"
    FROM "RawPoolItem"
    WHERE id = ANY(${ids}::text[])
  `;
  const rawById = new Map(rawRows.map((row) => [row.id, row]));
  const latestAuditRows = await sql`
    SELECT DISTINCT ON ("personId", "urlHash")
      "personId",
      "urlHash",
      verdict,
      stage,
      "createdAt"::text AS "createdAt"
    FROM "QAAuditLog"
    ORDER BY "personId", "urlHash", "createdAt" DESC
  `;
  const latestAuditByKey = new Map(latestAuditRows.map((row) => [`${row.personId}\t${row.urlHash}`, row]));

  const cards = await sql`
    SELECT id, "personId", title, "sourceUrl"
    FROM "Card"
    WHERE "isActive" = true
      AND "sourceUrl" IS NOT NULL
  `;
  const cardByUrl = new Map();
  for (const card of cards) {
    const key = normalizeUrl(card.sourceUrl);
    if (!key) continue;
    cardByUrl.set(key, [...(cardByUrl.get(key) || []), card]);
  }

  const people = await sql`
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
  const peopleHaystacks = people.map((person) => ({
    id: person.id,
    name: person.name,
    haystack: buildPeopleHaystack(person),
  }));

  const rows = [];
  let latestKeepRowsExcluded = 0;
  for (const row of curatedRows) {
    if (row.originalLatestVerdict !== 'review') continue;
    const raw = rawById.get(row.rawId);
    if (!raw) continue;
    const audit = latestAuditByKey.get(`${raw.personId}\t${raw.urlHash}`) || null;
    if (audit?.verdict === 'keep') {
      latestKeepRowsExcluded += 1;
      continue;
    }
    rows.push({
      ...row,
      latestDbVerdict: audit?.verdict || 'none',
      latestStage: audit?.stage || 'none',
      dependency: await dependencyFor(row, cardByUrl, peopleHaystacks),
    });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    queue: QUEUE,
    batches: BATCHES,
    summary: {
      curatedUnresolvedRows: curatedRows.length,
      existingRawPoolItems: rawRows.length,
      latestKeepRowsExcluded,
      reviewUnresolvedRows: rows.length,
      dependencyRows: rows.filter((row) => row.dependency).length,
    },
    bySourceType: countBy(rows, (row) => row.sourceType),
    byCuratedDecision: countBy(rows, (row) => row.curatedDecision),
    byLatestStage: countBy(rows, (row) => row.latestStage),
    topPeople: Object.fromEntries(Object.entries(countBy(rows, (row) => row.person)).slice(0, 30)),
    rows,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  writeReport(payload);

  console.log(JSON.stringify({
    out: OUT,
    reportOut: REPORT_OUT,
    summary: payload.summary,
    bySourceType: payload.bySourceType,
    byCuratedDecision: payload.byCuratedDecision,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
