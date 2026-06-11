# Manual RawPool Apply

Generated at: 2026-06-10T21:52:21.771Z
Mode: execute
Input: docs/audit-2026-06/data/prune_tail_review_thin_mismatch_manual_decisions.json
Archive: docs/audit-2026-06/data/prune_tail_review_thin_mismatch_manual_apply_archive.json
Stage: manual_prune_tail_review_thin_mismatch

## Counts

| Metric | Value |
| --- | ---: |
| decisions | 7 |
| existing targets | 7 |
| missing targets | 0 |
| audit rows inserted | 7 |
| RawPoolItem rows deleted | 7 |

## Actions

| Action | Count |
| --- | ---: |
| delete_raw_pool_item | 7 |

## Rows

| Person | Target | Action | Exists | Reason |
| --- | --- | --- | --- | --- |
| 亚历克·拉德福德 | Alec Radford - OpenAI;Indico Data Solutions \| 人才画像 | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：学术画像页面，但抓取内容包含大量系统菜单，实质性介绍较少。 Refetch curation 判为 human_review，原因：候选来源均未能直接、权威地证明亚历克·拉德福德与OpenAI或Indico Data Solutions的具体职位或贡献关系。Wikip... |
| Yann LeCun | #397 - Yann Le Cun - Chief AI Scientist chez Meta - L'Intelligence Artificielle Générale ne viendra pas de Chat GPT | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：标题提及Yann LeCun和AI观点，但内容仅显示播客名称，缺乏实质信息，需人工判断。 Refetch curation 判为 human_review，原因：原始来源为播客页面，缺乏实质内容证明。Meta官方页面直接、权威地证实了Yann LeCun的职位，符合证... |
| 李飞飞 | The 100 Most Influential People in AI 2025 | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：属于TIME 100 AI榜单页面，但正文片段主要显示其他人物，需确认其具体入选内容。 Refetch curation 判为 human_review，原因：候选来源中，没有直接证明李飞飞入选TIME100 AI 2025的权威页面。原始TIME100 AI页面预览... |
| Shane Legg | //www.youtube.com/watch?v=8IUIGVVLbCg | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方发布的视频链接，虽大概率高度相关但缺乏文本描述，需人工确认视频内容。 Refetch curation 判为 human_review，原因：原始来源（X推文链接YouTube视频）缺乏文本证据。候选中的TIME报道和TED官方页面提供了权威、可访问的文本证据，直... |
| Elon Musk | I Hope Artificial Intelligence Is Nice to Us | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：标题提及人工智能，但内容主要讨论物理、生物学和自组织理论，未明确指向Elon Musk，需人工判断。 Refetch curation 判为 human_review，原因：所有候选来源都证实了Elon Musk对人工智能的公开评论和担忧，但没有任何一个来源提及或关联... |
| Arthur Mensch | Complex matters slowly coming together — we actually got surprised ourselves | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：虽然是官方言论，但内容过于简略且含糊，信息密度较低。 Refetch curation 判为 human_review，原因：原始来源为推文，信息密度低。候选中有权威访谈和播客，可补强Arthur Mensch作为Mistral AI CEO的言论背景，但未找到直接包... |
| 李飞飞 | Beginning of an exciting journey! 🤖🤩 | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：疑似新项目启动的官方宣告，虽内容简练但具有时效价值，需人工确认背景。 Refetch curation 判为 human_review，原因：候选来源均为第三方聚合页面或搬运内容，缺乏直接、权威的原始出处。无法确认‘Beginning of an exciting j... |
