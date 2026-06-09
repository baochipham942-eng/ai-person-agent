/**
 * Apply roster seeds as candidate People rows.
 *
 * Default is dry-run. Use --execute to mutate the database.
 * Existing matches are updated in place; new rows are inserted with status=candidate.
 */
import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

type RosterSeed = {
  name: string;
  nameZh?: string;
  roleCategory?: string;
  organization?: string[];
  currentTitle?: string;
  aliases?: string[];
  reason?: string;
  dedupCheck?: string[];
};

type ExistingPerson = {
  id: string;
  name: string;
  aliases: string[];
  organization: string[];
  currentTitle: string | null;
  roleCategory: string | null;
  status: string;
  influenceScore: number;
};

const EXECUTE = process.argv.includes('--execute');
const SEEDS_PATH = process.argv.find(arg => arg.startsWith('--seeds='))?.slice('--seeds='.length)
  || 'docs/audit-2026-06/roster_seeds.json';

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function unique(values: Array<string | undefined | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())).map(value => value.trim()))];
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function seedTerms(seed: RosterSeed): string[] {
  return unique([seed.name, seed.nameZh, ...(seed.aliases || []), ...(seed.dedupCheck || [])]);
}

function nextAliases(seed: RosterSeed, existing?: ExistingPerson): string[] {
  return unique([
    ...(existing?.aliases || []),
    seed.name,
    seed.nameZh,
    ...(seed.aliases || []),
    ...(seed.dedupCheck || []),
  ]);
}

function nextOrganizations(seed: RosterSeed, existing?: ExistingPerson): string[] {
  return unique([...(existing?.organization || []), ...(seed.organization || [])]);
}

async function findMatches(seed: RosterSeed): Promise<ExistingPerson[]> {
  const terms = seedTerms(seed);
  const patterns = terms.map(term => `%${term}%`);
  return await sql`
    SELECT id, name, aliases, organization, "currentTitle", "roleCategory", status, "influenceScore"
    FROM "People"
    WHERE name ILIKE ANY(${patterns}::text[])
       OR aliases && ${terms}::text[]
    ORDER BY "influenceScore" DESC, name ASC
  ` as ExistingPerson[];
}

function chooseMatch(seed: RosterSeed, matches: ExistingPerson[]): ExistingPerson | null {
  if (matches.length === 0) return null;
  const terms = new Set(seedTerms(seed).map(term => term.toLowerCase()));
  const exact = matches.find(match =>
    terms.has(match.name.toLowerCase()) ||
    (match.aliases || []).some(alias => terms.has(alias.toLowerCase()))
  );
  return exact || matches[0];
}

async function updateExisting(seed: RosterSeed, existing: ExistingPerson): Promise<void> {
  const aliases = nextAliases(seed, existing);
  const organization = nextOrganizations(seed, existing);
  const currentTitle = seed.currentTitle || existing.currentTitle;
  const roleCategory = seed.roleCategory || existing.roleCategory;

  console.log(`${EXECUTE ? 'update' : 'would update'} existing: ${seed.name} -> ${existing.name} (${existing.id})`);
  console.log(`  aliases: ${JSON.stringify(existing.aliases)} -> ${JSON.stringify(aliases)}`);
  console.log(`  orgs: ${JSON.stringify(existing.organization)} -> ${JSON.stringify(organization)}`);
  console.log(`  title: ${existing.currentTitle || '(empty)'} -> ${currentTitle || '(empty)'}`);

  if (!EXECUTE) return;
  await sql`
    UPDATE "People"
    SET
      aliases = ${aliases},
      organization = ${organization},
      "currentTitle" = ${currentTitle || null},
      "roleCategory" = ${roleCategory || null},
      "updatedAt" = NOW()
    WHERE id = ${existing.id}
  `;
}

async function insertCandidate(seed: RosterSeed): Promise<void> {
  const id = crypto.randomUUID();
  const now = new Date();
  const aliases = nextAliases(seed);
  const organization = unique(seed.organization || []);
  const qid = `CANDIDATE-${slug(seed.name) || crypto.randomUUID()}`;
  const occupation = unique([seed.roleCategory]);

  console.log(`${EXECUTE ? 'insert' : 'would insert'} candidate: ${seed.name} (${qid})`);
  console.log(`  title=${seed.currentTitle || '(empty)'} orgs=${organization.join(', ') || '(empty)'}`);

  if (!EXECUTE) return;
  await sql`
    INSERT INTO "People" (
      id, qid, name, aliases, description, "whyImportant", "aiContributionScore",
      occupation, organization, "officialLinks", "sourceWhitelist", status, completeness,
      topics, "roleCategory", "influenceScore", "currentTitle", "createdAt", "updatedAt"
    )
    VALUES (
      ${id},
      ${qid},
      ${seed.name},
      ${aliases},
      ${seed.reason || null},
      ${seed.reason || null},
      ${5},
      ${occupation},
      ${organization},
      ${JSON.stringify([])}::jsonb,
      ${[] as string[]},
      ${'candidate'},
      ${0},
      ${[] as string[]},
      ${seed.roleCategory || null},
      ${0},
      ${seed.currentTitle || null},
      ${now},
      ${now}
    )
  `;
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), SEEDS_PATH), 'utf-8')) as { seeds: RosterSeed[] };
  let inserted = 0;
  let updated = 0;
  let ambiguous = 0;

  console.log(`Roster candidate mode: ${EXECUTE ? 'execute' : 'dry-run'} | seeds=${payload.seeds.length}`);
  for (const seed of payload.seeds) {
    const matches = await findMatches(seed);
    const chosen = chooseMatch(seed, matches);

    if (matches.length > 1) {
      ambiguous += 1;
      console.log(`ambiguous matches for ${seed.name}: ${matches.map(match => `${match.name}(${match.id})`).join(', ')}`);
    }

    if (chosen) {
      await updateExisting(seed, chosen);
      updated += 1;
    } else {
      await insertCandidate(seed);
      inserted += 1;
    }
  }

  console.log(JSON.stringify({ inserted, updated, ambiguous }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
