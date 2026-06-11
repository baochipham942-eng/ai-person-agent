# Refetch Source by Search + MiMo

Generated at: 2026-06-10T17:32:16.837Z
Remediation input: docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch13.jsonl
Search provider: tavily
Model: mimo-v2.5-pro

## Counts

| Metric | Value |
| --- | --- |
| selected tasks | 20 |
| existing rows reused | 0 |
| pending tasks | 0 |
| refetch results | 20 |
| source candidates | 194 |
| selected sources | 18 |

## Decisions

| Decision | Count |
| --- | --- |
| augment_source | 11 |
| no_good_source | 6 |
| replace_source | 2 |
| human_review | 1 |

## Selected Hosts

| Host | Count |
| --- | --- |
| research.google | 6 |
| zh.wikipedia.org | 2 |
| essential.ai | 2 |
| cn.dataconomy.com | 1 |
| hub.baai.ac.cn | 1 |
| learn.microsoft.com | 1 |
| yeeyi.com | 1 |
| m.36kr.com | 1 |
| nvidia.com | 1 |
| openreview.net | 1 |
| wewic.com | 1 |

## Sample Results

| Person | Target | Decision | Sources | Reason |
| --- | --- | --- | --- | --- |
| 亚历克·拉德福德 | recentBeen AI meaning-focused to posts check as this of - late thanks December @ Thom202_... | augment_source | 亚历克·拉德福德（Alec Radford）离开Openai，现在他被诉诸诉讼 - Dataconomy CN (cn.dataconomy.com) | 原始来源内容混乱，但提及人物与BERT/GPT比较。候选中Dataconomy文章提供了权威的职业背景信息，可补强人物页面。其他候选要么是社媒/搜索页，要么缺乏直接证据，需人工审核视频内容。 |
| 唐杰 | for GLM-4.6, which features do you want most? Speed up to 100t/s? Stability? Lower price? | augment_source | 清华大学唐杰：大模型与超级智能 - 智源社区 (hub.baai.ac.cn) | 原始来源为唐杰在X平台的互动调研，信息密度低。候选来源中，智源社区文章能权威证明唐杰与GLM模型的关联，可作为补强来源。但该文章未直接提及GLM-4.6或原始推文内容，因此更适合补强而非完全替换。 |
| 埃里克·霍维茨 | When AI Meets Biology | augment_source | 埃里克·霍维茨在人工智能的新时代 - Microsoft Learn (learn.microsoft.com) | 原始来源为推文，信息密度低。候选中仅微软官方页面提及埃里克·霍维茨及其观点，可作为权威补充，但未直接关联“When AI Meets Biology”主题。建议进一步搜索该主题的官方演讲或访谈记录。 |
| 布莱恩·卡坦扎罗 | //x.com/ctnzr/status/1957504768156561413 | augment_source | 英伟达超级计算机插了数千张显卡！全年无休运行六年-yeeyi (yeeyi.com)<br>英伟达副总裁：除了围棋，人工智能下一个让人惊讶的领域是什么-36氪 (m.36kr.com) | 原始来源为推文链接，缺乏具体内容。候选中有两个来源（yeeyi和36氪）明确提及人物姓名、职位和贡献，可作为补充证据。其他候选来源要么无关，要么证据不足或需登录墙。建议用这两个来源补强，但需注意yeeyi为转载媒体，36氪为授权发布，权威... |
| 布莱恩·卡坦扎罗 | //x.com/ctnzr/status/1960702543534989575 | augment_source | Fireside Chat with David Luan and Bryan Catanzaro: The Future of AI and the Path to AGI S63296 \| GTC San Jose 2024 \| NVIDIA On-Demand (nvidia.com)<br>Bryan Catanzaro \| OpenReview (openreview.net) | 原始来源为一条推文链接，缺乏具体描述。候选来源中，英伟达官方活动页面和OpenReview学术资料页均能权威证明布莱恩·卡坦扎罗在英伟达的职位和角色，可作为补强来源。其他候选来源或权威性不足，或与人物无关，或需人工审核。 |
| 李莲 | If you are into the topic, my team is hiring Research Engineer for a new sub-team Human-A... | no_good_source |  | 候选来源均为通用招聘页面、面试指南或无关公司/个人博客，无一包含'李莲'姓名或其团队招聘的具体信息。无法替换或补强原始来源。 |
| 李飞飞 | Beginning of an exciting journey! 🤖🤩 | human_review |  | 候选来源均为第三方聚合页面或搬运内容，缺乏直接、权威的原始出处。无法确认‘Beginning of an exciting journey!’的具体背景（如新项目、新职位或新研究启动），需要人工查找李飞飞本人或斯坦福大学官方渠道的原始发布。 |
| 杰夫·迪恩 | //x.com/JeffDean/status/1802646348014965219 | augment_source | Jeffrey Dean (research.google)<br>谷歌首席科学家迪恩：AI专用硬件的进步，将会促进更多科学发现，以及更强大的智能体-世界创新大会（WIC）官网 (wewic.com) | 原始来源为X链接但无内容，无法评估。候选中，谷歌官方研究页面提供了权威的职位和职责信息，可作为主要补强来源。WIC官网的访谈全文提供了详细的背景和对话内容，能直接证明人物身份和观点。其他候选或权威性不足，或证据不明确，或为辅助线索。 |
| 杰夫·迪恩 | //x.com/JeffDean/status/1828165959921934560 | augment_source | Jeffrey Dean (research.google)<br>杰夫·迪恩 - 维基百科，自由的百科全书 (zh.wikipedia.org) | 原始来源为X帖子链接但无内容，无法评估。候选中，谷歌官方研究页面是权威一手来源，维基百科页面提供详细背景信息，两者可共同补强对杰夫·迪恩职位和贡献的证明。其他候选或权威性不足，或内容不明确，予以拒绝。 |
| 杰夫·迪恩 | //x.com/JeffDean/status/1858540085794451906 | augment_source | Jeffrey Dean (research.google)<br>杰夫·迪恩 - 维基百科，自由的百科全书 (zh.wikipedia.org) | 原始来源为杰夫·迪恩的X推文链接，但无内容预览，无法评估。候选中，谷歌官方研究页面和维基百科页面能直接证明其职位和贡献，可作为权威补充。其他候选或权威性不足，或无法访问，或内容重复。 |
| 杰夫·迪恩 | //x.com/JeffDean/status/1886852442815652188 | replace_source | Jeffrey Dean (research.google) | 原始来源为失效的X链接，无法提供有效信息。候选中的谷歌官方研究页面（research.google/people/jeff）权威性高，直接证明了杰夫·迪恩的职位和贡献，是理想的替换来源。其他候选要么权威性不足，要么证据不明确。 |
| 杰夫·迪恩 | A powerful features of our Gemini models since Gemini 1.5 (including 2.0 and 2.5 models) ... | no_good_source |  | 候选来源均为Gemini模型的官方或技术文档，但均未提及杰夫·迪恩本人，无法证明该声明与其个人页面的关联性。需要寻找明确提及杰夫·迪恩在Gemini项目中角色或直接引用其言论的来源。 |
| 杰夫·迪恩 | Building on more than 10 years of robotics research and engineering at @GoogleDeepMind, @... | replace_source | Jeffrey Dean - Google Research (research.google) | 原始来源为个人社交媒体动态，虽提及团队成果，但更偏向机构宣传。谷歌官方研究页面直接、权威地证明了杰夫·迪恩作为首席科学家的职位及其在Google DeepMind和Google Research的领导角色，是更优的替代来源。 |
| 杰夫·迪恩 | Gemini 3 Deep Think is now available for Ultra users, making available our IMO & ICPC Gol... | no_good_source |  | 所有候选来源均未提及杰夫·迪恩本人，无法证明该产品发布声明与其个人的直接关联。原始推文是直接证据，但候选中无权威来源能替代或补强其个人角色。需要寻找明确提及杰夫·迪恩在该发布中角色的来源。 |
| 杰夫·迪恩 | I'm really enjoying your living artwork on the giant three story screen in Gradient Canop... | no_good_source |  | 所有候选来源均未直接证明杰夫·迪恩对Gradient Canopy内艺术作品的评论。简历和传记类来源未提及此事，建筑项目介绍页面未提及杰夫·迪恩。原始来源（推文）本身是社交评论，与AI技术研究关联弱，且无权威来源佐证或提供更好替代。 |
| 杰夫·迪恩 | It has been a productive 2025! It's wonderful working with such amazing colleagues at @Go... | augment_source | Jeffrey Dean - Google Research (research.google) | 原始来源是杰夫·迪恩的官方推文，内容真实但较泛。候选中的谷歌研究官方页面能权威证明其当前职位和工作重点，可作为补强来源。维基百科等页面可作为辅助，但不符合替换标准。需进一步寻找能直接证明其2025年工作感受的官方采访或文章。 |
| 科拉伊·卡武克丘奥卢 | Announcing upcoming Gemini 3 Flash release) | no_good_source |  | 所有候选来源均未提及人物科拉伊·卡武克丘奥卢，无法证明其与‘宣布Gemini 3 Flash发布’事件的关联。需要更直接的来源，如个人官方主页、机构资料页或明确提及人物角色的采访。 |
| 阿希什·瓦斯瓦尼 | Honored to be contributing alongside Nous ❤️ . | no_good_source |  | 候选来源均为阿希什·瓦斯瓦尼的通用传记或第三方资料页，均未提及与Nous Research的具体合作或贡献。原始来源（推文）内容过短，缺乏上下文。目前没有权威来源能直接证明该陈述。 |
| 阿希什·瓦斯瓦尼 | It was a wonderful experience working with @vipulved and the @togethercompute team to bri... | augment_source | Essential AI (essential.ai) | 原始来源（推文）内容简短，缺乏权威性。候选来源中，Essential AI官方博客由阿希什·瓦斯瓦尼署名，直接证明其作为CEO参与并领导了Rnj-1模型的发布，可作为权威补充来源。其他候选来源均未提及人物姓名或无法证明其具体贡献。 |
| 阿希什·瓦斯瓦尼 | Terrific work by @AndrewHojel , Michael Pust, Tim Romanski, and the Data Team at @essenti... | augment_source | Announcing Rnj-1: Building Instruments of Intelligence (essential.ai) | 原始推文内容简短，信息量不足。候选来源中，Essential AI官方博客由阿希什·瓦斯瓦尼撰写，能直接证明其作为公司领导者的身份和贡献，可作为补强来源。维基百科等页面虽提及人物，但未直接关联推文内容。 |

## Execution Rule

- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.
- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.
- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.
