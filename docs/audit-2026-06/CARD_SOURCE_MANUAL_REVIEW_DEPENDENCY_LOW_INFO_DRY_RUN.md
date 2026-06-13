# Card Source Manual Apply

Generated at: 2026-06-10T21:37:06.336Z
Mode: dry-run
Input: docs/audit-2026-06/data/card_source_manual_decisions_review_dependency_low_info.json
Archive: docs/audit-2026-06/data/card_source_manual_review_dependency_low_info_dry_run_archive.json
Stage: manual_prune_tail_review_dependency_low_info

## Counts

| Metric | Value |
| --- | ---: |
| decisions | 2 |
| applicable | 2 |
| applied | 0 |
| skipped | 0 |

## Actions

| Action | Count |
| --- | ---: |
| archive_card | 1 |
| delete_raw_pool_item | 1 |

## Rows

| Person | Action | Target | Applicable | Applied | Reason |
| --- | --- | --- | --- | --- | --- |
| Greg Brockman | archive_card | OpenAI 为 Codex 用户临时提升使用限额 | yes | no | 卡片来源是过期的 Codex 使用限额运营通知；refetch 后仍为 no_good_source，候选来源无法支持该具体通知，且该卡对人物长期画像价值有限。 |
| Greg Brockman | delete_raw_pool_item | As a thank you to all our Codex users, we’re increasing Codex usage limits until Jan 1st: | yes | no | 关联卡片已归档；原 RawPoolItem 是过期的 Codex 用户限额通知，refetch 后无更好权威替代来源，保留会继续污染人物卡片聚合。 |
