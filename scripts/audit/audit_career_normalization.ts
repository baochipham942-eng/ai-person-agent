/**
 * Audit career normalization risks without mutating data.
 *
 * Usage:
 *   bun scripts/audit/audit_career_normalization.ts
 *   bun scripts/audit/audit_career_normalization.ts --out=docs/audit-2026-06/data/career_normalization_audit.json
 */
import 'dotenv/config';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { neon } from '@neondatabase/serverless';
import {
  isVagueCareerRole,
  normalizeCareerOrgName,
  normalizeCareerRole,
  type RawCareerData,
} from '../../lib/datasources/career';

type OrganizationRow = {
  id: string;
  name: string;
  nameZh: string | null;
  type: string;
  wikidataQid: string | null;
  roleCount: number;
};

type RoleRow = {
  id: string;
  personId: string;
  personName: string;
  role: string;
  roleZh: string | null;
  startDate: Date | null;
  endDate: Date | null;
  organization: OrganizationRow;
};

type PeopleRow = {
  id: string;
  name: string;
  status: string;
  organization: string[];
  currentTitle: string | null;
};

const args = process.argv.slice(2);
const outArg = args.find(arg => arg.startsWith('--out='));
const OUT = outArg?.slice('--out='.length) || 'docs/audit-2026-06/data/career_normalization_audit.json';

const POSITION_ORG_PATTERN = /^(chief executive officer|ceo|chief technology officer|cto|founder|co-founder|research scientist|computer scientist|entrepreneur|professor|researcher|engineer|student|employee|board member|board of directors member|director)$/i;

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function isoDate(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : '';
}

function normalizeKey(value: string): string {
  return normalizeCareerOrgName(value)
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

const CURRENT_TITLE_ORG_ALIASES: Record<string, string[]> = {
  amazon: ['amazoncom'],
  alphabet: ['alphabetinc'],
  apple: ['苹果', '苹果公司'],
  caltech: ['californiainstituteoftechnology', '加州理工学院'],
  cmu: ['carnegiemellonuniversity', '卡内基梅隆大学'],
  carnegimellonuniversity: ['cmu', '卡内基梅隆大学'],
  googledeepmind: ['deepmind'],
  mit: ['massachusettsinstituteoftechnologymit', '麻省理工学院', 'mitlaboratoryforinformationanddecisionsystems'],
  massachusettsinstituteoftechnologymit: ['mit', '麻省理工学院'],
  nyu: ['newyorkuniversity'],
  newyorkuniversity: ['nyu'],
  tsinghuauniversity: ['清华大学'],
  universityofcaliforniaberkeley: ['ucberkeley', 'berkeley'],
  anysphere: ['anyspherecursor'],
  xiaomi: ['小米'],
  zhipuai: ['智谱', '智谱ai'],
};

function areEquivalentOrgKeys(left: string, right: string): boolean {
  if (!left || !right) return false;
  if (left === right) return true;

  for (const [canonical, aliases] of Object.entries(CURRENT_TITLE_ORG_ALIASES)) {
    const group = new Set([canonical, ...aliases]);
    if (group.has(left) && group.has(right)) return true;
  }

  const leftAliases = CURRENT_TITLE_ORG_ALIASES[left] || [];
  const rightAliases = CURRENT_TITLE_ORG_ALIASES[right] || [];
  return leftAliases.includes(right) || rightAliases.includes(left);
}

function extractTitleOrgs(currentTitle: string | null): string[] {
  if (!currentTitle) return [];
  const matches = [...currentTitle.matchAll(/@\s*([^,;|/]+)/g)];
  return matches
    .map(match => match[1]?.trim())
    .filter((value): value is string => Boolean(value));
}

function organizationKeys(value: string): string[] {
  const candidates = [
    value,
    value.replace(/\(.*/, '').trim(),
    ...value.split(/[、,;|/]/g).map(part => part.trim()),
  ];
  return [...new Set(candidates.map(normalizeKey).filter(Boolean))];
}

function sample<T>(rows: T[], limit = 50): T[] {
  return rows.slice(0, limit);
}

async function main() {
  const [organizationRows, roleRows, peopleRows] = await Promise.all([
    sql`
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
    ` as Promise<OrganizationRow[]>,
    sql`
      SELECT
        r.id,
        r."personId",
        p.name AS "personName",
        r.role,
        r."roleZh",
        r."startDate",
        r."endDate",
        json_build_object(
          'id', o.id,
          'name', o.name,
          'nameZh', o."nameZh",
          'type', o.type,
          'wikidataQid', o."wikidataQid",
          'roleCount', oc."roleCount"
        ) AS organization
      FROM "PersonRole" r
      JOIN "People" p ON p.id = r."personId"
      JOIN "Organization" o ON o.id = r."organizationId"
      LEFT JOIN (
        SELECT "organizationId", COUNT(*)::int AS "roleCount"
        FROM "PersonRole"
        GROUP BY "organizationId"
      ) oc ON oc."organizationId" = o.id
      ORDER BY p.name ASC, r."startDate" DESC NULLS LAST
    ` as Promise<RoleRow[]>,
    sql`
      SELECT id, name, status, organization, "currentTitle"
      FROM "People"
      ORDER BY name ASC
    ` as Promise<PeopleRow[]>,
  ]);

  const orgsByNormalizedName = new Map<string, OrganizationRow[]>();
  for (const org of organizationRows) {
    const key = normalizeKey(org.name);
    orgsByNormalizedName.set(key, [...(orgsByNormalizedName.get(key) || []), org]);
  }

  const duplicateOrgClusters = [...orgsByNormalizedName.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([key, rows]) => ({
      key,
      count: rows.length,
      totalRoleCount: rows.reduce((sum, row) => sum + row.roleCount, 0),
      rows,
    }))
    .sort((a, b) => b.totalRoleCount - a.totalRoleCount || b.count - a.count);

  const positionLikeOrganizations = organizationRows
    .filter(org => POSITION_ORG_PATTERN.test(org.name.trim()))
    .sort((a, b) => b.roleCount - a.roleCount || a.name.localeCompare(b.name));

  const rolesByDuplicateKey = new Map<string, RoleRow[]>();
  for (const role of roleRows) {
    const type = role.organization.type === 'university' ? 'education' : 'career';
    const normalizedRole = normalizeCareerRole(role.role, type as RawCareerData['type']);
    const key = [
      role.personId,
      normalizeKey(role.organization.name),
      normalizedRole.toLowerCase(),
      isoDate(role.startDate),
    ].join('|');
    rolesByDuplicateKey.set(key, [...(rolesByDuplicateKey.get(key) || []), role]);
  }

  const duplicateRoleGroups = [...rolesByDuplicateKey.values()]
    .filter(rows => rows.length > 1)
    .map(rows => ({
      person: rows[0].personName,
      organization: rows[0].organization.nameZh || rows[0].organization.name,
      role: rows[0].role,
      startDate: isoDate(rows[0].startDate) || null,
      count: rows.length,
      ids: rows.map(row => row.id),
    }))
    .sort((a, b) => b.count - a.count || a.person.localeCompare(b.person));

  const vagueRoles = roleRows
    .filter(role => {
      const type = role.organization.type === 'university' ? 'education' : 'career';
      return isVagueCareerRole(role.role, type as RawCareerData['type']);
    })
    .map(role => ({
      id: role.id,
      person: role.personName,
      organization: role.organization.nameZh || role.organization.name,
      role: role.role,
      roleZh: role.roleZh,
      startDate: isoDate(role.startDate) || null,
      endDate: isoDate(role.endDate) || null,
    }));

  const peopleOrganizationDuplicates = peopleRows
    .map(person => {
      const seen = new Map<string, string[]>();
      for (const org of person.organization || []) {
        const key = normalizeKey(org);
        seen.set(key, [...(seen.get(key) || []), org]);
      }
      const duplicates = [...seen.values()].filter(values => values.length > 1);
      return { person: person.name, duplicates };
    })
    .filter(row => row.duplicates.length > 0);

  const rolesByPerson = new Map<string, RoleRow[]>();
  for (const role of roleRows) {
    rolesByPerson.set(role.personId, [...(rolesByPerson.get(role.personId) || []), role]);
  }

  const currentTitleOrgMismatches = peopleRows.flatMap(person => {
    const titleOrgs = extractTitleOrgs(person.currentTitle);
    if (titleOrgs.length === 0) return [];

    const knownOrgKeys = [
      ...(person.organization || []).flatMap(organizationKeys),
      ...(rolesByPerson.get(person.id) || []).flatMap(role => [
        ...organizationKeys(role.organization.name),
        ...(role.organization.nameZh ? organizationKeys(role.organization.nameZh) : []),
      ]),
    ];

    return titleOrgs
      .filter(org => {
        const titleOrgKeys = organizationKeys(org);
        return !titleOrgKeys.some(titleOrgKey =>
          knownOrgKeys.some(knownOrgKey => areEquivalentOrgKeys(titleOrgKey, knownOrgKey)),
        );
      })
      .map(org => ({
        person: person.name,
        currentTitle: person.currentTitle,
        titleOrganization: org,
        knownOrganizations: person.organization,
      }));
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    summary: {
      organizations: organizationRows.length,
      roles: roleRows.length,
      people: peopleRows.length,
      duplicateOrgClusters: duplicateOrgClusters.length,
      positionLikeOrganizations: positionLikeOrganizations.length,
      duplicateRoleGroups: duplicateRoleGroups.length,
      vagueRoles: vagueRoles.length,
      peopleOrganizationDuplicates: peopleOrganizationDuplicates.length,
      currentTitleOrgMismatches: currentTitleOrgMismatches.length,
    },
    duplicateOrgClusters: sample(duplicateOrgClusters, 30),
    positionLikeOrganizations: sample(positionLikeOrganizations, 50),
    duplicateRoleGroups: sample(duplicateRoleGroups, 50),
    vagueRoles: sample(vagueRoles, 80),
    peopleOrganizationDuplicates: sample(peopleOrganizationDuplicates, 50),
    currentTitleOrgMismatches: sample(currentTitleOrgMismatches, 80),
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(payload, null, 2));

  console.log(`Career normalization audit written: ${OUT}`);
  console.log(JSON.stringify(payload.summary, null, 2));
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
