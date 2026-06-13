# Refetch Source by Search + MiMo

Generated at: 2026-06-10T16:37:37.052Z
Remediation input: docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch10.jsonl
Search provider: tavily
Model: mimo-v2.5-pro

## Counts

| Metric | Value |
| --- | --- |
| selected tasks | 20 |
| existing rows reused | 13 |
| pending tasks | 0 |
| refetch results | 20 |
| source candidates | 195 |
| selected sources | 28 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 11 |
| augment_source | 7 |
| no_good_source | 1 |
| human_review | 1 |

## Selected Hosts

| Host | Count |
| --- | --- |
| tsinghua.edu.cn | 2 |
| wired.com | 2 |
| lennysnewsletter.com | 2 |
| m.36kr.com | 1 |
| microsoft.com | 1 |
| cs.tsinghua.edu.cn | 1 |
| news.wit.edu.cn | 1 |
| junzhu.chem8.org | 1 |
| hkforum.com | 1 |
| lilianweng.github.io | 1 |
| xiaguangshe.com | 1 |
| mittrchina.com | 1 |
| zh.wikipedia.org | 1 |
| ted.com | 1 |
| podcasts.apple.com | 1 |
| goldmansachs.com | 1 |
| en.wikipedia.org | 1 |
| erichorvitz.com | 1 |
| cnbc.com | 1 |
| troweprice.com | 1 |
| blog.eladgil.com | 1 |
| youtube.com | 1 |
| snowan.gitbook.io | 1 |
| stationf.co | 1 |
| developing.dev | 1 |

## Sample Results

| Person | Target | Decision | Sources | Reason |
| --- | --- | --- | --- | --- |
| 唐杰 | 清华大学唐杰：从GPT到GPT Zero会是今年重大阶段性成果 | replace_source | 清华大学唐杰：从GPT到GPT Zero会是今年重大阶段性成果-36氪 (m.36kr.com) | 候选来源中，36氪的文章标题与原始声明完全一致，且内容为唐杰在2024中关村论坛的演讲实录，明确支持其观点，是权威、可访问的媒体来源，可直接替换原始来源。其他来源要么观点不完全匹配，要么权威性不足，或未直接支持原始声明。 |
| 唐杰 | 计算机系教授唐杰做客荷声讲坛阐释生成式人工智能大模型 ... | replace_source | 计算机系教授唐杰做客荷声讲坛阐释生成式人工智能大模型 ... (tsinghua.edu.cn) | 原始来源（tsinghua.edu.cn）虽被标记为正文信息缺失，但其标题和预览已明确包含关键信息（人物、事件、主题），且为清华大学官方域名，权威性高。候选中无其他来源能更直接、权威地证明该事件。因此，选择原始来源作为替换，其内容足以支持... |
| 埃里克·霍维茨 | Eric Horvitz | replace_source | Eric Horvitz, Chief Scientific Officer - Microsoft (microsoft.com) | 原来源为Google Scholar个人资料页，信息密度低。候选中的微软官方人物主页（microsoft.com/research/people/horvitz）是权威、可访问的一级来源，能直接证明埃里克·霍维茨的职位（首席科学官）及其与... |
| 朱军 | Zhu Jun | replace_source | 朱军-清华大学计算机科学与技术系 (cs.tsinghua.edu.cn) | 原始来源（中关村论坛页面）内容空泛，缺乏朱军本人具体信息。候选中清华大学计算机系官方教师主页是权威、可访问、直接证明朱军身份和职位的最佳来源，可替换原始来源。 |
| 朱军 | 朱军\| 香港中文大学（深圳）理工学院 | augment_source | 生数科技朱军：视频模型下一步是高可控，中国视频大模型引领全球 (tsinghua.edu.cn)<br>香港中文大学（深圳）理工学院朱军教授应邀来校讲学交流-武汉工程大学新闻中心 (news.wit.edu.cn)<br>Contact \| Zhu Group at the Chinese University of Hong Kong, Shenzhen (junzhu.chem8.org) | 候选来源中，清华大学页面、武汉工程大学新闻页面和朱军研究组页面均能直接、权威地证明朱军与香港中文大学（深圳）理工学院的职位关系，以及其在清华大学和生数科技的关联。这些来源可补强原始来源的不足，提供具体人物信息和权威证据。 |
| 李开复 | Kai-Fu Lee | replace_source | 李开复- 香港中美论坛 (hkforum.com) | 香港中美论坛的嘉宾页是权威机构官方页面，直接、清晰地列出了李开复的现任职位（零一万物CEO、创新工场董事长）和过往经历，完全满足证据要求，可替换信息量不足的维基百科来源。 |
| 李莲 | Lilian Weng | augment_source | Thinking about High-Quality Human Data \| Lil'Log (lilianweng.github.io)<br>重磅！前 OpenAI 华人副总裁 Lilian Weng 加入Fellows Fund Fellow团队，开启 AI 新征程 – 霞光社ShineGlobal (xiaguangshe.com) | 原始Google Scholar来源信息密度低。候选中，本人官方博客（Lil'Log）是证明其技术身份和工作的最佳权威来源。霞光社的报道提供了其最新、具体的职业变动信息，可作为补充。两者结合能有效补强人物页面的信息。 |
| 桑达尔·皮查伊 | 谷歌CEO 桑达尔·皮查伊（Sundar Pichai） 刚刚发表了一项 ... | replace_source | 麻省理工科技评论-独家专访谷歌CEO桑达尔·皮查伊：基于我的个人经历 (mittrchina.com) | 原始来源为Facebook登录页片段，无实质信息。候选中麻省理工科技评论的专访文章权威性高，直接证明皮查伊的谷歌CEO身份及其对AI等科技未来的观点，可作为有效替换来源。其他候选或权威性不足，或证据不直接，或为辅助来源。 |
| 阿希什·瓦斯瓦尼 | Attention Is All You Need \| Request PDF | augment_source | 阿西什·瓦斯瓦尼 - 维基百科，自由的百科全书 (zh.wikipedia.org) | 原始来源（ResearchGate请求页面）信息密度低。候选中的中文维基百科页面提供了权威的人物背景和论文贡献描述，可作为补强来源。但维基百科属于辅助线索，建议进一步寻找官方主页或机构页面作为主要替换来源。 |
| 雅各布·乌什科雷特 | Jakob Uszkoreit \| TEDAI San Francisco - TED Talks | replace_source | Jakob Uszkoreit: How AI sidesteps traditional science \| TED Talk (ted.com)<br>The AI Pioneer Developing New Kinds of Medicine - Apple Podcasts (podcasts.apple.com) | 原始来源（TEDAI San Francisco页面）内容空泛，仅为导航链接。候选中TED官方演讲页面和Apple Podcasts页面均能直接、权威地证明其演讲者身份及Transformer论文作者身份，可有效替换或补强。 |
| 黄仁勋 | How Jensen Huang’s Nvidia Is Powering the A.I. Revolution | augment_source | Nvidia CEO Jensen Huang Is Powering the AI Revolution \| WIRED (wired.com)<br>Nvidia’s Jensen Huang dissects the AI revolution \| Goldman Sachs (goldmansachs.com) | 原来源（纽约客）权威但抓取内容仅为导语，信息密度低。候选中WIRED和高盛来源标题直接关联人物与AI革命主题，权威性高，可作为补充来源，增强证据链。其他候选或权威性不足，或需进一步验证。 |
| 黄仁勋 | Nvidia CEO Jensen Huang Is Powering the AI Revolution | replace_source | Jensen Huang - Wikipedia (en.wikipedia.org)<br>Nvidia CEO Jensen Huang Is Powering the AI Revolution - WIRED (wired.com) | 原始来源抓取内容不足，缺乏实质性描述。候选中，维基百科页面直接证明黄仁勋的职位，WIRED文章标题和内容明确关联其角色与AI革命，两者均权威、可访问且能直接证明人物与作品/观点/职位关系，适合作为替换来源。 |
| 埃里克·霍维茨 | Here's the transcript of my presidential lecture at AAAI 2008. Concepts about | replace_source | Artificial Intelligence in the Open World - AAAI Presidential Address (erichorvitz.com) | 原始来源仅为推文，信息量低。候选中，埃里克·霍维茨个人网站上的页面直接提供了其2008年AAAI主席演讲的完整转录，是权威、可访问且直接证明人物与作品关系的来源，完美替代原始来源。 |
| 科拉伊·卡武克丘奥卢 | //deepmind.google/blog/advanced-version-of-gemini-with-deep-think-officially-achieves-gol... | no_good_source |  | 所有候选来源均未直接提及科拉伊·卡武克丘奥卢本人，无法证明他与Gemini在IMO取得金牌这一成就的具体关联。需要寻找能明确证明其职位、角色或贡献的权威来源，例如其官方个人资料页、机构介绍页或包含其姓名的可靠采访。 |
| 黄仁勋 | Detailed summary and insights from Jensen Huang's recent long-form interview on AI, work,... | augment_source | CNBC Transcript: NVIDIA Co-Founder, President & CEO Jensen Huang Speaks with CNBC’s “Squawk Box” Today (cnbc.com)<br>The Long View: Interview with Jensen Huang, Founder and CEO of Nvidia Corporation \| T. Rowe Price (troweprice.com) | 原始来源仅为标题，缺乏实质内容。候选中CNBC和T. Rowe Price的页面提供了明确的访谈转录或深度内容，可直接补强证据。其他来源权威性不足或需进一步验证。 |
| Arthur Mensch | Complex matters slowly coming together — we actually got surprised ourselves | augment_source | Discussion w Arthur Mensch, CEO of Mistral AI - by Elad Gil (blog.eladgil.com)<br>Arthur Mensch: Open vs Closed - Who Wins and Mistral's Position (youtube.com) | 原始来源为推文，信息密度低。候选中有权威访谈和播客，可补强Arthur Mensch作为Mistral AI CEO的言论背景，但未找到直接包含目标引述的来源。建议用权威访谈作为辅助来源，并继续搜索目标引述的原始上下文。 |
| Arthur Mensch | Mistral Medium 2 was Miqu by the way | human_review |  | 候选来源中，The Decoder文章直接引用Arthur Mensch确认Miqu是泄露模型，与原始声明相关，但权威性中等。其他来源均未提及Miqu或Mistral Medium 2。需要更权威的官方来源（如Mistral AI官方博客... |
| Boris Cherny | - Each tab has its own git checkout - Claude manages context, I don’t do anything special... | replace_source | 10 Tips for Using Claude Code from Its Creator, Boris Cherny \| Study Notes (snowan.gitbook.io) | 原始来源为推文，内容简短。候选来源中，Study Notes页面直接引用了Boris Cherny关于Claude Code使用习惯的详细分享，内容与原始声明（每个标签页有独立git checkout，Claude管理上下文）高度匹配，且... |
| Boris Cherny | It really depends on the language, and each model gets better and better at it. Usually i... | replace_source | Boris Cherny, Anthropic: “I have not written a single line of code since November” \| STATION F (stationf.co)<br>Head of Claude Code: What happens after coding is solved \| Boris ... (lennysnewsletter.com) | 原始来源为推文，权威性不足。候选中，STATION F和Lenny's Newsletter的页面明确提及Boris Cherny的职位和观点，可作为更权威的替代来源。其他候选多为社交媒体或受限页面，不符合要求。 |
| Boris Cherny | That is well supported, added many months back. Just send a message while Claude is runni... | augment_source | Head of Claude Code: What happens after coding is solved \| Boris Cherny (lennysnewsletter.com)<br>Boris Cherny (Creator of Claude Code) On How His Career Grew (developing.dev) | 原始来源为推文，权威性一般。候选中，Lenny's Newsletter和developing.dev的文章是权威媒体对Boris Cherny的专访，明确其职位和角色，可作为人物背景的权威补充，增强页面信息密度。但两者均未直接包含原始声... |

## Execution Rule

- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.
- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.
- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.
