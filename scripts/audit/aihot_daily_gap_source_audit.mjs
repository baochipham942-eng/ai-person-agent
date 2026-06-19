import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

const AIHOT_BASE_URL = 'https://aihot.virxact.com';
const AIHOT_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 aihot-p0-p1-audit/0.1.0';

const SECTION_WEIGHTS = {
  '模型发布/更新': 5,
  '产品发布/更新': 5,
  '行业动态': 4,
  '论文研究': 3,
  '技巧与观点': 2,
  '快讯': 2,
};

const STOP_TERMS = new Set([
  'AI',
  'API',
  'AGI',
  'LLM',
  'GPU',
  'CEO',
  'CTO',
  'RSS',
  'REST',
  'Open',
  'Read',
  'More',
  'The',
  'This',
  'That',
  'With',
  'For',
  'And',
  'Via',
]);

const PERSON_ALIAS_BLOCKLIST = new Set([
  'cursor',
  'claude',
  'codex',
  'gemini',
  'chatgpt',
  'openai',
  'anthropic',
  'deepmind',
  'alibaba',
  'apple',
  'berkeley',
  'bloomberg',
  'cloudflare',
  'cohere',
  'deepseek',
  'github',
  'google',
  'hugging face',
  'kimi',
  'meta',
  'microsoft',
  'mistral',
  'nvidia',
  'qwen',
  'runway',
  'spacex',
  'xai',
]);

const GENERIC_EVENT_TERMS = new Set([
  'ai',
  'agent',
  'agentic',
  'agents',
  'api',
  'app',
  'apps',
  'blog',
  'chatbot',
  'claude',
  'code',
  'codex',
  'data',
  'developer',
  'developers',
  'gemini',
  'gpt',
  'model',
  'models',
  'alibaba',
  'anthropic',
  'apple',
  'berkeley',
  'bloomberg',
  'cloudflare',
  'cohere',
  'deepmind',
  'deepseek',
  'github',
  'google',
  'hugging face',
  'kimi',
  'meta',
  'microsoft',
  'mistral',
  'nvidia',
  'openai',
  'qwen',
  'runway',
  'spacex',
  'xai',
  'product',
  'research',
  'team',
  'web',
  '版本',
  '发布',
  '推出',
  '模型',
  '产品',
  '研究',
  '智能体',
]);

const SOURCE_KIND_PREFERENCE = {
  official: 6,
  github: 5,
  paper: 4,
  x: 3,
  rss: 2,
  web: 1,
};

const DISCOVERY_ONLY_SOURCE_PATTERNS = [
  /IT之家/,
  /Hacker News 热门/,
  /buzzing\.cc/i,
  /中文翻译/,
  /摘要/i,
];

const COMPANY_OWNER_HINTS = [
  { pattern: /\bOpenAI\b|\bChatGPT\b|OpenAI Developers|openai\.com/i, label: 'OpenAI' },
  { pattern: /\bAnthropic\b|\bClaude\b|anthropic\.com/i, label: 'Anthropic' },
  { pattern: /\bxAI\b|\bGrok\b|x\.ai/i, label: 'xAI' },
  { pattern: /\bQwen\b|通义千问|阿里云|Alibaba Cloud|\bAlibaba\b/i, label: 'Alibaba' },
  { pattern: /\bRunway\b/i, label: 'Runway' },
  { pattern: /\bHugging Face\b|huggingface\.co/i, label: 'Hugging Face' },
  { pattern: /\bNVIDIA\b|英伟达|nvidia\.com/i, label: 'NVIDIA' },
  { pattern: /\bMicrosoft\b|微软|microsoft\.com/i, label: 'Microsoft' },
  { pattern: /\bGoogle DeepMind\b|\bDeepMind\b|deepmind\.google/i, label: 'Google DeepMind' },
  { pattern: /\bGoogle\b|\bGemini\b|googleblog\.com|google\.com/i, label: 'Google' },
  { pattern: /\bTencent\b|腾讯|混元/i, label: 'Tencent' },
  { pattern: /\bMiniMax\b|稀宇/i, label: 'MiniMax' },
  { pattern: /\bSenseTime\b|商汤/i, label: 'SenseTime' },
  { pattern: /\bPerplexity\b/i, label: 'Perplexity' },
  { pattern: /\bReplit\b/i, label: 'Replit' },
  { pattern: /\bOpenRouter\b/i, label: 'OpenRouter' },
  { pattern: /\bBloomberg\b/i, label: 'Bloomberg' },
  { pattern: /\bTechCrunch\b/i, label: 'TechCrunch' },
  { pattern: /\bThe Decoder\b/i, label: 'The Decoder' },
  { pattern: /\bThe Verge\b/i, label: 'The Verge' },
  { pattern: /\bApple\b|apple\.com/i, label: 'Apple Inc.' },
  { pattern: /\bCloudflare\b|cloudflare\.com/i, label: 'Cloudflare' },
  { pattern: /\bGitHub\b/i, label: 'GitHub' },
  { pattern: /\bLMSYS\b|\bChatbot Arena\b/i, label: 'LMSYS' },
  { pattern: /\bDataGuidance\b/i, label: 'DataGuidance' },
  { pattern: /\bKrea\b/i, label: 'Krea' },
  { pattern: /\bLuma\b/i, label: 'Luma AI' },
  { pattern: /\bCartesia\b/i, label: 'Cartesia' },
  { pattern: /\bOpenBMB\b|面壁/i, label: 'OpenBMB' },
  { pattern: /\bCognition\b|\bDevin\b/i, label: 'Cognition' },
  { pattern: /\bMistral\b/i, label: 'Mistral AI' },
  { pattern: /\bCohere\b/i, label: 'Cohere' },
  { pattern: /\bMeta\b|\bLlama\b/i, label: 'Meta' },
];

const NON_PERSON_SOURCE_DISPLAY_TERMS = [
  'ai',
  'app',
  'apps',
  'blog',
  'cloud',
  'code',
  'daily',
  'developers',
  'docs',
  'github',
  'labs',
  'news',
  'notes',
  'product',
  'research',
  'team',
  'tech',
  'tools',
];

const IGNORED_SOURCE_OWNER_LABELS = new Set([
  'x.com',
  'twitter',
  'github',
]);

const MEDIA_OR_CURATOR_OWNER_LABELS = new Set([
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

const PERSON_NAME_WORD_BLOCKLIST = new Set([
  'adaptive',
  'agent',
  'agentic',
  'agents',
  'after',
  'altimeter',
  'analysis',
  'apollo',
  'app',
  'artificial',
  'ask',
  'assistant',
  'attention',
  'audio',
  'banana',
  'bench',
  'benchmark',
  'bucket',
  'berkshire',
  'build',
  'capital',
  'case',
  'center',
  'chatbot',
  'channel',
  'clinic',
  'cloud',
  'code',
  'codex',
  'coding',
  'computer',
  'content',
  'cowork',
  'corp',
  'corporate',
  'creative',
  'cut',
  'day',
  'daily',
  'data',
  'datasette',
  'developer',
  'developers',
  'diffusion',
  'discovery',
  'deployment',
  'distillation',
  'direct',
  'dynamic',
  'edit',
  'embedding',
  'enterprise',
  'fair',
  'fetch',
  'finance',
  'folha',
  'fort',
  'forward',
  'foundry',
  'foundation',
  'futures',
  'global',
  'granite',
  'grupo',
  'hathaway',
  'her',
  'heartland',
  'higgs',
  'hours',
  'hub',
  'human',
  'humanness',
  'humanitas',
  'image',
  'index',
  'industrial',
  'intelligence',
  'inverse',
  'isaac',
  'job',
  'law',
  'launch',
  'learning',
  'labs',
  'lite',
  'magnifica',
  'management',
  'mason',
  'mayo',
  'menlo',
  'meridian',
  'mini',
  'model',
  'models',
  'multimodal',
  'multilingual',
  'mythos',
  'news',
  'open',
  'optimization',
  'paper',
  'policy',
  'plan',
  'primitives',
  'preview',
  'preference',
  'product',
  'project',
  'quick',
  'release',
  'report',
  'reachy',
  'resource',
  'research',
  'repo',
  'robot',
  'robots',
  'scanner',
  'searcher',
  'safety',
  'service',
  'simulation',
  'sim',
  'solutions',
  'source',
  'sparse',
  'spec',
  'studio',
  'startup',
  'stats',
  'strands',
  'strategic',
  'tech',
  'token',
  'transformer',
  'trae',
  'universe',
  'update',
  'ventures',
  'verified',
  'video',
  'visual',
  'web',
  'work',
  'worker',
  'workers',
  'workflow',
  'workflows',
  'alto',
  'atlas',
  'caching',
  'control',
  'golf',
  'helper',
  'mode',
  'multi',
  'nemotron',
  'networks',
  'notice',
  'now',
  'one',
  'pakistan',
  'palo',
  'parameter',
  'persona',
  'quality',
  'ray',
  'reconstruction',
  'regression',
  'remote',
  'response',
  'summit',
  'testing',
  'thing',
  'turn',
  'ulis',
  'ultra',
  'useful',
  'world',
  'access',
  'business',
  'games',
  'history',
  'live',
  'media',
  'riot',
  'save',
  'scaling',
  'search',
  'services',
  'small',
  'toolkit',
  'trusted',
]);

const PERSON_ROLE_CONTEXT_RE =
  /\b(founder|co-founder|ceo|cto|chief scientist|researcher|professor|engineer|creator|author|lead|head of)\b|创始人|联合创始人|负责人|科学家|研究员|教授|作者|主导|领衔/i;

const WEAK_PERSON_SOURCE_RE = /(^x:)|x\.com|twitter\.com|linkedin\.com/i;

const DEFAULT_JSON_OUTPUT = 'docs/audit-2026-06/data/aihot_daily_p0_p1_audit.json';
const DEFAULT_MD_OUTPUT = 'docs/audit-2026-06/AIHOT_DAILY_P0_P1_AUDIT.md';

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL) {
    throw new Error('Missing DATABASE_URL');
  }

  const sql = neon(process.env.DATABASE_URL);
  const [tables, aihotIndex] = await Promise.all([
    loadTableSet(sql),
    fetchAihotDailyIndex(options.take),
  ]);
  const dbSnapshot = await loadDbSnapshot(sql, tables);
  const dailyReports = await fetchDailyReports(aihotIndex.items, options);
  const dailyItems = flattenDailyReports(dailyReports);
  const audit = buildAudit({
    options,
    tables,
    dbSnapshot,
    aihotIndex,
    dailyReports,
    dailyItems,
  });

  await writeJson(options.outputJson, audit);
  await writeMarkdown(options.outputMd, renderMarkdown(audit));

  printSummary(audit, options);
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
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error(`Invalid --${name}: ${raw}`);
    }
    return parsed;
  };

  return {
    take: Math.min(numberValue('take', 50), 180),
    sleepMs: numberValue('sleep-ms', 120),
    gapLimit: numberValue('gap-limit', 60),
    sourceLimit: numberValue('source-limit', 40),
    outputJson: valueOf('output-json', DEFAULT_JSON_OUTPUT),
    outputMd: valueOf('output-md', DEFAULT_MD_OUTPUT),
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

async function loadDbSnapshot(sql, tables) {
  const [
    peopleRows,
    organizationRows,
    rawPoolRows,
    activityRows,
    cardRows,
    qaRows,
    courseRows,
    relationRows,
    knowledgeRows,
    companyRows,
  ] = await Promise.all([
    queryPeople(sql, tables),
    queryOrganizations(sql, tables),
    queryRawPool(sql, tables),
    queryActivityEvents(sql, tables),
    queryCards(sql, tables),
    queryQaAudit(sql, tables),
    queryCourses(sql, tables),
    queryPersonRelations(sql, tables),
    queryKnowledgeSources(sql, tables),
    queryCompanySources(sql, tables),
  ]);

  const urlCoverage = new Map();
  const domainCoverage = new Map();
  const sourceWhitelistDomains = new Map();
  const contentRows = [];
  const addCoveredUrl = (url, tableName, title = '', metadata = {}) => {
    const key = normalizeUrl(url);
    if (!key) return;
    if (!urlCoverage.has(key)) {
      urlCoverage.set(key, { url, tables: new Set(), titles: [] });
    }
    const entry = urlCoverage.get(key);
    entry.tables.add(tableName);
    if (title) entry.titles.push(title);

    const domain = sourceKeyFromUrl(url);
    if (domain) incrementMap(domainCoverage, domain, 1);
    if (title) {
      contentRows.push({
        tableName,
        url,
        normalizedUrl: key,
        sourceKey: domain || sourceKey(url, ''),
        title,
        sourceType: metadata.sourceType || metadata.sourceKind || metadata.type || metadata.platform || '',
        publishedAt: metadata.publishedAt || metadata.occurredAt || metadata.fetchedAt || null,
        signatureTokens: buildStandaloneSignatureTokens(`${title} ${metadata.sourceType || metadata.sourceKind || ''}`),
        textTokens: buildTextTokens(title),
      });
    }
  };

  for (const row of rawPoolRows) addCoveredUrl(row.url, 'RawPoolItem', row.title, row);
  for (const row of activityRows) addCoveredUrl(row.url, 'ActivityEvent', row.title, row);
  for (const row of cardRows) addCoveredUrl(row.sourceUrl, 'Card', row.title, row);
  for (const row of qaRows) addCoveredUrl(row.url, 'QAAuditLog', '', row);
  for (const row of courseRows) addCoveredUrl(row.url, 'Course', row.title, row);
  for (const row of relationRows) addCoveredUrl(row.evidenceUrl, 'PersonRelation', '', row);
  for (const row of knowledgeRows) addCoveredUrl(row.url, 'KnowledgeSource', row.title, row);
  for (const row of companyRows) addCoveredUrl(row.url, 'CompanySource', row.title, row);

  const orgAliases = [];
  const orgLabels = new Map();
  const organizationByAlias = new Map();
  for (const org of organizationRows) {
    for (const alias of uniqueNonEmpty([org.name, org.nameZh])) {
      if (!isUsableAlias(alias, 'organization')) continue;
      orgAliases.push({ id: org.id, label: org.nameZh || org.name, alias, source: 'Organization' });
      orgLabels.set(normalizeLoose(alias), org.nameZh || org.name);
      organizationByAlias.set(normalizeLoose(alias), {
        id: org.id,
        label: org.nameZh || org.name,
        name: org.name,
        nameZh: org.nameZh,
        type: org.type,
      });
    }
  }

  for (const person of peopleRows) {
    for (const organization of person.organization || []) {
      if (!isUsableAlias(organization, 'organization')) continue;
      const key = normalizeLoose(organization);
      if (!orgLabels.has(key)) orgLabels.set(key, organization);
      orgAliases.push({
        id: null,
        label: orgLabels.get(key),
        alias: organization,
        source: 'People.organization',
      });
    }
  }

  const orgAliasKeys = new Set(orgAliases.map(alias => normalizeLoose(alias.alias)));
  const peopleAliases = [];
  for (const person of peopleRows) {
    for (const alias of uniqueNonEmpty([person.name, ...(person.aliases || [])])) {
      if (!isUsableAlias(alias, 'person')) continue;
      const aliasKey = normalizeLoose(alias);
      if (PERSON_ALIAS_BLOCKLIST.has(aliasKey) || orgAliasKeys.has(aliasKey)) continue;
      peopleAliases.push({
        id: person.id,
        label: person.name,
        alias,
        status: person.status,
        source: 'People',
        currentTitle: person.currentTitle,
        organization: person.organization || [],
        roleCategory: person.roleCategory,
        influenceScore: person.influenceScore,
      });
    }

    for (const whitelist of person.sourceWhitelist || []) {
      const domain = sourceKeyFromUrl(whitelist);
      if (domain) incrementMap(sourceWhitelistDomains, domain, 1);
    }
  }

  return {
    counts: {
      people: peopleRows.length,
      organizations: organizationRows.length,
      rawPoolItems: rawPoolRows.length,
      activityEvents: activityRows.length,
      cardsWithSource: cardRows.length,
      qaAuditRows: qaRows.length,
      courses: courseRows.length,
      personRelationsWithEvidence: relationRows.length,
      knowledgeSources: knowledgeRows.length,
      companySources: companyRows.length,
      coveredUrls: urlCoverage.size,
      coveredDomains: domainCoverage.size,
    },
    peopleRows,
    organizationRows,
    peopleAliases,
    orgAliases,
    orgLabels,
    organizationByAlias,
    peopleById: new Map(peopleRows.map(person => [person.id, person])),
    peopleByName: new Map(peopleRows.map(person => [normalizeLoose(person.name), person])),
    urlCoverage,
    domainCoverage,
    sourceWhitelistDomains,
    contentRows,
  };
}

async function queryPeople(sql, tables) {
  if (!tables.has('People')) return [];
  return sql`
    SELECT id, name, aliases, organization, topics, status, "currentTitle", products, "sourceWhitelist", "roleCategory", "influenceScore"
    FROM "People"
    ORDER BY name ASC
  `;
}

async function queryOrganizations(sql, tables) {
  if (!tables.has('Organization')) return [];
  return sql`
    SELECT id, name, "nameZh", type
    FROM "Organization"
    ORDER BY name ASC
  `;
}

async function queryRawPool(sql, tables) {
  if (!tables.has('RawPoolItem')) return [];
  return sql`
    SELECT url, title, "sourceType", "publishedAt", "fetchedAt"
    FROM "RawPoolItem"
    WHERE url IS NOT NULL AND url <> ''
  `;
}

async function queryActivityEvents(sql, tables) {
  if (!tables.has('ActivityEvent')) return [];
  return sql`
    SELECT url, title, "sourceType", "occurredAt", topics, organizations
    FROM "ActivityEvent"
    WHERE url IS NOT NULL AND url <> ''
  `;
}

async function queryCards(sql, tables) {
  if (!tables.has('Card')) return [];
  return sql`
    SELECT "sourceUrl", title, type
    FROM "Card"
    WHERE "sourceUrl" IS NOT NULL AND "sourceUrl" <> ''
  `;
}

async function queryQaAudit(sql, tables) {
  if (!tables.has('QAAuditLog')) return [];
  return sql`
    SELECT url, "sourceType", verdict
    FROM "QAAuditLog"
    WHERE url IS NOT NULL AND url <> ''
  `;
}

async function queryCourses(sql, tables) {
  if (!tables.has('Course')) return [];
  return sql`
    SELECT url, title, platform
    FROM "Course"
    WHERE url IS NOT NULL AND url <> ''
  `;
}

async function queryPersonRelations(sql, tables) {
  if (!tables.has('PersonRelation')) return [];
  return sql`
    SELECT "evidenceUrl", "relationType"
    FROM "PersonRelation"
    WHERE "evidenceUrl" IS NOT NULL AND "evidenceUrl" <> ''
  `;
}

async function queryKnowledgeSources(sql, tables) {
  if (!tables.has('KnowledgeSource')) return [];
  return sql`
    SELECT url, title, "sourceKind"
    FROM "KnowledgeSource"
    WHERE url IS NOT NULL AND url <> ''
  `;
}

async function queryCompanySources(sql, tables) {
  if (!tables.has('CompanySource')) return [];
  return sql`
    SELECT url, title, "sourceKind", role
    FROM "CompanySource"
    WHERE url IS NOT NULL AND url <> ''
  `;
}

async function fetchAihotDailyIndex(take) {
  return fetchJson(`${AIHOT_BASE_URL}/api/public/dailies?take=${take}`);
}

async function fetchDailyReports(items, options) {
  const reports = [];
  for (const item of items) {
    try {
      const report = await fetchJson(`${AIHOT_BASE_URL}/api/public/daily/${item.date}`);
      reports.push(report);
    } catch (error) {
      reports.push({
        date: item.date,
        fetchError: error.message,
        sections: [],
        flashes: [],
      });
    }
    if (options.sleepMs > 0) await sleep(options.sleepMs);
  }
  return reports;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': AIHOT_UA,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  return response.json();
}

function flattenDailyReports(reports) {
  const rows = [];
  for (const report of reports) {
    for (const section of report.sections || []) {
      for (const item of section.items || []) {
        rows.push(normalizeDailyItem(report.date, section.label, item, 'section'));
      }
    }
    for (const item of report.flashes || []) {
      rows.push(normalizeDailyItem(report.date, '快讯', item, 'flash'));
    }
  }
  return rows;
}

function normalizeDailyItem(date, section, item, itemKind) {
  const sourceUrl = item.sourceUrl || item.url || '';
  const sourceName = item.sourceName || item.source || '';
  return {
    date,
    section,
    itemKind,
    title: item.title || '',
    summary: item.summary || '',
    sourceName,
    sourceUrl,
    normalizedUrl: normalizeUrl(sourceUrl),
    sourceKey: sourceKey(sourceUrl, sourceName),
    sourceKind: inferSourceKind(sourceUrl, sourceName),
  };
}

function buildAudit({ options, tables, dbSnapshot, aihotIndex, dailyReports, dailyItems }) {
  const enrichedItems = dailyItems.map(item => enrichItem(item, dbSnapshot));
  const eventClusters = attachLibraryMatches(buildEventClusters(enrichedItems), dbSnapshot);
  const sourceCandidates = buildSourceCandidates(enrichedItems, dbSnapshot, options);
  const sourceAbsorptionCandidates = buildSourceAbsorptionCandidates(eventClusters, dbSnapshot, options);
  const allContentAbsorptionCandidates = buildContentAbsorptionCandidates(eventClusters, options);
  const sourceIntakeCandidates = sourceAbsorptionCandidates
    .filter(source => isSourceIntakeRecommendation(source.recommendation))
    .slice(0, options.sourceLimit);
  const sourceDiscoveryOnlyCandidates = sourceAbsorptionCandidates
    .filter(source => !isSourceIntakeRecommendation(source.recommendation))
    .slice(0, options.sourceLimit);
  const contentKnownEntityCandidates = allContentAbsorptionCandidates
    .filter(item => item.peopleMatches.length > 0 || item.organizationMatches.length > 0)
    .slice(0, options.gapLimit);
  const contentNewSignalCandidates = buildContentNewSignalCandidates(eventClusters, options);
  const contentAbsorptionCandidates = uniqueByEventId([
    ...contentKnownEntityCandidates,
    ...contentNewSignalCandidates,
  ]);
  const companyAbsorptionCandidates = buildCompanyAbsorptionCandidates(eventClusters, dbSnapshot, options);
  const peopleAbsorption = buildPeopleAbsorptionCandidates(eventClusters, dbSnapshot, options);
  const primarySourceCandidates = sourceCandidates
    .filter(source => ['x', 'official', 'github'].includes(source.sourceKind))
    .slice(0, 30);
  const gapCandidates = buildGapCandidates(eventClusters, options);
  const potentialNewEntitySignals = buildPotentialNewEntitySignals(eventClusters, options);
  const duplicateEventClusters = eventClusters
    .filter(cluster => cluster.duplicateGroupSize > 1)
    .sort((a, b) => b.duplicateGroupSize - a.duplicateGroupSize || comparePriority(a.representative, b.representative))
    .slice(0, 40)
    .map(compactEventCluster);
  const terms = buildProminentTerms(enrichedItems);

  return {
    generatedAt: new Date().toISOString(),
    scope: {
      requestedDailies: options.take,
      indexCount: aihotIndex.count,
      fetchedDailyCount: dailyReports.filter(report => !report.fetchError).length,
      failedDailyCount: dailyReports.filter(report => report.fetchError).length,
      dateRange: {
        newest: aihotIndex.items?.[0]?.date || null,
        oldest: aihotIndex.items?.[aihotIndex.items.length - 1]?.date || null,
      },
      dailyItemCount: dailyItems.length,
      tablesPresent: [...tables].sort(),
      missingOptionalTables: ['CompanySource', 'KnowledgeSource']
        .filter(table => !tables.has(table)),
    },
    dbCounts: dbSnapshot.counts,
    summary: summarize(enrichedItems, eventClusters, sourceCandidates, gapCandidates, potentialNewEntitySignals, sourceAbsorptionCandidates, contentAbsorptionCandidates, companyAbsorptionCandidates, peopleAbsorption),
    p0GapCandidates: gapCandidates,
    p0PotentialNewEntitySignals: potentialNewEntitySignals,
    p0DuplicateEventClusters: duplicateEventClusters,
    p1PrimarySourceCandidates: primarySourceCandidates,
    p1SourceCandidates: sourceCandidates,
    sourceAbsorptionCandidates,
    sourceIntakeCandidates,
    sourceDiscoveryOnlyCandidates,
    companyAbsorptionCandidates,
    peopleExistingCandidates: peopleAbsorption.existing,
    peopleCandidateIntake: peopleAbsorption.candidateIntake,
    peopleDeferredCandidates: peopleAbsorption.deferred,
    contentAbsorptionCandidates,
    contentKnownEntityCandidates,
    contentNewSignalCandidates,
    eventClusters: eventClusters.map(compactEventCluster),
    prominentUnmatchedTerms: terms,
    dailyItems: enrichedItems,
  };
}

function enrichItem(item, dbSnapshot) {
  const coverage = item.normalizedUrl ? dbSnapshot.urlCoverage.get(item.normalizedUrl) : null;
  const text = `${item.title}\n${item.summary}\n${item.sourceName}`;
  const peopleMatches = matchAliases(text, dbSnapshot.peopleAliases, 5);
  const organizationMatches = matchAliases(text, dbSnapshot.orgAliases, 8);
  const domainCoverageCount = item.sourceKey ? (dbSnapshot.domainCoverage.get(item.sourceKey) || 0) : 0;
  const whitelistCount = item.sourceKey ? (dbSnapshot.sourceWhitelistDomains.get(item.sourceKey) || 0) : 0;
  const ownerCompany = inferOwnerCompany(item, organizationMatches, dbSnapshot);
  const companyRole = inferCompanySourceRole(item);
  const sourcePlacement = classifySourcePlacement(item, ownerCompany);
  const priority = scoreItem({
    item,
    exactUrlCovered: Boolean(coverage),
    peopleMatches,
    organizationMatches,
    domainCoverageCount,
    whitelistCount,
  });

  return {
    ...item,
    exactUrlCovered: Boolean(coverage),
    coveredTables: coverage ? [...coverage.tables].sort() : [],
    domainCoverageCount,
    sourceWhitelistPersonCount: whitelistCount,
    peopleMatches,
    organizationMatches,
    ownerCompany,
    companyRole,
    sourcePlacement,
    candidateTerms: extractProminentTerms(`${item.title} ${item.summary}`).slice(0, 8),
    priority,
    gapBucket: bucketItem({
      exactUrlCovered: Boolean(coverage),
      peopleMatches,
      organizationMatches,
      domainCoverageCount,
    }),
  };
}

function scoreItem({ item, exactUrlCovered, peopleMatches, organizationMatches, domainCoverageCount, whitelistCount }) {
  let score = 0;
  if (!exactUrlCovered) score += 10;
  score += SECTION_WEIGHTS[item.section] || 1;
  if (peopleMatches.length > 0) score += 8;
  if (organizationMatches.length > 0) score += 6;
  if (domainCoverageCount === 0) score += 4;
  if (whitelistCount > 0) score += 2;
  if (item.sourceKind === 'official') score += 5;
  if (item.sourceKind === 'x') score += 3;
  if (/\b(join|joins|launch|release|open source|funding|acquire|partnership)\b/i.test(`${item.title} ${item.summary}`)) {
    score += 3;
  }
  if (/发布|推出|开源|加入|融资|收购|合作|研究|模型|产品/.test(`${item.title} ${item.summary}`)) {
    score += 3;
  }
  return score;
}

function bucketItem({ exactUrlCovered, peopleMatches, organizationMatches, domainCoverageCount }) {
  if (exactUrlCovered) return 'already_covered_url';
  if (peopleMatches.length > 0) return 'known_person_new_source';
  if (organizationMatches.length > 0) return 'known_organization_new_source';
  if (domainCoverageCount > 0) return 'known_source_new_item';
  return 'new_source_or_entity_signal';
}

function inferOwnerCompany(item, organizationMatches, dbSnapshot) {
  const sourceText = item.sourceKind === 'x'
    ? `${extractSourceDisplayName(item.sourceName) || item.sourceName || ''}`
    : `${item.sourceName || ''} ${item.sourceKey || ''} ${sourceOriginText(item.sourceUrl)}`;
  const directSourceMatch = matchAliases(sourceText, dbSnapshot.orgAliases, 3)
    .find(match => match.source === 'Organization');
  if (directSourceMatch) {
    const company = resolveCompanyLabel(directSourceMatch.label, dbSnapshot, 'source_alias');
    if (!isIgnoredSourceOwner(company)) return company;
  }

  const hint = matchCompanyOwnerHint(sourceText, dbSnapshot);
  if (hint && !isIgnoredSourceOwner(hint)) return hint;

  if (['official', 'github', 'paper'].includes(item.sourceKind)) {
    const directEventMatch = (organizationMatches || []).find(match => match.source === 'Organization');
    if (directEventMatch) {
      const company = resolveCompanyLabel(directEventMatch.label, dbSnapshot, 'event_alias');
      if (!isIgnoredSourceOwner(company)) return company;
    }
  }
  return null;
}

function isIgnoredSourceOwner(company) {
  return IGNORED_SOURCE_OWNER_LABELS.has(normalizeLoose(company?.label || ''));
}

function sourceOriginText(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return normalizeHost(parsed.hostname);
  } catch {
    return '';
  }
}

function inferEventCompanies(cluster, dbSnapshot) {
  const companies = new Map();
  const addCompany = (company, evidence) => {
    if (!company?.label) return;
    const key = normalizeLoose(company.label);
    if (!companies.has(key)) companies.set(key, { ...company, evidence: new Set() });
    if (evidence) companies.get(key).evidence.add(evidence);
  };

  for (const item of cluster.items) {
    if (isCompanyAttributeOwner(item.ownerCompany)) addCompany(item.ownerCompany, 'source_owner');
    for (const match of item.organizationMatches || []) {
      addCompany(resolveCompanyLabel(match.label, dbSnapshot, 'event_alias'), 'event_text');
    }
    const textHint = matchCompanyOwnerHint(`${item.title} ${item.summary}`, dbSnapshot);
    addCompany(textHint, 'event_hint');
  }

  return [...companies.values()]
    .map(company => ({ ...company, evidence: [...company.evidence].sort() }))
    .slice(0, 6);
}

function matchCompanyOwnerHint(text, dbSnapshot) {
  for (const hint of COMPANY_OWNER_HINTS) {
    if (hint.pattern.test(`${text || ''}`)) {
      return resolveCompanyLabel(hint.label, dbSnapshot, 'hint');
    }
  }
  return null;
}

function resolveCompanyLabel(label, dbSnapshot, evidence) {
  const key = normalizeLoose(label);
  const exact = dbSnapshot.organizationByAlias.get(key);
  if (exact) {
    return {
      id: exact.id,
      label: exact.label,
      name: exact.name,
      nameZh: exact.nameZh,
      existsInOrganization: true,
      evidence,
    };
  }

  for (const org of dbSnapshot.organizationRows || []) {
    const aliases = uniqueNonEmpty([org.name, org.nameZh]);
    if (aliases.some(alias => normalizeLoose(alias).includes(key) || key.includes(normalizeLoose(alias)))) {
      return {
        id: org.id,
        label: org.nameZh || org.name,
        name: org.name,
        nameZh: org.nameZh,
        existsInOrganization: true,
        evidence,
      };
    }
  }

  return {
    id: null,
    label,
    name: label,
    nameZh: null,
    existsInOrganization: false,
    evidence,
  };
}

function inferCompanySourceRole(item) {
  const text = `${item.section || ''} ${item.title || ''} ${item.summary || ''} ${item.sourceName || ''}`;
  if (/融资|估值|营收|收入|财报|上市|ipo|funding|valuation|revenue|earnings/i.test(text)) {
    return 'financial_signal';
  }
  if (/合作|伙伴|收购|投资|partnership|partner|acquire|acquisition|invest/i.test(text)) {
    return 'partnership_signal';
  }
  if (/招聘|加入|离职|办公室|团队|hiring|joins|join|office|team/i.test(text)) {
    return 'hiring_team_signal';
  }
  if (/论文|研究|benchmark|基准|技术|架构|paper|research|technical|method/i.test(text)) {
    return 'technical_thread_link';
  }
  if (/发布|推出|上线|更新|开源|模型|产品|release|launch|introduce|open source|ships/i.test(text)) {
    return 'product_release';
  }
  return 'official_strategy';
}

function classifySourcePlacement(item, ownerCompany) {
  if (isDiscoveryOnlySourceName(item.sourceName)) return 'discovery_only_source';
  if (isCompanyAttributeOwner(ownerCompany)) return 'company_attribute_source';
  if (['official', 'github', 'paper'].includes(item.sourceKind)) return 'standalone_primary_source';
  if (item.sourceKind === 'x') return 'standalone_signal_source';
  return 'candidate_content_source';
}

function isCompanyAttributeOwner(ownerCompany) {
  if (!ownerCompany?.label) return false;
  const label = normalizeLoose(ownerCompany.label);
  if (MEDIA_OR_CURATOR_OWNER_LABELS.has(label)) return false;
  return true;
}

function buildEventClusters(items) {
  const signedItems = items.map(item => ({
    ...item,
    eventSignatureTokens: buildEventSignatureTokens(item),
  }));
  const parent = signedItems.map((_, index) => index);

  const find = index => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };
  const union = (left, right) => {
    const rootLeft = find(left);
    const rootRight = find(right);
    if (rootLeft !== rootRight) parent[rootRight] = rootLeft;
  };

  for (let left = 0; left < signedItems.length; left += 1) {
    for (let right = left + 1; right < signedItems.length; right += 1) {
      if (shouldClusterItems(signedItems[left], signedItems[right])) {
        union(left, right);
      }
    }
  }

  const groups = new Map();
  for (let index = 0; index < signedItems.length; index += 1) {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(signedItems[index]);
  }

  return [...groups.values()]
    .map(group => buildEventCluster(group))
    .sort((a, b) => comparePriority(a.representative, b.representative))
    .map((cluster, index) => ({
      ...cluster,
      eventId: `aihot_event_${String(index + 1).padStart(4, '0')}`,
    }));
}

function buildEventCluster(group) {
  const sorted = [...group].sort(compareRepresentativeItem);
  const representative = sorted[0];
  const allPeopleMatches = mergeMatches(sorted.flatMap(item => item.peopleMatches));
  const allOrganizationMatches = mergeMatches(sorted.flatMap(item => item.organizationMatches));
  const duplicateSources = [...new Set(sorted.map(item => item.sourceName).filter(Boolean))];
  const duplicateUrls = [...new Set(sorted.map(item => item.sourceUrl).filter(Boolean))];
  const sections = [...new Set(sorted.map(item => item.section).filter(Boolean))];
  const dates = [...new Set(sorted.map(item => item.date).filter(Boolean))].sort().reverse();
  const exactUrlCovered = sorted.some(item => item.exactUrlCovered);
  const priority = Math.max(...sorted.map(item => item.priority));
  const domainCoverageCount = Math.max(...sorted.map(item => item.domainCoverageCount || 0));
  const sourceWhitelistPersonCount = Math.max(...sorted.map(item => item.sourceWhitelistPersonCount || 0));
  const candidateTerms = [...new Set(sorted.flatMap(item => item.candidateTerms || []))].slice(0, 12);
  const eventSignatureTokens = [...new Set(sorted.flatMap(item => item.eventSignatureTokens || []))].sort();
  const textTokens = buildTextTokens(sorted.map(item => `${item.title} ${item.summary}`).join(' '));
  const representativeBucket = bucketItem({
    exactUrlCovered,
    peopleMatches: allPeopleMatches,
    organizationMatches: allOrganizationMatches,
    domainCoverageCount,
  });

  return {
    representative: {
      ...representative,
      exactUrlCovered,
      peopleMatches: allPeopleMatches,
      organizationMatches: allOrganizationMatches,
      candidateTerms,
      priority,
      gapBucket: representativeBucket,
      domainCoverageCount,
      sourceWhitelistPersonCount,
    },
    duplicateGroupSize: sorted.length,
    duplicateSources,
    duplicateUrls,
    sections,
    dates,
    eventSignatureTokens,
    textTokens,
    items: sorted,
  };
}

function compareRepresentativeItem(a, b) {
  const sourcePreference = (SOURCE_KIND_PREFERENCE[b.sourceKind] || 0) - (SOURCE_KIND_PREFERENCE[a.sourceKind] || 0);
  if (sourcePreference !== 0) return sourcePreference;
  if (b.priority !== a.priority) return b.priority - a.priority;
  if (a.exactUrlCovered !== b.exactUrlCovered) return a.exactUrlCovered ? 1 : -1;
  return b.date.localeCompare(a.date) || a.title.localeCompare(b.title);
}

function buildEventSignatureTokens(item) {
  const tokens = new Set();
  for (const match of item.peopleMatches || []) tokens.add(`person:${normalizeToken(match.label)}`);
  for (const match of item.organizationMatches || []) tokens.add(`org:${normalizeToken(match.label)}`);
  for (const term of item.candidateTerms || []) {
    const token = normalizeToken(term);
    if (isSpecificEventToken(token)) tokens.add(`term:${token}`);
  }
  for (const token of extractProductLikeTokens(`${item.title} ${item.summary}`)) {
    if (isSpecificEventToken(token)) tokens.add(`term:${token}`);
  }
  return [...tokens].sort();
}

function shouldClusterItems(left, right) {
  if (left.normalizedUrl && left.normalizedUrl === right.normalizedUrl) return true;
  if (Math.abs(daysBetween(left.date, right.date)) > 3) return false;
  const leftTokens = new Set(left.eventSignatureTokens || []);
  const rightTokens = new Set(right.eventSignatureTokens || []);
  if (leftTokens.size < 4 || rightTokens.size < 4) return false;

  const overlap = tokenOverlap(leftTokens, rightTokens);
  const entityOverlap = tokenOverlap(
    filterTokenSet(leftTokens, token => token.startsWith('person:') || token.startsWith('org:')),
    filterTokenSet(rightTokens, token => token.startsWith('person:') || token.startsWith('org:')),
  );
  const sharedSpecificTerms = intersectTokens(
    filterTokenSet(leftTokens, token => token.startsWith('term:')),
    filterTokenSet(rightTokens, token => token.startsWith('term:')),
  );

  if (overlap.jaccard >= 0.68 && overlap.intersection >= 4 && sharedSpecificTerms.length >= 2) return true;
  if (entityOverlap.intersection >= 2 && sharedSpecificTerms.length >= 2 && overlap.jaccard >= 0.45) return true;
  if (entityOverlap.intersection >= 1 && sharedSpecificTerms.length >= 3 && overlap.jaccard >= 0.52) return true;
  return false;
}

function buildGapCandidates(eventClusters, options) {
  return eventClusters
    .filter(cluster => !cluster.representative.exactUrlCovered)
    .filter(cluster => cluster.representative.peopleMatches.length > 0 || cluster.representative.organizationMatches.length > 0)
    .sort((a, b) => comparePriority(a.representative, b.representative))
    .slice(0, options.gapLimit)
    .map(compactEventCluster);
}

function buildPotentialNewEntitySignals(eventClusters, options) {
  return eventClusters
    .filter(cluster => !cluster.representative.exactUrlCovered)
    .filter(cluster => cluster.representative.peopleMatches.length === 0 && cluster.representative.organizationMatches.length === 0)
    .filter(cluster => cluster.representative.priority >= 18 || cluster.representative.sourceKind === 'official')
    .sort((a, b) => comparePriority(a.representative, b.representative))
    .slice(0, options.gapLimit)
    .map(compactEventCluster);
}

function attachLibraryMatches(eventClusters, dbSnapshot) {
  return eventClusters.map(cluster => {
    const libraryMatches = findLibraryMatches(cluster, dbSnapshot.contentRows)
      .sort((a, b) => b.confidence - a.confidence || a.tableName.localeCompare(b.tableName))
      .slice(0, 5);
    const libraryDuplicateStatus = cluster.representative.exactUrlCovered
      ? 'exact_url_covered'
      : libraryMatches.length > 0
        ? 'possible_library_duplicate'
        : 'fresh_candidate';
    return {
      ...cluster,
      libraryMatches,
      libraryDuplicateStatus,
    };
  });
}

function findLibraryMatches(cluster, contentRows) {
  const matches = [];
  const clusterUrls = new Set(cluster.items.map(item => item.normalizedUrl).filter(Boolean));
  const clusterSourceKeys = new Set(cluster.items.map(item => item.sourceKey).filter(Boolean));
  const clusterSignatureTokens = new Set(cluster.eventSignatureTokens || []);
  const clusterTermTokens = filterTokenSet(clusterSignatureTokens, token => token.startsWith('term:'));
  const clusterTextTokens = new Set(cluster.textTokens || []);

  for (const row of contentRows || []) {
    if (row.normalizedUrl && clusterUrls.has(row.normalizedUrl)) {
      matches.push({
        confidence: 1,
        reason: 'exact_url',
        tableName: row.tableName,
        title: row.title,
        url: row.url,
      });
      continue;
    }

    const rowSignatureTokens = new Set(row.signatureTokens || []);
    const rowTextTokens = new Set(row.textTokens || []);
    const sharedTerms = intersectTokens(clusterTermTokens, rowSignatureTokens).length;
    const textOverlap = tokenOverlap(clusterTextTokens, rowTextTokens);
    const sameSource = row.sourceKey && clusterSourceKeys.has(row.sourceKey);

    if (sameSource && sharedTerms >= 2 && textOverlap.jaccard >= 0.42) {
      matches.push({
        confidence: Number((0.74 + Math.min(textOverlap.jaccard, 0.2)).toFixed(2)),
        reason: 'same_source_similar_title',
        tableName: row.tableName,
        title: row.title,
        url: row.url,
      });
      continue;
    }

    if (sharedTerms >= 3 && textOverlap.intersection >= 4 && textOverlap.jaccard >= 0.5) {
      matches.push({
        confidence: Number((0.62 + Math.min(textOverlap.jaccard, 0.2)).toFixed(2)),
        reason: 'cross_source_similar_event',
        tableName: row.tableName,
        title: row.title,
        url: row.url,
      });
    }
  }

  return matches;
}

function compactItem(item) {
  return {
    priority: item.priority,
    date: item.date,
    section: item.section,
    title: item.title,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl,
    sourceKey: item.sourceKey,
    sourceKind: item.sourceKind,
    ownerCompany: item.ownerCompany,
    companyRole: item.companyRole,
    sourcePlacement: item.sourcePlacement,
    gapBucket: item.gapBucket,
    peopleMatches: item.peopleMatches,
    organizationMatches: item.organizationMatches,
    candidateTerms: item.candidateTerms,
    domainCoverageCount: item.domainCoverageCount,
    sourceWhitelistPersonCount: item.sourceWhitelistPersonCount,
  };
}

function compactEventCluster(cluster) {
  const representative = compactItem(cluster.representative);
  return {
    ...representative,
    eventId: cluster.eventId,
    duplicateGroupSize: cluster.duplicateGroupSize,
    duplicateSources: cluster.duplicateSources.slice(0, 8),
    duplicateUrls: cluster.duplicateUrls.slice(0, 8),
    duplicateTitles: cluster.items
      .filter(item => item.title !== cluster.representative.title)
      .map(item => item.title)
      .slice(0, 5),
    sections: cluster.sections,
    dates: cluster.dates,
    libraryDuplicateStatus: cluster.libraryDuplicateStatus,
    libraryMatches: (cluster.libraryMatches || []).slice(0, 3),
    absorbAction: cluster.absorbAction,
    absorbPath: cluster.absorbPath,
  };
}

function buildSourceCandidates(items, dbSnapshot, options) {
  const groups = new Map();
  for (const item of items) {
    const key = item.sourceKey || sourceKey('', item.sourceName);
    if (!key) continue;
    if (!groups.has(key)) {
      groups.set(key, {
        sourceKey: key,
        sourceKind: item.sourceKind,
        sourceNames: new Map(),
        count: 0,
        exactUrlCoveredCount: 0,
        knownEntityItemCount: 0,
        dates: new Set(),
        sections: new Map(),
        examples: [],
        sourceUrls: new Set(),
        domainCoverageCount: dbSnapshot.domainCoverage.get(key) || 0,
        sourceWhitelistPersonCount: dbSnapshot.sourceWhitelistDomains.get(key) || 0,
      });
    }
    const group = groups.get(key);
    group.count += 1;
    if (item.exactUrlCovered) group.exactUrlCoveredCount += 1;
    if (item.peopleMatches.length > 0 || item.organizationMatches.length > 0) group.knownEntityItemCount += 1;
    group.dates.add(item.date);
    group.sourceUrls.add(item.sourceUrl);
    incrementMap(group.sections, item.section, 1);
    incrementMap(group.sourceNames, item.sourceName || key, 1);
    if (group.examples.length < 3) {
      group.examples.push({
        date: item.date,
        section: item.section,
        title: item.title,
        sourceUrl: item.sourceUrl,
      });
    }
  }

  return [...groups.values()]
    .map(group => {
      const coverageRate = group.count ? group.exactUrlCoveredCount / group.count : 0;
      const sectionLabels = [...group.sections.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([section, count]) => `${section}:${count}`);
      const displayName = topMapKey(group.sourceNames) || group.sourceKey;
      const action = recommendSourceAction(group, coverageRate);
      const sourceScore = scoreSource(group, coverageRate);
      return {
        sourceScore,
        sourceKey: group.sourceKey,
        displayName,
        sourceKind: group.sourceKind,
        count: group.count,
        distinctDateCount: group.dates.size,
        sections: sectionLabels,
        exactUrlCoveredCount: group.exactUrlCoveredCount,
        coverageRate: Number(coverageRate.toFixed(3)),
        knownEntityItemCount: group.knownEntityItemCount,
        domainCoverageCount: group.domainCoverageCount,
        sourceWhitelistPersonCount: group.sourceWhitelistPersonCount,
        action,
        examples: group.examples,
      };
    })
    .filter(group => group.count >= 2 || group.sourceScore >= 12)
    .sort((a, b) => b.sourceScore - a.sourceScore || b.count - a.count || a.displayName.localeCompare(b.displayName))
    .slice(0, options.sourceLimit);
}

function recommendSourceAction(group, coverageRate) {
  if (group.domainCoverageCount === 0 && group.sourceWhitelistPersonCount === 0) {
    if (group.sourceKind === 'x') return '新增 X 账号候选源';
    if (group.sourceKind === 'official') return '新增官方/一手源候选';
    return '新增外部信源候选';
  }
  if (coverageRate < 0.5) return '已有信源，补抓新增条目';
  return '已覆盖较多，作为监控源保留';
}

function scoreSource(group, coverageRate) {
  let score = group.count * 2;
  score += group.dates.size;
  score += group.sections.size * 2;
  score += group.knownEntityItemCount * 2;
  if (group.sourceKind === 'official') score += 8;
  if (group.sourceKind === 'x') score += 5;
  if (group.domainCoverageCount === 0) score += 4;
  if (coverageRate === 0) score += 3;
  return score;
}

function buildSourceAbsorptionCandidates(eventClusters, dbSnapshot, options) {
  const groups = new Map();
  for (const cluster of eventClusters) {
    for (const item of cluster.items) {
      const key = item.sourceKey || sourceKey('', item.sourceName);
      if (!key) continue;
      if (!groups.has(key)) {
        groups.set(key, {
          sourceKey: key,
          sourceKind: item.sourceKind,
          sourceNames: new Map(),
          eventIds: new Set(),
          freshEventIds: new Set(),
          exactCoveredEventIds: new Set(),
          possibleDuplicateEventIds: new Set(),
          knownEntityEventIds: new Set(),
          duplicateEventIds: new Set(),
          dates: new Set(),
          sections: new Map(),
          ownerCompanies: new Map(),
          companyRoles: new Map(),
          sourcePlacements: new Map(),
          examples: [],
          discoveryOnlySignals: 0,
          domainCoverageCount: dbSnapshot.domainCoverage.get(key) || 0,
          sourceWhitelistPersonCount: dbSnapshot.sourceWhitelistDomains.get(key) || 0,
        });
      }
      const group = groups.get(key);
      group.eventIds.add(cluster.eventId);
      group.dates.add(item.date);
      incrementMap(group.sections, item.section, 1);
      incrementMap(group.sourceNames, item.sourceName || key, 1);
      if (item.ownerCompany?.label) incrementMap(group.ownerCompanies, item.ownerCompany.label, 1);
      if (item.companyRole) incrementMap(group.companyRoles, item.companyRole, 1);
      if (item.sourcePlacement) incrementMap(group.sourcePlacements, item.sourcePlacement, 1);
      if (isDiscoveryOnlySourceName(item.sourceName)) group.discoveryOnlySignals += 1;

      if (cluster.representative.exactUrlCovered) {
        group.exactCoveredEventIds.add(cluster.eventId);
      } else if (cluster.libraryDuplicateStatus === 'possible_library_duplicate') {
        group.possibleDuplicateEventIds.add(cluster.eventId);
      } else {
        group.freshEventIds.add(cluster.eventId);
      }
      if (cluster.representative.peopleMatches.length > 0 || cluster.representative.organizationMatches.length > 0) {
        group.knownEntityEventIds.add(cluster.eventId);
      }
      if (cluster.duplicateGroupSize > 1) group.duplicateEventIds.add(cluster.eventId);
      if (group.examples.length < 4 && !cluster.representative.exactUrlCovered) {
        group.examples.push(compactEventCluster(cluster));
      }
    }
  }

  return [...groups.values()]
    .map(group => {
      const displayName = topMapKey(group.sourceNames) || group.sourceKey;
      const eventCount = group.eventIds.size;
      const discoveryOnlyRate = eventCount ? group.discoveryOnlySignals / Math.max(1, eventCount) : 0;
      const duplicateRiskCount = group.exactCoveredEventIds.size + group.possibleDuplicateEventIds.size + group.duplicateEventIds.size;
      const duplicateRiskRate = eventCount ? Math.min(1, duplicateRiskCount / eventCount) : 0;
      const ownerCompanyLabel = topMapKey(group.ownerCompanies);
      const sourcePlacement = topMapKey(group.sourcePlacements) || 'candidate_content_source';
      const recommendation = recommendSourceAbsorption(group, displayName, duplicateRiskRate, discoveryOnlyRate, sourcePlacement);
      const score = scoreSourceAbsorption(group, duplicateRiskRate, discoveryOnlyRate);
      return {
        score,
        sourceKey: group.sourceKey,
        displayName,
        sourceKind: group.sourceKind,
        ownerCompany: ownerCompanyLabel,
        sourcePlacement,
        companyRoles: [...group.companyRoles.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([role, count]) => `${role}:${count}`)
          .slice(0, 4),
        recommendation,
        reason: explainSourceAbsorption(group, recommendation, duplicateRiskRate, discoveryOnlyRate),
        eventCount,
        freshEventCount: group.freshEventIds.size,
        exactCoveredEventCount: group.exactCoveredEventIds.size,
        possibleDuplicateEventCount: group.possibleDuplicateEventIds.size,
        duplicateEventCount: group.duplicateEventIds.size,
        knownEntityEventCount: group.knownEntityEventIds.size,
        distinctDateCount: group.dates.size,
        sections: [...group.sections.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([section, count]) => `${section}:${count}`),
        domainCoverageCount: group.domainCoverageCount,
        sourceWhitelistPersonCount: group.sourceWhitelistPersonCount,
        duplicateRiskRate: Number(duplicateRiskRate.toFixed(3)),
        examples: group.examples.slice(0, 3),
      };
    })
    .filter(group => group.eventCount >= 2 || group.freshEventCount >= 1)
    .sort((a, b) => b.score - a.score || b.freshEventCount - a.freshEventCount || a.displayName.localeCompare(b.displayName))
    .slice(0, options.sourceLimit);
}

function recommendSourceAbsorption(group, displayName, duplicateRiskRate, discoveryOnlyRate, sourcePlacement) {
  if (discoveryOnlyRate >= 0.5 || isDiscoveryOnlySourceName(displayName)) return '只做发现源';
  if (sourcePlacement === 'company_attribute_source') {
    return group.freshEventIds.size >= 2 ? '沉淀为公司属性源' : '公司属性源观察';
  }
  if (group.domainCoverageCount > 0 || group.sourceWhitelistPersonCount > 0) {
    return group.freshEventIds.size >= 2 ? '补抓已有源' : '已有源低优先补漏';
  }
  if (['official', 'github', 'paper'].includes(group.sourceKind)) {
    return group.freshEventIds.size >= 2 ? '新增一手源' : '新增一手源观察';
  }
  if (group.sourceKind === 'x') {
    return group.freshEventIds.size >= 5 || group.knownEntityEventIds.size >= 3
      ? '加入 X 候选源'
      : 'X 线索观察';
  }
  if (duplicateRiskRate >= 0.5) return '暂不吸收';
  return '候选源观察';
}

function explainSourceAbsorption(group, recommendation, duplicateRiskRate, discoveryOnlyRate) {
  if (recommendation === '只做发现源') return '聚合/转述属性强，适合发现事件后回抓原始 URL。';
  if (recommendation === '沉淀为公司属性源') return '源本身归属于公司，优先进入 CompanySource / 公司页属性。';
  if (recommendation === '公司属性源观察') return '源本身归属于公司，但样本偏少，先挂公司候选源。';
  if (recommendation === '补抓已有源') return '库内已有同域覆盖，但 AI HOT 仍暴露出新事件。';
  if (recommendation === '已有源低优先补漏') return '已有覆盖，新增量不大，适合纳入定期补漏。';
  if (recommendation === '新增一手源') return '一手/官方源且有多个新事件，适合作为稳定抓取源。';
  if (recommendation === '新增一手源观察') return '一手源但样本偏少，先建候选。';
  if (recommendation === '加入 X 候选源') return 'X 源持续给出新事件，先按账号候选接入并用事件去重兜底。';
  if (recommendation === 'X 线索观察') return 'X 源样本不足或重复风险偏高，先当线索。';
  if (duplicateRiskRate >= 0.5 || discoveryOnlyRate >= 0.3) return '重复/转述比例偏高。';
  return '需要更多样本确认稳定性。';
}

function scoreSourceAbsorption(group, duplicateRiskRate, discoveryOnlyRate) {
  let score = group.freshEventIds.size * 5;
  score += group.knownEntityEventIds.size * 3;
  score += group.dates.size * 2;
  score += group.sections.size;
  if (['official', 'github', 'paper'].includes(group.sourceKind)) score += 12;
  if (group.sourceKind === 'x') score += 6;
  if (group.domainCoverageCount === 0) score += 4;
  if (group.domainCoverageCount > 0 || group.sourceWhitelistPersonCount > 0) score += 5;
  score -= Math.round(duplicateRiskRate * 10);
  score -= Math.round(discoveryOnlyRate * 12);
  return score;
}

function isSourceIntakeRecommendation(recommendation) {
  return [
    '沉淀为公司属性源',
    '公司属性源观察',
    '新增一手源',
    '新增一手源观察',
    '补抓已有源',
    '已有源低优先补漏',
    '加入 X 候选源',
  ].includes(recommendation);
}

function buildContentAbsorptionCandidates(eventClusters, options) {
  return eventClusters
    .filter(cluster => !cluster.representative.exactUrlCovered)
    .map(cluster => {
      const compact = compactEventCluster(cluster);
      const recommendation = recommendContentAbsorption(cluster);
      return {
        ...compact,
        absorbAction: recommendation.action,
        absorbPath: recommendation.path,
        dedupeDecision: recommendation.dedupeDecision,
        reason: recommendation.reason,
      };
    })
    .filter(item => item.absorbAction !== '暂不吸收')
    .sort((a, b) => {
      const freshDelta = freshnessRank(b.dedupeDecision) - freshnessRank(a.dedupeDecision);
      if (freshDelta !== 0) return freshDelta;
      return b.priority - a.priority || b.date.localeCompare(a.date) || a.title.localeCompare(b.title);
    })
    .slice(0, Math.max(options.gapLimit * 2, 120));
}

function buildContentNewSignalCandidates(eventClusters, options) {
  return eventClusters
    .filter(cluster => !cluster.representative.exactUrlCovered)
    .filter(cluster => cluster.representative.peopleMatches.length === 0 && cluster.representative.organizationMatches.length === 0)
    .map(cluster => {
      const compact = compactEventCluster(cluster);
      const recommendation = recommendContentAbsorption(cluster);
      return {
        ...compact,
        absorbAction: recommendation.action,
        absorbPath: recommendation.path,
        dedupeDecision: recommendation.dedupeDecision,
        reason: recommendation.reason,
      };
    })
    .filter(item => item.absorbAction !== '暂不吸收')
    .sort((a, b) => {
      const freshDelta = freshnessRank(b.dedupeDecision) - freshnessRank(a.dedupeDecision);
      if (freshDelta !== 0) return freshDelta;
      return b.priority - a.priority || b.date.localeCompare(a.date) || a.title.localeCompare(b.title);
    })
    .slice(0, options.gapLimit);
}

function buildCompanyAbsorptionCandidates(eventClusters, dbSnapshot, options) {
  const groups = new Map();
  for (const cluster of eventClusters) {
    if (cluster.representative.exactUrlCovered) continue;
    const companies = inferEventCompanies(cluster, dbSnapshot);
    for (const company of companies) {
      const key = normalizeLoose(company.label);
      if (!key) continue;
      if (!groups.has(key)) {
        groups.set(key, {
          company,
          eventIds: new Set(),
          freshEventIds: new Set(),
          duplicateRiskEventIds: new Set(),
          sourceOwnerEventIds: new Set(),
          knownPersonEventIds: new Set(),
          roles: new Map(),
          sections: new Map(),
          sourceKeys: new Map(),
          examples: [],
        });
      }
      const group = groups.get(key);
      group.eventIds.add(cluster.eventId);
      if (cluster.libraryDuplicateStatus === 'possible_library_duplicate') {
        group.duplicateRiskEventIds.add(cluster.eventId);
      } else {
        group.freshEventIds.add(cluster.eventId);
      }
      if (cluster.representative.peopleMatches.length > 0) group.knownPersonEventIds.add(cluster.eventId);
      for (const item of cluster.items) {
        if (normalizeLoose(item.ownerCompany?.label) === key && isCompanyAttributeOwner(item.ownerCompany)) {
          group.sourceOwnerEventIds.add(cluster.eventId);
        }
        incrementMap(group.roles, item.companyRole || 'official_strategy', 1);
        incrementMap(group.sections, item.section, 1);
        if (item.sourceKey) incrementMap(group.sourceKeys, item.sourceKey, 1);
      }
      if (group.examples.length < 5) group.examples.push(compactEventCluster(cluster));
    }
  }

  return [...groups.values()]
    .map(group => {
      const action = recommendCompanyAbsorption(group);
      const score = scoreCompanyAbsorption(group);
      return {
        score,
        company: group.company.label,
        existsInOrganization: Boolean(group.company.existsInOrganization),
        action,
        reason: explainCompanyAbsorption(group, action),
        eventCount: group.eventIds.size,
        freshEventCount: group.freshEventIds.size,
        duplicateRiskEventCount: group.duplicateRiskEventIds.size,
        sourceOwnerEventCount: group.sourceOwnerEventIds.size,
        knownPersonEventCount: group.knownPersonEventIds.size,
        roles: sortedMapLabels(group.roles).slice(0, 5),
        sections: sortedMapLabels(group.sections).slice(0, 5),
        sourceKeys: sortedMapLabels(group.sourceKeys).slice(0, 5),
        examples: group.examples.slice(0, 3),
      };
    })
    .filter(company => company.freshEventCount >= 1)
    .sort((a, b) => b.score - a.score || b.freshEventCount - a.freshEventCount || a.company.localeCompare(b.company))
    .slice(0, options.gapLimit);
}

function recommendCompanyAbsorption(group) {
  if (!group.company.existsInOrganization) return '新增 Organization 候选';
  if (group.sourceOwnerEventIds.size > 0) return '补公司属性源';
  if (group.knownPersonEventIds.size > 0) return '补公司人物动态';
  return '补公司动态';
}

function explainCompanyAbsorption(group, action) {
  if (action === '新增 Organization 候选') return 'AI HOT 中反复出现，但本库 Organization 未命中。';
  if (action === '补公司属性源') return '信源本身归属于该公司，适合作为 CompanySource / 公司页属性。';
  if (action === '补公司人物动态') return '公司事件与库内人物同时命中，适合补人物动态并回连公司。';
  return '公司被事件文本命中，适合作为公司动态或 KnowledgeSource 候选。';
}

function scoreCompanyAbsorption(group) {
  let score = group.freshEventIds.size * 6;
  score += group.sourceOwnerEventIds.size * 5;
  score += group.knownPersonEventIds.size * 4;
  score += group.roles.size * 2;
  if (!group.company.existsInOrganization) score += 6;
  score -= group.duplicateRiskEventIds.size * 2;
  return score;
}

function buildPeopleAbsorptionCandidates(eventClusters, dbSnapshot, options) {
  const existingGroups = new Map();
  const missingGroups = new Map();

  for (const cluster of eventClusters) {
    if (cluster.representative.exactUrlCovered) continue;
    for (const match of cluster.representative.peopleMatches || []) {
      const key = match.id || normalizeLoose(match.label);
      if (!existingGroups.has(key)) {
        existingGroups.set(key, {
          person: match,
          eventIds: new Set(),
          freshEventIds: new Set(),
          duplicateRiskEventIds: new Set(),
          sections: new Map(),
          sourceKinds: new Map(),
          examples: [],
        });
      }
      const group = existingGroups.get(key);
      group.eventIds.add(cluster.eventId);
      if (cluster.libraryDuplicateStatus === 'possible_library_duplicate') {
        group.duplicateRiskEventIds.add(cluster.eventId);
      } else {
        group.freshEventIds.add(cluster.eventId);
      }
      for (const item of cluster.items) {
        incrementMap(group.sections, item.section, 1);
        incrementMap(group.sourceKinds, item.sourceKind, 1);
      }
      if (group.examples.length < 4) group.examples.push(compactEventCluster(cluster));
    }

    const extracted = extractPersonNameCandidates(cluster, dbSnapshot);
    for (const candidate of extracted) {
      const existing = findExistingPersonCandidate(candidate.name, dbSnapshot);
      if (existing) continue;
      const key = normalizeLoose(candidate.name);
      if (!missingGroups.has(key)) {
        missingGroups.set(key, {
          name: candidate.name,
          eventIds: new Set(),
          freshEventIds: new Set(),
          strongSourceEventIds: new Set(),
          roleContextEventIds: new Set(),
          sourceDisplayEventIds: new Set(),
          likelyCuratorEventIds: new Set(),
          ownerCompanies: new Map(),
          sections: new Map(),
          sourceKinds: new Map(),
          examples: [],
        });
      }
      const group = missingGroups.get(key);
      group.eventIds.add(cluster.eventId);
      if (cluster.libraryDuplicateStatus !== 'possible_library_duplicate') group.freshEventIds.add(cluster.eventId);
      if (candidate.hasStrongSource) group.strongSourceEventIds.add(cluster.eventId);
      if (candidate.hasRoleContext) group.roleContextEventIds.add(cluster.eventId);
      if (candidate.fromSourceDisplay) group.sourceDisplayEventIds.add(cluster.eventId);
      if (candidate.likelyCurator) group.likelyCuratorEventIds.add(cluster.eventId);
      for (const company of inferEventCompanies(cluster, dbSnapshot)) incrementMap(group.ownerCompanies, company.label, 1);
      for (const item of cluster.items) {
        incrementMap(group.sections, item.section, 1);
        incrementMap(group.sourceKinds, item.sourceKind, 1);
      }
      if (group.examples.length < 4) group.examples.push(compactEventCluster(cluster));
    }
  }

  const existing = [...existingGroups.values()]
    .map(group => {
      const personRow = group.person.id ? dbSnapshot.peopleById.get(group.person.id) : null;
      const score = group.freshEventIds.size * 6 + group.eventIds.size * 2 + group.sourceKinds.size;
      return {
        score,
        name: group.person.label,
        status: group.person.status || personRow?.status || '',
        roleCategory: group.person.roleCategory || personRow?.roleCategory || '',
        currentTitle: group.person.currentTitle || personRow?.currentTitle || '',
        organization: uniqueNonEmpty(group.person.organization || personRow?.organization || []).slice(0, 3),
        action: '补已有人物动态',
        eventCount: group.eventIds.size,
        freshEventCount: group.freshEventIds.size,
        duplicateRiskEventCount: group.duplicateRiskEventIds.size,
        sections: sortedMapLabels(group.sections).slice(0, 4),
        sourceKinds: sortedMapLabels(group.sourceKinds).slice(0, 4),
        examples: group.examples.slice(0, 3),
      };
    })
    .sort((a, b) => b.score - a.score || b.freshEventCount - a.freshEventCount || a.name.localeCompare(b.name))
    .slice(0, options.gapLimit);

  const missing = [...missingGroups.values()]
    .map(group => {
      const eligible = group.strongSourceEventIds.size > 0
        && group.roleContextEventIds.size > 0
        && group.likelyCuratorEventIds.size === 0;
      const action = eligible ? '新增人物 candidate 复核' : '暂不吸收为人物';
      const reason = explainPersonCandidate(group, eligible);
      const score = group.freshEventIds.size * 5
        + group.strongSourceEventIds.size * 5
        + group.roleContextEventIds.size * 4
        - group.likelyCuratorEventIds.size * 6;
      return {
        score,
        name: group.name,
        action,
        reason,
        eventCount: group.eventIds.size,
        freshEventCount: group.freshEventIds.size,
        strongSourceEventCount: group.strongSourceEventIds.size,
        roleContextEventCount: group.roleContextEventIds.size,
        sourceDisplayEventCount: group.sourceDisplayEventIds.size,
        likelyCuratorEventCount: group.likelyCuratorEventIds.size,
        ownerCompanies: sortedMapLabels(group.ownerCompanies).slice(0, 4),
        sections: sortedMapLabels(group.sections).slice(0, 4),
        sourceKinds: sortedMapLabels(group.sourceKinds).slice(0, 4),
        examples: group.examples.slice(0, 3),
      };
    })
    .sort((a, b) => b.score - a.score || b.freshEventCount - a.freshEventCount || a.name.localeCompare(b.name));

  return {
    existing,
    candidateIntake: missing.filter(person => person.action === '新增人物 candidate 复核').slice(0, 30),
    deferred: missing.filter(person => person.action !== '新增人物 candidate 复核').slice(0, 40),
  };
}

function extractPersonNameCandidates(cluster, dbSnapshot) {
  const candidates = new Map();
  const add = (name, meta = {}) => {
    const cleanName = cleanPersonName(name);
    if (!looksLikePersonNameCandidate(cleanName, dbSnapshot)) return;
    const key = normalizeLoose(cleanName);
    if (!candidates.has(key)) {
      candidates.set(key, {
        name: cleanName,
        hasStrongSource: false,
        hasRoleContext: false,
        fromSourceDisplay: false,
        likelyCurator: false,
      });
    }
    const candidate = candidates.get(key);
    candidate.hasStrongSource ||= Boolean(meta.hasStrongSource);
    candidate.hasRoleContext ||= Boolean(meta.hasRoleContext);
    candidate.fromSourceDisplay ||= Boolean(meta.fromSourceDisplay);
    candidate.likelyCurator ||= Boolean(meta.likelyCurator);
  };

  for (const item of cluster.items) {
    const itemText = `${item.title || ''} ${item.summary || ''}`;
    const hasStrongSource = isStrongPersonEvidenceSource(item);
    for (const raw of itemText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g) || []) {
      add(raw, { hasStrongSource, hasRoleContext: candidateHasRoleContext(raw, itemText) });
    }

    const display = extractSourceDisplayName(item.sourceName);
    if (display) {
      add(display, {
        hasStrongSource,
        hasRoleContext: candidateHasRoleContext(display, itemText),
        fromSourceDisplay: true,
        likelyCurator: item.sourceKind === 'x' && !PERSON_ROLE_CONTEXT_RE.test(itemText),
      });
    }
  }

  return [...candidates.values()];
}

function candidateHasRoleContext(name, text) {
  const normalizedText = `${text || ''}`;
  const index = normalizedText.toLowerCase().indexOf(`${name || ''}`.toLowerCase());
  if (index < 0) return false;
  const window = normalizedText.slice(Math.max(0, index - 80), Math.min(normalizedText.length, index + name.length + 80));
  return PERSON_ROLE_CONTEXT_RE.test(window);
}

function explainPersonCandidate(group, eligible) {
  if (eligible) return '有 strong source 和职位/组织语境，满足 candidate 级复核入口。';
  if (group.likelyCuratorEventIds.size > 0) return '更像内容源作者或转述者，先作为内容源观察。';
  if (group.strongSourceEventIds.size === 0) return '不符合人物准入：只有 X/聚合/转述线索，缺 strong source。';
  if (group.roleContextEventIds.size === 0) return '不符合人物准入：缺 roleCategory / organization / currentTitle 级别证据。';
  return '证据不足，暂不进入人物候选。';
}

function findExistingPersonCandidate(name, dbSnapshot) {
  return matchAliases(name, dbSnapshot.peopleAliases, 1)[0] || null;
}

function isStrongPersonEvidenceSource(item) {
  if (isDiscoveryOnlySourceName(item.sourceName)) return false;
  const key = `${item.sourceKey || ''} ${item.sourceUrl || ''}`;
  if (WEAK_PERSON_SOURCE_RE.test(key)) return false;
  return ['official', 'github', 'paper', 'web', 'rss'].includes(item.sourceKind);
}

function extractSourceDisplayName(sourceName) {
  const raw = `${sourceName || ''}`.trim();
  const match = raw.match(/^(?:X|Twitter|推文|微博)?[：:]\s*([^@（(]+)|^([^@（(]+)\s+@/i);
  const value = (match?.[1] || match?.[2] || '').trim();
  if (!value) return '';
  if (NON_PERSON_SOURCE_DISPLAY_TERMS.some(term => normalizeLoose(value).includes(term))) return '';
  return value;
}

function cleanPersonName(name) {
  return `${name || ''}`
    .replace(/[：:，,。.;；、'"“”‘’()[\]{}<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikePersonNameCandidate(name, dbSnapshot) {
  if (!name) return false;
  const normalized = normalizeLoose(name);
  if (STOP_TERMS.has(name) || PERSON_ALIAS_BLOCKLIST.has(normalized)) return false;
  if (matchAliases(name, dbSnapshot.orgAliases, 1).length > 0) return false;
  if (COMPANY_OWNER_HINTS.some(hint => hint.pattern.test(name))) return false;
  if (hasCjk(name)) {
    if (name.length < 2 || name.length > 4) return false;
    if (/公司|科技|智能|团队|研究|模型|日报|快讯|机器|平台|工具|产品/.test(name)) return false;
    return true;
  }

  const words = name.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 4) return false;
  if (!words.every(word => /^[A-Z][a-z][A-Za-z'-]*$/.test(word))) return false;
  if (words.some(word => PERSON_NAME_WORD_BLOCKLIST.has(word.toLowerCase()))) return false;
  return true;
}

function sortedMapLabels(map) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => `${label}:${count}`);
}

function recommendContentAbsorption(cluster) {
  const item = cluster.representative;
  if (cluster.libraryDuplicateStatus === 'possible_library_duplicate') {
    return {
      action: '人工复核同事件',
      path: '先比对库内相似标题，再决定是否只补引用',
      dedupeDecision: 'possible_library_duplicate',
      reason: formatLibraryMatchReason(cluster),
    };
  }
  if (isDiscoveryOnlySourceName(item.sourceName)) {
    return {
      action: '回抓原始来源',
      path: '不用聚合/翻译源正文，按 sourceUrl 抓原文后再入库',
      dedupeDecision: 'fresh_via_discovery_source',
      reason: '来源名显示为聚合或翻译，适合作为发现入口。',
    };
  }
  if (item.peopleMatches.length > 0) {
    return {
      action: '补已知人物动态',
      path: 'RawPoolItem -> 清洗 -> ActivityEvent/Card 候选',
      dedupeDecision: 'fresh_candidate',
      reason: `命中人物：${item.peopleMatches.map(match => match.label).slice(0, 3).join('、')}`,
    };
  }
  if (item.organizationMatches.length > 0) {
    return {
      action: '补组织/公司动态',
      path: 'CompanySource/KnowledgeSource 候选；当前库缺表时先留审计队列',
      dedupeDecision: 'fresh_candidate',
      reason: `命中组织：${item.organizationMatches.map(match => match.label).slice(0, 3).join('、')}`,
    };
  }
  if (['official', 'github', 'paper'].includes(item.sourceKind)) {
    return {
      action: '建新实体/主题线索',
      path: 'KnowledgeSource 候选；需要实体归属后再进入人物页',
      dedupeDecision: 'fresh_candidate',
      reason: '一手/论文/GitHub 源，适合作为新主题入口。',
    };
  }
  if (item.sourceKind === 'x') {
    return {
      action: 'X 线索待一手验证',
      path: '先找官方/GitHub/论文原文；找不到再作为 X RawPool 候选',
      dedupeDecision: 'fresh_candidate',
      reason: 'X 转述信息量高，但入库前要优先找原始来源。',
    };
  }
  return {
    action: '暂不吸收',
    path: '',
    dedupeDecision: 'low_signal',
    reason: '不是已知实体，也不是一手源。',
  };
}

function freshnessRank(dedupeDecision) {
  if (dedupeDecision === 'fresh_candidate') return 3;
  if (dedupeDecision === 'fresh_via_discovery_source') return 2;
  if (dedupeDecision === 'possible_library_duplicate') return 1;
  return 0;
}

function uniqueByEventId(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = item.eventId || `${item.sourceUrl}:${item.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function formatLibraryMatchReason(cluster) {
  const match = cluster.libraryMatches?.[0];
  if (!match) return '库内有相似事件。';
  return `${match.tableName} 里疑似已有：${match.title}`;
}

function buildProminentTerms(items) {
  const counts = new Map();
  for (const item of items) {
    if (item.exactUrlCovered || item.peopleMatches.length > 0 || item.organizationMatches.length > 0) continue;
    for (const term of item.candidateTerms || []) {
      incrementMap(counts, term, 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 50)
    .map(([term, count]) => ({ term, count }));
}

function summarize(items, eventClusters, sourceCandidates, gapCandidates, potentialNewEntitySignals, sourceAbsorptionCandidates, contentAbsorptionCandidates, companyAbsorptionCandidates, peopleAbsorption) {
  const bucketCounts = countBy(items, item => item.gapBucket);
  const sectionCounts = countBy(items, item => item.section);
  const exactCovered = items.filter(item => item.exactUrlCovered).length;
  const duplicateClusters = eventClusters.filter(cluster => cluster.duplicateGroupSize > 1);
  const duplicateItemCount = duplicateClusters.reduce((sum, cluster) => sum + cluster.duplicateGroupSize, 0);
  const possibleLibraryDuplicates = eventClusters.filter(cluster => cluster.libraryDuplicateStatus === 'possible_library_duplicate').length;
  return {
    dailyItemCount: items.length,
    eventClusterCount: eventClusters.length,
    duplicateEventClusterCount: duplicateClusters.length,
    duplicateItemCount,
    maxDuplicateGroupSize: duplicateClusters.reduce((max, cluster) => Math.max(max, cluster.duplicateGroupSize), 1),
    possibleLibraryDuplicateEventCount: possibleLibraryDuplicates,
    exactCoveredItemCount: exactCovered,
    exactCoveredRate: items.length ? Number((exactCovered / items.length).toFixed(3)) : 0,
    knownPersonNewSourceCount: bucketCounts.known_person_new_source || 0,
    knownOrganizationNewSourceCount: bucketCounts.known_organization_new_source || 0,
    newSourceOrEntitySignalCount: bucketCounts.new_source_or_entity_signal || 0,
    sourceCandidateCount: sourceCandidates.length,
    sourceAbsorptionCandidateCount: sourceAbsorptionCandidates.length,
    contentAbsorptionCandidateCount: contentAbsorptionCandidates.length,
    companyAbsorptionCandidateCount: companyAbsorptionCandidates.length,
    peopleExistingCandidateCount: peopleAbsorption.existing.length,
    peopleCandidateIntakeCount: peopleAbsorption.candidateIntake.length,
    peopleDeferredCandidateCount: peopleAbsorption.deferred.length,
    gapCandidateCount: gapCandidates.length,
    potentialNewEntitySignalCount: potentialNewEntitySignals.length,
    bucketCounts,
    sectionCounts,
  };
}

function renderMarkdown(audit) {
  const lines = [];
  lines.push('# AI HOT 三维吸收审计');
  lines.push('');
  lines.push(`生成时间：${audit.generatedAt}`);
  lines.push(`范围：最近 ${audit.scope.fetchedDailyCount} 期日报，${audit.scope.dateRange.newest} 到 ${audit.scope.dateRange.oldest}，共 ${audit.scope.dailyItemCount} 条。`);
  if (audit.scope.missingOptionalTables.length > 0) {
    lines.push(`现场缺表：${audit.scope.missingOptionalTables.join('、')}。本次按现有表只读匹配。`);
  }
  lines.push('');
  lines.push('## 结论');
  lines.push('');
  lines.push(`- 原始日报条目：${audit.summary.dailyItemCount} 条；按事件去重后：${audit.summary.eventClusterCount} 个事件簇。`);
  lines.push(`- 发现重复事件簇：${audit.summary.duplicateEventClusterCount} 个，涉及 ${audit.summary.duplicateItemCount} 条，最大单簇 ${audit.summary.maxDuplicateGroupSize} 条。`);
  lines.push(`- 与本库标题/URL 疑似同事件：${audit.summary.possibleLibraryDuplicateEventCount} 个事件簇，需要人工复核后再吸收。`);
  lines.push(`- 内容源候选：${audit.summary.sourceAbsorptionCandidateCount} 个，其中直接吸收 ${audit.sourceIntakeCandidates.length} 个，发现源 ${audit.sourceDiscoveryOnlyCandidates.length} 个。`);
  lines.push(`- 公司维度候选：${audit.summary.companyAbsorptionCandidateCount} 个，优先补 CompanySource / 公司动态。`);
  lines.push(`- 人物维度：已有库人物 ${audit.summary.peopleExistingCandidateCount} 个；可进 candidate 复核 ${audit.summary.peopleCandidateIntakeCount} 个；暂不符合人物准入 ${audit.summary.peopleDeferredCandidateCount} 个。`);
  lines.push(`- P0 缺口候选：${audit.summary.gapCandidateCount} 个事件簇；潜在新实体/新来源线索：${audit.summary.potentialNewEntitySignalCount} 个事件簇。`);
  lines.push(`- 精确 URL 已覆盖：${audit.summary.exactCoveredItemCount}/${audit.summary.dailyItemCount}（${formatPercent(audit.summary.exactCoveredRate)}）。`);
  lines.push('');
  lines.push('## 吸收判断');
  lines.push('');
  lines.push('- 内容源分三类：公司属性源、独立内容/信号源、发现源。公司属性源优先挂到 CompanySource，不和媒体/个人转述混放。');
  lines.push('- 公司维度优先吸收已有 Organization 的官方 blog/news/research、GitHub release、产品 release note、融资/合作/招聘等属性证据。');
  lines.push('- 人物维度只把已有库人物的新动态直接纳入；新人必须至少有 strong source 和职位/组织语境，只有 X/聚合/转述不进人物候选。');
  lines.push('- 重复控制按事件簇处理：同 URL 直接归一；中英文转述、媒体稿、X 转述共享实体和事件词时只保留一个候选。');
  lines.push('');
  lines.push('## 维度一：内容源 Top 30');
  lines.push('');
  lines.push(markdownTable(
    ['分数', '建议', '归类', '信源', 'Owner 公司', '角色', '类型', '新事件', '疑似重复', '理由', '样例'],
    audit.sourceIntakeCandidates.slice(0, 30).map(source => [
      source.score,
      source.recommendation,
      formatSourcePlacement(source.sourcePlacement),
      source.displayName,
      source.ownerCompany || '',
      source.companyRoles.slice(0, 3).join(', '),
      source.sourceKind,
      source.freshEventCount,
      source.possibleDuplicateEventCount,
      source.reason,
      source.examples[0] ? linkText(source.examples[0].title, source.examples[0].sourceUrl) : '',
    ]),
  ));
  lines.push('');
  lines.push('## 只做发现、不直接吸收的源 Top 15');
  lines.push('');
  lines.push(markdownTable(
    ['分数', '建议', '归类', '信源', '类型', '新事件', '已知实体', '理由', '样例'],
    audit.sourceDiscoveryOnlyCandidates.slice(0, 15).map(source => [
      source.score,
      source.recommendation,
      formatSourcePlacement(source.sourcePlacement),
      source.displayName,
      source.sourceKind,
      source.freshEventCount,
      source.knownEntityEventCount,
      source.reason,
      source.examples[0] ? linkText(source.examples[0].title, source.examples[0].sourceUrl) : '',
    ]),
  ));
  lines.push('');
  lines.push('## 维度二：公司 Top 30');
  lines.push('');
  lines.push(markdownTable(
    ['分数', '动作', '公司', '库内已有', '新事件', '源归属事件', '已有人物事件', '公司角色', '主要源', '理由', '样例'],
    audit.companyAbsorptionCandidates.slice(0, 30).map(company => [
      company.score,
      company.action,
      company.company,
      company.existsInOrganization ? '是' : '否',
      company.freshEventCount,
      company.sourceOwnerEventCount,
      company.knownPersonEventCount,
      company.roles.slice(0, 4).join(', '),
      company.sourceKeys.slice(0, 3).join(', '),
      company.reason,
      company.examples[0] ? linkText(company.examples[0].title, company.examples[0].sourceUrl) : '',
    ]),
  ));
  lines.push('');
  lines.push('## 维度三：人 - 已有库人物 Top 30');
  lines.push('');
  lines.push(markdownTable(
    ['分数', '人物', '状态', '角色', '当前职位', '组织', '新事件', '疑似重复', '来源类型', '样例'],
    audit.peopleExistingCandidates.slice(0, 30).map(person => [
      person.score,
      person.name,
      person.status,
      person.roleCategory,
      person.currentTitle,
      person.organization.join(', '),
      person.freshEventCount,
      person.duplicateRiskEventCount,
      person.sourceKinds.slice(0, 3).join(', '),
      person.examples[0] ? linkText(person.examples[0].title, person.examples[0].sourceUrl) : '',
    ]),
  ));
  lines.push('');
  lines.push('## 维度三：人 - 新人 candidate 复核');
  lines.push('');
  lines.push(markdownTable(
    ['分数', '人物', '动作', '新事件', 'strong source', '职位/组织语境', '相关公司', '理由', '样例'],
    audit.peopleCandidateIntake.slice(0, 30).map(person => [
      person.score,
      person.name,
      person.action,
      person.freshEventCount,
      person.strongSourceEventCount,
      person.roleContextEventCount,
      person.ownerCompanies.join(', '),
      person.reason,
      person.examples[0] ? linkText(person.examples[0].title, person.examples[0].sourceUrl) : '',
    ]),
  ));
  lines.push('');
  lines.push('## 维度三：人 - 暂不符合人物准入 Top 30');
  lines.push('');
  lines.push(markdownTable(
    ['分数', '名称', '动作', '新事件', 'strong source', '职位/组织语境', '转述者信号', '理由', '样例'],
    audit.peopleDeferredCandidates.slice(0, 30).map(person => [
      person.score,
      person.name,
      person.action,
      person.freshEventCount,
      person.strongSourceEventCount,
      person.roleContextEventCount,
      person.likelyCuratorEventCount,
      person.reason,
      person.examples[0] ? linkText(person.examples[0].title, person.examples[0].sourceUrl) : '',
    ]),
  ));
  lines.push('');
  lines.push('## 证据附录：建议吸收的具体内容（已知人物/组织）Top 30');
  lines.push('');
  lines.push(markdownTable(
    ['优先级', '动作', '去重判断', '日期', '版块', '命中/候选', '标题', '来源', '入库路径', '理由'],
    audit.contentKnownEntityCandidates.slice(0, 30).map(item => [
      item.priority,
      item.absorbAction,
      formatDedupeDecision(item.dedupeDecision),
      item.date,
      item.section,
      formatMatches(item) || item.candidateTerms.slice(0, 5).join(', '),
      linkText(item.title, item.sourceUrl),
      item.sourceName,
      item.absorbPath,
      item.reason,
    ]),
  ));
  lines.push('');
  lines.push('## 证据附录：新实体/主题线索 Top 30');
  lines.push('');
  lines.push(markdownTable(
    ['优先级', '动作', '去重判断', '日期', '版块', '候选词', '标题', '来源', '入库路径', '理由'],
    audit.contentNewSignalCandidates.slice(0, 30).map(item => [
      item.priority,
      item.absorbAction,
      formatDedupeDecision(item.dedupeDecision),
      item.date,
      item.section,
      item.candidateTerms.slice(0, 5).join(', '),
      linkText(item.title, item.sourceUrl),
      item.sourceName,
      item.absorbPath,
      item.reason,
    ]),
  ));
  lines.push('');
  lines.push('## P0：已知实体的新内容缺口 Top 30（按事件去重）');
  lines.push('');
  lines.push(markdownTable(
    ['优先级', '日期', '版块', '重复数', '命中对象', '标题', '代表来源', '其他来源'],
    audit.p0GapCandidates.slice(0, 30).map(item => [
      item.priority,
      item.date,
      item.section,
      item.duplicateGroupSize,
      formatMatches(item),
      linkText(item.title, item.sourceUrl),
      item.sourceName,
      formatDuplicateSources(item),
    ]),
  ));
  lines.push('');
  lines.push('## P0：潜在新实体 / 新内容线索 Top 30（按事件去重）');
  lines.push('');
  lines.push(markdownTable(
    ['优先级', '日期', '版块', '重复数', '候选词', '标题', '代表来源', '其他来源'],
    audit.p0PotentialNewEntitySignals.slice(0, 30).map(item => [
      item.priority,
      item.date,
      item.section,
      item.duplicateGroupSize,
      item.candidateTerms.slice(0, 5).join(', '),
      linkText(item.title, item.sourceUrl),
      item.sourceName,
      formatDuplicateSources(item),
    ]),
  ));
  lines.push('');
  lines.push('## P0：重复事件簇 Top 20');
  lines.push('');
  lines.push(markdownTable(
    ['重复数', '日期', '版块', '代表标题', '来源', '重复标题样例'],
    audit.p0DuplicateEventClusters.slice(0, 20).map(item => [
      item.duplicateGroupSize,
      item.dates.slice(0, 3).join(', '),
      item.sections.slice(0, 3).join(', '),
      linkText(item.title, item.sourceUrl),
      item.duplicateSources.slice(0, 4).join(', '),
      item.duplicateTitles.slice(0, 3).join(' / '),
    ]),
  ));
  lines.push('');
  lines.push('## P1：一手 / X / GitHub 优先信源 Top 30');
  lines.push('');
  lines.push(markdownTable(
    ['分数', '信源', '类型', '条数', '日期数', '库内域名覆盖', '建议动作', '样例'],
    audit.p1PrimarySourceCandidates.slice(0, 30).map(source => [
      source.sourceScore,
      source.displayName,
      source.sourceKind,
      source.count,
      source.distinctDateCount,
      source.domainCoverageCount,
      source.action,
      source.examples[0] ? linkText(source.examples[0].title, source.examples[0].sourceUrl) : '',
    ]),
  ));
  lines.push('');
  lines.push('## P1：全量可沉淀信源 Top 30');
  lines.push('');
  lines.push(markdownTable(
    ['分数', '信源', '类型', '条数', '日期数', '版块', '库内域名覆盖', '建议动作', '样例'],
    audit.p1SourceCandidates.slice(0, 30).map(source => [
      source.sourceScore,
      source.displayName,
      source.sourceKind,
      source.count,
      source.distinctDateCount,
      source.sections.slice(0, 4).join(', '),
      source.domainCoverageCount,
      source.action,
      source.examples[0] ? linkText(source.examples[0].title, source.examples[0].sourceUrl) : '',
    ]),
  ));
  lines.push('');
  lines.push('## 可复跑命令');
  lines.push('');
  lines.push('```bash');
  lines.push('pnpm audit:aihot -- --take=50');
  lines.push('```');
  lines.push('');
  lines.push('## 口径');
  lines.push('');
  lines.push('- 精确覆盖：AI HOT `sourceUrl` 与本库 RawPoolItem / ActivityEvent / Card / QAAuditLog / Course / PersonRelation 等 URL 标准化后相同。');
  lines.push('- 库内疑似同事件：AI HOT 事件簇与本库已有内容标题共享具体产品/模型/事件词，并达到保守的标题 token 重叠阈值；这类不自动吸收，只进人工复核。');
  lines.push('- 已知实体命中：标题、摘要或来源名中出现本库 People 名称/别名，或 Organization / People.organization 名称。');
  lines.push('- 事件去重：同 URL 直接归一；不同 URL 需在 3 天内共享人物/组织和具体产品/模型/事件词，避免中英文转述、媒体稿和 X 转述重复进入 P0。');
  lines.push('- 信源覆盖：按域名或 X handle 归一；`CompanySource` / `KnowledgeSource` 当前库里不存在，所以未计入。');
  lines.push('- 输出是候选审计，不自动入库。');
  lines.push('');
  return lines.join('\n');
}

function printSummary(audit, options) {
  console.log(JSON.stringify({
    generatedAt: audit.generatedAt,
    outputJson: options.outputJson,
    outputMd: options.outputMd,
    scope: audit.scope,
    summary: audit.summary,
    topGap: audit.p0GapCandidates[0] || null,
    topSource: audit.p1SourceCandidates[0] || null,
  }, null, 2));
}

async function writeJson(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(payload, null, 2));
}

async function writeMarkdown(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

function matchAliases(text, aliases, limit) {
  const matches = [];
  const seen = new Set();
  for (const alias of aliases) {
    if (seen.has(`${alias.label}:${alias.alias}`)) continue;
    if (!containsAlias(text, alias.alias)) continue;
    seen.add(`${alias.label}:${alias.alias}`);
    matches.push({
      id: alias.id,
      label: alias.label,
      alias: alias.alias,
      status: alias.status,
      source: alias.source,
      currentTitle: alias.currentTitle,
      organization: alias.organization,
      roleCategory: alias.roleCategory,
      influenceScore: alias.influenceScore,
    });
    if (matches.length >= limit) break;
  }
  return matches;
}

function containsAlias(text, alias) {
  if (!text || !alias) return false;
  const trimmed = alias.trim();
  if (hasCjk(trimmed)) return text.includes(trimmed);
  const pattern = new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(trimmed)}([^A-Za-z0-9]|$)`, 'i');
  return pattern.test(text);
}

function isUsableAlias(alias, type) {
  if (!alias || typeof alias !== 'string') return false;
  const value = alias.trim();
  if (!value) return false;
  if (STOP_TERMS.has(value)) return false;
  if (type === 'person') {
    if (hasCjk(value)) return value.length >= 2;
    return value.length >= 4;
  }
  if (hasCjk(value)) return value.length >= 2;
  return value.length >= 3;
}

function mergeMatches(matches) {
  const byLabel = new Map();
  for (const match of matches || []) {
    const key = `${match.source || ''}:${match.label}`;
    if (!byLabel.has(key)) byLabel.set(key, match);
  }
  return [...byLabel.values()].slice(0, 10);
}

function extractProminentTerms(text) {
  const terms = new Set();
  const latinMatches = text.match(/\b[A-Z][A-Za-z0-9.+-]*(?:\s+[A-Z][A-Za-z0-9.+-]*){0,3}\b/g) || [];
  for (const raw of latinMatches) {
    const term = raw.trim().replace(/\s+/g, ' ');
    if (term.length < 3 || STOP_TERMS.has(term)) continue;
    if (/^\d/.test(term)) continue;
    terms.add(term);
  }
  const modelMatches = text.match(/\b[A-Za-z]+[- ]?\d(?:[A-Za-z0-9.-]|\s){0,20}\b/g) || [];
  for (const raw of modelMatches) {
    const term = raw.trim().replace(/\s+/g, ' ');
    if (term.length < 4 || STOP_TERMS.has(term)) continue;
    terms.add(term);
  }
  return [...terms].slice(0, 20);
}

function extractProductLikeTokens(text) {
  const terms = new Set();
  const patterns = [
    /\b[A-Z][A-Za-z0-9]*(?:[- ][A-Z0-9][A-Za-z0-9]*){0,4}\b/g,
    /\b[A-Za-z]+[- ]?\d(?:[A-Za-z0-9.-]|\s){0,16}\b/g,
    /[\u4e00-\u9fffA-Za-z0-9.+-]{2,24}(?:模型|框架|插件|工具|平台|系统|计划|合作|收购|融资|实验室|基准|数据集|发布|开源)/g,
  ];
  for (const pattern of patterns) {
    for (const raw of text.match(pattern) || []) {
      const token = normalizeToken(raw);
      if (isSpecificEventToken(token)) terms.add(token);
    }
  }
  return [...terms].slice(0, 30);
}

function buildStandaloneSignatureTokens(text) {
  const tokens = new Set();
  for (const term of extractProminentTerms(text)) {
    const token = normalizeToken(term);
    if (isSpecificEventToken(token)) tokens.add(`term:${token}`);
  }
  for (const term of extractProductLikeTokens(text)) {
    const token = normalizeToken(term);
    if (isSpecificEventToken(token)) tokens.add(`term:${token}`);
  }
  return [...tokens].sort();
}

function buildTextTokens(text) {
  const normalized = normalizeToken(text);
  const tokens = new Set();
  for (const token of normalized.match(/[a-z0-9][a-z0-9.+-]{2,}/g) || []) {
    if (!isSpecificEventToken(token)) continue;
    tokens.add(token);
  }
  const cjk = normalized.match(/[\u4e00-\u9fff]{2,}/g) || [];
  for (const chunk of cjk) {
    for (let index = 0; index < chunk.length - 1; index += 1) {
      const token = chunk.slice(index, index + 2);
      if (!GENERIC_EVENT_TERMS.has(token)) tokens.add(token);
    }
  }
  return [...tokens].slice(0, 80);
}

function normalizeToken(value) {
  return `${value || ''}`
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[：:，,。.;；、'"“”‘’()\[\]{}<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^the\s+/, '')
    .trim();
}

function isSpecificEventToken(token) {
  if (!token || token.length < 2) return false;
  if (GENERIC_EVENT_TERMS.has(token)) return false;
  if (/^\d+(\.\d+)?$/.test(token)) return false;
  if (!hasCjk(token) && token.length < 4) return false;
  return true;
}

function tokenOverlap(leftSet, rightSet) {
  const intersection = intersectTokens(leftSet, rightSet).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return {
    intersection,
    union,
    jaccard: union ? intersection / union : 0,
  };
}

function intersectTokens(leftSet, rightSet) {
  const matches = [];
  for (const token of leftSet) {
    if (rightSet.has(token)) matches.push(token);
  }
  return matches;
}

function filterTokenSet(set, predicate) {
  return new Set([...set].filter(predicate));
}

function daysBetween(leftDate, rightDate) {
  const left = Date.parse(leftDate);
  const right = Date.parse(rightDate);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return 0;
  return Math.round((left - right) / (24 * 60 * 60 * 1000));
}

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    parsed.hash = '';
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^utm_/i.test(key) || ['ref', 'ref_src', 'fbclid', 'gclid'].includes(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.hostname = normalizeHost(parsed.hostname);
    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url.trim().replace(/\/+$/, '').toLowerCase();
  }
}

function sourceKey(url, sourceName) {
  const fromUrl = sourceKeyFromUrl(url);
  if (fromUrl) return fromUrl;
  const handleMatch = `${sourceName || ''}`.match(/@([A-Za-z0-9_]+)/);
  if (handleMatch) return `x:${handleMatch[1].toLowerCase()}`;
  return normalizeLoose(sourceName);
}

function sourceKeyFromUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = normalizeHost(parsed.hostname);
    if (host === 'x.com' || host === 'twitter.com') {
      const handle = parsed.pathname.split('/').filter(Boolean)[0];
      return handle ? `x:${handle.toLowerCase()}` : 'x.com';
    }
    return host;
  } catch {
    if (/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(url)) return normalizeHost(url);
    return '';
  }
}

function inferSourceKind(url, sourceName) {
  const source = `${url} ${sourceName}`.toLowerCase();
  const host = sourceKeyFromUrl(url);
  if (host.startsWith('x:') || source.includes('twitter.com') || source.includes('x.com/')) return 'x';
  if (source.includes('github.com')) return 'github';
  if (source.includes('arxiv.org') || source.includes('openreview.net')) return 'paper';
  if (source.includes('rss')) return 'rss';
  if (/blog|news|research|docs|huggingface\.co|openai\.com|anthropic\.com|deepmind|x\.ai|mistral|cohere|nvidia|meta\.com|microsoft\.com|google/.test(source)) {
    return 'official';
  }
  return 'web';
}

function normalizeHost(hostname) {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/^mobile\./, '')
    .replace(/^m\./, '');
}

function normalizeLoose(value) {
  return `${value || ''}`.trim().toLowerCase().replace(/\s+/g, ' ');
}

function uniqueNonEmpty(values) {
  return [...new Set(values.filter(value => typeof value === 'string').map(value => value.trim()).filter(Boolean))];
}

function incrementMap(map, key, by) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + by);
}

function topMapKey(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || '';
}

function countBy(items, getter) {
  const counts = {};
  for (const item of items) {
    const key = getter(item) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function comparePriority(a, b) {
  return b.priority - a.priority || b.date.localeCompare(a.date) || a.title.localeCompare(b.title);
}

function markdownTable(headers, rows) {
  if (rows.length === 0) return '_无_';
  const clean = value => `${value ?? ''}`.replace(/\n/g, ' ').replace(/\|/g, '\\|').trim();
  const lines = [
    `| ${headers.map(clean).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
  ];
  for (const row of rows) {
    lines.push(`| ${row.map(clean).join(' | ')} |`);
  }
  return lines.join('\n');
}

function formatMatches(item) {
  const labels = [
    ...item.peopleMatches.map(match => `人物:${match.label}`),
    ...item.organizationMatches.map(match => `组织:${match.label}`),
  ];
  return [...new Set(labels)].slice(0, 6).join(', ');
}

function formatDuplicateSources(item) {
  if (!item.duplicateSources || item.duplicateSources.length <= 1) return '';
  return item.duplicateSources
    .filter(source => source !== item.sourceName)
    .slice(0, 4)
    .join(', ');
}

function formatDedupeDecision(decision) {
  if (decision === 'fresh_candidate') return '新事件';
  if (decision === 'fresh_via_discovery_source') return '新线索/需回抓原文';
  if (decision === 'possible_library_duplicate') return '疑似库内同事件';
  if (decision === 'exact_url_covered') return 'URL 已覆盖';
  return decision || '';
}

function formatSourcePlacement(placement) {
  if (placement === 'company_attribute_source') return '公司属性源';
  if (placement === 'discovery_only_source') return '发现源';
  if (placement === 'standalone_primary_source') return '独立一手源';
  if (placement === 'standalone_signal_source') return '独立信号源';
  if (placement === 'candidate_content_source') return '候选内容源';
  return placement || '';
}

function isDiscoveryOnlySourceName(sourceName) {
  return DISCOVERY_ONLY_SOURCE_PATTERNS.some(pattern => pattern.test(`${sourceName || ''}`));
}

function linkText(title, url) {
  if (!url) return title;
  return `[${title}](${url})`;
}

function formatPercent(value) {
  if (value > 0 && value < 0.01) return '<1%';
  return `${Math.round(value * 100)}%`;
}

function hasCjk(value) {
  return /[\u3400-\u9FFF]/.test(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
