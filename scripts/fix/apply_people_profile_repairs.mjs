/**
 * Apply precise People profile repairs.
 *
 * Default is dry-run. Use --execute to mutate only fields explicitly present in
 * each repair object. Every row must match personId and person name.
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const INPUT = getArg('--in') || 'docs/audit-2026-06/data/people_profile_repairs.json';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/people_profile_repairs_apply_log.json';
const EXECUTE = process.argv.includes('--execute');

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length);
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean).map(value => String(value).trim()).filter(Boolean))];
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function nextValue(repair, field, current) {
  if (Object.prototype.hasOwnProperty.call(repair, field)) return repair[field];
  return current;
}

function nextArray(repair, field, current) {
  if (!Object.prototype.hasOwnProperty.call(repair, field)) return current || [];
  return unique(repair[field] || []);
}

function nextJson(repair, field, current) {
  if (Object.prototype.hasOwnProperty.call(repair, field)) return repair[field] ?? null;
  return current ?? null;
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), INPUT), 'utf8'));
  const repairs = Array.isArray(payload.repairs) ? payload.repairs : [];
  const log = [];
  console.log(`People profile repair mode: ${EXECUTE ? 'execute' : 'dry-run'} | repairs=${repairs.length}`);

  for (const repair of repairs) {
    const rows = await sql`
      SELECT id, name, aliases, qid, description, "whyImportant", "avatarUrl", country,
             occupation, organization, "officialLinks", "sourceWhitelist", status,
             completeness, topics, "roleCategory", "influenceScore", "currentTitle",
             products, education
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
      log.push({ action: 'person_name_mismatch', repair, person: { id: person.id, name: person.name } });
      console.log(`person mismatch: expected ${repair.person}, got ${person.name}`);
      continue;
    }

    const next = {
      qid: nextValue(repair, 'qid', person.qid),
      aliases: nextArray(repair, 'aliases', person.aliases),
      description: nextValue(repair, 'description', person.description),
      whyImportant: nextValue(repair, 'whyImportant', person.whyImportant),
      avatarUrl: nextValue(repair, 'avatarUrl', person.avatarUrl),
      country: nextValue(repair, 'country', person.country),
      occupation: nextArray(repair, 'occupation', person.occupation),
      organization: nextArray(repair, 'organization', person.organization),
      officialLinks: nextJson(repair, 'officialLinks', person.officialLinks),
      sourceWhitelist: nextArray(repair, 'sourceWhitelist', person.sourceWhitelist),
      status: nextValue(repair, 'status', person.status),
      completeness: Number(nextValue(repair, 'completeness', person.completeness) ?? 0),
      topics: nextArray(repair, 'topics', person.topics),
      roleCategory: nextValue(repair, 'roleCategory', person.roleCategory),
      influenceScore: Number(nextValue(repair, 'influenceScore', person.influenceScore) ?? 0),
      currentTitle: nextValue(repair, 'currentTitle', person.currentTitle),
      products: nextJson(repair, 'products', person.products),
      education: nextJson(repair, 'education', person.education),
    };

    const changed = person.qid !== next.qid
      || !sameJson(person.aliases, next.aliases)
      || person.description !== next.description
      || person.whyImportant !== next.whyImportant
      || person.avatarUrl !== next.avatarUrl
      || person.country !== next.country
      || !sameJson(person.occupation, next.occupation)
      || !sameJson(person.organization, next.organization)
      || !sameJson(person.officialLinks, next.officialLinks)
      || !sameJson(person.sourceWhitelist, next.sourceWhitelist)
      || person.status !== next.status
      || Number(person.completeness || 0) !== next.completeness
      || !sameJson(person.topics, next.topics)
      || person.roleCategory !== next.roleCategory
      || Number(person.influenceScore || 0) !== next.influenceScore
      || person.currentTitle !== next.currentTitle
      || !sameJson(person.products, next.products)
      || !sameJson(person.education, next.education);

    if (EXECUTE && changed) {
      await sql`
        UPDATE "People"
        SET qid = ${next.qid},
            aliases = ${next.aliases},
            description = ${next.description},
            "whyImportant" = ${next.whyImportant},
            "avatarUrl" = ${next.avatarUrl},
            country = ${next.country},
            occupation = ${next.occupation},
            organization = ${next.organization},
            "officialLinks" = ${JSON.stringify(next.officialLinks)}::jsonb,
            "sourceWhitelist" = ${next.sourceWhitelist},
            status = ${next.status},
            completeness = ${next.completeness},
            topics = ${next.topics},
            "roleCategory" = ${next.roleCategory},
            "influenceScore" = ${next.influenceScore},
            "currentTitle" = ${next.currentTitle},
            products = ${JSON.stringify(next.products)}::jsonb,
            education = ${JSON.stringify(next.education)}::jsonb,
            "lastFetchedAt" = COALESCE("lastFetchedAt", '{}'::jsonb) || ${JSON.stringify({
              manual_profile_repair: new Date().toISOString(),
            })}::jsonb,
            "updatedAt" = NOW()
        WHERE id = ${person.id}
      `;
    }

    const action = changed ? (EXECUTE ? 'update_person_profile' : 'would_update_person_profile') : 'already_applied';
    log.push({
      action,
      person: person.name,
      personId: person.id,
      previousCurrentTitle: person.currentTitle,
      nextCurrentTitle: next.currentTitle,
      previousRoleCategory: person.roleCategory,
      nextRoleCategory: next.roleCategory,
      evidenceUrl: repair.evidenceUrl || null,
      evidenceNote: repair.evidenceNote || null,
    });
    console.log(`${action}: ${person.name}`);
  }

  const summary = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    repairs: repairs.length,
    updated: log.filter(row => row.action === 'update_person_profile').length,
    wouldUpdate: log.filter(row => row.action === 'would_update_person_profile').length,
    alreadyApplied: log.filter(row => row.action === 'already_applied').length,
    missing: log.filter(row => row.action === 'missing_person').length,
    mismatched: log.filter(row => row.action === 'person_name_mismatch').length,
  };

  fs.writeFileSync(path.join(process.cwd(), OUT), `${JSON.stringify({ summary, log }, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Log written: ${OUT}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
