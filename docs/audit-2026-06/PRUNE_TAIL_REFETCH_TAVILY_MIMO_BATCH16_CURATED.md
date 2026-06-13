# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T18:23:11.182Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch16.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch16_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 25 |
| output selected sources | 16 |
| removed selected sources | 9 |
| rows changed | 9 |
| rows deferred to human review | 2 |

## Removed Hosts

| Host | Count |
| --- | --- |
| x.com | 7 |
| en.wikipedia.org | 1 |
| microsoft.com | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| Hyung Won Chung | replace_source | x.com | Hyung Won Chung on X: "After a great time at OpenAI, we (@EdwardSun0909, @_jasonwei) recently joined @Meta Superintelligence Labs..." | social_or_login_limited_profile |
| Hyung Won Chung | replace_source | x.com | Superintelligence Labs. - Hyung Won Chung | social_or_login_limited_profile |
| Hyung Won Chung | replace_source | x.com | Superintelligence Labs. - Hyung Won Chung | social_or_login_limited_profile |
| Hyung Won Chung | replace_source | x.com | Hyung Won Chung on X: "Happy to share what I’ve been working on at @OpenAI : Codex mini..." | social_or_login_limited_profile |
| Hyung Won Chung | replace_source | x.com | Superintelligence Labs. - Hyung Won Chung | social_or_login_limited_profile |
| Hyung Won Chung | replace_source | x.com | Superintelligence Labs. - Hyung Won Chung | social_or_login_limited_profile |
| Hyung Won Chung | replace_source | x.com | Superintelligence Labs. - Hyung Won Chung | social_or_login_limited_profile |
| Mira Murati | augment_source | en.wikipedia.org | Mira Murati - Wikipedia | secondary_or_ugc_reference_source |
| Mira Murati | replace_source | microsoft.com | Mira Murati, Chief Technology Officer, OpenAI - Behind the Tech ... | background_interview_does_not_prove_target_synthetic_voices_claim |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| Mira Murati | prune-tail:cmjtxl6ub031irmtbuxlkw1vn | //openai.com/index/introducing-the-model-spec/ | 所有候选来源均未提及目标链接“//openai.com/index/introducing-the-model-spec/”。; 缺乏直接证明Mira Murati参与或负责该链接内容的权威来源。; manual_curated_all_selected_sources_removed |
| Mira Murati | prune-tail:cmjtxl761031mrmtbl1iedufw | //openai.com/index/navigating-the-challenges-and-opportunities-of-synthetic-voices/ | manual_curated_all_selected_sources_removed |
