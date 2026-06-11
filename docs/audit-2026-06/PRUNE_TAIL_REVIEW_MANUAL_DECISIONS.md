# Prune Tail Review Manual Decisions

Generated at: 2026-06-10T21:24:25.055Z
Input: docs/audit-2026-06/data/prune_tail_review_unresolved_rows.json
Decision filter: no_good_source

## Counts

| Metric | Value |
| --- | ---: |
| input rows | 124 |
| dependency skipped | 1 |
| decision rows | 41 |

## Source Type

| Source | Count |
| --- | ---: |
| x | 29 |
| github | 9 |
| exa | 2 |
| youtube | 1 |

## People

| Person | Count |
| --- | ---: |
| Elon Musk | 5 |
| 亚历克·拉德福德 | 3 |
| 杰夫·迪恩 | 3 |
| Arthur Mensch | 2 |
| Emad Mostaque | 2 |
| Percy Liang | 2 |
| Shane Legg | 2 |
| 桑达尔·皮查伊 | 2 |
| 科拉伊·卡武克丘奥卢 | 2 |
| Andrej Karpathy | 1 |
| Chris Olah | 1 |
| Christopher Manning | 1 |
| Dylan Field | 1 |
| Ilya Sutskever | 1 |
| John Schulman | 1 |
| Lukasz Kaiser | 1 |
| Matthew Berman | 1 |
| Noam Shazeer | 1 |
| Quoc Le | 1 |
| Sam Altman | 1 |
| 布莱恩·卡坦扎罗 | 1 |
| 李开复 | 1 |
| 李莲 | 1 |
| 迈克·施罗普费尔 | 1 |
| 阿希什·瓦斯瓦尼 | 1 |
| 雅各布·乌什科雷特 | 1 |
| 黄仁勋 | 1 |

## Decisions

| Person | Source | Refetch | Target | Reason |
| --- | --- | --- | --- | --- |
| Arthur Mensch | github | no_good_source | hcp_builder | 这是他的GitHub仓库，关于下载和运行GLM处理HCP数据，与神经科学相关但AI相关性较弱。 |
| Arthur Mensch | github | no_good_source | numerical_analysis | 这是他的GitHub仓库，关于数值分析的Jupyter笔记本，与AI间接相关但偏向教学，质量一般。 |
| Chris Olah | github | no_good_source | data | 数据集管理工具与 AI 工作流相关，但内容较为通用，需确认其在 AI 领域的价值。 |
| Matthew Berman | github | no_good_source | TheMattBerman/YouClip | 本人的开源视频工具项目，与AI领域相关性中等。 |
| Percy Liang | github | no_good_source | refdb | 官方学术管理工具，与 AI 技术研究无直接关联。 |
| Percy Liang | github | no_good_source | sfig | 官方工具库，但属于通用可视化工具，非 AI 核心内容。 |
| 亚历克·拉德福德 | github | no_good_source | JSEye | 官方仓库，涉及计算机视觉，但内容描述过于简略，价值有限。 |
| 亚历克·拉德福德 | github | no_good_source | text-generation | 官方仓库，涉及文本生成，但内容描述过于简略，价值有限。 |
| 布莱恩·卡坦扎罗 | github | no_good_source | catanzaro.codepy | 虽与高性能计算相关，但仅为个人开发分支，信息密度较低。 |
| 李开复 | youtube | no_good_source | 李开复的10句经典名言 | 虽然与AI相关，但属于碎片化的名言汇编，信息密度较低且偏向励志语录。 |
| 桑达尔·皮查伊 | exa | no_good_source | Britannica Money | 大英百科全书传记页面，但内容截断，无法判断是否包含AI相关细节，需人工确认。 |
| 迈克·施罗普费尔 | exa | no_good_source | https://tech.facebook.com/ideas/2020/10/giving-back-to-the-birthplace-of-the-computer/ | 作者为Mike Schroepfer，但内容关于Bletchley Park历史，与AI/科技行业关联较弱，需人工判断。 |
| 亚历克·拉德福德 | x | no_good_source | Sorry - I interpreted: 'if a paper had crossed my desk saying here are some hand-curated ... | 内容为对他人评论的澄清，信息价值较低，需人工判断。 |
| 黄仁勋 | x | no_good_source | Note on Nvidia's $4.4T valuation exceeding total crypto market cap, joking about Jensen H... | 内容涉及公司估值与加密货币的调侃，信息密度一般，需人工确认价值。 |
| 科拉伊·卡武克丘奥卢 | x | no_good_source | //deepmind.google/blog/advanced-version-of-gemini-with-deep-think-officially-achieves-gol... | 仅包含链接，虽涉及 Gemini 获得奥数金牌的重大成就，但缺乏正文。 |
| Christopher Manning | x | no_good_source | //en.wikipedia.org/wiki/The_Innovator%27s_Dilemma – and @Google is in the lucky position ... | 官方账号发布的关于商业竞争和创新的短评，AI 技术相关性较弱。 |
| Dylan Field | x | no_good_source | Alt framing: Cluely isn't just good marketing. Roy hacked the algo feed with an antifragi... | 官方推文但内容偏向营销和算法机制讨论，AI相关性较模糊。 |
| Elon Musk | x | no_good_source | //x.com/elonmusk/status/1988662682241618367 | 官方推文链接，但未抓取到具体正文内容，需人工确认推文价值。 |
| Elon Musk | x | no_good_source | //x.com/elonmusk/status/1989785746480202135 | 官方推文链接，缺乏正文描述，无法判断其AI相关性及质量。 |
| Elon Musk | x | no_good_source | Grok now #1 in Korea 🇰🇷 | 官方发布的简短排名动态，信息密度较低，仅具参考价值。 |
| Elon Musk | x | no_good_source | Tesla is the leader in real-world AI | 官方发布的观点性短句，缺乏具体事实支撑或深度论述。 |
| Emad Mostaque | x | no_good_source | Doing some spectral analysis in @GoogleColab and what do I see 👀 | 提及使用 Google Colab 进行分析，虽具技术相关性但内容过于简略，属于日常动态。 |
| Ilya Sutskever | x | no_good_source | And congratulations to @demishassabis and John Jumper for winning the Nobel Prize in Chem... | 官方发布的社交祝贺动态，虽关联AI圈名人但信息密度较低。 |
| John Schulman | x | no_good_source | Humans are jagged, and organizations (from companies to civilizations) have evolved as ha... | 官方账号发布的社会哲学观点，与 AI 技术关联度较低。 |
| Noam Shazeer | x | no_good_source | For this example, Gemini 2.5 Pro wrote code to generate this animated bubble chart visual... | 侧重于 Gemini 产品功能演示，与人物本人的直接关联信息较少。 |
| Sam Altman | x | no_good_source | Chain-of-thought monitorability: https://openai.com/index/evaluating-chain-of-thought-mon... | 仅分享技术文档链接，缺乏原创观点，信息密度较低。 |
| Shane Legg | x | no_good_source | Nano banana (?) seems to think I'm more handsome than I really am... but other than that,... | 涉及对 AI 工具能力的个人评价，但内容偏生活化，信息密度一般。 |
| Shane Legg | x | no_good_source | You'll need to wait a bit longer to see Gemini 3 😁 | 官方发布的关于 Gemini 3 的简短预告，信息密度较低需人工确认。 |
| 李莲 | x | no_good_source | If you are into the topic, my team is hiring Research Engineer for a new sub-team Human-A... | 属于团队招聘信息，虽提及研究方向但信息密度较低。 |
| 杰夫·迪恩 | x | no_good_source | A powerful features of our Gemini models since Gemini 1.5 (including 2.0 and 2.5 models) ... | 虽然涉及AI技术参数，但主要为产品功能宣传，与人物本人的直接关联度较低。 |
| 杰夫·迪恩 | x | no_good_source | Gemini 3 Deep Think is now available for Ultra users, making available our IMO & ICPC Gol... | 包含具体的技术指标和模型进展，但仍属于官方产品发布范畴。 |
| 杰夫·迪恩 | x | no_good_source | I'm really enjoying your living artwork on the giant three story screen in Gradient Canop... | 虽然是官方账号发布，但内容属于对艺术品的社交赞赏，与AI技术研究关联较弱。 |
| 科拉伊·卡武克丘奥卢 | x | no_good_source | Announcing upcoming Gemini 3 Flash release) | 虽为官方来源且涉及其所在机构产品，但未提及人物本人且内容过于简略。 |
| 阿希什·瓦斯瓦尼 | x | no_good_source | Honored to be contributing alongside Nous ❤️ . | 提及与 Nous Research 的合作，具有一定关联性但内容过短。 |
| 雅各布·乌什科雷特 | x | no_good_source | ** Very brief positive reaction in an AI/tech nostalgia context (reply to discussion invo... | 官方账号的简短社交互动，涉及AI历史但信息密度较低。 |
| Andrej Karpathy | x | no_good_source | from bits to intelligence | 标题涉及 AI 核心概念，但内容过于简短，需确认是否关联重要演讲或文章。 |
| Elon Musk | x | no_good_source | //x.com/elonmusk/status/1989811787047244258 | 官方推文链接，无实质文本内容，需人工核实具体推文信息。 |
| Emad Mostaque | x | no_good_source | Why do you think @AnthropicAI & @OpenAI are doing real workloads with @tempo? Agents 🤝 s... | 官方推文但内容过于简短且含糊，属于社交媒体互动，信息价值较低。 |
| Lukasz Kaiser | x | no_good_source | It will think even longer and that's great because it'll do things for you :) | 内容过于简短，虽然涉及模型推理时间，但信息密度较低。 |
| Quoc Le | x | no_good_source | To feel the AGI, I prompted Gemini 3 Deep Think | 虽然是本人发布的 AI 相关动态，但内容过于简短，信息密度较低。 |
| 桑达尔·皮查伊 | x | no_good_source | AI-powered calling to local businesses, rolling out to all users in the US. | 虽为官方发布，但内容仅为单一的产品功能更新描述，人物关联度一般。 |

## Safety

- This file only converts already-exported review rows into an explicit manual decision queue.
- Rows with active Card.sourceUrl or People display/source JSON dependencies are skipped.
- Apply with `apply_hard_tail_manual_decisions.mjs`; default mode there is dry-run.
