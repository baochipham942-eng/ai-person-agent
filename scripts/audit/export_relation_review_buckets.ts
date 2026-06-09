/**
 * Bucket needs_review relations into reviewable work packages.
 *
 * Read-only. Writes docs/audit-2026-06/data/relation_review_buckets.json by default.
 */
import fs from 'fs';
import path from 'path';

type NeedsReviewRelation = {
  id: string;
  person: string;
  related: string;
  type: string;
  description: string | null;
  source: string;
  confidence: number;
  same_org_count: number;
  overlap_count: number;
  cofounder_org_count: number;
  advisor_role_count: number;
  bucket: string;
  reasons: string[];
};

type RelationReview = {
  generatedAt: string;
  summary: Record<string, unknown>;
  needsReview: NeedsReviewRelation[];
};

const args = process.argv.slice(2);
const INPUT = args.find(arg => arg.startsWith('--input='))?.slice('--input='.length)
  || 'docs/audit-2026-06/data/relation_review.json';
const OUT = args.find(arg => arg.startsWith('--out='))?.slice('--out='.length)
  || 'docs/audit-2026-06/data/relation_review_buckets.json';

function bucketRelation(relation: NeedsReviewRelation): string {
  if (relation.type === 'advisor') return 'high_sensitivity_advisor';
  if (relation.type === 'cofounder') {
    if (relation.cofounder_org_count > 0) return 'cofounder_has_structured_role_evidence';
    if (relation.same_org_count > 0) return 'cofounder_same_org_but_role_missing';
    return 'cofounder_no_structured_evidence';
  }
  if (relation.type === 'collaborator') {
    if (/论文|paper|coauthor|合著|transformer|attention|bert|imagenet|nerf/i.test(relation.description || '')) {
      return 'collaborator_publication_claim';
    }
    return 'collaborator_project_claim';
  }
  if (relation.type === 'colleague') {
    if (relation.overlap_count > 0) return 'colleague_has_role_overlap';
    if (relation.same_org_count > 0) return 'colleague_same_org_dates_missing';
    return 'colleague_no_shared_org';
  }
  return 'other_needs_review';
}

function priority(relation: NeedsReviewRelation): number {
  if (relation.type === 'advisor' || relation.type === 'cofounder') return 1;
  if (relation.type === 'collaborator') return 2;
  if (relation.type === 'colleague') return 3;
  return 4;
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = getKey(item);
    acc[key] ||= [];
    acc[key].push(item);
    return acc;
  }, {});
}

function summarizeGroups<T>(groups: Record<string, T[]>): Record<string, number> {
  return Object.fromEntries(Object.entries(groups).map(([key, items]) => [key, items.length]));
}

const review = JSON.parse(fs.readFileSync(path.join(process.cwd(), INPUT), 'utf-8')) as RelationReview;
const needsReview = [...(review.needsReview || [])].sort((a, b) => priority(a) - priority(b) || b.confidence - a.confidence || a.person.localeCompare(b.person));
const buckets = groupBy(needsReview, bucketRelation);
const byType = groupBy(needsReview, relation => relation.type);
const bySource = groupBy(needsReview, relation => relation.source);

const payload = {
  generatedAt: new Date().toISOString(),
  sourceReviewGeneratedAt: review.generatedAt,
  originalSummary: review.summary,
  summary: {
    totalNeedsReview: needsReview.length,
    byBucket: summarizeGroups(buckets),
    byType: summarizeGroups(byType),
    bySource: summarizeGroups(bySource),
  },
  guidance: {
    high_sensitivity_advisor: 'Do not auto-confirm without advisor/source evidence. Highest product trust risk.',
    cofounder_same_org_but_role_missing: 'Likely important; confirm only with explicit founder/cofounder evidence.',
    cofounder_no_structured_evidence: 'Do not keep as cofounder without external evidence; strong deletion candidate if source remains unsupported.',
    collaborator_publication_claim: 'Verify against publication/project source before confirming.',
    colleague_same_org_dates_missing: 'Usually lower product value; confirm only if overlap dates or source-backed team evidence exists.',
    colleague_no_shared_org: 'Weakest relation bucket; deletion candidates after sample review.',
  },
  buckets,
};

fs.mkdirSync(path.dirname(path.join(process.cwd(), OUT)), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), OUT), `${JSON.stringify(payload, null, 2)}\n`);

console.log(`Relation review buckets written: ${OUT}`);
console.log(JSON.stringify(payload.summary, null, 2));
