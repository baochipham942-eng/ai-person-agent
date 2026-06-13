# Refetch Source by Search + MiMo

Generated at: 2026-06-10T04:13:10.922Z
Remediation input: docs/audit-2026-06/data/exa_source_quality_review_dir/fact_claim_remediation_exa_source_quality_mimo.jsonl
Output: docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_exa_mimo.jsonl
Search provider: tavily
Model: mimo-v2.5-pro

## Counts

| Metric | Value |
| --- | --- |
| selected tasks | 490 |
| existing rows reused | 490 |
| pending tasks | 0 |
| refetch results | 490 |
| source candidates | 2799 |
| selected sources | 565 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 358 |
| augment_source | 71 |
| no_good_source | 39 |
| human_review | 22 |

## Selected Hosts

| Host | Count |
| --- | --- |
| youtube.com | 21 |
| arxiv.org | 20 |
| hub.baai.ac.cn | 16 |
| openreview.net | 11 |
| research.google | 10 |
| en.wikipedia.org | 10 |
| tsinghua.edu.cn | 8 |
| cloud.tencent.com | 8 |
| blog.google | 8 |
| time.com | 7 |
| jasonwei.net | 7 |
| ted.com | 7 |
| podcasts.apple.com | 7 |
| hai.stanford.edu | 7 |
| m.36kr.com | 7 |
| cnbc.com | 6 |
| qbitai.com | 6 |
| cs.stanford.edu | 5 |
| technologyreview.com | 5 |
| aclanthology.org | 5 |
| linkedin.com | 5 |
| ai.meta.com | 5 |
| cs.mcgill.ca | 5 |
| scholar.google.com | 5 |
| m.bjnews.com.cn | 5 |
| finance.sina.com.cn | 5 |
| github.com | 4 |
| nlp.stanford.edu | 4 |
| techcrunch.com | 4 |
| cs.toronto.edu | 4 |

## Sample Results

| Person | Target | Decision | Sources | Reason |
| --- | --- | --- | --- | --- |
| Aidan Gomez | Humans behind AI: Aidan Gomez | replace_source | Aidan Gomez \| Computer Science & Mathematics (aidangomez.ca)<br>Attention Is All You Need (arxiv.org) | 原始来源（McKinsey页面）内容泛泛，无法验证具体贡献。候选来源中，本人官方主页（aidangomez.ca）和Transformer原始论文（arXiv）是权威、可访问的一手来源，能直接、明确地证明Aidan Gomez作为Cohe... |
| Aidan Gomez | Aidan Gomez's Publishings \| Computer Science & Mathematics | replace_source | Aidan Gomez: The 100 Most Influential People in AI 2023 (time.com)<br>Cohere CEO and ex-Google researcher Aidan Gomez on how AI makes money (cnbc.com) | 原始来源已过时且权威性弱。候选中的TIME和CNBC页面均为权威媒体，直接、明确地证明了Aidan Gomez作为Cohere CEO/联合创始人及Transformer论文共同作者的身份，满足证据要求，可完全替换原来源。 |
| Aidan Gomez | Aidan Gomez | augment_source | Aidan Gomez \| Computer Science & Mathematics (aidangomez.ca) | 原始来源（Google Scholar）因加载失败且为索引页而无效。候选中的个人主页（aidangomez.ca）是权威的官方来源，能直接证明其职位、教育背景和研究经历，可作为主要补充来源。其他Google Scholar链接因同样问题被... |
| Aidan Gomez | Inside the Paper That Changed AI Forever - Cohere CEO ... | replace_source | Synthetic Data and the Future of AI \| Cohere CEO Aidan Gomez (youtube.com)<br>Cohere CEO Aidan Gomez sees AI’s pathway to profitability \| The Verge (theverge.com) | 候选来源中，两个YouTube视频和一篇The Verge文章均明确包含目标人物Aidan Gomez的姓名、职位（Cohere CEO）及相关讨论主题，内容权威且可访问。原始来源因内容过薄被替换。其他候选因访问受限被拒绝。 |
| Aidan Gomez | Aidan Gomez – Medium | replace_source | How We’re Getting AI Risk Wrong (cohere.com) | 原来源（Medium主页）缺乏足够上下文。候选中的Cohere官方博客文章是最佳替代，它直接来自Aidan Gomez的公司，明确标注其职位和作者身份，权威且可访问，能直接证明人物与观点的关系。 |
| Alexandr Wang | 5 things to know about tech mogul Alexandr Wang, world’s youngest self-made billionaire | replace_source | From MIT dropout to AI mogul: how the world’s youngest self-made tech billionaire Alexandr Wang builds data empire - VnExpress International (e.vnexpress.net) | 原始来源（VnExpress）内容预览不足，存在弱匹配问题。候选中的英文版VnExpress文章标题和预览直接、明确地描述了Alexandr Wang的身份（MIT辍学生、最年轻白手起家亿万富翁）及其公司（Scale AI），信息权威且相... |
| Alexandr Wang | Alexandr Wang \| Substack: Rational in the Fullness of Time | augment_source | The AI War and How to Win It - by Alexandr Wang (alexw.substack.com) | 原始来源为Substack主页，内容不足。候选中有一篇由Alexandr Wang撰写的具体文章，标题和预览明确展示其观点，可补强来源。其他候选页面信息过于泛泛或缺乏实质内容。 |
| Andrej Karpathy | The LLM Operating System, as Elucidated by Andrej Karpathy in the Introduction to Large L... | no_good_source |  | 候选来源均为LinkedIn上的第三方文章或帖子，属于社交媒体/UGC，权威性不足，且存在登录墙，无法直接验证内容。原始来源也存在同样问题。需要寻找更权威的来源，如Karpathy的官方演讲视频、转录或其个人网站/博客上的相关内容。 |
| Andrej Karpathy | Why an AI Pioneer Says LLMs Are Like ‘People Spirits’ Trapped in Your Computer | augment_source | Andrej Karpathy: Software Is Changing (Again) Notes \| by bingwu1995 \| Medium (medium.com) | 原Medium来源质量弱，无法确认“AI Pioneer”是否指代Andrej Karpathy。候选来源中，一篇Medium笔记直接引用了Karpathy关于“people spirits”的原话，并提供了其职位信息，可作为补强来源。Y... |
| Andrej Karpathy | Software in the AI Era: Andrej Karpathy’s 3 Programming Paradigms | replace_source | Andrej Karpathy: Software Is Changing (Again) (youtube.com) | 原始来源为弱匹配的第三方博客。候选中，Y Combinator官方YouTube视频是Andrej Karpathy本人演讲的权威一手来源，标题和描述直接证明其观点，可完美替换并补强证据。 |
| Andrej Karpathy | The Wisdom Hidden in Plain Sight: What Andrej Karpathy Reveals About Our AI Future | no_good_source |  | 所有候选来源均为LinkedIn上的用户生成内容，权威性不足，且预览文本无法证明内容与Andrej Karpathy的直接关联或观点阐述。需要寻找更权威的官方或学术来源。 |
| Andrej Karpathy | How I use LLMs | replace_source | How I use LLMs (youtube.com) | 原始视频页面（候选1）的作者字段和描述已明确证明Andrej Karpathy是视频创作者，满足证据要求，可直接替换原来源。 |
| Andrej Karpathy | Andrej Karpathy | no_good_source |  | 所有候选来源都是Google Scholar的镜像或变体页面，且预览内容均显示加载失败，无法提供可访问的、能直接证明Andrej Karpathy学术身份或贡献的有效信息。这些页面本质上是搜索/索引页面，不符合权威、可访问的要求。 |
| Andrej Karpathy | Andrej Karpathy - Home | replace_source | Andrej Karpathy (karpathy.ai)<br>Andrej Karpathy Academic Website (cs.stanford.edu) | 原来源为ACM通用目录页，无法证明人物身份。候选中 karpathy.ai 是其本人官方主页，斯坦福页面是权威学术履历页，两者均能直接、可靠地关联Andrej Karpathy本人及其工作，完全满足证据要求。 |
| Andrej Karpathy | Andrej Karpathy | replace_source | Let's build GPT: from scratch, in code, spelled out. (youtube.com)<br>[1hr Talk] Intro to Large Language Models (youtube.com) | 候选来源中，多个具体视频页面（如关于GPT构建和LLM入门的讲座）明确显示作者为Andrej Karpathy，并提供了详细的标题和描述，直接证明其在YouTube上发布的内容主题和成就。这些页面能有效替换原始来源中缺乏具体上下文的频道主... |
| Arthur Mensch | Arthur Mensch - Google 学术搜索 | replace_source | Arthur Mensch – Parietal (team.inria.fr)<br>Arthur Mensch - Home (dl.acm.org) | 原始来源为Google Scholar索引页，缺乏直接描述。候选中的Inria团队页面和ACM作者主页均为权威机构提供的官方个人资料，能直接证明其学术身份和研究贡献，符合替换要求。 |
| Arthur Mensch | Arthur Mensch | replace_source | Arthur Mensch – Parietal (team.inria.fr)<br>Arthur Mensch (@arthurmensch) (github.com) | 原始来源为Google Scholar索引页，无法直接证明人物身份与贡献。候选来源中，Inria团队页面提供了其早期学术背景，GitHub主页则直接证明了其作为Mistral AI联合创始人兼CEO的当前职位，两者结合能有效补强证据链。 |
| Andrej Karpathy | [1hr Talk] Intro to Large Language Models | replace_source | [1hr Talk] Intro to Large Language Models (youtube.com) | 原始来源缺失人物姓名，但候选中的同一YouTube视频页面元数据已明确显示作者为Andrej Karpathy，满足证据要求，可直接替换。 |
| Andrej Karpathy | LLM - Detailed dive into LLM w Andrej Karpathy | replace_source | llm-wiki · GitHub (gist.github.com) | 原始来源（Obsidian笔记）证据不足。最佳替换来源是Karpathy本人在GitHub Gist上发布的原始文档，它直接、权威地证明了其LLM Wiki方法。其他候选均为第三方解读或实现，权威性不足。 |
| Andrej Karpathy | LLM Council: Andrej Karpathy’s AI for Reliable Answers | replace_source | karpathy/llm-council (github.com) | GitHub仓库是Andrej Karpathy本人维护的官方项目页面，直接证明了他创建并贡献于LLM Council项目，权威性高且可访问。其他候选来源均为第三方报道或用户生成内容，无法作为替换原始弱匹配来源的可靠依据。 |
| Andrej Karpathy | karpathy’s gists | replace_source | Minimal character-level language model with a Vanilla Recurrent Neural Network, in Python/numpy · GitHub (gist.github.com) | 原始来源（karpathy’s gists）是目录页，缺乏明确人物姓名。候选中第一个Gist页面标题和作者信息明确，能直接证明账户归属，适合作为替换来源。其他候选页面证据较弱，仅作辅助。 |
| Arthur Mensch | Mistral CEO thinks the world will move beyond AI models ... | replace_source | Mistral CEO thinks the world will move beyond AI models this year (cnbc.com) | 原始来源虽为新闻文章，但文本预览不足。候选来源中的第一项提供了完整的标题、权威信号和包含人物姓名、职位及具体观点的文本摘录，足以替换原始来源，直接证明Arthur Mensch的观点。 |
| Arthur Mensch | Arthur Mensch \| Innovators Under 35 | replace_source | Arthur Mensch \| MIT Technology Review (technologyreview.com) | 候选来源中，MIT Technology Review的页面权威性高，内容直接关联Arthur Mensch的身份与贡献，可有效替换原始弱匹配来源。其他候选或内容不完整，或权威性稍逊。 |
| Arthur Mensch | Jensen Huang & Arthur Mensch: Why Every Nation Needs Its ... | replace_source | Jensen Huang, Anjney Midha and Arthur Mensch on Winning the Global AI Race \| Andreessen Horowitz (a16z.com) | 候选来源中，a16z.com页面为权威机构官方发布，明确证明Arthur Mensch作为Mistral CEO参与讨论主权AI，符合证据要求。其他来源或权威性不足，或信息不完整。 |
| Arthur Mensch | Jensen Huang and Arthur Mensch… ‑ The a16z Show | replace_source | Jensen Huang, Anjney Midha and Arthur Mensch on Winning the Global AI Race \| Andreessen Horowitz (a16z.com) | 候选来源中，a16z.com官方页面权威性最高，明确证明Arthur Mensch作为Mistral CEO参与播客讨论，符合证据要求。其他来源虽提及人物，但权威性或内容深度不足，不适合作为唯一依据。 |
| Chris Olah | Understanding LSTM Networks | replace_source | Understanding LSTM Networks -- colah's blog (colah.github.io) | 候选来源中，colah.github.io 是Christopher Olah的官方个人博客，文章标题和发布日期明确，直接证明他是《Understanding LSTM Networks》的作者，满足证据要求。其他来源要么是机构页面，要么... |
| Arthur Mensch | Mistral CEO Arthur Mensch’s praises DeepSeek’s open source approach | replace_source | France’s great AI hope sees opportunity in China’s chatbot success – POLITICO (politico.eu)<br>Mistral's CEO Arthur Mensch tells BI that DeepSeek is a win for the open-source ecosystem (africa.businessinsider.com) | 原始来源质量弱，无法验证具体言论。候选中的Politico和Business Insider Africa报道均为权威媒体，明确包含人物姓名、职位（Mistral CEO/联合创始人）及对DeepSeek开源方法的正面评价，可直接替换原始... |
| Arthur Mensch | Arthur Mensch – Parietal | replace_source | Apprentissage de représentations en imagerie fonctionnelle \| Theses.fr (theses.fr)<br>Arthur Mensch – Parietal (team.inria.fr) | 候选来源中，博士论文记录和Inria官方页面均能直接、权威地证明Arthur Mensch在Parietal团队的具体角色（博士生）和研究方向（fMRI分析）。两者结合可完全替代原始来源的薄弱信息。 |
| Arthur Mensch | Jensen Huang and Arthur Mensch…–The a16z Show | augment_source | a16z Podcast - Jensen Huang and Arthur Mensch on Winning the Global AI Race Transcript and Discussion (podscripts.co)<br>Safety in Numbers: Keeping AI Open \| Andreessen Horowitz (a16z.com) | 候选来源中，podscripts.co提供了播客转录，a16z官方页面提供了明确的人物角色描述，两者均能直接证明Arthur Mensch作为Mistral联合创始人兼CEO的身份及参与讨论的内容，可有效补强原始来源的不足。 |
| Chris Olah | Chris Olah on working at top AI labs without an undergrad degree | replace_source | Chris Olah on working at top AI labs without an undergrad degree \| 80,000 Hours (80000hours.org) | 原始来源（80000 Hours播客页面）标题直接匹配，且文本预览显示有详细转录目录，能直接证明Chris Olah的参与和讨论主题，符合权威、可访问、能直接证明人物与观点关系的要求。其他候选来源内容不足或权威性较低。 |
| Chris Olah | Christopher Olah - ACL Anthology | replace_source | Christopher Olah - Research at Google (research.google.com) | 原始ACL Anthology页面仅为目录页，证据薄弱。候选中的谷歌官方研究页面权威性高，内容直接关联人物、职位及学术贡献，可有效替换原来源。 |
| Chris Olah | About Me \| Christopher Olah's Blog - WordPress.com | replace_source | About Me - colah's blog (colah.github.io) | 候选来源中，colah.github.io/about.html 是Chris Olah的官方个人主页，明确列出了其在AI领域的专业成就和职位，权威性高，可访问，且直接证明了人物与AI领域的关联，完全满足证据要求。其他候选来源要么内容过时... |
| Chris Olah | Feature Visualization | replace_source | Feature Visualization \| ML Anthology (mlanthology.org)<br>Feature Visualization (research.google) | 候选来源中，ML Anthology和Google Research出版物页面均明确列出Chris Olah为《Feature Visualization》的作者，直接满足证据要求，可替换原始弱匹配来源。 |
| Chris Olah | Visual Information Theory | replace_source | Visual Information Theory -- colah's blog (colah.github.io) | 候选来源中，Chris Olah的个人博客文章页面是权威、可访问且能直接证明其个人作品的最佳来源。它明确显示了文章标题、作者和发布日期，完全满足证据要求，可以替换原有过薄的机构页面。 |
| Christopher Manning | Industrial applications of large language models | augment_source | Quantifying large language model usage in scientific papers (nlp.stanford.edu) | 原始来源未提及人物，无法建立关联。候选来源中，斯坦福大学官方PDF页面明确显示Christopher D. Manning是论文作者，可作为补强来源，证明其在相关研究领域的贡献。YouTube视频可作为辅助线索，但不足以单独替换。 |
| Christopher Manning | Toward expert-level medical question answering with large language models | no_good_source |  | 所有候选来源均未在可访问的文本片段中提及Christopher Manning。虽然文章主题相关，但缺乏直接证据证明他是作者、贡献者或相关研究负责人。需要更精确的查询来定位包含其姓名的作者列表或贡献声明。 |
| Christopher Manning | Stanford AI Lab Papers and Talks at EMNLP 2024 | replace_source | Christopher Manning, Stanford NLP (nlp.stanford.edu) | 原始来源（SAIL博客）未提及Christopher Manning，无法建立关联。其官方个人主页是权威、可访问的来源，明确证明了他作为斯坦福AI实验室成员的身份，符合证据要求。 |
| Demis Hassabis | Demis Hassabis Embraces the Future of Work in the Age of AI | replace_source | Demis Hassabis Embraces the Future of Work in the Age of AI \| WIRED (wired.com) | 原始来源标记为弱上下文匹配，但候选中的WIRED文章（同一URL）标题和预览明确聚焦于Demis Hassabis本人及其观点，是权威媒体的深度报道，完全符合证据要求，可直接替换。 |
| Demis Hassabis | DeepMind’s CEO Helped Take AI Mainstream. Now He’s Urging Caution | replace_source | Demis Hassabis Is Preparing for AI’s Endgame (time.com) | 候选来源中，TIME的2025年4月专访（https://time.com/7277608/demis-hassabis-interview-time100-2025/）是权威媒体的最新深度报道，标题和预览明确以Demis Hassabi... |
| Dario Amodei | Dario Amodei. The Urgency of Interpretability. April 2025 | replace_source | Dario Amodei — The Urgency of Interpretability (darioamodei.com) | 候选来源中，darioamodei.com 是Dario Amodei的个人官方网站，其文章直接证明了他本人撰写了《The Urgency of Interpretability》一文，完美满足证据要求。其他来源均为转载或报道，权威性不足。 |
| Christopher Manning | Christopher D Manning - Profile on Academia.edu | replace_source | Christopher Manning, Stanford NLP (nlp.stanford.edu) | 候选来源中，nlp.stanford.edu/~manning/ 是斯坦福大学官方NLP项目主页，明确包含Christopher Manning的姓名、职位和所属机构，权威性高，可直接替换原始来源。其他候选来源（如profiles.sta... |
| Christopher Manning | Christopher D. Manning (0000-0001-6155-649X) | replace_source | Christopher Manning, Stanford NLP (nlp.stanford.edu) | 原始ORCID页面缺乏机构上下文。候选来源中，斯坦福NLP官方主页（nlp.stanford.edu/~manning/）是最佳选择，它直接、权威地证明了Christopher Manning的姓名、职位（Thomas M. Siebel... |
| Daniela Amodei | Inside Anthropic, the AI Company Betting That Safety Can Be a Winning Strategy | replace_source | TIME100 AI 2023: Dario and Daniela Amodei (time.com) | 原始来源（TIME文章）未提及Daniela Amodei，无法证明其关联。候选来源中，TIME的TIME100 AI 2023专题文章明确记载Daniela Amodei为Anthropic总裁，并包含其观点，是权威、可访问且直接相关的... |
| Dario Amodei | Measuring Progress on Scalable Oversight for Large Language Models | replace_source | [2211.03540] Measuring Progress on Scalable Oversight for Large Language Models (arxiv.org) | 原始来源（arXiv论文页面）因预览文本未显示作者信息而被标记为弱匹配。候选来源中的同一URL提供了完整的作者列表，明确包含Dario Amodei，满足证据要求，可直接替换。 |
| Dario Amodei | Papers with Code - Dario Amodei | replace_source | Dario Amodei (darioamodei.com) | 原始来源是搜索结果页，无法直接证明人物与职位、作品的关系。候选中的个人官方网站（darioamodei.com）提供了最权威、直接的证据，明确说明了Dario Amodei的现任职位、过往关键角色及核心贡献，完美满足证据要求。 |
| Demis Hassabis | Demis Hassabis \| Stanford HAI | replace_source | Demis Hassabis \| The Center for Brains, Minds & Machines (cbmm.mit.edu)<br>Sir Demis Hassabis, PhD - Isomorphic Labs (isomorphiclabs.com) | 候选来源中，MIT CBMM和Isomorphic Labs的页面均为权威机构官方页面，内容完整且直接证明了Demis Hassabis的职位、成就及与DeepMind/谷歌的关系，完全满足证据要求。其他来源要么内容不完整，要么权威性不足... |
| Demis Hassabis | Sir Demis Hassabis | replace_source | Sir Demis Hassabis \| Academy of Achievement (achievement.org) | 原始来源（成就学院个人资料页）被标记为内容不完整和弱匹配，但候选中的同一页面（URL相同）提供了更完整的文本预览，足以证明人物身份、背景及其与AI领域的关联，符合权威、可访问、直接证明的要求。视频片段可作为辅助，但不适合作为替换源。 |
| Demis Hassabis | Demis Hassabis interview: the kid from the comp who founded DeepMind and cracked a mighty... | replace_source | Demis Hassabis Is Preparing for AI’s Endgame (time.com) | 原始来源因弱上下文匹配被标记。候选1（TIME采访）是权威媒体的深度人物专访，标题和预览文本明确指向Demis Hassabis本人及其观点，内容直接、充分，可完全替代原始来源。 |
| Demis Hassabis | Demis Hassabis: The 100 Most Influential People of 2025 | replace_source | Demis Hassabis Is on the 2025 TIME100 List (time.com) | 原始来源（TIME100 2025页面）被标记为弱匹配，但候选中的同一URL（time.com/collections/100-most-influential-people-2025/7273740/demis-hassabis/）提供... |
| Dylan Field | dfield - Overview | augment_source | Episode 29: Dylan Field, Figma Co-founder, Talks Design, Digital Economy, and Remote Culture with Host Connie Yang – Distributed.blog (distributed.blog) | 原始GitHub主页缺乏具体贡献描述，候选中的播客页面提供了权威的人物身份证明（Figma联合创始人），可补强来源。其他候选要么信息不足，要么人物不匹配。 |

## Execution Rule

- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.
- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.
- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.
