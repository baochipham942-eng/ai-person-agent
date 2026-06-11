# Manual RawPool Apply

Generated at: 2026-06-10T21:48:51.224Z
Mode: dry-run
Input: docs/audit-2026-06/data/prune_tail_review_dependency_keep_manual_decisions.json
Archive: docs/audit-2026-06/data/prune_tail_review_dependency_keep_manual_apply_dry_run_archive.json
Stage: manual_prune_tail_review_dependency_keep_direct

## Counts

| Metric | Value |
| --- | ---: |
| decisions | 3 |
| existing targets | 3 |
| missing targets | 0 |
| audit rows to insert | 3 |
| RawPoolItem rows to delete | 0 |

## Actions

| Action | Count |
| --- | ---: |
| keep_raw_pool_item | 3 |

## Rows

| Person | Target | Action | Exists | Reason |
| --- | --- | --- | --- | --- |
| Lukasz Kaiser | Lukasz Kaiser lukaszkaiser | keep_raw_pool_item | yes | GitHub profile 正文抓取成功并直接命中 Lukasz Kaiser 及关键身份信号；该 RawPoolItem 当前用于人物展示来源，可保留为官方个人技术主页来源。 |
| 埃里克·霍维茨 | Eric Horvitz, MD, PhD \| PCAST \| The White House | keep_raw_pool_item | yes | White House PCAST archived profile 正文抓取成功，直接命中 Eric Horvitz、PCAST 与 Microsoft 等身份信号；来源为官方政府归档页，可支撑其 AI 治理与社会影响相关卡片。 |
| Yann LeCun | Meta chief AI scientist Yann LeCun plans to exit and launch own start-up | keep_raw_pool_item | yes | Financial Times 页面正文抓取成功，直接命中 Yann LeCun、Meta chief AI scientist 和 launch own start-up 等关键信息；作为可靠媒体来源可支撑相关人物卡片。 |
