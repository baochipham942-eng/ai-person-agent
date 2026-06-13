# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T13:28:16.882Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 28 |
| output selected sources | 19 |
| removed selected sources | 9 |
| rows changed | 6 |
| rows deferred to human review | 3 |

## Removed Hosts

| Host | Count |
| --- | --- |
| karpathy.ai | 2 |
| podcasts.musixmatch.com | 2 |
| artificial-intelligence.blog | 1 |
| en.wikipedia.org | 1 |
| lerandom.art | 1 |
| singjupost.com | 1 |
| x.com | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| Andrej Karpathy | replace_source | karpathy.ai | Andrej Karpathy | raw_content_contains_obvious_page_pollution |
| Andrej Karpathy | replace_source | karpathy.ai | Andrej Karpathy | raw_content_contains_obvious_page_pollution |
| Shane Legg | augment_source | podcasts.musixmatch.com | The Arrival of AGI with Shane Legg (co-founder of DeepMind) Transcript - Google DeepMind: The Podcast | transcript_aggregator_not_primary_source |
| 亚历克·拉德福德 | augment_source | lerandom.art | THE PEOPLE ARE IN THE COMPUTER—PART I | secondary_editorial_with_overclaimed_wording |
| 亚历克·拉德福德 | augment_source | artificial-intelligence.blog | Alec Radford - People in AI - AI Blog | low_authority_aggregated_profile |
| 亚历克·拉德福德 | augment_source | x.com | Alec Radford (@AlecRad) / X | social_or_login_limited_profile |
| 桑达尔·皮查伊 | augment_source | podcasts.musixmatch.com | A special interview with Google CEO Sundar Pichai Transcript | transcript_aggregator_not_primary_source |
| 桑达尔·皮查伊 | augment_source | singjupost.com | Transcript of Sundar Pichai's Interview on The All-In Podcast | transcript_aggregator_not_primary_source |
| Dylan Field | augment_source | en.wikipedia.org | Dylan Field - Wikipedia | secondary_or_ugc_reference_source |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| Andrej Karpathy | prune-tail:cmjtlbh2z001vefnhtx74voaz | About | manual_curated_all_selected_sources_removed |
| 亚历克·拉德福德 | prune-tail:cmjtxlm6t0351rmtbkflqrpnl | Alec Radford: Latest Posts | manual_curated_all_selected_sources_removed |
| Dylan Field | prune-tail:cmjtvrysh0143rmtbuqttlj0p | 20 Under 20 Thiel Fellow: Dylan Field | replacement_needs_primary_or_credible_source; manual_curated_all_selected_sources_removed |
