/**
 * Apply manual People.officialLinks decisions.
 *
 * Default is dry-run. Execute mode only edits exact URL matches listed in the
 * decision file and writes a before/after archive for review.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const INPUT = getArg('--in');
const OUT = getArg('--out') || 'docs/audit-2026-06/data/people_official_link_apply_log.json';
const ARCHIVE = getArg('--archive') || 'docs/audit-2026-06/data/people_official_link_apply_archive.json';
const REPORT_OUT = getArg('--report-out') || 'docs/audit-2026-06/PEOPLE_OFFICIAL_LINK_APPLY.md';
const STAGE = getArg('--stage') || 'manual_people_official_link';
const EXECUTE = process.argv.includes('--execute');

loadExtraEnv();
if (!INPUT) throw new Error('Missing --in');
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function compact(text, max = 160) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function mdEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function nextOfficialLinks(decision, currentLinks) {
  if (decision.action === 'remove_official_link') {
    return currentLinks.filter((link) => link?.url !== decision.url);
  }
  if (decision.action === 'replace_official_link') {
    return currentLinks.map((link) => (link?.url === decision.fromUrl ? decision.toLink : link));
  }
  throw new Error(`Unsupported action: ${decision.action}`);
}

function isApplicable(decision, person) {
  const links = asArray(person?.officialLinks);
  if (decision.action === 'remove_official_link') {
    return links.some((link) => link?.url === decision.url);
  }
  if (decision.action === 'replace_official_link') {
    return links.some((link) => link?.url === decision.fromUrl);
  }
  return false;
}

function renderReport(summary, rows) {
  const lines = [
    '# People Official Link Apply',
    '',
    `Generated at: ${summary.generatedAt}`,
    `Mode: ${summary.mode}`,
    `Input: ${summary.input}`,
    `Archive: ${summary.archive}`,
    `Stage: ${summary.stage}`,
    '',
    '## Counts',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| decisions | ${summary.decisions} |`,
    `| applicable | ${summary.applicable} |`,
    `| applied | ${summary.applied} |`,
    `| skipped | ${summary.skipped} |`,
    '',
    '## Actions',
    '',
    '| Action | Count |',
    '| --- | ---: |',
    ...Object.entries(summary.byAction).map(([action, count]) => `| ${mdEscape(action)} | ${count} |`),
    '',
    '## Rows',
    '',
    '| Person | Action | URL | Applicable | Applied | Reason |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map((row) => [
      row.decision.person || row.person?.name || row.decision.personId,
      row.decision.action,
      row.decision.url || row.decision.fromUrl,
      row.applicable ? 'yes' : 'no',
      row.applied ? 'yes' : 'no',
      row.skippedReason || compact(row.decision.reason),
    ].map(mdEscape).join(' | ').replace(/^/, '| ').replace(/$/, ' |')),
    '',
  ];
  fs.writeFileSync(REPORT_OUT, `${lines.join('\n')}\n`);
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  const decisions = Array.isArray(payload.decisions) ? payload.decisions : [];
  const peopleIds = [...new Set(decisions.map((row) => row.personId).filter(Boolean))];
  const people = peopleIds.length
    ? await sql`
      SELECT id, name, "officialLinks"
      FROM "People"
      WHERE id = ANY(${peopleIds}::text[])
    `
    : [];
  const peopleById = new Map(people.map((person) => [person.id, person]));

  const rows = [];
  for (const decision of decisions) {
    const person = peopleById.get(decision.personId) || null;
    const applicable = Boolean(person && isApplicable(decision, person));
    let applied = false;
    let skippedReason = applicable ? null : (person ? 'not_applicable' : 'missing_person');
    const beforeLinks = asArray(person?.officialLinks);
    const afterLinks = applicable ? nextOfficialLinks(decision, beforeLinks) : beforeLinks;

    if (EXECUTE && applicable) {
      await sql`
        UPDATE "People"
        SET "officialLinks" = ${JSON.stringify(afterLinks)}::jsonb,
            "updatedAt" = NOW()
        WHERE id = ${decision.personId}
      `;
      applied = true;
    }

    rows.push({
      decision,
      person,
      applicable,
      applied,
      skippedReason,
      beforeLinks,
      afterLinks,
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: EXECUTE ? 'execute' : 'dry-run',
    input: INPUT,
    archive: ARCHIVE,
    stage: STAGE,
    decisions: decisions.length,
    applicable: rows.filter((row) => row.applicable).length,
    applied: rows.filter((row) => row.applied).length,
    skipped: rows.filter((row) => !row.applicable).length,
    byAction: countBy(rows, (row) => row.decision.action),
  };

  fs.writeFileSync(OUT, JSON.stringify({ summary, rows }, null, 2));
  fs.writeFileSync(ARCHIVE, JSON.stringify({ summary, rows }, null, 2));
  renderReport(summary, rows);
  console.log(JSON.stringify({ out: OUT, archive: ARCHIVE, reportOut: REPORT_OUT, summary }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
