/**
 * Refetch authoritative replacement sources for MiMo remediation rows.
 *
 * Read-only. It consumes remediation rows whose action is refetch_source,
 * searches Exa or Tavily with the stored sourceQueries, and asks MiMo to select
 * source-backed replacement candidates. It writes JSONL/summary/report only.
 *
 * Usage:
 *   node scripts/audit/refetch_source_remediation.mjs --dry-run --limit=10
 *   node scripts/audit/refetch_source_remediation.mjs --limit=20 --resume
 *   node scripts/audit/refetch_source_remediation.mjs --provider=tavily --limit=300 --resume
 *   node scripts/audit/refetch_source_remediation.mjs --provider=anysearch --limit=80 --resume
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const REMEDIATION_IN = getArg('--in')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/fact_claim_remediation_exa_source_quality_mimo.jsonl';
const CLAIMS_IN = getArg('--claims')
  || 'docs/audit-2026-06/data/exa_source_quality_mimo_claims.jsonl';
const OUT = getArg('--out')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_exa_mimo.jsonl';
const SUMMARY_OUT = getArg('--summary-out') || OUT.replace(/\.jsonl$/i, '_summary.json');
const REPORT_OUT = getArg('--report-out')
  || 'docs/audit-2026-06/REFETCH_SOURCE_EXA_MIMO.md';
const PERSON_FILTER = getArg('--person');
const LIMIT = numberArg('--limit', 20);
const OFFSET = numberArg('--offset', 0);
const SEARCH_RESULTS = numberArg('--search-results', 5);
const MAX_CANDIDATES = numberArg('--max-candidates', 8);
const CONCURRENCY = numberArg('--concurrency', 1);
const MAX_RETRIES = numberArg('--max-retries', 3);
const MODEL = getArg('--model') || 'mimo-v2.5-pro';
const SEARCH_PROVIDER = getArg('--provider') || 'exa';
const TAVILY_SEARCH_DEPTH = getArg('--tavily-search-depth') || 'basic';
const TAVILY_RAW_CONTENT = getArg('--tavily-raw-content') || 'text';
const ANYSEARCH_CONTENT_TYPES = getArg('--anysearch-content-types');
const ANYSEARCH_FRESHNESS = getArg('--anysearch-freshness');
const ANYSEARCH_ZONE = getArg('--anysearch-zone');
const DRY_RUN = process.argv.includes('--dry-run');
const RESUME = process.argv.includes('--resume');
const FETCH_ONLY = process.argv.includes('--fetch-only');

const EXA_API_URL = 'https://api.exa.ai';
const TAVILY_API_URL = 'https://api.tavily.com';
const ANYSEARCH_API_URL = 'https://api.anysearch.com/mcp';
const LOW_AUTHORITY_REPLACEMENT_HOSTS = [
  'wikipedia.org',
  'medium.com',
  'substack.com',
  'zhihu.com',
  'towardsdatascience.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'xcancel.com',
  'facebook.com',
  'instagram.com',
  'reddit.com',
  'news.ycombinator.com',
  'scholar.google.',
  'paperswithcode.com',
];

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function numberArg(name, fallback) {
  const raw = getArg(name);
  if (raw === '0') return 0;
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function readEnvFile(filePath) {
  try {
    return dotenv.parse(fs.readFileSync(filePath));
  } catch {
    return {};
  }
}

function envValue(name, envMaps) {
  for (const envMap of envMaps) {
    const value = envMap[name];
    if (value) return value;
  }
  return '';
}

function envValues(name, envMaps) {
  return envMaps
    .flatMap((envMap) => String(envMap[name] || '').split(/[\s,;]+/))
    .map((value) => value.trim())
    .filter(Boolean);
}

function loadIndexedEnvValues(prefix, envMaps, limit = 50) {
  const values = [];
  for (let index = 1; index <= limit; index += 1) {
    values.push(...envValues(`${prefix}_${index}`, envMaps));
  }
  return values;
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function loadConfig() {
  const envMaps = [
    process.env,
    readEnvFile(path.join(os.homedir(), '.code-agent/.env')),
    readEnvFile(path.resolve('.env')),
    readEnvFile(path.resolve('.env.local')),
  ];

  const exaApiKey = envValue('EXA_API_KEY', envMaps);
  const tavilyApiKeys = uniqueValues([
    ...envValues('TAVILY_API_KEYS', envMaps),
    ...loadIndexedEnvValues('TAVILY_API_KEY', envMaps),
    ...envValues('TAVILY_API_KEY', envMaps),
  ]);
  const anysearchApiKey = envValue('ANYSEARCH_API_KEY', envMaps);
  const mimoApiKey = envValue('XIAOMI_API_KEY', envMaps);
  const mimoBaseUrl = envValue('XIAOMI_API_URL', envMaps)
    || envValue('XIAOMI_BASE_URL', envMaps)
    || 'https://token-plan-sgp.xiaomimimo.com/v1';

  if (!['exa', 'tavily', 'anysearch'].includes(SEARCH_PROVIDER)) {
    throw new Error(`Unsupported --provider=${SEARCH_PROVIDER}. Expected exa, tavily, or anysearch.`);
  }
  if (SEARCH_PROVIDER === 'exa' && !exaApiKey) {
    throw new Error('Missing EXA_API_KEY. Expected process env, .env, .env.local, or ~/.code-agent/.env.');
  }
  if (SEARCH_PROVIDER === 'tavily' && !tavilyApiKeys.length) {
    throw new Error('Missing TAVILY_API_KEY(S). Expected TAVILY_API_KEY, TAVILY_API_KEYS, or TAVILY_API_KEY_1..N in process env, .env, .env.local, or ~/.code-agent/.env.');
  }
  if (!FETCH_ONLY && !mimoApiKey) {
    throw new Error('Missing XIAOMI_API_KEY. Expected process env, .env, .env.local, or ~/.code-agent/.env.');
  }

  return {
    exaApiKey,
    tavilyApiKeys,
    tavilyKeyIndex: 0,
    exhaustedTavilyKeyIndexes: new Set(),
    anysearchApiKey,
    mimoApiKey,
    mimoBaseUrl: mimoBaseUrl.replace(/\/+$/, ''),
  };
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function compact(text, max = 900) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function lower(text) {
  return compact(text).toLowerCase();
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function canonicalUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

function uniq(values) {
  return [...new Set(values.map((value) => compact(value)).filter(Boolean))];
}

function textIncludesVariant(text, variant) {
  const haystack = lower(text);
  const value = lower(variant);
  if (!value) return false;

  if (/^[a-z0-9 .'-]+$/.test(value)) {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(haystack);
  }

  return haystack.includes(value);
}

function hitList(text, variants) {
  return uniq(variants).filter((variant) => textIncludesVariant(text, variant));
}

function queryTerms(row, claim) {
  const personContext = claim?.personContext || {};
  const matched = personContext.matched || {};
  const names = uniq([
    row.person,
    ...(matched.names || []),
  ]);
  const organizations = uniq(matched.organizations || []);
  const topics = uniq(matched.topics || []);
  return { names, organizations, topics };
}

function authoritySignals(candidate, row, claim) {
  const host = hostOf(candidate.url);
  const fullText = `${candidate.title || ''} ${candidate.text || ''} ${candidate.url || ''}`;
  const terms = queryTerms(row, claim);
  const nameHits = hitList(fullText, terms.names);
  const orgHits = hitList(fullText, terms.organizations);
  const topicHits = hitList(fullText, terms.topics);
  const titleText = lower(candidate.title);
  const bodyText = lower(candidate.text);
  const pathText = lower(candidate.url);

  const flags = [];
  let score = 0;

  if (nameHits.length) score += 35;
  else flags.push('missing_person_name');

  if (orgHits.length) score += 12;
  if (topicHits.length) score += Math.min(12, topicHits.length * 3);
  if ((candidate.text || '').length >= 900) score += 12;
  else if ((candidate.text || '').length < 160) flags.push('thin_content');

  if (/\.edu$|\.ac\./.test(host) || host.includes('stanford.edu') || host.includes('mit.edu')) {
    flags.push('academic_or_institutional_source');
    score += 8;
  }

  if ([
    'openai.com',
    'anthropic.com',
    'deepmind.google',
    'research.google',
    'blog.google',
    'microsoft.com',
    'ai.meta.com',
    'nvidia.com',
    'cohere.com',
    'mistral.ai',
  ].some((domain) => host.endsWith(domain) || host.includes(domain))) {
    flags.push('official_or_primary_org_source');
    score += 10;
  }

  if ([
    'arxiv.org',
    'aclanthology.org',
    'nature.com',
    'pnas.org',
    'dl.acm.org',
    'semanticscholar.org',
    'orcid.org',
  ].some((domain) => host.endsWith(domain) || host.includes(domain))) {
    flags.push('research_source');
    score += 8;
  }

  if ([
    'time.com',
    'wired.com',
    'technologyreview.com',
    'nytimes.com',
    'theguardian.com',
    'bbc.com',
    'cnbc.com',
    'fortune.com',
    'techcrunch.com',
  ].some((domain) => host.endsWith(domain) || host.includes(domain))) {
    flags.push('credible_media_source');
    score += 6;
  }

  if (/wikipedia\.org|medium\.com|towardsdatascience\.com|paperswithcode\.com/.test(host)) {
    flags.push('secondary_or_ugc_reference_source');
    score -= 10;
  }

  if (/scholar\.google|search|\/search|results|query=|loading|登录|sign in|subscribe/.test(`${host} ${titleText} ${bodyText} ${pathText}`)) {
    flags.push('search_or_access_limited_page');
    score -= 18;
  }

  if (/youtube\.com|youtu\.be|podcasts\.apple\.com|spotify\.com|soundcloud\.com/.test(host)) {
    flags.push('media_source_needs_transcript_or_description');
    score -= candidate.text && candidate.text.length > 500 ? 0 : 8;
  }

  if (/linkedin\.com|facebook\.com|instagram\.com|reddit\.com|news\.ycombinator\.com/.test(host)) {
    flags.push('social_or_ugc_source');
    score -= 10;
  }

  return {
    host,
    score: Math.max(0, Math.min(100, score)),
    flags: uniq(flags),
    nameHits,
    orgHits,
    topicHits: topicHits.slice(0, 8),
  };
}

function toCandidate(result, row, claim, query, rank) {
  const candidate = {
    query,
    rank,
    url: result.url || '',
    title: result.title || '',
    text: result.text || result.raw_content || result.content || '',
    publishedDate: result.publishedDate || result.published_date || null,
    author: result.author || null,
    exaScore: result.score ?? null,
    providerScore: result.score ?? null,
  };
  const signals = authoritySignals(candidate, row, claim);
  return {
    ...candidate,
    host: signals.host,
    authorityScore: signals.score,
    authoritySignals: signals.flags,
    nameHits: signals.nameHits,
    orgHits: signals.orgHits,
    topicHits: signals.topicHits,
    textPreview: compact(candidate.text, 700),
  };
}

async function fetchExaJson(config, endpoint, body) {
  const response = await fetch(`${EXA_API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.exaApiKey,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Exa ${endpoint} failed: HTTP ${response.status} ${text.slice(0, 500)}`);
  }
  return JSON.parse(text);
}

async function searchOneQuery(config, query) {
  if (SEARCH_PROVIDER === 'tavily') return searchTavilyQuery(config, query);
  if (SEARCH_PROVIDER === 'anysearch') return searchAnySearchQuery(config, query);
  return searchExaQuery(config, query);
}

async function searchExaQuery(config, query) {
  const search = await fetchExaJson(config, '/search', {
    query,
    numResults: SEARCH_RESULTS,
    type: 'auto',
    useAutoprompt: true,
  });

  const results = search.results || [];
  if (!results.length) return [];

  const contents = await fetchExaJson(config, '/contents', {
    ids: results.map((result) => result.url),
    text: { maxCharacters: 3500 },
  }).catch(() => ({ results: [] }));

  const contentByUrl = new Map((contents.results || []).map((item) => [item.url, item]));
  return results.map((result) => ({
    ...result,
    ...(contentByUrl.get(result.url) || {}),
  }));
}

async function fetchTavilyJson(config, endpoint, body) {
  const keys = config.tavilyApiKeys || [];
  const errors = [];
  const attempts = Math.max(1, keys.length);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const keyIndex = nextTavilyKeyIndex(config);
    const response = await fetch(`${TAVILY_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${keys[keyIndex]}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    if (response.ok) return JSON.parse(text);

    const error = `key#${keyIndex + 1}: HTTP ${response.status} ${text.slice(0, 300)}`;
    errors.push(error);
    if (isTavilyQuotaOrRateLimit(response.status, text)) {
      config.exhaustedTavilyKeyIndexes.add(keyIndex);
      continue;
    }

    throw new Error(`Tavily ${endpoint} failed: ${error}`);
  }

  throw new Error(`Tavily ${endpoint} failed: all ${keys.length} key(s) quota_or_rate_limited. ${errors.join(' | ')}`);
}

function nextTavilyKeyIndex(config) {
  const keys = config.tavilyApiKeys || [];
  if (!keys.length) throw new Error('Tavily key pool is empty');

  for (let offset = 0; offset < keys.length; offset += 1) {
    const index = (config.tavilyKeyIndex + offset) % keys.length;
    if (!config.exhaustedTavilyKeyIndexes.has(index)) {
      config.tavilyKeyIndex = (index + 1) % keys.length;
      return index;
    }
  }

  throw new Error(`Tavily /search failed: all ${keys.length} key(s) quota_or_rate_limited`);
}

function isTavilyQuotaOrRateLimit(status, text) {
  return status === 429
    || status === 432
    || status === 433
    || /usage limit|rate limit|credits|quota/i.test(text);
}

async function searchTavilyQuery(config, query) {
  const body = {
    query,
    max_results: SEARCH_RESULTS,
    search_depth: TAVILY_SEARCH_DEPTH,
    include_answer: false,
    include_raw_content: TAVILY_RAW_CONTENT,
    include_images: false,
    include_favicon: false,
    include_usage: true,
    topic: 'general',
  };

  if (TAVILY_SEARCH_DEPTH === 'advanced') {
    body.chunks_per_source = 3;
  }

  const search = await fetchTavilyJson(config, '/search', body);
  return (search.results || []).map((result) => ({
    url: result.url,
    title: result.title,
    text: result.raw_content || result.content || '',
    publishedDate: result.published_date || null,
    author: null,
    score: result.score ?? null,
  }));
}

async function fetchAnySearchText(config, toolName, args) {
  const response = await fetch(ANYSEARCH_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.anysearchApiKey ? { Authorization: `Bearer ${config.anysearchApiKey}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    }),
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`AnySearch ${toolName} failed: invalid JSON ${text.slice(0, 300)}`);
  }

  if (!response.ok || payload.error) {
    const message = payload.error?.message || JSON.stringify(payload);
    throw new Error(`AnySearch ${toolName} failed: HTTP ${response.status} ${String(message).slice(0, 500)}`);
  }

  const content = payload.result?.content;
  if (Array.isArray(content)) {
    const textItem = content.find((item) => item.type === 'text');
    if (textItem?.text) return textItem.text;
  }

  return JSON.stringify(payload.result || payload);
}

function anySearchArgs(query) {
  const args = {
    query,
    max_results: SEARCH_RESULTS,
  };
  if (ANYSEARCH_CONTENT_TYPES) {
    args.content_types = ANYSEARCH_CONTENT_TYPES.split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (ANYSEARCH_FRESHNESS) args.freshness = ANYSEARCH_FRESHNESS;
  if (ANYSEARCH_ZONE) args.zone = ANYSEARCH_ZONE;
  return args;
}

function parseAnySearchResults(markdown, fallbackQuery = '') {
  const rows = [];
  let current = null;
  let currentQuery = fallbackQuery;
  for (const line of String(markdown || '').split(/\r?\n/)) {
    const queryHeading = line.match(/^##\s+Query\s+\d+:\s+(.+?)\s*$/);
    if (queryHeading) {
      if (current?.url) rows.push(current);
      current = null;
      currentQuery = queryHeading[1].trim();
      continue;
    }

    const heading = line.match(/^###\s+\d+\.\s+(.+?)\s*$/);
    if (heading) {
      if (current?.url) rows.push(current);
      current = {
        query: currentQuery,
        rank: Number(line.match(/^###\s+(\d+)\./)?.[1]) || rows.length + 1,
        title: heading[1].replace(/^\[(.*?)\]\s*/, '$1 ').replace(/\s+/g, ' ').trim(),
        url: '',
        textParts: [],
      };
      continue;
    }

    if (!current) continue;

    const urlLine = line.match(/^-\s+\*\*URL\*\*:\s*(\S+)\s*$/);
    if (urlLine) {
      current.url = urlLine[1].replace(/[),.;]+$/, '');
      continue;
    }

    const cleaned = line.replace(/^-\s+/, '').trim();
    if (cleaned) current.textParts.push(cleaned);
  }

  if (current?.url) rows.push(current);

  return rows.map((row) => ({
    query: row.query || fallbackQuery,
    rank: row.rank,
    url: row.url,
    title: row.title === 'N/A' ? '' : row.title,
    text: row.textParts.join(' '),
    publishedDate: null,
    author: null,
    score: null,
  }));
}

async function searchAnySearchQuery(config, query) {
  const args = anySearchArgs(query);
  const markdown = await fetchAnySearchText(config, 'search', args);
  return parseAnySearchResults(markdown, query);
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function searchAnySearchQueries(config, queries) {
  const results = [];
  for (const queryBatch of chunk(queries, 5)) {
    if (queryBatch.length === 1) {
      results.push(...await searchAnySearchQuery(config, queryBatch[0]));
      continue;
    }

    const markdown = await fetchAnySearchText(config, 'batch_search', {
      queries: queryBatch.map((query) => anySearchArgs(query)),
    });
    results.push(...parseAnySearchResults(markdown));
  }
  return results;
}

async function refetchCandidates(config, row, claim) {
  const candidates = [];
  if (SEARCH_PROVIDER === 'anysearch') {
    const results = await searchAnySearchQueries(config, row.sourceQueries || []);
    candidates.push(...results.map((result, index) => toCandidate(
      result,
      row,
      claim,
      result.query || '',
      result.rank || index + 1,
    )));
  } else {
    for (const query of row.sourceQueries || []) {
      const results = await searchOneQuery(config, query);
      candidates.push(...results.map((result, index) => toCandidate(result, row, claim, query, index + 1)));
    }
  }

  const byUrl = new Map();
  for (const candidate of candidates) {
    const key = canonicalUrl(candidate.url);
    const existing = byUrl.get(key);
    if (!existing || candidate.authorityScore > existing.authorityScore) {
      byUrl.set(key, candidate);
    }
  }

  return [...byUrl.values()]
    .sort((a, b) => b.authorityScore - a.authorityScore || (a.rank || 99) - (b.rank || 99))
    .slice(0, MAX_CANDIDATES);
}

function buildMimoMessages(task) {
  const system = [
    '你是 AI 人物库的来源重抓审稿员。',
    '你只判断候选来源是否能替换或补强 remediation 里缺失/过薄/弱匹配的来源。',
    '优先选择权威、可访问、能直接证明人物与作品/观点/职位关系的来源：官方主页、机构资料页、论文详情页、作者页、可靠媒体采访或有转录/描述的播客视频。',
    '拒绝搜索结果页、登录墙、空摘要、纯公司/团队页面、没有人物姓名或没有贡献角色的页面。',
    'Wikipedia、普通 Medium/Substack 笔记、社媒/UGC 页面只能作为辅助线索，不能作为 replace_source 的唯一依据；除非页面明确是本人官方主页或本人原创文章。',
    'YouTube/播客只有在标题、描述、作者或转录明确证明本人参与时才可选；否则保留 human_review。',
    '不要编造事实。候选里证据不够时输出 no_good_source 或 human_review。',
    '只输出 JSON 对象，不要 Markdown。',
  ].join('\n');

  const user = JSON.stringify({
    outputShape: {
      decision: 'replace_source | augment_source | no_good_source | human_review',
      confidence: 'number 0..1',
      selectedSources: [
        {
          url: 'string',
          title: 'string',
          host: 'string',
          reason: '中文，80字内',
          evidenceQuote: 'string|null, 候选文本中的短摘录',
        },
      ],
      rejectedSourceNotes: ['string'],
      proposedSourceQueries: ['string'],
      rationale: '中文，120字内',
      blockers: ['string'],
    },
    remediation: {
      claimId: task.row.claimId,
      person: task.row.person,
      target: task.row.target,
      originalSource: task.originalSource,
      sourceQueries: task.row.sourceQueries,
      evidenceRequirements: task.row.evidenceRequirements,
      rationale: task.row.rationale,
    },
    candidates: task.candidates.map((candidate) => ({
      url: candidate.url,
      title: candidate.title,
      host: candidate.host,
      authorityScore: candidate.authorityScore,
      authoritySignals: candidate.authoritySignals,
      nameHits: candidate.nameHits,
      orgHits: candidate.orgHits,
      topicHits: candidate.topicHits,
      publishedDate: candidate.publishedDate,
      author: candidate.author,
      textPreview: compact(candidate.textPreview, 900),
    })),
  });

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

function extractJsonObject(text) {
  const trimmed = String(text || '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (fenced) return JSON.parse(fenced);
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error(`Unable to parse JSON response: ${trimmed.slice(0, 500)}`);
  }
}

async function callMimo(config, task, withResponseFormat = true) {
  const response = await fetch(`${config.mimoBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.mimoApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: buildMimoMessages(task),
      temperature: 0,
      top_p: 0.95,
      max_completion_tokens: 4096,
      thinking: { type: 'disabled' },
      ...(withResponseFormat ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    if (withResponseFormat && (response.status === 400 || response.status === 422)) {
      return callMimo(config, task, false);
    }
    throw new Error(`MiMo request failed: HTTP ${response.status} ${responseText.slice(0, 500)}`);
  }

  const payload = JSON.parse(responseText);
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error(`MiMo response missing content: ${responseText.slice(0, 500)}`);
  return extractJsonObject(content);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callMimoWithRetry(config, task) {
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await callMimo(config, task);
    } catch (error) {
      lastError = error;
      if (attempt >= MAX_RETRIES) break;
      await sleep(1000 * attempt * attempt);
    }
  }
  throw lastError;
}

function normalizeMimoDecision(result, task) {
  const allowed = new Set(['replace_source', 'augment_source', 'no_good_source', 'human_review']);
  let decision = allowed.has(result?.decision) ? result.decision : 'human_review';
  const confidence = Number(result?.confidence);
  const selectedUrls = new Set((result?.selectedSources || []).map((source) => source.url));
  const selectedSources = Array.isArray(result?.selectedSources) ? result.selectedSources : [];
  const lowAuthoritySelected = selectedSources.filter((source) => isLowAuthorityReplacementHost(source.host || hostOf(source.url)));
  const hasOnlyLowAuthoritySelected = selectedSources.length > 0 && lowAuthoritySelected.length === selectedSources.length;
  const extraBlockers = [];

  if (decision === 'replace_source' && hasOnlyLowAuthoritySelected) {
    decision = 'augment_source';
    extraBlockers.push('replacement_needs_primary_or_credible_source');
  } else if (decision === 'replace_source' && lowAuthoritySelected.length > 0) {
    extraBlockers.push('replacement_contains_auxiliary_low_authority_source');
  }

  return {
    claimId: task.row.claimId,
    personId: task.row.personId,
    person: task.row.person,
    target: task.row.target,
    originalSource: task.originalSource,
    remediation: {
      action: task.row.remediationAction,
      rationale: task.row.rationale,
      evidenceRequirements: task.row.evidenceRequirements || [],
      sourceQueries: task.row.sourceQueries || [],
    },
    search: {
      provider: SEARCH_PROVIDER,
      candidateCount: task.candidates.length,
      candidates: task.candidates.map((candidate) => ({
        query: candidate.query,
        rank: candidate.rank,
        url: candidate.url,
        title: candidate.title,
        host: candidate.host,
        publishedDate: candidate.publishedDate,
        author: candidate.author,
        authorityScore: candidate.authorityScore,
        authoritySignals: candidate.authoritySignals,
        nameHits: candidate.nameHits,
        orgHits: candidate.orgHits,
        topicHits: candidate.topicHits,
        selectedByMimo: selectedUrls.has(candidate.url),
        textPreview: candidate.textPreview,
      })),
    },
    decision,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
    selectedSources,
    rejectedSourceNotes: Array.isArray(result?.rejectedSourceNotes) ? result.rejectedSourceNotes : [],
    proposedSourceQueries: Array.isArray(result?.proposedSourceQueries) ? result.proposedSourceQueries : [],
    rationale: String(result?.rationale || '').slice(0, 400),
    blockers: [
      ...(Array.isArray(result?.blockers) ? result.blockers : []),
      ...extraBlockers,
    ],
    reviewedAt: new Date().toISOString(),
    reviewer: FETCH_ONLY ? null : { provider: 'xiaomi', model: MODEL },
  };
}

function isLowAuthorityReplacementHost(host) {
  const value = lower(host);
  return LOW_AUTHORITY_REPLACEMENT_HOSTS.some((domain) => value.includes(domain));
}

function fetchOnlyDecision(task) {
  const selectedSources = task.candidates.slice(0, 3).map((candidate) => ({
    url: candidate.url,
    title: candidate.title,
    host: candidate.host,
    reason: `Heuristic candidate score ${candidate.authorityScore}`,
    evidenceQuote: null,
  }));

  return normalizeMimoDecision({
    decision: selectedSources.length ? 'human_review' : 'no_good_source',
    confidence: 0,
    selectedSources,
    rejectedSourceNotes: [],
    proposedSourceQueries: [],
    rationale: FETCH_ONLY
      ? `fetch-only mode: ${SEARCH_PROVIDER} candidates fetched without MiMo authority review.`
      : 'No candidates found.',
    blockers: FETCH_ONLY ? ['mimo_review_not_run'] : ['no_candidates'],
  }, task);
}

function loadTasks() {
  const claims = readJsonl(CLAIMS_IN);
  const claimById = new Map(claims.map((claim) => [claim.claimId, claim]));
  const rows = readJsonl(REMEDIATION_IN)
    .filter((row) => row.remediationAction === 'refetch_source')
    .filter((row) => Array.isArray(row.sourceQueries) && row.sourceQueries.length > 0)
    .filter((row) => !PERSON_FILTER || row.person === PERSON_FILTER);

  const sliced = LIMIT > 0 ? rows.slice(OFFSET, OFFSET + LIMIT) : rows.slice(OFFSET);
  return sliced.map((row) => {
    const claim = claimById.get(row.claimId) || null;
    return {
      row,
      claim,
      originalSource: {
        url: claim?.value?.url || claim?.sourceHints?.[0]?.url || null,
        title: claim?.value?.title || row.target?.objectLabel || null,
        textPreview: compact(claim?.value?.text, 700),
        sourceQualityFlags: claim?.value?.sourceQualityFlags || [],
        sourceQualityReasons: claim?.value?.sourceQualityReasons || [],
      },
    };
  });
}

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function table(rows, columns) {
  const header = `| ${columns.map((col) => col.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((col) => String(col.value(row) ?? '').replace(/\n/g, '<br>').replace(/\|/g, '\\|')).join(' | ')} |`);
  return [header, divider, ...body].join('\n');
}

function summarize(rows, selectedTasks, existingRows, stopReason = null, config = null) {
  const selectedSources = rows.flatMap((row) => row.selectedSources || []);
  const selectedHosts = countBy(selectedSources, (source) => source.host || hostOf(source.url));
  return {
    generatedAt: new Date().toISOString(),
    input: {
      remediationIn: REMEDIATION_IN,
      claimsIn: CLAIMS_IN,
      output: OUT,
      model: FETCH_ONLY ? null : MODEL,
      filters: {
        person: PERSON_FILTER || null,
        limit: LIMIT,
        offset: OFFSET,
        searchResults: SEARCH_RESULTS,
        maxCandidates: MAX_CANDIDATES,
        concurrency: CONCURRENCY,
        resume: RESUME,
        fetchOnly: FETCH_ONLY,
        provider: SEARCH_PROVIDER,
        tavilySearchDepth: SEARCH_PROVIDER === 'tavily' ? TAVILY_SEARCH_DEPTH : null,
        tavilyRawContent: SEARCH_PROVIDER === 'tavily' ? TAVILY_RAW_CONTENT : null,
        tavilyKeyCount: SEARCH_PROVIDER === 'tavily' ? (config?.tavilyApiKeys?.length || null) : null,
        anysearchContentTypes: SEARCH_PROVIDER === 'anysearch' ? (ANYSEARCH_CONTENT_TYPES || null) : null,
        anysearchFreshness: SEARCH_PROVIDER === 'anysearch' ? (ANYSEARCH_FRESHNESS || null) : null,
        anysearchZone: SEARCH_PROVIDER === 'anysearch' ? (ANYSEARCH_ZONE || null) : null,
        anysearchHasApiKey: SEARCH_PROVIDER === 'anysearch' ? Boolean(config?.anysearchApiKey) : null,
      },
    },
    selectedTasks: selectedTasks.length,
    existingRows: existingRows.length,
    pendingTasks: Math.max(0, selectedTasks.length - rows.length),
    stoppedEarly: stopReason,
    refetchResults: rows.length,
    byDecision: countBy(rows, (row) => row.decision),
    byPerson: countBy(rows, (row) => row.person),
    selectedHosts,
    selectedSources: selectedSources.length,
    candidateCount: rows.reduce((sum, row) => sum + (row.search?.candidateCount || 0), 0),
    sample: rows.slice(0, 20).map((row) => ({
      person: row.person,
      target: row.target?.objectLabel || row.target?.objectId || '',
      decision: row.decision,
      confidence: row.confidence,
      selectedSources: (row.selectedSources || []).map((source) => ({
        title: source.title,
        host: source.host || hostOf(source.url),
        url: source.url,
      })),
      rationale: row.rationale,
    })),
  };
}

function writeReport(summary, rows) {
  const lines = [
    '# Refetch Source by Search + MiMo',
    '',
    `Generated at: ${summary.generatedAt}`,
    `Remediation input: ${summary.input.remediationIn}`,
    `Output: ${summary.input.output}`,
    `Search provider: ${summary.input.filters.provider}`,
    `Model: ${summary.input.model || 'fetch-only'}`,
    '',
    '## Counts',
    '',
    table([
      { metric: 'selected tasks', value: summary.selectedTasks },
      { metric: 'existing rows reused', value: summary.existingRows },
      { metric: 'pending tasks', value: summary.pendingTasks },
      { metric: 'refetch results', value: summary.refetchResults },
      { metric: 'source candidates', value: summary.candidateCount },
      { metric: 'selected sources', value: summary.selectedSources },
    ], [
      { label: 'Metric', value: (row) => row.metric },
      { label: 'Value', value: (row) => row.value },
    ]),
    '',
    ...(summary.stoppedEarly ? [
      '## Stopped Early',
      '',
      table([summary.stoppedEarly], [
        { label: 'Reason', value: (row) => row.reason },
        { label: 'Claim', value: (row) => row.claimId },
        { label: 'Person', value: (row) => row.person },
        { label: 'Message', value: (row) => compact(row.message, 180) },
      ]),
      '',
    ] : []),
    '## Decisions',
    '',
    table(Object.entries(summary.byDecision).sort((a, b) => b[1] - a[1]).map(([decision, count]) => ({ decision, count })), [
      { label: 'Decision', value: (row) => row.decision },
      { label: 'Count', value: (row) => row.count },
    ]),
    '',
    '## Selected Hosts',
    '',
    table(Object.entries(summary.selectedHosts).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([host, count]) => ({ host, count })), [
      { label: 'Host', value: (row) => row.host },
      { label: 'Count', value: (row) => row.count },
    ]),
    '',
    '## Sample Results',
    '',
    table(rows.slice(0, 50), [
      { label: 'Person', value: (row) => row.person },
      { label: 'Target', value: (row) => compact(row.target?.objectLabel || row.target?.objectId || '', 90) },
      { label: 'Decision', value: (row) => row.decision },
      { label: 'Sources', value: (row) => (row.selectedSources || []).slice(0, 3).map((source) => `${source.title || source.url} (${source.host || hostOf(source.url)})`).join('<br>') },
      { label: 'Reason', value: (row) => compact(row.rationale, 120) },
    ]),
    '',
    '## Execution Rule',
    '',
    '- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.',
    '- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.',
    '- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.',
    '',
  ];
  fs.writeFileSync(REPORT_OUT, `${lines.join('\n')}\n`);
}

async function processTask(config, task) {
  const candidates = await refetchCandidates(config, task.row, task.claim);
  const taskWithCandidates = { ...task, candidates };
  if (!candidates.length || FETCH_ONLY) return fetchOnlyDecision(taskWithCandidates);
  const decision = await callMimoWithRetry(config, taskWithCandidates);
  return normalizeMimoDecision(decision, taskWithCandidates);
}

function classifyRefetchError(error) {
  const message = String(error?.message || error);
  if (/NO_MORE_CREDITS|exceeded your credits limit|HTTP 402/.test(message)) {
    return {
      shouldStop: true,
      reason: 'exa_no_more_credits',
      blockers: ['refetch_source_quota_exhausted'],
      message,
    };
  }
  if (/Tavily .*HTTP (429|432|433)|usage limit|rate limit|credits|quota/i.test(message)) {
    return {
      shouldStop: true,
      reason: 'tavily_quota_or_rate_limit',
      blockers: ['refetch_source_quota_or_rate_limited'],
      message,
    };
  }
  if (/AnySearch .*HTTP (429|432|433)|usage limit|rate limit|credits|quota/i.test(message)) {
    return {
      shouldStop: true,
      reason: 'anysearch_quota_or_rate_limit',
      blockers: ['refetch_source_quota_or_rate_limited'],
      message,
    };
  }
  if (/^fetch failed$|network|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/i.test(message)) {
    return {
      shouldStop: true,
      reason: 'refetch_network_error',
      blockers: ['refetch_source_network_error'],
      message,
    };
  }
  return {
    shouldStop: false,
    reason: 'refetch_error',
    blockers: ['refetch_error'],
    message,
  };
}

async function main() {
  const selectedTasks = loadTasks();
  const selectedIds = new Set(selectedTasks.map((task) => task.row.claimId));
  const existingRows = RESUME && fs.existsSync(OUT)
    ? readJsonl(OUT).filter((row) => selectedIds.has(row.claimId))
    : [];
  const existingIds = new Set(existingRows.map((row) => row.claimId));
  const pendingTasks = RESUME
    ? selectedTasks.filter((task) => !existingIds.has(task.row.claimId))
    : selectedTasks;

  if (DRY_RUN) {
    console.log(JSON.stringify({
      remediationIn: REMEDIATION_IN,
      claimsIn: CLAIMS_IN,
      provider: SEARCH_PROVIDER,
      selectedTasks: selectedTasks.length,
      existingRows: existingRows.length,
      pendingTasks: pendingTasks.length,
      firstTasks: pendingTasks.slice(0, 8).map((task) => ({
        claimId: task.row.claimId,
        person: task.row.person,
        target: task.row.target?.objectLabel || task.row.target?.objectId || '',
        sourceQueries: task.row.sourceQueries,
        originalSource: task.originalSource,
      })),
    }, null, 2));
    return;
  }

  const config = loadConfig();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  if (RESUME) {
    fs.writeFileSync(OUT, existingRows.map((row) => JSON.stringify(row)).join('\n') + (existingRows.length ? '\n' : ''));
  } else {
    fs.writeFileSync(OUT, '');
  }

  const rows = [...existingRows];
  let nextTask = 0;
  let completed = 0;
  let stopReason = null;

  async function worker() {
    while (nextTask < pendingTasks.length) {
      if (stopReason) break;
      const taskIndex = nextTask;
      nextTask += 1;
      const task = pendingTasks[taskIndex];
      try {
        const row = await processTask(config, task);
        rows.push(row);
        fs.appendFileSync(OUT, `${JSON.stringify(row)}\n`);
        completed += 1;
        console.log(JSON.stringify({
          completed,
          total: pendingTasks.length,
          resumedExisting: existingRows.length,
          claimId: task.row.claimId,
          person: task.row.person,
          decision: row.decision,
          selectedSources: row.selectedSources.length,
        }));
      } catch (error) {
        const errorInfo = classifyRefetchError(error);
        if (errorInfo.shouldStop) {
          stopReason = {
            reason: errorInfo.reason,
            claimId: task.row.claimId,
            person: task.row.person,
            message: errorInfo.message.slice(0, 500),
          };
          console.log(JSON.stringify({
            completed,
            total: pendingTasks.length,
            resumedExisting: existingRows.length,
            claimId: task.row.claimId,
            person: task.row.person,
            decision: 'stopped',
            stopReason,
          }));
          break;
        }
        const row = normalizeMimoDecision({
          decision: 'human_review',
          confidence: 0,
          selectedSources: [],
          rejectedSourceNotes: [],
          proposedSourceQueries: [],
          rationale: errorInfo.message.slice(0, 300),
          blockers: errorInfo.blockers,
        }, { ...task, candidates: [] });
        rows.push(row);
        fs.appendFileSync(OUT, `${JSON.stringify(row)}\n`);
        completed += 1;
        console.log(JSON.stringify({
          completed,
          total: pendingTasks.length,
          resumedExisting: existingRows.length,
          claimId: task.row.claimId,
          person: task.row.person,
          decision: row.decision,
          error: row.rationale,
        }));
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, pendingTasks.length) }, () => worker()),
  );

  const summary = summarize(rows, selectedTasks, existingRows, stopReason, config);
  fs.writeFileSync(SUMMARY_OUT, `${JSON.stringify(summary, null, 2)}\n`);
  writeReport(summary, rows);
  console.log(JSON.stringify({
    out: OUT,
    summaryOut: SUMMARY_OUT,
    reportOut: REPORT_OUT,
    provider: SEARCH_PROVIDER,
    refetchResults: summary.refetchResults,
    byDecision: summary.byDecision,
    selectedSources: summary.selectedSources,
    pendingTasks: summary.pendingTasks,
    stoppedEarly: summary.stoppedEarly,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
