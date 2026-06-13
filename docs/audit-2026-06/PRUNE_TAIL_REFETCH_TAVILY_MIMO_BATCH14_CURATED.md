# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T17:51:27.556Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch14.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch14_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 26 |
| output selected sources | 17 |
| removed selected sources | 9 |
| rows changed | 7 |
| rows deferred to human review | 4 |

## Removed Hosts

| Host | Count |
| --- | --- |
| greylock.com | 2 |
| zh.wikipedia.org | 2 |
| anthropic.com | 1 |
| forbes.com | 1 |
| singjupost.com | 1 |
| sources.news | 1 |
| therundown.ai | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| 阿希什·瓦斯瓦尼 | augment_source | zh.wikipedia.org | 阿西什·瓦斯瓦尼 - 维基百科，自由的百科全书 | secondary_or_ugc_reference_source |
| 阿希什·瓦斯瓦尼 | augment_source | zh.wikipedia.org | 阿西什·瓦斯瓦尼 - 维基百科，自由的百科全书 | secondary_or_ugc_reference_source |
| Chris Olah | replace_source | anthropic.com | Anthropic co-founder Chris Olah's remarks on Pope Leo XIV's encyclical "Magnifica humanitas" | background_page_does_not_prove_target_gpt4_claim |
| Demis Hassabis | augment_source | therundown.ai | Exclusive interview with Google DeepMind CEO Demis Hassabis | low_authority_newsletter_does_not_prove_target_gemini3_claim |
| Demis Hassabis | augment_source | sources.news | Demis Hassabis on Gemini 3, world models, and the AI bubble | secondary_aggregator_does_not_prove_target_gemini3_claim |
| Emad Mostaque | augment_source | forbes.com | Stable Diffusion's AI Benefactor Has A History Of Exaggeration | background_controversy_article_not_needed_for_leadership_claim |
| Mustafa Suleyman | replace_source | greylock.com | Welcome, Mustafa Suleyman - Greylock Partners | background_profile_does_not_prove_target_web3_claim |
| Mustafa Suleyman | replace_source | greylock.com | Mustafa Suleyman - Greylock Partners | profile_page_does_not_prove_target_web3_claim |
| 桑达尔·皮查伊 | augment_source | singjupost.com | Transcript of Sundar Pichai’s Interview on The All-In Podcast – The Singju Post | transcript_aggregator_not_primary_source |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| 阿希什·瓦斯瓦尼 | prune-tail:cmju0zueq09sbrmtbcvydtdem | Thank you! This work was led by @ishaankshah , @ampolloreno , Karl and Philip! | manual_curated_all_selected_sources_removed |
| 阿希什·瓦斯瓦尼 | prune-tail:cmjtxq4gk0446rmtbviflnepn | Tremendous effort by the @essential_ai team! | 候选来源中缺乏阿希什·瓦斯瓦尼本人的官方主页、机构资料页或可靠媒体采访，无法直接证明推文内容。; 维基百科作为辅助来源，权威性有限，需结合其他来源使用。; manual_curated_all_selected_sources_removed |
| Demis Hassabis | prune-tail:cmju0o0ds07yqrmtbm1clbgh3 | A new era of intelligence with Gemini 3 | manual_curated_all_selected_sources_removed |
| Mustafa Suleyman | prune-tail:cmjtvnprh00eprmtbgebxvoda | Privacy and Scalability for Web3 | manual_curated_all_selected_sources_removed |
