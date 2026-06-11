# Prune Reject / Review Buckets

Generated at: 2026-06-10T11:51:28.110Z
Input: docs/audit-2026-06/data/prune_candidates_after_eighth_manual_review_prune.json

## Summary

| Metric | Value |
| --- | ---: |
| reject rows | 453 |
| review rows | 304 |
| strict delete candidates | 0 |
| defer/refetch candidates | 757 |

## Reject Buckets

| Bucket | Count |
| --- | ---: |
| manual_review_tail | 334 |
| low_information_auxiliary | 101 |
| over_attributed_or_org_level | 18 |

## Review Buckets

| Bucket | Count |
| --- | ---: |
| manual_review_tail | 198 |
| low_information_auxiliary | 53 |
| empty_or_unusable_capture | 38 |
| over_attributed_or_org_level | 8 |
| author_or_direct_evidence_missing | 6 |
| non_ai_domain_mismatch | 1 |

## Strict Delete Candidate Buckets

- `wrong_person_or_same_name`
- `non_ai_domain_mismatch`
- `author_or_direct_evidence_missing`
- `empty_or_unusable_capture`

These are still not auto-applied by this script. They are candidates for a second prune gate.

## Samples

### reject / manual_review_tail

| Person | Source | Title | Reason |
| --- | --- | --- | --- |
| Aidan Gomez | exa | Humans behind AI: Aidan Gomez | 标题虽提及目标人物，但正文片段主要展示了其他人的观点，缺乏关于人物本人的实质内容。 |
| Andrej Karpathy | exa | Andrej Karpathy | 仅为 GitHub 个人主页的导航栏和界面 UI 文本，无实质信息。 |
| Andrej Karpathy | exa | LLM Council: Andrej Karpathy’s AI for Reliable Answers | 内容带有明显的营销和课程推广性质，片段中有效信息密度极低。 |
| Andrej Karpathy | exa | The LLM Operating System, as Elucidated by Andrej Karpathy in the Introduction to Large L... | 内容仅为 LinkedIn 的登录界面和隐私协议，无实质性信息。 |
| Andrej Karpathy | exa | Virtual Reality: still not quite there, again. - Andrej Karpathy - Medium | 虽然标题相关，但抓取内容全是网页 UI 按钮和登录链接，无正文信息。 |
| Andrej Karpathy | openalex | Deep Visual-Semantic Alignments for Generating Image Descriptions | 内容与索引 [5] 完全重复，属于冗余学术条目。 |
| Andrej Karpathy | x | Excellent reading thank you. Love oracle and Clawd. | 简短的社交媒体互动回复，缺乏实质性的技术或观点内容。 |
| Andrej Karpathy | x | I could certainly imagine that | 内容过于简短且缺乏上下文，无实质性信息密度。 |
| Andrej Karpathy | x | The top comment on all of these is usually “ai” with 3000 likes | 社交媒体随感，主要讨论评论区现象，缺乏专业技术含量或行业深度。 |
| Andrej Karpathy | x | Yeah it wrote a script to start the pairing process and then told me | 官方推文片段，内容过于简短且缺乏上下文，无法提供有效的技术或行业信息。 |
| Arthur Mensch | exa | Arthur Mensch arthurmensch | 内容仅为 GitHub 的登录和跳转提示，缺乏实质性的人物或技术信息。 |
| Boris Cherny | x | Both can be invoked both by the model and by a person | 孤立的句子，缺乏上下文，信息价值极低。 |

### reject / low_information_auxiliary

| Person | Source | Title | Reason |
| --- | --- | --- | --- |
| Andrej Karpathy | x | Fully neural menugen | 内容过于简略，仅有标题重复，缺乏实质性信息密度。 |
| Arthur Mensch | exa | Arthur Mensch - 人工智能 | 页面仅包含多语言导航链接，无任何关于人物的具体描述或事实。 |
| Boris Cherny | x | I haven’t found that to be an issue, since glancing at the convo usually gives me the con... | 碎片化社交媒体回复，信息密度低且缺乏上下文。 |
| Chris Olah | exa | About Me \| Christopher Olah's Blog - WordPress.com | 这是Chris Olah的个人博客介绍页面，内容主要关于数学和编程兴趣，与AI/机器学习不直接相关，且信息密度低。 |
| Daniela Amodei | exa | Having started my career in international development, helping to support governments in ... | 内容关于国际发展背景，与AI/科技行业不相关，且信息量低。 |
| Elon Musk | exa | Elon Reeve Musk Book (BIOGRAPHY): Elon's Early Life ... | 内容是关于马斯克的传记书籍，但仅涉及生平简介，与AI/科技行业无关且信息密度低。 |
| Elon Musk | x | //x.com/elonmusk/status/2003989532111413332 | 内容仅包含推文链接，无任何实质性文本内容。 |
| Elon Musk | x | //x.com/elonmusk/status/2005698800695009510 | 仅包含社交媒体链接，缺乏实质性文字内容。 |
| Elon Musk | x | //x.com/elonmusk/status/2005699538808697062 | 仅包含社交媒体链接，缺乏实质性文字内容。 |
| Elon Musk | x | //x.com/elonmusk/status/2005877413897547918 | 仅包含社交媒体链接，缺乏实质性文字内容。 |
| Elon Musk | x | //x.com/elonmusk/status/2006108047609930069 | 内容仅包含链接，无任何实质性文字信息。 |
| Ilya Sutskever | exa | Biography:Ilya Sutskever - HandWiki | 内容仅包含百科站点的登录和注册链接，无实际人物介绍。 |

### reject / over_attributed_or_org_level

| Person | Source | Title | Reason |
| --- | --- | --- | --- |
| Demis Hassabis | exa | A new era of intelligence with Gemini 3 | 谷歌产品发布公告，与 Hassabis 个人关联度极低且内容空洞。 |
| Geoffrey Hinton | exa | Geoffrey Hinton - CIFAR | 抓取内容基本为机构网站的菜单项，缺乏关于人物的实质性介绍。 |
| Greg Brockman | exa | Summarizing books with human feedback | 内容为 OpenAI 机构的研究发布，未直接提及或关于 Greg Brockman 本人。 |
| Mustafa Suleyman | exa | Towards Humanist Superintelligence - Microsoft AI | 内容为微软AI博客，未明确提及Mustafa Suleyman本人，仅关于机构。 |
| Mustafa Suleyman | x | //blogs.windows.com/msedgedev/2025/11/18/edge-for-business-presents-the-worlds-first-secu... | 纯产品博客链接，属于公司业务推广而非个人相关信息。 |
| Mustafa Suleyman | x | We just dropped what we believe is the world's largest study of AI conversations + it fou... | 官方账号发布的公司研究报告，与人物本人的背景或动态无关。 |
| Noam Shazeer | exa | Character.ai | 内容关于Character.ai公司维基百科页面，而非人物本人。 |
| Oriol Vinyals | x | //deepmind.google/models/gemini-diffusion/ | 内容是关于DeepMind的Gemini扩散模型，而非Oriol Vinyals本人，属于机构内容。 |
| Sam Altman | exa | About \| OpenAI | 内容仅为 OpenAI 公司的通用简介，未涉及 Sam Altman 本人的具体信息。 |
| Sam Altman | exa | OpenAI | 仅为 OpenAI 公司的产品导航页面，不包含关于 Sam Altman 的具体信息。 |
| Sam Altman | exa | Research | 内容为OpenAI机构的研究使命介绍，并未聚焦于Sam Altman个人。 |
| 吴恩达 | exa | Andrew Ng \| Stanford HAI | 内容仅为斯坦福 HAI 机构的通用导航和订阅信息，缺乏关于人物的实质性描述。 |

### review / low_information_auxiliary

| Person | Source | Title | Reason |
| --- | --- | --- | --- |
| Aidan Gomez | exa | Contact Aidan Gomez \| Computer Science & Mathematics | 仅包含人物的地理位置和联系方式，信息密度较低，可作为辅助背景资料。 |
| Andrej Karpathy | exa | About | 官方“关于”页面，但内容过于简略，仅作为个人主页的跳转链接。 |
| Andrej Karpathy | exa | b'Andrej Karpathy' | 第三方平台的个人简介页，包含基本身份信息但夹杂较多平台营销内容。 |
| Arthur Mensch | exa | Arthur Mensch | 维基数据条目，仅包含基础的身份标签，信息密度较低，需人工判断是否入库。 |
| Arthur Mensch | exa | Arthur Mensch \| | 简介过于简短，信息量低，但关于人物且与AI相关，需人工判断是否值得入库。 |
| Arthur Mensch | github | deep-fmri | 这是他的GitHub仓库，关于深度fMRI，与AI相关但内容描述过于简略，质量待评估。 |
| Arthur Mensch | github | modl | 官方技术项目，涉及机器学习算法但描述信息过于简略。 |
| Arthur Mensch | x | Complex matters slowly coming together — we actually got surprised ourselves | 虽然是官方言论，但内容过于简略且含糊，信息密度较低。 |
| Chris Olah | exa | Christopher Olah - Member Of Technical Staff at Anthropic | LinkedIn个人资料页，信息量低，但确认是本人且与AI相关 |
| Chris Olah | x | The Anthropic Interpretability Team is planning a virtual Q&A... | 仅提及Anthropic可解释性团队活动，信息量低，需确认是否本人发布。 |
| Daniela Amodei | exa | The Inspiring Story of Daniela Amodei, Anthropic's Leader | 标题和内容片段指向Daniela Amodei，但内容主要是网站导航和广告，信息密度低，需人工判断是否值得入库。 |
| Daniela Amodei | podcast | Daniela Amodei (Anthropic) - ‘Helpful, Honest, Harmless’ AI | 播客标题明确关于Daniela Amodei和AI，但内容仅标题无详情，信息密度低，需人工判断。 |

### review / empty_or_unusable_capture

| Person | Source | Title | Reason |
| --- | --- | --- | --- |
| Aidan Gomez | exa | Aidan Gomez: What No One Understands About Foundation Models \| E1191 \| Nick Frosst | 标题与人物及 AI 领域高度相关，但正文抓取内容多为 LinkedIn 登录页面的冗余信息。 |
| Alexandr Wang | exa | Alexandr Wang on Masters of Scale | 页面仅显示cookie提示和导航，核心内容未加载，无法判断质量。 |
| Andrej Karpathy | exa | Andrej Karpathy's LLM COUNCIL \| Fully Explained \| by NSAI | 第三方对Karpathy观点的解读文章，片段多为网页导航，需人工确认正文是否有深度价值。 |
| Andrej Karpathy | exa | Why an AI Pioneer Says LLMs Are Like ‘People Spirits’ Trapped in Your Computer | 虽然是关于他的观点报道，但抓取片段包含过多网页导航信息，需核实正文。 |
| Christopher Manning | exa | Chris Manning – Stanford Artificial Intelligence Laboratory | 虽是其个人主页，但抓取内容多为导航信息和其他教授的新闻，有效信息密度低。 |
| Christopher Manning | exa | Christopher D Manning - Profile on Academia.edu | 虽是本人学术页面，但抓取内容多为网页导航和浏览器提示，有效信息密度极低。 |
| Daniela Amodei | exa | Corporate Structure for Ethical AI - Daniela Amodei (Anthropic) | 标题提及Daniela Amodei和AI伦理，但内容仅为YouTube登录页面，无实质信息，需人工判断。 |
| Demis Hassabis | exa | Sir Demis Hassabis | 虽指向人物成就页面，但抓取到的文本多为导航信息，需人工确认正文价值。 |
| Elon Musk | x | //x.com/elonmusk/status/1989785746480202135 | 官方推文链接，缺乏正文描述，无法判断其AI相关性及质量。 |
| Emad Mostaque | exa | Kenrick Cai on LinkedIn: Stability AI Founder Emad Mostaque Plans To Resign As CEO, Sourc... | LinkedIn帖子标题提及Emad Mostaque辞职，但内容仅为登录页面，无实质信息，质量低。 |
| Geoffrey Hinton | exa | Geoffrey Hinton | 虽为维基百科条目，但抓取内容仅为导航信息，缺乏实质描述。 |
| Greg Brockman | exa | Meet the power broker of the AI age: OpenAI's 'builder-in- ... | 标题显示是 Greg 的深度人物专访，但正文片段目前全是网页导航信息。 |

### review / manual_review_tail

| Person | Source | Title | Reason |
| --- | --- | --- | --- |
| Alexandr Wang | exa | Alexandr Wang \| Substack: Rational in the Fullness of Time | 虽为本人Substack主页，但抓取内容仅为订阅提示，缺乏实质性信息。 |
| Alexandr Wang | exa | From Scale AI to Meta’s AI boss: Who is Alexandr Wang, the 28-year-old MIT dropout gunnin... | 标题高度相关但正文片段充满金融广告干扰，需确认实际内容密度。 |
| Andrej Karpathy | x | from bits to intelligence | 标题涉及 AI 核心概念，但内容过于简短，需确认是否关联重要演讲或文章。 |
| Arthur Mensch | github | hcp_builder | 这是他的GitHub仓库，关于下载和运行GLM处理HCP数据，与神经科学相关但AI相关性较弱。 |
| Arthur Mensch | github | numerical_analysis | 这是他的GitHub仓库，关于数值分析的Jupyter笔记本，与AI间接相关但偏向教学，质量一般。 |
| Arthur Mensch | github | online_sinkhorn | 官方技术仓库，虽为本人研究成果但内容仅为安装指南，信息密度较低。 |
| Arthur Mensch | x | Mistral Medium 2 was Miqu by the way | 官方账号提及Mistral Medium 2模型，但内容简短且模糊，需人工判断是否值得入库。 |
| Arthur Mensch | x | The team is fast! It's been super exciting to see le Chat more and more widely adopted. I... | 官方账号发布关于le Chat产品推广的内容，涉及AI但信息较泛，需人工判断是否值得入库。 |
| Boris Cherny | x | - Each tab has its own git checkout - Claude manages context, I don’t do anything special... | 描述了具体的工作流配置细节，但篇幅较短，建议人工审核其完整性。 |
| Boris Cherny | x | It really depends on the language, and each model gets better and better at it. Usually i... | 涉及模型代码生成的具体观察，具有一定参考价值但篇幅较短。 |
| Boris Cherny | x | That is well supported, added many months back. Just send a message while Claude is runni... | 确认了 Claude 的功能支持情况，属于产品事实陈述，信息密度中等。 |
| Chris Olah | exa | Christopher Olah - ACL Anthology | ACL Anthology页面列出了Chris Olah作为合著者的论文，但内容仅为元数据，缺乏实质信息，需人工判断是否值得入库。 |

### review / author_or_direct_evidence_missing

| Person | Source | Title | Reason |
| --- | --- | --- | --- |
| Chris Olah | exa | A Mathematical Framework for Transformer Circuits | 论文作者为Nelson Elhage等，无Chris Olah，但内容与AI相关，需人工判断是否误抓 |
| Chris Olah | exa | In-context Learning and Induction Heads | 论文作者为Catherine Olsson，非Chris Olah，但内容与AI相关，需人工判断是否误抓 |
| Percy Liang | github | refdb | 官方学术管理工具，与 AI 技术研究无直接关联。 |
| 桑达尔·皮查伊 | youtube | Sundar Pichai&#39;s Personal Journey to Google CEO✨✨ | 内容关于皮查伊个人经历，但未提及AI/科技，需人工判断是否与科技行业相关。 |
| 科拉伊·卡武克丘奥卢 | x | Announcing upcoming Gemini 3 Flash release) | 虽为官方来源且涉及其所在机构产品，但未提及人物本人且内容过于简略。 |
| 迈克·施罗普费尔 | exa |  | 作者为Mike Schroepfer，但内容关于Bletchley Park历史，与AI/科技行业关联较弱，需人工判断。 |

### review / over_attributed_or_org_level

| Person | Source | Title | Reason |
| --- | --- | --- | --- |
| Daniela Amodei | x | I’m looking forward to what’s to come. And we’re hiring! https://www.anthropic.com/#caree... | 官方推文表达期待并招聘，关于本人但内容空洞，需人工判断。 |
| Elon Musk | exa | Elon Musk - Tesla | 提到AI但内容以财富和公司介绍为主，AI相关性模糊，需人工判断。 |
| Mira Murati | exa | Former OpenAI technology chief Mira Murati launches rival start-up | 标题明确关于Mira Murati创办竞争对手公司，但内容被付费墙截断，无法评估完整信息密度。 |
| Mira Murati | exa | Murati’s Thinking Machines Raises Cash at $10 Billion Valuation | 标题包含其新公司融资的重要事实，但正文仅为 Bloomberg 的新闻链接列表。 |
| 李莲 | x | If you are into the topic, my team is hiring Research Engineer for a new sub-team Human-A... | 属于团队招聘信息，虽提及研究方向但信息密度较低。 |
| 杰夫·迪恩 | x | Building on more than 10 years of robotics research and engineering at @GoogleDeepMind, @... | 介绍了团队的机器人研究成果，虽具科技价值但更偏向机构动态而非个人贡献。 |
| 杰夫·迪恩 | x | Gemini 3 Deep Think is now available for Ultra users, making available our IMO & ICPC Gol... | 包含具体的技术指标和模型进展，但仍属于官方产品发布范畴。 |
| 黄仁勋 | x | Note on Nvidia's $4.4T valuation exceeding total crypto market cap, joking about Jensen H... | 内容涉及公司估值与加密货币的调侃，信息密度一般，需人工确认价值。 |

### review / non_ai_domain_mismatch

| Person | Source | Title | Reason |
| --- | --- | --- | --- |
| Demis Hassabis | podcast | Google’s top AI scientist says ‘learning how to learn’ will be next generation’s most nee... | 英语学习类播客内容，属于对人物观点的二次简化加工，信息密度较低。 |
