# Residual RawPool Delete Closeout

Generated: 2026-06-11

## What Changed

- Rechecked current DB against prior refetch/remediation/delete decisions.
- Executed 4 small RawPoolItem delete passes, total deleted RawPoolItems: 60.
- Added manual reject audit rows for the 44 manually adjudicated rows.
- Did not rerun broad source crawling. Refetch evidence was verified from existing completed refetch apply logs.

## Delete Passes

| Pass | Input | Deleted | Audit stage |
| --- | --- | ---: | --- |
| safe residual | `exa_source_quality_review_dir/fact_claim_remediation_exa_source_quality_mimo_summary.json` | 16 | existing remediation evidence |
| residual wrong/bad capture | `residual_rawpool_delete_decisions_2026_06_11.json` | 12 | `manual_residual_rawpool_delete` |
| residual over-attributed/bad source | `residual_overattributed_rawpool_delete_decisions_2026_06_11.json` | 31 | `manual_residual_overattributed_rawpool_delete` |
| Quoc Le bad capture | `residual_bad_capture_quoc_le_delete_decision_2026_06_11.json` | 1 | `manual_residual_bad_capture_delete` |

## Refetch State

- Main refetch apply had already inserted 417 source-backed RawPoolItems and 417 keep audits.
- Follow-up/full/mixed/tertiary refetch applies had already inserted or confirmed the remaining selected sources.
- Current dry-run on `refetch_source_followup_tavily_mimo.jsonl` showed `rawInserted=0`, `keepAuditsInserted=0`, with 39 eligible source rows already present.

## Final Residual Boundary

Final scan still finds 8 historical delete-decision hits in live RawPoolItem:

- Kept because current content is person-relevant and latest audit is keep: Mark Zuckerberg TechCrunch data center news, Li Fei-Fei World Labs news, Geoffrey Hinton Chair news, Alexandr Wang Meta superintelligence news.
- Not deleted because active display dependencies remain: Sam Altman OpenAI research page, OpenAI homepage, Jensen Huang TechCrunch source, Oriol Vinyals flash-news source.

These 8 are not treated as this pass's deletion backlog.

## Verification

```bash
node scripts/fix/apply_safe_rawpool_remediation.mjs --in=docs/audit-2026-06/data/exa_source_quality_review_dir/fact_claim_remediation_exa_source_quality_mimo_summary.json --out=docs/audit-2026-06/data/exa_source_quality_review_dir/safe_rawpool_remediation_current_final_verify_log.json --archive=docs/audit-2026-06/data/exa_source_quality_review_dir/safe_rawpool_remediation_current_final_verify_archive.json --verdicts=wrong_person,unsupported
node scripts/audit/export_prune_tail_review_unresolved.mjs --out=docs/audit-2026-06/data/prune_tail_review_unresolved_rows.json --report-out=docs/audit-2026-06/PRUNE_TAIL_REVIEW_UNRESOLVED.md
npm run audit:content-guard
npm run audit:post-ingest-guard
```

Observed:

- Safe queue post-verify: `existingTargets=0`, `missingTargets=255`.
- Prune-tail unresolved: `reviewUnresolvedRows=0`, `dependencyRows=0`.
- `audit:content-guard`: passed.
- `audit:post-ingest-guard`: passed.
