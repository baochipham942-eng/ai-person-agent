# Manual RawPool Apply

Generated at: 2026-06-10T22:06:13.846Z
Mode: dry-run
Input: docs/audit-2026-06/data/prune_tail_review_residual_low_value_manual_decisions.json
Archive: docs/audit-2026-06/data/prune_tail_review_residual_low_value_apply_post_verify_archive.json
Stage: manual_prune_tail_review_residual_low_value

## Counts

| Metric | Value |
| --- | ---: |
| decisions | 5 |
| existing targets | 0 |
| missing targets | 5 |
| audit rows to insert | 0 |
| RawPoolItem rows to delete | 0 |

## Actions

| Action | Count |
| --- | ---: |
| delete_raw_pool_item | 5 |

## Rows

| Person | Target | Action | Exists | Reason |
| --- | --- | --- | --- | --- |
| Andrej Karpathy | About | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方“关于”页面，但内容过于简略，仅作为个人主页的跳转链接。 Refetch curation 判为 human_review，原因：原来源karpathy.github.io/about过于简略，仅作为跳转链接。候选中的karpathy.ai是Andrej Karp... |
| Chris Olah | Our interpretability team is planning to mentor more fellows this cycle! | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：属于团队招募和导师计划的公告，非技术观点分享。 Refetch curation 判为 human_review，原因：所有候选来源均未直接支持“Chris Olah的团队计划在本周期指导更多研究员”这一具体声明。需要更直接的官方公告、博客文章或可靠媒体报道来证明该计... |
| Demis Hassabis | announcing Gemini 3 speed/performance advancements) | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方发布的 Gemini 3 性能更新简讯，信息密度较低。 Refetch curation 判为 human_review，原因：原始来源为推文，信息密度低。Wired文章是权威媒体对Demis Hassabis宣布Gemini模型的直接报道，明确关联人物与产品发布... |
| Noam Shazeer | As a friendly competitor in the AI space, we share a core mission of building AI technology that benefits every person. | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：虽然来自官方账号，但内容属于泛泛而谈的愿景陈述，信息密度较低。 Refetch curation 判为 human_review，原因：原来源（推文）信息密度低，仅为愿景陈述。候选中的TIME人物简介和深度访谈播客能提供更权威、更具体的身份与贡献信息，可作为补强来源。... |
| 杰夫·迪恩 | It has been a productive 2025!  It's wonderful working with such amazing colleagues at @GoogleDeepMind and all across @Google to conduct new research and to put research into practice across many of Google's products! | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方账号发布，提及个人工作感受，但内容较泛，需人工判断是否值得入库。 Refetch curation 判为 human_review，原因：原始来源是杰夫·迪恩的官方推文，内容真实但较泛。候选中的谷歌研究官方页面能权威证明其当前职位和工作重点，可作为补强来源。维基百... |
