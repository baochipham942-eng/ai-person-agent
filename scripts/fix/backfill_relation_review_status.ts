/**
 * Add and backfill PersonRelation review fields.
 *
 * Uses additive ALTER TABLE statements and can be rerun safely.
 *
 * Usage:
 *   bun scripts/fix/backfill_relation_review_status.ts
 */
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL');
}

const sql = neon(process.env.DATABASE_URL);

async function main() {
  await sql`
    ALTER TABLE "PersonRelation"
      ADD COLUMN IF NOT EXISTS "reviewStatus" TEXT NOT NULL DEFAULT 'needs_review',
      ADD COLUMN IF NOT EXISTS "evidenceUrl" TEXT,
      ADD COLUMN IF NOT EXISTS "evidenceNote" TEXT
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS "PersonRelation_reviewStatus_idx"
      ON "PersonRelation" ("reviewStatus")
  `;

  const updated = await sql`
    WITH relation_rows AS (
      SELECT
        r.id,
        r."relationType" AS type,
        r.description,
        r.source,
        r.confidence,
        COALESCE(shared.same_org_count, 0)::int AS same_org_count,
        COALESCE(shared.overlap_count, 0)::int AS overlap_count,
        COALESCE(shared.cofounder_org_count, 0)::int AS cofounder_org_count,
        COALESCE(advisor.advisor_role_count, 0)::int AS advisor_role_count
      FROM "PersonRelation" r
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS same_org_count,
          COUNT(*) FILTER (
            WHERE a."startDate" IS NOT NULL
              AND b."startDate" IS NOT NULL
              AND a."startDate" <= COALESCE(b."endDate", now())
              AND b."startDate" <= COALESCE(a."endDate", now())
          )::int AS overlap_count,
          COUNT(*) FILTER (
            WHERE lower(a.role) LIKE ANY(ARRAY['%founder%', '%co-founder%', '%cofounder%', '%founding%', '%创始%'])
              AND lower(b.role) LIKE ANY(ARRAY['%founder%', '%co-founder%', '%cofounder%', '%founding%', '%创始%'])
          )::int AS cofounder_org_count
        FROM "PersonRole" a
        JOIN "PersonRole" b ON b."organizationId" = a."organizationId"
        WHERE a."personId" = r."personId"
          AND b."personId" = r."relatedPersonId"
      ) shared ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS advisor_role_count
        FROM "PersonRole" pr
        WHERE pr."personId" = r."personId"
          AND pr."advisorId" = r."relatedPersonId"
      ) advisor ON TRUE
    ),
    classified AS (
      SELECT
        id,
        CASE
          WHEN source = 'wikidata' THEN 'trusted'
          WHEN type = 'advisor' AND advisor_role_count > 0 THEN 'confirmed'
          WHEN type = 'cofounder' AND cofounder_org_count > 0 THEN 'confirmed'
          WHEN type IN ('colleague', 'former_colleague') AND overlap_count > 0 THEN 'confirmed'
          ELSE 'needs_review'
        END AS review_status,
        CASE
          WHEN source = 'wikidata' THEN 'trusted structured source'
          WHEN type = 'advisor' AND advisor_role_count > 0 THEN 'advisor linked from PersonRole'
          WHEN type = 'cofounder' AND cofounder_org_count > 0 THEN 'both sides have founder roles at the same organization'
          WHEN type = 'colleague' AND overlap_count > 0 THEN 'overlapping roles at the same organization'
          WHEN type = 'former_colleague' AND overlap_count > 0 THEN 'historical overlapping roles at the same organization'
          WHEN confidence < 0.75 THEN 'low confidence'
          WHEN type = 'advisor' THEN 'advisor relation lacks PersonRole advisor link'
          WHEN type = 'cofounder' THEN 'cofounder relation lacks shared founder-role evidence'
          WHEN type = 'colleague' AND same_org_count > 0 THEN 'same organization exists but dates do not prove overlap'
          WHEN type = 'colleague' THEN 'no shared organization in PersonRole'
          WHEN type = 'former_colleague' AND same_org_count > 0 THEN 'same organization exists but dates do not prove historical overlap'
          WHEN type = 'former_colleague' THEN 'no shared organization in PersonRole'
          WHEN type = 'collaborator' THEN 'collaborator requires paper/project evidence outside PersonRole'
          ELSE 'unsupported or weakly-defined relation type'
        END AS evidence_note
      FROM relation_rows
    )
    UPDATE "PersonRelation" r
    SET
      "reviewStatus" = classified.review_status,
      "evidenceNote" = classified.evidence_note
    FROM classified
    WHERE r.id = classified.id
    RETURNING r.id, r."reviewStatus"
  `;

  const summary = await sql`
    SELECT "reviewStatus", COUNT(*)::int AS count
    FROM "PersonRelation"
    GROUP BY "reviewStatus"
    ORDER BY "reviewStatus" ASC
  ` as Array<{ reviewStatus: string; count: number }>;

  console.log(`Updated ${updated.length} PersonRelation rows`);
  console.table(summary);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
