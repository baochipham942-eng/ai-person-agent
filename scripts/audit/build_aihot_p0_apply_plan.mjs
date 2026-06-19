#!/usr/bin/env node
/**
 * Build a read-only P0 apply plan from the AI HOT audit outputs.
 *
 * This script does not write to the application database. It selects the
 * smallest import-safe batch and leaves candidate/person/company review queues
 * explicit so downstream materialization does not mix review-only evidence into
 * durable rows.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_COMPANY_WORKLIST = 'docs/audit-2026-06/data/aihot_company_source_worklist.json';
const DEFAULT_PEOPLE_ENRICHMENT = 'docs/audit-2026-06/data/aihot_existing_people_primary_source_enrichment.json';
const DEFAULT_CANDIDATE_WORKLIST = 'docs/audit-2026-06/data/aihot_candidate_review_worklist.json';
const DEFAULT_JSON_OUTPUT = 'docs/audit-2026-06/data/aihot_p0_apply_plan.json';
const DEFAULT_MD_OUTPUT = 'docs/audit-2026-06/AIHOT_P0_APPLY_PLAN.md';

const READY_COMPANY_SOURCE_KINDS = new Set(['official', 'rss', 'github']);
const BLOCKED_COMPANY_SOURCE_KINDS = new Set(['x', 'twitter', 'web']);
const DEFAULT_COMPANY_LIMIT = 36;
const DEFAULT_MAX_PER_ORGANIZATION = 5;
const DEFAULT_BACKLOG_LIMIT = 80;

main().catch(error => {
  console.error(error?.message || error);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const [companyWorklist, peopleEnrichment, candidateWorklist] = await Promise.all([
    readJson(options.companyWorklist),
    readJson(options.peopleEnrichment),
    readJson(options.candidateWorklist),
  ]);
  const plan = buildPlan({ companyWorklist, peopleEnrichment, candidateWorklist, options });

  await writeJson(options.outputJson, plan);
  await writeMarkdown(options.outputMd, plan);

  console.log(JSON.stringify({
    outputJson: options.outputJson,
    outputMd: options.outputMd,
    p0CompanySourceReady: plan.summary.p0CompanySourceReady,
    p0ExistingPeopleReady: plan.summary.p0ExistingPeopleReady,
    reviewOnlyItems: plan.summary.reviewOnlyItems,
    blockedOrBacklogItems: plan.summary.blockedOrBacklogItems,
  }, null, 2));
}

function parseArgs(argv) {
  const options = {
    companyWorklist: DEFAULT_COMPANY_WORKLIST,
    peopleEnrichment: DEFAULT_PEOPLE_ENRICHMENT,
    candidateWorklist: DEFAULT_CANDIDATE_WORKLIST,
    outputJson: DEFAULT_JSON_OUTPUT,
    outputMd: DEFAULT_MD_OUTPUT,
    companyLimit: DEFAULT_COMPANY_LIMIT,
    maxPerOrganization: DEFAULT_MAX_PER_ORGANIZATION,
    backlogLimit: DEFAULT_BACKLOG_LIMIT,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg.startsWith('--company-worklist=')) options.companyWorklist = arg.slice('--company-worklist='.length);
    else if (arg.startsWith('--people-enrichment=')) options.peopleEnrichment = arg.slice('--people-enrichment='.length);
    else if (arg.startsWith('--candidate-worklist=')) options.candidateWorklist = arg.slice('--candidate-worklist='.length);
    else if (arg.startsWith('--output-json=')) options.outputJson = arg.slice('--output-json='.length);
    else if (arg.startsWith('--output-md=')) options.outputMd = arg.slice('--output-md='.length);
    else if (arg.startsWith('--company-limit=')) options.companyLimit = readNonNegativeInt(arg, '--company-limit=');
    else if (arg.startsWith('--max-per-organization=')) options.maxPerOrganization = readNonNegativeInt(arg, '--max-per-organization=');
    else if (arg.startsWith('--backlog-limit=')) options.backlogLimit = readNonNegativeInt(arg, '--backlog-limit=');
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.maxPerOrganization < 1) throw new Error('--max-per-organization must be >= 1');
  return options;
}

function readNonNegativeInt(arg, prefix) {
  const raw = arg.slice(prefix.length);
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`Invalid ${prefix}${raw}`);
  return parsed;
}

async function readJson(relPath) {
  const fullPath = path.resolve(relPath);
  return JSON.parse(await fs.readFile(fullPath, 'utf8'));
}

async function writeJson(relPath, payload) {
  const fullPath = path.resolve(relPath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
}

async function writeMarkdown(relPath, payload) {
  const fullPath = path.resolve(relPath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, renderMarkdown(payload));
}

function buildPlan({ companyWorklist, peopleEnrichment, candidateWorklist, options }) {
  const companyRows = Array.isArray(companyWorklist.companySourceCandidates)
    ? companyWorklist.companySourceCandidates
    : [];
  const peopleRows = Array.isArray(peopleEnrichment.items) ? peopleEnrichment.items : [];
  const candidateQueues = candidateWorklist.queues || {};

  const reviewOnlyOrganizationNames = new Set((Array.isArray(candidateQueues.new_organization)
    ? candidateQueues.new_organization
    : []).flatMap(row => [
    normalizeName(row.name),
    normalizeName(row.canonicalName),
  ]).filter(Boolean));
  const classifiedCompanyRows = classifyCompanyRows(companyRows, { reviewOnlyOrganizationNames });
  const eligibleCompanyRows = classifiedCompanyRows
    .filter(row => row.p0Status === 'ready_for_company_seed')
    .sort(compareCompanyRows);
  const selectedCompanyRows = selectBalancedRows(eligibleCompanyRows, {
    limit: options.companyLimit,
    maxPerOrganization: options.maxPerOrganization,
  });
  const selectedIds = new Set(selectedCompanyRows.map(row => row.id));
  const companyBacklogRows = eligibleCompanyRows
    .filter(row => !selectedIds.has(row.id))
    .slice(0, options.backlogLimit)
    .map(row => ({ ...row, p0Status: 'eligible_backlog', gateReason: 'p0_batch_or_per_company_limit' }));
  const blockedCompanyRows = classifiedCompanyRows
    .filter(row => row.p0Status !== 'ready_for_company_seed')
    .sort(compareCompanyRows)
    .slice(0, options.backlogLimit);

  const existingPeopleReady = peopleRows
    .filter(row => row.category === 'ready_to_backfill')
    .sort(comparePeopleRows)
    .map(toExistingPersonReadyRow);
  const existingPeopleReview = peopleRows
    .filter(row => row.category !== 'ready_to_backfill')
    .sort(comparePeopleRows)
    .slice(0, options.backlogLimit)
    .map(toExistingPersonReviewRow);

  const reviewOnlyQueues = buildReviewOnlyQueues(candidateQueues);
  const allReviewOnlyRows = Object.values(reviewOnlyQueues).flat();
  const queueCounts = Object.fromEntries(
    Object.entries(candidateQueues).map(([name, rows]) => [name, Array.isArray(rows) ? rows.length : 0])
  );

  return {
    pipeline: 'aihot_p0_apply_plan',
    generatedAt: new Date().toISOString(),
    sourceOfTruth: {
      companyWorklist: options.companyWorklist,
      peopleEnrichment: options.peopleEnrichment,
      candidateWorklist: options.candidateWorklist,
    },
    mode: 'read_only_apply_plan_no_business_db_writes',
    gates: {
      companySourceReadyCriteria: [
        'organizationId exists',
        'sourcePlacement is company_attribute_source',
        `sourceKind in ${JSON.stringify([...READY_COMPANY_SOURCE_KINDS])}`,
        'canonical URL is unique in this plan',
        'content family is unique in this plan',
        `max ${options.maxPerOrganization} selected rows per organization`,
      ],
      existingPeopleReadyCriteria: [
        'category is ready_to_backfill',
        'canonicalPrimaryUrl comes from official/company/paper/GitHub source',
        'matchedPersonId already exists in People',
      ],
      directImportBlocked: [
        'new Organization rows from AI HOT are review-only',
        'new People rows from AI HOT are review-only',
        'X/social-only and media/curator evidence is not P0 materialization input',
        'semantic duplicates across language variants require a primary-source canonical URL before insert',
      ],
    },
    summary: {
      p0CompanySourceReady: selectedCompanyRows.length,
      p0ExistingPeopleReady: existingPeopleReady.length,
      eligibleCompanyBacklog: companyBacklogRows.length,
      blockedCompanyExamples: blockedCompanyRows.length,
      existingPeopleReviewExamples: existingPeopleReview.length,
      reviewOnlyItems: allReviewOnlyRows.length,
      blockedOrBacklogItems: companyBacklogRows.length + blockedCompanyRows.length + existingPeopleReview.length + allReviewOnlyRows.length,
      companyReadyByOrganization: toSortedCountRows(countBy(selectedCompanyRows, row => row.organizationLabel)),
      companyReadyBySourceKind: toSortedCountRows(countBy(selectedCompanyRows, row => row.sourceKind)),
      companyReadyByRole: toSortedCountRows(countBy(selectedCompanyRows, row => row.role)),
      candidateQueueCounts: queueCounts,
      inputCounts: {
        companySourceCandidates: companyRows.length,
        existingPeopleCandidates: peopleRows.length,
        candidateReviewQueues: Object.values(queueCounts).reduce((sum, count) => sum + count, 0),
      },
    },
    p0CompanySourceReady: selectedCompanyRows.map(toCompanyReadyRow),
    p0ExistingPeopleReady: existingPeopleReady,
    backlog: {
      companySourceEligibleLater: companyBacklogRows.map(toCompanyReadyRow),
      companySourceBlockedExamples: blockedCompanyRows.map(toCompanyBlockedRow),
      existingPeopleNeedsPrimarySourceExamples: existingPeopleReview,
    },
    reviewOnlyQueues,
  };
}

function classifyCompanyRows(rows, { reviewOnlyOrganizationNames }) {
  const urlSeen = new Set();
  const familySeen = new Set();
  return rows.map(row => {
    const canonicalUrl = normalizeUrl(row.canonicalUrl || row.url);
    const familyKey = companyContentFamilyKey(row, canonicalUrl);
    const gateReasons = [];
    if (!row.organizationId) gateReasons.push('missing_organization_id');
    if (reviewOnlyOrganizationNames.has(normalizeName(row.organizationLabel))) {
      gateReasons.push('organization_in_new_organization_review_queue');
    }
    if (row.sourcePlacement !== 'company_attribute_source') gateReasons.push('not_company_attribute_source');
    if (!READY_COMPANY_SOURCE_KINDS.has(row.sourceKind)) {
      gateReasons.push(BLOCKED_COMPANY_SOURCE_KINDS.has(row.sourceKind) ? `source_kind_${row.sourceKind}_review_only` : `source_kind_${row.sourceKind || 'unknown'}_not_in_p0`);
    }
    if (!canonicalUrl) gateReasons.push('missing_canonical_url');
    if (urlSeen.has(canonicalUrl)) gateReasons.push('duplicate_canonical_url_in_plan_input');
    if (familySeen.has(familyKey)) gateReasons.push('duplicate_content_family_in_plan_input');
    if (row.status && row.status !== 'review_candidate') gateReasons.push(`status_${row.status}`);

    const accepted = gateReasons.length === 0;
    if (accepted) {
      urlSeen.add(canonicalUrl);
      familySeen.add(familyKey);
    }

    return {
      ...row,
      canonicalUrl,
      contentFamilyKey: familyKey,
      p0Status: accepted ? 'ready_for_company_seed' : 'blocked_or_review_only',
      gateReason: accepted ? 'passes_p0_company_source_gate' : gateReasons.join(','),
    };
  });
}

function selectBalancedRows(rows, { limit, maxPerOrganization }) {
  if (limit === 0) return [];
  const groups = new Map();
  for (const row of rows) {
    const key = row.organizationId || row.organizationLabel || 'unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const sortedGroups = [...groups.values()]
    .map(group => group.sort(compareCompanyRows))
    .sort((a, b) => compareCompanyRows(a[0], b[0]));

  const selected = [];
  for (let round = 0; round < maxPerOrganization && selected.length < limit; round += 1) {
    for (const group of sortedGroups) {
      if (selected.length >= limit) break;
      if (group[round]) selected.push(group[round]);
    }
  }
  return selected.sort(compareCompanyRows);
}

function toCompanyReadyRow(row) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    organizationLabel: row.organizationLabel,
    role: row.role,
    sourceKind: row.sourceKind,
    sourceName: row.sourceName,
    title: row.title,
    url: row.url,
    canonicalUrl: row.canonicalUrl,
    date: row.date,
    priority: row.priority || 0,
    contentFamilyKey: row.contentFamilyKey,
    materializationTarget: 'CompanySource seed draft only',
    seedDefaults: {
      access: 'free_web',
      readinessUse: row.role === 'financial_signal' ? 'company_page_only' : 'company_strategy_context_only',
      excludedFromTopicReadiness: true,
      companyPageOnly: row.role === 'financial_signal',
    },
  };
}

function toCompanyBlockedRow(row) {
  return {
    id: row.id,
    organizationId: row.organizationId || null,
    organizationLabel: row.organizationLabel,
    role: row.role,
    sourceKind: row.sourceKind,
    sourceName: row.sourceName,
    title: row.title,
    url: row.url,
    date: row.date,
    gateReason: row.gateReason,
  };
}

function toExistingPersonReadyRow(row) {
  return {
    matchedPersonId: row.matchedPersonId,
    personName: row.personName,
    title: row.title,
    date: row.date,
    canonicalPrimaryUrl: row.canonicalPrimaryUrl,
    sourceOfficialness: row.sourceOfficialness,
    discoverySourceKind: row.discoverySourceKind,
    currentDbUrlMatch: Boolean(row.currentDbUrlMatch),
    currentDbSemanticMatch: Boolean(row.currentDbSemanticMatch),
    recommendedAction: row.recommendedAction,
    materializationTarget: 'RawPoolItem backfill, then activity materialization',
  };
}

function toExistingPersonReviewRow(row) {
  return {
    matchedPersonId: row.matchedPersonId,
    personName: row.personName,
    category: row.category,
    title: row.title,
    date: row.date,
    discoverySourceUrl: row.discoverySourceUrl,
    discoverySourceKind: row.discoverySourceKind,
    canonicalPrimaryUrl: row.canonicalPrimaryUrl || null,
    sourceOfficialness: row.sourceOfficialness || null,
    gateReason: row.decisionReason || row.recommendedAction || 'needs_manual_primary_source_review',
  };
}

function buildReviewOnlyQueues(queues) {
  return Object.fromEntries(
    Object.entries(queues).map(([name, rows]) => [
      name,
      (Array.isArray(rows) ? rows : []).map(row => ({
        id: row.id,
        bucket: row.bucket || name,
        reviewStatus: row.reviewStatus,
        importableSeed: Boolean(row.importableSeed),
        name: row.name || row.canonicalName || '',
        canonicalName: row.canonicalName || '',
        evidenceUrl: row.evidence?.url || '',
        evidenceSourceKind: row.evidence?.sourceKind || '',
        evidenceTitle: row.evidence?.title || '',
        duplicateOrAliasDecision: row.duplicateOrAliasDecision || '',
        filterReason: row.filterReason || '',
        recommendedAction: row.recommendedAction || '',
      })),
    ])
  );
}

function compareCompanyRows(a, b) {
  return (b.priority || 0) - (a.priority || 0)
    || String(b.date || '').localeCompare(String(a.date || ''))
    || sourceKindRank(b.sourceKind) - sourceKindRank(a.sourceKind)
    || String(a.organizationLabel || '').localeCompare(String(b.organizationLabel || ''))
    || String(a.title || '').localeCompare(String(b.title || ''));
}

function comparePeopleRows(a, b) {
  return String(b.date || '').localeCompare(String(a.date || ''))
    || String(a.personName || '').localeCompare(String(b.personName || ''))
    || String(a.title || '').localeCompare(String(b.title || ''));
}

function sourceKindRank(kind) {
  if (kind === 'official') return 4;
  if (kind === 'rss') return 3;
  if (kind === 'github') return 2;
  return 1;
}

function companyContentFamilyKey(row, canonicalUrl) {
  const url = canonicalUrl || normalizeUrl(row.url);
  const githubReleaseFamily = githubReleaseFamilyKey(url);
  if (githubReleaseFamily) return `${row.organizationId || row.organizationLabel}|${row.role}|${githubReleaseFamily}`;
  return [
    row.organizationId || row.organizationLabel || '',
    row.role || '',
    row.sourceKind || '',
    row.titleHash || normalizeTitle(row.title),
  ].join('|');
}

function githubReleaseFamilyKey(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.replace(/^www\./, '') !== 'github.com') return '';
    const parts = parsed.pathname.split('/').filter(Boolean);
    const releasesIndex = parts.indexOf('releases');
    if (releasesIndex < 2) return '';
    return `github-release:${parts[0]}/${parts[1]}`;
  } catch {
    return '';
  }
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

function normalizeTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[\s"'`.,:;!?()[\]{}<>|/\\_-]+/g, '')
    .replace(/发布|推出|正式|更新|announces?|launch(es|ed)?|introducing/g, '')
    .trim();
}

function normalizeName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function toSortedCountRows(counts) {
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function renderMarkdown(plan) {
  const lines = [];
  lines.push('# AI HOT P0 Apply Plan');
  lines.push('');
  lines.push(`Generated: ${plan.generatedAt}`);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('- Mode: read-only apply plan; no business database writes.');
  lines.push('- CompanySource P0 only uses existing Organization rows and company-owned source evidence.');
  lines.push('- New companies, new people, X/social-only evidence, media/curator evidence, and semantic duplicates stay review-only.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- P0 CompanySource ready: ${plan.summary.p0CompanySourceReady}`);
  lines.push(`- P0 existing people ready: ${plan.summary.p0ExistingPeopleReady}`);
  lines.push(`- Eligible CompanySource backlog: ${plan.summary.eligibleCompanyBacklog}`);
  lines.push(`- Blocked company examples in report: ${plan.summary.blockedCompanyExamples}`);
  lines.push(`- Existing people review examples in report: ${plan.summary.existingPeopleReviewExamples}`);
  lines.push(`- Candidate review-only items: ${plan.summary.reviewOnlyItems}`);
  lines.push('');
  lines.push('### Company Ready By Organization');
  lines.push('');
  lines.push(markdownTable(['Organization', 'Count'], plan.summary.companyReadyByOrganization.map(row => [row.key, row.count])));
  lines.push('');
  lines.push('### Company Ready By Source Kind');
  lines.push('');
  lines.push(markdownTable(['Source Kind', 'Count'], plan.summary.companyReadyBySourceKind.map(row => [row.key, row.count])));
  lines.push('');
  lines.push('### Company Ready By Role');
  lines.push('');
  lines.push(markdownTable(['Role', 'Count'], plan.summary.companyReadyByRole.map(row => [row.key, row.count])));
  lines.push('');
  lines.push('## P0 CompanySource Ready');
  lines.push('');
  lines.push(markdownTable(
    ['Company', 'Role', 'Kind', 'Date', 'Title', 'URL'],
    plan.p0CompanySourceReady.map(row => [
      row.organizationLabel,
      row.role,
      row.sourceKind,
      row.date || '',
      row.title,
      row.url,
    ])
  ));
  lines.push('');
  lines.push('## P0 Existing People Ready');
  lines.push('');
  lines.push(markdownTable(
    ['Person', 'Date', 'Officialness', 'Title', 'Canonical URL'],
    plan.p0ExistingPeopleReady.map(row => [
      row.personName,
      row.date || '',
      row.sourceOfficialness || '',
      row.title,
      row.canonicalPrimaryUrl,
    ])
  ));
  lines.push('');
  lines.push('## Review-Only Queues');
  lines.push('');
  lines.push(markdownTable(
    ['Queue', 'Count'],
    Object.entries(plan.reviewOnlyQueues).map(([name, rows]) => [name, rows.length])
  ));
  lines.push('');
  for (const [name, rows] of Object.entries(plan.reviewOnlyQueues)) {
    lines.push(`### ${name}`);
    lines.push('');
    lines.push(markdownTable(
      ['Name', 'Kind', 'Decision', 'Evidence', 'Reason'],
      rows.slice(0, 12).map(row => [
        row.name || row.canonicalName || row.id,
        row.evidenceSourceKind,
        row.duplicateOrAliasDecision,
        row.evidenceUrl,
        row.filterReason,
      ])
    ));
    lines.push('');
  }
  lines.push('## Backlog And Blocked Examples');
  lines.push('');
  lines.push('### Eligible CompanySource Later');
  lines.push('');
  lines.push(markdownTable(
    ['Company', 'Role', 'Kind', 'Date', 'Title', 'URL'],
    plan.backlog.companySourceEligibleLater.slice(0, 40).map(row => [
      row.organizationLabel,
      row.role,
      row.sourceKind,
      row.date || '',
      row.title,
      row.url,
    ])
  ));
  lines.push('');
  lines.push('### CompanySource Blocked Examples');
  lines.push('');
  lines.push(markdownTable(
    ['Company', 'Kind', 'Reason', 'Title', 'URL'],
    plan.backlog.companySourceBlockedExamples.slice(0, 40).map(row => [
      row.organizationLabel || '',
      row.sourceKind || '',
      row.gateReason || '',
      row.title || '',
      row.url || '',
    ])
  ));
  lines.push('');
  lines.push('### Existing People Needs Primary Source');
  lines.push('');
  lines.push(markdownTable(
    ['Person', 'Category', 'Kind', 'Title', 'Reason'],
    plan.backlog.existingPeopleNeedsPrimarySourceExamples.slice(0, 40).map(row => [
      row.personName || '',
      row.category || '',
      row.discoverySourceKind || '',
      row.title || '',
      row.gateReason || '',
    ])
  ));
  lines.push('');
  lines.push('## Next Execution Boundary');
  lines.push('');
  lines.push('1. Generate per-company `company-source-seed/v1` dry-run packs only from `p0CompanySourceReady`.');
  lines.push('2. Run `pnpm company:preflight -- --check-db` on each pack before any materialization.');
  lines.push('3. Convert the two `p0ExistingPeopleReady` rows through RawPoolItem backfill only after exact URL and person binding re-check.');
  lines.push('4. Keep review-only queues out of materialization until they get canonical company/person decisions and primary-source URLs.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function markdownTable(headers, rows) {
  if (!rows.length) return '_None._';
  const safeHeaders = headers.map(escapeCell);
  const safeRows = rows.map(row => row.map(escapeCell));
  return [
    `| ${safeHeaders.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...safeRows.map(row => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function escapeCell(value) {
  return String(value ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();
}

function printHelp() {
  console.log(`
Usage:
  node scripts/audit/build_aihot_p0_apply_plan.mjs [options]

Options:
  --company-worklist=<path>      Input AI HOT CompanySource worklist JSON
  --people-enrichment=<path>     Input existing people primary-source enrichment JSON
  --candidate-worklist=<path>    Input candidate review worklist JSON
  --output-json=<path>           Output machine-readable plan JSON
  --output-md=<path>             Output reviewer Markdown report
  --company-limit=<n>            Max selected CompanySource P0 rows, default ${DEFAULT_COMPANY_LIMIT}
  --max-per-organization=<n>     Max selected rows per organization, default ${DEFAULT_MAX_PER_ORGANIZATION}
  --backlog-limit=<n>            Max backlog/blocked examples per section, default ${DEFAULT_BACKLOG_LIMIT}
`);
}
