# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T20:12:09.638Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch23.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch23_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 8 |
| output selected sources | 3 |
| removed selected sources | 5 |
| rows changed | 5 |
| rows deferred to human review | 3 |

## Removed Hosts

| Host | Count |
| --- | --- |
| blogs.microsoft.com | 2 |
| ignorance.ai | 1 |
| lifearchitect.ai | 1 |
| youtube.com | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| Greg Brockman | augment_source | ignorance.ai | The Emerging "Harness Engineering" Playbook | low_authority_commentary_not_primary_source |
| Ilya Sutskever | augment_source | lifearchitect.ai | OpenAI Chief Scientist Dr Ilya Sutskever – Dr Alan D. Thompson – LifeArchitect.ai | secondary_profile_or_transcript_aggregator_not_primary_source |
| Ilya Sutskever | augment_source | youtube.com | Season 1 Ep. 22 OpenAI's Ilya Sutskever: The man who made AI work | background_video_does_not_prove_target_openai_results_claim |
| Mustafa Suleyman | replace_source | blogs.microsoft.com | Mustafa Suleyman, DeepMind and Inflection Co-founder, joins Microsoft to lead Copilot - The Official Microsoft Blog | background_role_announcement_does_not_prove_target_copilot_model_claim |
| Mustafa Suleyman | replace_source | blogs.microsoft.com | Mustafa Suleyman, DeepMind and Inflection Co-founder, joins Microsoft to lead Copilot - The Official Microsoft Blog | background_role_announcement_does_not_prove_target_copilot_holiday_feature_claim |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| Greg Brockman | prune-tail:cmjsmr98s0011q8o9nlqgkcjb | how to leverage coding agents to ship fast: | manual_curated_all_selected_sources_removed |
| Mustafa Suleyman | prune-tail:cmjtvo27q00gprmtbsyf39h7i | Copilot just got smarter! Starting today, we're rolling out the latest GPT-5.2 model from our partners at OpenAI to consumer @Copilot, coming first to Microsoft 365 Premium users. Can't wait to see what you do with it. | manual_curated_all_selected_sources_removed |
| Mustafa Suleyman | prune-tail:cmjtvo1wj00gjrmtbkk5e0q2j | The team just added a little extra holiday spirit to @Copilot! Meet Eggnog Mode Mico - live now in the US, UK, and Canada, only available for the holidays. Toggle on by just clicking the ⛄ icon while talking to Mico. | manual_curated_all_selected_sources_removed |
