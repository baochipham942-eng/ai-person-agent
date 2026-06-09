/**
 * Re-aggregate learning cards from audited RawPoolItem rows.
 *
 * Default mode runs generation but does not write cards. Use --execute to persist.
 *
 * Usage:
 *   bun scripts/enrich/regenerate_cards.ts --list --limit=10
 *   bun scripts/enrich/regenerate_cards.ts --person="Andrej Karpathy" --top-n=12
 *   bun scripts/enrich/regenerate_cards.ts --limit=5 --execute
 *   bun scripts/enrich/regenerate_cards.ts --limit=5 --min-items=1 --execute
 *   bun scripts/enrich/regenerate_cards.ts --include-candidates --limit=20 --execute
 *   bun scripts/enrich/regenerate_cards.ts --candidates-only --limit=20 --execute
 */
import 'dotenv/config';
import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';
import { generateCardsForPerson, type Card } from '../../lib/ai/cardGenerator';
import { hammingDistance, simhash } from '../../lib/utils/dedup';

type AuditVerdict = {
  urlHash: string;
  verdict: string;
};

type DbPerson = {
  id: string;
  name: string;
  aliases: string[] | null;
  raw_count: number;
  card_count: number;
};

type CandidateRawItem = {
  title: string;
  text: string;
  url: string;
  urlHash: string;
  sourceType: string;
};

type ExistingCard = {
  title: string;
  content: string;
};

const args = process.argv.slice(2);

function readNumberArg(name: string, fallback: number): number {
  const raw = args.find(arg => arg.startsWith(`--${name}=`));
  if (!raw) return fallback;
  const value = Number(raw.slice(name.length + 3));
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`--${name} must be a non-negative number`);
  }
  return value;
}

function readStringArg(name: string): string | undefined {
  return args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
}

const LIMIT = readNumberArg('limit', 3);
const TOP_N = readNumberArg('top-n', 12);
const MIN_TEXT_LENGTH = readNumberArg('min-text', 200);
const MIN_ITEMS = readNumberArg('min-items', 3);
const PERSON = readStringArg('person');
const EXECUTE = args.includes('--execute');
const LIST_ONLY = args.includes('--list');
const INCLUDE_UNAUDITED = args.includes('--include-unaudited');
const INCLUDE_CANDIDATES = args.includes('--include-candidates');
const CANDIDATES_ONLY = args.includes('--candidates-only');

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
}

function summarizeSources(items: CandidateRawItem[]): string {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.sourceType, (counts.get(item.sourceType) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([source, count]) => `${source}:${count}`)
    .join(', ');
}

async function loadPeople(): Promise<DbPerson[]> {
  const person = PERSON ?? null;
  const personLike = PERSON ? `%${PERSON}%` : null;
  return await sql`
    SELECT
      p.id,
      p.name,
      p.aliases,
      COUNT(r.id)::int AS raw_count,
      COALESCE(c.card_count, 0)::int AS card_count
    FROM "People" p
    JOIN "RawPoolItem" r ON r."personId" = p.id
    LEFT JOIN (
      SELECT "personId", COUNT(*)::int AS card_count
      FROM "Card"
      GROUP BY "personId"
    ) c ON c."personId" = p.id
    WHERE (
      (${CANDIDATES_ONLY} AND p.status = ${'candidate'})
      OR (${!CANDIDATES_ONLY} AND (p.status = ${'ready'} OR (${INCLUDE_CANDIDATES} AND p.status = ${'candidate'})))
    )
      AND (${person}::text IS NULL OR p.id = ${person} OR p.name ILIKE ${personLike})
    GROUP BY p.id, c.card_count
    ORDER BY p."viewCount" DESC, p."influenceScore" DESC, p.name ASC
    LIMIT ${LIMIT}
  ` as DbPerson[];
}

async function loadRawItems(personId: string): Promise<CandidateRawItem[]> {
  return await sql`
    SELECT title, text, url, "urlHash", "sourceType"
    FROM "RawPoolItem"
    WHERE "personId" = ${personId}
    ORDER BY "publishedAt" DESC NULLS LAST, "fetchedAt" DESC
  ` as CandidateRawItem[];
}

async function loadLatestAuditVerdicts(personId: string): Promise<AuditVerdict[]> {
  return await sql`
    SELECT DISTINCT ON ("urlHash") "urlHash", verdict
    FROM "QAAuditLog"
    WHERE "personId" = ${personId}
    ORDER BY "urlHash", "createdAt" DESC
  ` as AuditVerdict[];
}

async function loadExistingCards(personId: string, limit?: number): Promise<ExistingCard[]> {
  const take = limit ?? 100000;
  return await sql`
    SELECT title, content
    FROM "Card"
    WHERE "personId" = ${personId}
    ORDER BY "createdAt" DESC
    LIMIT ${take}
  ` as ExistingCard[];
}

function filterUniqueCards(cards: Card[], existingCards: ExistingCard[]): Card[] {
  const existingTitleSet = new Set(existingCards.map(card => normalizeTitle(card.title)));
  const existingHashes = existingCards.map(card => simhash(card.content || ''));
  const batchTitleSet = new Set<string>();
  const batchHashes: bigint[] = [];

  return cards.filter(card => {
    const normalized = normalizeTitle(card.title);
    if (existingTitleSet.has(normalized) || batchTitleSet.has(normalized)) return false;
    const hash = simhash(card.content || '');
    const isDuplicate = [...existingHashes, ...batchHashes].some(existingHash => hammingDistance(hash, existingHash) <= 3);
    if (isDuplicate) return false;
    batchTitleSet.add(normalized);
    batchHashes.push(hash);
    return true;
  });
}

function selectCardsToSave(cards: Card[], existingCards: ExistingCard[]): Card[] {
  return filterUniqueCards(cards, existingCards).slice(0, TOP_N);
}

async function saveCards(personId: string, cards: Card[]): Promise<number> {
  for (const card of cards) {
    const now = new Date();
    await sql`
      INSERT INTO "Card" (id, "personId", type, title, content, tags, "sourceUrl", importance, "createdAt", "updatedAt")
      VALUES (
        ${crypto.randomUUID()},
        ${personId},
        ${card.type},
        ${card.title},
        ${card.content},
        ${card.tags},
        ${card.sourceUrl || null},
        ${card.importance},
        ${now},
        ${now}
      )
      ON CONFLICT DO NOTHING
    `;
  }
  return cards.length;
}

async function main() {
  const people = await loadPeople();

  console.log(`Card regeneration mode: ${EXECUTE ? 'execute' : 'dry-run'} | people=${people.length} | topN=${TOP_N} | minItems=${MIN_ITEMS}`);

  let totalGenerated = 0;
  let totalSaved = 0;
  let totalSkipped = 0;

  for (const person of people) {
    const [rawItems, latestVerdicts, existingCards] = await Promise.all([
      loadRawItems(person.id),
      loadLatestAuditVerdicts(person.id),
      loadExistingCards(person.id),
    ]);

    const keepHashes = new Set(
      latestVerdicts
        .filter(row => row.verdict === 'keep')
        .map(row => row.urlHash)
    );

    const usableItems = rawItems.filter(item => {
      if ((item.text || '').trim().length < MIN_TEXT_LENGTH) return false;
      if (latestVerdicts.length === 0) return INCLUDE_UNAUDITED;
      return keepHashes.has(item.urlHash);
    });

    const sourceSummary = summarizeSources(usableItems);
    console.log(
      `\n[${person.name}] raw=${person.raw_count} audited=${latestVerdicts.length} usable=${usableItems.length} cards=${person.card_count}`
    );
    if (sourceSummary) console.log(`  sources: ${sourceSummary}`);

    if (usableItems.length === 0) {
      console.log('  skip: no usable audited keep items');
      totalSkipped += 1;
      continue;
    }

    if (usableItems.length < MIN_ITEMS) {
      console.log(`  skip: usable items below min-items (${usableItems.length}/${MIN_ITEMS})`);
      totalSkipped += 1;
      continue;
    }

    if (LIST_ONLY) continue;

    const cards = await generateCardsForPerson(
      person.id,
      person.name,
      usableItems.map(item => ({ title: item.title, text: item.text, url: item.url })),
      { topN: TOP_N, englishName: person.aliases?.[0] || person.name, existingCards: existingCards.slice(0, 20) }
    );

    totalGenerated += cards.length;
    const uniqueCards = selectCardsToSave(cards, existingCards);
    for (const card of cards.slice(0, 5)) {
      console.log(`  - ${card.type}/${card.importance}: ${card.title}`);
    }
    console.log(`  unique after local dedupe and topN cap: ${uniqueCards.length}/${cards.length}`);

    if (EXECUTE && cards.length > 0) {
      const saved = await saveCards(person.id, uniqueCards);
      totalSaved += saved;
      console.log(`  saved: ${saved}`);
    }
  }

  console.log(`\nDone. generated=${totalGenerated} ${EXECUTE ? `saved_attempted=${totalSaved}` : 'saved_attempted=0'} skipped=${totalSkipped}`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
