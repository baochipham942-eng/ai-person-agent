/**
 * Recalculate influenceScore with product-oriented factor weights.
 *
 * Default is dry-run. Use --execute to update People.influenceScore/githubStars.
 *
 * Formula:
 * - AI original contribution: 35
 * - Industry/ecosystem impact: 25
 * - Authority signal: 20
 * - Learning value: 10
 * - Recent activity: 10
 */
import 'dotenv/config';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { neon } from '@neondatabase/serverless';

type PersonRow = {
  id: string;
  name: string;
  aliases: string[] | null;
  status: string;
  aiContributionScore: number;
  citationCount: number;
  hIndex: number;
  githubStars: number;
  viewCount: number;
  weeklyViewCount: number;
  roleCategory: string | null;
  currentTitle: string | null;
  occupation: string[] | null;
  organization: string[] | null;
  topics: string[] | null;
  products: unknown;
  cardCount: number;
  rawCount: number;
  keepCount: number;
  sourceDiversity: number;
  recentKeepCount: number;
  courseCount: number;
  latestActivityAt: Date | null;
  rawGithubStars: number;
};

type ScoreBreakdown = {
  aiOriginal: number;
  industryEcosystem: number;
  authority: number;
  learningValue: number;
  recency: number;
  subtotal: number;
  statusMultiplier: number;
  finalScore: number;
};

type ScoredPerson = {
  id: string;
  name: string;
  status: string;
  roleCategory: string | null;
  currentTitle: string | null;
  aiContributionScore: number;
  githubStars: number;
  citationCount: number;
  hIndex: number;
  counts: {
    cards: number;
    raw: number;
    keep: number;
    sources: number;
    courses: number;
    recentKeep: number;
  };
  breakdown: ScoreBreakdown;
};

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const LIMIT = readNumberArg('limit');
const PERSON = readStringArg('person');
const OUT = readStringArg('out') || 'docs/audit-2026-06/data/influence_v2_scores.json';
const AI_SCORE_MAX = 10.9;

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function readNumberArg(name: string): number | undefined {
  const raw = args.find(arg => arg.startsWith(`--${name}=`));
  if (!raw) return undefined;
  const value = Number(raw.slice(name.length + 3));
  if (!Number.isFinite(value) || value < 0) throw new Error(`--${name} must be a non-negative number`);
  return value;
}

function readStringArg(name: string): string | undefined {
  return args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function points(score: number, weight: number): number {
  return (clamp(score) / 100) * weight;
}

function logScore(value: number, scale: number): number {
  if (value <= 0) return 0;
  return clamp(Math.log10(value + 1) * scale);
}

function arrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function textBlob(person: PersonRow): string {
  return [
    person.name,
    ...(person.aliases || []),
    person.currentTitle || '',
    person.roleCategory || '',
    ...(person.occupation || []),
    ...(person.organization || []),
  ].join(' ').toLowerCase();
}

function statusMultiplier(status: string): number {
  if (status === 'ready') return 1;
  if (status === 'active') return 1;
  if (status === 'building') return 0.55;
  if (status === 'candidate') return 0.35;
  if (status === 'pending') return 0.35;
  if (status === 'error') return 0;
  return 0.6;
}

function aiOriginalScore(person: PersonRow): number {
  return clamp((person.aiContributionScore / AI_SCORE_MAX) * 100);
}

function industryScore(person: PersonRow, githubStars: number): number {
  const text = textBlob(person);
  let roleSignal = 25;
  if (/founder|co-founder|创始|ceo|chief executive|president|总裁|首席执行/.test(text)) roleSignal = 92;
  else if (/cto|chief technology|chief scientist|chief ai|vp|director|head of|负责人|总监|首席/.test(text)) roleSignal = 78;
  else if (/investor|vc|venture|founding partner|投资/.test(text)) roleSignal = 70;
  else if (person.roleCategory === 'founder') roleSignal = 86;
  else if (person.roleCategory === 'engineer') roleSignal = 58;
  else if (person.roleCategory === 'evangelist') roleSignal = 52;

  const productsScore = clamp(arrayLength(person.products) * 22);
  const githubScore = logScore(githubStars, 18);
  const orgSignal = /openai|anthropic|deepmind|google|microsoft|meta|nvidia|英伟达|mistral|cohere|xai|scale ai|hugging face|智谱|deepseek|月之暗面|kimi/.test(text)
    ? 75
    : 35;
  const marketAttention = logScore(person.viewCount + person.weeklyViewCount * 3, 22);

  return roleSignal * 0.38 + productsScore * 0.18 + githubScore * 0.18 + orgSignal * 0.16 + marketAttention * 0.10;
}

function authorityScore(person: PersonRow): number {
  const citationScore = logScore(person.citationCount, 18);
  const hIndexScore = clamp(person.hIndex * 1.35);
  const academicScore = citationScore * 0.58 + hIndexScore * 0.42;
  const text = textBlob(person);
  const awardSignal = /turing|图灵|nobel|诺贝尔|academy|院士|fellow|ieee|acm|award|奖/.test(text) ? 90 : 40;
  const titleSignal = /professor|教授|scientist|research|研究|phd|博士/.test(text) ? 70 : 35;
  return academicScore * 0.65 + awardSignal * 0.20 + titleSignal * 0.15;
}

function learningScore(person: PersonRow): number {
  const cardScore = clamp(person.cardCount * 6);
  const keepScore = clamp(person.keepCount * 2.2);
  const courseScore = clamp(person.courseCount * 28);
  const sourceScore = clamp(person.sourceDiversity * 18);
  const topicScore = clamp((person.topics || []).length * 12);
  return cardScore * 0.30 + keepScore * 0.25 + courseScore * 0.20 + sourceScore * 0.15 + topicScore * 0.10;
}

function recencyScore(person: PersonRow): number {
  const recentScore = clamp(person.recentKeepCount * 16);
  const weeklyScore = logScore(person.weeklyViewCount, 30);
  let freshnessScore = 0;
  if (person.latestActivityAt) {
    const ageDays = (Date.now() - person.latestActivityAt.getTime()) / (24 * 60 * 60 * 1000);
    freshnessScore = clamp(100 - ageDays / 3);
  }
  return recentScore * 0.45 + freshnessScore * 0.35 + weeklyScore * 0.20;
}

function scorePerson(person: PersonRow): ScoredPerson {
  const githubStars = Math.max(person.githubStars || 0, person.rawGithubStars || 0);
  const breakdown = {
    aiOriginal: points(aiOriginalScore(person), 35),
    industryEcosystem: points(industryScore(person, githubStars), 25),
    authority: points(authorityScore(person), 20),
    learningValue: points(learningScore(person), 10),
    recency: points(recencyScore(person), 10),
    subtotal: 0,
    statusMultiplier: statusMultiplier(person.status),
    finalScore: 0,
  };
  breakdown.subtotal = breakdown.aiOriginal + breakdown.industryEcosystem + breakdown.authority + breakdown.learningValue + breakdown.recency;
  breakdown.finalScore = Math.round(breakdown.subtotal * breakdown.statusMultiplier * 100) / 100;

  return {
    id: person.id,
    name: person.name,
    status: person.status,
    roleCategory: person.roleCategory,
    currentTitle: person.currentTitle,
    aiContributionScore: person.aiContributionScore,
    githubStars,
    citationCount: person.citationCount,
    hIndex: person.hIndex,
    counts: {
      cards: person.cardCount,
      raw: person.rawCount,
      keep: person.keepCount,
      sources: person.sourceDiversity,
      courses: person.courseCount,
      recentKeep: person.recentKeepCount,
    },
    breakdown,
  };
}

async function loadPeople(): Promise<PersonRow[]> {
  const person = PERSON ?? null;
  const personLike = PERSON ? `%${PERSON}%` : null;
  const limit = LIMIT ?? 100000;

  return await sql`
    WITH latest_qa AS (
      SELECT DISTINCT ON ("urlHash") "personId", "urlHash", verdict
      FROM "QAAuditLog"
      ORDER BY "urlHash", "createdAt" DESC
    ),
    keep_items AS (
      SELECT
        r."personId",
        COUNT(*)::int AS keep_count,
        COUNT(DISTINCT r."sourceType")::int AS source_diversity,
        COUNT(*) FILTER (
          WHERE COALESCE(r."publishedAt", r."fetchedAt") >= NOW() - INTERVAL '180 days'
        )::int AS recent_keep_count,
        MAX(COALESCE(r."publishedAt", r."fetchedAt")) AS latest_activity_at
      FROM "RawPoolItem" r
      JOIN latest_qa q ON q."urlHash" = r."urlHash" AND q."personId" = r."personId"
      WHERE q.verdict = ${'keep'}
      GROUP BY r."personId"
    ),
    github AS (
      SELECT
        "personId",
        COALESCE(SUM(
          CASE
            WHEN "sourceType" = 'github'
             AND metadata ? 'stars'
             AND (metadata->>'stars') ~ '^[0-9]+$'
            THEN (metadata->>'stars')::int
            ELSE 0
          END
        ), 0)::int AS raw_github_stars
      FROM "RawPoolItem"
      GROUP BY "personId"
    ),
    cards AS (
      SELECT "personId", COUNT(*)::int AS card_count
      FROM "Card"
      WHERE "isActive" = true
      GROUP BY "personId"
    ),
    raw AS (
      SELECT "personId", COUNT(*)::int AS raw_count
      FROM "RawPoolItem"
      GROUP BY "personId"
    ),
    courses AS (
      SELECT "personId", COUNT(*)::int AS course_count
      FROM "Course"
      GROUP BY "personId"
    )
    SELECT
      p.id,
      p.name,
      p.aliases,
      p.status,
      p."aiContributionScore",
      p."citationCount",
      p."hIndex",
      p."githubStars",
      p."viewCount",
      p."weeklyViewCount",
      p."roleCategory",
      p."currentTitle",
      p.occupation,
      p.organization,
      p.topics,
      p.products,
      COALESCE(cards.card_count, 0)::int AS "cardCount",
      COALESCE(raw.raw_count, 0)::int AS "rawCount",
      COALESCE(keep_items.keep_count, 0)::int AS "keepCount",
      COALESCE(keep_items.source_diversity, 0)::int AS "sourceDiversity",
      COALESCE(keep_items.recent_keep_count, 0)::int AS "recentKeepCount",
      COALESCE(courses.course_count, 0)::int AS "courseCount",
      keep_items.latest_activity_at AS "latestActivityAt",
      COALESCE(github.raw_github_stars, 0)::int AS "rawGithubStars"
    FROM "People" p
    LEFT JOIN cards ON cards."personId" = p.id
    LEFT JOIN raw ON raw."personId" = p.id
    LEFT JOIN keep_items ON keep_items."personId" = p.id
    LEFT JOIN courses ON courses."personId" = p.id
    LEFT JOIN github ON github."personId" = p.id
    WHERE (${person}::text IS NULL OR p.id = ${person} OR p.name ILIKE ${personLike})
    ORDER BY p."aiContributionScore" DESC, p.name ASC
    LIMIT ${limit}
  ` as PersonRow[];
}

async function main() {
  const people = await loadPeople();
  const scored = people.map(scorePerson).sort((a, b) => b.breakdown.finalScore - a.breakdown.finalScore || a.name.localeCompare(b.name));

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: EXECUTE ? 'execute' : 'dry-run',
    formula: {
      aiOriginalContribution: 35,
      industryEcosystem: 25,
      authority: 20,
      learningValue: 10,
      recency: 10,
      statusMultiplier: { ready: 1, active: 1, building: 0.55, candidate: 0.35, pending: 0.35, error: 0 },
    },
    people: scored,
  }, null, 2));

  console.log(`Influence v2 mode: ${EXECUTE ? 'execute' : 'dry-run'} | people=${scored.length}`);
  console.log(`Wrote score report: ${OUT}`);
  for (const [idx, person] of scored.slice(0, 25).entries()) {
    const b = person.breakdown;
    console.log(
      `${String(idx + 1).padStart(2)}. ${person.name.padEnd(22)} ${b.finalScore.toFixed(1).padStart(5)} ` +
      `(AI ${b.aiOriginal.toFixed(1)}, Eco ${b.industryEcosystem.toFixed(1)}, Auth ${b.authority.toFixed(1)}, Learn ${b.learningValue.toFixed(1)}, Recent ${b.recency.toFixed(1)}, ${person.status})`
    );
  }

  if (EXECUTE) {
    for (const person of scored) {
      await sql`
        UPDATE "People"
        SET
          "influenceScore" = ${person.breakdown.finalScore},
          "githubStars" = ${person.githubStars}
        WHERE id = ${person.id}
      `;
    }
    console.log(`Updated ${scored.length} People rows.`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
