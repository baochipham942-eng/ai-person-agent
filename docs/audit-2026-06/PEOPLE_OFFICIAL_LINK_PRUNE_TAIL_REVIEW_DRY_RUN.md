# People Official Link Apply

Generated at: 2026-06-10T22:08:36.859Z
Mode: dry-run
Input: docs/audit-2026-06/data/people_official_link_decisions_prune_tail_review.json
Archive: docs/audit-2026-06/data/people_official_link_prune_tail_review_dry_run_archive.json
Stage: manual_people_official_link_prune_tail_review

## Counts

| Metric | Value |
| --- | ---: |
| decisions | 1 |
| applicable | 1 |
| applied | 0 |
| skipped | 0 |

## Actions

| Action | Count |
| --- | ---: |
| remove_official_link | 1 |

## Rows

| Person | Action | URL | Applicable | Applied | Reason |
| --- | --- | --- | --- | --- | --- |
| 亚历克·拉德福德 | remove_official_link | https://newmu.github.io/ | yes | no | 该 website 官方链接抓取结果几乎为空，仅有 Latest Posts 占位；人物已保留 GitHub 与 X 官方链接，且 GitHub profile RawPoolItem 已通过 GitHub API 修复为 keep，移除此空主页引用后可删除对应弱 RawPoolItem。 |
