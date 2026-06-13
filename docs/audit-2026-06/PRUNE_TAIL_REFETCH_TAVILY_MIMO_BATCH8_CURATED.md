# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T16:03:32.154Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch8.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch8_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 33 |
| output selected sources | 27 |
| removed selected sources | 6 |
| rows changed | 5 |
| rows deferred to human review | 2 |

## Removed Hosts

| Host | Count |
| --- | --- |
| allamericanspeakers.com | 2 |
| 80000hours.org | 1 |
| alexw.substack.com | 1 |
| anthropic.com | 1 |
| linkedin.com | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| Alexandr Wang | augment_source | alexw.substack.com | Archive - Rational in the Fullness of Time | substack_archive_not_sufficient_primary_source |
| Andrej Karpathy | augment_source | linkedin.com | Andrej Karpathy (OpenAI co-founder) just open-sourced something that changes how you should be making business decisions. It's called LLM Council. Here's what it does: Forces ChatGPT, Claude… \| Nicholas Puruczky | social_or_login_limited_profile |
| Arthur Mensch | replace_source | allamericanspeakers.com | Arthur Mensch \| Speaking Fee \| Booking Agent | low_authority_speaker_bureau_profile |
| Arthur Mensch | replace_source | allamericanspeakers.com | Arthur Mensch \| Speaking Fee \| Booking Agent | low_authority_speaker_bureau_profile |
| Chris Olah | augment_source | anthropic.com | Anthropic co-founder Chris Olah's remarks on Pope Leo XIV's encyclical "Magnifica humanitas" | background_page_does_not_prove_acl_anthology_claim |
| Chris Olah | augment_source | 80000hours.org | Chris Olah on what the hell is going on inside neural networks | background_interview_does_not_prove_acl_anthology_claim |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| Alexandr Wang | prune-tail:cmjtvqbia00vcrmtbs0m4ey4w | Alexandr Wang \| Substack: Rational in the Fullness of Time | replacement_needs_primary_or_credible_source; manual_curated_all_selected_sources_removed |
| Chris Olah | prune-tail:cmjtxmc0703bgrmtbcgjsy7fj | Christopher Olah - ACL Anthology | manual_curated_all_selected_sources_removed |
