# Refetch Source by Search + MiMo

Generated at: 2026-06-10T19:25:09.741Z
Remediation input: docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch20.jsonl
Search provider: tavily
Model: mimo-v2.5-pro

## Counts

| Metric | Value |
| --- | --- |
| selected tasks | 20 |
| existing rows reused | 8 |
| pending tasks | 0 |
| refetch results | 20 |
| source candidates | 197 |
| selected sources | 19 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 8 |
| no_good_source | 7 |
| augment_source | 4 |
| human_review | 1 |

## Selected Hosts

| Host | Count |
| --- | --- |
| coursera.org | 2 |
| deeplearning.ai | 2 |
| openreview.net | 2 |
| cs.tsinghua.edu.cn | 1 |
| m.36kr.com | 1 |
| i.ifeng.com | 1 |
| lingyiwanwu.com | 1 |
| hkforum.com | 1 |
| lilianweng.github.io | 1 |
| idctoutiao.com | 1 |
| mittrchina.com | 1 |
| time.com | 1 |
| blog.google | 1 |
| wiki.mbalib.com | 1 |
| semanticscholar.org | 1 |
| papers.neurips.cc | 1 |

## Sample Results

| Person | Target | Decision | Sources | Reason |
| --- | --- | --- | --- | --- |
| 吴恩达 | Generative AI for Everyone by DeepLearning.AI | replace_source | Generative AI for Everyone \| Coursera (coursera.org)<br>Generative AI for Everyone - DeepLearning.AI (deeplearning.ai) | 候选来源中，Coursera和DeepLearning.AI的官方课程页面是证明吴恩达与“Generative AI for Everyone”课程关系的最权威、最直接的来源。它们明确标注了讲师信息，符合证据要求。其他来源要么权威性不足，... |
| 吴恩达 | Machine Learning Specialization | replace_source | Machine Learning \| Coursera (coursera.org)<br>Machine Learning Specialization - DeepLearning.AI (deeplearning.ai) | 候选来源中，Coursera和DeepLearning.AI的官方课程页面是权威、可访问的一手来源，能直接证明吴恩达是该课程的讲师，符合证据要求。其他来源要么权威性不足，要么未直接提及人物姓名。 |
| 唐杰 | SJTU Computer Science & Engineering | replace_source | 唐杰-清华大学计算机科学与技术系 (cs.tsinghua.edu.cn) | 原始来源错误匹配了上海交通大学的唐飞龙教授。候选中清华大学官方师资页面是权威来源，明确证明唐杰是清华大学计算机系教授，可直接替换错误来源。 |
| 布莱恩·卡坦扎罗 | Bryan Catanzaro | replace_source | 英伟达副总裁：除了围棋，人工智能下一个让人惊讶的领域是什么-36氪 (m.36kr.com)<br>Bryan Catanzaro \| OpenReview (openreview.net) | 候选来源中，36氪采访和OpenReview资料页均能直接证明布莱恩·卡坦扎罗是英伟达副总裁，权威性高且可访问。其他来源要么身份不符，要么权威性不足或需额外验证。 |
| 李开复 | AI创业公司的2025：一半是海水，一半是火焰 | augment_source | AI创业公司的2025：一半是海水，一半是火焰_凤凰网 (i.ifeng.com)<br>零一万物-AI2.0大模型技术和应用的全球公司 (lingyiwanwu.com)<br>李开复 - 香港中美论坛 (hkforum.com) | 原始来源缺失且未体现直接关联。候选中，凤凰网文章直接引用并分析了李开复的零一万物作为案例；零一万物官网和香港论坛嘉宾页提供了权威的职位和公司信息。三者结合可有效补强证据链。 |
| 李莲 | Lilian Weng | augment_source | Lilian Weng \| OpenReview (openreview.net)<br>Why We Think \| Lil'Log (lilianweng.github.io) | 原始来源（Google Scholar）因语言问题失效。候选中，OpenReview页面提供了权威的职位和学术记录，本人博客提供了直接的作者身份证明。两者结合可有效补强人物身份与贡献的证据链。 |
| 李飞飞 | Artificial Intelligence Index Report 2025 | no_good_source |  | 所有候选来源均未在提供的文本预览中明确提及李飞飞的姓名或其在《AI指数报告2025》中的具体角色（如作者、负责人）。无法满足证据要求，因此无法替换或补强现有来源。 |
| 桑达尔·皮查伊 | 750亿美元的豪赌：谷歌是否在为Gemini项目赌上自己的帝国？ | replace_source | 谷歌 CEO 桑达尔·皮查伊重申 750 亿美元数据中心投资计划 - IDC头条-IDC头条 (idctoutiao.com) | 候选来源中，IDC头条的文章直接引用皮查伊在谷歌云大会上的声明，明确将750亿美元投资计划与皮查伊本人关联，符合证据要求。其他来源要么未提及皮查伊，要么未涉及750亿美元投资，或权威性不足。 |
| 桑达尔·皮查伊 | DeepMind CEO为谷歌攻关AI杀手级应用 | no_good_source |  | 所有候选来源均无法证明“桑达尔·皮查伊”与“DeepMind CEO为谷歌攻关AI杀手级应用”这一声明的直接关联。多数来源要么是关于皮查伊的通用传记，要么是关于DeepMind CEO Demis Hassabis的报道，与原始声明的主体... |
| 桑达尔·皮查伊 | DeepMind CEO为谷歌攻关AI杀手级应用 | no_good_source |  | 所有候选来源均未能直接证明‘桑达尔·皮查伊’与‘DeepMind CEO为谷歌攻关AI杀手级应用’这一主张的关联。多数来源要么是关于德米斯·哈萨比斯（DeepMind CEO），要么是桑达尔·皮查伊的传记但未提及该具体主张，要么是权威性不... |
| 桑达尔·皮查伊 | Google launches Gemini, the AI model it hopes will take down GPT-4 | human_review |  | 候选来源均未直接证明皮查伊本人与Gemini发布的关系，缺乏权威的官方声明、采访或机构页面。需要更直接的证据来支持该声明属于其个人页面。 |
| 桑达尔·皮查伊 | How we're making AI helpful for everyone | augment_source | 麻省理工科技评论-独家专访谷歌CEO桑达尔·皮查伊：基于我的个人经历 (mittrchina.com)<br>How Sundar Pichai Pushed Google To the Front of the AI Race - TIME (time.com) | 原始来源（ai.google）为通用营销页面，未具体涉及皮查伊。候选中的MIT科技评论专访和TIME文章均权威、可访问，且直接证明皮查伊作为谷歌CEO推动AI（如Gemini）的角色，能有效补强证据。其他候选要么无关，要么证据不足。 |
| 桑达尔·皮查伊 | Sundar Pichai - CEO of Alphabet and Google at Alphabet (GOOGL) | replace_source | Sundar Pichai \| Google Blog (blog.google) | 原始来源（fintool.com）为薪酬档案，信息密度低。候选中，谷歌官方博客作者页（blog.google）是最佳替代，它直接、权威地证明了桑达尔·皮查伊作为Google和Alphabet CEO的身份，符合证据要求。其他候选来源要么权... |
| 桑达尔·皮查伊 | Who Is Sundar Pichai? | replace_source | 桑達爾·皮查伊 - MBA智库百科 (wiki.mbalib.com) | 原来源（Investopedia文章）内容不相关。候选中的MBA智库百科页面是权威的中文资料，直接、全面地介绍了皮查伊的生平、教育、职业历程及CEO职位，完美匹配“Who Is Sundar Pichai?”的查询意图，可作为高质量替换来... |
| 桑达尔·皮查伊 | 谷歌CEO桑达尔·皮查伊：从穷小子到完美总裁 | no_good_source |  | 候选来源均为转载、百科或聚合页面，缺乏官方或权威机构的一手资料。原始来源质量低，内容侧重个人故事而非职位证明。无法找到符合要求的权威替换来源。 |
| 科拉伊·卡武克丘奥卢 | AlphaFold | no_good_source |  | 所有候选来源均未直接提及目标人物科拉伊·卡武克丘奥卢。这些来源主要讨论AlphaFold项目、Demis Hassabis或其他团队成员，无法建立该人物与AlphaFold的直接关联。需要寻找明确提及该人物姓名及其在AlphaFold项目... |
| 科拉伊·卡武克丘奥卢 | Convolutional neural network | no_good_source |  | 所有候选来源均未能直接证明科拉伊·卡武克丘奥卢与卷积神经网络的特定关系。Yann LeCun的论文PDF中虽有其姓名，但该论文是通用技术综述，并非权威证明其个人贡献或职位的来源。其他来源完全无关。需要更直接的个人资料页或研究论文详情页。 |
| 贾里德·卡普兰 | Scaling Laws for Autoregressive Generative Modeling | augment_source | [PDF] Scaling Laws for Autoregressive Generative Modeling \| Semantic Scholar (semanticscholar.org) | 候选来源中，Semantic Scholar页面明确将贾里德·卡普兰列为论文作者，是权威的学术索引，能直接证明其与作品的关系，适合作为补强来源。原arXiv页面因缺乏人物核心信息被拒，此页面可提供明确作者归属。 |
| 阿希什·瓦斯瓦尼 | Attention Is All You Need | replace_source | [PDF] Attention is All you Need - NIPS (papers.neurips.cc) | NeurIPS官方PDF是论文的权威原始来源，明确列出阿希什·瓦斯瓦尼为第一作者，直接证明其与《Attention Is All You Need》的作者关系，符合证据要求。其他候选来源要么权威性不足，要么属于二级参考或社交媒体。 |
| 阿希什·瓦斯瓦尼 | Generating Long Sequences with Sparse Transformers | no_good_source |  | 所有候选来源均未提及目标人物阿希什·瓦斯瓦尼，无法证明该论文与其相关。原始裁决（论文作者名单中不包含目标人物）得到确认。需要寻找能直接证明该人物与特定作品或职位关联的权威来源。 |

## Execution Rule

- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.
- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.
- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.
