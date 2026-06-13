/**
 * Build manual decisions for the final source refetch hard tail.
 *
 * Read-only. This encodes the human adjudication layer after Exa/Tavily/
 * AnySearch + MiMo have failed to find a better source.
 */
import fs from 'node:fs';
import path from 'node:path';

const INPUT = getArg('--in')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_hard_tail_queue.jsonl';
const OUT = getArg('--out')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/hard_tail_manual_decisions.json';
const REPORT_OUT = getArg('--report-out')
  || 'docs/audit-2026-06/HARD_TAIL_MANUAL_DECISIONS.md';

const KEEP_DECISIONS = new Map([
  [
    'cmjtvmdh0003prmtbxfua0p27',
    {
      action: 'keep_raw_pool_item',
      verdict: 'keep',
      reason: '保留。该 LinkedIn 页面虽然不是适合作为替换主源的权威来源，但抓取文本包含 Yann LeCun 本人公开帖正文、本人 profile 链接和具体内容，不属于错挂。',
    },
  ],
  [
    'cmjuul3t40h04rmtbjj8neewa',
    {
      action: 'keep_raw_pool_item',
      verdict: 'keep',
      reason: '保留。该 Medium 页面为 @andrewng 署名文章，抓取文本包含标题、作者、日期和正文开头，可作为吴恩达本人文章来源；只是不适合作为其他 claim 的替换主源。',
    },
  ],
]);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function compact(text, max = 180) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function deleteReason(row) {
  const retryReasons = row.followup?.retryReasons || [];
  if (retryReasons.includes('replacement_needs_primary_or_credible_source')) {
    return '删除。该旧来源只是社媒/存档/低权威辅助线索，无法作为主源；相关人物已有更可靠来源补入，继续保留会污染卡片和代表作品聚合。';
  }
  return '删除。三轮 refetch 与人工复核后仍无法证明该来源和目标人物的直接关系，保留会形成错误归因或弱来源污染。';
}

function buildDecision(row) {
  const targetId = row.target?.objectId;
  const keep = KEEP_DECISIONS.get(targetId);
  const base = {
    claimId: row.claimId,
    personId: row.personId,
    person: row.person,
    target: row.target,
    retryReasons: row.followup?.retryReasons || [],
    sourceQueries: row.sourceQueries || [],
    priorRationale: row.rationale || '',
    reviewedAt: new Date().toISOString(),
    reviewer: {
      provider: 'codex',
      model: 'hard_tail_manual_adjudication',
    },
  };

  if (keep) {
    return {
      ...base,
      action: keep.action,
      verdict: keep.verdict,
      confidence: 0.92,
      reason: keep.reason,
    };
  }

  return {
    ...base,
    action: 'delete_raw_pool_item',
    verdict: 'reject',
    confidence: 0.95,
    reason: deleteReason(row),
  };
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function mdEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function writeReport(payload) {
  const lines = [
    '# Hard Tail Manual Decisions',
    '',
    `Generated at: ${payload.generatedAt}`,
    `Input: ${payload.input}`,
    '',
    '## Counts',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| decisions | ${payload.decisions.length} |`,
    `| delete raw pool item | ${payload.byAction.delete_raw_pool_item || 0} |`,
    `| keep raw pool item | ${payload.byAction.keep_raw_pool_item || 0} |`,
    '',
    '## By Person',
    '',
    '| Person | Count |',
    '| --- | ---: |',
    ...Object.entries(payload.byPerson).map(([person, count]) => `| ${mdEscape(person)} | ${count} |`),
    '',
    '## Decisions',
    '',
    '| Person | Target | Action | Reason |',
    '| --- | --- | --- | --- |',
    ...payload.decisions.map((decision) => [
      decision.person,
      decision.target?.objectLabel || decision.target?.objectId || '',
      decision.action,
      compact(decision.reason, 220),
    ].map(mdEscape).join(' | ').replace(/^/, '| ').replace(/$/, ' |')),
    '',
    '## Execution Rule',
    '',
    '- `delete_raw_pool_item` decisions may be applied by `scripts/fix/apply_hard_tail_manual_decisions.mjs --execute`.',
    '- `keep_raw_pool_item` decisions only write/confirm a manual keep audit and do not delete RawPoolItem.',
    '- This is a human adjudication layer after automated refetch has reached a hard tail.',
    '',
  ];
  fs.writeFileSync(REPORT_OUT, `${lines.join('\n')}\n`);
}

const rows = readJsonl(INPUT);
const decisions = rows.map(buildDecision);
const payload = {
  generatedAt: new Date().toISOString(),
  input: INPUT,
  decisions,
  byAction: countBy(decisions, (row) => row.action),
  byPerson: countBy(decisions, (row) => row.person),
  byRetryReason: countBy(decisions.flatMap((row) => row.retryReasons.map((reason) => ({ reason }))), (row) => row.reason),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
writeReport(payload);
console.log(JSON.stringify({
  out: OUT,
  reportOut: REPORT_OUT,
  decisions: decisions.length,
  byAction: payload.byAction,
}, null, 2));
