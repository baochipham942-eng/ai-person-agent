# Refetch Source by Search + MiMo

Generated at: 2026-06-10T18:53:16.318Z
Remediation input: docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch18.jsonl
Search provider: tavily
Model: mimo-v2.5-pro

## Counts

| Metric | Value |
| --- | --- |
| selected tasks | 20 |
| existing rows reused | 0 |
| pending tasks | 0 |
| refetch results | 20 |
| source candidates | 192 |
| selected sources | 24 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 16 |
| augment_source | 2 |
| no_good_source | 1 |
| human_review | 1 |

## Selected Hosts

| Host | Count |
| --- | --- |
| forbes.com | 3 |
| jasonwei.net | 3 |
| lilianweng.github.io | 2 |
| bbc.com | 2 |
| openreview.net | 1 |
| montgomerysummit.com | 1 |
| cbsnews.com | 1 |
| possible.fm | 1 |
| achievement.org | 1 |
| fortune.com | 1 |
| britannica.com | 1 |
| bloomberg.com | 1 |
| inabr.com | 1 |
| stability.ai | 1 |
| cifar.ca | 1 |
| nobelprize.org | 1 |
| openai.com | 1 |
| y2doc.com | 1 |

## Sample Results

| Person | Target | Decision | Sources | Reason |
| --- | --- | --- | --- | --- |
| 李莲 | 【学习笔记】博客Lilian Weng - LLM Powered Autonomous ... | replace_source | LLM Powered Autonomous Agents \| Lil'Log (lilianweng.github.io) | 原始声明是关于Lilian Weng的博客文章。候选中找到了其官方博客上的原始文章，标题完全匹配，作者明确，是最佳权威替代来源。其他候选要么不相关，要么权威性不足。 |
| 李莲 | lilianweng - Overview | replace_source | Lilian Weng \| OpenReview (openreview.net)<br>An Overview of Deep Learning for Curious People \| Lil'Log (lilianweng.github.io) | 原始来源仅为GitHub导航栏碎片，缺乏实质内容。候选中OpenReview个人资料页权威且直接证明其职位，个人博客可证明作者身份与专业贡献，两者结合可有效替换并补强来源。 |
| Aidan Gomez | Humans behind AI: Aidan Gomez | replace_source | Aidan Gomez - The Montgomery Summit (montgomerysummit.com) | 原来源（McKinsey）正文缺乏关于Aidan Gomez的实质内容。候选中montgomerysummit.com页面是权威会议官网，直接、清晰地证明了人物身份、职位及核心贡献（Transformer论文），符合替换要求。其他候选或权... |
| Daniela Amodei | Artificial Intelligence: A Year in Review | replace_source | Daniela Amodei - Forbes (forbes.com) | 原始来源不相关，仅标题提及但未聚焦Daniela Amodei本人。Forbes个人资料页权威、可访问，直接证明其作为Anthropic联合创始人兼总裁的身份，能有效替换原始来源。其他候选来源要么权威性不足，要么证据不直接，无法作为可靠替... |
| Dario Amodei | Why this leading AI CEO is warning the tech could cause mass unemployment \| CNN Business | replace_source | Why Anthropic CEO Dario Amodei spends so much time warning of ... (cbsnews.com) | 原始CNN来源被QA拒绝，因正文内容无关。CBS新闻的60分钟节目转录直接包含Dario Amodei关于AI危险的警告，权威性高，内容明确，可作为可靠替换来源。 |
| Demis Hassabis | Demis Hassabis: ‘AI will affect the whole world … It’s going to change everything’ | augment_source | Demis Hassabis on AI, game theory, multimodality, and the nature of ... (possible.fm)<br>Sir Demis Hassabis \| Academy of Achievement (achievement.org) | 原始来源因付费墙无法访问。候选中，possible.fm的播客转录页面提供了与声明高度匹配的直接引语，是权威的访谈来源。achievement.org的资料页可作为人物背景的权威补充。其他候选或因内容不明确、或因权威性不足而被拒绝。 |
| Elon Musk | Elon Musk is worth a record $648 billion — and his wealth gain this year exceeds Bernard ... | replace_source | Who is Elon Musk and what is his net worth? - BBC (bbc.com) | 原始来源（Business Insider）为付费墙内容，权威性不足。BBC的专题页面提供了权威、可访问的替代来源，直接支持马斯克作为世界首富的身份和财富状况，符合证据要求。其他候选来源要么权威性较低，要么内容不直接匹配，要么为辅助性来源。 |
| Elon Musk | Elon Musk Just Became The First Person Ever Worth $600 Billion | replace_source | Elon Musk's wealth has soared past $600 billion—he's now worth double the next richest person alive, Google's cofounder Larry Page \| Fortune (fortune.com)<br>Who is Elon Musk and what is his net worth? - BBC (bbc.com) | 原始来源因与AI/科技关联度低被拒。候选中Fortune和BBC的报道直接、权威地支持了“马斯克成为首位净资产超6000亿美元的人”这一声明，可作为替换或补强来源。其他候选来源权威性不足或为社交媒体内容，予以拒绝。 |
| Elon Musk | Elon Musk: Businessman, Tesla, SpaceX, X, Wealthiest Person | replace_source | Elon Musk \| SpaceX, Tesla, xAI, X, & PayPal \| Britannica Money (britannica.com) | 原始来源为Facebook帖子，质量低。Britannica是权威百科，直接、全面地证明了马斯克作为商人及其在特斯拉、SpaceX、X、PayPal等公司的角色，以及其财富地位，完全符合证据要求，是理想的替换来源。 |
| Elon Musk | Elon Musk’s wealth has soared past $600 billion—he’s now worth double the next richest pe... | replace_source | SpaceX Tender Offer Pushes Musk’s Net Worth To Record $677 Billion (forbes.com) | 原始来源因缺乏AI/科技深度被拒，但候选中的福布斯文章提供了权威、可访问的直接证据，明确支持马斯克财富突破6000亿美元的声明，适合作为替换来源。 |
| Elon Musk | Four takeaways from Walter Isaacson’s biography of Elon Musk \| CNN Business | no_good_source |  | 所有候选来源均为对沃尔特·艾萨克森所著马斯克传记的报道、评论或转录，属于二次内容。它们未能提供直接、权威的证据来证明马斯克本人的职位、作品或观点，无法替换或补强原始来源中与AI/科技主题关联性弱的问题。需要寻找马斯克本人或其公司的官方资料... |
| Elon Musk | The Richest Person In America 2025 | replace_source | Elon Musk (forbes.com)<br>The Bloomberg Billionaires Index is a daily ranking of the world’s richest people. Details about the net worth calculations are provided for transparency in the net worth analysis on each billionaire’s individual profile page. The figures are updated at the close of every trading day in New York. (bloomberg.com) | 原来源被判定为不相关综述。候选中福布斯和彭博的官方个人资料页是权威来源，能直接证明埃隆·马斯克在2025年财富排名中的地位，符合替换要求。 |
| Elon Musk | 美国国家工程院新增院士名单出炉，马斯克入选，张宏江、方岱宁等入选外籍院士！ | replace_source | 马斯克当选美国国家工程院院士 (inabr.com) | 原始来源权威性不足。候选来源中，inabr.com的文章提供了详细、权威的报道，直接引用了美国国家工程院的官方信息，明确支持马斯克入选院士的事实，符合替换要求。其他候选来源或权威性不足，或存在访问限制，或未直接提及人物姓名。 |
| Emad Mostaque | Founder Emad Mostaque exits AI picture start-up StabilityAI | replace_source | Stability AI Announcement (stability.ai) | 官方公告直接、权威地证明了Emad Mostaque辞去Stability AI CEO及董事会职务的事实，符合证据要求，可替换原付费墙来源。 |
| Geoffrey Hinton | Geoffrey Hinton - CIFAR | replace_source | Reach 2025: Geoffrey Hinton – CIFAR (cifar.ca)<br>Geoffrey Hinton – Podcast - NobelPrize.org (nobelprize.org) | 原始来源（CIFAR个人简介页）抓取失败，内容空洞。候选来源中，CIFAR官方出版物（Reach 2025）直接、权威地阐述了Hinton与CIFAR的长期关系和贡献，是理想的替换来源。诺贝尔奖官网播客页面可作为补充，提供权威背景信息。其... |
| Greg Brockman | GPT-4 | replace_source | GPT-4 contributions - OpenAI (openai.com) | OpenAI官方贡献页面是权威来源，直接证明Greg Brockman在GPT-4项目中的基础设施负责人角色，符合证据要求。其他候选来源虽提及人物，但缺乏官方直接证明或具体贡献描述。 |
| Greg Brockman | GPT-4o System Card | augment_source | Transcript & Notes: Greg Brockman on OpenAI's Road to AGI \| Y2Doc (y2doc.com) | 原始来源（GPT-4o System Card PDF）未提及Greg Brockman，无法建立人物与作品的关联。候选中，播客转录页面明确显示Greg Brockman本人参与讨论OpenAI技术进展，可作为其技术领导角色的补充证据，但... |
| Jason Wei | Jason Wei | replace_source | Jason Wei (jasonwei.net)<br>Papers - Jason Wei (jasonwei.net) | 原始来源因乱码无法使用。候选中的个人官方主页（jasonwei.net）及其论文页是最佳替代，它们直接、权威地证明了Jason Wei的身份、当前职位、过往经历及核心研究贡献，完全满足证据要求。 |
| Jason Wei | WeiLab | replace_source | Jason Wei (jasonwei.net) | 候选来源中，jasonwei.net是Jason Wei的个人官方网站，明确、权威地证明了其身份、当前职位（Meta Superintelligence Labs）及过往工作（OpenAI, Google Brain）和核心研究贡献（ch... |
| Mustafa Suleyman | The AI Friend Zone | human_review |  | 所有候选来源均未直接提及或证明“The AI Friend Zone”这一具体概念与Mustafa Suleyman的关联。虽然多个来源确认了他的身份和职位，但缺乏将“The AI Friend Zone”这一特定表述归因于他的直接证据。... |

## Execution Rule

- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.
- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.
- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.
