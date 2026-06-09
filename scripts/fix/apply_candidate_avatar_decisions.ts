/**
 * Apply source-backed avatar decisions for candidate People rows.
 *
 * Default is dry-run. Use --execute to mutate People.avatarUrl.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { neon } from '@neondatabase/serverless';

type AvatarDecision = {
  personId: string;
  person: string;
  avatarUrl: string;
  evidenceUrl: string;
  evidenceNote: string;
  rejectedAlternatives?: string[];
};

type PeopleRow = {
  id: string;
  name: string;
  status: string;
  avatarUrl: string | null;
};

type Payload = {
  decisions: AvatarDecision[];
};

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const ALLOW_OVERWRITE = args.includes('--allow-overwrite');
const DECISIONS_PATH = args.find(arg => arg.startsWith('--decisions='))?.slice('--decisions='.length)
  || 'docs/audit-2026-06/candidate_avatar_decisions.json';
const OUT = args.find(arg => arg.startsWith('--out='))?.slice('--out='.length)
  || 'docs/audit-2026-06/data/candidate_avatar_update.json';

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

async function loadPerson(id: string): Promise<PeopleRow | null> {
  const rows = await sql`
    SELECT id, name, status, "avatarUrl"
    FROM "People"
    WHERE id = ${id}
  ` as PeopleRow[];

  return rows[0] || null;
}

async function main() {
  const payload = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), DECISIONS_PATH), 'utf-8'),
  ) as Payload;

  console.log(`Candidate avatar decisions mode: ${EXECUTE ? 'execute' : 'dry-run'}`);

  const results: Array<{
    personId: string;
    person: string;
    status: 'updated' | 'would_update' | 'already_applied' | 'skipped_existing_avatar' | 'missing';
    previousAvatarUrl: string | null;
    nextAvatarUrl: string;
    evidenceUrl: string;
    evidenceNote: string;
  }> = [];

  let matched = 0;
  let missing = 0;
  let alreadyApplied = 0;
  let skippedExistingAvatar = 0;
  let updated = 0;

  for (const decision of payload.decisions) {
    const person = await loadPerson(decision.personId);
    if (!person) {
      missing += 1;
      console.log(`missing person: ${decision.person} (${decision.personId})`);
      results.push({
        personId: decision.personId,
        person: decision.person,
        status: 'missing',
        previousAvatarUrl: null,
        nextAvatarUrl: decision.avatarUrl,
        evidenceUrl: decision.evidenceUrl,
        evidenceNote: decision.evidenceNote,
      });
      continue;
    }

    matched += 1;

    if (person.name !== decision.person) {
      console.log(`name mismatch: decision=${decision.person} db=${person.name} (${person.id})`);
    }

    if (person.avatarUrl === decision.avatarUrl) {
      alreadyApplied += 1;
      console.log(`already applied: ${person.name}`);
      results.push({
        personId: person.id,
        person: person.name,
        status: 'already_applied',
        previousAvatarUrl: person.avatarUrl,
        nextAvatarUrl: decision.avatarUrl,
        evidenceUrl: decision.evidenceUrl,
        evidenceNote: decision.evidenceNote,
      });
      continue;
    }

    if (person.avatarUrl && !ALLOW_OVERWRITE) {
      skippedExistingAvatar += 1;
      console.log(`skip existing avatar: ${person.name} ${person.avatarUrl}`);
      results.push({
        personId: person.id,
        person: person.name,
        status: 'skipped_existing_avatar',
        previousAvatarUrl: person.avatarUrl,
        nextAvatarUrl: decision.avatarUrl,
        evidenceUrl: decision.evidenceUrl,
        evidenceNote: decision.evidenceNote,
      });
      continue;
    }

    console.log(`${EXECUTE ? 'update' : 'would update'} ${person.name}: ${person.avatarUrl || '<empty>'} -> ${decision.avatarUrl}`);
    console.log(`  evidence: ${decision.evidenceUrl}`);
    console.log(`  note: ${decision.evidenceNote}`);

    if (EXECUTE) {
      await sql`
        UPDATE "People"
        SET "avatarUrl" = ${decision.avatarUrl},
            "updatedAt" = NOW()
        WHERE id = ${person.id}
      `;
      updated += 1;
    }

    results.push({
      personId: person.id,
      person: person.name,
      status: EXECUTE ? 'updated' : 'would_update',
      previousAvatarUrl: person.avatarUrl,
      nextAvatarUrl: decision.avatarUrl,
      evidenceUrl: decision.evidenceUrl,
      evidenceNote: decision.evidenceNote,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: EXECUTE ? 'execute' : 'dry-run',
    decisions: payload.decisions.length,
    summary: {
      matched,
      missing,
      alreadyApplied,
      skippedExistingAvatar,
      updated,
      wouldUpdate: results.filter(result => result.status === 'would_update').length,
    },
    results,
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Candidate avatar update report written: ${OUT}`);
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
