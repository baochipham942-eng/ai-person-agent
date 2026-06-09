/**
 * Apply curated career review decisions.
 *
 * Default is dry-run. Use --execute to mutate the database.
 *
 * Scope:
 * - Reassign PersonRole rows from position-like Organization rows to real orgs.
 * - Delete explicitly curated duplicate/generic PersonRole rows.
 * - Remove exact position-label noise from People.organization arrays.
 * - Delete cleanup Organization rows only after final zero-ref checks.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

type Decision =
  | {
      action: 'reassign_role';
      roleId: string;
      targetOrganizationId: string;
      role: string;
      roleZh: string | null;
      evidenceNote: string;
    }
  | {
      action: 'delete_role';
      roleId: string;
      evidenceNote: string;
    }
  | {
      action: 'update_role';
      roleId: string;
      role: string;
      roleZh: string | null;
      evidenceNote: string;
    };

type RoleRow = {
  id: string;
  personId: string;
  person: string;
  organizationId: string;
  organization: string;
  role: string;
  roleZh: string | null;
  startDate: Date | null;
};

type OrganizationCheck = {
  id: string;
  name: string;
  nameZh: string | null;
  roleCount: number;
  peopleRefs: number;
};

type Payload = {
  decisions: Decision[];
  cleanupOrganizations: string[];
};

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const DECISIONS_PATH = args.find(arg => arg.startsWith('--decisions='))?.slice('--decisions='.length)
  || 'docs/audit-2026-06/career_review_decisions.json';

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

async function loadRole(id: string): Promise<RoleRow | null> {
  const rows = await sql`
    SELECT
      r.id,
      r."personId",
      p.name AS person,
      r."organizationId",
      o.name AS organization,
      r.role,
      r."roleZh",
      r."startDate"
    FROM "PersonRole" r
    JOIN "People" p ON p.id = r."personId"
    JOIN "Organization" o ON o.id = r."organizationId"
    WHERE r.id = ${id}
  ` as RoleRow[];
  return rows[0] || null;
}

async function loadOrgName(id: string): Promise<string> {
  const rows = await sql`
    SELECT COALESCE("nameZh", name) AS name
    FROM "Organization"
    WHERE id = ${id}
  ` as Array<{ name: string }>;
  return rows[0]?.name || id;
}

async function findRoleConflict(
  role: RoleRow,
  targetOrganizationId: string,
  targetRole: string,
): Promise<RoleRow | null> {
  const rows = await sql`
    SELECT
      r.id,
      r."personId",
      p.name AS person,
      r."organizationId",
      o.name AS organization,
      r.role,
      r."roleZh",
      r."startDate"
    FROM "PersonRole" r
    JOIN "People" p ON p.id = r."personId"
    JOIN "Organization" o ON o.id = r."organizationId"
    WHERE r.id <> ${role.id}
      AND r."personId" = ${role.personId}
      AND r."organizationId" = ${targetOrganizationId}
      AND r.role = ${targetRole}
      AND (
        r."startDate" = ${role.startDate}
        OR (r."startDate" IS NULL AND ${role.startDate}::timestamp IS NULL)
      )
    LIMIT 1
  ` as RoleRow[];
  return rows[0] || null;
}

async function cleanPeopleOrganizationLabels(cleanupOrgIds: string[]): Promise<number> {
  const orgs = await sql`
    SELECT id, name, "nameZh"
    FROM "Organization"
    WHERE id = ANY(${cleanupOrgIds}::text[])
  ` as Array<{ id: string; name: string; nameZh: string | null }>;

  const labels = new Set(orgs.flatMap(org => [org.name, org.nameZh].filter((value): value is string => Boolean(value))));
  if (labels.size === 0) return 0;

  const people = await sql`
    SELECT id, name, organization
    FROM "People"
    WHERE organization && ${[...labels]}::text[]
  ` as Array<{ id: string; name: string; organization: string[] }>;

  let changed = 0;
  for (const person of people) {
    const next = (person.organization || []).filter(org => !labels.has(org));
    if (next.length === person.organization.length) continue;

    changed += 1;
    console.log(`${EXECUTE ? 'clean' : 'would clean'} People.organization: ${person.name} ${JSON.stringify(person.organization)} -> ${JSON.stringify(next)}`);
    if (EXECUTE) {
      await sql`UPDATE "People" SET organization = ${next} WHERE id = ${person.id}`;
    }
  }

  return changed;
}

async function checkOrganization(orgId: string): Promise<OrganizationCheck | null> {
  const orgRows = await sql`
    SELECT id, name, "nameZh"
    FROM "Organization"
    WHERE id = ${orgId}
  ` as Array<{ id: string; name: string; nameZh: string | null }>;
  const org = orgRows[0];
  if (!org) return null;

  const labels = [org.name, org.nameZh].filter((value): value is string => Boolean(value));
  const rows = await sql`
    SELECT
      ${org.id}::text AS id,
      ${org.name}::text AS name,
      ${org.nameZh}::text AS "nameZh",
      (SELECT COUNT(*)::int FROM "PersonRole" WHERE "organizationId" = ${org.id}) AS "roleCount",
      (
        SELECT COUNT(*)::int
        FROM "People" p
        WHERE EXISTS (
          SELECT 1 FROM unnest(p.organization) AS org_name
          WHERE org_name = ANY(${labels}::text[])
        )
      ) AS "peopleRefs"
  ` as OrganizationCheck[];
  return rows[0] || null;
}

async function main() {
  const payload = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), DECISIONS_PATH), 'utf-8'),
  ) as Payload;

  console.log(`Career review decisions mode: ${EXECUTE ? 'execute' : 'dry-run'}`);
  let matched = 0;
  let missing = 0;
  let alreadyApplied = 0;
  let skipped = 0;
  let updated = 0;

  for (const decision of payload.decisions) {
    const role = await loadRole(decision.roleId);
    if (!role) {
      if (decision.action === 'delete_role') {
        alreadyApplied += 1;
        console.log(`already deleted role: ${decision.roleId}`);
        continue;
      }
      missing += 1;
      console.log(`missing role: ${decision.roleId}`);
      continue;
    }

    matched += 1;

    if (decision.action === 'delete_role') {
      console.log(`${EXECUTE ? 'delete' : 'would delete'} role: ${role.person} ${role.role} @ ${role.organization}: ${decision.evidenceNote}`);
      if (EXECUTE) {
        await sql`DELETE FROM "PersonRole" WHERE id = ${role.id}`;
        updated += 1;
      }
      continue;
    }

    if (decision.action === 'update_role') {
      if (role.role === decision.role && role.roleZh === decision.roleZh) {
        alreadyApplied += 1;
        console.log(`already updated role: ${role.person} ${role.role} @ ${role.organization}`);
        continue;
      }

      console.log(`${EXECUTE ? 'update' : 'would update'} role: ${role.person} ${role.role} @ ${role.organization} -> ${decision.role}: ${decision.evidenceNote}`);
      if (EXECUTE) {
        await sql`
          UPDATE "PersonRole"
          SET role = ${decision.role},
              "roleZh" = ${decision.roleZh}
          WHERE id = ${role.id}
        `;
        updated += 1;
      }
      continue;
    }

    const targetOrg = await loadOrgName(decision.targetOrganizationId);
    if (role.organizationId === decision.targetOrganizationId && role.role === decision.role) {
      alreadyApplied += 1;
      console.log(`already reassigned role: ${role.person} ${role.role} @ ${targetOrg}`);
      continue;
    }

    const conflict = await findRoleConflict(role, decision.targetOrganizationId, decision.role);
    if (conflict) {
      skipped += 1;
      console.log(`skip conflict: ${role.person} ${decision.role} @ ${targetOrg}, existing role=${conflict.id}`);
      continue;
    }

    console.log(`${EXECUTE ? 'reassign' : 'would reassign'} role: ${role.person} ${role.role} @ ${role.organization} -> ${decision.role} @ ${targetOrg}: ${decision.evidenceNote}`);
    if (EXECUTE) {
      await sql`
        UPDATE "PersonRole"
        SET
          "organizationId" = ${decision.targetOrganizationId},
          role = ${decision.role},
          "roleZh" = ${decision.roleZh}
        WHERE id = ${role.id}
      `;
      updated += 1;
    }
  }

  const peopleOrgCleaned = await cleanPeopleOrganizationLabels(payload.cleanupOrganizations);

  let deletedOrganizations = 0;
  for (const orgId of payload.cleanupOrganizations) {
    const org = await checkOrganization(orgId);
    if (!org) {
      console.log(`already deleted org: ${orgId}`);
      continue;
    }
    if (org.roleCount !== 0 || org.peopleRefs !== 0) {
      skipped += 1;
      console.log(`skip org cleanup: ${org.name} (${org.id}), roles=${org.roleCount}, peopleRefs=${org.peopleRefs}`);
      continue;
    }

    console.log(`${EXECUTE ? 'delete' : 'would delete'} empty position-like org: ${org.name} (${org.id})`);
    if (EXECUTE) {
      await sql`DELETE FROM "Organization" WHERE id = ${org.id}`;
      deletedOrganizations += 1;
    }
  }

  console.log(JSON.stringify({ matched, missing, alreadyApplied, skipped, updated, peopleOrgCleaned, deletedOrganizations }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
