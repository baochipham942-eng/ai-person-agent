# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T20:40:57.624Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch25.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch25_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 12 |
| output selected sources | 5 |
| removed selected sources | 7 |
| rows changed | 5 |
| rows deferred to human review | 3 |

## Removed Hosts

| Host | Count |
| --- | --- |
| en.wikipedia.org | 2 |
| blog.vibecoder.me | 1 |
| fs.blog | 1 |
| linkedin.com | 1 |
| y2doc.com | 1 |
| youtube.com | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| 黄仁勋 | augment_source | linkedin.com | Nvidia's CEO Jensen Huang's advice to students: "resilience matters ... | social_or_login_limited_profile |
| 黄仁勋 | augment_source | youtube.com | Nvidia CEO Jensen Huang On Building Resilience With Pain and Suffering | low_authority_rehosted_clip_not_primary_source |
| 黄仁勋 | augment_source | en.wikipedia.org | Jensen Huang - Wikipedia | secondary_or_ugc_reference_source |
| 黄仁勋 | augment_source | en.wikipedia.org | Jensen Huang - Wikipedia | secondary_or_ugc_reference_source |
| Boris Cherny | augment_source | blog.vibecoder.me | Skills, Slash Commands, and Subagents in Claude Code - The three customization primitives the Anthropic team actually uses, and how they fit together — Vibe Coder Blog | secondary_blog_not_primary_source_for_target_workflow_quote |
| Greg Brockman | augment_source | y2doc.com | Transcript & Notes: Greg Brockman on OpenAI's Road to AGI \| Y2Doc | transcript_aggregator_not_primary_source |
| Greg Brockman | augment_source | fs.blog | Greg Brockman: Inside the 72 Hours That Almost Killed OpenAI | background_podcast_does_not_prove_target_gpt52_report_claim |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| 黄仁勋 | prune-tail:cmjse3uky001hc6jtl9yi1mzi | Another share of Jensen Huang's quote on resilience and hardship. | manual_curated_all_selected_sources_removed |
| 黄仁勋 | prune-tail:cmjse3ukz001jc6jt4qnzjpbz | Biography and family details of Jensen Huang, emphasizing his background and values. | replacement_needs_primary_or_credible_source; manual_curated_all_selected_sources_removed |
| Greg Brockman | prune-tail:cmjsmr9so0015q8o9vbaj3slp | GPT-5.2 for compiling reports: | 无候选来源直接证明Greg Brockman本人提出或推广“GPT-5.2 for compiling reports”这一具体用例。; manual_curated_all_selected_sources_removed |
