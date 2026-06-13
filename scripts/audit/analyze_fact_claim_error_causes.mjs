/**
 * Analyze MiMo fact-claim review failures into root causes and prevention rules.
 *
 * Read-only. It does not modify database records.
 *
 * Usage:
 *   node scripts/audit/analyze_fact_claim_error_causes.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const REVIEW_DIR = getArg('--review-dir') || 'docs/audit-2026-06/data';
const OUT = getArg('--out') || 'docs/audit-2026-06/FACT_CLAIM_ERROR_CAUSES.md';
const SUMMARY_OUT = getArg('--summary-out') || 'docs/audit-2026-06/data/fact_claim_error_causes.json';

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

function compact(text, max = 160) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}...`;
}

function table(rows, columns) {
  const header = `| ${columns.map((col) => col.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((col) => String(col.value(row) ?? '').replace(/\n/g, '<br>').replace(/\|/g, '\\|')).join(' | ')} |`);
  return [header, divider, ...body].join('\n');
}

function loadReviewRows() {
  const rows = [];
  for (const fileName of fs.readdirSync(REVIEW_DIR).sort()) {
    if (!/^fact_claim_reviews_.*_mimo\.jsonl$/.test(fileName)) continue;
    if (fileName.includes('dario_products')) continue;
    const filePath = path.join(REVIEW_DIR, fileName);
    for (const row of readJsonl(filePath)) {
      rows.push({ ...row, reviewFile: fileName });
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

function makeBucket(id, label, preventionRule, matcher) {
  return {
    id,
    label,
    preventionRule,
    matcher,
    count: 0,
    byClaimType: {},
    byVerdict: {},
    byAction: {},
    samples: [],
  };
}

function add(bucket, row) {
  bucket.count += 1;
  bucket.byClaimType[row.claimType] = (bucket.byClaimType[row.claimType] || 0) + 1;
  bucket.byVerdict[row.verdict] = (bucket.byVerdict[row.verdict] || 0) + 1;
  bucket.byAction[row.recommendedAction] = (bucket.byAction[row.recommendedAction] || 0) + 1;
  if (bucket.samples.length < 12) {
    bucket.samples.push({
      person: row.person,
      claimType: row.claimType,
      objectLabel: row.objectLabel || '',
      verdict: row.verdict,
      action: row.recommendedAction,
      reason: row.reason,
      rewriteSuggestion: row.rewriteSuggestion || '',
    });
  }
}

function buildBuckets() {
  return [
    makeBucket(
      'source_pool_wrong_person',
      '外部内容挂错人',
      'RawPoolItem 入库前必须做实体归属门禁：论文核作者，GitHub 核 owner，视频/播客核本人或明确访谈对象，中文短名和常见英文名必须加机构/领域 disambiguation。',
      (row, text) => row.claimType === 'source_item_belongs_to_person' && ['wrong_person', 'unsupported'].includes(row.verdict),
    ),
    makeBucket(
      'identity_collision',
      '同名人物/账号混淆',
      '同名人物必须使用 name + org/topic/country/source 三要素匹配；短中文名、常见英文名、官方链接、履历来源都要先进入 needs_review，不能直接提升为展示内容。',
      (row, text) => row.verdict === 'wrong_person' || /同名|错配|wrong person|different person/i.test(text),
    ),
    makeBucket(
      'stale_current_state',
      '历史经历被显示成当前状态',
      'PersonRole.endDate 为空不能自动等于 now；教育、早期雇主、旧职位、过往创业都要有 current-source 才能当前展示。currentTitle 只允许来自近期官方/本人/权威来源。',
      (row, text) => row.verdict === 'stale' || /当前|now|过时|历史|离任|stepped down|left/i.test(text),
    ),
    makeBucket(
      'company_team_over_attribution',
      '公司/团队成果过度归因到个人',
      '代表成果、学习卡片、whyImportant、topicDetails 必须写清 personProductRole：founder/CEO/lead/author/contributor/observer。没有角色证据时只能写组织级，不写个人“打造/推出/核心贡献”。',
      (row, text) => row.verdict === 'over_attributed' && ['representative_achievement', 'learning_card', 'topic_contribution', 'why_important'].includes(row.claimType),
    ),
    makeBucket(
      'product_granularity_mismatch',
      '单个版本/API/SDK/商业入口粒度过细',
      '单个模型版本、API、SDK、商店、营销入口默认折叠到上层产品族；除非来源证明此人就是该入口 owner，否则不要放到个人代表成果。',
      (row, text) => /API|SDK|版本|模型版本|单个|商业|入口|store|具体产品/i.test(text) && row.verdict === 'over_attributed',
    ),
    makeBucket(
      'source_gap',
      '缺少来源但直接展示',
      'LLM 生成的事实必须携带 evidenceUrl/sourceText/sourceType。没有来源的 currentTitle、role、officialLink、course、whyImportant 只能进待审队列，不能进入 ready 展示。',
      (row) => row.verdict === 'needs_source',
    ),
    makeBucket(
      'official_link_identity_weak',
      '官方链接身份弱校验',
      'officialLinks 需要 profile name、handle、bio、cross-link 任一强证据；GitHub/YouTube/X 的同名账号不能只靠 URL 或 handle 推断。',
      (row) => row.claimType === 'official_link' && row.verdict !== 'supported',
    ),
    makeBucket(
      'role_schema_drift',
      '履历字段被塞进学位/产品/泛职业标签',
      'PersonRole.role 只存职位或履历事件；学位进入 education，产品进入 products，宽泛职业进入 occupation，不能用 role 承载“Gemini”“计算机科学硕士”“AI/tech professional”这类混合字段。',
      (row, text) => row.claimType === 'career_role' && (/degree|硕士|本科|Bachelor|Student|Gemini|AI\/tech|professional|mathematician|computer scientist|researcher/i.test(text) || row.verdict === 'over_attributed'),
    ),
  ];
}

function summarizeBucket(bucket) {
  return {
    id: bucket.id,
    label: bucket.label,
    count: bucket.count,
    byClaimType: bucket.byClaimType,
    byVerdict: bucket.byVerdict,
    byAction: bucket.byAction,
    preventionRule: bucket.preventionRule,
    samples: bucket.samples,
  };
}

function main() {
  const rows = loadReviewRows();
  const problemRows = rows.filter((row) => row.verdict !== 'supported');
  const buckets = buildBuckets();

  for (const row of problemRows) {
    const text = [
      row.reason,
      row.rewriteSuggestion,
      ...(Array.isArray(row.evidenceNeeded) ? row.evidenceNeeded : []),
    ].join(' ');
    for (const bucket of buckets) {
      if (bucket.matcher(row, text)) add(bucket, row);
    }
  }

  const primaryById = new Map();
  for (const row of problemRows) {
    const text = [
      row.reason,
      row.rewriteSuggestion,
      ...(Array.isArray(row.evidenceNeeded) ? row.evidenceNeeded : []),
    ].join(' ');
    const bucket = buckets.find((candidate) => candidate.matcher(row, text));
    const id = bucket?.id || 'other';
    primaryById.set(id, (primaryById.get(id) || 0) + 1);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    reviewedClaims: rows.length,
    problemClaims: problemRows.length,
    primaryRootCauseCounts: Object.fromEntries([...primaryById.entries()].sort((a, b) => b[1] - a[1])),
    rootCauses: buckets.map(summarizeBucket).sort((a, b) => b.count - a.count),
    preventionChecklist: buckets.map((bucket) => ({
      id: bucket.id,
      label: bucket.label,
      rule: bucket.preventionRule,
    })),
  };

  fs.mkdirSync(path.dirname(SUMMARY_OUT), { recursive: true });
  fs.writeFileSync(SUMMARY_OUT, `${JSON.stringify(summary, null, 2)}\n`);

  const rootCauseRows = summary.rootCauses.map((bucket) => ({
    label: bucket.label,
    count: bucket.count,
    topTypes: Object.entries(bucket.byClaimType).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k}:${v}`).join(', '),
    topVerdicts: Object.entries(bucket.byVerdict).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k}:${v}`).join(', '),
    rule: bucket.preventionRule,
  }));

  const sampleRows = summary.rootCauses.flatMap((bucket) => bucket.samples.slice(0, 4).map((sample) => ({
    rootCause: bucket.label,
    ...sample,
  })));

  const lines = [
    '# Fact Claim Error Causes',
    '',
    `Generated at: ${summary.generatedAt}`,
    '',
    `Reviewed claims: ${summary.reviewedClaims}`,
    `Problem claims: ${summary.problemClaims}`,
    '',
    '## Root Causes',
    '',
    table(rootCauseRows, [
      { label: 'Root cause', value: (row) => row.label },
      { label: 'Matched', value: (row) => row.count },
      { label: 'Top claim types', value: (row) => row.topTypes },
      { label: 'Top verdicts', value: (row) => row.topVerdicts },
      { label: 'Prevention rule', value: (row) => row.rule },
    ]),
    '',
    '## Samples',
    '',
    table(sampleRows, [
      { label: 'Root cause', value: (row) => row.rootCause },
      { label: 'Person', value: (row) => row.person },
      { label: 'Type', value: (row) => row.claimType },
      { label: 'Object', value: (row) => row.objectLabel },
      { label: 'Verdict', value: (row) => row.verdict },
      { label: 'Action', value: (row) => row.action },
      { label: 'Reason', value: (row) => compact(row.reason) },
    ]),
    '',
    '## Prevention Checklist',
    '',
    ...summary.preventionChecklist.map((item) => `- ${item.label}: ${item.rule}`),
    '',
  ];

  fs.writeFileSync(OUT, `${lines.join('\n')}\n`);
  console.log(JSON.stringify({
    out: OUT,
    summaryOut: SUMMARY_OUT,
    reviewedClaims: summary.reviewedClaims,
    problemClaims: summary.problemClaims,
    primaryRootCauseCounts: summary.primaryRootCauseCounts,
  }, null, 2));
}

main();
