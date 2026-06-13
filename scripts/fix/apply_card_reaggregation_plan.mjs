/**
 * Apply a reviewed per-person card reaggregation plan.
 *
 * Default is dry-run. Execute mode requires --person and archives current
 * active cards before inserting MiMo-reviewed keep/rewrite cards.
 *
 * Usage:
 *   node scripts/fix/apply_card_reaggregation_plan.mjs
 *   node scripts/fix/apply_card_reaggregation_plan.mjs --person=杨植麟
 *   node scripts/fix/apply_card_reaggregation_plan.mjs --person=杨植麟 --execute
 *   node scripts/fix/apply_card_reaggregation_plan.mjs --person=杨植麟 --execute --generation-id=card-reagg-2026-06-10
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const PLAN_IN = getArg('--plan')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_plan.json';
const REVIEW_IN = getArg('--review')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_plan_mimo_review.json';
const OUT = getArg('--out')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_apply_log.json';
const ARCHIVE_OUT = getArg('--archive')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_apply_archive.json';
const REPORT_OUT = getArg('--report-out')
  || 'docs/audit-2026-06/CARD_REAGGREGATION_APPLY.md';
const PERSON_FILTER = getArg('--person');
const MIN_CARDS = numberArg('--min-cards', 3);
const EXECUTE = process.argv.includes('--execute');
const INCLUDE_ARCHIVED = process.argv.includes('--include-archived');
const STRATEGY = getArg('--strategy') || 'archive-active';
const GENERATION_ID = getArg('--generation-id') || `card-reaggregation:${new Date().toISOString()}`;

loadExtraEnv();

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
if (EXECUTE && !PERSON_FILTER) {
  throw new Error('--execute requires --person so card replacement stays scoped to one person.');
}
if (!['archive-active', 'hard-delete'].includes(STRATEGY)) {
  throw new Error('--strategy must be archive-active or hard-delete.');
}

const sql = neon(process.env.DATABASE_URL);

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

function compact(text, max = 120) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function table(rows, columns) {
  const header = `| ${columns.map((col) => col.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((col) => String(col.value(row) ?? '').replace(/\n/g, '<br>').replace(/\|/g, '\\|')).join(' | ')} |`);
  return [header, divider, ...body].join('\n');
}

function loadInputs() {
  const plan = JSON.parse(fs.readFileSync(PLAN_IN, 'utf8'));
  const review = JSON.parse(fs.readFileSync(REVIEW_IN, 'utf8'));
  const reviews = review.reviews || [];
  const reviewsByPerson = new Map();
  for (const item of reviews) {
    const list = reviewsByPerson.get(item.personId) || [];
    list.push(item);
    reviewsByPerson.set(item.personId, list);
  }
  return { plan, review, reviewsByPerson };
}

function reviewedCardsForPerson(reviews) {
  return reviews
    .filter((item) => item.decision === 'keep' || item.decision === 'rewrite')
    .map((item) => item.decision === 'rewrite' && item.rewrittenCard ? item.rewrittenCard : item.card)
    .map((card) => ({
      id: crypto.randomUUID(),
      type: card.type,
      title: card.title,
      content: card.content,
      tags: Array.isArray(card.tags) ? card.tags : [],
      sourceUrl: card.sourceUrl || null,
      importance: Number.isFinite(Number(card.importance)) ? Math.max(1, Math.min(5, Math.round(Number(card.importance)))) : 3,
    }));
}

async function currentCards(personId) {
  return await sql`
    SELECT
      id,
      type,
      title,
      content,
      tags,
      "sourceUrl",
      importance,
      "generationId",
      "isActive",
      "archivedAt"::text AS "archivedAt",
      "createdAt"::text AS "createdAt",
      "updatedAt"::text AS "updatedAt"
    FROM "Card"
    WHERE "personId" = ${personId}
      AND (${INCLUDE_ARCHIVED} OR "isActive" = true)
    ORDER BY "isActive" DESC, "createdAt" DESC
  `;
}

async function applyPerson(person, nextCards) {
  const now = new Date();
  if (STRATEGY === 'hard-delete') {
    await sql.transaction((txn) => [
      txn`DELETE FROM "Card" WHERE "personId" = ${person.personId}`,
      ...nextCards.map((card) => txn`
        INSERT INTO "Card" (
          id, "personId", type, title, content, tags, "sourceUrl", importance,
          "generationId", "isActive", "createdAt", "updatedAt"
        )
        VALUES (
          ${card.id},
          ${person.personId},
          ${card.type},
          ${card.title},
          ${card.content},
          ${card.tags},
          ${card.sourceUrl},
          ${card.importance},
          ${GENERATION_ID},
          ${true},
          ${now},
          ${now}
        )
      `),
    ]);
    return;
  }

  await sql.transaction((txn) => [
    txn`
      UPDATE "Card"
      SET "isActive" = false,
          "archivedAt" = ${now},
          "updatedAt" = ${now}
      WHERE "personId" = ${person.personId}
        AND "isActive" = true
    `,
    ...nextCards.map((card) => txn`
      INSERT INTO "Card" (
        id, "personId", type, title, content, tags, "sourceUrl", importance,
        "generationId", "isActive", "createdAt", "updatedAt"
      )
      VALUES (
        ${card.id},
        ${person.personId},
        ${card.type},
        ${card.title},
        ${card.content},
        ${card.tags},
        ${card.sourceUrl},
        ${card.importance},
        ${GENERATION_ID},
        ${true},
        ${now},
        ${now}
      )
    `),
  ]);
}

function writeReport(summary, people) {
  const lines = [
    '# Card Reaggregation Apply',
    '',
    `Generated at: ${summary.generatedAt}`,
    `Mode: ${summary.mode}`,
    `Strategy: ${summary.strategy}`,
    `Generation ID: ${summary.generationId}`,
    `Plan: ${PLAN_IN}`,
    `Review: ${REVIEW_IN}`,
    '',
    '## Counts',
    '',
    table([
      { metric: 'people considered', value: summary.peopleConsidered },
      { metric: 'people eligible', value: summary.peopleEligible },
      { metric: INCLUDE_ARCHIVED ? 'current cards including archived' : 'current active cards', value: summary.existingCards },
      { metric: 'replacement cards', value: summary.replacementCards },
      { metric: 'skipped people', value: summary.skippedPeople },
    ], [
      { label: 'Metric', value: (row) => row.metric },
      { label: 'Value', value: (row) => row.value },
    ]),
    '',
    '## People',
    '',
    table(people.map((item) => ({
      person: item.person,
      status: item.status,
      existingCards: item.currentCards.length,
      replacementCards: item.nextCards.length,
      skippedReason: item.skippedReason || '',
    })), [
      { label: 'Person', value: (row) => row.person },
      { label: 'Status', value: (row) => row.status },
      { label: 'Existing Cards', value: (row) => row.existingCards },
      { label: 'Replacement Cards', value: (row) => row.replacementCards },
      { label: 'Skipped', value: (row) => row.skippedReason },
    ]),
    '',
    '## Replacement Samples',
    '',
    ...people.flatMap((item) => [
      `### ${item.person}`,
      '',
      ...(item.nextCards.length
        ? item.nextCards.map((card) => `- ${card.type}/${card.importance}: ${card.title} — ${compact(card.content, 120)}`)
        : [`- ${item.skippedReason || 'no replacement cards'}`]),
      '',
    ]),
    '## Execution Rule',
    '',
    '- Dry-run only unless --execute is passed.',
    "- Execute mode requires --person and archives that person's current active Card rows by default.",
    '- Use --strategy=hard-delete only for one-off legacy repair with a reviewed archive.',
    '- Archive JSON contains the current cards, replacement cards, strategy, and generation ID for rollback/review.',
    '',
  ];
  fs.writeFileSync(REPORT_OUT, `${lines.join('\n')}\n`);
}

async function main() {
  const { plan, reviewsByPerson } = loadInputs();
  const plannedPeople = (plan.people || [])
    .filter((person) => !PERSON_FILTER || person.personId === PERSON_FILTER || person.person === PERSON_FILTER);

  const people = [];
  for (const person of plannedPeople) {
    const reviews = reviewsByPerson.get(person.personId) || [];
    const nextCards = reviewedCardsForPerson(reviews);
    const cards = await currentCards(person.personId);
    const skippedReason = nextCards.length < MIN_CARDS
      ? `reviewed replacement cards below min-cards (${nextCards.length}/${MIN_CARDS})`
      : null;
    people.push({
      personId: person.personId,
      person: person.person,
      status: person.status,
      currentCards: cards,
      nextCards,
      reviewDecisions: reviews.map((item) => ({
        title: item.card.title,
        decision: item.decision,
        confidence: item.confidence,
        reason: item.reason,
      })),
      skippedReason,
    });
  }

  const eligible = people.filter((person) => !person.skippedReason);
  if (EXECUTE) {
    for (const person of eligible) {
      await applyPerson(person, person.nextCards);
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: EXECUTE ? 'execute' : 'dry-run',
    strategy: STRATEGY,
    generationId: GENERATION_ID,
    planIn: PLAN_IN,
    reviewIn: REVIEW_IN,
    peopleConsidered: people.length,
    peopleEligible: eligible.length,
    existingCards: people.reduce((sum, person) => sum + person.currentCards.length, 0),
    replacementCards: eligible.reduce((sum, person) => sum + person.nextCards.length, 0),
    skippedPeople: people.filter((person) => person.skippedReason).length,
  };

  const archive = {
    generatedAt: summary.generatedAt,
    summary,
    people,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(ARCHIVE_OUT, `${JSON.stringify(archive, null, 2)}\n`);
  writeReport(summary, people);

  console.log(JSON.stringify({
    out: OUT,
    archive: ARCHIVE_OUT,
    reportOut: REPORT_OUT,
    summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
