import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_INPUT = 'docs/audit-2026-06/data/aihot_daily_p0_p1_audit.json';
const DEFAULT_OUTPUT_JSON = 'docs/audit-2026-06/data/aihot_existing_people_backfill_worklist.json';
const DEFAULT_OUTPUT_MD = 'docs/audit-2026-06/AIHOT_EXISTING_PEOPLE_BACKFILL_WORKLIST.md';
const DEFAULT_NEAR_DAYS = 7;

const PRIMARY_SOURCE_KINDS = new Set(['official', 'github', 'paper']);
const DISCOVERY_ONLY_SOURCE_KINDS = new Set(['x']);
const MEDIA_OR_CURATOR_PATTERNS = [
  /ars technica/i,
  /bloomberg/i,
  /buzzing\.cc/i,
  /hacker news/i,
  /it之家/i,
  /marktechpost/i,
  /techcrunch/i,
  /the decoder/i,
  /the verge/i,
  /中文翻译/i,
  /摘要/i,
];
const PRIMARY_URL_PATTERNS = [
  /(^|\.)anthropic\.com$/i,
  /(^|\.)deepmind\.google$/i,
  /(^|\.)github\.com$/i,
  /(^|\.)microsoft\.com$/i,
  /(^|\.)nvidia\.com$/i,
  /(^|\.)openai\.com$/i,
  /(^|\.)x\.ai$/i,
  /(^|\.)arxiv\.org$/i,
  /(^|\.)biorxiv\.org$/i,
  /(^|\.)nature\.com$/i,
];
const SOURCE_KIND_RANK = {
  official: 60,
  github: 50,
  paper: 45,
  rss: 25,
  web: 20,
  x: 5,
};
const GENERIC_TERMS = new Set([
  'ai',
  'api',
  'app',
  'apps',
  'blog',
  'chatgpt',
  'claude',
  'code',
  'codex',
  'data',
  'developer',
  'developers',
  'gemini',
  'gpt',
  'llm',
  'model',
  'models',
  'product',
  'research',
  'team',
  'web',
  '发布',
  '推出',
  '模型',
  '产品',
  '研究',
  '行业',
  '动态',
]);

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const audit = JSON.parse(await readFile(path.resolve(options.input), 'utf8'));
  const worklist = buildWorklist(audit, options);

  await mkdir(path.dirname(path.resolve(options.outputJson)), { recursive: true });
  await mkdir(path.dirname(path.resolve(options.outputMd)), { recursive: true });
  await writeFile(path.resolve(options.outputJson), `${JSON.stringify(worklist, null, 2)}\n`);
  await writeFile(path.resolve(options.outputMd), renderMarkdown(worklist));

  console.log(JSON.stringify({
    input: options.input,
    outputJson: options.outputJson,
    outputMd: options.outputMd,
    people: worklist.summary.people,
    candidateEvents: worklist.summary.candidateEvents,
    primaryReadyEvents: worklist.summary.primaryReadyEvents,
    needsPrimarySourceEvents: worklist.summary.needsPrimarySourceEvents,
    duplicateEventsSkipped: worklist.summary.duplicateEventsSkipped,
  }, null, 2));
}

function parseArgs(args) {
  const valueOf = (name, fallback) => {
    const prefix = `--${name}=`;
    const found = args.find(arg => arg.startsWith(prefix));
    return found ? found.slice(prefix.length) : fallback;
  };
  const numberValue = (name, fallback) => {
    const raw = valueOf(name, undefined);
    if (raw === undefined) return fallback;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`Invalid --${name}: ${raw}`);
    return Math.floor(parsed);
  };

  return {
    input: valueOf('input', DEFAULT_INPUT),
    outputJson: valueOf('output-json', DEFAULT_OUTPUT_JSON),
    outputMd: valueOf('output-md', DEFAULT_OUTPUT_MD),
    person: valueOf('person', '').trim(),
    limit: numberValue('limit', 0),
    maxPerPerson: numberValue('max-per-person', 0),
    nearDays: numberValue('near-days', DEFAULT_NEAR_DAYS),
  };
}

function buildWorklist(audit, options) {
  const existingPeople = buildExistingPeople(audit.peopleExistingCandidates || []);
  const selectedPeople = filterSelectedPeople(existingPeople, options.person);
  const selectedIds = new Set(selectedPeople.map(person => person.personId).filter(Boolean));
  const selectedNames = new Set(selectedPeople.flatMap(person => person.aliases.map(normalizeLoose)));
  const rawCandidates = [];

  for (const item of audit.contentAbsorptionCandidates || []) {
    if (item.absorbAction && item.absorbAction !== '补已知人物动态') continue;
    if (item.libraryDuplicateStatus === 'possible_library_duplicate') continue;

    for (const match of item.peopleMatches || []) {
      const matchKey = match.id || normalizeLoose(match.label);
      const known = match.id ? existingPeople.byId.get(match.id) : existingPeople.byName.get(normalizeLoose(match.label));
      if (!known) continue;
      if (selectedIds.size > 0 && !selectedIds.has(match.id) && !selectedNames.has(normalizeLoose(match.label))) continue;

      rawCandidates.push(toCandidate(item, match, known));
    }
  }

  const deduped = dedupeCandidates(rawCandidates, options.nearDays);
  const limited = applyLimits(deduped.candidates, options);
  const people = selectedPeople.map(person => {
    const candidates = limited.filter(candidate => candidate.personId === person.personId || candidate.personName === person.name);
    return {
      personId: person.personId || null,
      name: person.name,
      status: person.status || null,
      currentTitle: person.currentTitle || null,
      roleCategory: person.roleCategory || null,
      organization: person.organization || [],
      auditEventCount: person.auditEventCount,
      auditFreshEventCount: person.auditFreshEventCount,
      candidateCount: candidates.length,
      primaryReadyCount: candidates.filter(candidate => candidate.primarySourceUrl).length,
      needsPrimarySourceCount: candidates.filter(candidate => !candidate.primarySourceUrl).length,
      candidates,
    };
  });

  const included = people.flatMap(person => person.candidates);
  return {
    generatedAt: new Date().toISOString(),
    inputAuditGeneratedAt: audit.generatedAt || null,
    scope: {
      mode: 'dry-run worklist',
      source: 'AI HOT audit contentAbsorptionCandidates filtered by peopleExistingCandidates',
      noNewPeople: true,
      noDatabaseWrites: true,
      nearDuplicateDays: options.nearDays,
    },
    summary: {
      people: people.length,
      peopleWithCandidates: people.filter(person => person.candidateCount > 0).length,
      candidateEvents: included.length,
      primaryReadyEvents: included.filter(candidate => candidate.primarySourceUrl).length,
      needsPrimarySourceEvents: included.filter(candidate => !candidate.primarySourceUrl).length,
      duplicateEventsSkipped: deduped.duplicates.length,
    },
    people,
    skippedDuplicates: deduped.duplicates,
  };
}

function buildExistingPeople(rows) {
  const people = [];
  const byId = new Map();
  const byName = new Map();

  for (const row of rows) {
    const aliases = new Set([row.name]);
    let personId = null;
    let influenceScore = null;

    for (const example of row.examples || []) {
      for (const match of example.peopleMatches || []) {
        if (normalizeLoose(match.label) === normalizeLoose(row.name)) {
          personId = personId || match.id || null;
          influenceScore = influenceScore ?? match.influenceScore ?? null;
          aliases.add(match.label);
          aliases.add(match.alias);
        }
      }
    }

    const person = {
      personId,
      name: row.name,
      aliases: [...aliases].filter(Boolean),
      status: row.status || null,
      currentTitle: row.currentTitle || null,
      roleCategory: row.roleCategory || null,
      organization: row.organization || [],
      influenceScore,
      auditEventCount: row.eventCount || 0,
      auditFreshEventCount: row.freshEventCount || 0,
    };
    people.push(person);
    if (person.personId) byId.set(person.personId, person);
    for (const alias of person.aliases) byName.set(normalizeLoose(alias), person);
  }

  return { people, byId, byName };
}

function filterSelectedPeople(existingPeople, personFilter) {
  if (!personFilter) return existingPeople.people;
  const needle = normalizeLoose(personFilter);
  return existingPeople.people.filter(person =>
    person.personId === personFilter ||
    person.aliases.some(alias => normalizeLoose(alias).includes(needle))
  );
}

function toCandidate(item, match, known) {
  const sourceOptions = buildSourceOptions(item);
  const primary = choosePrimarySource(sourceOptions, item);
  const discoveryOnly = !primary;
  const companies = uniqueStrings([
    item.ownerCompany,
    ...(item.organizationMatches || []).map(org => org.label),
    ...(match.organization || []),
  ]).slice(0, 6);
  const actionTokens = buildActionTokens(item, match, companies);

  return {
    personId: match.id || known.personId || null,
    personName: match.label || known.name,
    personStatus: match.status || known.status || null,
    title: cleanText(item.title),
    date: item.date || firstValue(item.dates) || null,
    sections: uniqueStrings([item.section, ...(item.sections || [])]),
    eventId: item.eventId || null,
    priority: item.priority || 0,
    companies,
    actionTokens,
    primarySourceUrl: primary?.url || null,
    primarySourceKind: primary?.kind || null,
    discoverySourceUrl: item.sourceUrl || null,
    discoverySourceName: item.sourceName || null,
    discoverySourceKind: item.sourceKind || null,
    sourcePolicy: discoveryOnly
      ? 'needs_primary_source_before_apply'
      : 'primary_source_selected; X/media kept only as discovery evidence',
    candidateRawPoolItem: {
      sourceType: primary?.sourceType || null,
      url: primary?.url || null,
      title: cleanText(item.title),
      publishedAt: item.date || firstValue(item.dates) || null,
      metadata: {
        seed: 'aihot_existing_people_backfill',
        aihotEventId: item.eventId || null,
        aihotDiscoveryUrl: item.sourceUrl || null,
        aihotDiscoverySourceName: item.sourceName || null,
        aihotSourceKind: item.sourceKind || null,
        companies,
        actionTokens,
      },
    },
    dedupeKeys: {
      normalizedPrimaryUrl: normalizeUrl(primary?.url || ''),
      normalizedDiscoveryUrl: normalizeUrl(item.sourceUrl || ''),
      semantic: buildSemanticKey(match.id || known.personId || known.name, companies, actionTokens),
    },
  };
}

function buildSourceOptions(item) {
  const options = [];
  const add = (url, kind, name) => {
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    if (options.some(option => option.normalized === normalized)) return;
    options.push({
      url,
      normalized,
      kind: inferSourceKind(url, kind),
      sourceType: sourceTypeFromKind(inferSourceKind(url, kind)),
      name: name || '',
    });
  };

  add(item.sourceUrl, item.sourceKind, item.sourceName);
  for (const url of item.duplicateUrls || []) add(url, item.sourceKind, '');
  return options;
}

function choosePrimarySource(options, item) {
  const ranked = options
    .filter(option => isPrimaryEvidenceSource(option) && !isDiscoveryOnlySource(option, item))
    .sort((left, right) => sourceRank(right, item) - sourceRank(left, item));
  return ranked[0] || null;
}

function isPrimaryEvidenceSource(option) {
  if (!option?.url) return false;
  const domain = domainFromUrl(option.url);
  return PRIMARY_SOURCE_KINDS.has(option.kind) ||
    PRIMARY_URL_PATTERNS.some(pattern => pattern.test(domain));
}

function isDiscoveryOnlySource(option, item) {
  if (!option?.url) return true;
  if (DISCOVERY_ONLY_SOURCE_KINDS.has(option.kind)) return true;
  const text = `${option.name || ''} ${item.sourceName || ''} ${option.url || ''}`;
  return MEDIA_OR_CURATOR_PATTERNS.some(pattern => pattern.test(text));
}

function sourceRank(option) {
  const domain = domainFromUrl(option.url);
  const urlBonus = PRIMARY_URL_PATTERNS.some(pattern => pattern.test(domain)) ? 20 : 0;
  const primaryBonus = PRIMARY_SOURCE_KINDS.has(option.kind) ? 30 : 0;
  return (SOURCE_KIND_RANK[option.kind] || 0) + urlBonus + primaryBonus;
}

function inferSourceKind(url, fallback) {
  const domain = domainFromUrl(url);
  if (/github\.com$/i.test(domain)) return 'github';
  if (/arxiv\.org$|biorxiv\.org$|nature\.com$/i.test(domain)) return 'paper';
  if (PRIMARY_URL_PATTERNS.some(pattern => pattern.test(domain))) return 'official';
  return fallback || 'web';
}

function sourceTypeFromKind(kind) {
  if (kind === 'github') return 'github';
  if (kind === 'paper') return 'exa';
  if (kind === 'official' || kind === 'rss' || kind === 'web') return 'exa';
  return null;
}

function dedupeCandidates(candidates, nearDays) {
  const sorted = [...candidates].sort(compareCandidatePriority);
  const seenUrls = new Map();
  const accepted = [];
  const duplicates = [];

  for (const candidate of sorted) {
    const urlKeys = uniqueStrings([
      candidate.dedupeKeys.normalizedPrimaryUrl,
      candidate.dedupeKeys.normalizedDiscoveryUrl,
    ]);
    const urlDuplicate = urlKeys.map(key => seenUrls.get(key)).find(Boolean);
    if (urlDuplicate) {
      duplicates.push(toDuplicate(candidate, urlDuplicate, 'same_url'));
      continue;
    }

    const semanticDuplicate = accepted.find(existing =>
      existing.personId === candidate.personId &&
      existing.dedupeKeys.semantic === candidate.dedupeKeys.semantic &&
      isNearDate(existing.date, candidate.date, nearDays)
    );
    if (semanticDuplicate) {
      duplicates.push(toDuplicate(candidate, semanticDuplicate, 'same_person_company_action_near_date'));
      continue;
    }

    accepted.push(candidate);
    for (const key of urlKeys) seenUrls.set(key, candidate);
  }

  return {
    candidates: accepted.sort(compareCandidateDisplay),
    duplicates,
  };
}

function compareCandidatePriority(left, right) {
  const leftPrimary = left.primarySourceUrl ? 1 : 0;
  const rightPrimary = right.primarySourceUrl ? 1 : 0;
  if (leftPrimary !== rightPrimary) return rightPrimary - leftPrimary;
  if (left.priority !== right.priority) return right.priority - left.priority;
  return String(right.date || '').localeCompare(String(left.date || ''));
}

function compareCandidateDisplay(left, right) {
  return left.personName.localeCompare(right.personName) ||
    String(right.date || '').localeCompare(String(left.date || '')) ||
    right.priority - left.priority ||
    left.title.localeCompare(right.title);
}

function applyLimits(candidates, options) {
  let rows = candidates;
  if (options.maxPerPerson > 0) {
    const counts = new Map();
    rows = rows.filter(candidate => {
      const key = candidate.personId || candidate.personName;
      const count = counts.get(key) || 0;
      if (count >= options.maxPerPerson) return false;
      counts.set(key, count + 1);
      return true;
    });
  }
  if (options.limit > 0) rows = rows.slice(0, options.limit);
  return rows;
}

function toDuplicate(candidate, duplicateOf, reason) {
  return {
    reason,
    personId: candidate.personId,
    personName: candidate.personName,
    title: candidate.title,
    date: candidate.date,
    sourceUrl: candidate.primarySourceUrl || candidate.discoverySourceUrl,
    duplicateOf: {
      personId: duplicateOf.personId,
      personName: duplicateOf.personName,
      title: duplicateOf.title,
      date: duplicateOf.date,
      sourceUrl: duplicateOf.primarySourceUrl || duplicateOf.discoverySourceUrl,
    },
  };
}

function buildActionTokens(item, match, companies) {
  const blocked = new Set([
    ...tokenize(match.label),
    ...tokenize(match.alias),
    ...companies.flatMap(tokenize),
  ]);
  const tokens = [];
  for (const value of [...(item.candidateTerms || []), item.title]) {
    for (const token of tokenize(value)) {
      if (blocked.has(token) || GENERIC_TERMS.has(token)) continue;
      if (!tokens.includes(token)) tokens.push(token);
    }
  }
  return tokens.slice(0, 8);
}

function buildSemanticKey(personId, companies, actionTokens) {
  const companyKey = companies.flatMap(tokenize).filter(token => !GENERIC_TERMS.has(token)).slice(0, 4).sort().join('+') || 'unknown_company';
  const actionKey = actionTokens.slice(0, 6).sort().join('+') || 'unknown_action';
  return `${personId}:${companyKey}:${actionKey}`;
}

function tokenize(value) {
  return `${value || ''}`
    .normalize('NFKC')
    .toLowerCase()
    .match(/[\p{Script=Han}]{2,}|[a-z0-9][a-z0-9.+-]{1,}/gu)?.map(token => token.trim()).filter(Boolean) || [];
}

function isNearDate(left, right, nearDays) {
  const leftTime = Date.parse(left || '');
  const rightTime = Date.parse(right || '');
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return left === right;
  return Math.abs(leftTime - rightTime) <= nearDays * 24 * 60 * 60 * 1000;
}

function normalizeUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|spm|ref|source|fbclid|gclid)/i.test(key)) parsed.searchParams.delete(key);
    }
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    return parsed.toString();
  } catch {
    return `${url}`.trim();
  }
}

function domainFromUrl(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function normalizeLoose(value) {
  return `${value || ''}`.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

function firstValue(values) {
  return Array.isArray(values) && values.length > 0 ? values[0] : null;
}

function uniqueStrings(values) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function mdEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function renderMarkdown(worklist) {
  const lines = [];
  lines.push('# AI HOT 已有库人物动态 Backfill Worklist');
  lines.push('');
  lines.push(`生成时间：${worklist.generatedAt}`);
  lines.push(`审计时间：${worklist.inputAuditGeneratedAt || ''}`);
  lines.push('');
  lines.push('## 口径');
  lines.push('');
  lines.push('- 只处理 `peopleExistingCandidates` 命中的已有库人物，不新增 People。');
  lines.push('- X 和媒体转述只保留为发现证据；候选写入前优先补官方、GitHub、论文或其他一手 URL。');
  lines.push('- 去重拦截同 URL，以及同人物 + 同公司 + 同产品/动作 + 近日期的重复候选。');
  lines.push('- 本文件只是 dry-run worklist，不写数据库。');
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  for (const [key, value] of Object.entries(worklist.summary)) {
    lines.push(`| ${mdEscape(key)} | ${mdEscape(value)} |`);
  }
  lines.push('');
  lines.push('## Candidates');
  lines.push('');
  lines.push('| Person | Date | Title | Main source | Discovery | Policy |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const person of worklist.people) {
    for (const candidate of person.candidates) {
      lines.push([
        person.name,
        candidate.date || '',
        candidate.title,
        candidate.primarySourceUrl || '待补一手源',
        candidate.discoverySourceUrl || '',
        candidate.sourcePolicy,
      ].map(mdEscape).join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
    }
  }
  lines.push('');
  lines.push('## People Summary');
  lines.push('');
  lines.push('| Person | Audit events | Worklist | Primary ready | Needs primary |');
  lines.push('| --- | ---: | ---: | ---: | ---: |');
  for (const person of worklist.people) {
    lines.push(`| ${mdEscape(person.name)} | ${person.auditEventCount} | ${person.candidateCount} | ${person.primaryReadyCount} | ${person.needsPrimarySourceCount} |`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
