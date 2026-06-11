# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T15:24:22.844Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch6.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch6_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 21 |
| output selected sources | 15 |
| removed selected sources | 6 |
| rows changed | 5 |
| rows deferred to human review | 4 |

## Removed Hosts

| Host | Count |
| --- | --- |
| ai.meta.com | 1 |
| en.wikipedia.org | 1 |
| fellowsfund.substack.com | 1 |
| forbes.com | 1 |
| microsoft.com | 1 |
| time.com | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| Noam Shazeer | augment_source | en.wikipedia.org | Noam Shazeer | secondary_or_ugc_reference_source |
| Noam Shazeer | augment_source | time.com | Noam Shazeer: The 100 Most Influential People in AI 2023 - TIME | background_profile_does_not_prove_return_to_google_claim |
| Sam Altman | augment_source | forbes.com | Sam Altman | background_profile_does_not_prove_target_story |
| Yann LeCun | replace_source | ai.meta.com | Yann LeCun - AI at Meta | profile_page_does_not_prove_target_podcast |
| 埃里克·霍维茨 | replace_source | microsoft.com | Eric Horvitz, Chief Scientific Officer | profile_page_does_not_prove_target_pcast_role |
| 李莲 | augment_source | fellowsfund.substack.com | Fellows Fund Welcomes Lilian Weng, ex-VP of Research, Safety at OpenAI, as New Distinguished Fellow | substack_announcement_needs_primary_confirmation |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| Noam Shazeer | prune-tail:cmju1hiap0d9hrmtbffp301xg | Character.AI CEO Noam Shazeer returns to Google | 原始TechCrunch来源抓取内容无效，需要替换或补强。; 缺乏谷歌官方或Character.AI的正式公告作为直接证据。; manual_curated_all_selected_sources_removed |
| Yann LeCun | prune-tail:cmjtvmniz009drmtbhruiynit | #397 - Yann Le Cun - Chief AI Scientist chez Meta - L'Intelligence Artificielle Générale ne viendra pas de Chat GPT | manual_curated_all_selected_sources_removed |
| 埃里克·霍维茨 | prune-tail:cmjtxpbmt03yzrmtbqcpxjxvi | Eric Horvitz, MD, PhD \| PCAST \| The White House | manual_curated_all_selected_sources_removed |
| 李莲 | prune-tail:cmjtxlw59036jrmtbs3ntm77o | Lilian Weng - Distinguished Fellow | replacement_needs_primary_or_credible_source; manual_curated_all_selected_sources_removed |
