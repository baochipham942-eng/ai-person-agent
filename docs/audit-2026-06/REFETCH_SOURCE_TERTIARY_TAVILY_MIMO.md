# Refetch Source by Search + MiMo

Generated at: 2026-06-10T08:13:27.847Z
Remediation input: docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_tertiary_queue.jsonl
Output: docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_tertiary_tavily_mimo.jsonl
Search provider: tavily
Model: mimo-v2.5-pro

## Counts

| Metric | Value |
| --- | --- |
| selected tasks | 27 |
| existing rows reused | 0 |
| pending tasks | 0 |
| refetch results | 27 |
| source candidates | 270 |
| selected sources | 8 |

## Decisions

| Decision | Count |
| --- | --- |
| no_good_source | 21 |
| replace_source | 3 |
| augment_source | 3 |

## Selected Hosts

| Host | Count |
| --- | --- |
| amazon.com.au | 1 |
| podcasts.apple.com | 1 |
| en.wikipedia.org | 1 |
| chuangxin.com | 1 |
| zh.wikipedia.org | 1 |
| edge.org | 1 |
| hub.baai.ac.cn | 1 |
| sohu.com | 1 |

## Sample Results

| Person | Target | Decision | Sources | Reason |
| --- | --- | --- | --- | --- |
| Andrej Karpathy | The Wisdom Hidden in Plain Sight: What Andrej Karpathy Reveals About Our AI Future | no_good_source |  | 所有候选来源均未直接证明Andrej Karpathy与目标文章《The Wisdom Hidden in Plain Sight》的关联。来源多为第三方转录、评论或仅提及姓名，缺乏权威原始发布。需要寻找Karpathy本人官方博客、原始... |
| Christopher Manning | Toward expert-level medical question answering with large language models | no_good_source |  | 所有候选来源均未提供Christopher Manning是目标文章作者或贡献者的直接证据。斯坦福个人主页内容与目标文章无关，其他候选来源均为相关领域论文，但作者列表中均无Manning。需要更精确的查询来定位包含其姓名的作者列表或贡献声... |
| Yann LeCun | AI on a CALCULATOR? (Without Internet) \| Yann LeCun \| 36 comments | no_good_source |  | 所有候选来源均无法直接证明原始LinkedIn帖子（AI on a CALCULATOR?）是否为Yann LeCun本人发布或与其相关。候选来源要么是通用采访、奖项页面、旧博客文章，要么是其他用户对LeCun观点的转述，缺乏直接、权威的... |
| 凯文·斯科特 | Kevin Scott (@kevin_scott) | replace_source | Amazon.com.au: Kevin Scott: books, biography, latest update (amazon.com.au)<br>Behind The Tech with Kevin Scott - 播客 - Apple 播客 (podcasts.apple.com) | 原始Instagram来源因乱码无法验证。候选来源中，亚马逊作者页和苹果播客页面均明确、权威地证明了凯文·斯科特是微软CTO，符合替换要求。其他候选来源要么身份不匹配，要么权威性不足。 |
| 刘知远 | Chinese Tiny LLM: Pretraining a Chinese-Centric Large Language Model | no_good_source |  | 候选来源中，没有一个页面包含目标论文的作者列表或明确提及刘知远参与该论文。虽然多个来源证实了刘知远的学者身份和研究领域，但无法建立他与《Chinese Tiny LLM》这篇具体论文的直接关联。需要找到包含完整作者列表的论文详情页或官方项... |
| 刘知远 | Scaling Latent Reasoning via Looped Language Models | no_good_source |  | 所有候选来源均未提供刘知远与目标论文《Scaling Latent Reasoning via Looped Language Models》的直接证据。来源多为刘知远的个人主页、其他论文报道、课程介绍或一般性访谈，无法证明其参与该特定论... |
| 吴恩达 | Opening a new chapter of my work in AI - Andrew Ng - Medium | no_good_source |  | 候选来源均不符合要求。它们要么是聚合/目录页面，要么是第三方新闻报道，要么是无关内容（如电子书、演讲），要么是二手资料（如Wikipedia）。没有找到能直接证明吴恩达本人撰写目标Medium文章的权威、可访问的原始来源。 |
| 吴恩达 | https://arxiv.org/pdf/2303.18223.pdf | no_good_source |  | 候选来源均无法证明吴恩达与目标论文《A Survey of Large Language Models》（arXiv:2303.18223）存在任何关联。这些来源是新闻、课程或标签页，未提供论文作者列表或致谢信息。原始来源因缺少人名被标记... |
| 吴恩达 | Andrew Ng - Wikipedia, the free encyclopedia | augment_source | Andrew Ng (en.wikipedia.org) | 原始来源为Wikipedia存档页面，内容不可用。候选中的英文维基百科页面（en.wikipedia.org/wiki/Andrew_Ng）是权威、可访问的来源，内容全面，能直接证明吴恩达的教育背景、职位和主要成就，完全满足证据要求，可替... |
| 周伯文 | ViPER: Empowering the Self-Evolution of Visual Perception Abilities in Vision-Language Mo... | no_good_source |  | 候选来源中，周伯文的官方主页和履历页面均未提及ViPER论文。ViPER论文的作者列表（如OpenReview PDF）中未包含周伯文。其他来源（如新闻、论坛）也未建立周伯文与该论文的直接联系。因此，无法找到权威证据证明周伯文是ViPER... |
| 周伯文 | GitHub - RUC-NLPIR/WebThinker | no_good_source |  | 所有候选来源均未提供周伯文与WebThinker项目直接相关的证据。前三个来源是周伯文的通用简介页面，未提及WebThinker。第四个来源是上海AI实验室的新闻，内容无关。第五个来源是人大NeurIPS录用新闻，未提及周伯文或WebTh... |
| 周伯文 | WeLM: A Well-Read Pre-trained Language Model for Chinese | no_good_source |  | 候选来源均未提供周伯文与WeLM论文的直接关联证据。需要搜索论文本身的作者列表或贡献说明，以确认周伯文是否为作者或贡献者。 |
| 周伯文 | Weaver: Foundation Models for Creative Writing | no_good_source |  | 候选来源中，arXiv PDF及Semantic Scholar页面明确列出了论文作者列表，其中不包含周伯文。其他来源（如东方财富网、BAAI Hub）仅提及周伯文的其他研究或职位，与目标论文无关。无法确认周伯文与该论文的直接关联。 |
| 周明 | Computer Science > Computation and Language | no_good_source |  | 所有候选来源均未能直接证明周明是MiroThinker论文的作者。论文作者列表为团队名称“MiroMind Team”，未提供个人姓名。其他来源要么未提及周明，要么是无关的同名人物。需要更精确的查询，例如搜索周明与MiroMind团队的关... |
| 周明 | Ming-UniVision: Joint Image Understanding and Generation with a Unified Continuous Tokeni... | no_good_source |  | 所有候选来源均无法证明周明是论文'Ming-UniVision'的作者。论文作者列表中无'周明'或'Ming Zhou'，仅有'Ming Yang'和'Jun Zhou'。Google Scholar主页未显示与该论文的关联。其他来源为机... |
| 周明 | Molly: Making Large Language Model Agents Solve Python Problem More Logically | no_good_source |  | 所有候选来源均无法直接证明周明是目标论文'Molly'的作者。权威来源仅证明其身份和职位，但未关联到具体论文。论文详情页（arXiv）的预览文本未显示作者列表包含周明。需要更精确的来源，如论文详情页的完整作者列表或作者个人主页。 |
| 周明 | Ming Zhou (周明) | replace_source | 首席科学家 - 创新工场 (chuangxin.com) | 原始来源（Google Scholar）因系统错误无法访问。候选来源中，创新工场官方页面是权威、可访问的一手资料，明确证明了周明博士作为AI领域知名科学家的身份、职位及主要贡献，完全符合证据要求。其他候选来源要么人物不符，要么领域不符，要... |
| 季逸超 | Yichao “Peak” Ji developed Manus, one of the buzziest AI ... | augment_source | 季逸超- 維基百科，自由的百科全書 (zh.wikipedia.org) | 维基百科页面提供了关于季逸超作为Manus开发者的明确、权威信息，直接满足证据要求，可替换原Facebook帖子。其他候选来源虽提及人物，但权威性或直接性不足。 |
| 戴文渊 | Qwen-VL: A Versatile Vision-Language Model for Understanding, Localization, Text Reading,... | no_good_source |  | 所有候选来源均无法证明戴文渊在Qwen-VL项目中的具体角色。论文作者列表中没有他，其他报道或页面要么未提及该项目，要么未将他与该项目关联。缺乏权威的官方信息（如论文作者列表、机构任命公告）来满足证据要求。 |
| 李开复 | Kai-Fu Lee \| Edge.org | replace_source | We Are Here To Create \| Edge.org (edge.org) | 候选来源中，Edge.org的对话页面明确包含李开复的姓名和对话标题，直接证明他作为参与者与Edge.org的关联，符合权威、可访问的要求。维基百科等页面虽提及李开复，但非Edge.org官方来源，无法替代或补强原始来源中缺失的会员身份证... |
| 李飞飞 | Human-like object concept representations emerge naturally in multimodal large language m... | no_good_source |  | 所有候选来源均无法证明李飞飞参与目标论文。Wikipedia是通用资料页，未提及该论文。Nature和arXiv的论文页面预览文本中未显示作者列表，无法确认李飞飞是否在作者之列。其他来源与目标论文无关。因此，没有可用来源替换或补强。 |
| 李飞飞 | Artificial Intelligence Index Report 2025 | augment_source | 刚刚，李飞飞团队发布《2025年人工智能指数报告》：12大趋势证明，AI不再只是关于可能性的故事 - 智源社区 (hub.baai.ac.cn)<br>产业之声 \| 斯坦福HAI《2025年人工智能指数报告》解读_模型_Qwen-VL-Max_全球 (sohu.com) | 候选来源中，智源社区和搜狐的文章明确指出报告由李飞飞联合领导的斯坦福HAI发布，直接证明了其领导角色，可补强原来源中缺失的人物姓名和具体贡献信息。其他来源要么未提及李飞飞，要么权威性不足或与报告无直接关联。 |
| 汤姆·布朗 | AI And The Limits Of Language | no_good_source |  | 所有候选来源均未直接证明汤姆·布朗是《AI And The Limits Of Language》的作者或与该文章有明确关联。Semantic Scholar页面仅显示其为GPT-3论文作者，但未提及目标文章。其他来源与目标人物和作品无关... |
| 李飞飞 | On the Societal Impact of Open Foundation Models | no_good_source |  | 所有候选来源均无法证明李飞飞参与了目标论文。权威来源（如arXiv、CRFM项目页）的作者列表中未包含李飞飞。CRFM研讨会页面仅显示她作为主持人，而非论文作者。没有可靠证据表明李飞飞是《On the Societal Impact of... |
| 汤姆·布朗 | AI models collapse when trained on recursively generated data | no_good_source |  | 所有候选来源均未提及目标人物汤姆·布朗。论文作者列表显示为Ilia Shumailov等人，未出现Tom Brown。新闻报道和机构页面也未引用其观点或贡献。无法建立人物与作品的关联，证据不足。 |
| 汤姆·布朗 | Carney researchers show that large language models can reproduce mechanisms found in the ... | no_good_source |  | 所有候选来源均未提及目标人物“汤姆·布朗”与原始声明中关于大型语言模型与人脑机制研究的具体关联。耶鲁的Thomas E. Brown是ADHD专家，剑桥的Thomas Brown研究方向不同，其他页面均为通用介绍或未包含目标人物信息。无法... |
| 黄铁军 | Steel-LLM:From Scratch to Open Source -- A Personal Journey in Building a Chinese-Centric... | no_good_source |  | 候选来源均为黄铁军的个人资料、演讲报道或无关的AI讨论，没有一个来源包含目标论文《Steel-LLM》的标题、作者列表或任何直接关联信息。无法用这些来源替换或补强原始来源中缺失的作者证明。 |

## Execution Rule

- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.
- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.
- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.
