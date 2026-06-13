/**
 * Generate a MiMo remediation queue for reviewed fact-claim issues.
 *
 * Read-only. This script does not modify database records. It turns existing
 * fact reviews into actionable queues: delete candidates, conservative rewrite
 * candidates, source refetch tasks, and human review.
 *
 * Usage:
 *   node scripts/audit/remediate_fact_claim_issues_mimo.mjs --limit=50
 *   node scripts/audit/remediate_fact_claim_issues_mimo.mjs --limit=0 --batch-size=8 --concurrency=4
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const CLAIMS_FILE = getArg('--claims') || 'docs/audit-2026-06/data/fact_claims.jsonl';
const REVIEW_DIR = getArg('--review-dir') || 'docs/audit-2026-06/data';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/fact_claim_remediation_mimo.jsonl';
const SUMMARY_OUT = getArg('--summary-out') || OUT.replace(/\.jsonl$/i, '_summary.json');
const REPORT_OUT = getArg('--report-out') || 'docs/audit-2026-06/FACT_CLAIM_REMEDIATION_MIMO.md';
const CLAIM_TYPE_FILTER = getArg('--claim-type');
const VERDICT_FILTER = getArg('--verdict');
const ACTION_FILTER = getArg('--action');
const PERSON_FILTER = getArg('--person');
const LIMIT = numberArg('--limit', 200);
const BATCH_SIZE = numberArg('--batch-size', 6);
const CONCURRENCY = numberArg('--concurrency', 2);
const MAX_RETRIES = numberArg('--max-retries', 3);
const MODEL = getArg('--model') || 'mimo-v2.5-pro';
const DRY_RUN = process.argv.includes('--dry-run');
const RESUME = process.argv.includes('--resume');
const SANITIZE_ONLY = process.argv.includes('--sanitize-only');

const DELETE_ACTIONS = new Set([
  'delete_raw_pool_item',
  'delete_card',
  'delete_product',
  'delete_role',
  'delete_official_link',
  'delete_relation',
  'delete_course',
]);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function numberArg(name, fallback) {
  const raw = getArg(name);
  if (raw === '0') return 0;
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
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

function loadMimoConfig() {
  const envMaps = [
    process.env,
    readEnvFile(path.join(os.homedir(), '.code-agent/.env')),
    readEnvFile(path.resolve('.env')),
    readEnvFile(path.resolve('.env.local')),
  ];
  const apiKey = envValue('XIAOMI_API_KEY', envMaps);
  const baseUrl = envValue('XIAOMI_API_URL', envMaps)
    || envValue('XIAOMI_BASE_URL', envMaps)
    || 'https://token-plan-sgp.xiaomimimo.com/v1';

  if (!apiKey) throw new Error('Missing XIAOMI_API_KEY. Expected process env or ~/.code-agent/.env.');
  return { apiKey, baseUrl: baseUrl.replace(/\/+$/, '') };
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function loadReviewRows() {
  const rows = [];
  for (const name of fs.readdirSync(REVIEW_DIR).sort()) {
    if (!/^fact_claim_reviews_.*_mimo\.jsonl$/.test(name)) continue;
    if (name.includes('dario_products')) continue;
    for (const row of readJsonl(path.join(REVIEW_DIR, name))) {
      rows.push({ ...row, reviewFile: name });
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.claimId)) continue;
    seen.add(row.claimId);
    deduped.push(row);
  }
  return deduped;
}

function compact(text, max = 900) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}...`;
}

function compactValue(value) {
  if (!value || typeof value !== 'object') return value ?? null;
  const allowed = [
    'id',
    'personId',
    'type',
    'title',
    'content',
    'tags',
    'sourceUrl',
    'url',
    'text',
    'sourceType',
    'role',
    'roleZh',
    'orgName',
    'orgNameZh',
    'startDate',
    'endDate',
    'name',
    'org',
    'year',
    'description',
    'category',
    'role',
    'topic',
    'reason',
    'rank',
    'platform',
  ];
  const output = {};
  for (const key of allowed) {
    if (value[key] === undefined) continue;
    output[key] = typeof value[key] === 'string' ? compact(value[key], 500) : value[key];
  }
  return output;
}

function enrichIssue(review, claim) {
  return {
    claimId: review.claimId,
    personId: review.personId,
    person: review.person,
    claimType: review.claimType,
    surface: review.surface,
    fieldPath: review.fieldPath,
    objectLabel: review.objectLabel,
    priority: review.priority,
    verdict: review.verdict,
    reviewAction: review.recommendedAction,
    reviewConfidence: review.confidence,
    reviewReason: review.reason,
    reviewRewriteSuggestion: review.rewriteSuggestion,
    reviewEvidenceNeeded: review.evidenceNeeded || [],
    claimText: compact(claim?.claimText, 900),
    verificationQuestion: claim?.verificationQuestion || '',
    personContext: claim?.personContext || null,
    sourceHints: claim?.sourceHints || [],
    value: compactValue(claim?.value),
  };
}

function filterIssues(issues) {
  let filtered = issues.filter((issue) => issue.verdict !== 'supported');
  if (CLAIM_TYPE_FILTER) filtered = filtered.filter((issue) => issue.claimType === CLAIM_TYPE_FILTER);
  if (VERDICT_FILTER) filtered = filtered.filter((issue) => issue.verdict === VERDICT_FILTER);
  if (ACTION_FILTER) filtered = filtered.filter((issue) => issue.reviewAction === ACTION_FILTER);
  if (PERSON_FILTER) filtered = filtered.filter((issue) => issue.person === PERSON_FILTER);
  if (LIMIT > 0) filtered = filtered.slice(0, LIMIT);
  return filtered;
}

function buildMessages(batch) {
  const system = [
    '你是 AI 人物库的数据修复编排员。',
    '你处理的是已经审核出问题的 fact claim。目标不是重新判断对错，而是给出最保守、可执行、可复核的 remediation 队列。',
    '绝对规则：不要编造新事实；没有来源时只能产 refetch_source 或 human_review；不要把 MIMO 自己的记忆当来源。',
    'wrong_person / unsupported 优先删除候选；over_attributed 优先保守改写或移出代表成果；stale 优先关闭 now 展示或重抓当前来源；needs_source 只生成来源重抓任务。',
    '只有外部内容错挂到人物名下这类高置信删除候选可标 safeToAutoApply=true。其他写库、改文案、改产品、改履历都必须 safeToAutoApply=false。',
    '输出 JSON 对象，不要 Markdown。',
  ].join('\n');

  const user = JSON.stringify({
    outputShape: {
      results: [
        {
          claimId: 'string',
          remediationAction: 'delete_raw_pool_item | delete_card | delete_product | delete_role | delete_official_link | delete_relation | delete_course | rewrite_conservative | rewrite_product_family | close_historical_role | refetch_source | human_review | hold',
          safeToAutoApply: 'boolean',
          confidence: 'number 0..1',
          target: {
            objectType: 'string|null',
            objectId: 'string|null',
            fieldPath: 'string',
            objectLabel: 'string|null'
          },
          proposedValue: 'object|string|null',
          proposedText: 'string|null',
          sourceQueries: ['string'],
          evidenceRequirements: ['string'],
          rationale: '中文，120字内',
          blockers: ['string']
        },
      ],
    },
    remediationPolicy: {
      safeAutoApplyOnlyWhen: [
        'claimType is source_item_belongs_to_person',
        'verdict is wrong_person or unsupported',
        'remediationAction is delete_raw_pool_item',
        'confidence >= 0.85',
      ],
      neverAutoApply: [
        'rewrites',
        'currentTitle changes',
        'PersonRole changes',
        'product changes',
        'officialLinks unless manually confirmed',
        'relationship changes',
      ],
      sourceQueryGuidance: [
        'Include person name plus organization/topic disambiguators.',
        'For current title, prefer official profile, company page, personal homepage, LinkedIn/news.',
        'For products, search for the person and exact product plus role words such as lead, author, founder, PM, designer.',
      ],
    },
    issues: batch,
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

async function callMimo(config, batch, withResponseFormat = true) {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: buildMessages(batch),
      temperature: 0,
      top_p: 0.95,
      max_completion_tokens: 8192,
      thinking: { type: 'disabled' },
      ...(withResponseFormat ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    if (withResponseFormat && (response.status === 400 || response.status === 422)) {
      return callMimo(config, batch, false);
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

async function callMimoWithRetry(config, batch) {
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await callMimo(config, batch);
    } catch (error) {
      lastError = error;
      if (attempt >= MAX_RETRIES) break;
      await sleep(1000 * attempt * attempt);
    }
  }
  throw lastError;
}

function fallbackAction(issue) {
  if (issue.claimType === 'source_item_belongs_to_person' && ['wrong_person', 'unsupported'].includes(issue.verdict)) {
    return 'delete_raw_pool_item';
  }
  if (issue.reviewAction === 'remove') {
    const byType = {
      learning_card: 'delete_card',
      representative_achievement: 'delete_product',
      career_role: 'delete_role',
      official_link: 'delete_official_link',
      person_relation: 'delete_relation',
      person_relation_display: 'delete_relation',
      course: 'delete_course',
    };
    return byType[issue.claimType] || 'human_review';
  }
  if (issue.verdict === 'stale' && issue.claimType === 'career_role') return 'close_historical_role';
  if (issue.verdict === 'over_attributed' && issue.claimType === 'representative_achievement') return 'rewrite_product_family';
  if (issue.verdict === 'over_attributed') return 'rewrite_conservative';
  if (issue.verdict === 'needs_source') return 'refetch_source';
  return 'human_review';
}

function normalizeActionForClaimType(action, issue) {
  const allowedByType = {
    source_item_belongs_to_person: new Set(['delete_raw_pool_item', 'refetch_source', 'human_review', 'hold']),
    learning_card: new Set(['delete_card', 'rewrite_conservative', 'refetch_source', 'human_review', 'hold']),
    representative_achievement: new Set(['delete_product', 'rewrite_product_family', 'rewrite_conservative', 'refetch_source', 'human_review', 'hold']),
    career_role: new Set(['delete_role', 'close_historical_role', 'rewrite_conservative', 'refetch_source', 'human_review', 'hold']),
    official_link: new Set(['delete_official_link', 'refetch_source', 'human_review', 'hold']),
    person_relation: new Set(['delete_relation', 'refetch_source', 'human_review', 'hold']),
    person_relation_display: new Set(['delete_relation', 'refetch_source', 'human_review', 'hold']),
    course: new Set(['delete_course', 'refetch_source', 'human_review', 'hold']),
    current_title: new Set(['rewrite_conservative', 'refetch_source', 'human_review', 'hold']),
    why_important: new Set(['rewrite_conservative', 'refetch_source', 'human_review', 'hold']),
    topic_contribution: new Set(['rewrite_conservative', 'refetch_source', 'human_review', 'hold']),
  };
  const allowed = allowedByType[issue.claimType];
  if (!allowed || allowed.has(action)) return action;
  return fallbackAction(issue);
}

function enforceSafety(result, issue) {
  const action = normalizeActionForClaimType(result.remediationAction || fallbackAction(issue), issue);
  const confidence = Number(result.confidence);
  const normalizedConfidence = Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0;
  const safeToAutoApply = issue.claimType === 'source_item_belongs_to_person'
    && ['wrong_person', 'unsupported'].includes(issue.verdict)
    && action === 'delete_raw_pool_item'
    && normalizedConfidence >= 0.85;

  return {
    claimId: issue.claimId,
    personId: issue.personId,
    person: issue.person,
    claimType: issue.claimType,
    verdict: issue.verdict,
    reviewAction: issue.reviewAction,
    remediationAction: action,
    safeToAutoApply,
    confidence: normalizedConfidence,
    target: {
      objectType: issue.value?.sourceType ? 'rawPoolItem' : null,
      objectId: issue.value?.id || null,
      fieldPath: issue.fieldPath,
      objectLabel: issue.objectLabel || null,
      ...(result.target && typeof result.target === 'object' ? result.target : {}),
    },
    proposedValue: result.proposedValue ?? null,
    proposedText: result.proposedText || null,
    sourceQueries: Array.isArray(result.sourceQueries) ? result.sourceQueries : [],
    evidenceRequirements: Array.isArray(result.evidenceRequirements) ? result.evidenceRequirements : [],
    rationale: String(result.rationale || '').slice(0, 300),
    blockers: [
      ...(Array.isArray(result.blockers) ? result.blockers : []),
      ...(safeToAutoApply ? [] : ['manual_review_required']),
      ...(action === 'refetch_source' && (!result.sourceQueries || result.sourceQueries.length === 0) ? ['missing_source_queries'] : []),
    ],
    reviewedAt: new Date().toISOString(),
    reviewer: { provider: 'xiaomi', model: MODEL },
  };
}

function sanitizeExistingRow(row) {
  const action = normalizeActionForClaimType(row.remediationAction, row);
  const confidence = Number(row.confidence);
  const normalizedConfidence = Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0;
  const safeToAutoApply = row.claimType === 'source_item_belongs_to_person'
    && ['wrong_person', 'unsupported'].includes(row.verdict)
    && action === 'delete_raw_pool_item'
    && normalizedConfidence >= 0.85;
  const blockers = new Set(Array.isArray(row.blockers) ? row.blockers : []);
  if (safeToAutoApply) blockers.delete('manual_review_required');
  else blockers.add('manual_review_required');
  if (action === 'refetch_source' && (!row.sourceQueries || row.sourceQueries.length === 0)) {
    blockers.add('missing_source_queries');
  }
  return {
    ...row,
    remediationAction: action,
    safeToAutoApply,
    confidence: normalizedConfidence,
    blockers: [...blockers],
  };
}

function countBy(rows, key) {
  const counts = {};
  for (const row of rows) {
    const value = key(row);
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

function table(rows, columns) {
  const header = `| ${columns.map((col) => col.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((col) => String(col.value(row) ?? '').replace(/\n/g, '<br>').replace(/\|/g, '\\|')).join(' | ')} |`);
  return [header, divider, ...body].join('\n');
}

function summarize(remediations, selectedIssues, totalIssues) {
  const byAction = countBy(remediations, (row) => row.remediationAction);
  const bySafe = countBy(remediations, (row) => row.safeToAutoApply ? 'safe_auto_apply' : 'manual_or_source_required');
  const byClaimType = countBy(remediations, (row) => row.claimType);
  const byPerson = new Map();
  for (const row of remediations) {
    const entry = byPerson.get(row.person) || { person: row.person, total: 0, safe: 0, actions: {}, samples: [] };
    entry.total += 1;
    if (row.safeToAutoApply) entry.safe += 1;
    entry.actions[row.remediationAction] = (entry.actions[row.remediationAction] || 0) + 1;
    if (entry.samples.length < 3) {
      entry.samples.push(`${row.claimType}/${row.remediationAction}: ${compact(row.rationale, 90)}`);
    }
    byPerson.set(row.person, entry);
  }

  return {
    generatedAt: new Date().toISOString(),
    input: {
      claimsFile: CLAIMS_FILE,
      reviewDir: REVIEW_DIR,
      model: MODEL,
      filters: {
        claimType: CLAIM_TYPE_FILTER || null,
        verdict: VERDICT_FILTER || null,
        action: ACTION_FILTER || null,
        person: PERSON_FILTER || null,
        limit: LIMIT,
        batchSize: BATCH_SIZE,
        concurrency: CONCURRENCY,
        resume: RESUME,
        maxRetries: MAX_RETRIES,
      },
    },
    totalProblemIssues: totalIssues,
    selectedIssues: selectedIssues.length,
    remediations: remediations.length,
    byAction,
    bySafe,
    byClaimType,
    topPeople: [...byPerson.values()]
      .sort((a, b) => b.total - a.total || b.safe - a.safe || a.person.localeCompare(b.person))
      .slice(0, 40),
    safeAutoApplyQueue: remediations.filter((row) => row.safeToAutoApply),
    manualReviewQueue: remediations.filter((row) => !row.safeToAutoApply),
  };
}

function writeReport(summary) {
  const safeRows = summary.safeAutoApplyQueue.slice(0, 80);
  const manualRows = summary.manualReviewQueue.slice(0, 80);
  const lines = [
    '# Fact Claim Remediation by MiMo',
    '',
    `Generated at: ${summary.generatedAt}`,
    `Model: ${summary.input.model}`,
    '',
    `Total problem issues: ${summary.totalProblemIssues}`,
    `Selected issues: ${summary.selectedIssues}`,
    `Remediations: ${summary.remediations}`,
    '',
    '## Actions',
    '',
    table(Object.entries(summary.byAction).sort((a, b) => b[1] - a[1]).map(([action, count]) => ({ action, count })), [
      { label: 'Action', value: (row) => row.action },
      { label: 'Count', value: (row) => row.count },
    ]),
    '',
    '## Safety',
    '',
    table(Object.entries(summary.bySafe).sort((a, b) => b[1] - a[1]).map(([safety, count]) => ({ safety, count })), [
      { label: 'Safety bucket', value: (row) => row.safety },
      { label: 'Count', value: (row) => row.count },
    ]),
    '',
    '## Top People',
    '',
    table(summary.topPeople, [
      { label: 'Person', value: (row) => row.person },
      { label: 'Total', value: (row) => row.total },
      { label: 'Safe', value: (row) => row.safe },
      { label: 'Actions', value: (row) => JSON.stringify(row.actions) },
      { label: 'Samples', value: (row) => row.samples.join('<br>') },
    ]),
    '',
    '## Safe Auto-Apply Candidates',
    '',
    table(safeRows, [
      { label: 'Person', value: (row) => row.person },
      { label: 'Type', value: (row) => row.claimType },
      { label: 'Target', value: (row) => row.target?.objectLabel || row.target?.objectId || '' },
      { label: 'Action', value: (row) => row.remediationAction },
      { label: 'Reason', value: (row) => compact(row.rationale, 140) },
    ]),
    '',
    '## Manual / Source Required Queue',
    '',
    table(manualRows, [
      { label: 'Person', value: (row) => row.person },
      { label: 'Type', value: (row) => row.claimType },
      { label: 'Target', value: (row) => row.target?.objectLabel || row.target?.objectId || '' },
      { label: 'Action', value: (row) => row.remediationAction },
      { label: 'Queries', value: (row) => row.sourceQueries.slice(0, 2).join('<br>') },
      { label: 'Reason', value: (row) => compact(row.rationale, 120) },
    ]),
    '',
  ];
  fs.writeFileSync(REPORT_OUT, `${lines.join('\n')}\n`);
}

async function main() {
  const claims = readJsonl(CLAIMS_FILE);
  const claimById = new Map(claims.map((claim) => [claim.claimId, claim]));
  const reviews = loadReviewRows();
  const issues = reviews
    .filter((review) => review.verdict !== 'supported')
    .map((review) => enrichIssue(review, claimById.get(review.claimId)));
  const selectedIssues = filterIssues(issues);

  if (SANITIZE_ONLY) {
    const rows = readJsonl(OUT).map(sanitizeExistingRow);
    fs.writeFileSync(OUT, rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
    const summary = summarize(rows, rows, issues.length);
    fs.writeFileSync(SUMMARY_OUT, `${JSON.stringify(summary, null, 2)}\n`);
    writeReport(summary);
    console.log(JSON.stringify({
      out: OUT,
      summaryOut: SUMMARY_OUT,
      reportOut: REPORT_OUT,
      remediations: summary.remediations,
      byAction: summary.byAction,
      bySafe: summary.bySafe,
      sanitized: true,
    }, null, 2));
    return;
  }

  if (DRY_RUN) {
    const selectedIds = new Set(selectedIssues.map((issue) => issue.claimId));
    const existingRows = RESUME && fs.existsSync(OUT)
      ? readJsonl(OUT).filter((row) => selectedIds.has(row.claimId))
      : [];
    console.log(JSON.stringify({
      totalProblemIssues: issues.length,
      selectedIssues: selectedIssues.length,
      existingRows: existingRows.length,
      pendingIssues: RESUME ? selectedIssues.filter((issue) => !new Set(existingRows.map((row) => row.claimId)).has(issue.claimId)).length : selectedIssues.length,
      firstIssues: selectedIssues.slice(0, 5),
    }, null, 2));
    return;
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const selectedIds = new Set(selectedIssues.map((issue) => issue.claimId));
  const existingRows = RESUME && fs.existsSync(OUT)
    ? readJsonl(OUT).filter((row) => selectedIds.has(row.claimId))
    : [];
  const existingIds = new Set(existingRows.map((row) => row.claimId));
  const pendingIssues = selectedIssues.filter((issue) => !existingIds.has(issue.claimId));
  if (RESUME) {
    fs.writeFileSync(OUT, existingRows.map((row) => JSON.stringify(row)).join('\n') + (existingRows.length ? '\n' : ''));
  } else {
    fs.writeFileSync(OUT, '');
  }

  const config = loadMimoConfig();
  const batches = [];
  for (let index = 0; index < pendingIssues.length; index += BATCH_SIZE) {
    batches.push({ index, batch: pendingIssues.slice(index, index + BATCH_SIZE) });
  }

  const remediations = [...existingRows];
  let nextBatch = 0;
  let completed = 0;

  async function runBatch(batchInfo) {
    const response = await callMimoWithRetry(config, batchInfo.batch);
    const resultById = new Map((response.results || []).map((result) => [result.claimId, result]));
    const rows = batchInfo.batch.map((issue) => enforceSafety(resultById.get(issue.claimId) || {}, issue));
    remediations.push(...rows);
    fs.appendFileSync(OUT, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
    completed += batchInfo.batch.length;
    console.log(JSON.stringify({
      batch: `${batchInfo.index + 1}-${batchInfo.index + batchInfo.batch.length}`,
      completed,
      total: pendingIssues.length,
      resumedExisting: existingRows.length,
    }));
  }

  async function worker() {
    while (nextBatch < batches.length) {
      const batchInfo = batches[nextBatch];
      nextBatch += 1;
      await runBatch(batchInfo);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, () => worker()));

  const summary = summarize(remediations, selectedIssues, issues.length);
  fs.writeFileSync(SUMMARY_OUT, `${JSON.stringify(summary, null, 2)}\n`);
  writeReport(summary);
  console.log(JSON.stringify({
    out: OUT,
    summaryOut: SUMMARY_OUT,
    reportOut: REPORT_OUT,
    remediations: summary.remediations,
    byAction: summary.byAction,
    bySafe: summary.bySafe,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
