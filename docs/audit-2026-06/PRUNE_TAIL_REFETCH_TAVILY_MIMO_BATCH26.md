# Refetch Source by Search + MiMo

Generated at: 2026-06-10T20:51:53.256Z
Remediation input: docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch26.jsonl
Search provider: tavily
Model: mimo-v2.5-pro

## Counts

| Metric | Value |
| --- | --- |
| selected tasks | 15 |
| existing rows reused | 0 |
| pending tasks | 0 |
| refetch results | 15 |
| source candidates | 148 |
| selected sources | 20 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 12 |
| augment_source | 2 |
| no_good_source | 1 |

## Selected Hosts

| Host | Count |
| --- | --- |
| aisfoundation.ai | 4 |
| tedai-sanfrancisco.ted.com | 4 |
| mustafa-suleyman.ai | 2 |
| ai.meta.com | 2 |
| learn.microsoft.com | 2 |
| jan.leike.name | 1 |
| bbc.com | 1 |
| podcasts.musixmatch.com | 1 |
| blog.google | 1 |
| chessprogramming.org | 1 |
| meta.com | 1 |

## Sample Results

| Person | Target | Decision | Sources | Reason |
| --- | --- | --- | --- | --- |
| Jan Leike | //arxiv.org/abs/2505.05410 | replace_source | Publications - Jan Leike (jan.leike.name) | 候选来源中，Jan Leike的个人官方出版物页面（jan.leike.name/publications.html）是权威、可访问的直接来源，明确列出了其论文列表，可直接证明其与目标论文（//arxiv.org/abs/2505.054... |
| Mustafa Suleyman | //www.bbc.com/audio/play/m002nv8b | replace_source | The Interview \| Mustafa Suleyman, Artificial Intelligence pioneer - BBC (bbc.com) | 原始链接为BBC音频页面，但无内容。候选中有一个BBC官方音频页面（w3ct8c48），标题和描述明确包含人物姓名和访谈主题，可作为权威替换来源。其他候选要么不匹配原始链接，要么权威性不足或仅作辅助。 |
| Mustafa Suleyman | //x.com/mustafasuleyman/status/1985777196460622327 | replace_source | Mustafa Suleyman (mustafa-suleyman.ai) | 原始来源为社交媒体链接，缺乏实质内容。候选来源中，本人官方主页（mustafa-suleyman.ai）最权威，能直接证明其职位、作品及观点，适合作为替换来源。其他来源虽权威，但未直接关联原始推文。 |
| Mustafa Suleyman | //x.com/mustafasuleyman/status/1986433769046483430 | replace_source | Mustafa Suleyman (mustafa-suleyman.ai) | 原来源为社交媒体链接，无实质内容。候选中的本人官方主页（mustafa-suleyman.ai）权威、可访问，直接证明其职位、作品及观点，是理想的替换来源。 |
| Shane Legg | //x.com/ShaneLegg/status/1990846672608370840 | augment_source | Shane Legg - Nominating Committee \| The AI Safety Foundation (aisfoundation.ai)<br>Shane Legg \| TEDAI San Francisco (tedai-sanfrancisco.ted.com) | 原始来源（X/Twitter链接）无内容，需替换或补强。候选中有两个权威机构页面（AI Safety Foundation和TED）明确提供了Shane Legg的职位和背景信息，可作为可靠来源。其他候选多为媒体或博客，权威性不足或缺乏实... |
| Shane Legg | //x.com/ShaneLegg/status/1994438350262898713 | replace_source | The Arrival of AGI with Shane Legg (co-founder of DeepMind) (podcasts.musixmatch.com) | 原始来源仅为一个无内容的X链接。候选中，Google DeepMind官方播客的转录页面是最佳替代，它直接包含Shane Legg本人的访谈，明确其职位和关于AGI的观点，权威且可访问。 |
| Shane Legg | //x.com/ShaneLegg/status/1995550043890241688 | replace_source | Shane Legg \| TEDAI San Francisco (tedai-sanfrancisco.ted.com)<br>Shane Legg - Nominating Committee - The AI Safety Foundation (aisfoundation.ai) | 原始来源（X帖子链接）因无内容被拒绝。候选中，TEDAI和AI Safety Foundation页面是权威机构资料，直接证明Shane Legg的职位和背景，适合作为替换来源。其他候选多为社交、新闻或第三方内容，权威性不足。 |
| Shane Legg | //x.com/ShaneLegg/status/1999116798612881863 | replace_source | Shane Legg \| TEDAI San Francisco (tedai-sanfrancisco.ted.com)<br>Shane Legg - Nominating Committee - The AI Safety Foundation (aisfoundation.ai) | 原始来源（X/Twitter链接）无文本内容，已被拒绝。候选中TED官方活动页面和AI安全基金会页面均为权威机构资料，能直接证明Shane Legg的职位、研究方向和观点，适合作为替换来源。其他候选多为社交媒体或第三方内容，权威性不足。 |
| Shane Legg | //x.com/ShaneLegg/status/2001349255043424647 | replace_source | Shane Legg \| TEDAI San Francisco (tedai-sanfrancisco.ted.com)<br>Shane Legg - Nominating Committee - The AI Safety Foundation (aisfoundation.ai) | 原来源（X/Twitter链接）已失效且无内容。候选来源中，TED官方活动页面和AI安全基金会页面均直接、权威地证明了Shane Legg的职位和背景，符合替换要求。其他候选来源要么权威性不足，要么缺乏直接证据。 |
| Yann LeCun | Based on FAIR's V-JEPA 2. | replace_source | V-JEPA: The next step toward advanced machine intelligence (ai.meta.com)<br>Yann LeCun - AI at Meta (ai.meta.com) | 候选来源中，Meta官方博客和人物页面能直接、权威地证明Yann LeCun与FAIR及V-JEPA项目的关系，符合证据要求。其他来源要么权威性不足，要么缺乏直接关联，或需登录访问。 |
| 埃里克·霍维茨 | //arxiv.org/abs/2511.02687 | augment_source | 埃里克·霍维茨在人工智能的新时代 \| Microsoft Learn (learn.microsoft.com) | 候选来源中，微软官方Learn页面明确提及埃里克·霍维茨及其职位和观点，可作为权威补充来源。但原始问题中的论文链接（//arxiv.org/abs/2511.02687）在候选中未找到直接证明埃里克·霍维茨是作者的证据，因此需要进一步查询... |
| 埃里克·霍维茨 | //edhub.ama-assn.org/jn-learning/audio-player/19019635 | replace_source | 埃里克·霍维茨在人工智能的新时代 \| Microsoft Learn (learn.microsoft.com) | 候选来源中，learn.microsoft.com的页面直接关联埃里克·霍维茨及其观点，是权威的官方来源，可替换原弱匹配来源。其他候选要么不相关，要么未提及人物，或内容为空。 |
| 杰夫·迪恩 | An exciting new approach for doing continual learning, using nested optimization for enha... | no_good_source |  | 候选来源均未提及杰夫·迪恩，无法建立该观点与人物的直接关联。原始来源（推特）本身证据不足，且候选中无权威替代。需要更明确的个人归属来源。 |
| 科拉伊·卡武克丘奥卢 | //x.com/koraykv/status/1919770524177051687 | replace_source | Koray Kavukcuoglu - Google Blog (blog.google)<br>Koray Kavukcuoglu - Chessprogramming wiki (chessprogramming.org) | 原始来源（推文链接）内容过薄，无法作为权威依据。候选中的谷歌官方博客作者页是最佳替换，直接证明其职位和职责。Chessprogramming维基页面可作为补充，提供更详细的背景信息。其他候选均不相关或不符合要求。 |
| 马克·扎克伯格 | 马克·扎克伯格 on X | replace_source | Mark Zuckerberg, Founder, Chairman and Chief Executive Officer (meta.com) | 原始来源（X个人主页）因内容为空被拒绝。Meta官方领导层页面是权威、可访问的官方来源，能直接证明扎克伯格作为Meta创始人、董事长兼CEO的身份，符合替换要求。其他候选来源要么权威性不足，要么预览文本中缺乏直接证据。 |

## Execution Rule

- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.
- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.
- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.
