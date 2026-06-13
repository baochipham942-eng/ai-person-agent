# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T19:41:58.512Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch21.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch21_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 25 |
| output selected sources | 18 |
| removed selected sources | 7 |
| rows changed | 5 |
| rows deferred to human review | 3 |

## Removed Hosts

| Host | Count |
| --- | --- |
| cdn.openai.com | 1 |
| chatgptiseatingtheworld.com | 1 |
| en.wikipedia.org | 1 |
| getpushtoprod.substack.com | 1 |
| news.qq.com | 1 |
| speakersassociates.com | 1 |
| x.com | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| Boris Cherny | augment_source | getpushtoprod.substack.com | How the Creator of Claude Code Actually Uses Claude Code | newsletter_or_blog_not_primary_source |
| Boris Cherny | augment_source | chatgptiseatingtheworld.com | Is Anthropic's Boris Cherny just abandoning copyright for computer ... | low_authority_commentary_not_primary_source |
| Oriol Vinyals | augment_source | x.com | Oriol Vinyals on X: "Introducing the new Gemini 2.5 Pro preview..." | social_or_login_limited_profile |
| 亚历克·拉德福德 | augment_source | cdn.openai.com | [PDF] Improving Language Understanding by Generative Pre-Training | background_paper_does_not_prove_target_generation_samples_claim |
| 亚历克·拉德福德 | augment_source | news.qq.com | GPT论文主要作者、OpenAI高级研究员亚历克·雷德福离职_腾讯新闻 | background_career_article_does_not_prove_target_generation_samples_claim |
| Mira Murati | augment_source | en.wikipedia.org | Mira Murati - Wikipedia | secondary_or_ugc_reference_source |
| Mira Murati | augment_source | speakersassociates.com | [PDF] Mira Murati - Speakers Associates | low_authority_speaker_bureau_profile |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| Oriol Vinyals | prune-tail:cmjtvxvyo01qyrmtbg5rb7f44 | //blog.google/products/gemini/gemini-2-5-pro-latest-preview/ | replacement_needs_primary_or_credible_source; manual_curated_all_selected_sources_removed |
| 亚历克·拉德福德 | prune-tail:cmjtxlvqp036frmtbmtu4r7qp | All samples shown are complete generations with no human editing. No stitching together of sub-generations. For unicorn example GPT-2 produced an <endoftext> token at the end. Some on the blog I *think* may be crops - though. | 候选来源中无直接证明'All samples shown are complete generations...'这一具体技术声明属于亚历克·拉德福德的权威来源。; manual_curated_all_selected_sources_removed |
| Mira Murati | prune-tail:cmjtxkyxn02zlrmtbflff4xn2 | Mira Murati, Chief Technology Officer, OpenAI - Behind the ... | manual_curated_all_selected_sources_removed |
