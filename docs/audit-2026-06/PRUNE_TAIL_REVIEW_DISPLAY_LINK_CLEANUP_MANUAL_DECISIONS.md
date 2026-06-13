# Prune Tail Review Manual Decisions

Generated at: 2026-06-10T22:09:15.186Z
Input: docs/audit-2026-06/data/prune_tail_review_unresolved_rows.json
Decision filter: explicit ids (1)

## Counts

| Metric | Value |
| --- | ---: |
| input rows | 1 |
| dependency skipped | 0 |
| decision rows | 1 |

## Source Type

| Source | Count |
| --- | ---: |
| exa | 1 |

## People

| Person | Count |
| --- | ---: |
| 亚历克·拉德福德 | 1 |

## Decisions

| Person | Source | Refetch | Target | Reason |
| --- | --- | --- | --- | --- |
| 亚历克·拉德福德 | exa | human_review | Alec Radford: Latest Posts | 虽为官方个人主页，但内容几乎为空，仅有标题占位符。 |

## Safety

- This file only converts already-exported review rows into an explicit manual decision queue.
- Rows with active Card.sourceUrl or People display/source JSON dependencies are skipped.
- Apply with `apply_hard_tail_manual_decisions.mjs`; default mode there is dry-run.
