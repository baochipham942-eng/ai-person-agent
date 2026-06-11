/**
 * Analyze reject/review RawPoolItem prune candidates.
 *
 * Read-only. This groups the remaining reject/review tail into stricter
 * buckets before any broader prune decision.
 */
import fs from 'node:fs';
import path from 'node:path';

const INPUT = getArg('--in') || 'docs/audit-2026-06/data/prune_candidates_after_card_reaggregation.json';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/prune_reject_review_buckets.json';
const REPORT_OUT = getArg('--report-out') || 'docs/audit-2026-06/PRUNE_REJECT_REVIEW_BUCKETS.md';
const SAMPLE_LIMIT = numberArg('--sample-limit', 12);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function numberArg(name, fallback) {
  const raw = getArg(name);
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function includesAny(text, needles) {
  const value = String(text || '').toLowerCase();
  return needles.some((needle) => value.includes(needle.toLowerCase()));
}

function bucketFor(row) {
  const reason = row.reason || '';
  const title = row.title || '';
  const text = `${reason} ${title} ${row.url || ''}`;

  if (includesAny(text, [
    '同名',
    '错误人物',
    '错误归因',
    '人名错配',
    '非目标人物',
    '不是目标人物',
    '不同的人',
    '完全无关',
    '与目标人物无关',
    '与人物无关',
    'wrong person',
    'wrong_person',
    'not the target',
  ])) {
    return 'wrong_person_or_same_name';
  }

  if (includesAny(text, [
    '作者列表中没有',
    '作者列表中未',
    '作者为',
    '并非其个人',
    '并非本人',
    '不是其个人',
    '不是本人',
    '未提及',
    '未包含',
    '无直接关联',
    '无直接证据',
  ])) {
    return 'author_or_direct_evidence_missing';
  }

  if (includesAny(text, [
    '无有效信息',
    '摘要为空',
    '内容为空',
    '空数据',
    '加载失败',
    '登录页面',
    'cookie',
    '网页导航',
    '导航信息',
    '仅显示标题',
    '无法判断',
    '无法确认',
  ])) {
    return 'empty_or_unusable_capture';
  }

  if (includesAny(text, [
    '脱口秀',
    'stand-up',
    'comedy',
    'football',
    'baseball',
    'hockey',
    'pokemon',
    'romance',
    '英语学习',
    '雅思',
    'sports',
    'covid',
    'vaccine',
    '医学研究',
  ])) {
    return 'non_ai_domain_mismatch';
  }

  if (includesAny(text, [
    '信息密度低',
    '信息量低',
    '过于简略',
    '仅包含',
    '辅助背景',
    '联系方式',
    '个人简介',
    '目录',
    '标签页',
    '聚合',
    '通用页面',
    '占位符',
  ])) {
    return 'low_information_auxiliary';
  }

  if (includesAny(text, [
    '过度归因',
    '公司',
    '团队成果',
    '机构',
    '产品发布',
    '招聘',
  ])) {
    return 'over_attributed_or_org_level';
  }

  return 'manual_review_tail';
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function groupBy(rows, keyFn) {
  const groups = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    groups[key] ||= [];
    groups[key].push(row);
  }
  return groups;
}

function sampleRows(rows) {
  const sorted = [...rows].sort((a, b) =>
    a.person.localeCompare(b.person) || a.sourceType.localeCompare(b.sourceType) || a.title.localeCompare(b.title),
  );
  return sorted.slice(0, SAMPLE_LIMIT).map((row) => ({
    rawId: row.rawId,
    person: row.person,
    status: row.status,
    verdict: row.verdict,
    sourceType: row.sourceType,
    title: row.title,
    url: row.url,
    reason: row.reason,
  }));
}

function compact(text, max = 150) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function mdEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function writeReport(payload) {
  const lines = [
    '# Prune Reject / Review Buckets',
    '',
    `Generated at: ${payload.generatedAt}`,
    `Input: ${payload.input}`,
    '',
    '## Summary',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| reject rows | ${payload.summary.rejectRows} |`,
    `| review rows | ${payload.summary.reviewRows} |`,
    `| strict delete candidates | ${payload.summary.strictDeleteCandidates} |`,
    `| defer/refetch candidates | ${payload.summary.deferOrRefetchCandidates} |`,
    '',
    '## Reject Buckets',
    '',
    '| Bucket | Count |',
    '| --- | ---: |',
    ...Object.entries(payload.reject.byBucket).map(([bucket, count]) => `| ${bucket} | ${count} |`),
    '',
    '## Review Buckets',
    '',
    '| Bucket | Count |',
    '| --- | ---: |',
    ...Object.entries(payload.review.byBucket).map(([bucket, count]) => `| ${bucket} | ${count} |`),
    '',
    '## Strict Delete Candidate Buckets',
    '',
    '- `wrong_person_or_same_name`',
    '- `non_ai_domain_mismatch`',
    '- `author_or_direct_evidence_missing`',
    '- `empty_or_unusable_capture`',
    '',
    'These are still not auto-applied by this script. They are candidates for a second prune gate.',
    '',
    '## Samples',
    '',
  ];

  for (const [bucket, rows] of Object.entries(payload.samples.rejectByBucket)) {
    lines.push(`### reject / ${bucket}`, '');
    lines.push('| Person | Source | Title | Reason |');
    lines.push('| --- | --- | --- | --- |');
    for (const row of rows) {
      lines.push(`| ${mdEscape(row.person)} | ${mdEscape(row.sourceType)} | ${mdEscape(compact(row.title, 90))} | ${mdEscape(compact(row.reason, 140))} |`);
    }
    lines.push('');
  }

  for (const [bucket, rows] of Object.entries(payload.samples.reviewByBucket)) {
    lines.push(`### review / ${bucket}`, '');
    lines.push('| Person | Source | Title | Reason |');
    lines.push('| --- | --- | --- | --- |');
    for (const row of rows) {
      lines.push(`| ${mdEscape(row.person)} | ${mdEscape(row.sourceType)} | ${mdEscape(compact(row.title, 90))} | ${mdEscape(compact(row.reason, 140))} |`);
    }
    lines.push('');
  }

  fs.writeFileSync(REPORT_OUT, `${lines.join('\n')}\n`);
}

const input = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const rejectRows = (input.full?.prunable || []).map((row) => ({
  ...row,
  bucket: bucketFor(row),
}));
const reviewRows = (input.full?.review || []).map((row) => ({
  ...row,
  bucket: bucketFor(row),
}));

const strictDeleteBuckets = new Set([
  'wrong_person_or_same_name',
  'non_ai_domain_mismatch',
  'author_or_direct_evidence_missing',
  'empty_or_unusable_capture',
]);

const strictDeleteRows = rejectRows.filter((row) => strictDeleteBuckets.has(row.bucket));
const deferRows = [...rejectRows.filter((row) => !strictDeleteBuckets.has(row.bucket)), ...reviewRows];
const rejectByBucket = groupBy(rejectRows, (row) => row.bucket);
const reviewByBucket = groupBy(reviewRows, (row) => row.bucket);

const payload = {
  generatedAt: new Date().toISOString(),
  input: INPUT,
  summary: {
    rejectRows: rejectRows.length,
    reviewRows: reviewRows.length,
    strictDeleteCandidates: strictDeleteRows.length,
    deferOrRefetchCandidates: deferRows.length,
  },
  reject: {
    byBucket: countBy(rejectRows, (row) => row.bucket),
    bySourceType: countBy(rejectRows, (row) => row.sourceType),
    topPeople: countBy(rejectRows, (row) => row.person),
  },
  review: {
    byBucket: countBy(reviewRows, (row) => row.bucket),
    bySourceType: countBy(reviewRows, (row) => row.sourceType),
    topPeople: countBy(reviewRows, (row) => row.person),
  },
  strictDeleteCandidates: strictDeleteRows.map((row) => ({
    rawId: row.rawId,
    person: row.person,
    status: row.status,
    verdict: row.verdict,
    bucket: row.bucket,
    sourceType: row.sourceType,
    title: row.title,
    url: row.url,
    urlHash: row.urlHash,
    reason: row.reason,
    auditedAt: row.auditedAt,
  })),
  samples: {
    rejectByBucket: Object.fromEntries(Object.entries(rejectByBucket).map(([bucket, rows]) => [bucket, sampleRows(rows)])),
    reviewByBucket: Object.fromEntries(Object.entries(reviewByBucket).map(([bucket, rows]) => [bucket, sampleRows(rows)])),
  },
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
writeReport(payload);
console.log(JSON.stringify({
  out: OUT,
  reportOut: REPORT_OUT,
  summary: payload.summary,
  rejectByBucket: payload.reject.byBucket,
  reviewByBucket: payload.review.byBucket,
}, null, 2));
