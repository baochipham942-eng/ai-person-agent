#!/usr/bin/env node
/**
 * Generate CompanySource incremental dry-run seed packs from the AI HOT P0 plan.
 *
 * The output is intentionally partial: each pack declares
 * profileCompleteness=incremental_sources, keeps company evidence excluded from
 * topic readiness, and does not create CompanyThreadLink rows by default.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_INPUT = 'docs/audit-2026-06/data/aihot_p0_apply_plan.json';
const DEFAULT_OUTPUT_DIR = 'docs/company/aihot-p0-company-sources';
const DEFAULT_INDEX_MD = 'docs/company/AIHOT_P0_COMPANY_SOURCE_SEEDS.md';

const COMPANY_META = new Map(Object.entries({
  'Alibaba DAMO Academy': {
    slug: 'alibaba-damo-academy',
    homepage: 'https://www.alibabacloud.com',
    publicCompany: true,
    aliases: ['Alibaba', '阿里巴巴', '阿里云', 'Qwen', '通义千问'],
  },
  Anthropic: {
    slug: 'anthropic',
    homepage: 'https://www.anthropic.com',
    publicCompany: false,
    aliases: ['Claude'],
  },
  Cloudflare: {
    slug: 'cloudflare',
    homepage: 'https://www.cloudflare.com',
    publicCompany: true,
    aliases: [],
  },
  'Hugging Face': {
    slug: 'hugging-face',
    homepage: 'https://huggingface.co',
    publicCompany: false,
    aliases: [],
  },
  'MiniMax': {
    slug: 'minimax',
    homepage: 'https://www.minimax.io',
    publicCompany: false,
    aliases: ['稀宇科技'],
  },
  'Mistral AI': {
    slug: 'mistral-ai',
    homepage: 'https://mistral.ai',
    publicCompany: false,
    aliases: [],
  },
  OpenAI: {
    slug: 'openai',
    homepage: 'https://openai.com',
    publicCompany: false,
    aliases: [],
  },
  xAI: {
    slug: 'xai',
    homepage: 'https://x.ai',
    publicCompany: false,
    aliases: ['Grok'],
  },
  '杭州深度求索人工智能基础技术研究有限公司（深度求索 / DeepSeek）': {
    slug: 'deepseek',
    homepage: 'https://www.deepseek.com',
    publicCompany: false,
    aliases: ['DeepSeek', '深度求索'],
  },
  '英伟达': {
    slug: 'nvidia',
    homepage: 'https://www.nvidia.com',
    publicCompany: true,
    aliases: ['NVIDIA'],
  },
  '苹果公司': {
    slug: 'apple',
    homepage: 'https://www.apple.com',
    publicCompany: true,
    aliases: ['Apple'],
  },
  '谷歌': {
    slug: 'google',
    homepage: 'https://www.google.com',
    publicCompany: true,
    aliases: ['Google', 'Alphabet'],
  },
}));

main().catch(error => {
  console.error(error?.message || error);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const plan = JSON.parse(await fs.readFile(path.resolve(options.input), 'utf8'));
  const packs = buildSeedPacks(plan);
  await fs.mkdir(path.resolve(options.outputDir), { recursive: true });
  await Promise.all(packs.map(pack => writePack(options.outputDir, pack)));
  await writeIndex(options.indexMd, packs, plan);

  console.log(JSON.stringify({
    outputDir: options.outputDir,
    indexMd: options.indexMd,
    packCount: packs.length,
    sourceCount: packs.reduce((sum, pack) => sum + pack.payload.candidates.length, 0),
    packs: packs.map(pack => ({
      company: pack.payload.company.name,
      file: pack.file,
      candidates: pack.payload.candidates.length,
    })),
  }, null, 2));
}

function parseArgs(argv) {
  const options = {
    input: DEFAULT_INPUT,
    outputDir: DEFAULT_OUTPUT_DIR,
    indexMd: DEFAULT_INDEX_MD,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg.startsWith('--input=')) options.input = arg.slice('--input='.length);
    else if (arg.startsWith('--output-dir=')) options.outputDir = arg.slice('--output-dir='.length);
    else if (arg.startsWith('--index-md=')) options.indexMd = arg.slice('--index-md='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function buildSeedPacks(plan) {
  const rows = Array.isArray(plan.p0CompanySourceReady) ? plan.p0CompanySourceReady : [];
  const byCompany = new Map();
  for (const row of rows) {
    const key = row.organizationLabel || row.organizationId;
    if (!key) continue;
    if (!byCompany.has(key)) byCompany.set(key, []);
    byCompany.get(key).push(row);
  }

  return [...byCompany.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([companyName, companyRows]) => {
      const meta = companyMeta(companyName, companyRows);
      const payload = {
        schemaVersion: 'company-source-seed/v1',
        mode: 'dry-run',
        profileCompleteness: 'incremental_sources',
        contract: 'docs/company/company-source-contract.schema.json',
        company: {
          name: companyName,
          slug: meta.slug,
          aliases: meta.aliases,
          homepage: meta.homepage,
          publicCompany: meta.publicCompany,
        },
        notAvailableRoles: [],
        candidates: companyRows
          .sort(compareRows)
          .map(row => toCandidate(row, meta.slug)),
        companyStrategyContexts: [],
        threadReadinessExports: [],
      };
      return {
        file: `${meta.slug}.json`,
        payload,
      };
    });
}

function companyMeta(companyName, rows) {
  const known = COMPANY_META.get(companyName);
  if (known) return known;
  const homepage = homepageFromRows(rows) || 'https://example.com';
  return {
    slug: slugify(companyName),
    homepage,
    publicCompany: false,
    aliases: [],
  };
}

function homepageFromRows(rows) {
  for (const row of rows) {
    try {
      const parsed = new URL(row.url);
      return `${parsed.protocol}//${parsed.hostname}`;
    } catch {
      // keep scanning
    }
  }
  return '';
}

function toCandidate(row, companySlug) {
  const sourceKind = detailedSourceKind(row);
  const companyPageOnly = row.seedDefaults?.companyPageOnly === true || row.role === 'financial_signal';
  return {
    id: `cs_aihot_${companySlug}_${sourceIdSuffix(row)}`,
    url: row.url,
    role: row.role,
    sourceKind,
    title: row.title,
    label: row.title,
    sourceLabel: row.sourceName || row.organizationLabel,
    access: row.seedDefaults?.access || 'free_web',
    publishedAt: row.date || undefined,
    readinessUse: companyPageOnly ? 'company_page_only' : 'company_strategy_context_only',
    excludedFromTopicReadiness: true,
    companyPageOnly,
    notes: [
      'AI HOT P0 incremental CompanySource candidate.',
      `Original sourceKind=${row.sourceKind}.`,
      `Content family=${row.contentFamilyKey}.`,
      'Excluded from topic readiness; use only for company page/background evidence until reviewed.',
    ].join(' '),
  };
}

function detailedSourceKind(row) {
  if (row.sourceKind === 'github') return row.url.includes('/releases/') ? 'github_release' : 'github_repository';
  if (row.sourceKind === 'rss') return 'official_rss_article';
  if (row.role === 'financial_signal') return 'financing_announcement';
  if (row.role === 'partnership_signal') return 'partnership_announcement';
  if (row.role === 'product_release') return 'product_announcement';
  if (row.role === 'hiring_team_signal') return 'team_announcement';
  return 'official_blog_article';
}

function sourceIdSuffix(row) {
  const sourceId = String(row.id || row.contentFamilyKey || row.url || row.title || 'source');
  const cleaned = sourceId
    .toLowerCase()
    .replace(/^aihot-company-source:/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return cleaned || 'source';
}

function compareRows(a, b) {
  return (b.priority || 0) - (a.priority || 0)
    || String(b.date || '').localeCompare(String(a.date || ''))
    || String(a.title || '').localeCompare(String(b.title || ''));
}

function slugify(name) {
  const ascii = String(name || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-');
  return ascii || `company-${Math.abs(hashCode(String(name || 'unknown')))}`;
}

function hashCode(value) {
  let hash = 0;
  for (const char of value) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return hash;
}

async function writePack(outputDir, pack) {
  const fullPath = path.join(path.resolve(outputDir), pack.file);
  await fs.writeFile(fullPath, `${JSON.stringify(pack.payload, null, 2)}\n`);
}

async function writeIndex(indexMd, packs, plan) {
  const lines = [];
  lines.push('# AI HOT P0 CompanySource Seed Packs');
  lines.push('');
  lines.push(`Generated from: \`${DEFAULT_INPUT}\``);
  lines.push(`Plan generated: ${plan.generatedAt || ''}`);
  lines.push('');
  lines.push('These packs are incremental CompanySource dry-run seeds. They do not claim complete company profile coverage and do not create CompanyThreadLink rows.');
  lines.push('');
  lines.push('| Company | File | Candidates | Roles | Source Kinds |');
  lines.push('| --- | --- | ---: | --- | --- |');
  for (const pack of packs) {
    const candidates = pack.payload.candidates;
    lines.push(`| ${escapeCell(pack.payload.company.name)} | \`${DEFAULT_OUTPUT_DIR}/${pack.file}\` | ${candidates.length} | ${escapeCell(unique(candidates.map(row => row.role)).join(', '))} | ${escapeCell(unique(candidates.map(row => row.sourceKind)).join(', '))} |`);
  }
  lines.push('');
  lines.push('Validation command:');
  lines.push('');
  lines.push('```bash');
  lines.push('for f in docs/company/aihot-p0-company-sources/*.json; do pnpm company:materialize -- --strict --input="$f" --output="/tmp/$(basename "$f" .json)-staging.json"; done');
  lines.push('```');
  lines.push('');
  await fs.mkdir(path.dirname(path.resolve(indexMd)), { recursive: true });
  await fs.writeFile(path.resolve(indexMd), `${lines.join('\n')}\n`);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function escapeCell(value) {
  return String(value ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();
}

function printHelp() {
  console.log(`
Usage:
  node scripts/company/build_aihot_p0_company_seed_packs.mjs [options]

Options:
  --input=<path>         AI HOT P0 apply plan JSON, default ${DEFAULT_INPUT}
  --output-dir=<path>    Output directory for per-company seed packs, default ${DEFAULT_OUTPUT_DIR}
  --index-md=<path>      Output Markdown index, default ${DEFAULT_INDEX_MD}
`);
}
