# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T18:40:25.652Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch17.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch17_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 24 |
| output selected sources | 15 |
| removed selected sources | 9 |
| rows changed | 6 |
| rows deferred to human review | 2 |

## Removed Hosts

| Host | Count |
| --- | --- |
| ai.meta.com | 1 |
| developer.volcengine.com | 1 |
| digg.com | 1 |
| en.wikipedia.org | 1 |
| karpathy.ai | 1 |
| lerandom.art | 1 |
| x.com | 1 |
| youtube.com | 1 |
| zh.wikipedia.org | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| Yann LeCun | augment_source | ai.meta.com | Yann LeCun - AI at Meta | profile_page_does_not_prove_target_co_teaching_claim |
| 阿希什·瓦斯瓦尼 | augment_source | zh.wikipedia.org | 阿西什·瓦斯瓦尼 - 维基百科，自由的百科全书 | secondary_or_ugc_reference_source |
| Andrej Karpathy | replace_source | karpathy.ai | Andrej Karpathy | raw_content_contains_obvious_page_pollution |
| Chris Olah | augment_source | digg.com | Chris Olah (@ch402) · Digg | low_authority_social_profile_aggregator |
| Chris Olah | augment_source | x.com | Chris Olah (@ch402) / Posts / X - Twitter | social_or_login_limited_profile |
| 亚历克·拉德福德 | augment_source | en.wikipedia.org | Alec Radford - Wikipedia | secondary_or_ugc_reference_source |
| 亚历克·拉德福德 | augment_source | lerandom.art | THE PEOPLE ARE IN THE COMPUTER—PART I - Le Random | secondary_editorial_with_overclaimed_wording |
| 亚历克·拉德福德 | augment_source | youtube.com | L11 Language Models -- guest instructor: Alec Radford (OpenAI) | video_page_does_not_prove_target_newmu_handle |
| 吴恩达 | augment_source | developer.volcengine.com | AI人物传：DeepLearning.AI创始人吴恩达Andrew Ng - 文章 - 开发者社区 - 火山引擎 | secondary_community_biography_not_needed_when_primary_profile_exists |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| Chris Olah | prune-tail:cmjtxm6sz03airmtbsk44flid | Christopher Olah colah | manual_curated_all_selected_sources_removed |
| 亚历克·拉德福德 | prune-tail:cmjtxlms20355rmtbyh7sed51 | Alec Radford Newmu | manual_curated_all_selected_sources_removed |
