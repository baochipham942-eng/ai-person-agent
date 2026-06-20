#!/usr/bin/env node
/**
 * 占位 / 捏造 URL 守卫。
 *
 * 知识主题来源包（data/knowledge-threads/*.candidates.json）是 AI 生成的，历史上多次混入
 * 占位或捏造的 URL（典型：youtube.com/watch?v=example_xxx、example.com、placeholder…）。
 * 脚本的字段完整性闸（urlHash 照样能算）查不出这类假源，必须单独拦。
 *
 * 用法：
 *   node scripts/knowledge/check_placeholder_urls.mjs            # 扫默认目录全部候选包
 *   node scripts/knowledge/check_placeholder_urls.mjs <file...>  # 扫指定文件
 * 发现可疑 URL 时以非零码退出（适合 pre-commit / CI）。
 */
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_DIR = 'data/knowledge-threads';

// 明确的占位/模板特征
const SUSPECT_PATTERNS = [
  /\/\/(www\.)?example\.(com|org|net)\b/i,
  /\bplaceholder\b/i,
  /\byour[-_](url|video|id|domain|handle|channel)\b/i,
  /\bVIDEO_ID\b/,
  /\bTODO\b/i,
  /watch\?v=[A-Za-z0-9_-]*example/i,
  /xxxx+/i,
];

// YouTube 视频 ID 必须恰好 11 个合法字符；否则判为占位（如 example_devin_skill）
function youtubeIdIssue(url) {
  const m = url.match(/[?&]v=([^&]+)/);
  if (!/youtube\.com\/watch/i.test(url) || !m) return null;
  const id = m[1];
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return `YouTube 视频 ID 非法（应为 11 位，实为 "${id}"）`;
  return null;
}

function collectFiles(args) {
  if (args.length > 0) return args;
  if (!fs.existsSync(DEFAULT_DIR)) return [];
  return fs
    .readdirSync(DEFAULT_DIR)
    .filter(f => f.endsWith('.candidates.json'))
    .map(f => path.join(DEFAULT_DIR, f));
}

function scanFile(file) {
  const hits = [];
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    hits.push({ id: '(file)', url: '', reason: `JSON 解析失败: ${error.message}` });
    return hits;
  }
  const sources = Array.isArray(data.sources) ? data.sources : [];
  for (const source of sources) {
    const url = source.url || '';
    if (!url) {
      hits.push({ id: source.id || '?', url: '(空)', reason: '源缺少 URL' });
      continue;
    }
    const pattern = SUSPECT_PATTERNS.find(re => re.test(url));
    if (pattern) {
      hits.push({ id: source.id || '?', url, reason: `匹配占位特征 ${pattern}` });
      continue;
    }
    const ytIssue = youtubeIdIssue(url);
    if (ytIssue) hits.push({ id: source.id || '?', url, reason: ytIssue });
  }
  return hits;
}

function main() {
  const files = collectFiles(process.argv.slice(2));
  if (files.length === 0) {
    console.log('未找到候选包文件，跳过占位 URL 检查。');
    return;
  }

  let total = 0;
  for (const file of files) {
    const hits = scanFile(file);
    if (hits.length === 0) continue;
    total += hits.length;
    console.error(`\n✗ ${file}`);
    for (const hit of hits) {
      console.error(`   [${hit.id}] ${hit.url}\n       → ${hit.reason}`);
    }
  }

  if (total > 0) {
    console.error(`\n❌ 发现 ${total} 条占位/可疑 URL。请用真实可核实的来源替换后再提交。`);
    process.exit(1);
  }
  console.log(`✅ 占位 URL 检查通过（扫描 ${files.length} 个候选包，无占位/捏造链接）。`);
}

main();
