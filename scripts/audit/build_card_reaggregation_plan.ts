/**
 * Build a reviewed card reaggregation plan from audited keep sources.
 *
 * This is read-only. It generates proposed replacement cards and archives the
 * current cards for each person, but does not mutate the database.
 *
 * Usage:
 *   bun scripts/audit/build_card_reaggregation_plan.ts --limit=5
 *   bun scripts/audit/build_card_reaggregation_plan.ts --person=周伯文 --top-n=8
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import { generateCardsForPerson, type Card } from '../../lib/ai/cardGenerator';

type PersonRow = {
  id: string;
  name: string;
  aliases: string[] | null;
  status: string;
};

type RawItem = {
  title: string;
  text: string;
  url: string;
  urlHash: string;
  sourceType: string;
  fetchedAt: string;
};

type ExistingCard = {
  id: string;
  type: string;
  title: string;
  content: string;
  tags: string[];
  sourceUrl: string | null;
  importance: number;
  createdAt: string;
  updatedAt: string;
};

type PlannedPerson = {
  personId: string;
  person: string;
  status: string;
  triggerSourceCount: number;
  usableSourceCount: number;
  existingCards: ExistingCard[];
  proposedCards: Card[];
  skippedReason?: string;
};

const args = process.argv.slice(2);

const SOURCE_ARCHIVE = readStringArg('source-archive')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_followup_mixed_apply_archive.json';
const OUT = readStringArg('out')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_plan.json';
const REPORT_OUT = readStringArg('report-out')
  || 'docs/audit-2026-06/CARD_REAGGREGATION_PLAN.md';
const LIMIT = readNumberArg('limit', 5);
const TOP_N = readNumberArg('top-n', 8);
const MIN_TEXT_LENGTH = readNumberArg('min-text', 200);
const MIN_ITEMS = readNumberArg('min-items', 3);
const PERSON = readStringArg('person');

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function readStringArg(name: string): string | undefined {
  return args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function readNumberArg(name: string, fallback: number): number {
  const raw = readStringArg(name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`--${name} must be a non-negative number`);
  return value;
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
}

function compact(text: string, max = 120): string {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function table(rows: Record<string, unknown>[], columns: { label: string; value: (row: Record<string, unknown>) => unknown }[]): string {
  const header = `| ${columns.map(col => col.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map(row => `| ${columns.map(col => String(col.value(row) ?? '').replace(/\n/g, '<br>').replace(/\|/g, '\\|')).join(' | ')} |`);
  return [header, divider, ...body].join('\n');
}

function sourceCountsFromArchive(): Map<string, number> {
  const archive = readJson(SOURCE_ARCHIVE) as {
    summary?: { topPeople?: Record<string, number> };
    inserted?: Array<{ person: string }>;
    existing?: Array<{ person: string }>;
  };

  const counts = new Map<string, number>();
  for (const [person, count] of Object.entries(archive.summary?.topPeople || {})) {
    counts.set(person, Number(count) || 0);
  }
  for (const item of [...(archive.inserted || []), ...(archive.existing || [])]) {
    if (!counts.has(item.person)) counts.set(item.person, 0);
  }
  return counts;
}

async function loadPeople(): Promise<Array<PersonRow & { triggerSourceCount: number }>> {
  if (PERSON) {
    const personLike = `%${PERSON}%`;
    const rows = await sql`
      SELECT id, name, aliases, status
      FROM "People"
      WHERE id = ${PERSON} OR name ILIKE ${personLike}
      ORDER BY "viewCount" DESC, "influenceScore" DESC, name ASC
      LIMIT ${LIMIT || 20}
    ` as PersonRow[];
    return rows.map(row => ({ ...row, triggerSourceCount: 0 }));
  }

  const counts = sourceCountsFromArchive();
  const names = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, LIMIT)
    .map(([name]) => name);

  if (!names.length) return [];

  const rows = await sql`
    SELECT id, name, aliases, status
    FROM "People"
    WHERE name = ANY(${names})
  ` as PersonRow[];

  const byName = new Map(rows.map(row => [row.name, row]));
  return names
    .map(name => byName.get(name))
    .filter((row): row is PersonRow => Boolean(row))
    .map(row => ({ ...row, triggerSourceCount: counts.get(row.name) || 0 }));
}

async function loadUsableRawItems(personId: string): Promise<RawItem[]> {
  return await sql`
    WITH latest_audit AS (
      SELECT DISTINCT ON ("urlHash") "urlHash", verdict
      FROM "QAAuditLog"
      WHERE "personId" = ${personId}
      ORDER BY "urlHash", "createdAt" DESC
    )
    SELECT r.title, r.text, r.url, r."urlHash", r."sourceType", r."fetchedAt"::text AS "fetchedAt"
    FROM "RawPoolItem" r
    JOIN latest_audit a ON a."urlHash" = r."urlHash"
    WHERE r."personId" = ${personId}
      AND a.verdict = ${'keep'}
      AND length(trim(r.text)) >= ${MIN_TEXT_LENGTH}
    ORDER BY r."fetchedAt" DESC, r."publishedAt" DESC NULLS LAST
  ` as RawItem[];
}

async function loadExistingCards(personId: string): Promise<ExistingCard[]> {
  return await sql`
    SELECT id, type, title, content, tags, "sourceUrl", importance, "createdAt"::text AS "createdAt", "updatedAt"::text AS "updatedAt"
    FROM "Card"
    WHERE "personId" = ${personId}
      AND "isActive" = true
    ORDER BY "createdAt" DESC
  ` as ExistingCard[];
}

async function buildPlan(): Promise<PlannedPerson[]> {
  const people = await loadPeople();
  const planned: PlannedPerson[] = [];

  for (const person of people) {
    const [usableItems, existingCards] = await Promise.all([
      loadUsableRawItems(person.id),
      loadExistingCards(person.id),
    ]);

    if (usableItems.length < MIN_ITEMS) {
      planned.push({
        personId: person.id,
        person: person.name,
        status: person.status,
        triggerSourceCount: person.triggerSourceCount,
        usableSourceCount: usableItems.length,
        existingCards,
        proposedCards: [],
        skippedReason: `usable sources below min-items (${usableItems.length}/${MIN_ITEMS})`,
      });
      continue;
    }

    const proposedCards = await generateCardsForPerson(
      person.id,
      person.name,
      usableItems.map(item => ({ title: item.title, text: item.text, url: item.url })),
      {
        topN: TOP_N,
        englishName: person.aliases?.[0] || person.name,
        existingCards: existingCards.slice(0, 20),
      },
    );

    planned.push({
      personId: person.id,
      person: person.name,
      status: person.status,
      triggerSourceCount: person.triggerSourceCount,
      usableSourceCount: usableItems.length,
      existingCards,
      proposedCards,
      skippedReason: proposedCards.length ? undefined : 'card generation returned no cards',
    });

    console.log(JSON.stringify({
      person: person.name,
      triggerSourceCount: person.triggerSourceCount,
      usableSourceCount: usableItems.length,
      existingCards: existingCards.length,
      proposedCards: proposedCards.length,
    }));
  }

  return planned;
}

function writeReport(plan: PlannedPerson[]): void {
  const generatedAt = new Date().toISOString();
  const lines = [
    '# Card Reaggregation Plan',
    '',
    `Generated at: ${generatedAt}`,
    `Source archive: ${SOURCE_ARCHIVE}`,
    '',
    '## Counts',
    '',
    table([
      { metric: 'planned people', value: plan.length },
      { metric: 'people with proposed cards', value: plan.filter(item => item.proposedCards.length > 0).length },
      { metric: 'existing cards archived', value: plan.reduce((sum, item) => sum + item.existingCards.length, 0) },
      { metric: 'proposed cards', value: plan.reduce((sum, item) => sum + item.proposedCards.length, 0) },
    ], [
      { label: 'Metric', value: row => row.metric },
      { label: 'Value', value: row => row.value },
    ]),
    '',
    '## People',
    '',
    table(plan.map(item => ({
      person: item.person,
      status: item.status,
      triggerSourceCount: item.triggerSourceCount,
      usableSourceCount: item.usableSourceCount,
      existingCards: item.existingCards.length,
      proposedCards: item.proposedCards.length,
      skippedReason: item.skippedReason || '',
    })), [
      { label: 'Person', value: row => row.person },
      { label: 'Status', value: row => row.status },
      { label: 'Trigger Sources', value: row => row.triggerSourceCount },
      { label: 'Usable Keep Sources', value: row => row.usableSourceCount },
      { label: 'Existing Cards', value: row => row.existingCards },
      { label: 'Proposed Cards', value: row => row.proposedCards },
      { label: 'Skipped', value: row => row.skippedReason },
    ]),
    '',
    '## Proposed Samples',
    '',
    ...plan.flatMap(item => [
      `### ${item.person}`,
      '',
      ...(item.proposedCards.length
        ? item.proposedCards.slice(0, 8).map(card => `- ${card.type}/${card.importance}: ${card.title} — ${compact(card.content, 120)}`)
        : [`- ${item.skippedReason || 'no proposed cards'}`]),
      '',
    ]),
    '## Execution Rule',
    '',
    '- This plan is read-only and does not delete or insert cards.',
    '- Existing cards are archived inside the JSON plan for review and rollback material.',
    '- Do not execute card replacement until a per-person apply step is reviewed.',
    '',
  ];

  fs.writeFileSync(REPORT_OUT, `${lines.join('\n')}\n`);
}

const plan = await buildPlan();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  sourceArchive: SOURCE_ARCHIVE,
  filters: {
    person: PERSON || null,
    limit: LIMIT,
    topN: TOP_N,
    minTextLength: MIN_TEXT_LENGTH,
    minItems: MIN_ITEMS,
  },
  people: plan,
}, null, 2)}\n`);
writeReport(plan);
console.log(JSON.stringify({
  out: OUT,
  reportOut: REPORT_OUT,
  plannedPeople: plan.length,
  peopleWithProposedCards: plan.filter(item => item.proposedCards.length > 0).length,
  existingCardsArchived: plan.reduce((sum, item) => sum + item.existingCards.length, 0),
  proposedCards: plan.reduce((sum, item) => sum + item.proposedCards.length, 0),
}, null, 2));
