# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T16:57:33.937Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch11.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch11_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 13 |
| output selected sources | 7 |
| removed selected sources | 6 |
| rows changed | 6 |
| rows deferred to human review | 1 |

## Removed Hosts

| Host | Count |
| --- | --- |
| forbes.com | 2 |
| wired.com | 2 |
| x.com | 1 |
| youtube.com | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| Daniela Amodei | augment_source | forbes.com | Daniela Amodei | background_profile_not_needed_when_primary_fundraising_source_exists |
| Daniela Amodei | augment_source | forbes.com | Daniela Amodei | background_profile_does_not_prove_target_hiring_claim |
| Daniela Amodei | augment_source | youtube.com | Interview with Daniela Amodei, Co-Founder & President of Anthropic | video_page_not_needed_when_institution_event_page_exists |
| Demis Hassabis | replace_source | wired.com | Google DeepMind's Demis Hassabis Says Gemini Is a New Breed of AI \| WIRED | background_gemini_article_does_not_prove_target_gemini3_claim |
| Elon Musk | replace_source | wired.com | Elon Musk's Grokipedia Pushes Far-Right Talking Points \| WIRED | loaded_secondary_article_not_needed_when_neutral_reporting_exists |
| Hyung Won Chung | replace_source | x.com | Superintelligence Labs. - Hyung Won Chung | social_or_login_limited_profile |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| Demis Hassabis | prune-tail:cmjtvmit1006hrmtb0gau9zv5 | announcing Gemini 3 speed/performance advancements) | manual_curated_all_selected_sources_removed |
