/**
 * Build a draft decisions file for conservative product/card rewrites.
 *
 * Read-only. The output is meant for scripts/fix/apply_product_review_decisions.ts
 * dry-run first; do not execute without manual review.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const INPUT = getArg('--in')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/conservative_rewrite_queue.json';
const OUT = getArg('--out')
  || 'docs/audit-2026-06/data/exa_source_quality_review_dir/conservative_rewrite_decisions_draft.json';
const SUMMARY_OUT = getArg('--summary-out')
  || OUT.replace(/\.json$/i, '_summary.json');
const REPORT_OUT = getArg('--report-out')
  || 'docs/audit-2026-06/CONSERVATIVE_REWRITE_DECISIONS_DRAFT.md';
const INCLUDE_LOW_CONFIDENCE_CARDS = process.argv.includes('--include-low-confidence-cards');

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

function compact(text, max = 64) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function cloneJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  return JSON.parse(JSON.stringify(value));
}

function groupBy(rows, keyFn) {
  const grouped = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    const bucket = grouped.get(key) || [];
    bucket.push(row);
    grouped.set(key, bucket);
  }
  return grouped;
}

function byId(rows) {
  return new Map(rows.map((row) => [row.id, row]));
}

function shouldIncludeCardImpact(cardImpact) {
  if (INCLUDE_LOW_CONFIDENCE_CARDS) return true;
  return cardImpact.matchConfidence === 'high';
}

function proposedCardTitle(item) {
  const text = `${item.rawPoolItem?.title || ''} ${item.proposedText || ''}`;
  if (/GPT-?4/i.test(text)) return '保守归因：GPT-4 项目角色';
  if (/LLaMA/i.test(text)) return '保守归因：LLaMA 研究参与';
  if (/Transformer|Attention Is All You Need/i.test(text)) return '保守归因：Transformer 共同作者';
  if (/Stable Diffusion/i.test(text)) return '保守归因：Stable Diffusion 团队成果';
  if (/Gemini/i.test(text)) return '保守归因：Gemini 发布角色';
  const label = compact(item.rawPoolItem?.title || item.target?.objectLabel || item.person, 18).replace(/\.\.\.$/, '');
  return `保守归因：${label}`;
}

function conservativeRole(personName, productName, proposedText, currentRole) {
  const text = String(proposedText || '');
  if (/共同作者|合著者/.test(text)) return 'co-author';
  if (/联合创始人兼首席执行官/.test(text)) return 'co-founder/CEO';
  if (/联合创始人兼总裁/.test(text)) return 'co-founder/president';
  if (/CEO|首席执行官/.test(text)) return 'CEO';
  if (/参与领导|领导公司|领导了/.test(text)) return 'leadership';
  if (/参与了|参与/.test(text)) return 'contributor';
  return currentRole || `${personName} role in ${productName}`;
}

function buildEvidenceNote(items) {
  return items.map((item) => {
    const impacts = [
      item.productImpacts.length ? `products=${item.productImpacts.map((impact) => impact.name).join('/')}` : '',
      item.cardImpacts.filter(shouldIncludeCardImpact).length
        ? `cards=${item.cardImpacts.filter(shouldIncludeCardImpact).map((impact) => impact.title).join('/')}`
        : '',
    ].filter(Boolean).join(', ') || 'no high-confidence display impact';
    return `${item.claimId}: ${item.rationale} (${impacts})`;
  }).join('\n');
}

function mdEscape(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ')
    .trim();
}

function renderReport(decisions, skipped, summary) {
  const lines = [];
  lines.push('# Conservative Rewrite Decisions Draft');
  lines.push('');
  lines.push(`Generated at: ${summary.generatedAt}`);
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | ---: |');
  lines.push(`| decisions | ${summary.decisions} |`);
  lines.push(`| product edits | ${summary.productEdits} |`);
  lines.push(`| card updates | ${summary.cardUpdates} |`);
  lines.push(`| skipped | ${summary.skipped} |`);
  lines.push(`| include low-confidence cards | ${summary.includeLowConfidenceCards ? 'yes' : 'no'} |`);
  lines.push('');
  lines.push('## Decisions');
  lines.push('');
  lines.push('| Person | Product Edits | Card Updates | Excluded Low-confidence Cards |');
  lines.push('| --- | --- | --- | --- |');
  for (const decision of decisions) {
    lines.push([
      decision.person,
      decision.review.productEdits.map((edit) => `${edit.name} (${edit.matchConfidence})`).join('<br>') || '',
      decision.cardUpdates.map((update) => update.title).join('<br>') || '',
      decision.review.excludedLowConfidenceCards.map((card) => `${card.title} (${card.matchConfidence})`).join('<br>') || '',
    ].map(mdEscape).join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }
  if (skipped.length) {
    lines.push('');
    lines.push('## Skipped');
    lines.push('');
    lines.push('| Person | Reason |');
    lines.push('| --- | --- |');
    for (const item of skipped) {
      lines.push(`| ${mdEscape(item.person || item.personId)} | ${mdEscape(item.reason)} |`);
    }
  }
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('- Draft only; generated decisions keep `safeToAutoApply=false` in review metadata.');
  lines.push('- Run `scripts/fix/apply_product_review_decisions.ts` without `--execute` before any write.');
  lines.push('- Low-confidence card matches are excluded by default.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  const queue = (payload.queue || [])
    .filter((item) => item.productImpacts?.length || item.cardImpacts?.some(shouldIncludeCardImpact));
  const personIds = [...new Set(queue.map((item) => item.personId).filter(Boolean))];

  const [people, cards] = await Promise.all([
    personIds.length
      ? sql`
          SELECT id, name, products, topics, "topicDetails"
          FROM "People"
          WHERE id = ANY(${personIds})
        `
      : [],
    personIds.length
      ? sql`
          SELECT id, "personId", title, content
          FROM "Card"
          WHERE "personId" = ANY(${personIds})
            AND "isActive" = true
        `
      : [],
  ]);

  const peopleById = byId(people);
  const cardsById = byId(cards);
  const grouped = groupBy(queue, (item) => item.personId);
  const decisions = [];
  const skipped = [];

  for (const [personId, items] of grouped.entries()) {
    const person = peopleById.get(personId);
    if (!person) {
      skipped.push({ personId, reason: 'missing_person' });
      continue;
    }

    const products = cloneJson(person.products, []);
    const productEdits = [];
    const cardUpdates = [];

    for (const item of items) {
      for (const impact of item.productImpacts || []) {
        if (!products[impact.index]) continue;
        products[impact.index] = {
          ...products[impact.index],
          description: item.proposedText,
          role: conservativeRole(item.person, impact.name, item.proposedText, products[impact.index].role),
        };
        productEdits.push({
          index: impact.index,
          name: impact.name,
          matchConfidence: impact.matchConfidence,
          matchReasons: impact.matchReasons,
          proposedText: item.proposedText,
        });
      }

      for (const impact of item.cardImpacts || []) {
        if (!shouldIncludeCardImpact(impact)) continue;
        const card = cardsById.get(impact.id);
        if (!card) {
          skipped.push({ personId, person: item.person, cardId: impact.id, reason: 'missing_card' });
          continue;
        }
        cardUpdates.push({
          cardId: impact.id,
          title: proposedCardTitle(item),
          content: item.proposedText,
          metadata: {
            claimId: item.claimId,
            previousTitle: card.title,
            previousContentPreview: compact(card.content, 200),
            matchConfidence: impact.matchConfidence,
            matchReasons: impact.matchReasons,
          },
        });
      }
    }

    if (!productEdits.length && !cardUpdates.length) {
      skipped.push({ personId, person: person.name, reason: 'no_selected_impacts' });
      continue;
    }

    decisions.push({
      personId,
      person: person.name,
      action: 'replace_products_and_topics',
      products,
      topics: person.topics || [],
      topicDetails: cloneJson(person.topicDetails, []),
      cardUpdates,
      removeProductNames: [],
      removeTopicNames: [],
      evidenceUrls: items.map((item) => item.rawPoolItem?.url).filter(Boolean),
      evidenceNote: buildEvidenceNote(items),
      review: {
        generatedFrom: 'conservative_rewrite_queue',
        safeToAutoApply: false,
        requiresHumanConfirmation: true,
        productEdits,
        excludedLowConfidenceCards: items.flatMap((item) => (
          item.cardImpacts || []
        ).filter((impact) => !shouldIncludeCardImpact(impact)).map((impact) => ({
          claimId: item.claimId,
          cardId: impact.id,
          title: impact.title,
          matchConfidence: impact.matchConfidence,
          matchReasons: impact.matchReasons,
        }))),
      },
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    input: INPUT,
    decisions: decisions.length,
    productEdits: decisions.reduce((sum, decision) => sum + decision.review.productEdits.length, 0),
    cardUpdates: decisions.reduce((sum, decision) => sum + decision.cardUpdates.length, 0),
    skipped: skipped.length,
    includeLowConfidenceCards: INCLUDE_LOW_CONFIDENCE_CARDS,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify({ decisions, skipped, summary }, null, 2)}\n`);
  fs.writeFileSync(SUMMARY_OUT, `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(REPORT_OUT, renderReport(decisions, skipped, summary));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
