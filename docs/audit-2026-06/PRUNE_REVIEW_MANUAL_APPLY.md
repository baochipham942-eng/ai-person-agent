# Manual RawPool Apply

Generated at: 2026-06-10T09:25:07.628Z
Mode: execute
Input: docs/audit-2026-06/data/prune_review_manual_decisions_2026_06_10.json
Archive: docs/audit-2026-06/data/prune_review_manual_archive.json
Stage: manual_prune_tail

## Counts

| Metric | Value |
| --- | ---: |
| decisions | 2 |
| existing targets | 2 |
| missing targets | 0 |
| audit rows inserted | 2 |
| RawPoolItem rows deleted | 2 |

## Actions

| Action | Count |
| --- | ---: |
| delete_raw_pool_item | 2 |

## Rows

| Person | Target | Action | Exists | Reason |
| --- | --- | --- | --- | --- |
| Lukasz Kaiser | Papers with Code - Łukasz Kaiser | delete_raw_pool_item | yes | Manual prune: Papers with Code search result page is not a source about the target person and has same-name/collision noise; it should not remain as a person evidence item. |
| Quoc Le | Kevin Clark - CS Stanford | delete_raw_pool_item | yes | Manual prune: the source is Kevin Clark's CV; Quoc Le is only mentioned as another person's advisor/collaborator, so the item is not about Quoc Le. |
