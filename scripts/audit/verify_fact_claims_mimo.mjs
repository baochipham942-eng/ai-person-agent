/**
 * Review exported person-page claims with Xiaomi MiMo.
 *
 * Read-only. It consumes scripts/audit/export_fact_claims.mjs output and writes
 * model review verdicts. It does not modify database records.
 *
 * Usage:
 *   node scripts/audit/verify_fact_claims_mimo.mjs --in=docs/audit-2026-06/data/fact_claims.jsonl --limit=20
 *   node scripts/audit/verify_fact_claims_mimo.mjs --in=docs/audit-2026-06/data/fact_claims_dario.jsonl --claim-type=representative_achievement
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';

const INPUT = getArg('--in') || 'docs/audit-2026-06/data/fact_claims.jsonl';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/fact_claim_reviews_mimo.jsonl';
const SUMMARY_OUT = getArg('--summary-out') || OUT.replace(/\.jsonl$/i, '_summary.json');
const PERSON_FILTER = getArg('--person');
const PERSON_ID_FILTER = getArg('--person-id');
const CLAIM_TYPE_FILTER = getArg('--claim-type');
const PRIORITY_FILTER = getArg('--priority');
const LIMIT = numberArg('--limit', 20);
const BATCH_SIZE = numberArg('--batch-size', 5);
const CONCURRENCY = numberArg('--concurrency', 1);
const MODEL = getArg('--model') || 'mimo-v2.5-pro';
const DRY_RUN = process.argv.includes('--dry-run');
const RESUME = process.argv.includes('--resume');

const VALID_VERDICTS = new Set([
  'supported',
  'unsupported',
  'over_attributed',
  'wrong_person',
  'stale',
  'needs_source',
  'unclear',
]);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function numberArg(name, fallback) {
  const raw = getArg(name);
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
  const processEnv = process.env;
  const homeEnv = readEnvFile(path.join(os.homedir(), '.code-agent/.env'));
  const projectEnv = readEnvFile(path.resolve('.env'));
  const envMaps = [processEnv, homeEnv, projectEnv];

  const apiKey = envValue('XIAOMI_API_KEY', envMaps);
  const baseUrl = envValue('XIAOMI_API_URL', envMaps)
    || envValue('XIAOMI_BASE_URL', envMaps)
    || 'https://token-plan-sgp.xiaomimimo.com/v1';

  if (!apiKey) {
    throw new Error('Missing XIAOMI_API_KEY. Expected process env or ~/.code-agent/.env.');
  }

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/+$/, ''),
  };
}

function readJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function readJsonlIfExists(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return readJsonl(filePath);
}

function filterClaims(claims) {
  let filtered = claims;
  if (PERSON_FILTER) filtered = filtered.filter((claim) => claim.person === PERSON_FILTER);
  if (PERSON_ID_FILTER) filtered = filtered.filter((claim) => claim.personId === PERSON_ID_FILTER);
  if (CLAIM_TYPE_FILTER) filtered = filtered.filter((claim) => claim.claimType === CLAIM_TYPE_FILTER);
  if (PRIORITY_FILTER) filtered = filtered.filter((claim) => claim.priority === PRIORITY_FILTER);
  return filtered.slice(0, LIMIT);
}

function compactClaim(claim) {
  return {
    claimId: claim.claimId,
    person: claim.person,
    personContext: claim.personContext,
    surface: claim.surface,
    fieldPath: claim.fieldPath,
    objectType: claim.objectType,
    objectLabel: claim.objectLabel,
    claimType: claim.claimType,
    priority: claim.priority,
    claimText: claim.claimText,
    verificationQuestion: claim.verificationQuestion,
    sourceHints: claim.sourceHints,
    value: claim.value,
  };
}

function buildMessages(batch) {
  const system = [
    '你是 AI 人物库的事实核查审稿员。',
    '任务是判断每条 claim 是否适合展示在这个人物页面。',
    '重点识别：人名错配、公司/团队成果过度归因给个人、单个模型版本/API/营销入口被当成个人代表成果、职位过时、来源不足。',
    '代表成果口径：如果 claim 明确写了人物角色/贡献口径，创始人、CEO、项目负责人、论文作者可以展示其领导或参与的产品族/方法/项目；但单个版本型号、API/SDK、纯公司业务入口或没有个人贡献角色的团队成果仍应判 over_attributed 或 rewrite。',
    '不要为了显得确定而猜。给定信息不足时使用 needs_source。',
    '只输出 JSON 对象，不要 Markdown，不要解释外层文本。',
  ].join('\n');

  const user = JSON.stringify({
    instructions: {
      outputShape: {
        results: [
          {
            claimId: 'string',
            verdict: 'supported | unsupported | over_attributed | wrong_person | stale | needs_source | unclear',
            confidence: 'number 0..1',
            reason: '中文，120字内',
            recommendedAction: 'keep | remove | rewrite | needs_source | human_review',
            rewriteSuggestion: 'string|null',
            evidenceNeeded: ['string'],
          },
        ],
      },
      verdictGuidance: {
        supported: '给定内容足以支持展示',
        over_attributed: '事实可能存在，但归因层级错了，例如机构级产品、团队成果、具体版本或 API 被挂成个人代表成果',
        needs_source: '可能正确，但缺少足够证据或来源文本',
        stale: '职位、时间或状态可能过时',
        wrong_person: '更像属于其他人或同名实体',
        unsupported: '明显不成立或与给定信息冲突',
        unclear: '需要人工判断口径',
      },
    },
    claims: batch.map(compactClaim),
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
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error(`Unable to parse JSON response: ${trimmed.slice(0, 500)}`);
  }
}

function normalizeResult(result, claim) {
  const verdict = VALID_VERDICTS.has(result.verdict) ? result.verdict : 'unclear';
  const confidence = Number(result.confidence);
  return {
    claimId: claim.claimId,
    personId: claim.personId,
    person: claim.person,
    claimType: claim.claimType,
    surface: claim.surface,
    fieldPath: claim.fieldPath,
    objectLabel: claim.objectLabel,
    priority: claim.priority,
    verdict,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
    reason: String(result.reason || '').slice(0, 300),
    recommendedAction: result.recommendedAction || (verdict === 'supported' ? 'keep' : 'human_review'),
    rewriteSuggestion: result.rewriteSuggestion || null,
    evidenceNeeded: Array.isArray(result.evidenceNeeded) ? result.evidenceNeeded : [],
    reviewedAt: new Date().toISOString(),
    reviewer: {
      provider: 'xiaomi',
      model: MODEL,
    },
  };
}

async function callMimo(config, batch, withResponseFormat = true) {
  const body = {
    model: MODEL,
    messages: buildMessages(batch),
    temperature: 0,
    top_p: 0.95,
    max_completion_tokens: 4096,
    thinking: { type: 'disabled' },
    ...(withResponseFormat ? { response_format: { type: 'json_object' } } : {}),
  };

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
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

function summarize(reviews, selectedClaims, totalClaims) {
  const byVerdict = {};
  const byAction = {};
  const byClaimType = {};
  const needsAttention = [];

  for (const review of reviews) {
    byVerdict[review.verdict] = (byVerdict[review.verdict] || 0) + 1;
    byAction[review.recommendedAction] = (byAction[review.recommendedAction] || 0) + 1;
    byClaimType[review.claimType] = (byClaimType[review.claimType] || 0) + 1;
    if (review.verdict !== 'supported') {
      needsAttention.push({
        claimId: review.claimId,
        person: review.person,
        claimType: review.claimType,
        objectLabel: review.objectLabel,
        verdict: review.verdict,
        action: review.recommendedAction,
        reason: review.reason,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    input: INPUT,
    output: OUT,
    model: MODEL,
    filters: {
      person: PERSON_FILTER || null,
      personId: PERSON_ID_FILTER || null,
      claimType: CLAIM_TYPE_FILTER || null,
      priority: PRIORITY_FILTER || null,
      limit: LIMIT,
      batchSize: BATCH_SIZE,
      concurrency: CONCURRENCY,
      resume: RESUME,
    },
    totalClaims,
    selectedClaims: selectedClaims.length,
    reviewedClaims: reviews.length,
    byVerdict,
    byAction,
    byClaimType,
    needsAttention,
  };
}

async function main() {
  const allClaims = readJsonl(INPUT);
  const selectedClaims = filterClaims(allClaims);
  const selectedClaimIds = new Set(selectedClaims.map((claim) => claim.claimId));
  const existingReviews = RESUME
    ? readJsonlIfExists(OUT).filter((review) => selectedClaimIds.has(review.claimId))
    : [];
  const existingReviewIds = new Set(existingReviews.map((review) => review.claimId));
  const pendingClaims = RESUME
    ? selectedClaims.filter((claim) => !existingReviewIds.has(claim.claimId))
    : selectedClaims;

  if (DRY_RUN) {
    console.log(JSON.stringify({
      input: INPUT,
      selectedClaims: selectedClaims.length,
      existingReviews: existingReviews.length,
      pendingClaims: pendingClaims.length,
      firstClaims: pendingClaims.slice(0, 5).map(compactClaim),
    }, null, 2));
    return;
  }

  const config = loadMimoConfig();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  if (RESUME) {
    fs.writeFileSync(OUT, existingReviews.map((review) => JSON.stringify(review)).join('\n') + (existingReviews.length ? '\n' : ''));
  } else {
    fs.writeFileSync(OUT, '');
  }

  const reviews = [...existingReviews];
  const batches = [];
  for (let index = 0; index < pendingClaims.length; index += BATCH_SIZE) {
    batches.push({
      index,
      batch: pendingClaims.slice(index, index + BATCH_SIZE),
    });
  }

  let nextBatch = 0;
  let reviewedCount = existingReviews.length;

  async function runOneBatch(batchInfo) {
    const { index, batch } = batchInfo;
    const response = await callMimo(config, batch);
    const resultById = new Map((response.results || []).map((result) => [result.claimId, result]));
    const batchReviews = [];
    for (const claim of batch) {
      const result = resultById.get(claim.claimId) || {
        verdict: 'unclear',
        confidence: 0,
        reason: '模型未返回该 claim 的判定',
        recommendedAction: 'human_review',
        evidenceNeeded: [],
      };
      const review = normalizeResult(result, claim);
      batchReviews.push(review);
    }

    reviews.push(...batchReviews);
    fs.appendFileSync(OUT, batchReviews.map((review) => JSON.stringify(review)).join('\n') + '\n');
    reviewedCount += batch.length;
    console.log(JSON.stringify({
      batch: `${index + 1}-${index + batch.length}`,
      reviewed: reviewedCount,
      total: selectedClaims.length,
      pendingTotal: pendingClaims.length,
    }));
  }

  async function worker() {
    while (nextBatch < batches.length) {
      const batchInfo = batches[nextBatch];
      nextBatch += 1;
      await runOneBatch(batchInfo);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(CONCURRENCY, batches.length) },
      () => worker(),
    ),
  );

  const summary = summarize(reviews, selectedClaims, allClaims.length);
  fs.writeFileSync(SUMMARY_OUT, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify({
    out: OUT,
    summaryOut: SUMMARY_OUT,
    reviewedClaims: reviews.length,
    byVerdict: summary.byVerdict,
    byAction: summary.byAction,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
