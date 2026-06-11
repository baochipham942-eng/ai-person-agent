# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T18:08:20.029Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch15.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch15_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 21 |
| output selected sources | 14 |
| removed selected sources | 7 |
| rows changed | 6 |
| rows deferred to human review | 4 |

## Removed Hosts

| Host | Count |
| --- | --- |
| anthropic.com | 1 |
| fr.linkedin.com | 1 |
| ithome.com.tw | 1 |
| scholar.google.com | 1 |
| venturebeat.com | 1 |
| x.com | 1 |
| zh.wikipedia.org | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| Hyung Won Chung | augment_source | x.com | Hyung Won Chung | social_or_login_limited_profile |
| 阿希什·瓦斯瓦尼 | augment_source | zh.wikipedia.org | 阿西什·瓦斯瓦尼 - 维基百科，自由的百科全书 | secondary_or_ugc_reference_source |
| Chris Olah | replace_source | anthropic.com | Anthropic co-founder Chris Olah's remarks on Pope Leo XIV's encyclical "Magnifica humanitas" | background_page_does_not_prove_target_interpretability_qa_claim |
| Guillaume Lample | augment_source | fr.linkedin.com | Guillaume Lample - Mistral AI | social_or_login_limited_profile |
| Guillaume Lample | augment_source | scholar.google.com | ‪Guillaume Lample‬ - ‪Google Scholar‬ | search_or_profile_page_not_source_backed_claim |
| Guillaume Lample | augment_source | venturebeat.com | Mistral launches powerful Devstral 2 coding model including open source, laptop-friendly version \| VentureBeat | product_article_does_not_name_target_person |
| Guillaume Lample | augment_source | ithome.com.tw | Mistral公布240億參數程式設計代理人模型Devstral　可單機本地部署 \| iThome | product_article_does_not_name_target_person |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| Hyung Won Chung | prune-tail:cmjtvwgtf01ftrmtbuex96s3j | Cornell AI history lecture | replacement_needs_primary_or_credible_source; manual_curated_all_selected_sources_removed |
| 阿希什·瓦斯瓦尼 | prune-tail:cmjtxq9jn046ermtbodwlztmc | Lessons Learned From the Early Innings of AI | 原始YouTube视频内容缺失，无法验证人物参与。; 候选来源中缺乏直接证明人物与特定演讲/视频关联的权威页面。; manual_curated_all_selected_sources_removed |
| Chris Olah | prune-tail:cmjtxml4i03cormtbci9tjm4h | The Anthropic Interpretability Team is planning a virtual Q&A... | manual_curated_all_selected_sources_removed |
| Guillaume Lample | prune-tail:cmjtvqy200106rmtbfk8f2imo | Devstral 2 looking good ! | manual_curated_all_selected_sources_removed |
