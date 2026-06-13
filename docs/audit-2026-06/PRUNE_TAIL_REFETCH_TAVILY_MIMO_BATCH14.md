# Refetch Source by Search + MiMo

Generated at: 2026-06-10T17:49:44.082Z
Remediation input: docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch14.jsonl
Search provider: tavily
Model: mimo-v2.5-pro

## Counts

| Metric | Value |
| --- | --- |
| selected tasks | 20 |
| existing rows reused | 0 |
| pending tasks | 0 |
| refetch results | 20 |
| source candidates | 193 |
| selected sources | 26 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 8 |
| augment_source | 6 |
| human_review | 3 |
| no_good_source | 3 |

## Selected Hosts

| Host | Count |
| --- | --- |
| greylock.com | 3 |
| zh.wikipedia.org | 2 |
| nlp.stanford.edu | 2 |
| forbes.com | 2 |
| fortune.com | 2 |
| podcasts.apple.com | 1 |
| ainext.tw | 1 |
| time.com | 1 |
| anthropic.com | 1 |
| therundown.ai | 1 |
| sources.news | 1 |
| deepmind.google | 1 |
| stability.ai | 1 |
| voicebot.ai | 1 |
| cloudwars.com | 1 |
| cs.mcgill.ca | 1 |
| mila.quebec | 1 |
| entrepreneur.com | 1 |
| singjupost.com | 1 |
| papers.nips.cc | 1 |

## Sample Results

| Person | Target | Decision | Sources | Reason |
| --- | --- | --- | --- | --- |
| 阿希什·瓦斯瓦尼 | Thank you! This work was led by @ishaankshah , @ampolloreno , Karl and Philip! | augment_source | 阿西什·瓦斯瓦尼 - 维基百科，自由的百科全书 (zh.wikipedia.org) | 原推文内容简短，信息价值有限。维基百科页面提供了人物权威背景和主要贡献，可作为补充来源，增强信息深度。但维基百科为二级来源，不能完全替代原推文，因此选择增强而非替换。 |
| 阿希什·瓦斯瓦尼 | Thanks to @Divyasmansingka for operational support. | human_review |  | 候选来源中，维基百科页面提供了人物背景信息，但属于辅助线索，不能作为替换来源。其他页面要么与人物无关，要么权威性不足。原始来源（推文）内容过于简单，仅表达感谢，与AI相关性模糊，需要更权威的来源来证明人物身份或贡献。 |
| 阿希什·瓦斯瓦尼 | Tremendous effort by the @essential_ai team! | augment_source | 阿西什·瓦斯瓦尼 - 维基百科，自由的百科全书 (zh.wikipedia.org) | 原始推文缺乏上下文，维基百科页面能补强阿希什·瓦斯瓦尼与Essential AI的创办人关系，从而解释他为何称赞该团队。但维基百科是辅助来源，不能作为唯一依据，需进一步寻找更权威的官方资料。 |
| 雅各布·乌什科雷特 | ** Very brief positive reaction in an AI/tech nostalgia context (reply to discussion invo... | no_good_source |  | 候选来源均未提及目标人物雅各布·乌什科雷特，无法证明其与AI怀旧讨论的关联。原始来源为简短社交互动，信息密度低，但候选中无更权威的替代来源。建议进一步搜索人物官方资料或可靠访谈。 |
| 雅各布·乌什科雷特 | //x.com/kyosu/status/1409163620550860800 | augment_source | The AI Pioneer Developing New Kinds of Medicine - Apple Podcasts (podcasts.apple.com)<br>雅各布・烏茲科雷特Jakob Uszkoreit - AINEXT (ainext.tw) | 原始来源（X推文）缺乏具体内容，无法验证。候选中，Apple Podcasts和AINEXT资料页均明确提及人物身份、Transformer论文贡献及当前职位，可有效补强人物背景信息，替代或补充原始来源。 |
| Andrej Karpathy | LLM Council: Andrej Karpathy’s AI for Reliable Answers | human_review |  | 候选来源均未直接证明Andrej Karpathy本人创建或正式推广了“LLM Council”项目。多数为第三方讨论、集成文档或无关内容。需要更权威的来源，如其官方博客、GitHub仓库或可靠媒体采访，以确认其与该项目的关联。 |
| Chris Olah | https://cdn.openai.com/papers/gpt-4.pdf | replace_source | Chris Olah: The 100 Most Influential People in AI 2024 - TIME (time.com)<br>Anthropic co-founder Chris Olah's remarks on Pope Leo XIV's encyclical "Magnifica humanitas" (anthropic.com) | 原来源GPT-4技术报告无法直接证明Chris Olah的个人贡献。候选中的TIME人物简介和Anthropic官方新闻页均能权威、直接地证明其身份、职位及在AI安全/伦理领域的观点，适合作为替换来源。 |
| Christopher Manning | Stanford AI Lab Papers and Talks at EMNLP 2024 | replace_source | Christopher Manning: Papers and publications (nlp.stanford.edu)<br>Christopher Manning, Stanford NLP (nlp.stanford.edu) | 原始来源（SAIL博客）未直接关联Christopher Manning个人，仅列出实验室整体论文。候选来源中，Manning的官方论文列表和个人主页是权威的个人资料来源，能直接证明其学术身份和产出，适合作为替代来源。其他候选来源虽提及M... |
| Demis Hassabis | A new era of intelligence with Gemini 3 | augment_source | Exclusive interview with Google DeepMind CEO Demis Hassabis (therundown.ai)<br>Demis Hassabis on Gemini 3, world models, and the AI bubble (sources.news) | 原始来源是谷歌产品公告，与Hassabis个人关联弱。候选中有两个来源（therundown.ai和sources.news）明确将Hassabis与Gemini 3发布通过采访形式直接关联，可作为补强来源，增强人物与作品的关联性。 |
| Demis Hassabis | AlphaFold reveals the structure of the protein universe | replace_source | AlphaFold reveals the structure of the protein universe — Google DeepMind (deepmind.google) | 原始来源被拒是因为内容聚焦技术而非人物。候选中的官方博客（deepmind.google/blog/alphafold-reveals-the-structure-of-the-protein-universe）由Hassabis本人撰写... |
| Elon Musk | Elon Musk's record $447 billion fortune means he's nearly $200 billion ahead of Jeff Bezo... | no_good_source |  | 候选来源均为财富比较的新闻报道或维基百科页面，内容与AI/科技相关性弱，且缺乏官方主页、机构资料页等权威来源。无法满足证据要求中对直接证明人物与作品/观点/职位关系的需求。 |
| Emad Mostaque | Expanding Our Leadership Team: Meet Some Of Our New Team Members — Stability AI | augment_source | Stability AI Announcement — Stability AI (stability.ai)<br>Stable Diffusion's AI Benefactor Has A History Of Exaggeration (forbes.com) | 原始来源未聚焦Emad Mostaque本人，但候选中有官方公告和权威媒体报道可补强其领导角色。Forbes文章虽涉及争议，但直接关联其职位；官方公告明确其辞职信息。两者结合可增强证据链。 |
| Greg Brockman | Summarizing books with human feedback | human_review |  | 所有候选来源均未直接证明 Greg Brockman 与 'Summarizing books with human feedback' 这一特定工作的关联。虽然部分来源（如 OpenAI 博客）是权威的，但未提及他本人。需要更精确的来源... |
| Greg Brockman | They are admitting[1] that the new model is the gpt2- ... | no_good_source |  | 候选来源均未提供直接证据证明Greg Brockman承认了原始声明中提到的特定模型（gpt2-）。来源多为一般性采访、职位描述或公司新闻，无法替换或补强原始弱匹配来源。需要更具体的、直接引用相关承认的来源。 |
| Mustafa Suleyman | A New Paradigm in Human-Machine Interaction | replace_source | DeepMind and LinkedIn Co-Founders Unveil New Conversational AI Startup Inflection AI - Voicebot.ai (voicebot.ai)<br>Mustafa Suleyman - Greylock Partners (greylock.com) | 原来源仅为机构通用页面，未涉及人物具体信息。候选来源中，Voicebot.ai文章和Greylock官方资料页均直接、权威地证明了Mustafa Suleyman作为Inflection AI联合创始人兼CEO的角色，且Inflectio... |
| Mustafa Suleyman | Privacy and Scalability for Web3 | replace_source | Welcome, Mustafa Suleyman - Greylock Partners (greylock.com)<br>Mustafa Suleyman - Greylock Partners (greylock.com) | 原来源内容与Mustafa Suleyman无关，候选中两个Greylock官方页面直接证明其职位，可替换原来源。其他候选未直接关联Web3或隐私，不适用。 |
| Mustafa Suleyman | Towards Humanist Superintelligence - Microsoft AI | replace_source | Mustafa Suleyman Outlines Microsoft’s Vision for Human-Centered Superintelligence - Cloud Wars (cloudwars.com)<br>Microsoft, freed from reliance on OpenAI, joins the race for ‘superintelligence’—and AI chief Mustafa Suleyman wants to ensure it serves humanity \| Fortune (fortune.com) | 原始来源（微软AI博客）未明确提及Suleyman本人，导致人物关联弱。候选来源中，Cloud Wars文章直接引用并阐述了Suleyman的观点，Fortune文章提供了权威的第三方报道，两者均能有效补强人物与作品/观点的关系，适合作为... |
| 乔尔·皮诺 | Joelle Pineau, Vice President of AI Research and Head of FAIR at Meta \| Meta | replace_source | Joelle Pineau's Home (cs.mcgill.ca)<br>Joelle Pineau \| Mila (mila.quebec) | 原始来源（Meta高管页面）正文缺乏对目标人物的介绍。候选来源中，麦吉尔大学个人主页和Mila目录页均为权威机构官方资料，明确列出了其职位、研究领域及与Meta的关联，可直接证明人物身份与职位关系，是理想的替换来源。 |
| 桑达尔·皮查伊 | Sundar Pichai’s Success Story: From Highest Paid CEO To ‘Rare’ Billionaire Status | augment_source | Google CEO Sundar Pichai's $692M pay package hinges on two Google moonshots \| Fortune (fortune.com)<br>Google CEO Sundar Pichai Is a Billionaire for the First Time (entrepreneur.com)<br>Sundar Pichai (forbes.com) | 原始来源质量低且主题偏离。候选中Fortune、Entrepreneur、Forbes和播客转录提供了关于皮查伊薪酬、财富和职位的权威、直接证据，可有效补强其职业成就和财富故事的叙述。 |
| 阿希什·瓦斯瓦尼 | Papers with Code - Ashish Vaswani | replace_source | Attention is All you Need (papers.nips.cc) | 原始来源为Papers with Code的搜索结果页，未聚焦人物本人。候选中的NeurIPS论文详情页是权威的官方学术来源，直接证明阿希什·瓦斯瓦尼作为Transformer论文第一作者的身份，符合替换要求。 |

## Execution Rule

- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.
- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.
- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.
