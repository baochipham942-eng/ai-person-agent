/**
 * Export over-attributed conservative rewrite proposals for manual review.
 *
 * Read-only. This script does not mutate People, RawPoolItem, Card, or products.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const INPUT = getArg('--in')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/fact_claim_remediation_exa_source_quality_mimo.jsonl';
const OUT = getArg('--out')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/conservative_rewrite_queue.json';
const SUMMARY_OUT = getArg('--summary-out')
  || OUT.replace(/\.json$/i, '_summary.json');
const REPORT_OUT = getArg('--report-out')
  || 'docs/audit-2026-06/CONSERVATIVE_REWRITE_QUEUE.md';

loadExtraEnv();

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
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

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function compact(text, max = 280) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
}

function canonicalUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return String(url || '');
  }
}

function byId(rows) {
  return new Map(rows.map((row) => [row.id, row]));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function findProductImpacts(products, raw) {
  const rawUrl = canonicalUrl(raw?.url);
  const rawTitle = normalize(raw?.title);
  return safeArray(products)
    .map((product, index) => ({ product, index }))
    .map(({ product, index }) => {
      const productUrl = canonicalUrl(product?.url);
      const matchReasons = [];
      if (rawUrl && productUrl && rawUrl === productUrl) matchReasons.push('exact_url');
      const productName = normalize(product?.name);
      if (productName.length >= 4 && rawTitle.includes(productName)) matchReasons.push('product_name_in_raw_title');
      return { product, index, matchReasons };
    })
    .filter(({ matchReasons }) => matchReasons.length > 0)
    .map(({ product, index, matchReasons }) => ({
      index,
      name: product.name || null,
      url: product.url || null,
      description: compact(product.description, 220),
      matchReasons,
      matchConfidence: matchReasons.includes('exact_url') ? 'high' : 'medium',
    }));
}

function findCardImpacts(cards, raw) {
  const rawUrl = canonicalUrl(raw?.url);
  const rawTitle = normalize(raw?.title);
  return safeArray(cards)
    .map((card) => {
      const cardUrl = canonicalUrl(card.sourceUrl);
      const matchReasons = [];
      if (rawUrl && cardUrl && rawUrl === cardUrl) matchReasons.push('exact_source_url');
      if (rawTitle.length >= 8) {
        if (normalize(card.title).includes(rawTitle)) matchReasons.push('raw_title_in_card_title');
        if (normalize(card.content).includes(rawTitle)) matchReasons.push('raw_title_in_card_content');
      }
      return { card, matchReasons };
    })
    .filter(({ matchReasons }) => matchReasons.length > 0)
    .slice(0, 10)
    .map(({ card, matchReasons }) => ({
      id: card.id,
      type: card.type,
      title: card.title,
      sourceUrl: card.sourceUrl || null,
      contentPreview: compact(card.content, 220),
      matchReasons,
      matchConfidence: matchReasons.includes('exact_source_url') ? 'high' : 'low',
    }));
}

function groupCount(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function impactConfidenceCounts(queue) {
  const counts = {};
  for (const item of queue) {
    for (const impact of [...item.productImpacts, ...item.cardImpacts]) {
      const key = impact.matchConfidence || 'unknown';
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function mdEscape(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ')
    .trim();
}

function renderReport(queue, summary) {
  const lines = [];
  lines.push('# Conservative Rewrite Queue');
  lines.push('');
  lines.push(`Generated at: ${summary.generatedAt}`);
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | ---: |');
  lines.push(`| input remediation rows | ${summary.inputRows} |`);
  lines.push(`| rewrite conservative rows | ${summary.rewriteRows} |`);
  lines.push(`| missing RawPoolItem | ${summary.missingRawPoolItems} |`);
  lines.push(`| product impacts | ${summary.productImpacts} |`);
  lines.push(`| card impacts | ${summary.cardImpacts} |`);
  lines.push('');
  lines.push('## By Person');
  lines.push('');
  lines.push('| Person | Count |');
  lines.push('| --- | ---: |');
  for (const [person, count] of Object.entries(summary.byPerson)) {
    lines.push(`| ${mdEscape(person)} | ${count} |`);
  }
  lines.push('');
  lines.push('## Queue');
  lines.push('');
  lines.push('| Person | Target | Proposed Conservative Text | Impact |');
  lines.push('| --- | --- | --- | --- |');
  for (const item of queue) {
    const impact = [
      item.productImpacts.length ? `products:${item.productImpacts.length}` : '',
      item.cardImpacts.length ? `cards:${item.cardImpacts.length}` : '',
      item.rawPoolItem ? '' : 'missing_raw',
    ].filter(Boolean).join(', ') || 'manual source review';
    lines.push([
      mdEscape(item.person),
      mdEscape(item.rawPoolItem?.title || item.target.objectLabel || item.target.objectId),
      mdEscape(item.proposedText || ''),
      mdEscape(impact),
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('- Read-only export only.');
  lines.push('- All rows remain `safeToAutoApply=false`.');
  lines.push('- Apply should happen only after human confirmation of the affected product/card text.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const rows = readJsonl(INPUT);
  const rewriteRows = rows.filter((row) => row.remediationAction === 'rewrite_conservative');
  const rawIds = rewriteRows
    .map((row) => row.target?.objectId)
    .filter(Boolean);
  const personIds = [...new Set(rewriteRows.map((row) => row.personId).filter(Boolean))];

  const [rawRows, peopleRows, cardRows] = await Promise.all([
    rawIds.length
      ? sql`
          SELECT id, "personId", "sourceType", url, title, text, metadata
          FROM "RawPoolItem"
          WHERE id = ANY(${rawIds})
        `
      : [],
    personIds.length
      ? sql`
          SELECT id, name, status, products, topics, "topicDetails"
          FROM "People"
          WHERE id = ANY(${personIds})
        `
      : [],
    personIds.length
      ? sql`
          SELECT id, "personId", type, title, content, "sourceUrl"
          FROM "Card"
          WHERE "personId" = ANY(${personIds})
            AND "isActive" = true
        `
      : [],
  ]);

  const rawById = byId(rawRows);
  const peopleById = byId(peopleRows);
  const cardsByPerson = new Map();
  for (const card of cardRows) {
    const bucket = cardsByPerson.get(card.personId) || [];
    bucket.push(card);
    cardsByPerson.set(card.personId, bucket);
  }

  const queue = rewriteRows.map((row) => {
    const raw = rawById.get(row.target?.objectId) || null;
    const person = peopleById.get(row.personId) || null;
    const productImpacts = findProductImpacts(person?.products, raw);
    const cardImpacts = findCardImpacts(cardsByPerson.get(row.personId), raw);
    return {
      claimId: row.claimId,
      personId: row.personId,
      person: row.person,
      status: person?.status || null,
      verdict: row.verdict,
      confidence: row.confidence,
      safeToAutoApply: false,
      target: row.target,
      rawPoolItem: raw
        ? {
            id: raw.id,
            sourceType: raw.sourceType,
            title: raw.title,
            url: raw.url,
            textPreview: compact(raw.text, 600),
          }
        : null,
      proposedText: row.proposedText,
      sourceQueries: row.sourceQueries || [],
      evidenceRequirements: row.evidenceRequirements || [],
      rationale: row.rationale,
      blockers: row.blockers || [],
      productImpacts,
      cardImpacts,
      recommendedNextStep: productImpacts.length || cardImpacts.length
        ? 'human_confirm_then_rewrite_impacted_surface'
        : 'human_confirm_source_scope_before_surface_change',
    };
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    input: INPUT,
    inputRows: rows.length,
    rewriteRows: queue.length,
    missingRawPoolItems: queue.filter((item) => !item.rawPoolItem).length,
    productImpacts: queue.reduce((sum, item) => sum + item.productImpacts.length, 0),
    cardImpacts: queue.reduce((sum, item) => sum + item.cardImpacts.length, 0),
    impactConfidence: impactConfidenceCounts(queue),
    byPerson: groupCount(queue, (item) => item.person),
    byStatus: groupCount(queue, (item) => item.status),
    byNextStep: groupCount(queue, (item) => item.recommendedNextStep),
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify({ summary, queue }, null, 2)}\n`);
  fs.writeFileSync(SUMMARY_OUT, `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(REPORT_OUT, renderReport(queue, summary));

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
