/**
 * Apply precise PersonRole endDate repairs by role id.
 *
 * Default is dry-run. Use --execute to mutate PersonRole rows only.
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const INPUT = getArg('--in') || 'docs/audit-2026-06/data/role_enddate_repairs.json';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/role_enddate_repairs_apply_log.json';
const EXECUTE = process.argv.includes('--execute');

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function resolvePath(value) {
  return path.isAbsolute(value) ? value : path.join(process.cwd(), value);
}

function toDate(value) {
  return value ? new Date(value) : null;
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(resolvePath(INPUT), 'utf8'));
  const log = [];
  console.log(`Role endDate repair mode: ${EXECUTE ? 'execute' : 'dry-run'} | roles=${payload.roles.length}`);

  for (const repair of payload.roles) {
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
      log.push({ action: 'identity_mismatch', repair, role });
      console.log(`identity mismatch: ${repair.id} expected ${repair.person} @ ${repair.organization}, got ${role.person} @ ${role.organization}`);
      continue;
    }

    const nextEndDate = toDate(repair.endDate);
    const changed = String(role.endDate || '') !== String(nextEndDate || '')
      || role.source !== repair.source
      || Number(role.confidence) !== Number(repair.confidence ?? role.confidence);

    if (EXECUTE && changed) {
      await sql`
        UPDATE "PersonRole"
        SET "endDate" = ${nextEndDate},
            source = ${repair.source || role.source},
            confidence = ${Number(repair.confidence ?? role.confidence)}
        WHERE id = ${role.id}
      `;
    }

    const action = changed
      ? (EXECUTE ? 'update_role_enddate' : 'would_update_role_enddate')
      : 'already_applied';
    log.push({
      action,
      id: role.id,
      person: role.person,
      organization: role.organization,
      role: role.role,
      previousEndDate: role.endDate,
      nextEndDate,
      evidenceUrl: repair.evidenceUrl || null,
    });
    console.log(`${action}: ${role.person} ${role.role} @ ${role.organization}`);
  }

  const summary = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    roles: payload.roles.length,
    updated: log.filter(row => row.action === 'update_role_enddate').length,
    wouldUpdate: log.filter(row => row.action === 'would_update_role_enddate').length,
    alreadyApplied: log.filter(row => row.action === 'already_applied').length,
    missing: log.filter(row => row.action === 'missing_role').length,
    mismatched: log.filter(row => row.action === 'identity_mismatch').length,
  };

  const outPath = resolvePath(OUT);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify({ summary, log }, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Log written: ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
