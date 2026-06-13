/**
 * Export candidate readiness buckets for status promotion review.
 *
 * Read-only. The gate is intentionally conservative and does not mutate People.
 *
 * Usage:
 *   bun scripts/audit/export_candidate_readiness.ts
 */
import 'dotenv/config';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { neon } from '@neondatabase/serverless';
import {
  candidateReadinessCriteria,
  collectCandidateReadinessBlockers,
  loadContentReviewPolicy,
} from './content_review_policy.mjs';

type CandidateRow = {
  id: string;
  name: string;
  completeness: number;
  avatarUrl: string | null;
  officialLinks: unknown;
  products: unknown;
  topics: string[] | null;
  rawCount: number;
  liveCount: number;
  keepCount: number;
  cardCount: number;
};

type CandidateReadiness = {
  id: string;
  name: string;
  completeness: number;
  hasAvatar: boolean;
  officialLinkCount: number;
  productCount: number;
  topicCount: number;
  rawCount: number;
  liveCount: number;
  keepCount: number;
  cardCount: number;
  blockers: string[];
};

type ContentReviewPolicy = ReturnType<typeof loadContentReviewPolicy>;

const args = process.argv.slice(2);
const OUT = args.find(arg => arg.startsWith('--out='))?.slice('--out='.length)
  || 'docs/audit-2026-06/data/candidate_readiness.json';

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);
const policy = loadContentReviewPolicy();

function arrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function bucketCandidate(candidate: CandidateReadiness): string {
  if (candidate.blockers.length > 0) return 'needs_source_depth';
  if (!candidate.hasAvatar) return 'ready_missing_avatar';
  return 'ready_for_promotion_review';
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = getKey(item);
    acc[key] ||= [];
    acc[key].push(item);
    return acc;
  }, {});
}

async function main() {
  const candidates = await sql`
    SELECT
      p.id,
      p.name,
      p.completeness,
      p."avatarUrl",
      p."officialLinks",
      p.products,
      p.topics,
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
      (
        SELECT COUNT(*)::int
        FROM "Card" c
        WHERE c."personId" = p.id
          AND c."isActive" = true
      ) AS "cardCount"
    FROM "People" p
    WHERE p.status = ${'candidate'}
    ORDER BY p.name ASC
  ` as CandidateRow[];

  const rows: CandidateReadiness[] = candidates.map(candidate => ({
    id: candidate.id,
    name: candidate.name,
    completeness: candidate.completeness,
    hasAvatar: Boolean(candidate.avatarUrl),
    officialLinkCount: arrayLength(candidate.officialLinks),
    productCount: arrayLength(candidate.products),
    topicCount: arrayLength(candidate.topics),
    rawCount: candidate.rawCount,
    liveCount: candidate.liveCount,
    keepCount: candidate.keepCount,
    cardCount: candidate.cardCount,
    blockers: collectCandidateReadinessBlockers(candidate, policy as ContentReviewPolicy, { includeAvatarBlocker: false }),
  }));

  const buckets = groupBy(rows, bucketCandidate);
  const payload = {
    generatedAt: new Date().toISOString(),
    policyVersion: policy.version,
    criteria: {
      readyForPromotionReview: candidateReadinessCriteria(policy),
      avatarHandling: 'avatar is tracked separately here; promotion execute still requires avatarUrl',
    },
    summary: Object.fromEntries(Object.entries(buckets).map(([key, value]) => [key, value.length])),
    buckets,
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(`Candidate readiness written: ${OUT}`);
  console.log(JSON.stringify(payload.summary, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
