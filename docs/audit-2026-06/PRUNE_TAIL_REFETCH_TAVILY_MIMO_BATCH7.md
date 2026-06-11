# Refetch Source by Search + MiMo

Generated at: 2026-06-10T15:42:33.046Z
Remediation input: docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch7.jsonl
Search provider: tavily
Model: mimo-v2.5-pro

## Counts

| Metric | Value |
| --- | --- |
| selected tasks | 20 |
| existing rows reused | 0 |
| pending tasks | 0 |
| refetch results | 20 |
| source candidates | 180 |
| selected sources | 25 |

## Decisions

| Decision | Count |
| --- | --- |
| augment_source | 9 |
| replace_source | 7 |
| no_good_source | 3 |
| human_review | 1 |

## Selected Hosts

| Host | Count |
| --- | --- |
| tedai-sanfrancisco.ted.com | 2 |
| time.com | 2 |
| bbc.com | 1 |
| live.worldbank.org | 1 |
| congress.gov | 1 |
| blog.google | 1 |
| en.wikipedia.org | 1 |
| youtube.com | 1 |
| montgomerysummit.com | 1 |
| viterbischool.usc.edu | 1 |
| podcasts.apple.com | 1 |
| ted.com | 1 |
| csis.org | 1 |
| proceedings.neurips.cc | 1 |
| hanxiao.io | 1 |
| github.com | 1 |
| cnbc.com | 1 |
| artefact.com | 1 |
| colah.github.io | 1 |
| hub.baai.ac.cn | 1 |
| learn.microsoft.com | 1 |
| learn.hms.harvard.edu | 1 |
| research.google | 1 |

## Sample Results

| Person | Target | Decision | Sources | Reason |
| --- | --- | --- | --- | --- |
| 桑达尔·皮查伊 | Learn Sundar Pichai facts for kids | replace_source | Who is Sundar Pichai and what does Alphabet do? (bbc.com) | 原来源为儿童百科页面，AI相关性低。BBC报道权威、可访问，直接证明人物身份、职位及成就，适合作为替换来源。其他候选或权威性不足，或内容不直接匹配需求。 |
| 桑达尔·皮查伊 | Sundar Pichai \| CEO of Google and Alphabet \| Bio - Interesting Engineering | replace_source | Sundar Pichai - World Bank Live (live.worldbank.org)<br>[PDF] Sundar Pichai CEO, Google and Alphabet - Congress.gov (congress.gov) | 原始来源（Interesting Engineering）文本预览为空，无法确认内容质量。候选来源中，World Bank Live和Congress.gov页面均明确、权威地证明了桑达尔·皮查伊作为Google和Alphabet CEO... |
| 桑达尔·皮查伊 | 谷歌CEO桑达尔.皮查伊：Gemini浪潮、全栈AI与未来十年布局 | human_review |  | Expected double-quoted property name in JSON at position 975 (line 27 column 3) |
| 科拉伊·卡武克丘奥卢 | Google appoints Koray Kavukcuoglu as Chief AI Architect | replace_source | Koray Kavukcuoglu (blog.google) | 谷歌官方博客作者页是证明科拉伊·卡武克丘奥卢担任谷歌首席AI架构师这一职位的最权威、最直接的来源。该页面明确列出了其姓名和职位，完全符合证据要求，可替换原有的低质量社交媒体来源。 |
| 迈克·施罗普费尔 | https://tech.facebook.com/ideas/2020/10/giving-back-to-the-birthplace-of-the-computer/ | no_good_source |  | 所有候选来源均未直接提及迈克·施罗普费尔，或内容与目标人物无关。原始来源（Facebook技术博客）虽提及作者，但内容主题与人物关联性弱。需要更直接的官方资料或权威访谈来证明人物身份及其与AI/科技领域的关联。 |
| 迈克·施罗普费尔 | Facebook's technology head Mike Schroepfer to step down | augment_source | Mike Schroepfer - Wikipedia (en.wikipedia.org)<br>Why I Left Meta — Exit Interview With Mike Schroepfer (youtube.com) | 原始来源（路透社）因网页UI干扰导致质量存疑。候选来源中，维基百科页面提供了权威的职位任期信息，YouTube视频提供了本人参与的离职访谈，两者均可作为补强来源，直接支持其离职的核心事实。其他候选来源因缺乏直接证据或不符合要求被拒绝。 |
| 阿希什·瓦斯瓦尼 | Ashish Vaswani on Essential AI's Journey with MI300X ... | replace_source | Ashish Vaswani - The Montgomery Summit (montgomerysummit.com) | 原始YouTube视频缺乏具体内容，需替换。候选中的Montgomery Summit页面是权威会议官网，提供了人物职位、背景及Transformer发明者身份的直接证明，符合替换要求。其他候选多为社媒或二次来源，权威性不足。 |
| 阿希什·瓦斯瓦尼 | Relation between Chat GPT and Ashish Vaswani | replace_source | USC Alumni Paved Path for ChatGPT - USC Viterbi \| School of Engineering (viterbischool.usc.edu) | USC Viterbi工程学院的官方新闻页面是权威来源，直接、明确地建立了阿希什·瓦斯瓦尼（Transformer论文共同作者）与ChatGPT（基于Transformer技术）之间的关系，完全满足证据要求，可替换原Medium文章。 |
| 雅各布·乌什科雷特 | Jakob Uszkoreit - BIO International Convention | augment_source | The AI Pioneer Developing New … - What's Your Problem? - Apple Podcasts (podcasts.apple.com)<br>How AI sidesteps traditional science (ted.com)<br>Jakob Uszkoreit \| TEDAI San Francisco (tedai-sanfrancisco.ted.com) | 原始来源（BIO会议页面）内容不完整。候选中，Apple Podcasts页面、TED演讲页面和TEDAI演讲者页面均能直接、权威地证明雅各布·乌什科雷特的身份（Inceptive CEO、Transformer论文共同作者）及其公开活动... |
| 黄仁勋 | NVIDIA’s Jensen Huang on Securing American Leadership on AI | replace_source | NVIDIA’s Jensen Huang on Securing American Leadership on AI \| CSIS Events (csis.org) | 候选中CSIS事件页面是原始来源的权威替代，直接证明黄仁勋参与关于AI领导力的讨论。其他候选要么非权威，要么证据不足。维基百科可作为辅助，但不应作为唯一依据。 |
| Arthur Mensch | online_sinkhorn | augment_source | [PDF] Online Sinkhorn: Optimal Transport distances from sample streams (proceedings.neurips.cc) | 原始来源GitHub仓库信息密度低。候选中的NeurIPS论文是权威学术来源，明确将Arthur Mensch列为作者，直接证明其对online_sinkhorn算法的贡献，可作为补强来源。其他候选来源均未提及该项目。 |
| Han Xiao | hanxiao/benchmark | augment_source | Han Xiao, Ph.D. (肖涵) · Han Xiao Blog - Search AI (hanxiao.io)<br>hanxiao (Han Xiao) · GitHub (github.com) | 候选来源中，本人官方主页和GitHub主页是权威身份来源，可补强原来源。但均未直接提及‘hanxiao/benchmark’这个具体仓库。需要进一步查找能直接证明该仓库归属或用途的来源。 |
| Arthur Mensch | The team is fast! It's been super exciting to see le Chat more and more widely adopted. I... | augment_source | Mistral AI CEO Arthur Mensch on growth, ... (cnbc.com)<br>Arthur Mensch, CEO and cofounder of MISTRAL AI at the Adopt AI Summit – Bringing open AI models to the frontier - Artefact (artefact.com) | 原始来源为Arthur Mensch的X（推特）帖子，内容为产品推广，权威性较弱。候选来源中，CNBC采访和Artefact活动页面能更权威地证明其CEO身份及与Mistral AI产品（如le Chat）的关联，可作为补充或替换来源。 |
| Chris Olah | Valuable synthesis across labs! Make sure to check out the tutorial video - https://www.y... | replace_source | Chris Olah: The 100 Most Influential People in AI 2024 - TIME (time.com)<br>About Me - colah's blog (colah.github.io) | 原始声明仅为推荐视频的转发语，缺乏实质性内容。候选来源中，TIME的人物简介和Chris Olah的官方博客能直接证明其身份、职位和贡献，是权威且可访问的替代来源。其他候选要么内容不相关，要么权威性不足。 |
| Shane Legg | //www.youtube.com/watch?v=8IUIGVVLbCg | augment_source | Shane Legg: The 100 Most Influential People in AI 2023 (time.com)<br>Shane Legg \| TEDAI San Francisco (tedai-sanfrancisco.ted.com) | 原始来源（X推文链接YouTube视频）缺乏文本证据。候选中的TIME报道和TED官方页面提供了权威、可访问的文本证据，直接证明Shane Legg的职位和与AGI的关联，可作为补强来源。原始视频链接（8IUIGVVLbCg）未在候选中找... |
| 亚历克·拉德福德 | Sorry - I interpreted: 'if a paper had crossed my desk saying here are some hand-curated ... | no_good_source |  | 所有候选来源均未提及亚历克·拉德福德或其关于论文样本的澄清声明。原始来源为推特，但候选中无替代权威来源。需要更直接的证据，如其本人官方主页、机构资料页或可靠媒体采访。 |
| 唐杰 | 4.7 is coming, one of your best coding partners. https://z.ai/blog/glm-4.7 | augment_source | 清华大学唐杰：大模型与超级智能 - 智源社区 (hub.baai.ac.cn) | 原始来源为唐杰个人社交媒体发布的简短预告，信息量有限。候选中智源社区的文章明确关联唐杰与GLM-4模型，可作为补充来源，增强其与GLM系列模型关联的权威性。但该文章未直接提及GLM-4.7，因此作为补强而非替换。 |
| 埃里克·霍维茨 | The work continues on with advancing AI + biology responsibly, Much more to do. We need t... | augment_source | 埃里克·霍维茨在人工智能的新时代 - Microsoft Learn (learn.microsoft.com)<br>Eric Horvitz (learn.hms.harvard.edu) | 原始来源为一条笼统的推文，信息密度低。候选中的微软官方视频页面和哈佛医学院页面均能权威地补充埃里克·霍维茨在AI与生物科学交叉领域的观点和职位，可作为补强来源。 |
| 杰夫·迪恩 | Awesome to see this overview of work done by many, many people in @GoogleResearch over th... | augment_source | Jeffrey Dean - Google Research (research.google) | 原推文是杰夫·迪恩转发谷歌研究年度总结，需证明其身份与谷歌研究的关联。谷歌官方研究页面直接确认其首席科学家职位，是权威的补强来源。维基百科等可作为背景参考，但不足以单独替换。 |
| 黄仁勋 | Note on Nvidia's $4.4T valuation exceeding total crypto market cap, joking about Jensen H... | no_good_source |  | 候选来源均未提供直接证据支持原始声明。原始声明涉及黄仁勋对Nvidia估值与加密货币市场比较的调侃，但候选来源要么缺失人物姓名，要么内容不相关（如仅讨论Nvidia市值、财报或黄仁勋的其他言论）。没有权威来源能证明该特定评论或玩笑的存在。 |

## Execution Rule

- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.
- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.
- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.
