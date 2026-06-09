/**
 * Apply curated relation review decisions.
 *
 * Default is dry-run. Use --execute to update reviewStatus/evidence fields or
 * delete explicitly curated false-positive relations.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

type Decision = {
  action: 'confirm' | 'delete';
  evidenceUrl: string;
  evidenceNote: string;
  relationIds: string[];
};

type RelationRow = {
  id: string;
  person: string;
  related: string;
  relationType: string;
  reviewStatus: string;
};

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const DECISIONS_PATH = args.find(arg => arg.startsWith('--decisions='))?.slice('--decisions='.length)
  || 'docs/audit-2026-06/relation_decisions.json';

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

async function loadRelations(ids: string[]): Promise<Map<string, RelationRow>> {
  const rows = await sql`
    SELECT
      r.id,
      p.name AS person,
      rp.name AS related,
      r."relationType",
      r."reviewStatus"
    FROM "PersonRelation" r
    JOIN "People" p ON p.id = r."personId"
    JOIN "People" rp ON rp.id = r."relatedPersonId"
    WHERE r.id = ANY(${ids}::text[])
  ` as RelationRow[];
  return new Map(rows.map(row => [row.id, row]));
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), DECISIONS_PATH), 'utf-8')) as { decisions: Decision[] };
  let matched = 0;
  let missing = 0;
  let alreadyDeleted = 0;
  let updated = 0;

  console.log(`Relation review decisions mode: ${EXECUTE ? 'execute' : 'dry-run'}`);

  for (const decision of payload.decisions) {
    const relations = await loadRelations(decision.relationIds);
    for (const id of decision.relationIds) {
      const relation = relations.get(id);
      if (!relation) {
        if (decision.action === 'delete') {
          alreadyDeleted += 1;
          console.log(`already deleted relation: ${id}`);
          continue;
        }
        missing += 1;
        console.log(`missing relation: ${id}`);
        continue;
      }
      matched += 1;
      const label = `${relation.person} -> ${relation.related} (${relation.relationType})`;

      if (decision.action === 'delete') {
        console.log(`${EXECUTE ? 'delete' : 'would delete'} ${label}: ${decision.evidenceNote}`);
        if (!EXECUTE) continue;

        await sql`DELETE FROM "PersonRelation" WHERE id = ${relation.id}`;
        updated += 1;
        continue;
      }

      const alreadyConfirmed = relation.reviewStatus === 'confirmed';
      console.log(`${EXECUTE ? 'confirm' : 'would confirm'} ${label}${alreadyConfirmed ? ' [already confirmed]' : ''}`);
      if (!EXECUTE || alreadyConfirmed) continue;

      await sql`
        UPDATE "PersonRelation"
        SET
          "reviewStatus" = ${'confirmed'},
          "evidenceUrl" = ${decision.evidenceUrl},
          "evidenceNote" = ${decision.evidenceNote}
        WHERE id = ${relation.id}
      `;
      updated += 1;
    }
  }

  console.log(JSON.stringify({ matched, missing, alreadyDeleted, updated }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
