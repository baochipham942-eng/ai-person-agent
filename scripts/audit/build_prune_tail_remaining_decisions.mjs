/**
 * Build conservative manual decisions for prune-tail rows unresolved after
 * Tavily+MiMo refetch. Read-only.
 *
 * Default scope is latest `reject` rows only. Review rows stay deferred unless
 * explicitly included, because `human_review` is not a delete signal by itself.
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
const OUT = getArg('--out') || 'docs/audit-2026-06/data/prune_tail_remaining_manual_decisions.json';
const REPORT_OUT = getArg('--report-out') || 'docs/audit-2026-06/PRUNE_TAIL_REMAINING_MANUAL_DECISIONS.md';
const BATCHES = numberArg('--batches', 26);
const LIMIT = numberArg('--limit', 0);
const INCLUDE_REVIEW = process.argv.includes('--include-review');

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
  const url = normalizeUrl(row.originalUrl || row.originalSource?.url);
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

function batchPath(index) {
  const tag = index === 1 ? '' : `_batch${index}`;
  return `${BATCH_PREFIX}${tag}_curated.jsonl`;
}

function loadRows() {
  const queueByClaim = new Map(readJsonl(QUEUE).map((row) => [row.claimId, row]));
  const rows = [];
  for (let index = 1; index <= BATCHES; index += 1) {
    for (const row of readJsonl(batchPath(index))) {
      if (!['human_review', 'no_good_source'].includes(row.decision)) continue;
      const queueRow = queueByClaim.get(row.claimId);
      if (!queueRow) continue;
      const latestVerdict = queueRow.queueMeta?.latestVerdict || queueRow.verdict;
      if (latestVerdict !== 'reject' && !INCLUDE_REVIEW) continue;
      rows.push({
        ...row,
        batch: index,
        latestVerdict,
        priority: queueRow.priority,
        originalUrl: queueRow.queueMeta?.originalUrl || row.originalSource?.url,
        originalTitle: queueRow.queueMeta?.originalTitle || row.target?.objectLabel,
        originalReason: queueRow.queueMeta?.originalReason || queueRow.rationale || '',
        originalSourceType: queueRow.queueMeta?.sourceType || row.originalSource?.sourceType,
      });
    }
  }
  return rows;
}

function reasonFor(row) {
  const base = compact(row.originalReason, 220);
  const refetch = row.decision === 'no_good_source'
    ? 'Refetch returned no_good_source.'
    : 'Refetch ended in human_review after curation.';
  return `删除。该行原始 QA 已判为 reject，原因：${base} ${refetch} 已确认无 active Card.sourceUrl 或 People display/source JSON 依赖。`;
}

function decisionFor(row) {
  return {
    claimId: row.claimId,
    personId: row.personId,
    person: row.person,
    target: {
      objectType: 'RawPoolItem',
      objectId: row.target?.objectId,
      objectLabel: row.originalTitle || row.target?.objectLabel,
    },
    action: 'delete_raw_pool_item',
    verdict: 'reject',
    confidence: 0.9,
    reason: reasonFor(row),
    reviewedAt: new Date().toISOString(),
    reviewer: {
      provider: 'codex',
      model: 'prune_tail_remaining_manual_adjudication',
    },
    evidence: {
      batch: row.batch,
      refetchDecision: row.decision,
      latestVerdict: row.latestVerdict,
      priority: row.priority,
      sourceType: row.originalSourceType,
      originalUrl: row.originalUrl,
    },
  };
}

function writeReport(payload) {
  const lines = [
    '# Prune Tail Remaining Manual Decisions',
    '',
    `Generated at: ${payload.generatedAt}`,
    `Queue: ${payload.queue}`,
    `Batches: ${payload.batches}`,
    '',
    '## Counts',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| unresolved rows scanned | ${payload.summary.unresolvedRowsScanned} |`,
    `| latest reject rows | ${payload.summary.latestRejectRows} |`,
    `| missing RawPoolItem rows | ${payload.summary.missingRawRows} |`,
    `| dependency skipped | ${payload.summary.dependencySkipped} |`,
    `| decisions | ${payload.decisions.length} |`,
    '',
    '## By Source Type',
    '',
    '| Source | Count |',
    '| --- | ---: |',
    ...Object.entries(payload.bySourceType).map(([source, count]) => `| ${mdEscape(source)} | ${count} |`),
    '',
    '## By Person',
    '',
    '| Person | Count |',
    '| --- | ---: |',
    ...Object.entries(payload.byPerson).map(([person, count]) => `| ${mdEscape(person)} | ${count} |`),
    '',
    '## Decisions',
    '',
    '| Person | Source | Refetch | Target | Reason |',
    '| --- | --- | --- | --- | --- |',
    ...payload.selectedRows.map((row) => [
      row.person,
      row.originalSourceType,
      row.decision,
      compact(row.originalTitle || row.originalUrl, 90),
      compact(row.originalReason, 150),
    ].map(mdEscape).join(' | ').replace(/^/, '| ').replace(/$/, ' |')),
    '',
    '## Safety',
    '',
    '- Default scope only includes rows whose latest QA verdict was `reject`.',
    '- Rows with active Card.sourceUrl dependencies are skipped.',
    '- Rows whose URL appears in People display/source JSON are skipped.',
    '- This file is a decision queue only; use `apply_hard_tail_manual_decisions.mjs` for dry-run/execute.',
    '',
  ];
  fs.writeFileSync(REPORT_OUT, `${lines.join('\n')}\n`);
}

async function main() {
  const unresolvedRows = loadRows();
  const latestRejectRows = unresolvedRows.filter((row) => row.latestVerdict === 'reject');
  const rawRows = await loadRawRows([...new Set(latestRejectRows.map((row) => row.target?.objectId).filter(Boolean))]);
  const rawById = new Map(rawRows.map((row) => [row.id, row]));

  const cards = await loadCards();
  const cardByUrl = new Map();
  for (const card of cards) {
    const key = normalizeUrl(card.sourceUrl);
    if (!key) continue;
    cardByUrl.set(key, [...(cardByUrl.get(key) || []), card]);
  }
  const peopleHaystacks = (await loadPeople()).map((person) => ({
    id: person.id,
    name: person.name,
    haystack: buildPeopleHaystack(person),
  }));

  const selectedRows = [];
  const dependencySkipped = [];
  const missingRawRows = [];
  for (const row of latestRejectRows) {
    if (!rawById.has(row.target?.objectId)) {
      missingRawRows.push(row);
      continue;
    }
    const dependency = dependencyFor(row, cardByUrl, peopleHaystacks);
    if (dependency) {
      dependencySkipped.push({ row, dependency });
      continue;
    }
    selectedRows.push(row);
  }

  const limitedRows = LIMIT > 0 ? selectedRows.slice(0, LIMIT) : selectedRows;
  const decisions = limitedRows.map(decisionFor);
  const payload = {
    generatedAt: new Date().toISOString(),
    queue: QUEUE,
    batches: BATCHES,
    includeReview: INCLUDE_REVIEW,
    limit: LIMIT,
    summary: {
      unresolvedRowsScanned: unresolvedRows.length,
      latestRejectRows: latestRejectRows.length,
      missingRawRows: missingRawRows.length,
      dependencySkipped: dependencySkipped.length,
      decisions: decisions.length,
    },
    byPerson: countBy(decisions, (row) => row.person),
    bySourceType: countBy(decisions, (row) => row.evidence?.sourceType),
    byRefetchDecision: countBy(decisions, (row) => row.evidence?.refetchDecision),
    dependencySkipped,
    missingRawRows,
    selectedRows: limitedRows,
    decisions,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  writeReport(payload);

  console.log(JSON.stringify({
    out: OUT,
    reportOut: REPORT_OUT,
    summary: payload.summary,
    bySourceType: payload.bySourceType,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
