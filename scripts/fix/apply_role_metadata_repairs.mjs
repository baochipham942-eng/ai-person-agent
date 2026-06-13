/**
 * Apply source-backed People currentTitle/organization repairs and precise PersonRole metadata repairs.
 *
 * Default is dry-run. Use --execute to mutate People and PersonRole rows.
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const INPUT = getArg('--in') || 'docs/audit-2026-06/data/role_metadata_repairs.json';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/role_metadata_repairs_apply_log.json';
const EXECUTE = process.argv.includes('--execute');

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length);
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

function toDate(value) {
  return value ? new Date(value) : null;
}

function sameDate(left, right) {
  return String(left || '') === String(right || '');
}

async function applyPeopleRepairs(people = [], log) {
  for (const repair of people) {
    const rows = await sql`
      SELECT id, name, organization, "currentTitle"
      FROM "People"
      WHERE id = ${repair.personId}
      LIMIT 1
    `;
    const person = rows[0];
    if (!person) {
      log.push({ action: 'missing_person', repair });
      console.log(`missing person: ${repair.person} (${repair.personId})`);
      continue;
    }
    if (person.name !== repair.person) {
      log.push({ action: 'person_name_mismatch', repair, person });
      console.log(`person mismatch: expected ${repair.person}, got ${person.name}`);
      continue;
    }

    const nextOrganization = mergeOrganizations(person.organization, repair.organizations);
    const nextCurrentTitle = repair.currentTitle || person.currentTitle;
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
      ? (EXECUTE ? 'update_person' : 'would_update_person')
      : 'already_applied_person';
    log.push({
      action,
      person: person.name,
      personId: person.id,
      previousCurrentTitle: person.currentTitle,
      nextCurrentTitle,
      previousOrganization: person.organization,
      nextOrganization,
      evidenceUrl: repair.evidenceUrl || null,
      evidenceNote: repair.evidenceNote || null,
    });
    console.log(`${action}: ${person.name}`);
  }
}

async function applyRoleRepairs(roles = [], log) {
  for (const repair of roles) {
    const rows = await sql`
      SELECT r.id, p.name AS person, r.role, r."roleZh", r."startDate", r."endDate", r.source, r.confidence,
             o.name AS organization, o."nameZh" AS "organizationNameZh"
      FROM "PersonRole" r
      JOIN "People" p ON p.id = r."personId"
      JOIN "Organization" o ON o.id = r."organizationId"
      WHERE r.id = ${repair.id}
      LIMIT 1
    `;
    const role = rows[0];
    if (!role) {
      log.push({ action: 'missing_role', repair });
      console.log(`missing role: ${repair.id}`);
      continue;
    }

    const nameMatches = role.person === repair.person;
    const orgMatches = role.organization === repair.organization || role.organizationNameZh === repair.organization;
    if (!nameMatches || !orgMatches) {
      log.push({ action: 'role_identity_mismatch', repair, role });
      console.log(`role mismatch: expected ${repair.person} @ ${repair.organization}, got ${role.person} @ ${role.organization}`);
      continue;
    }

    const nextStartDate = toDate(repair.startDate);
    const nextEndDate = toDate(repair.endDate);
    const nextRoleZh = repair.roleZh ?? role.roleZh;
    const nextConfidence = Number(repair.confidence ?? role.confidence);
    const changed = role.role !== repair.role
      || role.roleZh !== nextRoleZh
      || !sameDate(role.startDate, nextStartDate)
      || !sameDate(role.endDate, nextEndDate)
      || role.source !== repair.source
      || Number(role.confidence) !== nextConfidence;

    if (EXECUTE && changed) {
      await sql`
        UPDATE "PersonRole"
        SET role = ${repair.role},
            "roleZh" = ${nextRoleZh},
            "startDate" = ${nextStartDate},
            "endDate" = ${nextEndDate},
            source = ${repair.source || role.source},
            confidence = ${nextConfidence}
        WHERE id = ${role.id}
      `;
    }

    const action = changed
      ? (EXECUTE ? 'update_role' : 'would_update_role')
      : 'already_applied_role';
    log.push({
      action,
      id: role.id,
      person: role.person,
      organization: role.organization,
      previousRole: role.role,
      nextRole: repair.role,
      previousRoleZh: role.roleZh,
      nextRoleZh,
      previousStartDate: role.startDate,
      nextStartDate,
      previousEndDate: role.endDate,
      nextEndDate,
      evidenceUrl: repair.evidenceUrl || null,
    });
    console.log(`${action}: ${role.person} ${role.role} @ ${role.organization}`);
  }
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), INPUT), 'utf8'));
  const log = [];
  console.log(`Role metadata repair mode: ${EXECUTE ? 'execute' : 'dry-run'} | people=${payload.people?.length || 0} roles=${payload.roles?.length || 0}`);

  await applyPeopleRepairs(payload.people, log);
  await applyRoleRepairs(payload.roles, log);

  const summary = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    people: payload.people?.length || 0,
    roles: payload.roles?.length || 0,
    updatedPeople: log.filter(row => row.action === 'update_person').length,
    updatedRoles: log.filter(row => row.action === 'update_role').length,
    wouldUpdatePeople: log.filter(row => row.action === 'would_update_person').length,
    wouldUpdateRoles: log.filter(row => row.action === 'would_update_role').length,
    alreadyApplied: log.filter(row => row.action.startsWith('already_applied')).length,
    missing: log.filter(row => row.action.startsWith('missing')).length,
    mismatched: log.filter(row => row.action.endsWith('mismatch')).length,
  };

  fs.writeFileSync(path.join(process.cwd(), OUT), `${JSON.stringify({ summary, log }, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Log written: ${OUT}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
