/**
 * Export PersonRelation rows that need review.
 *
 * Uses Neon raw SQL instead of Prisma so it can run under Bun on macOS without
 * loading the Prisma native engine.
 *
 * Usage:
 *   bun scripts/audit/export_relation_review.ts
 *   bun scripts/audit/export_relation_review.ts --out=docs/audit-2026-06/data/relation_review.json
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { neon } from '@neondatabase/serverless';

type RelationRow = {
  id: string;
  person: string;
  related: string;
  type: string;
  description: string | null;
  source: string;
  confidence: number;
  reviewStatus: string;
  evidenceUrl: string | null;
  evidenceNote: string | null;
  same_org_count: number;
  overlap_count: number;
  cofounder_org_count: number;
  advisor_role_count: number;
};

type ReviewRow = RelationRow & {
  bucket: 'trusted' | 'confirmed_by_roles' | 'needs_review';
  reasons: string[];
};

const args = process.argv.slice(2);
const outArg = args.find(a => a.startsWith('--out='));
const OUT = path.resolve(
  process.cwd(),
  outArg?.slice('--out='.length) || 'docs/audit-2026-06/data/relation_review.json'
);

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL');
}

const sql = neon(process.env.DATABASE_URL);

function toBucket(row: RelationRow): ReviewRow {
  const reasons: string[] = [];

  if (row.reviewStatus === 'trusted') {
    reasons.push(row.evidenceNote || 'trusted review status');
    return { ...row, bucket: 'trusted', reasons };
  }

  if (row.reviewStatus === 'confirmed') {
    reasons.push(row.evidenceNote || 'confirmed review status');
    return { ...row, bucket: 'confirmed_by_roles', reasons };
  }

  if (row.source === 'wikidata') {
    reasons.push('trusted structured source');
    return { ...row, bucket: 'trusted', reasons };
  }

  if (row.confidence < 0.75) {
    reasons.push(`low confidence: ${row.confidence}`);
  }

  if (row.type === 'advisor') {
    if (row.advisor_role_count > 0) {
      reasons.push('advisor linked from PersonRole');
      return { ...row, bucket: 'confirmed_by_roles', reasons };
    }
    reasons.push('advisor relation lacks PersonRole advisor link');
  } else if (row.type === 'cofounder') {
    if (row.cofounder_org_count > 0) {
      reasons.push('both sides have founder roles at the same organization');
      return { ...row, bucket: 'confirmed_by_roles', reasons };
    }
    reasons.push('cofounder relation lacks shared founder-role evidence');
  } else if (row.type === 'colleague') {
    if (row.overlap_count > 0) {
      reasons.push('overlapping roles at the same organization');
      return { ...row, bucket: 'confirmed_by_roles', reasons };
    }
    if (row.same_org_count > 0) {
      reasons.push('same organization exists but dates do not prove overlap');
    } else {
      reasons.push('no shared organization in PersonRole');
    }
  } else if (row.type === 'former_colleague') {
    if (row.overlap_count > 0) {
      reasons.push('historical overlapping roles at the same organization');
      return { ...row, bucket: 'confirmed_by_roles', reasons };
    }
    if (row.same_org_count > 0) {
      reasons.push('same organization exists but dates do not prove historical overlap');
    } else {
      reasons.push('no shared organization in PersonRole');
    }
  } else if (row.type === 'collaborator') {
    reasons.push('collaborator requires paper/project evidence outside PersonRole');
  } else {
    reasons.push(`unsupported or weakly-defined relation type: ${row.type}`);
  }

  if (!row.description || row.description.trim().length < 4) {
    reasons.push('short or empty description');
  }

  return { ...row, bucket: 'needs_review', reasons };
}

async function main() {
  const rows = await sql`
    WITH relation_rows AS (
      SELECT
        r.id,
        p.name AS person,
        rp.name AS related,
        r."relationType" AS type,
        r.description,
        r.source,
        r.confidence,
        r."reviewStatus",
        r."evidenceUrl",
        r."evidenceNote",
        COALESCE(shared.same_org_count, 0)::int AS same_org_count,
        COALESCE(shared.overlap_count, 0)::int AS overlap_count,
        COALESCE(shared.cofounder_org_count, 0)::int AS cofounder_org_count,
        COALESCE(advisor.advisor_role_count, 0)::int AS advisor_role_count
      FROM "PersonRelation" r
      JOIN "People" p ON p.id = r."personId"
      JOIN "People" rp ON rp.id = r."relatedPersonId"
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
    )
    SELECT *
    FROM relation_rows
    ORDER BY
      CASE WHEN source = 'wikidata' THEN 2 ELSE 0 END,
      confidence ASC,
      person ASC,
      related ASC
  ` as RelationRow[];

  const reviewed = rows.map(toBucket);
  const needsReview = reviewed.filter(r => r.bucket === 'needs_review');
  const confirmedByRoles = reviewed.filter(r => r.bucket === 'confirmed_by_roles');
  const trusted = reviewed.filter(r => r.bucket === 'trusted');

  const payload = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: reviewed.length,
      trusted: trusted.length,
      confirmedByRoles: confirmedByRoles.length,
      needsReview: needsReview.length,
      bySource: countBy(reviewed, r => r.source),
      needsReviewByType: countBy(needsReview, r => r.type),
    },
    needsReview,
    confirmedByRoles,
    trusted,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));

  console.log(`Exported relation review: ${OUT}`);
  console.log(
    `total=${reviewed.length} trusted=${trusted.length} confirmedByRoles=${confirmedByRoles.length} needsReview=${needsReview.length}`
  );
}

function countBy<T>(rows: T[], keyFn: (row: T) => string): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = keyFn(row) || '(empty)';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
