# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T14:22:12.623Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch3.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch3_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 15 |
| output selected sources | 8 |
| removed selected sources | 7 |
| rows changed | 6 |
| rows deferred to human review | 5 |

## Removed Hosts

| Host | Count |
| --- | --- |
| developer.nvidia.com | 1 |
| en.wikipedia.org | 1 |
| github.com | 1 |
| hanxiao.io | 1 |
| m.36kr.com | 1 |
| news.cn | 1 |
| openreview.net | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| Arthur Mensch | replace_source | github.com | Arthur Mensch arthurmensch - GitHub | profile_page_does_not_prove_target_project |
| Han Xiao | replace_source | hanxiao.io | Han Xiao, Ph.D. (肖涵) · Han Xiao Blog - Search AI | profile_page_does_not_prove_target_project |
| 布莱恩·卡坦扎罗 | augment_source | developer.nvidia.com | Author: Bryan Catanzaro \| NVIDIA Technical Blog | profile_page_does_not_prove_target_project |
| 布莱恩·卡坦扎罗 | augment_source | openreview.net | Bryan Catanzaro \| OpenReview | profile_page_does_not_prove_target_project |
| 布莱恩·卡坦扎罗 | augment_source | m.36kr.com | 英伟达副总裁：除了围棋，人工智能下一个让人惊讶的领域是什么-36氪 | background_interview_does_not_prove_target_project |
| 科拉伊·卡武克丘奥卢 | replace_source | news.cn | 谷歌推出新版“双子座”模型-新华网 | news_article_does_not_prove_target_project |
| Daniela Amodei | replace_source | en.wikipedia.org | Daniela Amodei - Wikipedia | secondary_or_ugc_reference_source |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| Arthur Mensch | prune-tail:cmjtvqa6m00uwrmtbx5memiql | modl | manual_curated_all_selected_sources_removed |
| Han Xiao | prune-tail:cmjw75n6v0061ykszo2b048lv | hanxiao/demo-poems-ir | manual_curated_all_selected_sources_removed |
| 布莱恩·卡坦扎罗 | prune-tail:cmjtxqemv048grmtb4tpc4u52 | catanzaro.pycuda | manual_curated_all_selected_sources_removed |
| 布莱恩·卡坦扎罗 | prune-tail:cmjtxqdrh0486rmtbhac7auvt | tuple-cat | manual_curated_all_selected_sources_removed |
| 科拉伊·卡武克丘奥卢 | prune-tail:cmjtxnubc03n2rmtbfg5itkf6 | lmexplorer | manual_curated_all_selected_sources_removed |
