/**
 * Review proposed card reaggregation output with MiMo against source text.
 *
 * Read-only. It checks each proposed card against the RawPoolItem text behind
 * its sourceUrl and writes a reviewed plan.
 *
 * Usage:
 *   node scripts/audit/review_card_reaggregation_plan_mimo.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const PLAN_IN = getArg('--in')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_plan.json';
const OUT = getArg('--out')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_plan_mimo_review.json';
const REPORT_OUT = getArg('--report-out')
  || 'docs/audit-2026-06/CARD_REAGGREGATION_PLAN_MIMO_REVIEW.md';
const MODEL = getArg('--model') || 'mimo-v2.5-pro';
const MAX_RETRIES = numberArg('--max-retries', 3);
const LIMIT = numberArg('--limit', 0);
const DRY_RUN = process.argv.includes('--dry-run');

loadExtraEnv();

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
if (!process.env.XIAOMI_API_KEY) throw new Error('Missing XIAOMI_API_KEY');

const sql = neon(process.env.DATABASE_URL);
const MIMO_BASE_URL = (process.env.XIAOMI_API_URL || process.env.XIAOMI_BASE_URL || 'https://token-plan-sgp.xiaomimimo.com/v1').replace(/\/+$/, '');

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

function loadExtraEnv() {
  for (const file of [
    path.join(os.homedir(), '.code-agent/.env'),
    path.resolve('.env'),
    path.resolve('.env.local'),
  ]) {
    try {
      const parsed = dotenv.parse(fs.readFileSync(file));
      for (const [key, value] of Object.entries(parsed)) {
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      // Optional env file.
    }
  }
}

function compact(text, max = 4000) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
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

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadRawItems(personId) {
  const rows = await sql`
    SELECT title, text, url, "sourceType"
    FROM "RawPoolItem"
    WHERE "personId" = ${personId}
  `;
  return rows.map((row) => ({
    ...row,
    canonicalUrl: canonicalUrl(row.url),
  }));
}

function findSource(rawItems, sourceUrl) {
  const canonical = canonicalUrl(sourceUrl);
  return rawItems.find((item) => item.canonicalUrl === canonical)
    || rawItems.find((item) => item.url === sourceUrl)
    || null;
}

function buildMessages(task) {
  const system = [
    '你是 AI 人物库的学习卡片审稿员。',
    '你只根据给定 source text 判断 proposed card 是否被来源支持。',
    'keep: 标题和正文的关键事实、数字、时间、身份关系都能从来源直接或近似推出。',
    'rewrite: 来源支持主题，但卡片有夸张、过细、过度归因或部分事实需要降级；给出更保守的 title/content。',
    'drop: 来源不支持核心事实、人物关系错误、数字/日期无来源、明显是二手弱来源硬凑、或 source text 为空。',
    'human_review: 来源片段不足以判断，但不应直接通过。',
    '不要凭常识补事实。只输出 JSON 对象，不要 Markdown。',
  ].join('\n');

  const user = JSON.stringify({
    outputShape: {
      decision: 'keep | rewrite | drop | human_review',
      confidence: 'number 0..1',
      title: 'string|null, rewrite 时给保守标题，否则 null',
      content: 'string|null, rewrite 时给保守正文，否则 null',
      evidenceQuote: 'string|null, source text 中支持判断的短摘录',
      reason: '中文，120字内',
      blockers: ['string'],
    },
    person: {
      id: task.person.personId,
      name: task.person.person,
      status: task.person.status,
    },
    proposedCard: {
      type: task.card.type,
      title: task.card.title,
      content: task.card.content,
      tags: task.card.tags,
      sourceUrl: task.card.sourceUrl || null,
      importance: task.card.importance,
    },
    source: task.source ? {
      url: task.source.url,
      title: task.source.title,
      host: hostOf(task.source.url),
      sourceType: task.source.sourceType,
      textPreview: compact(task.source.text, 7000),
    } : null,
  });

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

async function callMimo(task, withResponseFormat = true) {
  const response = await fetch(`${MIMO_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.XIAOMI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: buildMessages(task),
      temperature: 0,
      top_p: 0.95,
      max_completion_tokens: 2048,
      thinking: { type: 'disabled' },
      ...(withResponseFormat ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    if (withResponseFormat && (response.status === 400 || response.status === 422)) {
      return callMimo(task, false);
    }
    throw new Error(`MiMo request failed: HTTP ${response.status} ${responseText.slice(0, 500)}`);
  }

  const payload = JSON.parse(responseText);
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error(`MiMo response missing content: ${responseText.slice(0, 500)}`);
  return extractJsonObject(content);
}

async function callMimoWithRetry(task) {
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await callMimo(task);
    } catch (error) {
      lastError = error;
      if (attempt >= MAX_RETRIES) break;
      await sleep(1000 * attempt * attempt);
    }
  }
  throw lastError;
}

function normalizeReview(result, task) {
  const allowed = new Set(['keep', 'rewrite', 'drop', 'human_review']);
  const decision = allowed.has(result?.decision) ? result.decision : 'human_review';
  const confidence = Number(result?.confidence);
  const rewrittenTitle = typeof result?.title === 'string' && result.title.trim() ? result.title.trim() : null;
  const rewrittenContent = typeof result?.content === 'string' && result.content.trim() ? result.content.trim() : null;

  return {
    personId: task.person.personId,
    person: task.person.person,
    card: task.card,
    source: task.source ? {
      url: task.source.url,
      title: task.source.title,
      host: hostOf(task.source.url),
      sourceType: task.source.sourceType,
    } : null,
    decision,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
    rewrittenCard: decision === 'rewrite' ? {
      ...task.card,
      title: rewrittenTitle || task.card.title,
      content: rewrittenContent || task.card.content,
    } : null,
    evidenceQuote: result?.evidenceQuote || null,
    reason: String(result?.reason || '').slice(0, 300),
    blockers: Array.isArray(result?.blockers) ? result.blockers : [],
    reviewedAt: new Date().toISOString(),
    reviewer: { provider: 'xiaomi', model: MODEL },
  };
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

function writeReport(payload, reviews) {
  const lines = [
    '# Card Reaggregation Plan MiMo Review',
    '',
    `Generated at: ${payload.generatedAt}`,
    `Plan input: ${PLAN_IN}`,
    `Model: ${MODEL}`,
    '',
    '## Counts',
    '',
    table([
      { metric: 'reviewed cards', value: reviews.length },
      { metric: 'keep', value: reviews.filter((row) => row.decision === 'keep').length },
      { metric: 'rewrite', value: reviews.filter((row) => row.decision === 'rewrite').length },
      { metric: 'drop', value: reviews.filter((row) => row.decision === 'drop').length },
      { metric: 'human review', value: reviews.filter((row) => row.decision === 'human_review').length },
    ], [
      { label: 'Metric', value: (row) => row.metric },
      { label: 'Value', value: (row) => row.value },
    ]),
    '',
    '## By Person',
    '',
    table(Object.entries(countBy(reviews, (row) => row.person)).map(([person, count]) => ({ person, count })), [
      { label: 'Person', value: (row) => row.person },
      { label: 'Reviewed', value: (row) => row.count },
    ]),
    '',
    '## Decisions',
    '',
    table(reviews.map((row) => ({
      person: row.person,
      title: row.card.title,
      decision: row.decision,
      source: row.source?.host || '',
      reason: compact(row.reason, 120),
    })), [
      { label: 'Person', value: (row) => row.person },
      { label: 'Card', value: (row) => compact(row.title, 70) },
      { label: 'Decision', value: (row) => row.decision },
      { label: 'Source', value: (row) => row.source },
      { label: 'Reason', value: (row) => row.reason },
    ]),
    '',
    '## Execution Rule',
    '',
    '- Keep/rewrite rows may be considered for a later per-person card replacement plan.',
    '- Drop/human_review rows must not be applied automatically.',
    '- This review is read-only and does not mutate Card rows.',
    '',
  ];
  fs.writeFileSync(REPORT_OUT, `${lines.join('\n')}\n`);
}

async function main() {
  const plan = JSON.parse(fs.readFileSync(PLAN_IN, 'utf8'));
  const tasks = [];

  for (const person of plan.people || []) {
    const rawItems = await loadRawItems(person.personId);
    for (const card of person.proposedCards || []) {
      tasks.push({
        person,
        card,
        source: card.sourceUrl ? findSource(rawItems, card.sourceUrl) : null,
      });
    }
  }

  const selectedTasks = LIMIT > 0 ? tasks.slice(0, LIMIT) : tasks;
  if (DRY_RUN) {
    console.log(JSON.stringify({
      planIn: PLAN_IN,
      out: OUT,
      reportOut: REPORT_OUT,
      tasks: tasks.length,
      selectedTasks: selectedTasks.length,
      firstTasks: selectedTasks.slice(0, 5).map((task) => ({
        person: task.person.person,
        title: task.card.title,
        sourceUrl: task.card.sourceUrl || null,
        sourceFound: Boolean(task.source),
      })),
    }, null, 2));
    return;
  }

  const reviews = [];
  let completed = 0;
  for (const task of selectedTasks) {
    let review;
    if (!task.source) {
      review = normalizeReview({
        decision: 'human_review',
        confidence: 0,
        title: null,
        content: null,
        evidenceQuote: null,
        reason: 'sourceUrl 未匹配到 RawPoolItem 文本，不能自动通过。',
        blockers: ['source_text_missing'],
      }, task);
    } else {
      const result = await callMimoWithRetry(task);
      review = normalizeReview(result, task);
    }
    reviews.push(review);
    completed += 1;
    console.log(JSON.stringify({
      completed,
      total: selectedTasks.length,
      person: task.person.person,
      title: task.card.title,
      decision: review.decision,
      confidence: review.confidence,
    }));
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    planIn: PLAN_IN,
    model: MODEL,
    reviews,
    byDecision: countBy(reviews, (row) => row.decision),
    byPerson: countBy(reviews, (row) => row.person),
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  writeReport(payload, reviews);
  console.log(JSON.stringify({
    out: OUT,
    reportOut: REPORT_OUT,
    reviewed: reviews.length,
    byDecision: payload.byDecision,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
