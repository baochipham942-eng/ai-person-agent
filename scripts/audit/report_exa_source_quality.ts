/**
 * Read-only Exa source quality report.
 *
 * Usage:
 *   npx tsx scripts/audit/report_exa_source_quality.ts
 *   npx tsx scripts/audit/report_exa_source_quality.ts --person="Dario Amodei" --limit=200
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../../lib/db/prisma';
import { evaluateSourceQuality } from '../../lib/skills/source-quality-policy';

const DEFAULT_OUT = 'docs/audit-2026-06/data/exa_source_quality_report.json';
const DEFAULT_MARKDOWN_OUT = 'docs/audit-2026-06/EXA_SOURCE_QUALITY_REPORT.md';

function getArg(name: string): string | undefined {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function compact(text: unknown, max = 180): string {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function groupCount<T>(rows: T[], key: (row: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const value = key(row) || 'unknown';
    counts[value] = (counts[value] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function table(rows: Array<Record<string, unknown>>, columns: Array<{ label: string; key: string }>): string {
  const header = `| ${columns.map((col) => col.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((col) => String(row[col.key] ?? '').replace(/\n/g, '<br>').replace(/\|/g, '\\|')).join(' | ')} |`);
  return [header, divider, ...body].join('\n');
}

async function main() {
  const personName = getArg('--person');
  const limit = Number(getArg('--limit') || '0');
  const out = getArg('--out') || DEFAULT_OUT;
  const markdownOut = getArg('--markdown-out') || DEFAULT_MARKDOWN_OUT;
  const onlyProblems = hasFlag('--only-problems');

  const rows = await prisma.rawPoolItem.findMany({
    where: {
      sourceType: 'exa',
      ...(personName ? { person: { name: { contains: personName, mode: 'insensitive' as const } } } : {}),
    },
    select: {
      id: true,
      url: true,
      title: true,
      text: true,
      sourceType: true,
      metadata: true,
      fetchedAt: true,
      person: {
        select: {
          id: true,
          name: true,
          aliases: true,
          organization: true,
          occupation: true,
          topics: true,
          currentTitle: true,
          status: true,
        },
      },
    },
    orderBy: [{ person: { name: 'asc' } }, { fetchedAt: 'desc' }],
    ...(limit > 0 ? { take: limit } : {}),
  });

  const evaluations = rows.map((row) => {
    const metadata = row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? row.metadata as Record<string, unknown>
      : {};
    const decision = evaluateSourceQuality({
      sourceType: row.sourceType,
      url: row.url,
      title: row.title,
      text: row.text,
      metadata,
    }, {
      name: row.person.name,
      aliases: row.person.aliases,
      organizations: row.person.organization,
      occupations: row.person.occupation,
      topics: row.person.topics,
      currentTitle: row.person.currentTitle,
    });

    return {
      rawPoolItemId: row.id,
      personId: row.person.id,
      person: row.person.name,
      status: row.person.status,
      title: row.title,
      url: row.url,
      textPreview: compact(row.text, 240),
      fetchedAt: row.fetchedAt.toISOString(),
      action: decision.action,
      score: decision.score,
      flags: decision.flags,
      reasons: decision.reasons,
      matched: decision.matched,
    };
  });

  const visibleRows = onlyProblems
    ? evaluations.filter((row) => row.action !== 'accept')
    : evaluations;
  const problemRows = evaluations.filter((row) => row.action !== 'accept');

  const summary = {
    generatedAt: new Date().toISOString(),
    filter: { sourceType: 'exa', personName: personName || null, limit: limit || null },
    scanned: evaluations.length,
    problemCount: problemRows.length,
    byAction: groupCount(evaluations, (row) => row.action),
    byFlag: groupCount(evaluations.flatMap((row) => row.flags.map((flag) => ({ flag }))), (row) => row.flag),
    topProblemPeople: groupCount(problemRows, (row) => row.person),
    examples: visibleRows.filter((row) => row.action !== 'accept').slice(0, 80),
  };

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify({ summary, rows: visibleRows }, null, 2)}\n`);

  const markdownRows = summary.examples.slice(0, 40).map((row) => ({
    person: row.person,
    action: row.action,
    score: row.score,
    flags: row.flags.join(', '),
    title: compact(row.title, 80),
    reason: compact(row.reasons.join('; '), 120),
    url: row.url,
  }));

  const lines = [
    '# Exa Source Quality Report',
    '',
    `Generated at: ${summary.generatedAt}`,
    `Scanned Exa RawPoolItems: ${summary.scanned}`,
    `Problem rows: ${summary.problemCount}`,
    '',
    '## By Action',
    '',
    table(Object.entries(summary.byAction).map(([action, count]) => ({ action, count })), [
      { label: 'Action', key: 'action' },
      { label: 'Count', key: 'count' },
    ]),
    '',
    '## Top Problem People',
    '',
    table(Object.entries(summary.topProblemPeople).slice(0, 30).map(([person, count]) => ({ person, count })), [
      { label: 'Person', key: 'person' },
      { label: 'Count', key: 'count' },
    ]),
    '',
    '## Problem Examples',
    '',
    table(markdownRows, [
      { label: 'Person', key: 'person' },
      { label: 'Action', key: 'action' },
      { label: 'Score', key: 'score' },
      { label: 'Flags', key: 'flags' },
      { label: 'Title', key: 'title' },
      { label: 'Reason', key: 'reason' },
      { label: 'URL', key: 'url' },
    ]),
    '',
  ];

  fs.mkdirSync(path.dirname(markdownOut), { recursive: true });
  fs.writeFileSync(markdownOut, `${lines.join('\n')}\n`);

  console.log(JSON.stringify({
    out,
    markdownOut,
    scanned: summary.scanned,
    problemCount: summary.problemCount,
    byAction: summary.byAction,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
