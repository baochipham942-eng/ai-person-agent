/**
 * Apply deterministic fixes from career review buckets.
 *
 * Default is dry-run. Use --execute to mutate the database.
 *
 * Scope:
 * - Delete position-like Organization rows that have no PersonRole refs and no
 *   exact People.organization refs after a final DB check.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

type BucketOrganization = {
  id: string;
  name: string;
  nameZh: string | null;
  roleCount: number;
};

type OrganizationCheck = {
  id: string;
  name: string;
  nameZh: string | null;
  roleCount: number;
  peopleRefs: number;
};

type CareerReviewBuckets = {
  positionLike?: {
    safe_delete_empty_position_org?: BucketOrganization[];
  };
};

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const INPUT = args.find(arg => arg.startsWith('--input='))?.slice('--input='.length)
  || 'docs/audit-2026-06/data/career_review_buckets.json';

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function loadSafeDeleteCandidates(): BucketOrganization[] {
  const payload = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), INPUT), 'utf-8'),
  ) as CareerReviewBuckets;

  return payload.positionLike?.safe_delete_empty_position_org || [];
}

async function checkOrganization(candidate: BucketOrganization): Promise<OrganizationCheck | null> {
  const names = [candidate.name, candidate.nameZh].filter((value): value is string => Boolean(value));
  const rows = await sql`
    SELECT
      o.id,
      o.name,
      o."nameZh",
      COUNT(DISTINCT r.id)::int AS "roleCount",
      COUNT(DISTINCT p.id)::int AS "peopleRefs"
    FROM "Organization" o
    LEFT JOIN "PersonRole" r ON r."organizationId" = o.id
    LEFT JOIN "People" p
      ON EXISTS (
        SELECT 1
        FROM unnest(p.organization) AS org_name
        WHERE org_name = ANY(${names}::text[])
      )
    WHERE o.id = ${candidate.id}
    GROUP BY o.id
  ` as OrganizationCheck[];

  return rows[0] || null;
}

async function main() {
  const candidates = loadSafeDeleteCandidates();
  console.log(`Career review safe fixes mode: ${EXECUTE ? 'execute' : 'dry-run'}`);

  let matched = 0;
  let skipped = 0;
  let deleted = 0;

  for (const candidate of candidates) {
    const current = await checkOrganization(candidate);
    if (!current) {
      skipped += 1;
      console.log(`skip missing org: ${candidate.id}`);
      continue;
    }

    const canDelete = current.roleCount === 0 && current.peopleRefs === 0;
    if (!canDelete) {
      skipped += 1;
      console.log(
        `skip referenced org: ${current.name} (${current.id}), roles=${current.roleCount}, peopleRefs=${current.peopleRefs}`,
      );
      continue;
    }

    matched += 1;
    console.log(`${EXECUTE ? 'delete' : 'would delete'} empty position-like org: ${current.name} (${current.id})`);
    if (EXECUTE) {
      await sql`DELETE FROM "Organization" WHERE id = ${current.id}`;
      deleted += 1;
    }
  }

  console.log(JSON.stringify({ candidates: candidates.length, matched, skipped, deleted }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
