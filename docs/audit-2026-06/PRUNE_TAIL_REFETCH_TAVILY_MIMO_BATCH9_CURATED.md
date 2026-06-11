# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T16:19:13.016Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch9.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch9_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 30 |
| output selected sources | 23 |
| removed selected sources | 7 |
| rows changed | 5 |
| rows deferred to human review | 3 |

## Removed Hosts

| Host | Count |
| --- | --- |
| fr.linkedin.com | 1 |
| linkedin.com | 1 |
| podwise.ai | 1 |
| sina.cn | 1 |
| singjupost.com | 1 |
| time.com | 1 |
| x.com | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| Guillaume Lample | augment_source | fr.linkedin.com | Guillaume Lample - Cofounder & Chief Scientist @ Mistral AI | social_or_login_limited_profile |
| Jaana Dogan | augment_source | sina.cn | Google工程师谈AI代码生成_新浪新闻 | background_article_does_not_prove_target_mastodon_claim |
| Jaana Dogan | augment_source | x.com | Jaana Dogan ヤナ ドガン (@rakyll) / Posts / X - Twitter | social_or_login_limited_profile |
| Shane Legg | augment_source | podwise.ai | The Arrival of AGI with Shane Legg (co-founder of DeepMind) \| Google DeepMind: The Podcast \| Podwise | transcript_or_podcast_aggregator_not_primary_source |
| Yann LeCun | augment_source | linkedin.com | Yann LeCun's Post - LinkedIn | social_or_login_limited_profile |
| Yoshua Bengio | replace_source | time.com | Yoshua Bengio \| TIME | background_author_page_does_not_prove_target_ted_claim |
| Yoshua Bengio | replace_source | singjupost.com | Transcript of The Catastrophic Risks of AI — and a Safer Path: Yoshua Bengio – The Singju Post | transcript_aggregator_not_primary_source |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| Jaana Dogan | prune-tail:cmjyee4vo000cot7iux88ckcp | Jaana Dogan :unverified:: "I don't know if AI is going to…" - Mastodon | manual_curated_all_selected_sources_removed |
| Yann LeCun | prune-tail:cmjtvm7bt001jrmtbgwk42e92 | Meta chief AI scientist Yann LeCun plans to exit and launch own start-up | replacement_needs_primary_or_credible_source; manual_curated_all_selected_sources_removed |
| Yoshua Bengio | prune-tail:cmju1r9850f8nrmtb49houu1v | Yoshua Bengio - A Potential Path to Safer AI Development | manual_curated_all_selected_sources_removed |
