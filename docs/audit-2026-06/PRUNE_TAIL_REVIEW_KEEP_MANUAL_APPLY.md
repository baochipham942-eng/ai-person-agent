# Manual RawPool Apply

Generated at: 2026-06-10T21:43:44.170Z
Mode: execute
Input: docs/audit-2026-06/data/prune_tail_review_keep_manual_decisions.json
Archive: docs/audit-2026-06/data/prune_tail_review_keep_manual_apply_archive.json
Stage: manual_prune_tail_review_keep_direct

## Counts

| Metric | Value |
| --- | ---: |
| decisions | 4 |
| existing targets | 4 |
| missing targets | 0 |
| audit rows inserted | 4 |
| RawPoolItem rows deleted | 0 |

## Actions

| Action | Count |
| --- | ---: |
| keep_raw_pool_item | 4 |

## Rows

| Person | Target | Action | Exists | Reason |
| --- | --- | --- | --- | --- |
| Noam Shazeer | Character.AI CEO Noam Shazeer returns to Google | keep_raw_pool_item | yes | TechCrunch 正文抓取成功且直接命中 Noam Shazeer，标题和正文均支持其 Character.AI CEO 身份及返回 Google 事件；适合作为人物页直接来源。 |
| Chris Olah | In-context Learning and Induction Heads | keep_raw_pool_item | yes | Transformer Circuits 文章正文抓取成功并直接命中 Chris Olah，来源为研究项目原文，可支持其可解释性研究与代表作品关系。 |
| Chris Olah | Christopher Olah - ACL Anthology | keep_raw_pool_item | yes | ACL Anthology 作者页正文抓取成功并直接命中 Christopher Olah，能支持其论文作者身份与学术作品索引。 |
| 朱军 | 朱军\| 香港中文大学（深圳）理工学院 | keep_raw_pool_item | yes | 香港中文大学（深圳）理工学院官方教师页正文抓取成功并直接命中朱军，能支持其任职信息和人物身份。 |
