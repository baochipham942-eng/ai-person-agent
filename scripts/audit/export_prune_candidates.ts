/**
 * Export non-destructive RawPoolItem prune candidates from latest QAAuditLog verdicts.
 *
 * Read-only. By default writes counts plus samples. Use --full to include every
 * candidate row in the JSON report before running a destructive prune flow.
 */
import 'dotenv/config';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { neon } from '@neondatabase/serverless';

type PruneRow = {
  rawId: string;
  personId: string;
  person: string;
  status: string;
  urlHash: string;
  url: string;
  sourceType: string;
  title: string;
  fetchedAt: Date;
  verdict: string;
  stage: string;
  reason: string | null;
  auditedAt: Date;
};

const args = process.argv.slice(2);
const FULL = args.includes('--full');
const OUT = args.find(arg => arg.startsWith('--out='))?.slice('--out='.length)
  || 'docs/audit-2026-06/data/prune_candidates.json';
const SAMPLE_LIMIT = readNumberArg('sample-limit') ?? 25;

const PRUNABLE_VERDICTS = new Set(['reject', 'duplicate', 'empty_content', 'incomplete']);

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function readNumberArg(name: string): number | undefined {
  const raw = args.find(arg => arg.startsWith(`--${name}=`));
  if (!raw) return undefined;
  const value = Number(raw.slice(name.length + 3));
  if (!Number.isFinite(value) || value < 0) throw new Error(`--${name} must be a non-negative number`);
  return value;
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = getKey(item);
    acc[key] ||= [];
    acc[key].push(item);
    return acc;
  }, {});
}

function summarize<T>(groups: Record<string, T[]>): Record<string, number> {
  return Object.fromEntries(Object.entries(groups).map(([key, rows]) => [key, rows.length]));
}

function compactRow(row: PruneRow) {
  return {
    rawId: row.rawId,
    person: row.person,
    status: row.status,
    verdict: row.verdict,
    sourceType: row.sourceType,
    title: row.title,
    url: row.url,
    urlHash: row.urlHash,
    reason: row.reason,
    auditedAt: row.auditedAt,
  };
}

async function main() {
  const rows = await sql`
    WITH latest_qa AS (
      SELECT DISTINCT ON ("urlHash")
        "personId",
        "urlHash",
        verdict,
        stage,
        reason,
        "createdAt"
      FROM "QAAuditLog"
      ORDER BY "urlHash", "createdAt" DESC
    )
    SELECT
      raw.id AS "rawId",
      raw."personId",
      p.name AS person,
      p.status,
      raw."urlHash",
      raw.url,
      raw."sourceType",
      raw.title,
      raw."fetchedAt",
      qa.verdict,
      qa.stage,
      qa.reason,
      qa."createdAt" AS "auditedAt"
    FROM "RawPoolItem" raw
    JOIN "People" p ON p.id = raw."personId"
    JOIN latest_qa qa ON qa."urlHash" = raw."urlHash" AND qa."personId" = raw."personId"
    ORDER BY qa.verdict ASC, p.name ASC, raw."fetchedAt" DESC
  ` as PruneRow[];

  const prunable = rows.filter(row => PRUNABLE_VERDICTS.has(row.verdict));
  const review = rows.filter(row => row.verdict === 'review');
  const keep = rows.filter(row => row.verdict === 'keep');
  const prunableByVerdict = groupBy(prunable, row => row.verdict);
  const allByVerdict = groupBy(rows, row => row.verdict);
  const prunableByPerson = groupBy(prunable, row => row.person);

  const payload = {
    generatedAt: new Date().toISOString(),
    criteria: {
      prunableVerdicts: [...PRUNABLE_VERDICTS],
      reviewPolicy: 'review is exported for human review but is not considered prunable by default',
      destructiveAction: 'this script is read-only; deletion must use a separate explicit prune flow',
    },
    summary: {
      auditedRawPoolItems: rows.length,
      keep: keep.length,
      review: review.length,
      prunable: prunable.length,
      byVerdict: summarize(allByVerdict),
      prunableByVerdict: summarize(prunableByVerdict),
      prunablePeople: Object.keys(prunableByPerson).length,
    },
    samples: {
      prunableByVerdict: Object.fromEntries(
        Object.entries(prunableByVerdict).map(([verdict, verdictRows]) => [
          verdict,
          verdictRows.slice(0, SAMPLE_LIMIT).map(compactRow),
        ]),
      ),
      review: review.slice(0, SAMPLE_LIMIT).map(compactRow),
    },
    full: FULL
      ? {
          prunable: prunable.map(compactRow),
          review: review.map(compactRow),
        }
      : undefined,
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Prune candidates written: ${OUT}`);
  console.log(JSON.stringify(payload.summary, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
