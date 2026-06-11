/**
 * Ask MiMo to review Codex/product-owner roster gaps using source hints.
 *
 * Read-only. It writes a candidate queue and does not modify database records.
 *
 * Usage:
 *   node scripts/audit/discover_codex_roster_gaps_mimo.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const SOURCE_PACK = getArg('--source-pack') || 'docs/audit-2026-06/codex_roster_source_pack.json';
const OUT = getArg('--out') || 'docs/audit-2026-06/data/codex_roster_gaps_mimo.json';
const REPORT_OUT = getArg('--report-out') || 'docs/audit-2026-06/CODEX_ROSTER_GAPS_MIMO.md';
const MODEL = getArg('--model') || 'mimo-v2.5-pro';

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
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

  if (!apiKey) throw new Error('Missing XIAOMI_API_KEY. Expected process env or ~/.code-agent/.env.');
  return { apiKey, baseUrl: baseUrl.replace(/\/+$/, '') };
}

function compactPerson(row) {
  return {
    name: row.name,
    aliases: row.aliases || [],
    currentTitle: row.currentTitle || null,
    organization: row.organization || [],
    topics: row.topics || [],
    roleCategory: row.roleCategory || null,
    influenceScore: row.influenceScore,
  };
}

function looksRelevant(row, sourcePack) {
  const haystack = [
    row.name,
    ...(row.aliases || []),
    row.currentTitle,
    ...(row.organization || []),
    ...(row.topics || []),
  ].filter(Boolean).join(' ').toLowerCase();

  const candidateNames = new Set();
  for (const source of sourcePack.sources || []) {
    for (const name of source.candidateNames || []) candidateNames.add(name.toLowerCase());
  }
  for (const hint of sourcePack.candidateHints || []) {
    candidateNames.add(String(hint.name || '').toLowerCase());
    for (const alias of hint.aliases || []) candidateNames.add(String(alias).toLowerCase());
  }

  return /codex|openai|代码生成|ai coding|developer|开发者工具|产品/.test(haystack)
    || [...candidateNames].some((name) => name && haystack.includes(name));
}

function table(rows, columns) {
  const header = `| ${columns.map((col) => col.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((col) => String(col.value(row) ?? '').replace(/\n/g, '<br>').replace(/\|/g, '\\|')).join(' | ')} |`);
  return [header, divider, ...body].join('\n');
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

async function loadRoster(sourcePack) {
  if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`
    SELECT name, aliases, "currentTitle", organization, topics, "roleCategory", "influenceScore"
    FROM "People"
    ORDER BY "influenceScore" DESC, name ASC
  `;
  return rows.filter((row) => looksRelevant(row, sourcePack)).map(compactPerson);
}

function buildMessages(sourcePack, roster) {
  const system = [
    '你是 AI 人物库的名册编辑和事实审查员。',
    '任务：基于给定 source pack 和当前数据库名册，判断 Codex/Tibo 这个角度还缺哪些人、已有记录哪些需要更新。',
    '严格规则：只能使用 source pack 中的来源支持事实；不要把模型记忆当事实；来源不足时标记 needs_source。',
    'Tibo 不是明确 PM title。若来源只支持 head/lead/MTS/design/product lead，就按来源措辞写，不要强行写产品经理。',
    '输出 JSON 对象，不要 Markdown。',
  ].join('\n');

  const user = JSON.stringify({
    outputShape: {
      candidates: [
        {
          name: 'string',
          aliases: ['string'],
          action: 'add | update_existing | hold | needs_source',
          priority: 'P0 | P1 | P2',
          dbMatch: 'string|null',
          roleCategory: 'founder | researcher | engineer | product | designer | operator | null',
          currentTitle: 'string|null',
          organization: ['string'],
          topics: ['string'],
          whyImportant: 'string|null',
          representativeAchievements: [
            {
              name: 'string',
              org: 'string|null',
              year: 'number|null',
              description: 'string',
              role: 'string',
              url: 'string|null'
            }
          ],
          sourceUrls: ['string'],
          confidence: 'number 0..1',
          rationale: '中文，120字内',
          safetyNotes: ['string']
        }
      ],
      existingRecordFixes: [
        {
          name: 'string',
          action: 'rewrite_current_title | add_organization | remove_product | rewrite_products | needs_source | hold',
          targetField: 'string',
          proposedValue: 'any',
          sourceUrls: ['string'],
          rationale: '中文，100字内'
        }
      ],
      acquisitionRules: ['string'],
      rejectedOrDeferred: [
        {
          name: 'string',
          reason: 'string'
        }
      ]
    },
    sourcePack,
    currentRelevantRoster: roster,
  });

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

async function callMimo(config, sourcePack, roster, withResponseFormat = true) {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: buildMessages(sourcePack, roster),
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
      return callMimo(config, sourcePack, roster, false);
    }
    throw new Error(`MiMo request failed: HTTP ${response.status} ${responseText.slice(0, 500)}`);
  }
  const payload = JSON.parse(responseText);
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error(`MiMo response missing content: ${responseText.slice(0, 500)}`);
  return extractJsonObject(content);
}

function renderReport(result, meta) {
  const candidates = Array.isArray(result.candidates) ? result.candidates : [];
  const fixes = Array.isArray(result.existingRecordFixes) ? result.existingRecordFixes : [];
  const rules = Array.isArray(result.acquisitionRules) ? result.acquisitionRules : [];
  const deferred = Array.isArray(result.rejectedOrDeferred) ? result.rejectedOrDeferred : [];

  const lines = [
    '# Codex Roster Gaps by MiMo',
    '',
    `Generated at: ${meta.generatedAt}`,
    `Model: ${meta.model}`,
    `Relevant roster rows sent: ${meta.relevantRosterCount}`,
    '',
    '## Candidate Queue',
    '',
    table(candidates, [
      { label: 'Name', value: (row) => row.name },
      { label: 'Action', value: (row) => row.action },
      { label: 'Priority', value: (row) => row.priority },
      { label: 'DB match', value: (row) => row.dbMatch || '' },
      { label: 'Current title', value: (row) => row.currentTitle || '' },
      { label: 'Topics', value: (row) => (row.topics || []).join(', ') },
      { label: 'Confidence', value: (row) => row.confidence },
      { label: 'Rationale', value: (row) => row.rationale || '' },
    ]),
    '',
    '## Existing Record Fixes',
    '',
    table(fixes, [
      { label: 'Name', value: (row) => row.name },
      { label: 'Action', value: (row) => row.action },
      { label: 'Field', value: (row) => row.targetField },
      { label: 'Proposed value', value: (row) => JSON.stringify(row.proposedValue) },
      { label: 'Rationale', value: (row) => row.rationale },
    ]),
    '',
    '## Acquisition Rules',
    '',
    ...rules.map((rule) => `- ${rule}`),
    '',
    '## Deferred',
    '',
    table(deferred, [
      { label: 'Name', value: (row) => row.name },
      { label: 'Reason', value: (row) => row.reason },
    ]),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function normalizeResult(result) {
  const candidates = Array.isArray(result.candidates) ? result.candidates : [];
  const existingRecordFixes = Array.isArray(result.existingRecordFixes) ? result.existingRecordFixes : [];

  return {
    ...result,
    candidates: candidates.map((candidate) => {
      const sourceUrls = Array.isArray(candidate.sourceUrls) ? candidate.sourceUrls.filter(Boolean) : [];
      const needsEvidence = ['add', 'update_existing'].includes(candidate.action) && sourceUrls.length === 0;
      return {
        ...candidate,
        sourceUrls,
        action: needsEvidence ? 'needs_source' : candidate.action,
        safetyNotes: [
          ...(Array.isArray(candidate.safetyNotes) ? candidate.safetyNotes : []),
          ...(needsEvidence ? ['No sourceUrls were returned, so this candidate was downgraded to needs_source.'] : []),
        ],
      };
    }),
    existingRecordFixes: existingRecordFixes.map((fix) => {
      const sourceUrls = Array.isArray(fix.sourceUrls) ? fix.sourceUrls.filter(Boolean) : [];
      const needsEvidence = fix.action !== 'hold' && sourceUrls.length === 0;
      return {
        ...fix,
        sourceUrls,
        action: needsEvidence ? 'needs_source' : fix.action,
        proposedValue: needsEvidence ? 'needs_source' : fix.proposedValue,
        rationale: needsEvidence
          ? `${fix.rationale || ''} No sourceUrls were returned, so this update was downgraded to needs_source.`.trim()
          : fix.rationale,
      };
    }),
  };
}

async function main() {
  const sourcePack = JSON.parse(fs.readFileSync(SOURCE_PACK, 'utf8'));
  const roster = await loadRoster(sourcePack);
  const config = loadMimoConfig();
  const result = normalizeResult(await callMimo(config, sourcePack, roster));
  const meta = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    sourcePack: SOURCE_PACK,
    relevantRosterCount: roster.length,
    reviewer: { provider: 'xiaomi', model: MODEL },
  };
  const payload = { meta, sourcePack, currentRelevantRoster: roster, result };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(REPORT_OUT, renderReport(result, meta));

  console.log(JSON.stringify({
    out: OUT,
    reportOut: REPORT_OUT,
    candidates: Array.isArray(result.candidates) ? result.candidates.length : 0,
    existingRecordFixes: Array.isArray(result.existingRecordFixes) ? result.existingRecordFixes.length : 0,
    relevantRosterCount: roster.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
