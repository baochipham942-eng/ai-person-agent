import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_AUDIT = 'docs/audit-2026-06/data/aihot_daily_p0_p1_audit.json';
const DEFAULT_WORKLIST = 'docs/audit-2026-06/data/aihot_existing_people_backfill_worklist.json';
const DEFAULT_OUTPUT_JSON = 'docs/audit-2026-06/data/aihot_existing_people_primary_source_enrichment.json';
const DEFAULT_OUTPUT_MD = 'docs/audit-2026-06/AIHOT_EXISTING_PEOPLE_PRIMARY_SOURCE_ENRICHMENT.md';
const MAIN_REPO = '/Users/linchen/Downloads/ai/ai-person-agent';
const DEFAULT_NEAR_DAYS = 7;

const PRIMARY_SOURCE_KINDS = new Set(['official', 'github', 'paper']);
const DISCOVERY_ONLY_SOURCE_KINDS = new Set(['x', 'rss']);
const READY_OFFICIALNESS = new Set(['company_official', 'official_blog', 'github_release', 'paper']);
const MEDIA_DOMAINS = [
  'arstechnica.com',
  'bloomberg.com',
  'buzzing.cc',
  'fastcompany.com',
  'forbes.com',
  'newsletter.pragmaticengineer.com',
  'runtimewire.com',
  'simonwillison.net',
  'techcrunch.com',
  'theverge.com',
  'tomtunguz.com',
  'wsj.com',
];
const MEDIA_SOURCE_PATTERNS = [
  /Hacker News/i,
  /buzzing\.cc/i,
  /IT之家/i,
  /TechCrunch/i,
  /The Verge/i,
  /Bloomberg/i,
  /中文翻译/i,
  /摘要/i,
];
const OFFICIAL_DOMAIN_PATTERNS = [
  /(^|\.)anthropic\.com$/i,
  /(^|\.)claude\.com$/i,
  /(^|\.)cloudflare\.com$/i,
  /(^|\.)deepmind\.google$/i,
  /(^|\.)github\.blog$/i,
  /(^|\.)github\.com$/i,
  /(^|\.)googleblog\.com$/i,
  /(^|\.)lmsys\.org$/i,
  /(^|\.)microsoft\.com$/i,
  /(^|\.)nvidia\.com$/i,
  /(^|\.)openai\.com$/i,
  /(^|\.)qwen\.ai$/i,
  /(^|\.)x\.ai$/i,
];
const PAPER_DOMAIN_PATTERNS = [
  /(^|\.)arxiv\.org$/i,
  /(^|\.)biorxiv\.org$/i,
  /(^|\.)nature\.com$/i,
  /(^|\.)openreview\.net$/i,
];
const LOW_VALUE_PATTERNS = [
  /点赞/,
  /被指/,
  /政变之夜/,
  /上市前夕/,
  /护城河论点/,
  /教皇没对AGI上头/,
  /90%的人.*浪费/,
  /分道扬镳/,
  /正面交锋/,
  /预测.*白领工作/,
  /融资.*估值/,
  /个人出资/,
  /真正原因并非/,
];
const TOKEN_STOPWORDS = new Set([
  'ai',
  'api',
  'app',
  'blog',
  'ceo',
  'code',
  'data',
  'gpt',
  'llm',
  'model',
  'models',
  'news',
  'openai',
  'anthropic',
  'google',
  'microsoft',
  'nvidia',
  'xai',
  '发布',
  '推出',
  '模型',
  '产品',
  '研究',
  '动态',
  '行业',
]);

async function main() {
  const options = parseArgs(process.argv.slice(2));
  loadEnvFiles([process.cwd(), MAIN_REPO]);
  const { neon } = loadNeon();
  if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');

  const audit = JSON.parse(await readFile(path.resolve(options.audit), 'utf8'));
  const worklist = JSON.parse(await readFile(path.resolve(options.worklist), 'utf8'));
  const sql = neon(process.env.DATABASE_URL);
  const candidates = flattenWorklist(worklist);
  const dbSnapshot = await loadDbSnapshot(sql, candidates);
  const auditSources = buildAuditSources(audit);
  const enriched = applyInterCandidateDuplicateRules(candidates.map(candidate =>
    enrichCandidate(candidate, auditSources, dbSnapshot, options)
  ));
  const report = buildReport(enriched, {
    auditGeneratedAt: audit.generatedAt || null,
    worklistGeneratedAt: worklist.generatedAt || null,
    dbCounts: dbSnapshot.counts,
    options,
  });

  await mkdir(path.dirname(path.resolve(options.outputJson)), { recursive: true });
  await mkdir(path.dirname(path.resolve(options.outputMd)), { recursive: true });
  await writeFile(path.resolve(options.outputJson), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.resolve(options.outputMd), renderMarkdown(report));

  console.log(JSON.stringify({
    outputJson: options.outputJson,
    outputMd: options.outputMd,
    total: report.summary.total,
    ready_to_backfill: report.summary.ready_to_backfill,
    needs_manual_review: report.summary.needs_manual_review,
    discard_duplicate_or_low_value: report.summary.discard_duplicate_or_low_value,
    currentDbUrlMatches: report.summary.currentDbUrlMatches,
    currentDbSemanticMatches: report.summary.currentDbSemanticMatches,
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
    audit: valueOf('audit', DEFAULT_AUDIT),
    worklist: valueOf('worklist', DEFAULT_WORKLIST),
    outputJson: valueOf('output-json', DEFAULT_OUTPUT_JSON),
    outputMd: valueOf('output-md', DEFAULT_OUTPUT_MD),
    nearDays: numberValue('near-days', DEFAULT_NEAR_DAYS),
  };
}

function loadNeon() {
  const localRequire = createRequire(import.meta.url);
  try {
    return localRequire('@neondatabase/serverless');
  } catch (error) {
    if (error?.code !== 'MODULE_NOT_FOUND') throw error;
    return createRequire(path.join(MAIN_REPO, 'package.json'))('@neondatabase/serverless');
  }
}

function loadEnvFiles(roots) {
  for (const root of roots) {
    for (const name of ['.env', '.env.local', '.env.production', '.env.vercel']) {
      const filePath = path.join(root, name);
      if (!existsSync(filePath)) continue;
      const content = readFileSync(filePath, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!match || process.env[match[1]]) continue;
        process.env[match[1]] = stripEnvValue(match[2]);
      }
    }
  }
}

function stripEnvValue(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function flattenWorklist(worklist) {
  return (worklist.people || []).flatMap(person =>
    (person.candidates || []).map(candidate => ({
      matchedPersonId: candidate.personId || person.personId,
      personName: person.name || candidate.personName,
      discoverySourceUrl: candidate.discoverySourceUrl || null,
      discoverySourceName: candidate.discoverySourceName || null,
      discoverySourceKind: candidate.discoverySourceKind || null,
      existingPrimaryUrl: candidate.primarySourceUrl || null,
      existingPrimaryKind: candidate.primarySourceKind || null,
      title: candidate.title,
      date: candidate.date || null,
      eventId: candidate.eventId || null,
      companies: candidate.companies || [],
      actionTokens: candidate.actionTokens || [],
      sections: candidate.sections || [],
      worklistDuplicateKey: candidate.dedupeKeys?.semantic || '',
    }))
  );
}

async function loadDbSnapshot(sql, candidates) {
  const tables = await loadTableSet(sql);
  const personIds = [...new Set(candidates.map(candidate => candidate.matchedPersonId).filter(Boolean))];
  const [rawRows, activityRows, cardRows, peopleRows] = await Promise.all([
    tables.has('RawPoolItem') && personIds.length ? sql`
      SELECT 'RawPoolItem' AS table_name, id, "personId", url, title, "sourceType", "publishedAt"::text AS date
      FROM "RawPoolItem"
      WHERE "personId" = ANY(${personIds})
        AND url IS NOT NULL AND url <> ''
    ` : [],
    tables.has('ActivityEvent') && personIds.length ? sql`
      SELECT 'ActivityEvent' AS table_name, id, "personId", url, title, "sourceType", "occurredAt"::text AS date
      FROM "ActivityEvent"
      WHERE "personId" = ANY(${personIds})
        AND url IS NOT NULL AND url <> ''
    ` : [],
    tables.has('Card') && personIds.length ? sql`
      SELECT 'Card' AS table_name, id, "personId", "sourceUrl" AS url, title, type AS "sourceType", "createdAt"::text AS date
      FROM "Card"
      WHERE "personId" = ANY(${personIds})
        AND "sourceUrl" IS NOT NULL AND "sourceUrl" <> ''
        AND "isActive" = true
    ` : [],
    tables.has('People') && personIds.length ? sql`
      SELECT id, name, "officialLinks", "sourceWhitelist"
      FROM "People"
      WHERE id = ANY(${personIds})
    ` : [],
  ]);
  const rows = [...rawRows, ...activityRows, ...cardRows].map(row => ({
    tableName: row.table_name,
    id: row.id,
    personId: row.personId,
    url: row.url,
    normalizedUrl: normalizeUrl(row.url),
    title: cleanText(row.title),
    sourceType: row.sourceType,
    date: row.date,
    titleTokens: tokenize(row.title),
  }));
  const byUrl = new Map();
  const byPerson = new Map();
  for (const row of rows) {
    if (row.normalizedUrl) {
      if (!byUrl.has(row.normalizedUrl)) byUrl.set(row.normalizedUrl, []);
      byUrl.get(row.normalizedUrl).push(row);
    }
    if (!byPerson.has(row.personId)) byPerson.set(row.personId, []);
    byPerson.get(row.personId).push(row);
  }
  return {
    counts: {
      rawPoolItems: rawRows.length,
      activityEvents: activityRows.length,
      cards: cardRows.length,
      people: peopleRows.length,
    },
    byUrl,
    byPerson,
    people: new Map(peopleRows.map(row => [row.id, row])),
  };
}

async function loadTableSet(sql) {
  const rows = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `;
  return new Set(rows.map(row => row.table_name));
}

function buildAuditSources(audit) {
  const rows = [];
  for (const source of [
    ...(audit.dailyItems || []),
    ...(audit.eventClusters || []),
    ...(audit.contentAbsorptionCandidates || []),
  ]) {
    const url = source.sourceUrl;
    if (!url) continue;
    rows.push(normalizeAuditSource(source, url, source.sourceKind, source.sourceName));
    for (const duplicateUrl of source.duplicateUrls || []) {
      rows.push(normalizeAuditSource(source, duplicateUrl, source.sourceKind, source.sourceName));
    }
  }
  const seen = new Set();
  return rows.filter(row => {
    const key = `${row.eventId || ''}:${row.normalizedUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeAuditSource(source, url, sourceKind, sourceName) {
  const officialness = classifySourceOfficialness({ url, sourceKind, sourceName });
  return {
    eventId: source.eventId || null,
    title: cleanText(source.title),
    date: source.date || firstValue(source.dates),
    sourceUrl: url,
    normalizedUrl: normalizeUrl(url),
    sourceName: sourceName || '',
    sourceKind: inferSourceKind(url, sourceKind),
    sourceOfficialness: officialness,
    people: (source.peopleMatches || []).map(match => ({ id: match.id, label: match.label })),
    organizations: (source.organizationMatches || []).map(org => org.label),
    candidateTerms: source.candidateTerms || [],
    titleTokens: tokenize(source.title),
    termTokens: tokenize([...(source.candidateTerms || []), source.title].join(' ')),
  };
}

function enrichCandidate(candidate, auditSources, dbSnapshot, options) {
  const sourceOptions = choosePrimaryCandidates(candidate, auditSources);
  if (candidate.existingPrimaryUrl) {
    sourceOptions.push({
      sourceUrl: candidate.existingPrimaryUrl,
      normalizedUrl: normalizeUrl(candidate.existingPrimaryUrl),
      sourceKind: inferSourceKind(candidate.existingPrimaryUrl, candidate.existingPrimaryKind),
      sourceOfficialness: classifySourceOfficialness({
        url: candidate.existingPrimaryUrl,
        sourceKind: candidate.existingPrimaryKind,
        sourceName: '',
      }),
      matchScore: 200,
      matchReason: 'worklist_primary',
    });
  }

  const canonical = sourceOptions
    .filter(source => READY_OFFICIALNESS.has(source.sourceOfficialness))
    .sort((left, right) => right.matchScore - left.matchScore || sourceRank(right) - sourceRank(left))[0] || null;
  const canonicalUrl = canonical?.sourceUrl || null;
  const sourceOfficialness = canonical?.sourceOfficialness ||
    classifySourceOfficialness({
      url: candidate.discoverySourceUrl,
      sourceKind: candidate.discoverySourceKind,
      sourceName: candidate.discoverySourceName,
    });
  const duplicateKey = buildDuplicateKey(candidate, canonicalUrl);
  const dbUrlMatches = findDbUrlMatches(candidate, canonicalUrl, dbSnapshot);
  const dbSemanticMatches = findDbSemanticMatches(candidate, dbSnapshot, options.nearDays);
  const lowValueReasons = findLowValueReasons(candidate, sourceOfficialness, canonicalUrl);

  let category = 'needs_manual_review';
  let recommendedAction = 'find_primary_source';
  let unresolvedReason = canonicalUrl ? null : 'no_canonical_primary_source_found';

  if (dbUrlMatches.length || dbSemanticMatches.length) {
    category = 'discard_duplicate_or_low_value';
    recommendedAction = 'discard_existing_duplicate';
    unresolvedReason = dbUrlMatches.length
      ? 'current_db_already_has_same_url'
      : 'current_db_has_same_person_company_action_near_date';
  } else if (lowValueReasons.length) {
    category = 'discard_duplicate_or_low_value';
    recommendedAction = 'discard_low_value';
    unresolvedReason = lowValueReasons.join('; ');
  } else if (canonicalUrl && READY_OFFICIALNESS.has(sourceOfficialness)) {
    category = 'ready_to_backfill';
    recommendedAction = 'backfill_rawpool_then_materialize_activity';
    unresolvedReason = null;
  }

  return {
    category,
    matchedPersonId: candidate.matchedPersonId,
    personName: candidate.personName,
    discoverySourceUrl: candidate.discoverySourceUrl,
    canonicalPrimaryUrl: canonicalUrl,
    title: candidate.title,
    date: candidate.date,
    sourceOfficialness,
    duplicateKey,
    recommendedAction,
    unresolvedReason,
    eventId: candidate.eventId,
    discoverySourceName: candidate.discoverySourceName,
    discoverySourceKind: candidate.discoverySourceKind,
    candidatePrimarySources: sourceOptions
      .sort((left, right) => right.matchScore - left.matchScore)
      .slice(0, 5)
      .map(source => ({
        url: source.sourceUrl,
        sourceKind: source.sourceKind,
        sourceOfficialness: source.sourceOfficialness,
        matchScore: source.matchScore,
        matchReason: source.matchReason,
      })),
    currentDbMatches: {
      exactUrl: dbUrlMatches.map(summarizeDbMatch),
      semantic: dbSemanticMatches.map(summarizeDbMatch),
    },
  };
}

function choosePrimaryCandidates(candidate, auditSources) {
  const rows = [];
  const candidateTokens = new Set([
    ...tokenize(candidate.title),
    ...tokenize(candidate.actionTokens.join(' ')),
  ]);
  const companyTokens = new Set(tokenize(candidate.companies.join(' ')));

  for (const source of auditSources) {
    if (!READY_OFFICIALNESS.has(source.sourceOfficialness)) continue;
    const sameEvent = candidate.eventId && source.eventId === candidate.eventId;
    const dateDistance = dateDistanceDays(candidate.date, source.date);
    const nearDate = dateDistance !== null && dateDistance <= 3;
    const personMatch = source.people.some(person =>
      person.id === candidate.matchedPersonId || normalizeLoose(person.label) === normalizeLoose(candidate.personName)
    );
    const orgOverlap = overlapCount(companyTokens, new Set(tokenize(source.organizations.join(' '))));
    const tokenOverlap = overlapCount(candidateTokens, new Set([...source.titleTokens, ...source.termTokens]));
    const titleSimilarity = jaccard(candidateTokens, new Set(source.titleTokens));

    let score = 0;
    const reasons = [];
    if (sameEvent) {
      score += 120;
      reasons.push('same_event_id');
    }
    if (personMatch) {
      score += 40;
      reasons.push('same_person');
    }
    if (nearDate) {
      score += Math.max(0, 24 - dateDistance * 4);
      reasons.push(`near_date_${dateDistance}d`);
    }
    if (orgOverlap) {
      score += Math.min(30, orgOverlap * 10);
      reasons.push(`org_overlap_${orgOverlap}`);
    }
    if (tokenOverlap) {
      score += Math.min(35, tokenOverlap * 7);
      reasons.push(`token_overlap_${tokenOverlap}`);
    }
    if (titleSimilarity >= 0.35) {
      score += Math.round(titleSimilarity * 40);
      reasons.push(`title_similarity_${titleSimilarity.toFixed(2)}`);
    }

    if (score < 70) continue;
    rows.push({
      ...source,
      matchScore: score + sourceRank(source),
      matchReason: reasons.join(','),
    });
  }
  return rows;
}

function findDbUrlMatches(candidate, canonicalUrl, dbSnapshot) {
  const keys = [canonicalUrl, candidate.discoverySourceUrl]
    .map(normalizeUrl)
    .filter(Boolean);
  const matches = [];
  for (const key of keys) {
    for (const row of dbSnapshot.byUrl.get(key) || []) {
      matches.push(row);
    }
  }
  return uniqueDbRows(matches);
}

function findDbSemanticMatches(candidate, dbSnapshot, nearDays) {
  const rows = dbSnapshot.byPerson.get(candidate.matchedPersonId) || [];
  const blockedTokens = new Set(tokenize([candidate.personName, candidate.companies.join(' ')].join(' ')));
  const candidateTokens = new Set(
    tokenize([candidate.title, candidate.actionTokens.join(' ')].join(' '))
      .filter(token => !blockedTokens.has(token))
  );
  if (candidateTokens.size < 2) return [];
  const matches = [];
  for (const row of rows) {
    if (!isNearDate(candidate.date, row.date, nearDays)) continue;
    const rowTokens = new Set(row.titleTokens.filter(token => !blockedTokens.has(token)));
    if (rowTokens.size < 3) continue;
    const overlap = overlapCount(candidateTokens, rowTokens);
    const similarity = jaccard(candidateTokens, rowTokens);
    if (overlap >= 3 && similarity >= 0.2) matches.push(row);
  }
  return uniqueDbRows(matches);
}

function findLowValueReasons(candidate, sourceOfficialness, canonicalUrl) {
  const reasons = [];
  const lowValueTitle = LOW_VALUE_PATTERNS.some(pattern => pattern.test(candidate.title));
  if (!canonicalUrl && lowValueTitle) {
    reasons.push('low_value_or_gossip_title_without_primary_source');
  }
  if (!canonicalUrl && sourceOfficialness === 'media_or_curator' && lowValueTitle) {
    reasons.push('media_or_curator_discovery_with_low_value_title');
  }
  return reasons;
}

function applyInterCandidateDuplicateRules(items) {
  const grouped = new Map();
  for (const item of items) {
    const key = normalizeUrl(item.canonicalPrimaryUrl || '');
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }

  for (const group of grouped.values()) {
    if (group.length < 2) continue;
    const keep = [...group].sort(compareCanonicalDuplicatePriority)[0];
    for (const item of group) {
      if (item === keep) continue;
      item.category = 'discard_duplicate_or_low_value';
      item.recommendedAction = 'discard_duplicate_candidate';
      item.unresolvedReason = `same_canonical_primary_url_as:${keep.matchedPersonId}:${keep.title}`;
    }
  }
  return items;
}

function compareCanonicalDuplicatePriority(left, right) {
  const leftExact = normalizeUrl(left.canonicalPrimaryUrl || '') === normalizeUrl(left.discoverySourceUrl || '') ? 1 : 0;
  const rightExact = normalizeUrl(right.canonicalPrimaryUrl || '') === normalizeUrl(right.discoverySourceUrl || '') ? 1 : 0;
  if (leftExact !== rightExact) return rightExact - leftExact;
  return String(left.date || '').localeCompare(String(right.date || ''));
}

function buildReport(items, context) {
  const categories = {
    ready_to_backfill: items.filter(item => item.category === 'ready_to_backfill'),
    needs_manual_review: items.filter(item => item.category === 'needs_manual_review'),
    discard_duplicate_or_low_value: items.filter(item => item.category === 'discard_duplicate_or_low_value'),
  };
  return {
    generatedAt: new Date().toISOString(),
    inputs: {
      auditGeneratedAt: context.auditGeneratedAt,
      worklistGeneratedAt: context.worklistGeneratedAt,
      auditPath: context.options.audit,
      worklistPath: context.options.worklist,
    },
    scope: {
      dryRun: true,
      dbReadOnly: true,
      noRawPoolWrites: true,
      noActivityEventWrites: true,
      canonicalPrimaryPolicy: 'official/company announcement/GitHub release/paper only; X and media remain discovery evidence',
      nearDuplicateDays: context.options.nearDays,
    },
    dbCounts: context.dbCounts,
    summary: {
      total: items.length,
      ready_to_backfill: categories.ready_to_backfill.length,
      needs_manual_review: categories.needs_manual_review.length,
      discard_duplicate_or_low_value: categories.discard_duplicate_or_low_value.length,
      currentDbUrlMatches: items.filter(item => item.currentDbMatches.exactUrl.length > 0).length,
      currentDbSemanticMatches: items.filter(item => item.currentDbMatches.semantic.length > 0).length,
      noCanonicalPrimarySource: items.filter(item => item.unresolvedReason === 'no_canonical_primary_source_found').length,
    },
    categories,
    items,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# AI HOT Existing People Primary Source Enrichment');
  lines.push('');
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('- Dry-run only; no RawPoolItem, ActivityEvent, Card, or People writes.');
  lines.push('- Canonical primary URL must be official/company/GitHub release/paper. X and media stay discovery-only.');
  lines.push('- Current DB is used only for duplicate checks.');
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | ---: |');
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`| ${mdEscape(key)} | ${value} |`);
  }
  lines.push('');
  for (const category of ['ready_to_backfill', 'needs_manual_review', 'discard_duplicate_or_low_value']) {
    lines.push(`## ${category}`);
    lines.push('');
    lines.push('| Person | Date | Title | Canonical primary | Discovery | Officialness | Action | Unresolved |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const item of report.categories[category]) {
      lines.push(`| ${mdEscape(item.personName)} | ${mdEscape(item.date || '')} | ${mdEscape(item.title)} | ${mdEscape(item.canonicalPrimaryUrl || '')} | ${mdEscape(item.discoverySourceUrl || '')} | ${mdEscape(item.sourceOfficialness)} | ${mdEscape(item.recommendedAction)} | ${mdEscape(item.unresolvedReason || '')} |`);
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function classifySourceOfficialness({ url, sourceKind, sourceName }) {
  const domain = domainFromUrl(url);
  const text = `${sourceName || ''} ${url || ''}`;
  if (!url) return 'none';
  if (MEDIA_SOURCE_PATTERNS.some(pattern => pattern.test(text)) || MEDIA_DOMAINS.some(media => domain === media || domain.endsWith(`.${media}`))) {
    return 'media_or_curator';
  }
  if (domain === 'x.com' || domain === 'twitter.com' || DISCOVERY_ONLY_SOURCE_KINDS.has(sourceKind)) return 'social_or_rss_discovery';
  if (PAPER_DOMAIN_PATTERNS.some(pattern => pattern.test(domain)) || sourceKind === 'paper') return 'paper';
  if (domain === 'github.com' && /\/releases\/tag\//.test(url || '')) return 'github_release';
  if (domain === 'github.com' || sourceKind === 'github') return 'github';
  if (OFFICIAL_DOMAIN_PATTERNS.some(pattern => pattern.test(domain)) || sourceKind === 'official') {
    if (/blog|news|research|docs|developer|release/i.test(url || sourceName || '')) return 'official_blog';
    return 'company_official';
  }
  return 'third_party_web';
}

function inferSourceKind(url, fallback) {
  const officialness = classifySourceOfficialness({ url, sourceKind: fallback, sourceName: '' });
  if (officialness === 'paper') return 'paper';
  if (officialness === 'github' || officialness === 'github_release') return 'github';
  if (READY_OFFICIALNESS.has(officialness)) return 'official';
  return fallback || 'web';
}

function sourceRank(source) {
  const ranks = {
    company_official: 40,
    official_blog: 38,
    github_release: 35,
    paper: 32,
    github: 22,
    third_party_web: 8,
    media_or_curator: 2,
    social_or_rss_discovery: 1,
  };
  return ranks[source.sourceOfficialness] || 0;
}

function buildDuplicateKey(candidate, canonicalUrl) {
  const person = candidate.matchedPersonId || candidate.personName;
  const company = tokenize(candidate.companies.join(' ')).slice(0, 4).sort().join('+') || 'unknown_company';
  const action = tokenize([candidate.title, candidate.actionTokens.join(' ')].join(' ')).slice(0, 8).sort().join('+') || 'unknown_action';
  const dateBucket = String(candidate.date || '').slice(0, 10) || 'unknown_date';
  const primary = normalizeUrl(canonicalUrl || candidate.discoverySourceUrl || '');
  return `${person}|${dateBucket}|${company}|${action}|${primary}`;
}

function summarizeDbMatch(row) {
  return {
    table: row.tableName,
    id: row.id,
    personId: row.personId,
    title: row.title,
    url: row.url,
    date: row.date,
  };
}

function uniqueDbRows(rows) {
  const seen = new Set();
  const result = [];
  for (const row of rows) {
    const key = `${row.tableName}:${row.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }
  return result;
}

function overlapCount(left, right) {
  let count = 0;
  for (const value of left) {
    if (right.has(value)) count += 1;
  }
  return count;
}

function jaccard(left, right) {
  const union = new Set([...left, ...right]);
  if (union.size === 0) return 0;
  return overlapCount(left, right) / union.size;
}

function tokenize(value) {
  return `${value || ''}`
    .normalize('NFKC')
    .toLowerCase()
    .match(/[\p{Script=Han}]{2,}|[a-z0-9][a-z0-9.+-]{1,}/gu)
    ?.map(token => token.trim())
    .filter(token => token && !TOKEN_STOPWORDS.has(token)) || [];
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
    return String(url).trim();
  }
}

function domainFromUrl(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function dateDistanceDays(left, right) {
  const leftTime = Date.parse(left || '');
  const rightTime = Date.parse(right || '');
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return null;
  return Math.round(Math.abs(leftTime - rightTime) / (24 * 60 * 60 * 1000));
}

function isNearDate(left, right, nearDays) {
  const distance = dateDistanceDays(left, right);
  if (distance === null) return false;
  return distance <= nearDays;
}

function normalizeLoose(value) {
  return `${value || ''}`.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

function firstValue(values) {
  return Array.isArray(values) && values.length ? values[0] : null;
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function mdEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
