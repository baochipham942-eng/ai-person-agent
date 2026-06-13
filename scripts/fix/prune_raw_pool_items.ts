/**
 * Prune RawPoolItem rows by latest QA verdict.
 *
 * Default is a dry-run and only targets low-risk verdicts:
 * duplicate, empty_content, incomplete.
 *
 * Use --execute to delete. Use --include-reject only after product approval.
 */
import 'dotenv/config';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { neon } from '@neondatabase/serverless';

type PruneRow = {
  id: string;
  personId: string;
  person: string;
  status: string;
  sourceType: string;
  url: string;
  urlHash: string;
  contentHash: string;
  title: string;
  text: string;
  publishedAt: Date | null;
  metadata: unknown;
  fetchStatus: string;
  errorCode: string | null;
  fetchedAt: Date;
  processed: boolean;
  verdict: string;
  stage: string;
  reason: string | null;
  auditedAt: Date;
};

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const INCLUDE_REJECT = args.includes('--include-reject');
const OUT = args.find(arg => arg.startsWith('--out='))?.slice('--out='.length)
  || 'docs/audit-2026-06/data/prune_execution_safe.json';
const ARCHIVE = args.find(arg => arg.startsWith('--archive='))?.slice('--archive='.length)
  || 'docs/audit-2026-06/data/prune_archive_safe.json';

const SAFE_VERDICTS = ['duplicate', 'empty_content', 'incomplete'];
const TARGET_VERDICTS = INCLUDE_REJECT ? [...SAFE_VERDICTS, 'reject'] : SAFE_VERDICTS;

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function groupCount(rows: PruneRow[], getKey: (row: PruneRow) => string): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = getKey(row);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function topEntries(counts: Record<string, number>, limit = 25): Record<string, number> {
  return Object.fromEntries(
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit),
  );
}

async function loadTargets(): Promise<PruneRow[]> {
  return await sql`
    WITH latest_qa AS (
      SELECT DISTINCT ON ("personId", "urlHash")
        "personId",
        "urlHash",
        verdict,
        stage,
        reason,
        "createdAt"
      FROM "QAAuditLog"
      ORDER BY "personId", "urlHash", "createdAt" DESC
    )
    SELECT
      raw.id,
      raw."personId",
      p.name AS person,
      p.status,
      raw."sourceType",
      raw.url,
      raw."urlHash",
      raw."contentHash",
      raw.title,
      raw.text,
      raw."publishedAt",
      raw.metadata,
      raw."fetchStatus",
      raw."errorCode",
      raw."fetchedAt",
      raw.processed,
      qa.verdict,
      qa.stage,
      qa.reason,
      qa."createdAt" AS "auditedAt"
    FROM "RawPoolItem" raw
    JOIN "People" p ON p.id = raw."personId"
    JOIN latest_qa qa ON qa."personId" = raw."personId" AND qa."urlHash" = raw."urlHash"
    WHERE qa.verdict = ANY(${TARGET_VERDICTS}::text[])
    ORDER BY qa.verdict ASC, p.name ASC, raw."fetchedAt" DESC
  ` as PruneRow[];
}

async function main() {
  const targets = await loadTargets();
  const ids = targets.map(row => row.id);

  console.log(`RawPoolItem prune mode: ${EXECUTE ? 'execute' : 'dry-run'} | targetVerdicts=${TARGET_VERDICTS.join(',')} | targets=${targets.length}`);

  const summary = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    targetVerdicts: TARGET_VERDICTS,
    targets: targets.length,
    byVerdict: groupCount(targets, row => row.verdict),
    byStatus: groupCount(targets, row => row.status),
    affectedPeople: Object.keys(groupCount(targets, row => row.personId)).length,
    topPeople: topEntries(groupCount(targets, row => row.person)),
    deleted: 0,
  };

  const archivePayload = {
    generatedAt: new Date().toISOString(),
    criteria: {
      latestQaOnly: true,
      targetVerdicts: TARGET_VERDICTS,
      includeReject: INCLUDE_REJECT,
      destructiveAction: EXECUTE ? 'deleted RawPoolItem rows only; QAAuditLog and Card rows were not deleted' : 'dry-run only',
    },
    summary,
    rows: targets,
  };

  await mkdir(path.dirname(ARCHIVE), { recursive: true });
  await writeFile(ARCHIVE, `${JSON.stringify(archivePayload, null, 2)}\n`);

  if (EXECUTE && ids.length > 0) {
    const deletedRows = await sql`
      DELETE FROM "RawPoolItem"
      WHERE id = ANY(${ids}::text[])
      RETURNING id
    ` as Array<{ id: string }>;
    summary.deleted = deletedRows.length;
  }

  const reportPayload = {
    generatedAt: new Date().toISOString(),
    archive: ARCHIVE,
    summary,
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(reportPayload, null, 2)}\n`);

  console.log(`Prune archive written: ${ARCHIVE}`);
  console.log(`Prune execution report written: ${OUT}`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
