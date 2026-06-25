# Manual RawPool Apply

Generated at: 2026-06-25T07:14:34.485Z
Mode: execute
Input: docs/audit-2026-06/data/youtube_source_workspace_problem_sources_manual_decisions.json
Archive: docs/audit-2026-06/data/youtube_source_workspace_problem_sources_manual_apply_archive.json
Stage: manual_youtube_source_workspace_problem_cleanup_2026_06_25

## Counts

| Metric | Value |
| --- | ---: |
| decisions | 4 |
| existing targets | 4 |
| missing targets | 0 |
| audit rows inserted | 4 |
| RawPoolItem rows deleted | 4 |

## Actions

| Action | Count |
| --- | ---: |
| delete_raw_pool_item | 4 |

## Rows

| Person | Target | Action | Exists | Reason |
| --- | --- | --- | --- | --- |
| Aakash Gupta | New video out on Youtube | delete_raw_pool_item | yes | Generic YouTube placeholder source with empty RawPool text, 32-second Hindi transcript, and no useful person/source workspace value. |
| Aakash Gupta | Gut Health & Endoscopy \| Aakash Gupta \| Stand-up Comedy | delete_raw_pool_item | yes | Stand-up comedy video about gut health/endoscopy; not an AI or person-source workspace video. |
| 雅各布·乌什科雷特 | 在基因决定一切的未来世界，男人靠偷换他人身份，来完成自己的航天梦，高分剧集 千钧一发 | delete_raw_pool_item | yes | Chinese movie explainer for Gattaca; unrelated to the person and unsuitable as a YouTube source workspace item. |
| 雅各布·乌什科雷特 | 为人师表却是恶魔心态，为满足私欲连续作案多起，手段卑劣毫无底线，2026最新剧集 失窃的女孩 | delete_raw_pool_item | yes | Chinese TV/movie explainer for a crime drama; unrelated to the person and unsuitable as a YouTube source workspace item. |
