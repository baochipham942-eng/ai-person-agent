/**
 * Apply source-backed currentTitle decisions to People rows.
 *
 * Default is dry-run. Use --execute to mutate the database.
 *
 * Scope:
 * - Add source-backed organizations referenced by currentTitle.
 * - Correct currentTitle text only when the decision explicitly says so.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

type Decision =
  | {
      personId: string;
      person: string;
      action: 'add_organizations';
      organizations: string[];
      evidenceUrl: string;
      evidenceNote: string;
    }
  | {
      personId: string;
      person: string;
      action: 'update_current_title_and_add_organizations';
      currentTitle: string;
      organizations: string[];
      evidenceUrl: string;
      evidenceNote: string;
    };

type PeopleRow = {
  id: string;
  name: string;
  organization: string[];
  currentTitle: string | null;
};

type Payload = {
  decisions: Decision[];
};

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const DECISIONS_PATH = args.find(arg => arg.startsWith('--decisions='))?.slice('--decisions='.length)
  || 'docs/audit-2026-06/current_title_decisions.json';

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function mergeOrganizations(existing: string[], additions: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const value of [...existing, ...additions]) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;

    seen.add(trimmed);
    merged.push(trimmed);
  }

  return merged;
}

function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function loadPerson(id: string): Promise<PeopleRow | null> {
  const rows = await sql`
    SELECT id, name, organization, "currentTitle"
    FROM "People"
    WHERE id = ${id}
  ` as PeopleRow[];

  return rows[0] || null;
}

async function main() {
  const payload = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), DECISIONS_PATH), 'utf-8'),
  ) as Payload;

  console.log(`Current title decisions mode: ${EXECUTE ? 'execute' : 'dry-run'}`);
  let matched = 0;
  let missing = 0;
  let alreadyApplied = 0;
  let updated = 0;

  for (const decision of payload.decisions) {
    const person = await loadPerson(decision.personId);
    if (!person) {
      missing += 1;
      console.log(`missing person: ${decision.person} (${decision.personId})`);
      continue;
    }

    matched += 1;

    if (person.name !== decision.person) {
      console.log(`name mismatch: decision=${decision.person} db=${person.name} (${person.id})`);
    }

    const nextOrganization = mergeOrganizations(person.organization || [], decision.organizations);
    const nextCurrentTitle = decision.action === 'update_current_title_and_add_organizations'
      ? decision.currentTitle
      : person.currentTitle;

    const organizationChanged = !arraysEqual(person.organization || [], nextOrganization);
    const titleChanged = person.currentTitle !== nextCurrentTitle;

    if (!organizationChanged && !titleChanged) {
      alreadyApplied += 1;
      console.log(`already applied: ${person.name}`);
      continue;
    }

    console.log(`${EXECUTE ? 'update' : 'would update'} ${person.name}`);
    if (organizationChanged) {
      console.log(`  organization: ${JSON.stringify(person.organization || [])} -> ${JSON.stringify(nextOrganization)}`);
    }
    if (titleChanged) {
      console.log(`  currentTitle: ${JSON.stringify(person.currentTitle)} -> ${JSON.stringify(nextCurrentTitle)}`);
    }
    console.log(`  evidence: ${decision.evidenceUrl}`);
    console.log(`  note: ${decision.evidenceNote}`);

    if (EXECUTE) {
      await sql`
        UPDATE "People"
        SET
          organization = ${nextOrganization},
          "currentTitle" = ${nextCurrentTitle},
          "updatedAt" = NOW()
        WHERE id = ${person.id}
      `;
      updated += 1;
    }
  }

  console.log(JSON.stringify({
    mode: EXECUTE ? 'execute' : 'dry-run',
    decisions: payload.decisions.length,
    matched,
    missing,
    alreadyApplied,
    updated,
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
