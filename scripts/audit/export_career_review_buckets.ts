/**
 * Bucket career normalization leftovers into reviewable work packages.
 *
 * Read-only. Writes docs/audit-2026-06/data/career_review_buckets.json by default.
 */
import fs from 'fs';
import path from 'path';

type PositionLikeOrganization = {
  id: string;
  name: string;
  nameZh: string | null;
  type: string;
  wikidataQid: string | null;
  roleCount: number;
};

type VagueRole = {
  id: string;
  person: string;
  organization: string;
  role: string;
  roleZh: string | null;
  startDate: string | null;
  endDate: string | null;
};

type CurrentTitleMismatch = {
  person: string;
  currentTitle: string;
  titleOrganization: string;
  knownOrganizations: string[];
};

type CareerAudit = {
  generatedAt: string;
  summary: Record<string, number>;
  positionLikeOrganizations: PositionLikeOrganization[];
  vagueRoles: VagueRole[];
  currentTitleOrgMismatches: CurrentTitleMismatch[];
};

const args = process.argv.slice(2);
const INPUT = args.find(arg => arg.startsWith('--input='))?.slice('--input='.length)
  || 'docs/audit-2026-06/data/career_normalization_audit.json';
const OUT = args.find(arg => arg.startsWith('--out='))?.slice('--out='.length)
  || 'docs/audit-2026-06/data/career_review_buckets.json';

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\b(inc|inc\.|corp|corp\.|corporation|company|limited|ltd|llc|com)\b/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '');
}

const ORG_ALIASES: Record<string, string[]> = {
  amazon: ['amazoncom'],
  googledeepmind: ['deepmind'],
  massachusettsinstituteoftechnologymit: ['mit', '麻省理工学院'],
  metai: ['meta', 'facebookai'],
  google: ['谷歌', 'googleresearch', 'googlebrain', '谷歌大脑'],
  openai: ['openaiinc'],
  nvidia: ['英伟达'],
  universityofcaliforniaberkeley: ['ucberkeley', 'berkeley'],
};

function isAliasMatch(titleOrg: string, knownOrg: string): boolean {
  const title = normalize(titleOrg);
  const known = normalize(knownOrg);
  if (!title || !known) return false;
  if (title === known || title.includes(known) || known.includes(title)) return true;

  const knownAliases = ORG_ALIASES[known] || [];
  const titleAliases = ORG_ALIASES[title] || [];
  return knownAliases.includes(title) || titleAliases.includes(known);
}

function bucketPositionLike(org: PositionLikeOrganization): string {
  if (org.roleCount === 0) return 'safe_delete_empty_position_org';
  return 'position_org_with_role_refs_needs_reassignment';
}

function bucketVagueRole(role: VagueRole): string {
  const normalizedRole = normalize(role.role);
  if (normalizedRole === 'student' || normalizedRole === '学生') return 'education_generic_role';
  if (normalizedRole === 'employee' || normalizedRole === '员工') return 'employment_generic_role';
  return 'other_generic_role';
}

function bucketMismatch(mismatch: CurrentTitleMismatch): string {
  if (mismatch.knownOrganizations.some(org => isAliasMatch(mismatch.titleOrganization, org))) {
    return 'alias_noise_only';
  }
  if (mismatch.knownOrganizations.length === 0) return 'missing_known_org';
  return 'current_title_org_missing_from_people_orgs';
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = getKey(item);
    acc[key] ||= [];
    acc[key].push(item);
    return acc;
  }, {});
}

function summarizeGroups<T>(groups: Record<string, T[]>): Record<string, number> {
  return Object.fromEntries(Object.entries(groups).map(([key, items]) => [key, items.length]));
}

const audit = JSON.parse(fs.readFileSync(path.join(process.cwd(), INPUT), 'utf-8')) as CareerAudit;

const positionLike = groupBy(audit.positionLikeOrganizations || [], bucketPositionLike);
const vagueRoles = groupBy(audit.vagueRoles || [], bucketVagueRole);
const currentTitleMismatches = groupBy(audit.currentTitleOrgMismatches || [], bucketMismatch);

const payload = {
  generatedAt: new Date().toISOString(),
  sourceAuditGeneratedAt: audit.generatedAt,
  summary: {
    positionLike: summarizeGroups(positionLike),
    vagueRoles: summarizeGroups(vagueRoles),
    currentTitleMismatches: summarizeGroups(currentTitleMismatches),
  },
  guidance: {
    safe_delete_empty_position_org: 'Organization has no role refs; can be deleted after one final DB check.',
    position_org_with_role_refs_needs_reassignment: 'Position name is stored as Organization and has PersonRole refs; needs per-role reassignment before delete.',
    education_generic_role: 'Student/student/学生 should usually become an education entry or a more specific degree role, not a current employment signal.',
    employment_generic_role: 'Employee/employee should be upgraded only with source evidence; otherwise keep as low-confidence history.',
    alias_noise_only: 'Title org and known org look equivalent after alias normalization; add alias mapping rather than editing person data.',
    current_title_org_missing_from_people_orgs: 'Current title names an org missing from People.organization; needs source-backed add or title correction.',
  },
  positionLike,
  vagueRoles,
  currentTitleMismatches,
};

fs.mkdirSync(path.dirname(path.join(process.cwd(), OUT)), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), OUT), `${JSON.stringify(payload, null, 2)}\n`);

console.log(`Career review buckets written: ${OUT}`);
console.log(JSON.stringify(payload.summary, null, 2));
