# Refetch Source by Search + MiMo

Generated at: 2026-06-10T15:23:07.680Z
Remediation input: docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch6.jsonl
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
| selected sources | 21 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 9 |
| augment_source | 6 |
| human_review | 3 |
| no_good_source | 2 |

## Selected Hosts

| Host | Count |
| --- | --- |
| podcasts.apple.com | 2 |
| profiles.stanford.edu | 2 |
| ted.com | 1 |
| en.wikipedia.org | 1 |
| time.com | 1 |
| research.google.com | 1 |
| simons.berkeley.edu | 1 |
| hai.stanford.edu | 1 |
| cs.stanford.edu | 1 |
| newyorker.com | 1 |
| forbes.com | 1 |
| wandb.ai | 1 |
| ai.meta.com | 1 |
| thetwentyminutevc.com | 1 |
| cs.mcgill.ca | 1 |
| cifar.ca | 1 |
| cdn.openai.com | 1 |
| microsoft.com | 1 |
| fellowsfund.substack.com | 1 |

## Sample Results

| Person | Target | Decision | Sources | Reason |
| --- | --- | --- | --- | --- |
| Mustafa Suleyman | Mustafa Suleyman: What is an AI anyway? \| TED Talk | augment_source | Mustafa Suleyman \| Speaker - TED Talks (ted.com)<br>What is an AI anyway? \| Mustaf… - TED Talks Daily - Apple Podcasts (podcasts.apple.com) | 原始TED演讲页面摘要过短，需补充权威来源。TED官方演讲者页面和Apple Podcasts页面均直接证明Mustafa Suleyman与TED演讲的关联，可增强证据。其他候选如NPR采访和Wikipedia可作辅助，但非直接替换。 |
| Noam Shazeer | Character.AI CEO Noam Shazeer returns to Google | augment_source | Noam Shazeer (en.wikipedia.org)<br>Noam Shazeer: The 100 Most Influential People in AI 2023 - TIME (time.com) | 原始TechCrunch来源抓取失败，但候选中维基百科和TIME页面能有效证明Noam Shazeer作为Character.AI CEO的身份及其与谷歌的关联，可作为补强来源。需要进一步搜索谷歌官方或Character.AI的正式公告以... |
| Oriol Vinyals | Oriol Vinyals – Engineering & Technology / Computer Science \| Google Inc. | replace_source | Oriol Vinyals - Research at Google (research.google.com) | 候选来源中，谷歌官方研究页面（research.google.com）最权威，直接证明Oriol Vinyals在Google的职位和研究身份，符合证据要求。其他来源要么权威性不足，要么文本预览未显示关键信息。 |
| Percy Liang | Jacob Steinhardt - Stanford Computer Science | replace_source | Jacob Steinhardt (simons.berkeley.edu) | 候选来源中，simons.berkeley.edu页面权威性高，且明确陈述了Jacob Steinhardt在斯坦福大学攻读博士期间师从Percy Liang，直接证明了两人之间的师生关系，符合证据要求。其他来源要么未提及两人关系，要么权... |
| Percy Liang | Percy Liang | replace_source | Percy Liang - Stanford Profiles (profiles.stanford.edu) | 原始来源（Schmidt Sciences页面）抓取内容不完整，有效信息少。候选来源中，斯坦福大学官方个人资料页（profiles.stanford.edu）权威性最高，内容完整，明确证明了Percy Liang的职位、所属机构和研究方向... |
| Percy Liang | Percy Liang – Stanford Artificial Intelligence Laboratory | replace_source | Percy Liang - Stanford Profiles (profiles.stanford.edu) | 原来源页面抓取内容不相关。候选中的斯坦福官方个人资料页（profiles.stanford.edu）是权威、可访问且直接证明其职位与所属机构的最佳来源，可完美替换原弱匹配来源。 |
| Percy Liang | Percy Liang on Machine Learning Robustness, Foundation ... | replace_source | Percy Liang - Stanford HAI (hai.stanford.edu)<br>Percy Liang - Stanford Computer Science (cs.stanford.edu) | 原始来源（Substack文章）抓取失败，内容不完整。候选中的斯坦福大学官方页面（HAI和CS系）提供了Percy Liang的权威职位、研究方向和领导角色，能直接证明其与机器学习鲁棒性、基础模型等主题的关联，是理想的替换来源。 |
| Sam Altman | What Sam Altman Doesn&#39;t Want You To Know | augment_source | Sam Altman May Control Our Future—Can He Be Trusted? (newyorker.com)<br>Sam Altman (forbes.com) | 原始来源（YouTube视频）标题党风格，信息价值存疑。候选中，《纽约客》的深度调查报道直接探讨了对Sam Altman的质疑，与原始标题主题高度吻合，可作为权威补充。福布斯资料页提供了人物基础信息的可靠来源。两者均可补强原始来源的薄弱之... |
| Shane Legg | When Might AI Outsmart Us? It Depends Who You Ask | human_review |  | 候选来源均未直接证明Shane Legg参与或引用目标文章《When Might AI Outsmart Us? It Depends Who You Ask》。播客和访谈页面提及Shane Legg讨论AGI，但未关联到该具体文章。目标... |
| Wojciech Zaremba | Wojciech Zaremba — What Could Make AI Conscious? | augment_source | Wojciech Zaremba — What Could Make AI Conscious? - Gradient Dissent: Conversations on AI - Apple Podcasts (podcasts.apple.com)<br>Wojciech Zaremba — What Could Make AI Conscious? \| gradient-dissent – Weights & Biases (wandb.ai) | 原始YouTube来源缺乏实质内容。候选中的Apple Podcasts页面和Weights & Biases报告页面均明确包含原始标题、嘉宾姓名及职位，能直接证明该内容与Wojciech Zaremba相关，可作为补充或替换来源。 |
| Yann LeCun | #397 - Yann Le Cun - Chief AI Scientist chez Meta - L'Intelligence Artificielle Générale ... | replace_source | Yann LeCun - AI at Meta (ai.meta.com) | 原始来源为播客页面，缺乏实质内容证明。Meta官方页面直接、权威地证实了Yann LeCun的职位，符合证据要求，可作为可靠替换来源。 |
| Yann LeCun | 20VC: Yann LeCun on Why Artificial Intelligence Will Not Dominate Humanity, Why No Econom... | replace_source | 20VC: Yann LeCun on Why Artificial Intelligence Will Not Dominate Humanity, Why No Economists Believe All Jobs Will Be Replaced by AI, Why the Size of Models Matters Less and Less & Why Open Models Beat Closed Models (thetwentyminutevc.com) | 原始来源为Apple Podcasts页面，缺乏实质内容。候选中的thetwentyminutevc.com是播客官方页面，明确包含Yann LeCun的职位、背景及播客主题，可作为权威替代。其他候选要么是第三方聚合，要么主题不完全匹配。 |
| Yoshua Bengio | &quot;I CREATED AI AND I&#39;M HERE TO WARN YOU&quot; | human_review |  | 所有候选来源均未直接提及原标题“I CREATED AI AND I'M HERE TO WARN YOU”。虽然多个来源涉及Yoshua Bengio对AI风险的警告，但无法确认原标题是本人言论的准确表述或官方访谈。需要更直接的证据，如... |
| 乔尔·皮诺 | Joelle Pineau | augment_source | Joelle Pineau's Home (cs.mcgill.ca)<br>Joelle Pineau – CIFAR (cifar.ca) | 原始来源（expertfile）内容薄弱。候选中，麦吉尔大学个人主页和CIFAR简介是权威的学术/机构来源，能直接证明其职位和研究身份，可作为补强。其他候选或因权威性不足、或因信息冲突、或因无法访问而被拒绝。 |
| 亚历克·拉德福德 | ‪Language Models are Unsupervised Multitask Learners‬ | replace_source | [PDF] Language Models are Unsupervised Multitask Learners \| OpenAI (cdn.openai.com) | 候选来源中，OpenAI官方PDF是唯一权威且直接的原始来源，明确列出了亚历克·拉德福德作为作者，完美满足证据要求。其他来源要么无关，要么是二手或非权威页面，不适合作为替换来源。 |
| 埃里克·霍维茨 | Eric Horvitz, MD, PhD \| PCAST \| The White House | replace_source | Eric Horvitz, Chief Scientific Officer (microsoft.com) | 微软官方研究员页面直接证明埃里克·霍维茨的职位（首席科学官）和AI研究背景，权威且相关，可替换原白宫PCAST页面。其他候选来源多为特定活动或角色介绍，非核心身份证明。 |
| 李开复 | 李开复的10句经典名言 | no_good_source |  | 所有候选来源均未直接证明“李开复的10句经典名言”这一具体条目。多数来源是关于李开复在AI领域的公司创办、观点或新闻报道，与名言无关。少数汇编类文章（如MBA智库、学术之家、大学生必备网、博客园）虽提及名言，但属于二次整理或个人博客，非原... |
| 李莲 | Lilian Weng - Distinguished Fellow | augment_source | Fellows Fund Welcomes Lilian Weng, ex-VP of Research, Safety at OpenAI, as New Distinguished Fellow (fellowsfund.substack.com) | 候选来源中，Fellows Fund的Substack官方公告直接、权威地证明了Lilian Weng担任Distinguished Fellow的职位，符合证据要求。其他来源要么权威性不足，要么内容不直接相关。 |
| 李飞飞 | The 100 Most Influential People in AI 2025 | human_review |  | 候选来源中，没有直接证明李飞飞入选TIME100 AI 2025的权威页面。原始TIME100 AI页面预览未显示其姓名，其他来源多为聚合页、分析文章或无关页面。需要进一步搜索其官方简介或可靠媒体采访。 |
| 桑达尔·皮查伊 | Britannica Money | no_good_source |  | 所有候选来源均未能直接证明“桑达尔·皮查伊”与“Britannica Money”页面的关系。权威性高的来源（如BBC）未在摘要中提及人物姓名；百科类来源（如MBA智库、维基）权威性不足且主题不匹配；其他页面完全无关。需要更直接的官方或权... |

## Execution Rule

- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.
- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.
- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.
