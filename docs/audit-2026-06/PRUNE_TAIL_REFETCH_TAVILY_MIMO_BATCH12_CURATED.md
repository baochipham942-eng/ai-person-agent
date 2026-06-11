# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T17:13:37.219Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch12.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch12_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 19 |
| output selected sources | 10 |
| removed selected sources | 9 |
| rows changed | 7 |
| rows deferred to human review | 4 |

## Removed Hosts

| Host | Count |
| --- | --- |
| en.wikipedia.org | 2 |
| dwarkesh.com | 1 |
| ml-summit.org | 1 |
| research.google | 1 |
| singjupost.com | 1 |
| techcrunch.com | 1 |
| time.com | 1 |
| youtube.com | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| Lukasz Kaiser | augment_source | ml-summit.org | Lukasz Kaiser \| 2021 Machine Learning Summit | background_profile_does_not_prove_target_codex_claim |
| Noam Shazeer | augment_source | time.com | Noam Shazeer: The 100 Most Influential People in AI 2023 | background_profile_does_not_prove_target_competitor_mission_claim |
| Noam Shazeer | augment_source | dwarkesh.com | Jeff Dean & Noam Shazeer — 25 years at Google: from PageRank to AGI | background_interview_does_not_prove_target_competitor_mission_claim |
| Oriol Vinyals | replace_source | en.wikipedia.org | Oriol Vinyals - Wikipedia | secondary_or_ugc_reference_source |
| Oriol Vinyals | augment_source | en.wikipedia.org | Oriol Vinyals - Wikipedia | secondary_or_ugc_reference_source |
| Sam Altman | augment_source | techcrunch.com | Sam Altman makes 'mic drop' offer to every Y Combinator startup | background_article_does_not_prove_target_cost_reduction_claim |
| Sam Altman | augment_source | singjupost.com | Transcript: Sam Altman on AGI, GPT-5, And What’s Next -- the OpenAI Podcast Ep. 1 – The Singju Post | transcript_aggregator_not_primary_source |
| Sam Altman | augment_source | youtube.com | Sam Altman: The Future of OpenAI, ChatGPT's Origins, and Building AI Hardware | background_video_does_not_prove_target_gpt51_claim |
| Zoubin Ghahramani | augment_source | research.google | Zoubin Ghahramani | profile_page_does_not_prove_target_weather_ai_claim |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| Lukasz Kaiser | prune-tail:cmjtxqwpo04e1rmtb8fe5ay04 | This is the power of codex. Start with all the small stuff you always wanted to do in your repo but never had time. And do it all at once. Feel the magic. | 候选来源中无直接证明Lukasz Kaiser关于Codex言论的权威页面（如官方博客、采访转录）。; 部分候选来源（如YouTube视频）需转录才能确认内容，当前证据不足。; manual_curated_all_selected_sources_removed |
| Noam Shazeer | prune-tail:cmju1hns50dahrmtbq86peghr | As a friendly competitor in the AI space, we share a core mission of building AI technology that benefits every person. | manual_curated_all_selected_sources_removed |
| Sam Altman | prune-tail:cmjv37e5b000av6e84p1ou87r | It is a very smart model, and we have come a long way since GPT-5.1: | manual_curated_all_selected_sources_removed |
| Zoubin Ghahramani | prune-tail:cmjwhjhnl001n56p4ute3d6aw | Predicting weather accurately is a fantastic use of AI that helps everyone in the world. @GoogleDeep | 候选来源中缺乏能直接证明Zoubin Ghahramani发表过关于AI气象预测具体观点或参与相关项目的权威来源。; manual_curated_all_selected_sources_removed |
