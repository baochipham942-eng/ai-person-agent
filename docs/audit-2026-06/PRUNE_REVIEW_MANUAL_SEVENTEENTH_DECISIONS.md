# Prune Review Manual Decisions

Generated at: 2026-06-10T12:21:36.450Z
Input: docs/audit-2026-06/data/prune_candidates_after_sixteenth_manual_review_prune.json

## Counts

| Metric | Value |
| --- | ---: |
| source rows scanned | 211 |
| signal rows | 19 |
| missing RawPoolItem rows | 0 |
| dependency skipped | 19 |
| decisions | 0 |

## By Person

| Person | Count |
| --- | ---: |

## Decisions

| Person | Source | Target | Reason |
| --- | --- | --- | --- |

## Safety

- Only latest `reject` rows are included by default.
- Rows with active Card.sourceUrl dependencies are skipped.
- Rows whose URL appears in People display/source JSON are skipped.
- This file is a decision queue only; use the manual apply script for dry-run/execute.
