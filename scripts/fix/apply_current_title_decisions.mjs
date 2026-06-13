/**
 * Apply source-backed currentTitle decisions to People rows.
 *
 * Default is dry-run. Use --execute to mutate People rows only.
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const INPUT = getArg('--in') || 'docs/audit-2026-06/current_title_decisions.json';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/current_title_decisions_apply_log.json';
const EXECUTE = process.argv.includes('--execute');

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function mergeOrganizations(existing, additions) {
  const seen = new Set();
  const merged = [];
  for (const value of [...(existing || []), ...(additions || [])]) {
    const trimmed = String(value || '').trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    merged.push(trimmed);
  }
  return merged;
}

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), INPUT), 'utf8'));
  const log = [];
  console.log(`Current title decisions mode: ${EXECUTE ? 'execute' : 'dry-run'} | decisions=${payload.decisions.length}`);

  for (const decision of payload.decisions) {
    const rows = await sql`
      SELECT id, name, organization, "currentTitle"
      FROM "People"
      WHERE id = ${decision.personId}
      LIMIT 1
    `;
    const person = rows[0];
    if (!person) {
      log.push({ action: 'missing_person', decision });
      console.log(`missing person: ${decision.person} (${decision.personId})`);
      continue;
    }
    if (person.name !== decision.person) {
      log.push({ action: 'name_mismatch', decision, person });
      console.log(`name mismatch: decision=${decision.person} db=${person.name} (${person.id})`);
      continue;
    }

    const nextOrganization = mergeOrganizations(person.organization, decision.organizations);
    const nextCurrentTitle = decision.currentTitle || person.currentTitle;
    const organizationChanged = !sameArray(person.organization || [], nextOrganization);
    const titleChanged = person.currentTitle !== nextCurrentTitle;

    if (EXECUTE && (organizationChanged || titleChanged)) {
      await sql`
        UPDATE "People"
        SET organization = ${nextOrganization},
            "currentTitle" = ${nextCurrentTitle},
            "updatedAt" = NOW()
        WHERE id = ${person.id}
      `;
    }

    const action = organizationChanged || titleChanged
      ? (EXECUTE ? 'update_person_title' : 'would_update_person_title')
      : 'already_applied';
    log.push({
      action,
      person: person.name,
      personId: person.id,
      previousCurrentTitle: person.currentTitle,
      nextCurrentTitle,
      previousOrganization: person.organization,
      nextOrganization,
      evidenceUrl: decision.evidenceUrl || null,
      evidenceNote: decision.evidenceNote || null,
    });
    console.log(`${action}: ${person.name}`);
  }

  const summary = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    decisions: payload.decisions.length,
    updated: log.filter(row => row.action === 'update_person_title').length,
    wouldUpdate: log.filter(row => row.action === 'would_update_person_title').length,
    alreadyApplied: log.filter(row => row.action === 'already_applied').length,
    missing: log.filter(row => row.action === 'missing_person').length,
    mismatched: log.filter(row => row.action === 'name_mismatch').length,
  };

  fs.writeFileSync(path.join(process.cwd(), OUT), `${JSON.stringify({ summary, log }, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Log written: ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
