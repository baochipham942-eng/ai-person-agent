# Refetch Source by Search + MiMo

Generated at: 2026-06-10T14:20:44.828Z
Remediation input: docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch3.jsonl
Search provider: tavily
Model: mimo-v2.5-pro

## Counts

| Metric | Value |
| --- | --- |
| selected tasks | 20 |
| existing rows reused | 14 |
| pending tasks | 0 |
| refetch results | 20 |
| source candidates | 196 |
| selected sources | 15 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 10 |
| no_good_source | 8 |
| augment_source | 2 |

## Selected Hosts

| Host | Count |
| --- | --- |
| github.com | 1 |
| static.sched.com | 1 |
| hanxiao.io | 1 |
| developer.nvidia.com | 1 |
| openreview.net | 1 |
| m.36kr.com | 1 |
| news.cn | 1 |
| thetwentyminutevc.com | 1 |
| meta.com | 1 |
| forbes.com | 1 |
| colah.github.io | 1 |
| profiles.stanford.edu | 1 |
| stvp.stanford.edu | 1 |
| en.wikipedia.org | 1 |
| events.wired.com | 1 |

## Sample Results

| Person | Target | Decision | Sources | Reason |
| --- | --- | --- | --- | --- |
| Arthur Mensch | modl | replace_source | Arthur Mensch arthurmensch - GitHub (github.com) | 原始来源（GitHub仓库）过于简略。候选中，Arthur Mensch的GitHub个人主页是权威、可访问的官方技术主页，能直接证明其身份与技术贡献，适合作为替换来源。其他候选均未直接关联modl项目。 |
| Arthur Mensch | numerical_analysis | no_good_source |  | 候选来源均为关于Arthur Mensch作为Mistral AI CEO的采访、报道或社交媒体帖子，无一提及'numerical_analysis' GitHub仓库。无法证明该仓库属于他或与AI直接相关，因此无法替换或补强原始来源。 |
| Chris Olah | data | no_good_source |  | 所有候选来源均未提供Chris Olah与'data'项目直接相关的证据。原始来源（GitHub仓库）缺乏人物姓名和贡献角色，候选来源虽提及Chris Olah，但内容与'data'无关。无法替换或补强缺失来源。 |
| Han Xiao | hanxiao/demo-gnes-flow | replace_source | [PDF] Generic Neural Elastic Search - Sched (static.sched.com) | 候选PDF是Han Xiao在OSS EU 2019会议上的官方演示文稿，明确包含其姓名和GNES Flow API演示内容，直接证明该项目为其原创工作，权威性高，可替换原GitHub仓库链接。 |
| Han Xiao | hanxiao/demo-poems-ir | replace_source | Han Xiao, Ph.D. (肖涵) · Han Xiao Blog - Search AI (hanxiao.io) | 原来源仅为GitHub仓库页面，缺乏人物归属证明。候选中hanxiao.io是本人官方主页，能权威证明其身份与Jina AI的关联，可作为替换来源。其他候选未直接支持demo-poems-ir的归属。 |
| Matthew Berman | TheMattBerman/YouClip | no_good_source |  | 所有候选来源均未提及 'YouClip' 项目，无法证明 Matthew Berman 是该项目的创建者或贡献者。需要更直接的来源，如项目官方页面、作者声明或可靠报道。 |
| Percy Liang | refdb | no_good_source |  | 所有候选来源均未提及 'refdb'。它们仅能证明 Percy Liang 的身份和研究领域，但无法建立其与 'refdb' 的直接关联。根据证据要求，需要能明确支持 'refdb' 归属的来源，当前候选不满足此条件。 |
| Percy Liang | sfig | no_good_source |  | 所有候选来源均未提及'sfig'项目，无法证明Percy Liang与sfig的关系。需要更直接的来源，如GitHub仓库的官方文档、Percy Liang个人主页中列出的项目，或可靠媒体中提及sfig的报道。 |
| 亚历克·拉德福德 | JSEye | no_good_source |  | 候选来源中没有任何一个提及亚历克·拉德福德或JSEye项目。它们要么是无关主题（如大语言模型、语音识别、Java代码），要么是通用页面（如OpenAI研究主页、招聘页面），要么是完全不相关的网站。无法证明人物与项目的关系。 |
| 亚历克·拉德福德 | text-generation | no_good_source |  | 所有候选来源均未提及人物亚历克·拉德福德，无法证明其与“text-generation”项目的关联。需要更直接的来源，如其个人主页、OpenAI官方资料页或明确提及他贡献的论文/报道。 |
| 布莱恩·卡坦扎罗 | catanzaro.codepy | no_good_source |  | 所有候选来源均未提供布莱恩·卡坦扎罗与'catanzaro.codepy'代码库的直接关联证据。现有来源要么是通用页面，要么仅提及人物但未涉及该特定项目。无法替换或补强原始来源。 |
| 布莱恩·卡坦扎罗 | catanzaro.pycuda | augment_source | Author: Bryan Catanzaro \| NVIDIA Technical Blog (developer.nvidia.com)<br>Bryan Catanzaro \| OpenReview (openreview.net) | 候选来源中，英伟达官方博客作者页和OpenReview学术档案页能有效补强原来源，直接证明人物身份、职位及与英伟达的关联。其他来源权威性不足或信息不明确，不作为主要替换。 |
| 布莱恩·卡坦扎罗 | tuple-cat | augment_source | 英伟达副总裁：除了围棋，人工智能下一个让人惊讶的领域是什么-36氪 (m.36kr.com) | 36氪采访是可靠的权威媒体来源，能有效补强人物背景和职位信息，但未直接提及tuple-cat项目。因此，它适合作为补强来源，而非替换原始GitHub仓库。原始仓库本身是直接证据，应保留。 |
| 科拉伊·卡武克丘奥卢 | lmexplorer | replace_source | 谷歌推出新版“双子座”模型-新华网 (news.cn) | 原始来源（GitHub仓库）信息密度低，无法有效证明人物与项目的关系。候选来源1（新华网报道）是权威媒体，明确提及人物姓名、职位（谷歌AI部门负责人）及其在谷歌AI项目中的角色，可直接替换原始来源，提供更强的证据支持。 |
| Aidan Gomez | Aidan Gomez: What No One Understands About Foundation Models \| E1191 \| Nick Frosst | replace_source | Aidan Gomez, Co-founder & CEO @Cohere: What No One Understands About Foundation Models (thetwentyminutevc.com) | 原始来源（LinkedIn帖子）因登录墙无法访问正文。候选来源中，thetwentyminutevc.com的页面标题与原始来源完全匹配，且为播客官方页面，权威性高，能直接证明Aidan Gomez参与了该访谈，是理想的替换来源。 |
| Alexandr Wang | From Scale AI to Meta’s AI boss: Who is Alexandr Wang, the 28-year-old MIT dropout gunnin... | replace_source | Alexandr Wang, Chief AI Officer (meta.com)<br>Alexandr Wang (forbes.com) | 原始来源标题高度相关但正文质量差。候选中，Meta官方页面和福布斯资料页是权威、可访问的来源，能直接证明Alexandr Wang从Scale AI创始人/CEO到Meta首席AI官的关键职业转变，完美匹配标题核心信息，可作为高质量替换来... |
| Chris Olah | colah - Repositories | replace_source | [PDF] Chris Olah – - colah's blog (colah.github.io) | Chris Olah的官方简历PDF（colah.github.io/cv.pdf）是权威的个人来源，明确包含其GitHub用户名（colah）和职业经历，直接证明了colah仓库列表页面属于他本人，适合作为替换来源。 |
| Christopher Manning | Christopher D Manning - Profile on Academia.edu | replace_source | Christopher Manning's Profile \| Stanford Profiles (profiles.stanford.edu) | 原Academia.edu页面抓取内容无效，需替换。斯坦福大学官方资料页是权威、可访问的直接来源，能明确证明人物身份、职位和所属机构，符合证据要求。 |
| Daniela Amodei | Corporate Structure for Ethical AI - Daniela Amodei (Anthropic) | replace_source | Daniela Amodei (Anthropic) – 'Helpful, Honest, Harmless' AI (stvp.stanford.edu) | 原始来源（YouTube）为登录页面，无实质内容。候选中，斯坦福大学官方页面（stvp.stanford.edu）权威性高，明确关联Daniela Amodei、Anthropic及AI伦理主题，适合作为替换来源。其他候选或权威性不足，或... |
| Daniela Amodei | The Inspiring Story of Daniela Amodei, Anthropic's Leader | replace_source | Daniela Amodei - Wikipedia (en.wikipedia.org)<br>Speaker Details: WIRED: The Big Interview (events.wired.com) | 原始来源质量低，信息密度不足。候选中的Wikipedia页面和WIRED活动页面均直接、权威地介绍了Daniela Amodei的职位、背景和成就，能有效替换或补强原始来源，满足证据要求。 |

## Execution Rule

- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.
- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.
- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.
