# Manual RawPool Apply

Generated at: 2026-06-10T21:25:32.315Z
Mode: dry-run
Input: docs/audit-2026-06/data/prune_tail_review_manual_decisions.json
Archive: docs/audit-2026-06/data/prune_tail_review_manual_apply_post_verify_archive.json
Stage: manual_prune_tail_review_no_good

## Counts

| Metric | Value |
| --- | ---: |
| decisions | 41 |
| existing targets | 0 |
| missing targets | 41 |
| audit rows to insert | 0 |
| RawPoolItem rows to delete | 0 |

## Actions

| Action | Count |
| --- | ---: |
| delete_raw_pool_item | 41 |

## Rows

| Person | Target | Action | Exists | Reason |
| --- | --- | --- | --- | --- |
| Arthur Mensch | hcp_builder | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：这是他的GitHub仓库，关于下载和运行GLM处理HCP数据，与神经科学相关但AI相关性较弱。 Refetch curation 判为 no_good_source，原因：候选来源均未涉及 'hcp_builder' 项目，无法补强或替换原始来源。原始来源虽为 Git... |
| Arthur Mensch | numerical_analysis | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：这是他的GitHub仓库，关于数值分析的Jupyter笔记本，与AI间接相关但偏向教学，质量一般。 Refetch curation 判为 no_good_source，原因：候选来源均为关于Arthur Mensch作为Mistral AI CEO的采访、报道或社交... |
| Chris Olah | data | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：数据集管理工具与 AI 工作流相关，但内容较为通用，需确认其在 AI 领域的价值。 Refetch curation 判为 no_good_source，原因：所有候选来源均未提供Chris Olah与'data'项目直接相关的证据。原始来源（GitHub仓库）缺乏人... |
| Matthew Berman | TheMattBerman/YouClip | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：本人的开源视频工具项目，与AI领域相关性中等。 Refetch curation 判为 no_good_source，原因：所有候选来源均未提及 'YouClip' 项目，无法证明 Matthew Berman 是该项目的创建者或贡献者。需要更直接的来源，如项目官方页... |
| Percy Liang | refdb | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方学术管理工具，与 AI 技术研究无直接关联。 Refetch curation 判为 no_good_source，原因：所有候选来源均未提及 'refdb'。它们仅能证明 Percy Liang 的身份和研究领域，但无法建立其与 'refdb' 的直接关联。根据... |
| Percy Liang | sfig | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方工具库，但属于通用可视化工具，非 AI 核心内容。 Refetch curation 判为 no_good_source，原因：所有候选来源均未提及'sfig'项目，无法证明Percy Liang与sfig的关系。需要更直接的来源，如GitHub仓库的官方文档、P... |
| 亚历克·拉德福德 | JSEye | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方仓库，涉及计算机视觉，但内容描述过于简略，价值有限。 Refetch curation 判为 no_good_source，原因：候选来源中没有任何一个提及亚历克·拉德福德或JSEye项目。它们要么是无关主题（如大语言模型、语音识别、Java代码），要么是通用页面... |
| 亚历克·拉德福德 | text-generation | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方仓库，涉及文本生成，但内容描述过于简略，价值有限。 Refetch curation 判为 no_good_source，原因：所有候选来源均未提及人物亚历克·拉德福德，无法证明其与“text-generation”项目的关联。需要更直接的来源，如其个人主页、Op... |
| 布莱恩·卡坦扎罗 | catanzaro.codepy | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：虽与高性能计算相关，但仅为个人开发分支，信息密度较低。 Refetch curation 判为 no_good_source，原因：所有候选来源均未提供布莱恩·卡坦扎罗与'catanzaro.codepy'代码库的直接关联证据。现有来源要么是通用页面，要么仅提及人物但... |
| 李开复 | 李开复的10句经典名言 | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：虽然与AI相关，但属于碎片化的名言汇编，信息密度较低且偏向励志语录。 Refetch curation 判为 no_good_source，原因：所有候选来源均未直接证明“李开复的10句经典名言”这一具体条目。多数来源是关于李开复在AI领域的公司创办、观点或新闻报道，... |
| 桑达尔·皮查伊 | Britannica Money | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：大英百科全书传记页面，但内容截断，无法判断是否包含AI相关细节，需人工确认。 Refetch curation 判为 no_good_source，原因：所有候选来源均未能直接证明“桑达尔·皮查伊”与“Britannica Money”页面的关系。权威性高的来源（如B... |
| 迈克·施罗普费尔 | https://tech.facebook.com/ideas/2020/10/giving-back-to-the-birthplace-of-the-computer/ | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：作者为Mike Schroepfer，但内容关于Bletchley Park历史，与AI/科技行业关联较弱，需人工判断。 Refetch curation 判为 no_good_source，原因：所有候选来源均未直接提及迈克·施罗普费尔，或内容与目标人物无关。原始来... |
| 亚历克·拉德福德 | Sorry - I interpreted: 'if a paper had crossed my desk saying here are some hand-curated best-of-25 samples from our model + PPL comparisons with models trained on other datasets' as about the paper - especially since the second half of the statement is about the paper. | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：内容为对他人评论的澄清，信息价值较低，需人工判断。 Refetch curation 判为 no_good_source，原因：所有候选来源均未提及亚历克·拉德福德或其关于论文样本的澄清声明。原始来源为推特，但候选中无替代权威来源。需要更直接的证据，如其本人官方主页、... |
| 黄仁勋 | Note on Nvidia's $4.4T valuation exceeding total crypto market cap, joking about Jensen Huang buying crypto. | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：内容涉及公司估值与加密货币的调侃，信息密度一般，需人工确认价值。 Refetch curation 判为 no_good_source，原因：候选来源均未提供直接证据支持原始声明。原始声明涉及黄仁勋对Nvidia估值与加密货币市场比较的调侃，但候选来源要么缺失人物姓名... |
| 科拉伊·卡武克丘奥卢 | //deepmind.google/blog/advanced-version-of-gemini-with-deep-think-officially-achieves-gold-medal-standard-at-the-international-mathematical-olympiad/ | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：仅包含链接，虽涉及 Gemini 获得奥数金牌的重大成就，但缺乏正文。 Refetch curation 判为 no_good_source，原因：所有候选来源均未直接提及科拉伊·卡武克丘奥卢本人，无法证明他与Gemini在IMO取得金牌这一成就的具体关联。需要寻找能... |
| Christopher Manning | //en.wikipedia.org/wiki/The_Innovator%27s_Dilemma – and @Google is in the lucky position of having the industry-best economics for enabling low prices. | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方账号发布的关于商业竞争和创新的短评，AI 技术相关性较弱。 Refetch curation 判为 no_good_source，原因：候选来源均为Christopher Manning的官方或权威个人资料页，但均未包含与原始推文内容（关于《创新者的窘境》和谷歌经... |
| Dylan Field | Alt framing: Cluely isn't just good marketing. Roy hacked the algo feed with an antifragile memetic virus. And the more energy you throw at it, the stronger it gets. | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方推文但内容偏向营销和算法机制讨论，AI相关性较模糊。 Refetch curation 判为 no_good_source，原因：所有候选来源均未提供Dylan Field与'Cluely'营销策略或'antifragile memetic virus'观点的直接... |
| Elon Musk | //x.com/elonmusk/status/1988662682241618367 | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方推文链接，但未抓取到具体正文内容，需人工确认推文价值。 Refetch curation 判为 no_good_source，原因：候选来源均未能直接证明目标推文（ID: 1988662682241618367）的具体内容、背景或重要性。权威媒体文章与推文无关，官... |
| Elon Musk | //x.com/elonmusk/status/1989785746480202135 | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方推文链接，缺乏正文描述，无法判断其AI相关性及质量。 Refetch curation 判为 no_good_source，原因：所有候选来源均未直接提及或证明目标推文链接（//x.com/elonmusk/status/1989785746480202135）的... |
| Elon Musk | Grok now #1 in Korea 🇰🇷 | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方发布的简短排名动态，信息密度较低，仅具参考价值。 Refetch curation 判为 no_good_source，原因：所有候选来源均未直接支持“Grok now #1 in Korea”这一具体声明。它们要么是无关的新闻（如投资、IPO），要么是播客/转录... |
| Elon Musk | Tesla is the leader in real-world AI | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方发布的观点性短句，缺乏具体事实支撑或深度论述。 Refetch curation 判为 no_good_source，原因：候选来源均为学术论文、媒体概述或领导力分析，未直接支持‘特斯拉是现实世界AI领导者’这一具体主张。缺乏官方声明、权威技术报告或直接引述马斯克... |
| Emad Mostaque | Doing some spectral analysis in @GoogleColab and what do I see 👀 | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：提及使用 Google Colab 进行分析，虽具技术相关性但内容过于简略，属于日常动态。 Refetch curation 判为 no_good_source，原因：候选来源均为关于Emad Mostaque的访谈、报道或博客，但无一提及他在Google Colab... |
| Ilya Sutskever | And congratulations to @demishassabis and John Jumper for winning the Nobel Prize in Chemistry!! | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方发布的社交祝贺动态，虽关联AI圈名人但信息密度较低。 Refetch curation 判为 no_good_source，原因：候选来源均为关于诺贝尔奖得主Hassabis和Jumper的报道，未提及Ilya Sutskever，无法证明该祝贺语与Sutskev... |
| John Schulman | Humans are jagged, and organizations (from companies to civilizations) have evolved as harnesses to | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方账号发布的社会哲学观点，与 AI 技术关联度较低。 Refetch curation 判为 no_good_source，原因：候选来源均无法直接证明John Schulman提出或讨论过“Humans are jagged, and organizations.... |
| Noam Shazeer | For this example, Gemini 2.5 Pro wrote code to generate this animated bubble chart visualizing the evolution of economic and health indicators by continent. 📈 | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：侧重于 Gemini 产品功能演示，与人物本人的直接关联信息较少。 Refetch curation 判为 no_good_source，原因：所有候选来源均未能直接证明Noam Shazeer本人与“Gemini 2.5 Pro生成特定经济健康指标气泡图”这一具体声... |
| Sam Altman | Chain-of-thought monitorability:  https://openai.com/index/evaluating-chain-of-thought-monitorabilit | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：仅分享技术文档链接，缺乏原创观点，信息密度较低。 Refetch curation 判为 no_good_source，原因：所有候选来源均未直接提及Sam Altman本人，无法建立其与链式思维可监控性技术文档的直接关联。原始来源仅为分享链接，缺乏原创观点。需要寻找... |
| Shane Legg | Nano banana (?) seems to think I'm more handsome than I really am... but other than that, it's amazingly good at making summary posters! | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：涉及对 AI 工具能力的个人评价，但内容偏生活化，信息密度一般。 Refetch curation 判为 no_good_source，原因：候选来源均无法证明 Shane Legg 与 'Nano banana' 工具的关联或其个人评价。原始声明来自推特，但候选中无... |
| Shane Legg | You'll need to wait a bit longer to see Gemini 3 😁 | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方发布的关于 Gemini 3 的简短预告，信息密度较低需人工确认。 Refetch curation 判为 no_good_source，原因：候选来源均未涉及Gemini 3，无法证明或替换原始推文内容。需要更直接的来源，如官方公告、采访或可靠媒体对Gemini... |
| 李莲 | If you are into the topic, my team is hiring Research Engineer for a new sub-team Human-AI Interaction: [link] | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：属于团队招聘信息，虽提及研究方向但信息密度较低。 Refetch curation 判为 no_good_source，原因：候选来源均为通用招聘页面、面试指南或无关公司/个人博客，无一包含'李莲'姓名或其团队招聘的具体信息。无法替换或补强原始来源。 已确认无 act... |
| 杰夫·迪恩 | A powerful features of our Gemini models since Gemini 1.5 (including 2.0 and 2.5 models) is their powerful long context capability (2M tokens serving in production).  You can process ~1000 pages of text, hrs of video, 10+ hrs ofaudio.  Come see @SavinovNikolay discuss this! | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：虽然涉及AI技术参数，但主要为产品功能宣传，与人物本人的直接关联度较低。 Refetch curation 判为 no_good_source，原因：候选来源均为Gemini模型的官方或技术文档，但均未提及杰夫·迪恩本人，无法证明该声明与其个人页面的关联性。需要寻找明... |
| 杰夫·迪恩 | Gemini 3 Deep Think is now available for Ultra users, making available our IMO & ICPC Gold Medal-winning technology. Deep Think shows improved generalization on difficult benchmarks like ARC-AGI-2, and outperforms Gemini 3 Pro on HLE & GPQA Diamond. We hope this serves as a useful step toward ever-more-capable scientific reasoning agents. https://t.co/8QaUosoa98 | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：包含具体的技术指标和模型进展，但仍属于官方产品发布范畴。 Refetch curation 判为 no_good_source，原因：所有候选来源均未提及杰夫·迪恩本人，无法证明该产品发布声明与其个人的直接关联。原始推文是直接证据，但候选中无权威来源能替代或补强其个人... |
| 杰夫·迪恩 | I'm really enjoying your living artwork on the giant three story screen in Gradient Canopy! It mesmerizes me every time I walk by! 🙏 | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：虽然是官方账号发布，但内容属于对艺术品的社交赞赏，与AI技术研究关联较弱。 Refetch curation 判为 no_good_source，原因：所有候选来源均未直接证明杰夫·迪恩对Gradient Canopy内艺术作品的评论。简历和传记类来源未提及此事，建筑... |
| 科拉伊·卡武克丘奥卢 | Announcing upcoming Gemini 3 Flash release) | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：虽为官方来源且涉及其所在机构产品，但未提及人物本人且内容过于简略。 Refetch curation 判为 no_good_source，原因：所有候选来源均未提及人物科拉伊·卡武克丘奥卢，无法证明其与‘宣布Gemini 3 Flash发布’事件的关联。需要更直接的来... |
| 阿希什·瓦斯瓦尼 | Honored to be contributing alongside Nous ❤️ . | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：提及与 Nous Research 的合作，具有一定关联性但内容过短。 Refetch curation 判为 no_good_source，原因：候选来源均为阿希什·瓦斯瓦尼的通用传记或第三方资料页，均未提及与Nous Research的具体合作或贡献。原始来源（推... |
| 雅各布·乌什科雷特 | ** Very brief positive reaction in an AI/tech nostalgia context (reply to discussion involving early internet tech like IRC in relation to modern AI/tools). Included as it ties into AI community history. | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方账号的简短社交互动，涉及AI历史但信息密度较低。 Refetch curation 判为 no_good_source，原因：候选来源均未提及目标人物雅各布·乌什科雷特，无法证明其与AI怀旧讨论的关联。原始来源为简短社交互动，信息密度低，但候选中无更权威的替代来源... |
| Andrej Karpathy | from bits to intelligence | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：标题涉及 AI 核心概念，但内容过于简短，需确认是否关联重要演讲或文章。 Refetch curation 判为 no_good_source，原因：所有候选来源均未直接提及或证明‘from bits to intelligence’这一具体表述与Andrej Kar... |
| Elon Musk | //x.com/elonmusk/status/1989811787047244258 | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方推文链接，无实质文本内容，需人工核实具体推文信息。 Refetch curation 判为 no_good_source，原因：所有候选来源均未直接提及或证明目标推文（ID: 1989811787047244258）的具体内容或存在。它们要么是通用人物介绍，要么是... |
| Emad Mostaque | Why do you think @AnthropicAI & @OpenAI are doing real workloads with @tempo?  Agents 🤝 stable coin | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方推文但内容过于简短且含糊，属于社交媒体互动，信息价值较低。 Refetch curation 判为 no_good_source，原因：所有候选来源均未直接提及或支持推文中关于Anthropic、OpenAI、Tempo、Agents与stable coin关联的... |
| Lukasz Kaiser | It will think even longer and that's great because it'll do things for you :) | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：内容过于简短，虽然涉及模型推理时间，但信息密度较低。 Refetch curation 判为 no_good_source，原因：候选来源均未提供与原始推文内容直接相关的证据。原始推文内容简短且具体，可能为个人社交媒体发言，难以找到权威的替代或补强来源。建议进行更精确... |
| Quoc Le | To feel the AGI, I prompted Gemini 3 Deep Think | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：虽然是本人发布的 AI 相关动态，但内容过于简短，信息密度较低。 Refetch curation 判为 no_good_source，原因：候选来源均未直接提及Quoc Le，无法证明“To feel the AGI, I prompted Gemini 3 Dee... |
| 桑达尔·皮查伊 | AI-powered calling to local businesses, rolling out to all users in the US. | delete_raw_pool_item | no | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：虽为官方发布，但内容仅为单一的产品功能更新描述，人物关联度一般。 Refetch curation 判为 no_good_source，原因：所有候选来源均未能直接证明桑达尔·皮查伊与“AI-powered calling to local businesses”功能... |
