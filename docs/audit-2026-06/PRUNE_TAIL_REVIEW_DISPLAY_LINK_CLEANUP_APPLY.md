# Manual RawPool Apply

Generated at: 2026-06-10T22:09:40.892Z
Mode: execute
Input: docs/audit-2026-06/data/prune_tail_review_display_link_cleanup_manual_decisions.json
Archive: docs/audit-2026-06/data/prune_tail_review_display_link_cleanup_apply_archive.json
Stage: manual_prune_tail_review_display_link_cleanup

## Counts

| Metric | Value |
| --- | ---: |
| decisions | 1 |
| existing targets | 1 |
| missing targets | 0 |
| audit rows inserted | 1 |
| RawPoolItem rows deleted | 1 |

## Actions

| Action | Count |
| --- | ---: |
| delete_raw_pool_item | 1 |

## Rows

| Person | Target | Action | Exists | Reason |
| --- | --- | --- | --- | --- |
| 亚历克·拉德福德 | Alec Radford: Latest Posts | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：虽为官方个人主页，但内容几乎为空，仅有标题占位符。 Refetch curation 判为 human_review，原因：原始来源内容为空，需补充权威来源。候选中，lerandom.art文章和artificial-intelligence.blog页面提供了人物背... |
