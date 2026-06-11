# Post-Ingest Content Guard

Generated at: 2026-06-11T16:27:00.642Z
Status: passed

## Steps

| Step | Result | Command |
| --- | --- | --- |
| prune unresolved refresh | passed | `node scripts/audit/export_prune_tail_review_unresolved.mjs --out=docs/audit-2026-06/data/prune_tail_review_unresolved_rows.json --report-out=docs/audit-2026-06/PRUNE_TAIL_REVIEW_UNRESOLVED.md` |
| career normalization refresh | passed | `bun scripts/audit/audit_career_normalization.ts --out=docs/audit-2026-06/data/career_normalization_audit.json` |
| career buckets refresh | passed | `bun scripts/audit/export_career_review_buckets.ts --input=docs/audit-2026-06/data/career_normalization_audit.json --out=docs/audit-2026-06/data/career_review_buckets.json` |
| relation review refresh | passed | `bun scripts/audit/export_relation_review.ts --out=docs/audit-2026-06/data/relation_review.json` |
| relation buckets refresh | passed | `bun scripts/audit/export_relation_review_buckets.ts --input=docs/audit-2026-06/data/relation_review.json --out=docs/audit-2026-06/data/relation_review_buckets_after_org_review_second.json` |
| card reaggregation current verify | passed | `node scripts/fix/apply_card_reaggregation_plan.mjs --out=docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_current_verify_log.json --archive=docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_current_verify_archive.json --report-out=docs/audit-2026-06/CARD_REAGGREGATION_CURRENT_VERIFY.md` |
| conservative rewrite dry-run | passed | `bun scripts/fix/apply_product_review_decisions.ts --decisions=docs/audit-2026-06/data/exa_source_quality_review_dir/conservative_rewrite_decisions_draft.json` |
| content guard | passed | `node scripts/audit/check_content_review_guardrails.mjs` |

## Output Tails

### prune unresolved refresh

```text
{
  "out": "docs/audit-2026-06/data/prune_tail_review_unresolved_rows.json",
  "reportOut": "docs/audit-2026-06/PRUNE_TAIL_REVIEW_UNRESOLVED.md",
  "summary": {
    "curatedUnresolvedRows": 220,
    "existingRawPoolItems": 31,
    "latestKeepRowsExcluded": 29,
    "reviewUnresolvedRows": 0,
    "dependencyRows": 0
  },
  "bySourceType": {},
  "byCuratedDecision": {}
}
```

### career normalization refresh

```text
Career normalization audit written: docs/audit-2026-06/data/career_normalization_audit.json
{
  "organizations": 620,
  "roles": 1147,
  "people": 253,
  "duplicateOrgClusters": 0,
  "positionLikeOrganizations": 0,
  "duplicateRoleGroups": 0,
  "vagueRoles": 0,
  "peopleOrganizationDuplicates": 0,
  "currentTitleOrgMismatches": 0
}
```

### career buckets refresh

```text
Career review buckets written: docs/audit-2026-06/data/career_review_buckets.json
{
  "positionLike": {},
  "vagueRoles": {},
  "currentTitleMismatches": {}
}
```

### relation review refresh

```text
Exported relation review: /Users/linchen/Downloads/ai/ai-person-agent/docs/audit-2026-06/data/relation_review.json
total=207 trusted=78 confirmedByRoles=129 needsReview=0
```

### relation buckets refresh

```text
Relation review buckets written: docs/audit-2026-06/data/relation_review_buckets_after_org_review_second.json
{
  "totalNeedsReview": 0,
  "byBucket": {},
  "byType": {},
  "bySource": {}
}
```

### card reaggregation current verify

```text
{
  "out": "docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_current_verify_log.json",
  "archive": "docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_current_verify_archive.json",
  "reportOut": "docs/audit-2026-06/CARD_REAGGREGATION_CURRENT_VERIFY.md",
  "summary": {
    "generatedAt": "2026-06-11T16:26:56.116Z",
    "mode": "dry-run",
    "strategy": "archive-active",
    "generationId": "card-reaggregation:2026-06-11T16:26:51.312Z",
    "planIn": "docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_plan.json",
    "reviewIn": "docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_plan_mimo_review.json",
    "peopleConsidered": 5,
    "peopleEligible": 5,
    "existingCards": 24,
    "replacementCards": 24,
    "skippedPeople": 0
  }
}
```

### conservative rewrite dry-run

```text
Product review decisions mode: dry-run
already applied: Emad Mostaque
already applied: Greg Brockman
already applied: Guillaume Lample
already applied: Noam Shazeer
already applied: 桑达尔·皮查伊
{
  "mode": "dry-run",
  "decisions": 5,
  "matched": 5,
  "missing": 0,
  "alreadyApplied": 5,
  "updated": 0,
  "cardsUpdated": 0
}
```

### content guard

```text
Content review guardrails passed:
- prune ok: reviewUnresolvedRows=0, dependencyRows=0
- career ok: duplicate/vague/currentTitle buckets are empty
- relation ok: totalNeedsReview=0
- cards ok: existingCards=24, replacementCards=24
- conservative rewrite ok: draft=5, current=5, skipped=0
```

## Scope

- Queries DB and refreshes audit artifacts only.
- Does not fetch remote sources, call models, delete RawPoolItem, or mutate product tables.
- Intended to run after new imports, source writes, relation/career writes, or card generation.
