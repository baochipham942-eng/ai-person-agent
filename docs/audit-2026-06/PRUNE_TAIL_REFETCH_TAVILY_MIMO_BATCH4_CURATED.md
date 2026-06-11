# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T14:39:29.574Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch4.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch4_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 30 |
| output selected sources | 19 |
| removed selected sources | 11 |
| rows changed | 9 |
| rows deferred to human review | 6 |

## Removed Hosts

| Host | Count |
| --- | --- |
| en.wikipedia.org | 2 |
| singjupost.com | 2 |
| cdn.openai.com | 1 |
| epublications.marquette.edu | 1 |
| fr.linkedin.com | 1 |
| lerandom.art | 1 |
| linkedin.com | 1 |
| ml-summit.org | 1 |
| semanticscholar.org | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| Emad Mostaque | replace_source | singjupost.com | Transcript: Emad Mostaque - Why GDP & Capitalism Is Obsolete in an AI World - Impact Theory | transcript_aggregator_not_primary_source |
| Guillaume Lample | augment_source | fr.linkedin.com | Guillaume Lample - Mistral AI | social_or_login_limited_profile |
| Lukasz Kaiser | augment_source | ml-summit.org | Lukasz Kaiser \| 2021 Machine Learning Summit | profile_page_does_not_prove_github_handle |
| Lukasz Kaiser | augment_source | linkedin.com | Lukasz Kaiser - OpenAI | social_or_login_limited_profile |
| Mustafa Suleyman | replace_source | singjupost.com | What Is An AI Anyway? - Mustafa Suleyman (Transcript) – The Singju Post | transcript_aggregator_not_primary_source |
| 亚历克·拉德福德 | augment_source | en.wikipedia.org | Alec Radford - Wikipedia | secondary_or_ugc_reference_source |
| 亚历克·拉德福德 | augment_source | lerandom.art | THE PEOPLE ARE IN THE COMPUTER—PART I - Le Random | secondary_editorial_with_overclaimed_wording |
| 亚历克·拉德福德 | replace_source | en.wikipedia.org | Alec Radford - Wikipedia | secondary_or_ugc_reference_source |
| 亚历克·拉德福德 | augment_source | cdn.openai.com | Improving Language Understanding by Generative Pre-Training | paper_does_not_prove_guest_instructor_claim |
| 马克·扎克伯格 | replace_source | epublications.marquette.edu | "Zuckerberg Facebook post announcing a new Meta AI model, Muse" by Mark Zuckerberg | source_mentions_muse_not_target_mango |
| Chris Olah | replace_source | semanticscholar.org | In-context Learning and Induction Heads - Semantic Scholar | secondary_index_prefer_primary_publication |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| Emad Mostaque | prune-tail:cmjtvw8o101bvrmtb5zn1fxfu | Emad Mostaque on the End of Capitalism | manual_curated_all_selected_sources_removed |
| Lukasz Kaiser | prune-tail:cmjtxqpyn04bqrmtbkskudnf1 | Lukasz Kaiser lukaszkaiser | manual_curated_all_selected_sources_removed |
| 亚历克·拉德福德 | prune-tail:cmju0oe4a07zqrmtbhrvr6ixb | A Comprehensive Guide To Alec Radford: The Innovator ... | manual_curated_all_selected_sources_removed |
| 亚历克·拉德福德 | prune-tail:cmjtxls3s035vrmtb5jsssc72 | L11 Language Models -- guest instructor: Alec Radford ... | 原始YouTube视频链接无法访问，无法验证其内容是否包含Alec Radford作为客座讲师的明确证据。; manual_curated_all_selected_sources_removed |
| 马克·扎克伯格 | prune-tail:cmjtxs53b04mermtbfcpwk9qq | Meta's Mark Zuck announces new AI model Mango to ... | manual_curated_all_selected_sources_removed |
| Chris Olah | prune-tail:cmjtxmg9p03bwrmtbe515a3n7 | In-context Learning and Induction Heads | manual_curated_all_selected_sources_removed |
