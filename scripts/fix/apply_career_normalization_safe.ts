/**
 * Apply safe career normalization fixes.
 *
 * Default is dry-run. Use --execute to mutate the database.
 *
 * Scope:
 * - Merge duplicate Organization rows with the same normalized name and no Wikidata QID.
 * - Deduplicate People.organization arrays by normalized display value.
 * - Delete exact duplicate PersonRole rows with same person/org/role/startDate.
 */
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { normalizeCareerOrgName, normalizeCareerRole, type RawCareerData } from '../../lib/datasources/career';

type OrganizationRow = {
  id: string;
  name: string;
  nameZh: string | null;
  type: string;
  wikidataQid: string | null;
  roleCount: number;
};

type PeopleRow = {
  id: string;
  name: string;
  organization: string[];
};

type RoleRow = {
  id: string;
  personId: string;
  organizationId: string;
  role: string;
  startDate: Date | null;
  endDate: Date | null;
  roleZh: string | null;
  createdAt: Date;
};

const EXECUTE = process.argv.includes('--execute');
if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function normalizeKey(value: string): string {
  return normalizeCareerOrgName(value)
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

function isoDate(date: Date | null): string {
  return date ? date.toISOString() : '';
}

function pickCanonical(rows: OrganizationRow[]): OrganizationRow {
  return [...rows].sort((a, b) => {
    const zh = Number(Boolean(b.nameZh)) - Number(Boolean(a.nameZh));
    if (zh !== 0) return zh;
    if (b.roleCount !== a.roleCount) return b.roleCount - a.roleCount;
    return a.name.localeCompare(b.name);
  })[0];
}

async function loadOrganizations(): Promise<OrganizationRow[]> {
  return await sql`
    SELECT
      o.id,
      o.name,
      o."nameZh",
      o.type,
      o."wikidataQid",
      COUNT(r.id)::int AS "roleCount"
    FROM "Organization" o
    LEFT JOIN "PersonRole" r ON r."organizationId" = o.id
    GROUP BY o.id
    ORDER BY o.name ASC
  ` as OrganizationRow[];
}

async function loadPeople(): Promise<PeopleRow[]> {
  return await sql`
    SELECT id, name, organization
    FROM "People"
    ORDER BY name ASC
  ` as PeopleRow[];
}

async function loadRoles(): Promise<RoleRow[]> {
  return await sql`
    SELECT id, "personId", "organizationId", role, "startDate", "endDate", "roleZh", "createdAt"
    FROM "PersonRole"
    ORDER BY "createdAt" ASC
  ` as RoleRow[];
}

async function countRoleConflicts(fromOrgId: string, toOrgId: string): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM "PersonRole" source
    JOIN "PersonRole" target
      ON target."personId" = source."personId"
     AND target.role = source.role
     AND target."organizationId" = ${toOrgId}
     AND (
       target."startDate" = source."startDate"
       OR (target."startDate" IS NULL AND source."startDate" IS NULL)
     )
    WHERE source."organizationId" = ${fromOrgId}
  ` as Array<{ count: number }>;
  return rows[0]?.count || 0;
}

async function dryRunOrgMerges(orgs: OrganizationRow[]) {
  const clusters = new Map<string, OrganizationRow[]>();
  for (const org of orgs) {
    if (org.wikidataQid) continue;
    const key = normalizeKey(org.name);
    clusters.set(key, [...(clusters.get(key) || []), org]);
  }

  const duplicateClusters = [...clusters.values()].filter(rows => rows.length > 1);
  let roleRefs = 0;
  let skippedByConflict = 0;

  for (const rows of duplicateClusters) {
    const keep = pickCanonical(rows);
    const members = rows.filter(row => row.id !== keep.id);
    for (const member of members) {
      const conflicts = await countRoleConflicts(member.id, keep.id);
      if (conflicts > 0) {
        skippedByConflict += 1;
        continue;
      }
      roleRefs += member.roleCount;
      console.log(`${EXECUTE ? 'merge' : 'would merge'} org: "${member.name}" (${member.id}) -> "${keep.name}" (${keep.id}), roles=${member.roleCount}`);
      if (EXECUTE) {
        await sql`UPDATE "PersonRole" SET "organizationId" = ${keep.id} WHERE "organizationId" = ${member.id}`;
        await sql`DELETE FROM "Organization" WHERE id = ${member.id}`;
      }
    }
  }

  return { clusters: duplicateClusters.length, roleRefs, skippedByConflict };
}

async function dryRunPeopleOrgDedup(people: PeopleRow[]) {
  let changed = 0;

  for (const person of people) {
    const seen = new Set<string>();
    const next: string[] = [];
    for (const org of person.organization || []) {
      const key = normalizeKey(org);
      if (seen.has(key)) continue;
      seen.add(key);
      next.push(org);
    }

    if (next.length !== (person.organization || []).length) {
      changed += 1;
      console.log(`${EXECUTE ? 'dedupe' : 'would dedupe'} People.organization: ${person.name} ${JSON.stringify(person.organization)} -> ${JSON.stringify(next)}`);
      if (EXECUTE) {
        await sql`UPDATE "People" SET organization = ${next} WHERE id = ${person.id}`;
      }
    }
  }

  return { people: changed };
}

function roleKey(role: RoleRow): string {
  const normalizedRole = normalizeCareerRole(role.role, 'career' as RawCareerData['type']).toLowerCase();
  return [role.personId, role.organizationId, normalizedRole, isoDate(role.startDate)].join('|');
}

async function dryRunDuplicateRoleDeletes(roles: RoleRow[]) {
  const groups = new Map<string, RoleRow[]>();
  for (const role of roles) groups.set(roleKey(role), [...(groups.get(roleKey(role)) || []), role]);

  let groupsCount = 0;
  let deleteCandidates = 0;

  for (const rows of groups.values()) {
    if (rows.length <= 1) continue;
    groupsCount += 1;
    const sorted = [...rows].sort((a, b) => {
      const zh = Number(Boolean(b.roleZh)) - Number(Boolean(a.roleZh));
      if (zh !== 0) return zh;
      const end = Number(Boolean(b.endDate)) - Number(Boolean(a.endDate));
      if (end !== 0) return end;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
    const keep = sorted[0];
    const duplicates = sorted.slice(1);
    deleteCandidates += duplicates.length;
    console.log(`${EXECUTE ? 'delete' : 'would delete'} duplicate roles: keep=${keep.id}, drop=${duplicates.map(row => row.id).join(',')}`);
    if (EXECUTE) {
      await sql`DELETE FROM "PersonRole" WHERE id = ANY(${duplicates.map(row => row.id)}::text[])`;
    }
  }

  return { groups: groupsCount, deleteCandidates };
}

async function main() {
  const [orgs, people, roles] = await Promise.all([
    loadOrganizations(),
    loadPeople(),
    loadRoles(),
  ]);

  console.log(`Career safe normalization mode: ${EXECUTE ? 'execute' : 'dry-run'}`);
  const orgMerge = await dryRunOrgMerges(orgs);
  const peopleOrgDedup = await dryRunPeopleOrgDedup(people);
  const duplicateRoleDelete = await dryRunDuplicateRoleDeletes(roles);

  console.log(JSON.stringify({ orgMerge, peopleOrgDedup, duplicateRoleDelete }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
