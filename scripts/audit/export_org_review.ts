/**
 * Export Organization clusters that still need product/data decisions.
 *
 * Read-only. Uses Neon raw SQL so it can run under Bun without loading the
 * Prisma native engine.
 *
 * Usage:
 *   bun scripts/audit/export_org_review.ts
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { neon } from '@neondatabase/serverless';

type ClusterSpec = {
  key: string;
  label: string;
  decision: string;
  patterns: string[];
  excludePatterns?: string[];
};

type OrgCandidate = {
  id: string;
  name: string;
  nameZh: string | null;
  type: string;
  wikidataQid: string | null;
  roleCount: number;
  people: string[];
};

type PeopleOrgValue = {
  value: string;
  peopleCount: number;
  people: string[];
};

const clusters: ClusterSpec[] = [
  {
    key: 'stanford_suborgs',
    label: 'Stanford suborg boundary',
    decision: 'Keep Stanford University, departments, labs, centers, and endowed-chair roles separate except deterministic duplicate labels already merged.',
    patterns: ['%Stanford%', '%斯坦福%'],
  },
  {
    key: 'nyu_suborgs',
    label: 'NYU suborg boundary',
    decision: 'Keep NYU parent university, Courant, and Tandon separate because institute and school affiliations carry different display meaning.',
    patterns: ['%New York University%', '%NYU%', '%纽约大学%'],
  },
  {
    key: 'cmu_suborgs',
    label: 'CMU suborg boundary',
    decision: 'Keep CMU parent university, Computer Science Department, and NeuLab @ LTI/CMU separate because school/lab affiliations are more specific than the parent university.',
    patterns: ['%Carnegie Mellon%', '%CMU%', '%卡内基梅隆%'],
  },
  {
    key: 'facebook_meta_history',
    label: 'Facebook / Meta history boundary',
    decision: 'Keep Facebook, Meta, FAIR, Meta AI, MetaMind, Metaweb, and Meta Superintelligence Labs separate; normalize only display labels that are clear aliases.',
    patterns: ['%Facebook%', '%Meta%', 'FAIR%', '%脸书%'],
    excludePatterns: ['%Transmeta%'],
  },
  {
    key: 'twitter_x_history',
    label: 'Twitter / X history boundary',
    decision: 'Keep Twitter, Twitter/X transition rows, X Corp., and X.com separate because historical roles and acquisition/founding context differ.',
    patterns: ['%Twitter%', '%X Corp%', '%X.com%'],
  },
  {
    key: 'cas_ict',
    label: 'Chinese Academy of Sciences / ICT boundary',
    decision: 'Keep CAS parent academy, CAS ICT, graduate school, and separate institute/lab rows apart unless a row is a direct duplicate of the same institute.',
    patterns: ['%Chinese Academy of Sciences%', '%Institute of Computing Technology%', '%中国科学院%', '%计算技术研究所%'],
  },
  {
    key: 'idsia_dalle_molle',
    label: 'IDSIA / Dalle Molle boundary',
    decision: 'Review English and Italian naming variants before merging.',
    patterns: ['%IDSIA%', '%Dalle Molle%', '%Istituto Dalle Molle%'],
  },
  {
    key: 'ibm_research',
    label: 'IBM / IBM Research boundary',
    decision: 'Keep IBM and IBM Research separate because corporate leadership roles and research-lab affiliations are distinct.',
    patterns: ['%IBM%'],
  },
  {
    key: 'ubc',
    label: 'University of British Columbia boundary',
    decision: 'Keep SBS & University of British Columbia separate from University of British Columbia until the SBS context has direct source support.',
    patterns: ['%University of British Columbia%', '%UBC%', '%英属哥伦比亚%'],
  },
  {
    key: 'kings_college',
    label: "King's College boundary",
    decision: "Keep King's College, Cambridge and King's College, New Zealand separate because they are different institutions.",
    patterns: ["%King's College%", '%Kings College%', '%King’s College%', '%KCL%'],
  },
];

const args = process.argv.slice(2);
const outArg = args.find(a => a.startsWith('--out='));
const OUT = path.resolve(
  process.cwd(),
  outArg?.slice('--out='.length) || 'docs/audit-2026-06/data/org_review.json'
);

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL');
}

const sql = neon(process.env.DATABASE_URL);

function normalizeLabel(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

async function main() {
  const payloadClusters = [];

  for (const cluster of clusters) {
    const orgCandidates = await sql`
      SELECT
        o.id,
        o.name,
        o."nameZh",
        o.type,
        o."wikidataQid",
        COUNT(r.id)::int AS "roleCount",
        COALESCE(
          ARRAY_AGG(DISTINCT p.name ORDER BY p.name) FILTER (WHERE p.id IS NOT NULL),
          ARRAY[]::text[]
        ) AS people
      FROM "Organization" o
      LEFT JOIN "PersonRole" r ON r."organizationId" = o.id
      LEFT JOIN "People" p ON p.id = r."personId"
      WHERE EXISTS (
        SELECT 1
        FROM UNNEST(${cluster.patterns}::text[]) AS pattern
        WHERE o.name ILIKE pattern
          OR COALESCE(o."nameZh", '') ILIKE pattern
      )
      AND NOT EXISTS (
        SELECT 1
        FROM UNNEST(${cluster.excludePatterns || []}::text[]) AS pattern
        WHERE o.name ILIKE pattern
          OR COALESCE(o."nameZh", '') ILIKE pattern
      )
      GROUP BY o.id
      ORDER BY "roleCount" DESC, o.name ASC
    ` as OrgCandidate[];

    const peopleOrgValues = await sql`
      SELECT
        org_value AS value,
        COUNT(DISTINCT p.id)::int AS "peopleCount",
        ARRAY_AGG(DISTINCT p.name ORDER BY p.name) AS people
      FROM "People" p
      CROSS JOIN LATERAL UNNEST(p.organization) AS org_value
      WHERE EXISTS (
        SELECT 1
        FROM UNNEST(${cluster.patterns}::text[]) AS pattern
        WHERE org_value ILIKE pattern
      )
      AND NOT EXISTS (
        SELECT 1
        FROM UNNEST(${cluster.excludePatterns || []}::text[]) AS pattern
        WHERE org_value ILIKE pattern
      )
      GROUP BY org_value
      ORDER BY "peopleCount" DESC, org_value ASC
    ` as PeopleOrgValue[];

    const peopleOrgValueSet = new Set(peopleOrgValues.map(row => normalizeLabel(row.value)));
    const activeOrgCandidates = orgCandidates.filter(row => (
      row.roleCount > 0
      || peopleOrgValueSet.has(normalizeLabel(row.name))
      || peopleOrgValueSet.has(normalizeLabel(row.nameZh))
    ));

    if (activeOrgCandidates.length <= 1 && peopleOrgValues.length === 0) {
      continue;
    }

    payloadClusters.push({
      key: cluster.key,
      label: cluster.label,
      decision: cluster.decision,
      organizationRows: activeOrgCandidates,
      peopleOrganizationValues: peopleOrgValues,
      summary: {
        organizationRows: activeOrgCandidates.length,
        personRoleRefs: activeOrgCandidates.reduce((sum, row) => sum + row.roleCount, 0),
        peopleOrganizationValues: peopleOrgValues.length,
        peopleOrgRefs: peopleOrgValues.reduce((sum, row) => sum + row.peopleCount, 0),
      },
    });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    summary: {
      clusters: payloadClusters.length,
      organizationRows: payloadClusters.reduce((sum, cluster) => sum + cluster.summary.organizationRows, 0),
      personRoleRefs: payloadClusters.reduce((sum, cluster) => sum + cluster.summary.personRoleRefs, 0),
      peopleOrganizationValues: payloadClusters.reduce((sum, cluster) => sum + cluster.summary.peopleOrganizationValues, 0),
      peopleOrgRefs: payloadClusters.reduce((sum, cluster) => sum + cluster.summary.peopleOrgRefs, 0),
    },
    clusters: payloadClusters,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));

  console.log(`Exported organization review: ${OUT}`);
  console.log(JSON.stringify(payload.summary, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
