/**
 * Reclassify colleague relations that only have historical role overlap.
 *
 * Default is dry-run. Use --execute to update PersonRelation.relationType.
 *
 * Usage:
 *   node scripts/fix/apply_former_colleague_relations.mjs
 *   node scripts/fix/apply_former_colleague_relations.mjs --person="Dario Amodei"
 *   node scripts/fix/apply_former_colleague_relations.mjs --execute
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const EXECUTE = process.argv.includes('--execute');
const PERSON_FILTER = getArg('--person');
const OUT = getArg('--out');

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const relations = await loadColleagueRelations();
  const rolesByPerson = groupByPerson(await loadRoles());
  const decisions = relations.map((relation) => classifyRelation(relation, rolesByPerson));
  const candidates = decisions.filter((decision) => decision.action === 'reclassify_to_former_colleague');
  const keepCurrent = decisions.filter((decision) => decision.action === 'keep_current_colleague');
  const noOverlap = decisions.filter((decision) => decision.action === 'skip_no_role_overlap');
  const conflicts = [];
  let updated = 0;

  console.log(`Former-colleague cleaning mode: ${EXECUTE ? 'execute' : 'dry-run'}`);
  if (PERSON_FILTER) console.log(`Person filter: ${PERSON_FILTER}`);
  console.log(`relations=${relations.length} candidates=${candidates.length} keepCurrent=${keepCurrent.length} noRoleOverlap=${noOverlap.length}`);

  for (const candidate of candidates) {
    console.log(`${EXECUTE ? 'update' : 'would update'} ${candidate.person} -> ${candidate.related}: ${candidate.reason}`);

    if (!EXECUTE) continue;

    const existing = await sql`
      SELECT id
      FROM "PersonRelation"
      WHERE "relationType" = 'former_colleague'
        AND (
          ("personId" = ${candidate.personId} AND "relatedPersonId" = ${candidate.relatedPersonId})
          OR ("personId" = ${candidate.relatedPersonId} AND "relatedPersonId" = ${candidate.personId})
        )
      LIMIT 1
    `;

    if (existing.length > 0) {
      conflicts.push({
        relationId: candidate.id,
        existingFormerColleagueRelationId: existing[0].id,
        person: candidate.person,
        related: candidate.related,
      });
      console.log(`skip conflict ${candidate.person} -> ${candidate.related}: existing former_colleague relation ${existing[0].id}`);
      continue;
    }

    await sql`
      UPDATE "PersonRelation"
      SET
        "relationType" = 'former_colleague',
        "evidenceNote" = ${candidate.reason}
      WHERE id = ${candidate.id}
    `;
    updated += 1;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    mode: EXECUTE ? 'execute' : 'dry-run',
    personFilter: PERSON_FILTER || null,
    summary: {
      relations: relations.length,
      candidates: candidates.length,
      keepCurrent: keepCurrent.length,
      noRoleOverlap: noOverlap.length,
      updated,
      conflicts: conflicts.length,
    },
    candidates,
    keepCurrent,
    noOverlap,
    conflicts,
  };

  if (OUT) {
    const outPath = path.resolve(process.cwd(), OUT);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`Log written: ${outPath}`);
  }

  console.log(JSON.stringify(payload.summary, null, 2));
}

async function loadColleagueRelations() {
  if (PERSON_FILTER) {
    return sql`
      SELECT
        r.id,
        r."personId",
        r."relatedPersonId",
        p.name AS person,
        rp.name AS related,
        p."currentTitle" AS "personCurrentTitle",
        rp."currentTitle" AS "relatedCurrentTitle",
        r.description,
        r.source,
        r.confidence,
        r."reviewStatus",
        r."evidenceNote"
      FROM "PersonRelation" r
      JOIN "People" p ON p.id = r."personId"
      JOIN "People" rp ON rp.id = r."relatedPersonId"
      WHERE r."relationType" = 'colleague'
        AND (p.name = ${PERSON_FILTER} OR rp.name = ${PERSON_FILTER})
      ORDER BY p.name, rp.name
    `;
  }

  return sql`
    SELECT
      r.id,
      r."personId",
      r."relatedPersonId",
      p.name AS person,
      rp.name AS related,
      p."currentTitle" AS "personCurrentTitle",
      rp."currentTitle" AS "relatedCurrentTitle",
      r.description,
      r.source,
      r.confidence,
      r."reviewStatus",
      r."evidenceNote"
    FROM "PersonRelation" r
    JOIN "People" p ON p.id = r."personId"
    JOIN "People" rp ON rp.id = r."relatedPersonId"
    WHERE r."relationType" = 'colleague'
    ORDER BY p.name, rp.name
  `;
}

async function loadRoles() {
  return sql`
    WITH relation_people AS (
      SELECT "personId" AS id FROM "PersonRelation" WHERE "relationType" = 'colleague'
      UNION
      SELECT "relatedPersonId" AS id FROM "PersonRelation" WHERE "relationType" = 'colleague'
    )
    SELECT
      pr.id,
      pr."personId",
      pr."organizationId",
      pr.role,
      pr."startDate",
      pr."endDate",
      o.name AS "organizationName",
      o."nameZh" AS "organizationNameZh"
    FROM "PersonRole" pr
    JOIN "Organization" o ON o.id = pr."organizationId"
    JOIN relation_people rp ON rp.id = pr."personId"
  `;
}

function groupByPerson(roles) {
  const grouped = new Map();
  for (const role of roles) {
    const personRoles = grouped.get(role.personId) || [];
    personRoles.push(role);
    grouped.set(role.personId, personRoles);
  }
  return grouped;
}

function classifyRelation(relation, rolesByPerson) {
  const personRoles = rolesByPerson.get(relation.personId) || [];
  const relatedRoles = rolesByPerson.get(relation.relatedPersonId) || [];
  const sharedPairs = sharedRolePairs(personRoles, relatedRoles);
  const overlappingPairs = sharedPairs.filter(({ personRole, relatedRole }) => rolesOverlap(personRole, relatedRole));
  const currentSharedOrgs = currentSharedOrganizations(relation, sharedPairs);
  const historicalOverlapOrgs = uniqueOrganizationNames(overlappingPairs);

  const base = {
    id: relation.id,
    personId: relation.personId,
    relatedPersonId: relation.relatedPersonId,
    person: relation.person,
    related: relation.related,
    currentTitles: {
      person: relation.personCurrentTitle,
      related: relation.relatedCurrentTitle,
    },
    sharedHistoricalOrgs: historicalOverlapOrgs,
    sharedCurrentOrgs: currentSharedOrgs,
    description: relation.description,
    source: relation.source,
    confidence: relation.confidence,
    reviewStatus: relation.reviewStatus,
    evidenceNote: relation.evidenceNote,
  };

  if (currentSharedOrgs.length > 0) {
    return {
      ...base,
      action: 'keep_current_colleague',
      reason: `current shared organization: ${currentSharedOrgs.join(', ')}`,
    };
  }

  if (overlappingPairs.length > 0) {
    return {
      ...base,
      action: 'reclassify_to_former_colleague',
      reason: `former colleague inferred from historical overlap at ${historicalOverlapOrgs.join(', ')}`,
    };
  }

  return {
    ...base,
    action: 'skip_no_role_overlap',
    reason: 'no overlapping PersonRole dates found',
  };
}

function sharedRolePairs(personRoles, relatedRoles) {
  const pairs = [];
  for (const personRole of personRoles) {
    for (const relatedRole of relatedRoles) {
      if (personRole.organizationId !== relatedRole.organizationId) continue;
      pairs.push({ personRole, relatedRole });
    }
  }
  return pairs;
}

function rolesOverlap(left, right) {
  if (!left.startDate || !right.startDate) return false;

  const leftStart = Date.parse(left.startDate);
  const rightStart = Date.parse(right.startDate);
  const leftEnd = left.endDate ? Date.parse(left.endDate) : Date.now();
  const rightEnd = right.endDate ? Date.parse(right.endDate) : Date.now();

  if ([leftStart, rightStart, leftEnd, rightEnd].some((value) => Number.isNaN(value))) return false;
  return leftStart <= rightEnd && rightStart <= leftEnd;
}

function currentSharedOrganizations(relation, sharedPairs) {
  const titleOrgPerson = organizationFromTitle(relation.personCurrentTitle);
  const titleOrgRelated = organizationFromTitle(relation.relatedCurrentTitle);
  const currentOrgs = [];

  if (orgMatches(titleOrgPerson, titleOrgRelated)) {
    currentOrgs.push(titleOrgPerson.trim());
  }

  for (const { personRole, relatedRole } of sharedPairs) {
    if (personRole.endDate || relatedRole.endDate) continue;
    if (!roleMatchesCurrentTitle(personRole, titleOrgPerson)) continue;
    if (!roleMatchesCurrentTitle(relatedRole, titleOrgRelated)) continue;
    currentOrgs.push(displayOrg(personRole));
  }

  return [...new Set(currentOrgs.filter(Boolean))];
}

function roleMatchesCurrentTitle(role, currentTitleOrg) {
  if (!currentTitleOrg) return true;
  return orgMatches(currentTitleOrg, role.organizationName) || orgMatches(currentTitleOrg, role.organizationNameZh);
}

function uniqueOrganizationNames(pairs) {
  return [...new Set(pairs.map(({ personRole }) => displayOrg(personRole)).filter(Boolean))];
}

function displayOrg(role) {
  return role.organizationNameZh || role.organizationName;
}

function organizationFromTitle(title) {
  if (!title) return null;
  const match = title.match(/@\s*([^,/|;]+)/);
  return match?.[1]?.trim() || null;
}

function orgMatches(left, right) {
  const normalizedLeft = normalizeOrg(left);
  const normalizedRight = normalizeOrg(right);
  if (!normalizedLeft || !normalizedRight) return false;
  return normalizedLeft === normalizedRight
    || normalizedLeft.includes(normalizedRight)
    || normalizedRight.includes(normalizedLeft);
}

function normalizeOrg(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\b(company|incorporated|inc|llc|ltd|limited|corp|corporation|co)\b/g, '')
    .replace(/[公司集团股份有限责任]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
