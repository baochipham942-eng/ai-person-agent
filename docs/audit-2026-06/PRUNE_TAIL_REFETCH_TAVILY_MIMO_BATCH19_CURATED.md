# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T19:10:08.155Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch19.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch19_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 24 |
| output selected sources | 18 |
| removed selected sources | 6 |
| rows changed | 4 |
| rows deferred to human review | 2 |

## Removed Hosts

| Host | Count |
| --- | --- |
| britannica.com | 1 |
| deepai.org | 1 |
| en.wikipedia.org | 1 |
| erictopol.substack.com | 1 |
| forbes.com | 1 |
| gspeakers.com | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| Mustafa Suleyman | augment_source | en.wikipedia.org | Mustafa Suleyman - Wikipedia | secondary_or_ugc_reference_source |
| Mustafa Suleyman | augment_source | erictopol.substack.com | My review of THE COMING WAVE - by Eric Topol | newsletter_or_blog_not_primary_source |
| Sam Altman | replace_source | forbes.com | Sam Altman - Forbes | background_profile_does_not_prove_target_congress_hearing_claim |
| Sam Altman | replace_source | britannica.com | Sam Altman \| Biography, OpenAI, ChatGPT, & Microsoft \| Britannica Money | background_profile_does_not_prove_target_congress_hearing_claim |
| Wojciech Zaremba | augment_source | deepai.org | Wojciech Zaremba \| DeepAI | low_authority_aggregated_profile |
| Wojciech Zaremba | augment_source | gspeakers.com | Wojciech Zaremba - keynote speaker | low_authority_speaker_bureau_profile |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| Mustafa Suleyman | prune-tail:cmjuusc6q0ht4rmtbb4djq3z6 | The Coming Wave Book | manual_curated_all_selected_sources_removed |
| Sam Altman | prune-tail:cmjrz1ax50014b28tw6j90eeg | https://www.cnn.com/2023/05/16/tech/sam-altman-openai-congress | manual_curated_all_selected_sources_removed |
