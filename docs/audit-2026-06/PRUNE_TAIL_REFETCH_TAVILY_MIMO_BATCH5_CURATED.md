# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T15:04:10.085Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch5.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch5_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 34 |
| output selected sources | 26 |
| removed selected sources | 8 |
| rows changed | 7 |
| rows deferred to human review | 2 |

## Removed Hosts

| Host | Count |
| --- | --- |
| en.wikipedia.org | 3 |
| hwchung2.github.io | 1 |
| linkedin.com | 1 |
| nature.com | 1 |
| podcasts.happyscribe.com | 1 |
| space50.caltech.edu | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| Daniela Amodei | augment_source | en.wikipedia.org | Daniela Amodei - Wikipedia | secondary_or_ugc_reference_source |
| Daniela Amodei | replace_source | en.wikipedia.org | Daniela Amodei - Wikipedia | secondary_or_ugc_reference_source |
| Daniela Amodei | augment_source | en.wikipedia.org | Daniela Amodei - Wikipedia | secondary_or_ugc_reference_source |
| Elon Musk | augment_source | podcasts.happyscribe.com | Introducing: On Musk with Walter Isaacson — On Musk with Walter Isaacson Transcript | transcript_aggregator_not_primary_source |
| Elon Musk | augment_source | space50.caltech.edu | 50 Years in Space - Elon Musk | background_profile_does_not_prove_target_ai_story |
| Geoffrey Hinton | augment_source | nature.com | Deep learning \| Nature | background_paper_does_not_name_target_person |
| Hyung Won Chung | replace_source | linkedin.com | Hyung Won Chung's Post - LinkedIn | social_or_login_limited_profile |
| Hyung Won Chung | replace_source | hwchung2.github.io | Hyung Won Chung | profile_page_does_not_prove_target_news_claim |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| Daniela Amodei | prune-tail:cmjtvn4qb00cjrmtbaxb81o3p | Daniela Amodei - President And Co-founder at Anthropic \| The Org | replacement_needs_primary_or_credible_source; manual_curated_all_selected_sources_removed |
| Hyung Won Chung | prune-tail:cmjtvvj5t018lrmtbok2qylun | 突发｜思维链开山作者Jason Wei被曝加入Meta，机器之心独家证实 | replacement_contains_auxiliary_low_authority_source; manual_curated_all_selected_sources_removed |
