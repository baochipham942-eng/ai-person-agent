/**
 * Delete explicitly reviewed PersonRole rows by id.
 *
 * Default is dry-run. Use --execute to delete only rows that match person,
 * organization, and role text in the decision file.
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const INPUT = getArg('--in') || 'docs/audit-2026-06/data/person_role_deletions.json';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/person_role_deletions_apply_log.json';
const EXECUTE = process.argv.includes('--execute');

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), INPUT), 'utf8'));
  const deletions = Array.isArray(payload.deletions) ? payload.deletions : [];
  const log = [];
  console.log(`PersonRole deletion mode: ${EXECUTE ? 'execute' : 'dry-run'} | deletions=${deletions.length}`);

  for (const deletion of deletions) {
    const rows = await sql`
      SELECT r.id, p.name AS person, r.role, r."roleZh", r."startDate", r."endDate", r.source, r.confidence,
             o.name AS organization, o."nameZh" AS "organizationNameZh"
      FROM "PersonRole" r
      JOIN "People" p ON p.id = r."personId"
      JOIN "Organization" o ON o.id = r."organizationId"
      WHERE r.id = ${deletion.id}
      LIMIT 1
    `;
    const role = rows[0];
    if (!role) {
      log.push({ action: 'missing_role', deletion });
      console.log(`missing role: ${deletion.id}`);
      continue;
    }

    const personMatches = role.person === deletion.person;
    const organizationMatches = role.organization === deletion.organization
      || role.organizationNameZh === deletion.organization;
    const roleMatches = role.role === deletion.role
      || role.roleZh === deletion.role
      || !deletion.role;

    if (!personMatches || !organizationMatches || !roleMatches) {
      log.push({ action: 'identity_mismatch', deletion, role });
      console.log(`identity mismatch: ${deletion.id} expected ${deletion.person} @ ${deletion.organization} / ${deletion.role}, got ${role.person} @ ${role.organization} / ${role.role}`);
      continue;
    }

    if (EXECUTE) {
      await sql`
        DELETE FROM "PersonRole"
        WHERE id = ${role.id}
      `;
    }

    const action = EXECUTE ? 'delete_role' : 'would_delete_role';
    log.push({
      action,
      id: role.id,
      person: role.person,
      organization: role.organization,
      role: role.role,
      reason: deletion.reason || null,
      evidenceUrl: deletion.evidenceUrl || null,
    });
    console.log(`${action}: ${role.person} ${role.role} @ ${role.organization}`);
  }

  const summary = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    deletions: deletions.length,
    deleted: log.filter(row => row.action === 'delete_role').length,
    wouldDelete: log.filter(row => row.action === 'would_delete_role').length,
    missing: log.filter(row => row.action === 'missing_role').length,
    mismatched: log.filter(row => row.action === 'identity_mismatch').length,
  };

  fs.writeFileSync(path.join(process.cwd(), OUT), `${JSON.stringify({ summary, log }, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Log written: ${OUT}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
