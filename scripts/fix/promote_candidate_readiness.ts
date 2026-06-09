/**
 * Promote source-ready candidate People rows to ready.
 *
 * Default is dry-run. Use --execute to mutate People.status.
 *
 * Promotion gate:
 * - status = candidate
 * - completeness >= 45
 * - rawCount >= 2
 * - keepCount >= 2
 * - liveCount >= 1
 * - cardCount >= 5
 * - avatarUrl present
 */
import 'dotenv/config';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { neon } from '@neondatabase/serverless';

type CandidateRow = {
  id: string;
  name: string;
  status: string;
  completeness: number;
  avatarUrl: string | null;
  rawCount: number;
  liveCount: number;
  keepCount: number;
  cardCount: number;
};

type PromotionRow = CandidateRow & {
  blockers: string[];
};

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const PERSON = args.find(arg => arg.startsWith('--person='))?.slice('--person='.length);
const OUT = args.find(arg => arg.startsWith('--out='))?.slice('--out='.length)
  || 'docs/audit-2026-06/data/candidate_promotion.json';

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function collectBlockers(row: CandidateRow): string[] {
  const blockers: string[] = [];
  if (row.status !== 'candidate') blockers.push(`status_${row.status}`);
  if (row.completeness < 45) blockers.push('completeness_below_45');
  if (!row.avatarUrl) blockers.push('avatar_missing');
  if (row.rawCount < 2) blockers.push('raw_count_below_2');
  if (row.keepCount < 2) blockers.push('qa_keep_below_2');
  if (row.liveCount < 1) blockers.push('live_source_missing');
  if (row.cardCount < 5) blockers.push('card_count_below_5');
  return blockers;
}

async function loadCandidates(): Promise<PromotionRow[]> {
  const person = PERSON ?? null;
  const personLike = PERSON ? `%${PERSON}%` : null;

  const rows = await sql`
    SELECT
      p.id,
      p.name,
      p.status,
      p.completeness,
      p."avatarUrl",
      (SELECT COUNT(*)::int FROM "RawPoolItem" raw WHERE raw."personId" = p.id) AS "rawCount",
      (
        SELECT COUNT(*)::int
        FROM "RawPoolItem" raw
        WHERE raw."personId" = p.id
          AND raw.metadata->>'seed' = ${'candidate_live_fetch'}
      ) AS "liveCount",
      (
        SELECT COUNT(*)::int
        FROM "QAAuditLog" qa
        WHERE qa."personId" = p.id
          AND qa.verdict = ${'keep'}
      ) AS "keepCount",
      (SELECT COUNT(*)::int FROM "Card" c WHERE c."personId" = p.id) AS "cardCount"
    FROM "People" p
    WHERE p.status = ${'candidate'}
      AND (${person}::text IS NULL OR p.name ILIKE ${personLike}::text)
    ORDER BY p.name ASC
  ` as CandidateRow[];

  return rows.map(row => ({
    ...row,
    blockers: collectBlockers(row),
  }));
}

async function main() {
  const candidates = await loadCandidates();
  const promotable = candidates.filter(candidate => candidate.blockers.length === 0);
  const held = candidates.filter(candidate => candidate.blockers.length > 0);

  console.log(`Candidate promotion mode: ${EXECUTE ? 'execute' : 'dry-run'} | candidates=${candidates.length}`);
  for (const candidate of promotable) {
    console.log(`${EXECUTE ? 'promote' : 'would promote'} ${candidate.name} -> ready`);
  }
  for (const candidate of held) {
    console.log(`hold ${candidate.name}: ${candidate.blockers.join(', ')}`);
  }

  let updated = 0;
  if (EXECUTE && promotable.length > 0) {
    await sql`
      UPDATE "People"
      SET status = ${'ready'}, "updatedAt" = NOW()
      WHERE id = ANY(${promotable.map(candidate => candidate.id)}::text[])
    `;
    updated = promotable.length;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    mode: EXECUTE ? 'execute' : 'dry-run',
    criteria: {
      status: 'candidate',
      completeness: '>= 45',
      rawCount: '>= 2',
      keepCount: '>= 2',
      liveCount: '>= 1',
      cardCount: '>= 5',
      avatarUrl: 'required',
    },
    summary: {
      candidates: candidates.length,
      promotable: promotable.length,
      held: held.length,
      updated,
    },
    promotable,
    held,
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Candidate promotion report written: ${OUT}`);
  console.log(JSON.stringify(payload.summary, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
