#!/usr/bin/env node
/**
 * Build a review-only CompanySource worklist from the AI HOT audit JSON.
 *
 * This script never writes to the application database. It keeps company-owned
 * sources separate from media, curator, and personal X accounts.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_INPUT = 'docs/audit-2026-06/data/aihot_daily_p0_p1_audit.json';
const DEFAULT_JSON_OUTPUT = 'docs/audit-2026-06/data/aihot_company_source_worklist.json';
const DEFAULT_MD_OUTPUT = 'docs/audit-2026-06/AIHOT_COMPANY_SOURCE_WORKLIST.md';
const TARGET_MODEL = 'CompanySource';
const TARGET_COMPANIES = [
  'anthropic',
  'openai',
  'google',
  '谷歌',
  'hugging face',
  'xai',
  'apple',
  '苹果公司',
  'nvidia',
  '英伟达',
  'alibaba',
  'alibaba damo academy',
  'qwen',
  'microsoft',
  '微软',
];
const ALLOWED_ACTIONS = new Set([
  '补公司属性源',
  '公司属性源观察',
  '沉淀为公司属性源',
]);
const ALLOWED_ROLES = new Set([
  'official_strategy',
  'product_release',
  'financial_signal',
  'partnership_signal',
  'hiring_team_signal',
  'technical_thread_link',
]);
const MEDIA_OR_CURATOR_LABELS = new Set([
  'ars technica',
  'bloomberg',
  'gary marcus',
  'hacker news',
  'it之家',
  'marktechpost',
  'nathan lambert',
  'techcrunch',
  'the decoder',
  'the verge',
]);

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

  const audit = JSON.parse(await fs.readFile(path.resolve(options.input), 'utf8'));
  const worklist = buildWorklist(audit, options);
  await writeJson(options.outputJson, worklist);
  await writeMarkdown(options.outputMd, worklist);
  console.log(JSON.stringify(worklist.summary, null, 2));
}

function parseArgs(argv) {
  const options = {
    input: DEFAULT_INPUT,
    outputJson: DEFAULT_JSON_OUTPUT,
    outputMd: DEFAULT_MD_OUTPUT,
    limitRows: 500,
    limitCompanies: 60,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg.startsWith('--input=')) options.input = arg.slice('--input='.length);
    else if (arg.startsWith('--out-json=')) options.outputJson = arg.slice('--out-json='.length);
    else if (arg.startsWith('--output-json=')) options.outputJson = arg.slice('--output-json='.length);
    else if (arg.startsWith('--out-md=')) options.outputMd = arg.slice('--out-md='.length);
    else if (arg.startsWith('--output-md=')) options.outputMd = arg.slice('--output-md='.length);
    else if (arg.startsWith('--limit-rows=')) options.limitRows = readPositiveInt(arg, '--limit-rows=');
    else if (arg.startsWith('--limit-companies=')) options.limitCompanies = readPositiveInt(arg, '--limit-companies=');
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function buildWorklist(audit, options) {
  const dailyItems = Array.isArray(audit.dailyItems) ? audit.dailyItems : [];
  const candidateRows = uniqueByDedupeKey(dailyItems
    .filter(isCompanyAttributeItem)
    .map(toCandidateRow))
    .sort(compareCandidateRows)
    .slice(0, options.limitRows);
  const companyRows = buildCompanyRows(audit, candidateRows)
    .slice(0, options.limitCompanies);
  const sourceRows = buildSourceRows(audit)
    .slice(0, options.limitCompanies);
  const blockedRows = dailyItems
    .filter(item => item.sourcePlacement && item.sourcePlacement !== 'company_attribute_source')
    .filter(item => item.ownerCompany || item.organizationMatches?.length)
    .slice(0, 80)
    .map(item => ({
      title: item.title || '',
      sourceName: item.sourceName || '',
      sourceUrl: item.sourceUrl || '',
      sourcePlacement: item.sourcePlacement,
      sourceKind: item.sourceKind || '',
      reason: blockReason(item),
    }));
  const roleCounts = countBy(candidateRows, row => row.role);
  const organizationCounts = countBy(candidateRows, row => row.organizationLabel);
  const sourceKindCounts = countBy(candidateRows, row => row.sourceKind);
  const missingOrgRows = candidateRows.filter(row => !row.organizationId).length;
  const duplicateGroups = duplicateGroupsBy(candidateRows, row => row.dedupeKey);

  return {
    pipeline: 'aihot_company_source_worklist',
    generatedAt: new Date().toISOString(),
    input: {
      generatedAt: audit.generatedAt || null,
      scope: audit.scope || null,
      summary: audit.summary || null,
    },
    target: {
      model: TARGET_MODEL,
      mode: 'review_only_no_db_writes',
      excluded: [
        'KnowledgeSource materialization',
        'RawPoolItem writes',
        'People/candidate backfill',
        'media and personal X sources as CompanySource',
      ],
      dedupeKeys: [
        'canonicalUrl',
        'urlHash',
        'organizationId',
        'role',
        'titleHash/eventHash',
      ],
    },
    summary: {
      companySourceCandidateRows: candidateRows.length,
      companyDimensionRows: companyRows.length,
      companyOwnedSourceRows: sourceRows.length,
      blockedNonCompanyRows: blockedRows.length,
      missingOrganizationIdRows: missingOrgRows,
      duplicateDedupeKeyGroups: duplicateGroups.length,
      roles: toSortedCountRows(roleCounts),
      sourceKinds: toSortedCountRows(sourceKindCounts),
      topOrganizations: toSortedCountRows(organizationCounts).slice(0, 12),
    },
    migrationNote: {
      requiredMigrations: [
        '20260618103000_knowledge_threads',
        '20260618123000_company_sources',
      ],
      reason: 'The audit can report missing CompanySource/KnowledgeSource when the connected database has not applied migrations that already exist in prisma/migrations.',
      minimumRepairPath: [
        'Confirm the target DATABASE_URL is dev/staging, not production.',
        'Run prisma migrate status against prisma/schema.prisma.',
        'Apply the pending migrations with the existing release/deploy path for that database.',
        'Re-run the AI HOT audit; missingOptionalTables should no longer include CompanySource or KnowledgeSource.',
      ],
    },
    companyDimensionWorklist: companyRows,
    companyOwnedSourceWorklist: sourceRows,
    companySourceCandidates: candidateRows,
    blockedNonCompanyExamples: blockedRows,
    duplicateDedupeKeyGroups: duplicateGroups,
  };
}

function isCompanyAttributeItem(item) {
  if (!item || item.sourcePlacement !== 'company_attribute_source') return false;
  if (!item.ownerCompany?.label) return false;
  if (!item.sourceUrl || !item.title) return false;
  if (item.exactUrlCovered) return false;
  if (!ALLOWED_ROLES.has(item.companyRole || '')) return false;
  if (isMediaOrCurator(item.ownerCompany.label) || isMediaOrCurator(item.sourceName)) return false;
  if (looksLikePersonalX(item)) return false;
  return true;
}

function toCandidateRow(item) {
  const canonicalUrl = canonicalizeUrl(item.normalizedUrl || item.sourceUrl);
  const urlHash = hashString(canonicalUrl);
  const organizationId = item.ownerCompany?.id || firstOrganizationId(item) || null;
  const organizationLabel = item.ownerCompany?.label || firstOrganizationLabel(item) || '';
  const role = item.companyRole || 'official_strategy';
  const titleHash = hashString(normalizeText(item.title)).slice(0, 16);
  const eventHash = hashString([
    item.date || '',
    item.section || '',
    organizationId || normalizeText(organizationLabel),
    role,
    titleHash,
  ].join('|')).slice(0, 16);
  const dedupeKey = [
    canonicalUrl,
    urlHash,
    organizationId || normalizeText(organizationLabel),
    role,
    eventHash,
  ].join('|');

  return {
    id: `aihot-company-source:${eventHash}:${urlHash.slice(0, 12)}`,
    targetModel: TARGET_MODEL,
    status: organizationId ? 'review_candidate' : 'needs_organization_resolution',
    priority: companyPriority(organizationLabel, item.priority || 0),
    date: item.date || null,
    section: item.section || '',
    organizationId,
    organizationLabel,
    role,
    sourceKind: item.sourceKind || '',
    sourceName: item.sourceName || '',
    title: item.title || '',
    url: item.sourceUrl,
    canonicalUrl,
    urlHash,
    titleHash,
    eventHash,
    dedupeKey,
    sourcePlacement: item.sourcePlacement,
    libraryDuplicateStatus: item.libraryDuplicateStatus || item.gapBucket || null,
    peopleMatchCount: Array.isArray(item.peopleMatches) ? item.peopleMatches.length : 0,
    organizationMatches: (item.organizationMatches || []).map(match => ({
      id: match.id || null,
      label: match.label || '',
      source: match.source || '',
    })).slice(0, 5),
    candidateTerms: (item.candidateTerms || []).slice(0, 8),
    reviewNotes: [
      'Verify this is an official/company-owned source before materializing.',
      'Keep excludedFromTopicReadiness=true and companyPageOnly=true when later writing CompanySource.',
    ],
  };
}

function buildCompanyRows(audit, candidateRows) {
  const countsByOrg = countBy(candidateRows, row => row.organizationLabel);
  const byOrgRole = new Map();
  for (const row of candidateRows) {
    const key = `${row.organizationLabel}|${row.role}`;
    byOrgRole.set(key, (byOrgRole.get(key) || 0) + 1);
  }

  return (audit.companyAbsorptionCandidates || [])
    .filter(row => row.action === '补公司属性源')
    .map(row => ({
      company: row.company,
      action: row.action,
      score: row.score || 0,
      priority: companyPriority(row.company, row.score || 0),
      existsInOrganization: Boolean(row.existsInOrganization),
      eventCount: row.eventCount || 0,
      freshEventCount: row.freshEventCount || 0,
      sourceOwnerEventCount: row.sourceOwnerEventCount || 0,
      knownPersonEventCount: row.knownPersonEventCount || 0,
      candidateRowCount: countsByOrg.get(row.company) || 0,
      roles: row.roles || [],
      sourceKeys: row.sourceKeys || [],
      topCandidateRoles: [...byOrgRole.entries()]
        .filter(([key]) => key.startsWith(`${row.company}|`))
        .map(([key, count]) => ({ role: key.split('|')[1], count }))
        .sort((a, b) => b.count - a.count || a.role.localeCompare(b.role)),
      reason: row.reason || '',
    }))
    .sort((a, b) => b.priority - a.priority || b.candidateRowCount - a.candidateRowCount || b.score - a.score);
}

function buildSourceRows(audit) {
  return (audit.sourceAbsorptionCandidates || audit.sourceIntakeCandidates || [])
    .filter(row => row.sourcePlacement === 'company_attribute_source')
    .filter(row => ALLOWED_ACTIONS.has(row.recommendation))
    .filter(row => row.ownerCompany && !isMediaOrCurator(row.ownerCompany))
    .map(row => ({
      displayName: row.displayName,
      ownerCompany: row.ownerCompany,
      sourceKey: row.sourceKey,
      sourceKind: row.sourceKind,
      recommendation: row.recommendation,
      score: row.score || 0,
      priority: companyPriority(row.ownerCompany, row.score || 0),
      eventCount: row.eventCount || 0,
      freshEventCount: row.freshEventCount || 0,
      knownEntityEventCount: row.knownEntityEventCount || 0,
      companyRoles: row.companyRoles || [],
      duplicateRiskRate: row.duplicateRiskRate || 0,
      reason: row.reason || '',
    }))
    .sort((a, b) => b.priority - a.priority || b.freshEventCount - a.freshEventCount || b.score - a.score);
}

function uniqueByDedupeKey(rows) {
  const seen = new Set();
  const result = [];
  for (const row of rows) {
    if (seen.has(row.dedupeKey)) continue;
    seen.add(row.dedupeKey);
    result.push(row);
  }
  return result;
}

function duplicateGroupsBy(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([dedupeKey, group]) => ({
      dedupeKey,
      count: group.length,
      ids: group.map(row => row.id),
      titles: group.map(row => row.title).slice(0, 5),
    }));
}

function compareCandidateRows(a, b) {
  return b.priority - a.priority
    || b.date.localeCompare(a.date)
    || a.organizationLabel.localeCompare(b.organizationLabel)
    || a.role.localeCompare(b.role)
    || a.title.localeCompare(b.title);
}

function blockReason(item) {
  if (item.sourcePlacement === 'discovery_only_source') return 'discovery source;回抓原始来源，不写 CompanySource';
  if (item.sourcePlacement === 'standalone_signal_source') return 'independent/personal signal source;不混入 CompanySource';
  if (item.sourcePlacement === 'candidate_content_source') return 'content source candidate;先走 KnowledgeSource 或源复核';
  return `not company_attribute_source: ${item.sourcePlacement}`;
}

function looksLikePersonalX(item) {
  if (item.sourceKind !== 'x') return false;
  const owner = normalizeText(item.ownerCompany?.label || '');
  const source = normalizeText(item.sourceName || '');
  if (!owner) return true;
  if (item.ownerCompany?.evidence === 'source_alias') return false;
  if (source.includes(`@${owner}`)) return false;
  if (source.includes(owner)) return false;
  return !TARGET_COMPANIES.some(company => source.includes(company) && owner.includes(company));
}

function isMediaOrCurator(value) {
  const normalized = normalizeText(value || '');
  return MEDIA_OR_CURATOR_LABELS.has(normalized);
}

function firstOrganizationId(item) {
  return (item.organizationMatches || []).find(match => match.id)?.id || null;
}

function firstOrganizationLabel(item) {
  return (item.organizationMatches || []).find(match => match.label)?.label || '';
}

function companyPriority(label, score) {
  const normalized = normalizeText(label || '');
  const targetBoost = TARGET_COMPANIES.some(company => normalized.includes(company)) ? 10000 : 0;
  return targetBoost + Number(score || 0);
}

function canonicalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|igshid$)/i.test(key)) url.searchParams.delete(key);
    }
    if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) {
      url.port = '';
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    return String(value || '').trim();
  }
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row) || '';
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function toSortedCountRows(counts) {
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function hashString(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function readPositiveInt(arg, prefix) {
  const value = Number(arg.slice(prefix.length));
  if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${prefix}${arg.slice(prefix.length)}`);
  return value;
}

async function writeJson(outputPath, payload) {
  const target = path.resolve(outputPath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(payload, null, 2)}\n`);
}

async function writeMarkdown(outputPath, worklist) {
  const target = path.resolve(outputPath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, renderMarkdown(worklist));
}

function renderMarkdown(worklist) {
  const lines = [];
  lines.push('# AI HOT 公司属性源 Worklist');
  lines.push('');
  lines.push(`生成时间：${worklist.generatedAt}`);
  lines.push(`目标模型：${worklist.target.model}`);
  lines.push('模式：只生成候选，不写正式库。');
  lines.push('');
  lines.push('## 结论');
  lines.push('');
  lines.push(`- CompanySource 候选行：${worklist.summary.companySourceCandidateRows}`);
  lines.push(`- 公司维度候选：${worklist.summary.companyDimensionRows}`);
  lines.push(`- 公司自有信源候选：${worklist.summary.companyOwnedSourceRows}`);
  lines.push(`- 非公司属性源拦截样例：${worklist.summary.blockedNonCompanyRows}`);
  lines.push(`- 缺 organizationId 的候选：${worklist.summary.missingOrganizationIdRows}`);
  lines.push(`- 去重冲突组：${worklist.summary.duplicateDedupeKeyGroups}`);
  lines.push('');
  lines.push('## 去重键');
  lines.push('');
  lines.push('`canonicalUrl + urlHash + organizationId + role + titleHash/eventHash`。');
  lines.push('');
  lines.push('## 公司维度 Top 20');
  lines.push('');
  lines.push('| 公司 | 动作 | 候选行 | 新事件 | 源归属事件 | 角色 | 主要源 |');
  lines.push('| --- | --- | ---: | ---: | ---: | --- | --- |');
  for (const row of worklist.companyDimensionWorklist.slice(0, 20)) {
    lines.push(`| ${escapeMd(row.company)} | ${escapeMd(row.action)} | ${row.candidateRowCount} | ${row.freshEventCount} | ${row.sourceOwnerEventCount} | ${escapeMd((row.roles || []).slice(0, 3).join(', '))} | ${escapeMd((row.sourceKeys || []).slice(0, 3).join(', '))} |`);
  }
  lines.push('');
  lines.push('## 公司自有信源 Top 20');
  lines.push('');
  lines.push('| 信源 | Owner | 类型 | 建议 | 新事件 | 角色 |');
  lines.push('| --- | --- | --- | --- | ---: | --- |');
  for (const row of worklist.companyOwnedSourceWorklist.slice(0, 20)) {
    lines.push(`| ${escapeMd(row.displayName)} | ${escapeMd(row.ownerCompany)} | ${escapeMd(row.sourceKind)} | ${escapeMd(row.recommendation)} | ${row.freshEventCount} | ${escapeMd((row.companyRoles || []).slice(0, 3).join(', '))} |`);
  }
  lines.push('');
  lines.push('## CompanySource 候选 Top 40');
  lines.push('');
  lines.push('| 日期 | 公司 | 角色 | 类型 | 标题 | 去重键片段 |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const row of worklist.companySourceCandidates.slice(0, 40)) {
    const link = row.url ? `[${escapeMd(row.title)}](${row.url})` : escapeMd(row.title);
    lines.push(`| ${escapeMd(row.date || '')} | ${escapeMd(row.organizationLabel)} | ${escapeMd(row.role)} | ${escapeMd(row.sourceKind)} | ${link} | ${escapeMd(`${row.urlHash.slice(0, 8)} / ${row.eventHash}`)} |`);
  }
  lines.push('');
  lines.push('## 拦截口径');
  lines.push('');
  lines.push('- `discovery_only_source`：只做发现源，回抓原始来源后再判断。');
  lines.push('- `standalone_signal_source`：独立或个人 X 信号源，不写 CompanySource。');
  lines.push('- `candidate_content_source`：内容源候选，先走 KnowledgeSource 或源复核。');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function escapeMd(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function printHelp() {
  console.log(`
Usage:
  node scripts/company/build_aihot_company_source_worklist.mjs \\
    --input=docs/audit-2026-06/data/aihot_daily_p0_p1_audit.json \\
    --out-json=docs/audit-2026-06/data/aihot_company_source_worklist.json \\
    --out-md=docs/audit-2026-06/AIHOT_COMPANY_SOURCE_WORKLIST.md

Default mode is read-only and writes review artifacts only.
`);
}
