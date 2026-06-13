/**
 * Add current PersonRole rows for roster-gap newcomer candidates.
 *
 * Default is dry-run. Use --execute to mutate the database.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });
loadExtraEnv();

const INPUT = getArg('--in') || 'docs/audit-2026-06/data/roster_gap_role_repairs.json';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/roster_gap_role_repairs_apply_log.json';
const EXECUTE = process.argv.includes('--execute');

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function loadExtraEnv() {
  for (const file of [
    path.join(os.homedir(), '.code-agent/.env'),
    path.resolve('.env'),
    path.resolve('.env.local'),
  ]) {
    try {
      const parsed = dotenv.parse(fs.readFileSync(file));
      for (const [key, value] of Object.entries(parsed)) {
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      // Optional env file.
    }
  }
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function toDate(value) {
  return value ? new Date(value) : null;
}

async function findPerson(repair) {
  const terms = unique([repair.personName, ...list(repair.aliases)]);
  const rows = await sql`
    SELECT id, name, aliases, organization, "currentTitle", "roleCategory", status
    FROM "People"
    WHERE name = ANY(${terms}::text[])
       OR aliases && ${terms}::text[]
    ORDER BY
      CASE WHEN name = ${repair.personName} THEN 0 ELSE 1 END,
      CASE WHEN status = 'candidate' THEN 0 ELSE 1 END,
      "influenceScore" DESC,
      name ASC
    LIMIT 1
  `;
  return rows[0] || null;
}

async function findOrCreateOrganization(repair) {
  const rows = await sql`
    SELECT id, name, "nameZh", type
    FROM "Organization"
    WHERE name = ${repair.organizationName}
       OR "nameZh" = ${repair.organizationName}
    ORDER BY name ASC
    LIMIT 1
  `;
  if (rows[0]) return { organization: rows[0], action: 'existing_org' };

  const id = crypto.randomUUID();
  if (EXECUTE) {
    await sql`
      INSERT INTO "Organization" (id, name, "nameZh", type)
      VALUES (${id}, ${repair.organizationName}, ${repair.organizationNameZh || repair.organizationName}, ${repair.organizationType || 'company'})
    `;
  }
  return {
    organization: {
      id,
      name: repair.organizationName,
      nameZh: repair.organizationNameZh || repair.organizationName,
      type: repair.organizationType || 'company',
    },
    action: EXECUTE ? 'insert_org' : 'would_insert_org',
  };
}

async function existingRole(personId, organizationId, repair) {
  const startDate = toDate(repair.startDate);
  const endDate = toDate(repair.endDate);
  const rows = await sql`
    SELECT id
    FROM "PersonRole"
    WHERE "personId" = ${personId}
      AND "organizationId" = ${organizationId}
      AND role = ${repair.role}
      AND "startDate" IS NOT DISTINCT FROM ${startDate}
      AND "endDate" IS NOT DISTINCT FROM ${endDate}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function applyRepair(repair) {
  const person = await findPerson(repair);
  if (!person) return { action: 'missing_person', repair };

  const { organization, action: organizationAction } = await findOrCreateOrganization(repair);
  const nextOrganizations = unique([...(person.organization || []), repair.organizationName, organization.nameZh]);
  const nextCurrentTitle = repair.currentTitle || person.currentTitle;
  const nextRoleCategory = repair.roleCategory || person.roleCategory;
  const updates = {
    organizationChanged: JSON.stringify(person.organization || []) !== JSON.stringify(nextOrganizations),
    currentTitleChanged: (person.currentTitle || null) !== (nextCurrentTitle || null),
    roleCategoryChanged: (person.roleCategory || null) !== (nextRoleCategory || null),
  };

  if (EXECUTE && (updates.organizationChanged || updates.currentTitleChanged || updates.roleCategoryChanged)) {
    await sql`
      UPDATE "People"
      SET
        organization = ${nextOrganizations},
        "currentTitle" = ${nextCurrentTitle || null},
        "roleCategory" = ${nextRoleCategory || null},
        "updatedAt" = NOW()
      WHERE id = ${person.id}
    `;
  }

  const existing = await existingRole(person.id, organization.id, repair);
  let roleAction = 'existing_role';
  if (!existing) {
    roleAction = EXECUTE ? 'insert_role' : 'would_insert_role';
    if (EXECUTE) {
      await sql`
        INSERT INTO "PersonRole" (
          id, "personId", "organizationId", role, "roleZh", "startDate", "endDate", source, confidence
        )
        VALUES (
          ${crypto.randomUUID()},
          ${person.id},
          ${organization.id},
          ${repair.role},
          ${repair.roleZh || null},
          ${toDate(repair.startDate)},
          ${toDate(repair.endDate)},
          ${repair.source || 'manual_roster_gap'},
          ${Number(repair.confidence ?? 0.8)}
        )
      `;
    }
  }

  return {
    action: roleAction,
    organizationAction,
    person: person.name,
    personId: person.id,
    organization: organization.name,
    organizationId: organization.id,
    role: repair.role,
    updates,
  };
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), INPUT), 'utf8'));
  const log = [];
  console.log(`Roster role repair mode: ${EXECUTE ? 'execute' : 'dry-run'} | roles=${payload.roles.length}`);

  for (const repair of payload.roles) {
    const result = await applyRepair(repair);
    log.push(result);
    if (result.action === 'missing_person') {
      console.log(`missing person: ${repair.personName}`);
      continue;
    }
    console.log(`${result.action}: ${result.person} -> ${result.role} @ ${result.organization}`);
  }

  const summary = {
    roles: payload.roles.length,
    insertedRoles: log.filter((row) => row.action === 'insert_role').length,
    wouldInsertRoles: log.filter((row) => row.action === 'would_insert_role').length,
    existingRoles: log.filter((row) => row.action === 'existing_role').length,
    missingPeople: log.filter((row) => row.action === 'missing_person').length,
    orgsInserted: log.filter((row) => row.organizationAction === 'insert_org').length,
    orgsWouldInsert: log.filter((row) => row.organizationAction === 'would_insert_org').length,
  };
  fs.writeFileSync(path.join(process.cwd(), OUT), `${JSON.stringify({ summary, log }, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Log written: ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
