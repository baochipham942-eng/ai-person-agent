# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T19:26:26.322Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch20.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch20_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 19 |
| output selected sources | 14 |
| removed selected sources | 5 |
| rows changed | 4 |
| rows deferred to human review | 3 |

## Removed Hosts

| Host | Count |
| --- | --- |
| i.ifeng.com | 1 |
| idctoutiao.com | 1 |
| m.36kr.com | 1 |
| openreview.net | 1 |
| wiki.mbalib.com | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| 布莱恩·卡坦扎罗 | replace_source | m.36kr.com | 英伟达副总裁：除了围棋，人工智能下一个让人惊讶的领域是什么-36氪 | background_interview_does_not_prove_target_project |
| 布莱恩·卡坦扎罗 | replace_source | openreview.net | Bryan Catanzaro \| OpenReview | profile_page_does_not_prove_target_project |
| 李开复 | augment_source | i.ifeng.com | AI创业公司的2025：一半是海水，一半是火焰_凤凰网 | secondary_news_or_repost_not_primary_source |
| 桑达尔·皮查伊 | replace_source | idctoutiao.com | 谷歌 CEO 桑达尔·皮查伊重申 750 亿美元数据中心投资计划 - IDC头条-IDC头条 | low_authority_secondary_article_needs_primary_confirmation |
| 桑达尔·皮查伊 | replace_source | wiki.mbalib.com | 桑達爾·皮查伊 - MBA智库百科 | secondary_or_ugc_reference_source |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| 布莱恩·卡坦扎罗 | prune-tail:cmjtxpy8f0422rmtb239gk6om | Bryan Catanzaro | manual_curated_all_selected_sources_removed |
| 桑达尔·皮查伊 | prune-tail:cmju15rzl0b0yrmtb7llz7r25 | 750亿美元的豪赌：谷歌是否在为Gemini项目赌上自己的帝国？ | manual_curated_all_selected_sources_removed |
| 桑达尔·皮查伊 | prune-tail:cmjtxosmm03uhrmtbptw4j63m | Who Is Sundar Pichai? | manual_curated_all_selected_sources_removed |
