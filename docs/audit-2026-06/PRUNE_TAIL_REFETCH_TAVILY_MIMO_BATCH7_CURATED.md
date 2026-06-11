# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T15:44:07.027Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch7.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch7_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 25 |
| output selected sources | 12 |
| removed selected sources | 13 |
| rows changed | 9 |
| rows deferred to human review | 7 |

## Removed Hosts

| Host | Count |
| --- | --- |
| time.com | 2 |
| artefact.com | 1 |
| cnbc.com | 1 |
| colah.github.io | 1 |
| en.wikipedia.org | 1 |
| github.com | 1 |
| hanxiao.io | 1 |
| hub.baai.ac.cn | 1 |
| learn.microsoft.com | 1 |
| montgomerysummit.com | 1 |
| research.google | 1 |
| tedai-sanfrancisco.ted.com | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| 迈克·施罗普费尔 | augment_source | en.wikipedia.org | Mike Schroepfer - Wikipedia | secondary_or_ugc_reference_source |
| 阿希什·瓦斯瓦尼 | replace_source | montgomerysummit.com | Ashish Vaswani - The Montgomery Summit | profile_page_does_not_prove_target_video_claim |
| Han Xiao | augment_source | hanxiao.io | Han Xiao, Ph.D. (肖涵) · Han Xiao Blog - Search AI | profile_page_does_not_prove_target_project |
| Han Xiao | augment_source | github.com | hanxiao (Han Xiao) · GitHub | profile_page_does_not_prove_target_repository |
| Arthur Mensch | augment_source | cnbc.com | Mistral AI CEO Arthur Mensch on growth, ... | background_interview_does_not_prove_target_product_claim |
| Arthur Mensch | augment_source | artefact.com | Arthur Mensch, CEO and cofounder of MISTRAL AI at the Adopt AI Summit – Bringing open AI models to the frontier - Artefact | background_event_page_does_not_prove_target_product_claim |
| Chris Olah | replace_source | time.com | Chris Olah: The 100 Most Influential People in AI 2024 - TIME | background_profile_does_not_prove_target_video_claim |
| Chris Olah | replace_source | colah.github.io | About Me - colah's blog | profile_page_does_not_prove_target_video_claim |
| Shane Legg | augment_source | time.com | Shane Legg: The 100 Most Influential People in AI 2023 | background_profile_does_not_prove_target_video_claim |
| Shane Legg | augment_source | tedai-sanfrancisco.ted.com | Shane Legg \| TEDAI San Francisco | profile_page_does_not_prove_target_video_claim |
| 唐杰 | augment_source | hub.baai.ac.cn | 清华大学唐杰：大模型与超级智能 - 智源社区 | background_article_does_not_prove_target_glm47_claim |
| 埃里克·霍维茨 | augment_source | learn.microsoft.com | 埃里克·霍维茨在人工智能的新时代 - Microsoft Learn | background_interview_does_not_prove_target_ai_biology_claim |
| 杰夫·迪恩 | augment_source | research.google | Jeffrey Dean - Google Research | profile_page_does_not_prove_target_research_overview_claim |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| 阿希什·瓦斯瓦尼 | prune-tail:cmjtxq8nq045urmtbmnfbawu0 | Ashish Vaswani on Essential AI's Journey with MI300X ... | manual_curated_all_selected_sources_removed |
| Han Xiao | prune-tail:cmjw75nqp0065ykszy2c96ubh | hanxiao/benchmark | 所有候选来源均未直接提及或描述‘hanxiao/benchmark’这个具体的GitHub仓库，无法直接替换或补强原来源。; manual_curated_all_selected_sources_removed |
| Arthur Mensch | prune-tail:cmju1ivb20dj8rmtbzquiy55u | The team is fast! It's been super exciting to see le Chat more and more widely adopted. It's an early product, and we can't wait to show you what's coming next. https://mistral.ai/news/all-new-le-chat | manual_curated_all_selected_sources_removed |
| Chris Olah | prune-tail:cmju0ucm108okrmtbuuvvwxlm | Valuable synthesis across labs! Make sure to check out the tutorial video - https://www.youtube.com/watch?v=ruLcDtr_cGo | manual_curated_all_selected_sources_removed |
| Shane Legg | prune-tail:cmjtvob7p00kfrmtb12irwcx6 | //www.youtube.com/watch?v=8IUIGVVLbCg | 原始视频链接（//www.youtube.com/watch?v=8IUIGVVLbCg）在候选中未找到直接匹配或可验证的转录，无法替换。; 候选中缺乏直接证明该特定视频内容或Shane Legg参与该视频的权威来源。; manual_curated_all_selected_sources_removed |
| 唐杰 | prune-tail:cmjwi2a2f000tbxr3s7hpt39d | 4.7 is coming, one of your best coding partners. https://z.ai/blog/glm-4.7 | manual_curated_all_selected_sources_removed |
| 杰夫·迪恩 | prune-tail:cmjtzrxxz05zormtbnlwqzvib | Awesome to see this overview of work done by many, many people in @GoogleResearch over the past year.   Learn about advances in: Advances in generative models Generative user interfaces Quantum Computing AI for Scientific Discovery Biomedical & Neuroscience Research Climate & Sustainability Privacy & Security Novel Model Architectures ...and more... Read the blog post at https://t.co/Hdj73HMEkg | manual_curated_all_selected_sources_removed |
