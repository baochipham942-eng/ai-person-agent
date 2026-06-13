# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T20:53:52.174Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch26.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch26_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 15 |
| output rows | 15 |
| input selected sources | 20 |
| output selected sources | 15 |
| removed selected sources | 5 |
| rows changed | 5 |
| rows deferred to human review | 4 |

## Removed Hosts

| Host | Count |
| --- | --- |
| learn.microsoft.com | 2 |
| chessprogramming.org | 1 |
| jan.leike.name | 1 |
| podcasts.musixmatch.com | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| Jan Leike | replace_source | jan.leike.name | Publications - Jan Leike | publication_page_does_not_prove_target_arxiv_paper |
| Shane Legg | replace_source | podcasts.musixmatch.com | The Arrival of AGI with Shane Legg (co-founder of DeepMind) | transcript_aggregator_not_primary_source |
| 埃里克·霍维茨 | augment_source | learn.microsoft.com | 埃里克·霍维茨在人工智能的新时代 \| Microsoft Learn | background_interview_does_not_prove_target_arxiv_claim |
| 埃里克·霍维茨 | replace_source | learn.microsoft.com | 埃里克·霍维茨在人工智能的新时代 \| Microsoft Learn | background_interview_does_not_prove_target_ama_audio |
| 科拉伊·卡武克丘奥卢 | replace_source | chessprogramming.org | Koray Kavukcuoglu - Chessprogramming wiki | secondary_or_ugc_reference_source |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| Jan Leike | prune-tail:cmju14au00aqprmtb7w2xezt5 | //arxiv.org/abs/2505.05410 | manual_curated_all_selected_sources_removed |
| Shane Legg | prune-tail:cmjtvo8og00jlrmtbhejak2hm | //x.com/ShaneLegg/status/1994438350262898713 | manual_curated_all_selected_sources_removed |
| 埃里克·霍维茨 | prune-tail:cmjtxpgx003ztrmtbrnkrive0 | //arxiv.org/abs/2511.02687 | 候选来源中未找到直接证明埃里克·霍维茨是论文//arxiv.org/abs/2511.02687作者的权威页面。; manual_curated_all_selected_sources_removed |
| 埃里克·霍维茨 | prune-tail:cmjtxpgaw03zprmtbudt4ky5u | //edhub.ama-assn.org/jn-learning/audio-player/19019635 | manual_curated_all_selected_sources_removed |
