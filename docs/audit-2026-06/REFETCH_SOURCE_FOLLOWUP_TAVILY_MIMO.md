# Refetch Source by Search + MiMo

Generated at: 2026-06-10T07:06:36.139Z
Remediation input: docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_followup_queue.jsonl
Output: docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_followup_tavily_mimo.jsonl
Search provider: tavily
Model: mimo-v2.5-pro

## Counts

| Metric | Value |
| --- | --- |
| selected tasks | 78 |
| existing rows reused | 37 |
| pending tasks | 30 |
| refetch results | 48 |
| source candidates | 383 |
| selected sources | 51 |

## Stopped Early

| Reason | Claim | Person | Message |
| --- | --- | --- | --- |
| tavily_quota_or_rate_limit | source-quality:cmju0gcw006myrmtb2s3yldc0 | 戴文渊 | Tavily /search failed: HTTP 432 {"detail":{"error":"This request exceeds your plan's set usage limit. Please upgrade your plan or contact support@tavily.com"}} |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 23 |
| no_good_source | 12 |
| augment_source | 11 |
| human_review | 2 |

## Selected Hosts

| Host | Count |
| --- | --- |
| nature.com | 3 |
| ycombinator.com | 2 |
| mustafa-suleyman.ai | 2 |
| blogs.microsoft.com | 2 |
| cims.nyu.edu | 2 |
| singjupost.com | 2 |
| cdn.openai.com | 2 |
| cs.tsinghua.edu.cn | 2 |
| lzy.thunlp.org | 2 |
| hub.baai.ac.cn | 2 |
| cs.stanford.edu | 1 |
| karpathy.ai | 1 |
| theguardian.com | 1 |
| cs.toronto.edu | 1 |
| cdss.berkeley.edu | 1 |
| news.berkeley.edu | 1 |
| dwarkesh.com | 1 |
| signalprocessingsociety.org | 1 |
| podwise.ai | 1 |
| tedai-sanfrancisco.ted.com | 1 |
| ted.com | 1 |
| lexfridman.com | 1 |
| cifar.ca | 1 |
| yoshuabengio.org | 1 |
| aiforgood.itu.int | 1 |
| piaofang.maoyan.com | 1 |
| inspirehep.net | 1 |
| arxiv.org | 1 |
| youtube.com | 1 |
| linkedin.com | 1 |

## Sample Results

| Person | Target | Decision | Sources | Reason |
| --- | --- | --- | --- | --- |
| Andrej Karpathy | The LLM Operating System, as Elucidated by Andrej Karpathy in the Introduction to Large L... | augment_source | Andrej Karpathy: Software Is Changing (Again) : YC Startup Library \| Y Combinator (ycombinator.com) | 原始来源为LinkedIn第三方文章，权威性弱。候选中Y Combinator页面收录了Karpathy的官方演讲，可作为权威补强来源。其他候选多为二次解读或笔记，权威性不足。建议进一步搜索Karpathy的官方演讲视频或转录作为最佳替换... |
| Andrej Karpathy | The Wisdom Hidden in Plain Sight: What Andrej Karpathy Reveals About Our AI Future | no_good_source |  | 所有候选来源均未直接证明Andrej Karpathy与目标文章《The Wisdom Hidden in Plain Sight》的关联，或未权威阐述其观点。CMU PDF仅提及姓名，个人主页内容虚构，其他为第三方转录或评论。需要寻找原... |
| Andrej Karpathy | Andrej Karpathy | replace_source | Andrej Karpathy Academic Website - Stanford Computer Science (cs.stanford.edu)<br>Andrej Karpathy (karpathy.ai) | 原始来源（Google Scholar页面）无法访问且为索引页。候选中，斯坦福大学官方学术页面和个人官网（karpathy.ai）是权威、可访问的一手来源，能直接证明其职位、研究背景和当前活动，符合替换要求。其他来源权威性不足或受限。 |
| Christopher Manning | Toward expert-level medical question answering with large language models | no_good_source |  | 所有候选来源均未提供Christopher Manning是目标文章《Toward expert-level medical question answering with large language models》作者或贡献者的直接证... |
| Elon Musk | Elon Musk, AI and the antichrist: the biggest tech stories of ... | replace_source | Elon Musk, AI and the antichrist: the biggest tech stories of 2025 \| Technology \| The Guardian (theguardian.com) | 原始来源（卫报文章）是权威媒体的完整报道，标题和预览明确关联Elon Musk与AI，能直接证明其在2025年AI领域的角色和故事。其他候选要么是旧文、目录页或转载，权威性或相关性不足。因此选择原始卫报文章作为替换来源。 |
| Ilya Sutskever | Ilya Sutskever | replace_source | Ilya Sutskever's home page (cs.toronto.edu) | 原始来源（谷歌学术主页）加载失败且为索引页，不可用。候选中，多伦多大学官方个人主页（cs.toronto.edu/~ilya）是权威、可访问的学术机构页面，直接证明了Ilya Sutskever的职位和背景，符合替换要求。其他候选来源权威... |
| John Schulman | A conversation with John Schulman on research cultures ... | augment_source | ChatGPT architect, Berkeley alum John Schulman on his journey ... (cdss.berkeley.edu)<br>ChatGPT architect, Berkeley alum John Schulman on his journey with AI - Berkeley News (news.berkeley.edu)<br>John Schulman (OpenAI Cofounder) - Reasoning, RLHF, & Plan for ... (dwarkesh.com) | 原始LinkedIn来源因登录墙和弱匹配被标记。候选中有多个权威机构来源（伯克利官方新闻）和明确的播客官方页面，能直接证明John Schulman的身份和贡献，适合作为补强来源。这些来源可访问、权威，且直接关联人物与作品。 |
| Mustafa Suleyman | Mustafa Suleyman \| Edge.org | replace_source | Mustafa Suleyman (mustafa-suleyman.ai) | 原始来源（Edge.org）内容简短且权威性不足。候选来源中，本人官方主页（mustafa-suleyman.ai）是最佳替代，它直接、权威地证明了其当前职位（微软AI首席执行官）及背景，符合优先选择官方主页的原则。 |
| Mustafa Suleyman | Mustafa Suleyman Brings Knowledge and Past Controversy as He Joins Microsoft’s AI Effort | replace_source | Mustafa Suleyman, DeepMind and Inflection Co-founder, joins Microsoft to lead Copilot - The Official Microsoft Blog (blogs.microsoft.com) | 原始来源（WSJ文章）因预览文本仅为导航元素，无法确认正文内容，被标记为弱匹配。候选中的微软官方博客是权威的一手来源，直接宣布了Mustafa Suleyman加入微软领导Copilot的职位，完全满足证据要求，可替换原始来源。 |
| Mustafa Suleyman | Meet Mustafa Suleyman, the man Microsoft 'prised' from Google to lead its AI charge | replace_source | Announcing Copilot leadership update - The Official Microsoft Blog (blogs.microsoft.com)<br>Mustafa Suleyman (mustafa-suleyman.ai) | 原来源（Times of India文章）仅为新闻报道，且预览未提供正文，无法确认其准确性。候选来源中，微软官方博客和本人官方网站均直接、权威地证明了Mustafa Suleyman作为微软AI CEO的职位，符合替换要求。 |
| Oriol Vinyals | Gemini 2.0 and the evolution of agentic AI \| Oriol Vinyals | augment_source | Industry Leaders in Signal Processing and Machine Learning: Dr. Oriol Vinyals \| IEEE Signal Processing Society (signalprocessingsociety.org)<br>Gemini 2.0 and the Evolution of Agentic AI with Oriol Vinyals \| Google DeepMind: The Podcast \| Podwise (podwise.ai) | 原始来源（YouTube视频）内容过薄且缺乏可引用的转录。候选中，IEEE文章可提供权威背景，Podwise摘要提供了明确的职位和讨论内容，两者可共同补强人物与作品/观点/职位的关系。但均非官方主页或完整转录，故为补强而非替换。 |
| Shane Legg | Shane Legg on AI's Future: AGI Implications for Boards and ... | replace_source | Shane Legg \| TEDAI San Francisco (tedai-sanfrancisco.ted.com)<br>Shane Legg \| Speaker \| TED (ted.com) | 原始来源（LinkedIn用户帖子）为弱匹配的社交媒体内容，无法直接证明Shane Legg本人的观点或职位。候选中的TED官方活动页面和TED演讲者页面均为权威机构资料页，能直接、可靠地证明Shane Legg作为Google Deep... |
| Wojciech Zaremba | https://github.com/wzaremba | replace_source | News \| NYU Courant (cims.nyu.edu) | NYU官方校友访谈页面是权威的机构来源，明确确认了Wojciech Zaremba作为OpenAI联合创始人的身份，直接满足证据要求，可有效替换原始GitHub页面。 |
| Wojciech Zaremba | 48160725836910182202 | replace_source | Alumni Q&A with Wojciech Zaremba, Co-Founder of OpenAI (cims.nyu.edu)<br>#215 - Wojciech Zaremba: OpenAI Codex, GPT-3, Robotics, and the Future of AI (lexfridman.com) | 原始VIAF来源仅为搜索界面，证据薄弱。候选中的NYU官方校友访谈和Lex Fridman播客页面均为权威来源，能直接、明确地证明Wojciech Zaremba作为OpenAI联合创始人的身份和贡献，符合替换要求。其他候选因权威性不足或... |
| Yann LeCun | AI on a CALCULATOR? (Without Internet) \| Yann LeCun \| 36 comments | no_good_source |  | 所有候选来源均无法直接证明原始LinkedIn帖子（AI on a CALCULATOR?）是否为Yann LeCun本人发布或与其相关。候选来源要么是通用采访、奖项页面、旧博客文章，要么是其他用户对LeCun观点的转述，缺乏直接、权威的... |
| Yoshua Bengio | The current state of AI and Deep Learning | replace_source | Yoshua Bengio – CIFAR (cifar.ca)<br>‘It keeps me awake at night’: machine-learning pioneer on AI’s threat to humanity (nature.com) | 原始来源（Medium文章）为弱匹配的公司/产品页面，无法有效证明Yoshua Bengio的贡献。候选中CIFAR官方页面和Nature采访文章均为权威来源，能直接、可靠地证明其身份、职位及在AI/深度学习领域的核心贡献，适合作为替换来... |
| Yoshua Bengio | 'It keeps me awake at night': machine-learning pioneer on ... | replace_source | 'It keeps me awake at night': machine-learning pioneer on AI’s threat to humanity (nature.com) | 原始来源（Nature文章）本身是权威媒体对Yoshua Bengio的采访，标题和预览直接证明了其内容聚焦于本人对AI威胁的个人观点，符合证据要求。候选来源中，虽然有其他权威媒体文章（如CNBC）和本人官方博客，但均非原始来源的直接替代... |
| Yoshua Bengio | The Catastrophic Risks of AI — and a Safer Path \| Yoshua ... | replace_source | Transcript of The Catastrophic Risks of AI — and a Safer Path: Yoshua Bengio – The Singju Post (singjupost.com) | 候选来源中，singjupost.com提供了原始YouTube视频的完整转录文本，直接证明Yoshua Bengio在TED2025的演讲内容，解决了原始来源缺乏上下文和角色辨识的问题。其他来源要么是二次报道，要么是论坛讨论，权威性不足。 |
| Yoshua Bengio | ‘Malicious use is already happening’: machine-learning pioneer on making AI safer | replace_source | ‘Malicious use is already happening’: machine-learning pioneer on making AI safer (nature.com) | 原始来源（Nature文章）是权威期刊，标题直接表明是Yoshua Bengio关于AI安全的访谈，符合人物与观点关系。其他候选来源要么权威性不足，要么主题不完全匹配，无法替代原始来源。 |
| Yoshua Bengio | Yoshua Bengio - AI for Good - ITU | augment_source | Yoshua Bengio: Home (yoshuabengio.org)<br>Yoshua Bengio - AI for Good Global Summit (aiforgood.itu.int) | 原始来源（ITU活动页面）本身是有效的官方来源，但内容预览不完整。候选来源中，本人官方网站（yoshuabengio.org）和ITU活动页面（aiforgood.itu.int）均能直接、权威地证明Yoshua Bengio的身份、职位... |
| 丁洁 | 丁洁 (@jieding) | replace_source | 丁洁 (piaofang.maoyan.com) | 候选来源中，猫眼专业票房库（piaofang.maoyan.com）提供了演员丁洁的权威、详细的个人资料和作品列表，能直接证明其演员身份及与《掌心》、《花间令》等作品的关系，符合替换要求。其他来源要么人物不符，要么权威性不足或信息不完整。 |
| 亚历克·拉德福德 | Alec Radford - Home | augment_source | Alec Radford - Inspire HEP (inspirehep.net) | 原始ACM页面无效。候选中，Inspire HEP是权威学术数据库，直接列出其作为作者的论文（如GPT-4技术报告），能有效证明其研究贡献。其他候选来源权威性不足或信息不直接。此来源可作为补充，但不足以完全替代原始来源，故决策为augme... |
| 亚历克·拉德福德 | Alec Radford's research works | replace_source | [PDF] Improving Language Understanding by Generative Pre-Training (cdn.openai.com)<br>[PDF] Fine-Tuning Language Models from Human Preferences - arXiv (arxiv.org) | 原始来源为自动生成的弱匹配目录页。候选中的OpenAI官方PDF和arXiv论文PDF是权威一手学术来源，能直接、可靠地证明Alec Radford作为GPT-1等关键论文作者的身份和学术贡献，完全符合证据要求。 |
| 亚历克·拉德福德 | Breaking down the OG GPT Paper by Alec Radford | replace_source | L11 Language Models -- guest instructor: Alec Radford (OpenAI) --- Deep Unsupervised Learning SP20 (youtube.com)<br>[PDF] Improving Language Understanding by Generative Pre-Training (cdn.openai.com) | 候选来源中，YouTube视频（BnpB3GrpsfM）和OpenAI官方论文PDF提供了Alec Radford本人参与或创作的直接证据，权威性强，可访问性好，能有效替换原来源的弱匹配问题。其他候选来源多为第三方页面，证据不足。 |
| 凯文·斯科特 | Kevin Scott (@kevin_scott) | augment_source | Kevin Scott - CTO Microsoft (linkedin.com) | 原始Instagram来源因乱码无法验证。候选来源中，LinkedIn个人资料页明确显示“Kevin Scott - CTO Microsoft”，直接、权威地证明了其微软CTO的职位和身份，符合替换要求。其他候选来源要么身份不匹配，要么... |
| 刘知远 | Scaling Latent Reasoning via Looped Language Models | no_good_source |  | 所有候选来源均未提供刘知远与目标论文《Scaling Latent Reasoning via Looped Language Models》的直接证据。arxiv PDF作者列表中无刘知远姓名，其他来源为无关论文、课程或个人主页，无法证... |
| 刘知远 | Chinese Tiny LLM: Pretraining a Chinese-Centric Large Language Model | no_good_source |  | 候选来源中，论文HTML页面未显示作者列表，无法确认刘知远参与。其他页面仅证明其学者身份，但未建立与目标论文的直接联系。缺乏权威来源（如论文作者列表、官方项目页）来证实其作者角色。 |
| 刘知远 | Computer Science > Distributed, Parallel, and Cluster Computing | augment_source | xLLM Technical Report - ADS (ui.adsabs.harvard.edu) | 原始来源（arXiv摘要页）缺失作者信息。候选中的ADS页面提供了完整的作者列表，明确包含刘知远，可直接补强证据。其他候选页面虽提及刘知远，但未关联xLLM技术报告。 |
| 刘知远 | Thinker: Training LLMs in Hierarchical Thinking for Deep Search via Multi-Turn Interaction | replace_source | 刘知远-清华大学计算机科学与技术系 (cs.tsinghua.edu.cn)<br>刘知远 (lzy.thunlp.org) | 原始来源（arXiv论文页）未包含作者信息，无法证明刘知远与论文的关系。候选来源中，清华大学官方师资页和个人主页是权威、可访问的机构资料，能直接证明刘知远的教授身份和研究领域，符合补强来源的要求。虽然未直接链接到《Thinker》论文，但... |
| 吴恩达 | https://arxiv.org/pdf/2303.18223.pdf | no_good_source |  | 候选来源均无法证明吴恩达与目标论文《A Survey of Large Language Models》（arXiv:2303.18223）存在任何关联。论文作者列表中无吴恩达，其他来源也未建立此联系。因此，无法替换或补强原始来源。 |
| 刘知远 | 如何评价清华大学刘知远老师？ | replace_source | 刘知远 - 清华大学计算机科学与技术系 (cs.tsinghua.edu.cn)<br>刘知远 (lzy.thunlp.org) | 原始来源（知乎问答）内容为空，权威性低。候选中的清华大学官方教师名录和个人主页是直接、权威的来源，能可靠证明刘知远的职位、研究领域和学术背景，完全满足证据要求。 |
| 吴恩达 | Opening a new chapter of my work in AI - Andrew Ng - Medium | no_good_source |  | 所有候选来源均不符合要求。它们要么是聚合/目录页面，要么是无关内容（如未来演讲），要么是二手资料（如Wikipedia）。没有找到能直接证明吴恩达本人撰写目标Medium文章的权威、可访问的原始来源。 |
| 吴恩达 | Andrew Ng: Building Faster with AI | replace_source | Andrew Ng: Building Faster with AI (Transcript) - The Singju Post (singjupost.com)<br>Andrew Ng: Building Faster with AI : YC Startup Library \| Y Combinator (ycombinator.com) | 原始YouTube视频描述过薄，缺乏具体角色和观点。候选来源中，Singju Post提供了完整演讲转录，明确吴恩达身份和观点；YC官方页面提供了权威的演讲概要。两者均可直接证明人物与作品/观点/职位关系，且可访问，优于原始来源。 |
| 吴恩达 | Andrew Ng - Wikipedia, the free encyclopedia | augment_source | Andrew Ng (en.wikipedia.org) | 原始来源为Wikipedia存档页面，内容不可用。候选中的英文维基百科页面（en.wikipedia.org/wiki/Andrew_Ng）是权威、可访问的来源，内容全面，能直接证明吴恩达的教育背景、职位和主要成就，完全满足证据要求，可替... |
| 周伯文 | ViPER: Empowering the Self-Evolution of Visual Perception Abilities in Vision-Language Mo... | no_good_source |  | 候选来源中，周伯文的个人主页和履历页面均未提及ViPER论文。与ViPER论文相关的页面（如其他VIPER论文）也未提及周伯文。因此，无法从这些来源中找到周伯文与ViPER论文的直接关联证据。 |
| 周伯文 | GitHub - RUC-NLPIR/WebThinker | no_good_source |  | 所有候选来源均未提供周伯文与WebThinker项目直接相关的证据。前三个来源是周伯文的通用简介页面，未提及WebThinker。第四个来源是上海AI实验室的新闻，内容无关。第五个来源是人大NeurIPS录用新闻，未提及周伯文或WebTh... |
| 周伯文 | WeLM: A Well-Read Pre-trained Language Model for Chinese | no_good_source |  | 候选来源均为周伯文的个人简介、新闻报道或活动页面，未包含WeLM论文的作者列表或周伯文在该论文中具体贡献的直接证据。无法满足证据要求，需进一步搜索论文作者信息。 |
| 周伯文 | Weaver: Foundation Models for Creative Writing | no_good_source |  | 所有候选来源均未提供周伯文是《Weaver: Foundation Models for Creative Writing》论文作者或贡献者的直接证据。arXiv PDF的作者列表中无此人，其他来源均为其个人履历或无关研究。无法确认其与目... |
| 周明 | Computer Science > Computation and Language | human_review |  | 所有候选来源均未能直接证明周明是MiroThinker论文的作者。Google Scholar主页未列出该论文；MiroThinker论文的作者列表为团队名称“MiroMind Team”，未提供个人姓名。需要更精确的查询，例如搜索周明与... |
| 周明 | Ming-UniVision: Joint Image Understanding and Generation with a Unified Continuous Tokeni... | human_review |  | 所有候选来源均无法直接证明周明是论文'Ming-UniVision'的作者。Cool Papers页面列出了作者列表，但其中没有“周明”或“Ming Zhou”。其他来源要么是搜索结果页，要么未提及作者姓名，要么是同名但不同领域的人员。需... |
| 周明 | Molly: Making Large Language Model Agents Solve Python Problem More Logically | no_good_source |  | 所有候选来源均无法直接证明周明是目标论文'Molly'的作者。权威来源（如微软新闻、公司简介）仅证明其身份和职位，但未关联到具体论文。论文详情页（arXiv）因访问问题无法获取作者列表。需要更精确的来源，如论文详情页或作者个人主页。 |
| 周明 | AI大牛周明发布MChat：生成可控，参数规模可负担 | replace_source | AI大牛周明发布MChat：生成可控，参数规模可负担，顺便官宣了新融资-腾讯云开发者社区-腾讯云 (cloud.tencent.com) | 候选来源中，腾讯云开发者社区的文章标题与原始声明完全一致，内容明确报道了周明作为澜舟科技创始人兼CEO发布MChat可控大模型，并详细介绍了其特点和融资背景，满足证据要求。其他来源要么主题不匹配，要么权威性较低。 |
| 周明 | 对话AI顶尖大牛周明老师：大模型的机遇与挑战 | augment_source | 澜舟科技创始人兼CEO周明博士：大语言模型的前世今生 - 智源社区 (hub.baai.ac.cn)<br>大模型迎落地元年 澜舟科技周明提出成功“九字诀” - 21世纪经济报道 (m.21jingji.com) | 候选来源中，智源社区和21世纪经济报道的专访/报道提供了周明博士的详细背景、观点和身份证明，可有效补强原始B站视频来源的不足。其他候选或内容重复，或权威性不足，或缺乏具体内容。建议优先使用这两个权威来源。 |
| 周明 | Ming Zhou (周明) | augment_source | ‪Ming Zhou（周明）‬ - ‪Google Scholar‬ (scholar.google.com) | 原始来源因系统错误无法访问。候选来源中，https://scholar.google.com/citations?user=cMbi45cAAAAJ&hl=en 是可访问的、明确匹配“周明（Ming Zhou）”的Google Schol... |
| 周明 | Ming Zhou (周明) | replace_source | 周明博士 - 澜舟科技 (langboat.com)<br>首席科学家 - 创新工场 (chuangxin.com) | 原始来源是搜索结果页，不符合要求。候选中，澜舟科技官网和创新工场官网的页面是权威的官方机构资料页，明确、详细地介绍了周明博士的职位、学术背景、研究领域和成就，能够直接证明人物身份和贡献，是理想的替换来源。 |
| 季逸超 | Congratulations to our cofounder & chief scientist, Yichao "Peak" Ji, on being recognized... | replace_source | How Yichao “Peak” Ji became a global AI app hitmaker \| MIT Technology Review (technologyreview.com)<br>Yichao “Peak” Ji \| Innovators Under 35 (innovatorsunder35.com) | 已找到MIT Technology Review官方文章和Innovators Under 35官方网站的个人资料页，两者均明确将季逸超列为2025年“35岁以下创新者”获奖者，可直接替换原LinkedIn来源。 |
| 季逸超 | Yichao “Peak” Ji developed Manus, one of the buzziest AI ... | augment_source | 季逸超 - 维基百科，自由的百科全书 (zh.wikipedia.org) | 维基百科页面提供了关于季逸超作为Manus开发者的明确、权威信息，直接满足证据要求，可替换原Facebook帖子。其他候选来源虽提及人物，但权威性或直接性不足。 |
| 季逸超 | Computer Science > Machine Learning | replace_source | FrontierCS: Evolving Challenges for Evolving Intelligence - 智源社区论文 (hub.baai.ac.cn) | 候选来源中，智源社区论文详情页明确列出了FrontierCS论文的完整作者列表，其中包含季逸超（Peak Ji），直接满足证据要求，可替换原始来源。其他来源均未提及该论文或其作者身份。 |

## Execution Rule

- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.
- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.
- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.
