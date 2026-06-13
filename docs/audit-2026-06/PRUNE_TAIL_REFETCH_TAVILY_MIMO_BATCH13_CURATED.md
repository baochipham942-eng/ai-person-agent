# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T17:33:44.193Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch13.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch13_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 18 |
| output selected sources | 8 |
| removed selected sources | 10 |
| rows changed | 9 |
| rows deferred to human review | 6 |

## Removed Hosts

| Host | Count |
| --- | --- |
| research.google | 2 |
| zh.wikipedia.org | 2 |
| cn.dataconomy.com | 1 |
| hub.baai.ac.cn | 1 |
| learn.microsoft.com | 1 |
| m.36kr.com | 1 |
| openreview.net | 1 |
| yeeyi.com | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| 亚历克·拉德福德 | augment_source | cn.dataconomy.com | 亚历克·拉德福德（Alec Radford）离开Openai，现在他被诉诸诉讼 - Dataconomy CN | background_article_does_not_prove_target_bert_gpt_claim |
| 唐杰 | augment_source | hub.baai.ac.cn | 清华大学唐杰：大模型与超级智能 - 智源社区 | background_article_does_not_prove_target_glm46_poll_claim |
| 埃里克·霍维茨 | augment_source | learn.microsoft.com | 埃里克·霍维茨在人工智能的新时代 - Microsoft Learn | background_interview_does_not_prove_target_ai_biology_claim |
| 布莱恩·卡坦扎罗 | augment_source | yeeyi.com | 英伟达超级计算机插了数千张显卡！全年无休运行六年-yeeyi | secondary_repost_does_not_prove_target_x_claim |
| 布莱恩·卡坦扎罗 | augment_source | m.36kr.com | 英伟达副总裁：除了围棋，人工智能下一个让人惊讶的领域是什么-36氪 | background_interview_does_not_prove_target_project |
| 布莱恩·卡坦扎罗 | augment_source | openreview.net | Bryan Catanzaro \| OpenReview | profile_page_does_not_prove_target_project |
| 杰夫·迪恩 | augment_source | zh.wikipedia.org | 杰夫·迪恩 - 维基百科，自由的百科全书 | secondary_or_ugc_reference_source |
| 杰夫·迪恩 | augment_source | zh.wikipedia.org | 杰夫·迪恩 - 维基百科，自由的百科全书 | secondary_or_ugc_reference_source |
| 杰夫·迪恩 | replace_source | research.google | Jeffrey Dean - Google Research | profile_page_does_not_prove_target_gemini_robotics_claim |
| 杰夫·迪恩 | augment_source | research.google | Jeffrey Dean - Google Research | profile_page_does_not_prove_target_productive_2025_claim |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| 亚历克·拉德福德 | prune-tail:cmju0pvie085mrmtbhq3ojjkd |  recentBeen AI meaning-focused to posts check as this of - late thanks December @ Thom202_W5olf. ! Alec RandomRad speculation tends: to the post bit sporad ofically weird,ness so going the on dates in span BERT several's months position. embeddings Let compared me to know GPT if is you'd due like to deeper the analysis sentence of similarity any task of. these I'd! guess a version of BERT trained without that aux loss would have pos embds similar to GPT. | manual_curated_all_selected_sources_removed |
| 唐杰 | prune-tail:cmjwi2bhw000xbxr3x892gcmg | for GLM-4.6, which features do you want most? Speed up to 100t/s? Stability? Lower price? | manual_curated_all_selected_sources_removed |
| 埃里克·霍维茨 | prune-tail:cmjtxpi4w0401rmtb2wbv30vu | When AI Meets Biology | 候选来源中无直接证明埃里克·霍维茨与“When AI Meets Biology”主题关联的权威页面。; manual_curated_all_selected_sources_removed |
| 布莱恩·卡坦扎罗 | prune-tail:cmjtxq6et044wrmtb01zdqycb | //x.com/ctnzr/status/1957504768156561413 | 原始来源（推文）缺乏文本内容，无法直接验证。; 候选来源中缺乏官方主页、机构资料页或论文详情页等最高权威来源。; manual_curated_all_selected_sources_removed |
| 杰夫·迪恩 | prune-tail:cmjtxolzc03szrmtbb60yf8xt | Building on more than 10 years of robotics research and engineering at @GoogleDeepMind, @GoogleResearch and @GoogleAI, we're delighted to announce our Gemini Robotics On-Device system. A really capable vision-language-action model that can  run entirely without network access. ⬇️ | manual_curated_all_selected_sources_removed |
| 杰夫·迪恩 | prune-tail:cmjtxoiwv03sdrmtbr9qrwots | It has been a productive 2025!  It's wonderful working with such amazing colleagues at @GoogleDeepMind and all across @Google to conduct new research and to put research into practice across many of Google's products! | manual_curated_all_selected_sources_removed |
