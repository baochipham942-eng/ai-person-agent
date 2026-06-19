import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

const DEFAULT_INPUT = 'docs/audit-2026-06/data/aihot_daily_p0_p1_audit.json';
const DEFAULT_JSON_OUTPUT = 'docs/audit-2026-06/data/aihot_candidate_review_worklist.json';
const DEFAULT_MD_OUTPUT = 'docs/audit-2026-06/AIHOT_CANDIDATE_REVIEW_WORKLIST.md';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const inputPath = argValue('--input') || DEFAULT_INPUT;
const outputJsonPath = argValue('--output-json') || DEFAULT_JSON_OUTPUT;
const outputMdPath = argValue('--output-md') || DEFAULT_MD_OUTPUT;

const MEDIA_SOURCE_KEYS = new Set([
  'techcrunch.com',
  'theverge.com',
  'bloomberg.com',
  'ithome.com',
  'simonwillison.net',
  'garymarcus.substack.com',
  'tomtunguz.com',
  'the-decoder.com',
  'marktechpost.com',
]);

const WEAK_PERSON_SOURCE_KINDS = new Set(['x', 'twitter', 'linkedin', 'rss', 'web']);
const ALLOWED_PERSON_SOURCE_KEYS = new Set([
  'anthropic.com',
  'claude.com',
  'openai.com',
  'deepmind.google',
  'googleblog.com',
  'github.com',
]);

const ALIAS_POLICIES = [
  {
    id: 'alias-kimi-moonshot',
    aliases: ['Kimi', 'kimi_moonshot', 'Moonshot AI', '月之暗面 Kimi'],
    canonicalSearch: ['月之暗面', 'Moonshot AI', '月之暗面（Moonshot AI）'],
    mergeRule: 'Treat Kimi as a product/account alias of Moonshot AI. Do not create a separate Organization row from AI HOT mentions alone.',
  },
  {
    id: 'alias-qwen-alibaba',
    aliases: ['Qwen', 'qwen.ai', '通义', '通义千问', '阿里通义千问', 'Alibaba Cloud', '阿里云'],
    canonicalSearch: ['Alibaba DAMO Academy', 'Alibaba', '阿里'],
    mergeRule: 'Bind Qwen and qwen.ai events to the Alibaba canonical organization for company-source work. Keep Qwen as product/source vocabulary.',
  },
  {
    id: 'alias-deepseek-hangzhou-deepseek',
    aliases: ['DeepSeek', '深度求索', '杭州深度求索', 'deepseek.com'],
    canonicalSearch: ['杭州深度求索人工智能基础技术研究有限公司（深度求索 / DeepSeek）', 'DeepSeek', '深度求索'],
    mergeRule: 'Map DeepSeek shorthand to the existing Chinese legal/canonical Organization row. Do not create duplicate DeepSeek rows.',
  },
];

function argValue(name) {
  const prefix = `${name}=`;
  return args.find(arg => arg.startsWith(prefix))?.slice(prefix.length);
}

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function unique(values) {
  return [...new Set(values.filter(value => typeof value === 'string').map(value => value.trim()).filter(Boolean))];
}

function normalizeLoose(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    if (parsed.pathname !== '/') parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    parsed.searchParams.sort();
    return parsed.toString();
  } catch {
    return String(url || '').trim();
  }
}

function sourceDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function firstExample(row) {
  return row?.examples?.[0] || null;
}

function evidenceFromExample(example) {
  if (!example) return null;
  return {
    url: example.sourceUrl || '',
    normalizedUrl: normalizeUrl(example.sourceUrl || ''),
    title: example.title || '',
    date: example.date || '',
    category: example.section || '',
    sourceName: example.sourceName || '',
    sourceKind: example.sourceKind || '',
    sourceKey: example.sourceKey || '',
    eventId: example.eventId || '',
    duplicateGroupSize: example.duplicateGroupSize || 1,
    duplicateUrls: example.duplicateUrls || [],
    duplicateSources: example.duplicateSources || [],
    libraryDuplicateStatus: example.libraryDuplicateStatus || '',
    libraryMatches: example.libraryMatches || [],
  };
}

function compactDbEntity(row) {
  if (!row) return null;
  return {
    id: row.id || null,
    name: row.name || row.label || '',
    nameZh: row.nameZh || null,
    type: row.type || null,
    status: row.status || null,
    currentTitle: row.currentTitle || null,
    roleCategory: row.roleCategory || null,
    organization: row.organization || undefined,
    matchKind: row.matchKind || undefined,
    matchedAlias: row.matchedAlias || undefined,
  };
}

async function loadDbSnapshot(sql) {
  const [organizations, people, rawPool, activityEvents, cards, qaRows, relations] = await Promise.all([
    sql`SELECT id, name, "nameZh", type FROM "Organization" ORDER BY name ASC`,
    sql`SELECT id, name, aliases, organization, status, "currentTitle", "roleCategory" FROM "People" ORDER BY name ASC`,
    sql`SELECT url, title FROM "RawPoolItem" WHERE url IS NOT NULL AND url <> ''`,
    sql`SELECT url, title FROM "ActivityEvent" WHERE url IS NOT NULL AND url <> ''`,
    sql`SELECT "sourceUrl", title FROM "Card" WHERE "sourceUrl" IS NOT NULL AND "sourceUrl" <> ''`,
    sql`SELECT url FROM "QAAuditLog" WHERE url IS NOT NULL AND url <> ''`,
    sql`SELECT "evidenceUrl" FROM "PersonRelation" WHERE "evidenceUrl" IS NOT NULL AND "evidenceUrl" <> ''`,
  ]);

  const orgAliases = [];
  for (const org of organizations) {
    for (const alias of unique([org.name, org.nameZh])) {
      orgAliases.push({ ...org, matchKind: 'Organization', matchedAlias: alias });
    }
  }
  for (const person of people) {
    for (const alias of unique(person.organization || [])) {
      orgAliases.push({
        id: null,
        name: alias,
        nameZh: null,
        type: null,
        matchKind: 'People.organization',
        matchedAlias: alias,
      });
    }
  }

  const peopleAliases = [];
  for (const person of people) {
    for (const alias of unique([person.name, ...(person.aliases || [])])) {
      peopleAliases.push({ ...person, matchKind: 'People', matchedAlias: alias });
    }
  }

  const urlCoverage = new Map();
  const addUrl = (url, tableName, title = '') => {
    const key = normalizeUrl(url);
    if (!key) return;
    if (!urlCoverage.has(key)) urlCoverage.set(key, []);
    urlCoverage.get(key).push({ tableName, url, title });
  };
  for (const row of rawPool) addUrl(row.url, 'RawPoolItem', row.title);
  for (const row of activityEvents) addUrl(row.url, 'ActivityEvent', row.title);
  for (const row of cards) addUrl(row.sourceUrl, 'Card', row.title);
  for (const row of qaRows) addUrl(row.url, 'QAAuditLog', '');
  for (const row of relations) addUrl(row.evidenceUrl, 'PersonRelation', '');

  return {
    counts: {
      organizations: organizations.length,
      people: people.length,
      coveredUrls: urlCoverage.size,
    },
    organizations,
    people,
    orgAliases,
    peopleAliases,
    urlCoverage,
  };
}

function findOrgMatches(db, terms, limit = 5) {
  const normalizedTerms = unique(terms).map(normalizeLoose).filter(Boolean);
  const matches = [];
  const seen = new Set();
  for (const alias of db.orgAliases) {
    const aliasKey = normalizeLoose(alias.matchedAlias);
    const hit = normalizedTerms.find(term => term === aliasKey || (term.length >= 4 && aliasKey.includes(term)) || (aliasKey.length >= 4 && term.includes(aliasKey)));
    if (!hit) continue;
    const key = `${alias.matchKind}:${alias.id || alias.name}:${alias.matchedAlias}`;
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push(compactDbEntity(alias));
    if (matches.length >= limit) break;
  }
  return matches;
}

function findPeopleMatches(db, terms, limit = 5) {
  const normalizedTerms = unique(terms).map(normalizeLoose).filter(Boolean);
  const matches = [];
  const seen = new Set();
  for (const alias of db.peopleAliases) {
    const aliasKey = normalizeLoose(alias.matchedAlias);
    const hit = normalizedTerms.find(term => term === aliasKey || (term.length >= 5 && aliasKey.includes(term)) || (aliasKey.length >= 5 && term.includes(aliasKey)));
    if (!hit) continue;
    if (seen.has(alias.id)) continue;
    seen.add(alias.id);
    matches.push(compactDbEntity(alias));
    if (matches.length >= limit) break;
  }
  return matches;
}

function exactOrganizationMatch(db, name) {
  const key = normalizeLoose(name);
  return db.organizations.find(org => normalizeLoose(org.name) === key || normalizeLoose(org.nameZh) === key) || null;
}

function findCanonicalOrganization(db, policy) {
  return findOrgMatches(db, policy.canonicalSearch, 8).find(match => match.id) || null;
}

function itemText(item) {
  return [
    item.title,
    item.sourceName,
    item.sourceUrl,
    ...(item.candidateTerms || []),
    ...(item.organizationMatches || []).map(match => `${match.label} ${match.alias || ''}`),
    item.ownerCompany?.label,
  ].filter(Boolean).join(' ');
}

function auditHasAliasEvidence(audit, policy) {
  const terms = policy.aliases.map(normalizeLoose);
  const companyCandidates = audit.companyAbsorptionCandidates || [];
  const directCompanyHit = companyCandidates.find(company => {
    const haystack = normalizeLoose([company.company, ...(company.sourceKeys || [])].join(' '));
    return terms.some(term => haystack.includes(term));
  });
  const companyHit = directCompanyHit || companyCandidates.find(company => {
    const haystack = normalizeLoose((company.examples || []).map(itemText).join(' '));
    return terms.some(term => haystack.includes(term));
  });
  const itemHits = (audit.dailyItems || []).filter(item => {
    const haystack = normalizeLoose(itemText(item));
    return terms.some(term => haystack.includes(term));
  });
  return {
    companyHit,
    itemHits: itemHits.slice(0, 5),
  };
}

function buildAliasMergeQueue(audit, db) {
  return ALIAS_POLICIES.flatMap(policy => {
    const evidence = auditHasAliasEvidence(audit, policy);
    if (!evidence.companyHit && evidence.itemHits.length === 0) return [];
    const canonical = findCanonicalOrganization(db, policy);
    const example = firstExample(evidence.companyHit) || evidence.itemHits[0] || null;
    const aliasMatches = findOrgMatches(db, policy.aliases, 8);
    return [{
      id: policy.id,
      bucket: 'alias_merge',
      reviewStatus: 'review_pending',
      importableSeed: false,
      canonicalName: canonical?.nameZh || canonical?.name || policy.canonicalSearch[0],
      aliases: policy.aliases,
      evidence: evidenceFromExample(example),
      aiHot: {
        company: evidence.companyHit?.company || null,
        score: evidence.companyHit?.score || null,
        eventCount: evidence.companyHit?.eventCount || evidence.itemHits.length,
        categories: evidence.companyHit?.sections || unique(evidence.itemHits.map(item => item.section)),
        sources: evidence.companyHit?.sourceKeys || unique(evidence.itemHits.map(item => item.sourceKey)),
      },
      dbMatches: {
        matchedCanonicalOrganization: canonical,
        aliasMatches,
        exactUrlMatches: db.urlCoverage.get(normalizeUrl(example?.sourceUrl || '')) || [],
      },
      duplicateOrAliasDecision: canonical?.id ? 'alias_merge_existing_organization' : 'alias_merge_needs_canonical_confirmation',
      filterReason: policy.mergeRule,
      recommendedAction: canonical?.id
        ? 'Use canonical Organization for source/materialization; keep alias as matching vocabulary.'
        : 'Confirm canonical Organization before any source/materialization work.',
    }];
  });
}

function buildNewOrganizationQueue(audit, db, aliasQueue) {
  const aliasNames = new Set(aliasQueue.flatMap(item => [item.canonicalName, ...item.aliases].map(normalizeLoose)));
  return (audit.companyAbsorptionCandidates || [])
    .filter(company => company.action === '新增 Organization 候选')
    .filter(company => !aliasNames.has(normalizeLoose(company.company)))
    .map(company => {
      const example = firstExample(company);
      const exactMatch = exactOrganizationMatch(db, company.company);
      const orgMatches = findOrgMatches(db, [
        company.company,
        ...(company.examples || []).flatMap(item => item.candidateTerms || []),
      ], 8);
      const exactUrlMatches = db.urlCoverage.get(normalizeUrl(example?.sourceUrl || '')) || [];
      return {
        id: `org-${slug(company.company)}`,
        bucket: 'new_organization',
        reviewStatus: 'review_pending',
        importableSeed: false,
        name: company.company,
        canonicalName: company.company,
        organizationType: 'company',
        evidence: evidenceFromExample(example),
        aiHot: {
          score: company.score,
          eventCount: company.eventCount,
          freshEventCount: company.freshEventCount,
          duplicateRiskEventCount: company.duplicateRiskEventCount,
          sourceOwnerEventCount: company.sourceOwnerEventCount,
          categories: company.sections,
          sources: company.sourceKeys,
          roles: company.roles,
        },
        dbMatches: {
          exactOrganizationMatch: compactDbEntity(exactMatch),
          organizationAliasMatches: orgMatches,
          exactUrlMatches,
        },
        duplicateOrAliasDecision: exactMatch
          ? 'duplicate_existing_organization'
          : exactUrlMatches.length > 0
            ? 'possible_duplicate_existing_content'
            : 'fresh_new_organization_candidate',
        filterReason: company.reason,
        recommendedAction: exactMatch
          ? 'Do not create; review as existing Organization source backfill.'
          : 'Prepare CompanySource seed, run company preflight, then create Organization only in confirmed dev/staging with --create-organization.',
      };
    });
}

function sourceStrength(example) {
  if (!example) return { strong: false, reason: 'missing_evidence' };
  const key = example.sourceKey || sourceDomain(example.sourceUrl);
  if (example.sourceKind === 'x' || /^x:/.test(key)) return { strong: false, reason: 'x_only' };
  if (MEDIA_SOURCE_KEYS.has(key)) return { strong: false, reason: 'media_or_commentary_source' };
  if (ALLOWED_PERSON_SOURCE_KEYS.has(key) || example.sourceKind === 'official' || example.sourceKind === 'github' || example.sourceKind === 'paper') {
    return { strong: true, reason: 'non_social_source_owned_or_primary' };
  }
  if (WEAK_PERSON_SOURCE_KINDS.has(example.sourceKind)) return { strong: false, reason: `weak_source_kind_${example.sourceKind}` };
  return { strong: false, reason: 'unclassified_source_needs_review' };
}

function inferRoleCategory(person, example) {
  const text = `${person.name} ${example?.title || ''} ${(person.ownerCompanies || []).join(' ')}`.toLowerCase();
  if (/policy|white house|白宫|政策/.test(text)) return 'policy';
  if (/ceo|founder|co-founder|创始人/.test(text)) return 'founder';
  if (/research|scientist|研究|科学/.test(text)) return 'researcher';
  if (/sales|revenue|customer|客户|销售|销售负责人/.test(text)) return 'operator';
  if (/engineer|creator|developer|工程|作者/.test(text)) return 'engineer';
  return '';
}

function inferOrganization(person, example) {
  const owners = (person.ownerCompanies || []).map(value => value.split(':')[0]).filter(Boolean);
  const title = example?.title || '';
  const sourceKey = example?.sourceKey || '';
  const orgs = [];
  if (/anthropic|claude\.com/.test(`${title} ${sourceKey}`.toLowerCase())) orgs.push('Anthropic');
  if (/openai/.test(`${title} ${sourceKey}`.toLowerCase())) orgs.push('OpenAI');
  if (/skydio/i.test(title)) orgs.push('Skydio');
  if (/redis/i.test(title)) orgs.push('Redis');
  if (/ai2|allen institute/i.test(title)) orgs.push('Ai2');
  return unique([...orgs, ...owners]).slice(0, 3);
}

function inferCurrentTitle(person, example, organization) {
  const title = example?.title || '';
  const org = organization[0] || '';
  if (/sales leader|销售负责人/i.test(title)) return org ? `Sales leader @ ${org}` : 'Sales leader';
  const ceoMatch = title.match(/([A-Z][A-Za-z0-9.-]+)\s+CEO\s+([A-Z][A-Za-z .'-]+)/);
  if (ceoMatch) return `CEO @ ${ceoMatch[1]}`;
  if (/ceo/i.test(title) && org) return `CEO @ ${org}`;
  if (/policy|白宫|政策/i.test(title) && org) return `Policy role @ ${org}`;
  if (/creator|作者/i.test(title) && org) return `Creator / engineer @ ${org}`;
  return '';
}

function personQueueItem(person, bucket, example, db, blockers = []) {
  const organization = inferOrganization(person, example);
  const roleCategory = inferRoleCategory(person, example);
  const currentTitle = inferCurrentTitle(person, example, organization);
  const source = sourceStrength(example);
  const peopleMatches = findPeopleMatches(db, [person.name], 5);
  const orgMatches = findOrgMatches(db, organization, 5);
  const exactUrlMatches = db.urlCoverage.get(normalizeUrl(example?.sourceUrl || '')) || [];
  const missingRequired = [];
  for (const [field, value] of [
    ['roleCategory', roleCategory],
    ['organization', organization],
    ['currentTitle', currentTitle],
  ]) {
    if (Array.isArray(value) ? value.length === 0 : !value) missingRequired.push(field);
  }
  const finalBlockers = unique([
    ...blockers,
    ...(source.strong ? [] : [source.reason]),
    ...missingRequired.map(field => `missing_${field}`),
    ...(peopleMatches.length > 0 ? ['possible_existing_person_duplicate'] : []),
    ...(exactUrlMatches.length > 0 ? ['evidence_url_already_covered'] : []),
  ]);
  const canBeCandidate = bucket === 'new_person_candidate' && finalBlockers.length === 0;

  return {
    id: `person-${slug(person.name)}`,
    bucket: canBeCandidate ? 'new_person_candidate' : 'person_deferred',
    reviewStatus: canBeCandidate ? 'review_pending' : 'blocked_needs_strong_source_or_required_fields',
    importableSeed: false,
    name: person.name,
    roleCategory,
    organization,
    currentTitle,
    evidence: evidenceFromExample(example),
    strongSource: source.strong ? {
      kind: example.sourceKind,
      url: example.sourceUrl,
      title: example.title,
      sourceStrength: 'strong',
      sourceReason: source.reason,
    } : null,
    aiHot: {
      score: person.score,
      action: person.action,
      eventCount: person.eventCount,
      freshEventCount: person.freshEventCount,
      strongSourceEventCount: person.strongSourceEventCount,
      roleContextEventCount: person.roleContextEventCount,
      categories: person.sections,
      sources: person.sourceKinds,
      ownerCompanies: person.ownerCompanies,
    },
    dbMatches: {
      peopleMatches,
      organizationMatches: orgMatches,
      exactUrlMatches,
    },
    duplicateOrAliasDecision: peopleMatches.length > 0
      ? 'possible_existing_person_duplicate'
      : exactUrlMatches.length > 0
        ? 'possible_duplicate_existing_content'
        : canBeCandidate
          ? 'fresh_person_candidate_for_review'
          : 'deferred_not_importable',
    blockers: finalBlockers,
    filterReason: canBeCandidate
      ? 'Meets generated person review fields with a non-social/non-media source; still not importable until enrichment is built.'
      : `Blocked by ${finalBlockers.join(', ')}. Audit reason: ${person.reason || 'Does not meet generated person intake gate.'}`,
    recommendedAction: canBeCandidate
      ? 'Build roster_seeds and roster_enrichment only after second source/title review; keep status candidate.'
      : 'Do not convert to roster seed; find official/company/personal source and exact role context first.',
  };
}

function buildPeopleQueues(audit, db) {
  const candidateRows = [];
  const deferredRows = [];
  const seen = new Set();
  for (const person of audit.peopleCandidateIntake || []) {
    if (seen.has(normalizeLoose(person.name))) continue;
    seen.add(normalizeLoose(person.name));
    const item = personQueueItem(person, 'new_person_candidate', firstExample(person), db);
    (item.bucket === 'new_person_candidate' ? candidateRows : deferredRows).push(item);
  }
  for (const person of audit.peopleDeferredCandidates || []) {
    if (seen.has(normalizeLoose(person.name))) continue;
    seen.add(normalizeLoose(person.name));
    deferredRows.push(personQueueItem(person, 'person_deferred', firstExample(person), db, ['audit_deferred']));
  }
  return {
    newPersonCandidates: candidateRows,
    personDeferred: deferredRows,
  };
}

function slug(value) {
  const ascii = normalizeLoose(value)
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  if (ascii) return ascii;
  return `u-${crypto.createHash('sha1').update(String(value || '')).digest('hex').slice(0, 10)}`;
}

function buildSummary(queues) {
  return {
    counts: Object.fromEntries(Object.entries(queues).map(([key, rows]) => [key, rows.length])),
    notImportableCount: Object.values(queues).flat().filter(row => row.importableSeed === false).length,
    deferredPeopleNames: queues.person_deferred.map(row => row.name),
  };
}

function renderMarkdown(payload) {
  const lines = [];
  lines.push('# AI HOT Candidate Review Worklist');
  lines.push('');
  lines.push(`Generated: ${payload._meta.generatedAt}`);
  lines.push(`Input audit: \`${payload._meta.inputAuditJson}\``);
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  lines.push(markdownTable(
    ['Queue', 'Count'],
    Object.entries(payload.summary.counts).map(([queue, count]) => [queue, count]),
  ));
  lines.push('');
  lines.push('## New Organization');
  lines.push('');
  lines.push(markdownTable(
    ['Name', 'Events', 'Decision', 'Action', 'Evidence'],
    payload.queues.new_organization.map(row => [
      row.name,
      row.aiHot.eventCount,
      row.duplicateOrAliasDecision,
      row.recommendedAction,
      link(row.evidence?.title, row.evidence?.url),
    ]),
  ));
  lines.push('');
  lines.push('## Alias Merge');
  lines.push('');
  lines.push(markdownTable(
    ['Canonical', 'Aliases', 'Decision', 'Action', 'Evidence'],
    payload.queues.alias_merge.map(row => [
      row.canonicalName,
      row.aliases.join(', '),
      row.duplicateOrAliasDecision,
      row.recommendedAction,
      link(row.evidence?.title, row.evidence?.url),
    ]),
  ));
  lines.push('');
  lines.push('## New Person Candidate');
  lines.push('');
  lines.push(markdownTable(
    ['Name', 'Role', 'Organization', 'Title', 'Action', 'Evidence'],
    payload.queues.new_person_candidate.map(row => [
      row.name,
      row.roleCategory,
      row.organization.join(', '),
      row.currentTitle,
      row.recommendedAction,
      link(row.evidence?.title, row.evidence?.url),
    ]),
  ));
  lines.push('');
  lines.push('## Person Deferred');
  lines.push('');
  lines.push(markdownTable(
    ['Name', 'Blockers', 'Reason', 'Evidence'],
    payload.queues.person_deferred.map(row => [
      row.name,
      row.blockers.join(', '),
      row.filterReason,
      link(row.evidence?.title, row.evidence?.url),
    ]),
  ));
  lines.push('');
  lines.push('## Intake Boundary');
  lines.push('');
  lines.push('- This file is generated output, not a seed source of truth.');
  lines.push('- Every row keeps `importableSeed=false`; convert only after separate source review and newcomer preflight.');
  lines.push('- Media, X, RSS commentary, and already-covered URLs stay out of importable roster seeds.');
  lines.push('');
  return lines.join('\n');
}

function markdownTable(headers, rows) {
  if (rows.length === 0) return '_None_';
  const clean = value => String(value ?? '').replace(/\n/g, ' ').replace(/\|/g, '\\|').trim();
  return [
    `| ${headers.map(clean).join(' |')} |`,
    `| ${headers.map(() => '---').join(' |')} |`,
    ...rows.map(row => `| ${row.map(clean).join(' |')} |`),
  ].join('\n');
}

function link(title, url) {
  if (!url) return '';
  return `[${title || url}](${url})`;
}

async function writeJson(relPath, payload) {
  const filePath = path.join(ROOT, relPath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(payload, null, 2));
}

async function writeMarkdown(relPath, content) {
  const filePath = path.join(ROOT, relPath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
  const audit = readJson(inputPath);
  const db = await loadDbSnapshot(neon(process.env.DATABASE_URL));
  const aliasMerge = buildAliasMergeQueue(audit, db);
  const newOrganization = buildNewOrganizationQueue(audit, db, aliasMerge);
  const people = buildPeopleQueues(audit, db);
  const queues = {
    new_organization: newOrganization,
    alias_merge: aliasMerge,
    new_person_candidate: people.newPersonCandidates,
    person_deferred: people.personDeferred,
  };
  const payload = {
    _meta: {
      generatedAt: new Date().toISOString(),
      generator: 'scripts/audit/build_aihot_candidate_review_worklist.mjs',
      inputAuditJson: inputPath,
      inputAuditGeneratedAt: audit.generatedAt,
      outputJson: outputJsonPath,
      outputMd: outputMdPath,
      sourceOfTruth: 'generated_from_aihot_daily_audit_json_and_current_db_readonly',
      dbReadOnly: true,
      businessDataMutation: false,
      importableSeed: false,
    },
    sourcePolicy: {
      requiredPersonFieldsForNewCandidate: ['name', 'roleCategory', 'organization', 'currentTitle', 'reason', 'strongSource'],
      disallowedSeedOnlySources: ['x', 'twitter', 'linkedin', 'media_or_commentary_source', 'aggregator', 'search_page', 'profile_shell'],
      readyStatusAllowed: false,
    },
    dbSnapshot: db.counts,
    auditScope: audit.scope,
    queues,
    summary: buildSummary(queues),
  };
  await writeJson(outputJsonPath, payload);
  await writeMarkdown(outputMdPath, renderMarkdown(payload));
  console.log(JSON.stringify({
    outputJson: outputJsonPath,
    outputMd: outputMdPath,
    counts: payload.summary.counts,
    dbSnapshot: payload.dbSnapshot,
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
