/**
 * Apply precise local avatar path repairs to People rows.
 *
 * Default is dry-run. Use --execute to mutate People.avatarUrl.
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const INPUT = getArg('--in') || 'docs/audit-2026-06/data/avatar_path_repairs.json';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/avatar_path_repairs_apply_log.json';
const EXECUTE = process.argv.includes('--execute');

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), INPUT), 'utf8'));
  const log = [];
  console.log(`Avatar path repair mode: ${EXECUTE ? 'execute' : 'dry-run'} | avatars=${payload.avatars.length}`);

  for (const repair of payload.avatars) {
    const publicPath = path.join(process.cwd(), 'public', repair.nextAvatarUrl);
    const proxyPath = path.join(process.cwd(), 'proxy/public', repair.nextAvatarUrl);
    if (!fs.existsSync(publicPath) || !fs.existsSync(proxyPath)) {
      log.push({ action: 'missing_local_file', repair, publicPath, proxyPath });
      console.log(`missing local file: ${repair.person} ${repair.nextAvatarUrl}`);
      continue;
    }

    const rows = await sql`
      SELECT id, name, "avatarUrl"
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
    if (person.name !== repair.person || person.avatarUrl !== repair.previousAvatarUrl) {
      log.push({ action: 'identity_or_avatar_mismatch', repair, person });
      console.log(`mismatch: expected ${repair.person} ${repair.previousAvatarUrl}, got ${person.name} ${person.avatarUrl}`);
      continue;
    }

    const changed = person.avatarUrl !== repair.nextAvatarUrl;
    if (EXECUTE && changed) {
      await sql`
        UPDATE "People"
        SET "avatarUrl" = ${repair.nextAvatarUrl},
            "updatedAt" = NOW()
        WHERE id = ${person.id}
      `;
    }

    const action = changed
      ? (EXECUTE ? 'update_avatar_path' : 'would_update_avatar_path')
      : 'already_applied';
    log.push({
      action,
      person: person.name,
      personId: person.id,
      previousAvatarUrl: person.avatarUrl,
      nextAvatarUrl: repair.nextAvatarUrl,
    });
    console.log(`${action}: ${person.name}`);
  }

  const summary = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    avatars: payload.avatars.length,
    updated: log.filter(row => row.action === 'update_avatar_path').length,
    wouldUpdate: log.filter(row => row.action === 'would_update_avatar_path').length,
    alreadyApplied: log.filter(row => row.action === 'already_applied').length,
    missing: log.filter(row => row.action === 'missing_local_file' || row.action === 'missing_person').length,
    mismatched: log.filter(row => row.action === 'identity_or_avatar_mismatch').length,
  };

  fs.writeFileSync(path.join(process.cwd(), OUT), `${JSON.stringify({ summary, log }, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Log written: ${OUT}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
