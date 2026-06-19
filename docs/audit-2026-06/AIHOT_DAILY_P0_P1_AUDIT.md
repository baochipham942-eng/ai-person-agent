# AI HOT 三维吸收审计

生成时间：2026-06-19T01:12:19.723Z
范围：最近 50 期日报，2026-06-19 到 2026-05-01，共 1120 条。
现场缺表：CompanySource、KnowledgeSource。本次按现有表只读匹配。

## 结论

- 原始日报条目：1120 条；按事件去重后：1116 个事件簇。
- 发现重复事件簇：4 个，涉及 8 条，最大单簇 2 条。
- 与本库标题/URL 疑似同事件：0 个事件簇，需要人工复核后再吸收。
- 内容源候选：40 个，其中直接吸收 37 个，发现源 3 个。
- 公司维度候选：60 个，优先补 CompanySource / 公司动态。
- 人物维度：已有库人物 30 个；可进 candidate 复核 9 个；暂不符合人物准入 40 个。
- P0 缺口候选：60 个事件簇；潜在新实体/新来源线索：60 个事件簇。
- 精确 URL 已覆盖：5/1120（<1%）。

## 吸收判断

- 内容源分三类：公司属性源、独立内容/信号源、发现源。公司属性源优先挂到 CompanySource，不和媒体/个人转述混放。
- 公司维度优先吸收已有 Organization 的官方 blog/news/research、GitHub release、产品 release note、融资/合作/招聘等属性证据。
- 人物维度只把已有库人物的新动态直接纳入；新人必须至少有 strong source 和职位/组织语境，只有 X/聚合/转述不进人物候选。
- 重复控制按事件簇处理：同 URL 直接归一；中英文转述、媒体稿、X 转述共享实体和事件词时只保留一个候选。

## 维度一：内容源 Top 30

| 分数 | 建议 | 归类 | 信源 | Owner 公司 | 角色 | 类型 | 新事件 | 疑似重复 | 理由 | 样例 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 382 | 沉淀为公司属性源 | 公司属性源 | OpenAI：官网动态（RSS · 排除企业/客户案例） | OpenAI | technical_thread_link:13, product_release:11, partnership_signal:9 | official | 38 | 0 | 源本身归属于公司，优先进入 CompanySource / 公司页属性。 | [Harness 工程：在智能体优先的世界中运用 Codex](https://openai.com/index/harness-engineering) |
| 322 | 沉淀为公司属性源 | 公司属性源 | Hugging Face：Blog（RSS） | Hugging Face | technical_thread_link:16, product_release:12, hiring_team_signal:4 | rss | 35 | 0 | 源本身归属于公司，优先进入 CompanySource / 公司页属性。 | [MolmoMotion：语言引导的3D运动预测模型](https://huggingface.co/blog/allenai/molmomotion) |
| 304 | 沉淀为公司属性源 | 公司属性源 | Anthropic：Newsroom（网页） | Anthropic | technical_thread_link:11, partnership_signal:11, hiring_team_signal:4 | official | 29 | 0 | 源本身归属于公司，优先进入 CompanySource / 公司页属性。 | [Anthropic联合创始人Chris Olah在教皇通谕发布会上的讲话](https://www.anthropic.com/news/chris-olah-pope-leo-encyclical) |
| 290 | 加入 X 候选源 | 独立信号源 | X：Kim (@kimmonismus) |  | product_release:11, financial_signal:6, hiring_team_signal:5 | x | 30 | 0 | X 源持续给出新事件，先按账号候选接入并用事件去重兜底。 | [Anthropic与DeepMind CEO呼吁G7组建AI联盟排除中国](https://x.com/kimmonismus/status/2067310431669223425) |
| 273 | 加入 X 候选源 | 独立信号源 | X：Rohan Paul (@rohanpaul_ai) |  | technical_thread_link:11, official_strategy:7, financial_signal:4 | x | 28 | 0 | X 源持续给出新事件，先按账号候选接入并用事件去重兜底。 | [DeepSeek融资70亿美元创纪录，创始人个人出资30亿](https://x.com/rohanpaul_ai/status/2052901878728659037) |
| 264 | 加入 X 候选源 | 独立信号源 | X：Berry Xia (@berryxia) |  | technical_thread_link:14, product_release:7, hiring_team_signal:5 | x | 31 | 0 | X 源持续给出新事件，先按账号候选接入并用事件去重兜底。 | [国家队领投DeepSeek估值飙升至450亿美元](https://x.com/berryxia/status/2051974536481198511) |
| 253 | 沉淀为公司属性源 | 公司属性源 | Claude Code：GitHub Releases（RSS） | Anthropic | product_release:17, technical_thread_link:5, hiring_team_signal:2 | github | 26 | 0 | 源本身归属于公司，优先进入 CompanySource / 公司页属性。 | [Claude Code v2.1.178 发布](https://github.com/anthropics/claude-code/releases/tag/v2.1.178) |
| 227 | 沉淀为公司属性源 | 公司属性源 | X：OpenRouter (@OpenRouter) | OpenRouter | product_release:15, technical_thread_link:6, official_strategy:4 | x | 28 | 0 | 源本身归属于公司，优先进入 CompanySource / 公司页属性。 | [Opus 4.8 缓存命中率与有效价格可实时查看](https://x.com/OpenRouter/status/2063504950429147376) |
| 224 | 加入 X 候选源 | 独立信号源 | X：阿易 AI Notes (@AYi_AInotes) |  | product_release:11, technical_thread_link:8, partnership_signal:2 | x | 25 | 0 | X 源持续给出新事件，先按账号候选接入并用事件去重兜底。 | [五角大楼将大部分日常AI工作流从Anthropic转移，目标9月前完全切断](https://x.com/AYi_AInotes/status/2066679835607412846) |
| 197 | 沉淀为公司属性源 | 公司属性源 | Claude：Blog（网页） | Anthropic | hiring_team_signal:10, product_release:4, technical_thread_link:4 | official | 22 | 0 | 源本身归属于公司，优先进入 CompanySource / 公司页属性。 | [Claude Design 更新：跨项目保持品牌一致，与Claude Code协同](https://claude.com/blog/claude-design-stays-on-brand-for-daily-work) |
| 191 | 补抓已有源 | 候选内容源 | Bloomberg：Technology（RSS） | Bloomberg | financial_signal:7, official_strategy:5, technical_thread_link:3 | rss | 20 | 0 | 库内已有同域覆盖，但 AI HOT 仍暴露出新事件。 | [OpenAI 前 CTO 称若 Altman 未回归公司可能已“瓦解”](https://www.bloomberg.com/news/articles/2026-06-05/openai-would-ve-imploded-if-altman-didn-t-return-ex-cto-says) |
| 185 | 加入 X 候选源 | 独立信号源 | X：Vista (@vista8) |  | product_release:14, technical_thread_link:5, official_strategy:1 | x | 20 | 0 | X 源持续给出新事件，先按账号候选接入并用事件去重兜底。 | [免费开源乔木画布：AI生图+抠图，一键部署Vercel](https://x.com/vista8/status/2067513484364140994) |
| 184 | 补抓已有源 | 候选内容源 | TechCrunch：AI（RSS） | TechCrunch | product_release:8, financial_signal:5, official_strategy:3 | rss | 20 | 0 | 库内已有同域覆盖，但 AI HOT 仍暴露出新事件。 | [OpenAI IPO前连下两城：招揽Transformer共同作者及前白宫AI政策官员](https://techcrunch.com/2026/06/18/openai-is-bringing-on-some-big-guns-in-the-lead-up-to-its-ipo) |
| 176 | 沉淀为公司属性源 | 公司属性源 | X：OpenAI Developers (@OpenAIDevs) | OpenAI | product_release:13, hiring_team_signal:2, official_strategy:2 | x | 17 | 0 | 源本身归属于公司，优先进入 CompanySource / 公司页属性。 | [Codex 推出浏览器开发者模式](https://x.com/OpenAIDevs/status/2065226355495895521) |
| 172 | 沉淀为公司属性源 | 公司属性源 | X：阿里云 / Alibaba Cloud (@alibaba_cloud) | Alibaba DAMO Academy | product_release:11, hiring_team_signal:2, partnership_signal:2 | x | 17 | 0 | 源本身归属于公司，优先进入 CompanySource / 公司页属性。 | [阿里云CTO阐述从云原生到智能体原生转型](https://x.com/alibaba_cloud/status/2059174528786268669) |
| 154 | 补抓已有源 | 候选内容源 | 公众号：火山引擎 | MiniMax | technical_thread_link:8, hiring_team_signal:3, partnership_signal:3 | web | 18 | 0 | 库内已有同域覆盖，但 AI HOT 仍暴露出新事件。 | [首个统一科学大模型 LOGOS 正式开源](https://mp.weixin.qq.com/s/50q5uY849FKnBzk1Q04MRg) |
| 151 | 补抓已有源 | 候选内容源 | Gary Marcus：The Road to AI We Can Trust（RSS） |  | technical_thread_link:6, official_strategy:4, product_release:3 | rss | 17 | 0 | 库内已有同域覆盖，但 AI HOT 仍暴露出新事件。 | [OpenAI 的领先优势正在快速缩小](https://garymarcus.substack.com/p/openais-lead-is-dwindling-fast) |
| 151 | 沉淀为公司属性源 | 公司属性源 | X：Replit (@Replit) | Replit | product_release:7, partnership_signal:2, hiring_team_signal:2 | x | 14 | 0 | 源本身归属于公司，优先进入 CompanySource / 公司页属性。 | [Replit Agent 联手 Shopify 快速建店](https://x.com/Replit/status/2062594881625940379) |
| 147 | 沉淀为公司属性源 | 公司属性源 | Apple Machine Learning Research（RSS） | 苹果公司 | hiring_team_signal:7, technical_thread_link:7, partnership_signal:1 | rss | 15 | 0 | 源本身归属于公司，优先进入 CompanySource / 公司页属性。 | [苹果发布第三代 Apple Foundation Models（AFM）](https://machinelearning.apple.com/research/introducing-third-generation-of-apple-foundation-models) |
| 145 | 沉淀为公司属性源 | 公司属性源 | xAI：News（网页） | xAI | product_release:6, technical_thread_link:3, hiring_team_signal:2 | official | 13 | 0 | 源本身归属于公司，优先进入 CompanySource / 公司页属性。 | [Grok 4.3 在 Amazon Bedrock 正式可用](https://x.ai/news/grok-amazon-bedrock) |
| 142 | 加入 X 候选源 | 独立信号源 | X：宝玉 (@dotey) |  | product_release:8, official_strategy:3, partnership_signal:1 | x | 15 | 0 | X 源持续给出新事件，先按账号候选接入并用事件去重兜底。 | [OpenAI 政变之夜内部短信曝光：董事会为何执意赶走 Altman？](https://x.com/dotey/status/2052255174706479349) |
| 135 | 加入 X 候选源 | 独立信号源 | X：邵猛 (@shao__meng) |  | hiring_team_signal:4, technical_thread_link:4, product_release:4 | x | 14 | 0 | X 源持续给出新事件，先按账号候选接入并用事件去重兜底。 | [Cursor集成Microsoft Teams提升办公效率](https://x.com/shao__meng/status/2053998536711405978) |
| 125 | 补抓已有源 | 候选内容源 | The Verge：AI（RSS） | The Verge | partnership_signal:4, product_release:4, technical_thread_link:3 | rss | 13 | 0 | 库内已有同域覆盖，但 AI HOT 仍暴露出新事件。 | [微软与OpenAI分道扬镳——如今双方准备正面交锋](https://www.theverge.com/ai-artificial-intelligence/942242/microsoft-build-ai-agents-openai-competition) |
| 123 | 补抓已有源 | 候选内容源 | The Decoder：AI News（RSS） | The Decoder | financial_signal:4, hiring_team_signal:3, official_strategy:3 | rss | 12 | 0 | 库内已有同域覆盖，但 AI HOT 仍暴露出新事件。 | [DeepSeek 完成首轮外部融资，估值超 500 亿美元](https://the-decoder.com/deepseek-takes-outside-money-for-the-first-time-at-a-50-billion-valuation) |
| 123 | 沉淀为公司属性源 | 公司属性源 | X：商汤 SenseTime (@SenseTime_AI) | 商汤科技 | product_release:5, technical_thread_link:4, hiring_team_signal:1 | x | 11 | 0 | 源本身归属于公司，优先进入 CompanySource / 公司页属性。 | [SenseNova新模型解决AI图表生成难题](https://x.com/SenseTime_AI/status/2061465029959209106) |
| 115 | 沉淀为公司属性源 | 公司属性源 | X：腾讯混元 (@TencentHunyuan) | 腾讯 | technical_thread_link:5, product_release:3, partnership_signal:1 | x | 10 | 0 | 源本身归属于公司，优先进入 CompanySource / 公司页属性。 | [腾讯混元发布智能体长期记忆插件Hy-Memory](https://x.com/TencentHunyuan/status/2061372535267357029) |
| 114 | 沉淀为公司属性源 | 公司属性源 | X：Microsoft Research (@MSFTResearch) | 微软 | technical_thread_link:9, hiring_team_signal:1 | x | 10 | 0 | 源本身归属于公司，优先进入 CompanySource / 公司页属性。 | [材料科学AI多任务模型突破](https://x.com/MSFTResearch/status/2054191008091418998) |
| 103 | 沉淀为公司属性源 | 公司属性源 | X：OpenAI (@OpenAI) | OpenAI | product_release:5, technical_thread_link:3, financial_signal:1 | x | 9 | 0 | 源本身归属于公司，优先进入 CompanySource / 公司页属性。 | [OpenAI Codex 推出速率重置攒存功能](https://x.com/OpenAI/status/2065225362544726371) |
| 103 | 沉淀为公司属性源 | 公司属性源 | X：Perplexity (@perplexity_ai) | Perplexity | technical_thread_link:5, product_release:3, hiring_team_signal:1 | x | 9 | 0 | 源本身归属于公司，优先进入 CompanySource / 公司页属性。 | [Perplexity发布Search as Code搜索架构](https://x.com/perplexity_ai/status/2061506359326384319) |
| 102 | 加入 X 候选源 | 独立信号源 | X：小互 (@xiaohu) |  | official_strategy:5, product_release:4, financial_signal:1 | x | 11 | 0 | X 源持续给出新事件，先按账号候选接入并用事件去重兜底。 | [Anthropic 上市前夕](https://x.com/xiaohu/status/2065991805238497732) |

## 只做发现、不直接吸收的源 Top 15

| 分数 | 建议 | 归类 | 信源 | 类型 | 新事件 | 已知实体 | 理由 | 样例 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 705 | 只做发现源 | 发现源 | IT之家（RSS） | rss | 86 | 65 | 聚合/转述属性强，适合发现事件后回抓原始 URL。 | [消息称 DeepSeek 首轮融资拟筹集 500 亿元，腾讯、宁德时代等参投](https://www.ithome.com/0/959/249.htm) |
| 94 | 候选源观察 | 候选内容源 | Tomer Tunguz 博客（VC 分析） | web | 10 | 6 | 需要更多样本确认稳定性。 | [AI 应用黄金时代已至：Fable 被禁、Nadella 的护城河论点与 Salesforce 收购 Fin](https://www.tomtunguz.com/golden-age-of-applications) |
| 93 | 候选源观察 | 候选内容源 | Simon Willison 博客 | web | 11 | 4 | 需要更多样本确认稳定性。 | [Claude Code实践：HTML输出格式的卓越效果](https://simonwillison.net/2026/May/8/unreasonable-effectiveness-of-html) |

## 维度二：公司 Top 30

| 分数 | 动作 | 公司 | 库内已有 | 新事件 | 源归属事件 | 已有人物事件 | 公司角色 | 主要源 | 理由 | 样例 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1958 | 补公司属性源 | Anthropic | 是 | 237 | 84 | 26 | product_release:72, technical_thread_link:48, hiring_team_signal:34, financial_signal:33 | anthropic.com:30, claude.com:22, ithome.com:17 | 信源本身归属于该公司，适合作为 CompanySource / 公司页属性。 | [Anthropic与DeepMind CEO呼吁G7组建AI联盟排除中国](https://x.com/kimmonismus/status/2067310431669223425) |
| 1593 | 补公司属性源 | OpenAI | 是 | 177 | 79 | 31 | product_release:62, technical_thread_link:33, financial_signal:28, partnership_signal:22 | openai.com:38, ithome.com:20, x:openaidevs:17 | 信源本身归属于该公司，适合作为 CompanySource / 公司页属性。 | [Noam Shazeer 离开 Google 加入 OpenAI](https://x.com/Yuchenj_UW/status/2067401895178817999) |
| 1132 | 补公司属性源 | 谷歌 | 是 | 132 | 60 | 7 | product_release:62, technical_thread_link:25, partnership_signal:17, hiring_team_signal:13 | ithome.com:14, x:geminiapp:11, developers.googleblog.com:10 | 信源本身归属于该公司，适合作为 CompanySource / 公司页属性。 | [Noam Shazeer 离开 Google 加入 OpenAI](https://x.com/Yuchenj_UW/status/2067401895178817999) |
| 586 | 补公司人物动态 | GitHub | 是 | 95 | 0 | 1 | product_release:56, technical_thread_link:15, official_strategy:12, hiring_team_signal:7 | github.com:21, github.blog:8, x:vista8:7 | 公司事件与库内人物同时命中，适合补人物动态并回连公司。 | [开源FastVideo Dreamverse实时视频生成工具](https://x.com/haoailab/status/2059695648103112946) |
| 437 | 补公司属性源 | Hugging Face | 是 | 42 | 35 | 0 | product_release:17, technical_thread_link:17, hiring_team_signal:5, official_strategy:2 | huggingface.co:35, x:sensetime_ai:4, x:alibaba_cloud:1 | 信源本身归属于该公司，适合作为 CompanySource / 公司页属性。 | [SenseNova新模型解决AI图表生成难题](https://x.com/SenseTime_AI/status/2061465029959209106) |
| 431 | 补公司属性源 | 微软 | 是 | 51 | 13 | 12 | technical_thread_link:15, partnership_signal:12, product_release:9, financial_signal:6 | x:msftresearch:10, ithome.com:5, anthropic.com:3 | 信源本身归属于该公司，适合作为 CompanySource / 公司页属性。 | [微软CEO Satya Nadella最新访谈上线](https://x.com/swyx/status/2062854555562565741) |
| 430 | 新增 Organization 候选 | OpenRouter | 否 | 39 | 36 | 0 | product_release:23, technical_thread_link:8, official_strategy:4, financial_signal:2 | x:openrouter:28, openrouter.ai:8, x:antlingagi:2 | AI HOT 中反复出现，但本库 Organization 未命中。 | [Opus 4.8 缓存命中率与有效价格可实时查看](https://x.com/OpenRouter/status/2063504950429147376) |
| 366 | 补公司属性源 | Alibaba DAMO Academy | 是 | 37 | 26 | 1 | product_release:22, technical_thread_link:7, hiring_team_signal:5, official_strategy:2 | x:alibaba_cloud:18, qwen.ai:6, huggingface.co:4 | 信源本身归属于该公司，适合作为 CompanySource / 公司页属性。 | [阿里云CTO阐述从云原生到智能体原生转型](https://x.com/alibaba_cloud/status/2059174528786268669) |
| 363 | 补公司属性源 | xAI | 是 | 39 | 21 | 3 | product_release:21, technical_thread_link:7, hiring_team_signal:4, partnership_signal:3 | x.ai:13, x:xai:8, x:cb_doge:4 | 信源本身归属于该公司，适合作为 CompanySource / 公司页属性。 | [Grok Imagine图像生成功能正式发布](https://x.com/elonmusk/status/2055912040481599793) |
| 362 | 补公司属性源 | 英伟达 | 是 | 42 | 14 | 7 | technical_thread_link:12, partnership_signal:9, hiring_team_signal:7, financial_signal:5 | blogs.nvidia.com:5, ithome.com:5, x:nvidiaai:5 | 信源本身归属于该公司，适合作为 CompanySource / 公司页属性。 | [NVIDIA 与 KRAFTON、NC、T1 在韩国 PC 房庆祝 RTX Spark 发布](https://blogs.nvidia.com/blog/krafton-nc-t1-korea-gaming-pc-bang-rtx-spark) |
| 289 | 补公司属性源 | 苹果公司 | 是 | 29 | 21 | 0 | technical_thread_link:10, hiring_team_signal:8, product_release:8, official_strategy:2 | machinelearning.apple.com:15, apple.com:5, x:berryxia:2 | 信源本身归属于该公司，适合作为 CompanySource / 公司页属性。 | [Apple Core AI 框架](https://developer.apple.com/documentation/coreai) |
| 256 | 补公司属性源 | 杭州深度求索人工智能基础技术研究有限公司（深度求索 / DeepSeek） | 是 | 34 | 4 | 5 | product_release:15, technical_thread_link:8, financial_signal:6, hiring_team_signal:2 | ithome.com:4, github.com:3, x:openrouter:3 | 信源本身归属于该公司，适合作为 CompanySource / 公司页属性。 | [DeepSeek融资70亿美元创纪录，创始人个人出资30亿](https://x.com/rohanpaul_ai/status/2052901878728659037) |
| 209 | 补公司属性源 | 腾讯 | 是 | 21 | 11 | 4 | technical_thread_link:7, financial_signal:5, product_release:5, hiring_team_signal:2 | x:tencenthunyuan:10, ithome.com:6, mp.weixin.qq.com:2 | 信源本身归属于该公司，适合作为 CompanySource / 公司页属性。 | [国家队领投DeepSeek估值飙升至450亿美元](https://x.com/berryxia/status/2051974536481198511) |
| 192 | 新增 Organization 候选 | Runway | 否 | 16 | 16 | 0 | product_release:7, partnership_signal:4, hiring_team_signal:2, technical_thread_link:2 | runwayml.com:7, x:runwayml:7, app.runwayml.com:2 | AI HOT 中反复出现，但本库 Organization 未命中。 | [Runway 推出 Model Context Protocol 服务器](https://runwayml.com/news/mcp) |
| 184 | 补公司动态 | Anysphere (Cursor) | 是 | 29 | 0 | 0 | product_release:14, hiring_team_signal:9, financial_signal:2, official_strategy:2 | cursor.com:6, x:shao__meng:4, ithome.com:2 | 公司被事件文本命中，适合作为公司动态或 KnowledgeSource 候选。 | [Runway 推出 Model Context Protocol 服务器](https://runwayml.com/news/mcp) |
| 170 | 新增 Organization 候选 | Replit | 否 | 14 | 14 | 0 | product_release:7, hiring_team_signal:2, official_strategy:2, partnership_signal:2 | x:replit:14 | AI HOT 中反复出现，但本库 Organization 未命中。 | [Replit Agent 联手 Shopify 快速建店](https://x.com/Replit/status/2062594881625940379) |
| 166 | 补公司属性源 | MiniMax | 是 | 16 | 12 | 0 | product_release:6, technical_thread_link:4, hiring_team_signal:3, partnership_signal:2 | x:minimax_ai:9, mp.weixin.qq.com:2, lmsys.org:1 | 信源本身归属于该公司，适合作为 CompanySource / 公司页属性。 | [MiniMax M3：前沿编码、100万token上下文与原生多模态一体模型](https://www.minimax.io/blog/minimax-m3) |
| 160 | 补公司属性源 | Meta | 是 | 21 | 2 | 3 | product_release:11, technical_thread_link:3, financial_signal:2, hiring_team_signal:2 | ithome.com:5, techcrunch.com:4, x:ayi_ainotes:2 | 信源本身归属于该公司，适合作为 CompanySource / 公司页属性。 | [杨立昆访谈：剖析LLM局限，畅谈AI未来与创业新途](https://x.com/ylecun/status/2055346714039464373) |
| 158 | 补公司人物动态 | 谷歌DeepMind | 是 | 21 | 0 | 5 | partnership_signal:6, product_release:6, technical_thread_link:6, financial_signal:1 | x:googledeepmind:7, deepmind.google:4, theverge.com:2 | 公司事件与库内人物同时命中，适合补人物动态并回连公司。 | [Anthropic与DeepMind CEO呼吁G7组建AI联盟排除中国](https://x.com/kimmonismus/status/2067310431669223425) |
| 142 | 新增 Organization 候选 | Kimi | 否 | 19 | 0 | 3 | product_release:8, technical_thread_link:5, hiring_team_signal:3, financial_signal:2 | mp.weixin.qq.com:3, x:berryxia:3, x:kimi_moonshot:3 | AI HOT 中反复出现，但本库 Organization 未命中。 | [Moonshot AI创始人杨植麟最近放出了一个40分钟视频](https://x.com/berryxia/status/2054733412846690443) |
| 138 | 补公司人物动态 | Bloomberg | 是 | 20 | 0 | 2 | financial_signal:7, official_strategy:5, partnership_signal:4, technical_thread_link:3 | bloomberg.com:18, techcrunch.com:1, x:rohanpaul_ai:1 | 公司事件与库内人物同时命中，适合补人物动态并回连公司。 | [Magnetar用数百AI智能体替代分析师](https://x.com/rohanpaul_ai/status/2064524448582267047) |
| 129 | 补公司属性源 | 商汤科技 | 是 | 11 | 11 | 0 | product_release:5, technical_thread_link:4, financial_signal:1, hiring_team_signal:1 | x:sensetime_ai:11 | 信源本身归属于该公司，适合作为 CompanySource / 公司页属性。 | [SenseNova新模型解决AI图表生成难题](https://x.com/SenseTime_AI/status/2061465029959209106) |
| 128 | 新增 Organization 候选 | 阿里云 | 否 | 18 | 0 | 1 | product_release:11, hiring_team_signal:2, official_strategy:2, partnership_signal:2 | x:alibaba_cloud:18, ithome.com:1 | AI HOT 中反复出现，但本库 Organization 未命中。 | [阿里云CTO阐述从云原生到智能体原生转型](https://x.com/alibaba_cloud/status/2059174528786268669) |
| 127 | 补公司属性源 | Cloudflare | 是 | 12 | 9 | 0 | product_release:5, hiring_team_signal:2, official_strategy:2, partnership_signal:2 | blog.cloudflare.com:9, anthropic.com:1, wsj.com:1 | 信源本身归属于该公司，适合作为 CompanySource / 公司页属性。 | [代理商现在可以创建 Cloudflare 账户、购买域名并进行部署](https://blog.cloudflare.com/agents-stripe-projects) |
| 117 | 补公司属性源 | 亚马逊 | 是 | 15 | 3 | 0 | technical_thread_link:4, financial_signal:3, partnership_signal:3, product_release:3 | ithome.com:3, claude.com:2, x:kling_ai:2 | 信源本身归属于该公司，适合作为 CompanySource / 公司页属性。 | [Grok 4.3 在 Amazon Bedrock 正式可用](https://x.ai/news/grok-amazon-bedrock) |
| 114 | 补公司人物动态 | Tencent | 是 | 15 | 0 | 3 | technical_thread_link:5, financial_signal:4, hiring_team_signal:2, product_release:2 | ithome.com:6, x:tencenthunyuan:6, mp.weixin.qq.com:2 | 公司事件与库内人物同时命中，适合补人物动态并回连公司。 | [国家队领投DeepSeek估值飙升至450亿美元](https://x.com/berryxia/status/2051974536481198511) |
| 105 | 补公司属性源 | Perplexity | 是 | 9 | 9 | 0 | technical_thread_link:5, product_release:3, hiring_team_signal:1 | x:perplexity_ai:9 | 信源本身归属于该公司，适合作为 CompanySource / 公司页属性。 | [Perplexity发布Search as Code搜索架构](https://x.com/perplexity_ai/status/2061506359326384319) |
| 78 | 补公司人物动态 | SpaceX | 是 | 10 | 0 | 3 | financial_signal:5, official_strategy:3, partnership_signal:2 | x:rohanpaul_ai:3, techcrunch.com:2, anthropic.com:1 | 公司事件与库内人物同时命中，适合补人物动态并回连公司。 | [Elon Musk 详解 SpaceX AI1 轨道 AI 数据中心卫星方案](https://x.com/rohanpaul_ai/status/2064165951936094364) |
| 74 | 补公司属性源 | 百度 | 是 | 6 | 6 | 0 | product_release:3, official_strategy:1, partnership_signal:1, technical_thread_link:1 | x:baidu_inc:5, mp.weixin.qq.com:1 | 信源本身归属于该公司，适合作为 CompanySource / 公司页属性。 | [Miaoda应用与企业版上线，自生成代码占比90%](https://x.com/Baidu_Inc/status/2054511974172557463) |
| 70 | 补公司属性源 | 阶跃星辰 | 是 | 6 | 6 | 0 | product_release:3, technical_thread_link:3 | x:stepfun_ai:5, mp.weixin.qq.com:1 | 信源本身归属于该公司，适合作为 CompanySource / 公司页属性。 | [阶跃星辰Step 3.7 Flash发布，专为高效推理设计](https://x.com/StepFun_ai/status/2061655529731342402) |

## 维度三：人 - 已有库人物 Top 30

| 分数 | 人物 | 状态 | 角色 | 当前职位 | 组织 | 新事件 | 疑似重复 | 来源类型 | 样例 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 91 | Sam Altman | ready | founder | CEO @ OpenAI | Y Combinator, Reddit公司, Loopt | 11 | 0 | x:8, rss:2, official:1 | [OpenAI计划到2028年由AI主导研究](https://x.com/rohanpaul_ai/status/2064096574142390755) |
| 82 | Elon Musk | ready | founder | Founder @ xAI | 贝宝, 太空探索技术公司, 特斯拉 | 10 | 0 | x:7, rss:3 | [Andrej加入Anthropic，马斯克也点赞](https://x.com/Yuchenj_UW/status/2056764450712256753) |
| 74 | Greg Brockman | ready | founder | Co-founder & President @ OpenAI | OpenAI, Stripe | 9 | 0 | x:8, rss:1 | [OpenAI 联合多国医生：GPT-5.5 Instant 健康问答能力追平前沿 Thinking 模型](https://x.com/gdb/status/2067675030335668270) |
| 51 | 黄仁勋 | ready | founder | CEO & Founder @ Nvidia | NVIDIA | 6 | 0 | x:4, official:1, rss:1 | [NVIDIA 与 KRAFTON、NC、T1 在韩国 PC 房庆祝 RTX Spark 发布](https://blogs.nvidia.com/blog/krafton-nc-t1-korea-gaming-pc-bang-rtx-spark) |
| 50 | Dario Amodei | ready | founder | CEO @ Anthropic | Anthropic, OpenAI | 6 | 0 | x:5, official:1 | [Anthropic与DeepMind CEO呼吁G7组建AI联盟排除中国](https://x.com/kimmonismus/status/2067310431669223425) |
| 42 | Demis Hassabis | ready | researcher | Co-founder & CEO @ Google DeepMind | 伦敦大学学院, 谷歌DeepMind | 5 | 0 | x:4, rss:1 | [Anthropic与DeepMind CEO呼吁G7组建AI联盟排除中国](https://x.com/kimmonismus/status/2067310431669223425) |
| 42 | Ethan Mollick | ready | researcher | Employee @ The Wharton School | 沃顿商学院, MIT Sloan School of Management, 哈佛大学 | 5 | 0 | x:4, rss:1 | [Claude人格化趋势的中期影响](https://x.com/emollick/status/2053490736625029167) |
| 42 | 梁文锋 | active | founder | Founder & CEO @ DeepSeek | DeepSeek, 深度求索, High-Flyer | 5 | 0 | rss:3, x:2 | [DeepSeek融资70亿美元创纪录，创始人个人出资30亿](https://x.com/rohanpaul_ai/status/2052901878728659037) |
| 42 | 萨提亚·纳德拉 | active | founder | CEO @ Microsoft | 微软, 太阳微系统公司 | 5 | 0 | x:4, web:1 | [微软CEO Satya Nadella最新访谈上线](https://x.com/swyx/status/2062854555562565741) |
| 34 | Andrej Karpathy | ready | researcher | Founder @ Eureka Labs | OpenAI, 特斯拉 | 4 | 0 | x:3, rss:1 | [90%的人在白白浪费“Token”！](https://x.com/berryxia/status/2054339265103065156) |
| 34 | Mustafa Suleyman | ready | founder | CEO of Microsoft AI @ Microsoft AI | Inflection AI, Greylock Partners, 谷歌DeepMind | 4 | 0 | rss:3, x:1 | [微软AI CEO预测18个月内AI自动化所有白领工作](https://x.com/kimmonismus/status/2055952702908355012) |
| 33 | 李飞飞 | ready | professor | Co‑founder @ World Labs | 斯坦福大学 | 4 | 0 | x:4 | [阿里云CTO阐述从云原生到智能体原生转型](https://x.com/alibaba_cloud/status/2059174528786268669) |
| 26 | Geoffrey Hinton | ready | professor | Professor Emeritus @ University of Toronto | 多伦多大学, 谷歌, 卡内基梅隆大学 | 3 | 0 | x:2, rss:1 | [杨立昆访谈：剖析LLM局限，畅谈AI未来与创业新途](https://x.com/ylecun/status/2055346714039464373) |
| 18 | Chris Olah | ready | researcher | Research Scientist @ Anthropic | 谷歌, OpenAI, Anthropic | 2 | 0 | official:1, rss:1 | [Anthropic联合创始人Chris Olah在教皇通谕发布会上的讲话](https://www.anthropic.com/news/chris-olah-pope-leo-encyclical) |
| 18 | Marc Andreessen | ready | researcher | General Partner @ Andreessen Horowitz | 安德森·霍洛维茨, 网景公司 | 2 | 0 | rss:1, x:1 | [AI裁员浪潮成为火药桶](https://techcrunch.com/2026/06/15/the-ai-layoff-wave-is-becoming-a-powder-keg) |
| 18 | Mira Murati | ready | founder | Founder & CEO @ Thinking Machines Lab | 思维机器实验室, OpenAI, Leap Motion公司 | 2 | 0 | rss:1, x:1 | [OpenAI 政变之夜内部短信曝光：董事会为何执意赶走 Altman？](https://x.com/dotey/status/2052255174706479349) |
| 18 | Noam Shazeer | ready | researcher | Research Scientist @ Google | 谷歌, Character.ai | 2 | 0 | rss:1, x:1 | [Noam Shazeer 离开 Google 加入 OpenAI](https://x.com/Yuchenj_UW/status/2067401895178817999) |
| 18 | Scott Wu | active | researcher | 联合创始人兼首席执行官 @ Cognition | Cognition AI, Cognition | 2 | 0 | rss:1, x:1 | [传奇总部“Cog House”首度公开：天才创始人Scott Wu与Cognition AI的崛起之路](https://x.com/swyx/status/2053856676969890189) |
| 18 | Thariq Shihipar | ready | engineer | Member of Technical Staff, Claude Code @ Anthropic | Anthropic | 2 | 0 | web:1, x:1 | [Claude Code实践：HTML输出格式的卓越效果](https://simonwillison.net/2026/May/8/unreasonable-effectiveness-of-html) |
| 17 | Boris Cherny | ready | engineer | Claude Code @ Anthropic | Anthropic, Meta | 2 | 0 | x:2 | [这个创造了Claude Code的男人Boris Cherny大神，完整公开了自己的工作流，并直播演示了一半的编码工作在手机上完成🤪](https://x.com/AYi_AInotes/status/2051958831320588797) |
| 17 | 吴恩达 | ready | founder | Founder @ DeepLearning.AI, Coursera | 斯坦福大学, 谷歌, Coursera | 2 | 0 | x:2 | [2026 年的 AI 提示方式与 2022 年 ChatGPT 推出时大不相同。](https://x.com/frxiaobei/status/2050360857650171975) |
| 17 | 马克·扎克伯格 | ready | founder | Chief Executive Officer @ Meta | Meta | 2 | 0 | rss:2 | [扎克伯格承认 Meta AI 转型“脱轨”：裁员 10%、转岗 7000 人后组织调整过快](https://www.ithome.com/0/963/858.htm) |
| 9 | Daniela Amodei | ready | founder | President and Co-founder @ Anthropic | Anthropic, OpenAI, Stripe | 1 | 0 | rss:1 | [走进 Anthropic：这家估值 9650 亿美元的 AI 巨头](https://www.bloomberg.com/news/videos/2026-06-10/inside-anthropic-the-965-billion-ai-juggernaut-video) |
| 9 | Emad Mostaque | ready | founder | CEO of Stability AI @ CEO of Stability AI | Stability AI | 1 | 0 | x:1 | [开源psql_bm25s，让PostgreSQL多智能体检索提速23倍](https://x.com/EMostaque/status/2054587062033043799) |
| 9 | Michael Truell | ready | founder | Co-founder & CEO @ Anysphere (Cursor) | Anysphere | 1 | 0 | x:1 | [智能体协作应如同事般对话和手势](https://x.com/mntruell/status/2062955210897801520) |
| 9 | Yann LeCun | ready | professor | VP & Chief AI Scientist @ Meta | Meta, 纽约大学, 贝尔实验室 | 1 | 0 | x:1 | [杨立昆访谈：剖析LLM局限，畅谈AI未来与创业新途](https://x.com/ylecun/status/2055346714039464373) |
| 9 | Yoshua Bengio | ready | professor | Scientific Director @ Mila, Professor @ Université de Montréal | 蒙特利尔大学, Mila | 1 | 0 | x:1 | [杨立昆访谈：剖析LLM局限，畅谈AI未来与创业新途](https://x.com/ylecun/status/2055346714039464373) |
| 9 | 吉姆·范 | active | researcher | Research Scientist @ Stanford University |  | 1 | 0 | x:1 | [NVIDIA GEAR实验室发布ENPIRE：8个Codex智能体自主控制机器人完成物理实验](https://x.com/DrJimFan/status/2067283904986517866) |
| 9 | 杨植麟 | active | founder | 创始人兼首席执行官 @ 月之暗面（Moonshot AI） | 月之暗面 Kimi, 月之暗面（Moonshot AI） | 1 | 0 | x:1 | [Moonshot AI创始人杨植麟最近放出了一个40分钟视频](https://x.com/berryxia/status/2054733412846690443) |
| 9 | 桑达尔·皮查伊 | ready | founder | CEO @ Alphabet Inc. | 谷歌, Alphabet公司 | 1 | 0 | rss:1 | [Sundar Pichai 谈 AI、搜索的未来及网络的变化](https://www.theverge.com/podcast/936445/sundar-pichai-ai-search-google-zero-youtube-web) |

## 维度三：人 - 新人 candidate 复核

| 分数 | 人物 | 动作 | 新事件 | strong source | 职位/组织语境 | 相关公司 | 理由 | 样例 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 24 | Nathan Lambert | 新增人物 candidate 复核 | 3 | 1 | 1 | Kimi:1, 月之暗面:1 | 有 strong source 和职位/组织语境，满足 candidate 级复核入口。 | [月之暗面完成20亿美元融资，估值超200亿](https://x.com/natolambert/status/2052067048206090610) |
| 14 | Aaron Levie | 新增人物 candidate 复核 | 1 | 1 | 1 |  | 有 strong source 和职位/组织语境，满足 candidate 级复核入口。 | [当公司过于"AI上瘾"时会发生什么？](https://techcrunch.com/video/what-happens-when-companies-become-too-ai-pilled) |
| 14 | Adam Bry | 新增人物 candidate 复核 | 1 | 1 | 1 |  | 有 strong source 和职位/组织语境，满足 candidate 级复核入口。 | [Skydio CEO Adam Bry：硅谷不应为无人机使用画红线](https://www.theverge.com/podcast/949195/skydio-ceo-adam-bry-autonmous-drones-china-red-lines-military) |
| 14 | Alexis Lanternier | 新增人物 candidate 复核 | 1 | 1 | 1 |  | 有 strong source 和职位/组织语境，满足 candidate 级复核入口。 | [Deezer 推出面向其他流媒体服务的 AI 音乐检测器](https://www.theverge.com/ai-artificial-intelligence/948153/deezer-ai-music-detector-spotify-apple) |
| 14 | Dean Ball | 新增人物 candidate 复核 | 1 | 1 | 1 | Anthropic:1, OpenAI:1, 谷歌:1, 谷歌DeepMind:1 | 有 strong source 和职位/组织语境，满足 candidate 级复核入口。 | [OpenAI IPO前连下两城：招揽Transformer共同作者及前白宫AI政策官员](https://techcrunch.com/2026/06/18/openai-is-bringing-on-some-big-guns-in-the-lead-up-to-its-ipo) |
| 14 | Emily Chang | 新增人物 candidate 复核 | 1 | 1 | 1 | Anthropic:1, Bloomberg:1 | 有 strong source 和职位/组织语境，满足 candidate 级复核入口。 | [走进 Anthropic：这家估值 9650 亿美元的 AI 巨头](https://www.bloomberg.com/news/videos/2026-06-10/inside-anthropic-the-965-billion-ai-juggernaut-video) |
| 14 | Jack Dorsey | 新增人物 candidate 复核 | 1 | 1 | 1 | Anthropic:1, Meta:1, OpenAI:1, SpaceX:1 | 有 strong source 和职位/组织语境，满足 candidate 级复核入口。 | [AI裁员浪潮成为火药桶](https://techcrunch.com/2026/06/15/the-ai-layoff-wave-is-becoming-a-powder-keg) |
| 14 | Salvatore Sanfilippo | 新增人物 candidate 复核 | 1 | 1 | 1 | Anthropic:1 | 有 strong source 和职位/组织语境，满足 candidate 级复核入口。 | [Redis 数组类型交互式体验平台上线](https://simonwillison.net/2026/May/4/redis-array) |
| 14 | Travis Bryant | 新增人物 candidate 复核 | 1 | 1 | 1 | Anthropic:1 | 有 strong source 和职位/组织语境，满足 candidate 级复核入口。 | [Anthropic销售负责人如何利用Claude Cowork管理4000个客户账户](https://claude.com/blog/how-an-anthropic-sales-leader-uses-claude-cowork-to-run-a-4-000-account-book) |

## 维度三：人 - 暂不符合人物准入 Top 30

| 分数 | 名称 | 动作 | 新事件 | strong source | 职位/组织语境 | 转述者信号 | 理由 | 样例 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 50 | Gary Marcus | 暂不吸收为人物 | 5 | 5 | 0 | 0 | 不符合人物准入：缺 roleCategory / organization / currentTitle 级别证据。 | [特朗普向Anthropic提出不可能的要求](https://garymarcus.substack.com/p/breaking-trump-asks-the-impossible) |
| 23 | Berry Xia | 暂不吸收为人物 | 31 | 0 | 0 | 22 | 更像内容源作者或转述者，先作为内容源观察。 | [国家队领投DeepSeek估值飙升至450亿美元](https://x.com/berryxia/status/2051974536481198511) |
| 20 | Jonathan Jaffe | 暂不吸收为人物 | 2 | 2 | 0 | 0 | 不符合人物准入：缺 roleCategory / organization / currentTitle 级别证据。 | [Securing the Agentic Enterprise：保障智能体化企业的安全](https://www.tomtunguz.com/jonathan-jaffe-office-hours) |
| 14 | Garry Tan | 暂不吸收为人物 | 2 | 0 | 1 | 0 | 不符合人物准入：只有 X/聚合/转述线索，缺 strong source。 | [YC CEO开源个人AI操作系统GBrain，构建知识复利“第二大脑”](https://x.com/berryxia/status/2053136924244836455) |
| 14 | Jon Erwin | 暂不吸收为人物 | 2 | 0 | 1 | 0 | 不符合人物准入：只有 X/聚合/转述线索，缺 strong source。 | [Kling AI驱动《大卫之家》实现多项行业首创](https://x.com/Kling_ai/status/2059121691385622761) |
| 12 | 小北 | 暂不吸收为人物 | 6 | 0 | 0 | 3 | 更像内容源作者或转述者，先作为内容源观察。 | [Anthropic开源金融AI全栈模板，定义行业落地新标准](https://x.com/frxiaobei/status/2053861985008431398) |
| 10 | Alex Imas | 暂不吸收为人物 | 1 | 1 | 0 | 0 | 不符合人物准入：缺 roleCategory / organization / currentTitle 级别证据。 | [Alex Imas 和 Phil Trammell：AGI 后什么仍然稀缺？](https://www.dwarkesh.com/p/alex-imas-phil-trammell) |
| 10 | Cameron Stanley | 暂不吸收为人物 | 1 | 1 | 0 | 0 | 不符合人物准入：缺 roleCategory / organization / currentTitle 级别证据。 | [美国司法部援引国家安全为xAI未经许可的燃气轮机辩护](https://the-decoder.com/doj-invokes-national-security-to-defend-xais-unpermitted-gas-turbines-in-naacp-lawsuit) |
| 10 | Finbarr Timbers | 暂不吸收为人物 | 1 | 1 | 0 | 0 | 不符合人物准入：缺 roleCategory / organization / currentTitle 级别证据。 | [前沿大模型后训练配方回顾：与 Finbarr Timbers 对谈](https://www.interconnects.ai/p/frontier-post-training-recipe-review) |
| 10 | Jason Kwon | 暂不吸收为人物 | 1 | 1 | 0 | 0 | 不符合人物准入：缺 roleCategory / organization / currentTitle 级别证据。 | [OpenAI IPO前连下两城：招揽Transformer共同作者及前白宫AI政策官员](https://techcrunch.com/2026/06/18/openai-is-bringing-on-some-big-guns-in-the-lead-up-to-its-ipo) |
| 10 | John Burn | 暂不吸收为人物 | 1 | 1 | 0 | 0 | 不符合人物准入：缺 roleCategory / organization / currentTitle 级别证据。 | [Slop、生产力，以及为何AI驱动的世界进展甚微](https://garymarcus.substack.com/p/slop-productivity-and-why-the-ai) |
| 10 | Kevin Frazier | 暂不吸收为人物 | 1 | 1 | 0 | 0 | 不符合人物准入：缺 roleCategory / organization / currentTitle 级别证据。 | [白宫AI监管决定被指偏袒OpenAI与亚马逊](https://garymarcus.substack.com/p/what-washington-must-do) |
| 10 | Kostiantyn Vlasenko | 暂不吸收为人物 | 1 | 1 | 0 | 0 | 不符合人物准入：缺 roleCategory / organization / currentTitle 级别证据。 | [零基础项目经理借助Claude Code，六周内独立开发并上线压力管理应用](https://claude.com/blog/how-a-non-technical-project-manager-built-and-shipped-a-stress-management-app-with-claude-code-in-six-weeks) |
| 10 | Phil Trammell | 暂不吸收为人物 | 1 | 1 | 0 | 0 | 不符合人物准入：缺 roleCategory / organization / currentTitle 级别证据。 | [Alex Imas 和 Phil Trammell：AGI 后什么仍然稀缺？](https://www.dwarkesh.com/p/alex-imas-phil-trammell) |
| 10 | Richard Dawkins | 暂不吸收为人物 | 1 | 1 | 0 | 0 | 不符合人物准入：缺 roleCategory / organization / currentTitle 级别证据。 | [Richard Dawkins 与 Claude 妄想](https://garymarcus.substack.com/p/richard-dawkins-and-the-claude-delusion) |
| 10 | Richard Sutton | 暂不吸收为人物 | 1 | 1 | 0 | 0 | 不符合人物准入：缺 roleCategory / organization / currentTitle 级别证据。 | [预训练还不够“苦涩”](https://blog.ml.cmu.edu/2026/06/17/pre-training-isnt-bitter-enough) |
| 10 | Sholto Douglas | 暂不吸收为人物 | 1 | 1 | 0 | 0 | 不符合人物准入：缺 roleCategory / organization / currentTitle 级别证据。 | [据报道Claude Mythos以“巧妙简洁的证明”解决了OpenAI里程碑式的Erdős问题](https://the-decoder.com/claude-mythos-reportedly-solves-openais-landmark-erdos-problem-with-a-cute-simple-proof) |
| 10 | Simon Willison | 暂不吸收为人物 | 1 | 1 | 0 | 0 | 不符合人物准入：缺 roleCategory / organization / currentTitle 级别证据。 | [Redis 数组类型交互式体验平台上线](https://simonwillison.net/2026/May/4/redis-array) |
| 10 | Swift Student Challenge | 暂不吸收为人物 | 1 | 1 | 0 | 0 | 不符合人物准入：缺 roleCategory / organization / currentTitle 级别证据。 | [AI 与无障碍技术在今年 Swift Student Challenge 中的相遇](https://www.apple.com/newsroom/2026/05/ai-meets-accessibility-in-this-years-swift-student-challenge) |
| 10 | Team Premium | 暂不吸收为人物 | 1 | 1 | 0 | 0 | 不符合人物准入：缺 roleCategory / organization / currentTitle 级别证据。 | [Claude Code v2.1.174 发布](https://github.com/anthropics/claude-code/releases/tag/v2.1.174) |
| 10 | The Next Era | 暂不吸收为人物 | 1 | 1 | 0 | 0 | 不符合人物准入：缺 roleCategory / organization / currentTitle 级别证据。 | [Codex正在成为每个人的生产力工具](https://openai.com/index/codex-for-knowledge-work) |
| 10 | The Rogue | 暂不吸收为人物 | 1 | 1 | 0 | 0 | 不符合人物准入：缺 roleCategory / organization / currentTitle 级别证据。 | [Project Luxo：跨越AI媒体的恐怖谷](https://runwayml.com/news/project-luxo) |
| 10 | Town Lake | 暂不吸收为人物 | 1 | 1 | 0 | 0 | 不符合人物准入：缺 roleCategory / organization / currentTitle 级别证据。 | [我们如何构建Cloudflare的数据平台及其上的AI智能体](https://blog.cloudflare.com/our-unified-data-platform) |
| 9 | Allen Institute | 暂不吸收为人物 | 1 | 0 | 1 | 0 | 不符合人物准入：只有 X/聚合/转述线索，缺 strong source。 | [Nathan Lambert离开Ai2，结束2.5年OLMO等项目工作](https://x.com/natolambert/status/2061813361848029631) |
| 9 | Book Mirror | 暂不吸收为人物 | 1 | 0 | 1 | 0 | 不符合人物准入：只有 X/聚合/转述线索，缺 strong source。 | [YC CEO开源个人AI操作系统GBrain，构建知识复利“第二大脑”](https://x.com/berryxia/status/2053136924244836455) |
| 9 | Brian Armstrong | 暂不吸收为人物 | 1 | 0 | 1 | 0 | 不符合人物准入：只有 X/聚合/转述线索，缺 strong source。 | [Coinbase裁员14%，主要原因之一是AI](https://x.com/kimmonismus/status/2051709256735555901) |
| 9 | Cog House | 暂不吸收为人物 | 1 | 0 | 1 | 0 | 不符合人物准入：只有 X/聚合/转述线索，缺 strong source。 | [传奇总部“Cog House”首度公开：天才创始人Scott Wu与Cognition AI的崛起之路](https://x.com/swyx/status/2053856676969890189) |
| 9 | Daniel Han | 暂不吸收为人物 | 1 | 0 | 1 | 0 | 不符合人物准入：只有 X/聚合/转述线索，缺 strong source。 | [UnslothAI发布Qwen3.6 MTP GGUF模型，实现推理速度大幅提升](https://x.com/berryxia/status/2054749585520890314) |
| 9 | Innovative Dreams | 暂不吸收为人物 | 1 | 0 | 1 | 0 | 不符合人物准入：只有 X/聚合/转述线索，缺 strong source。 | [Kling AI驱动《大卫之家》实现多项行业首创](https://x.com/Kling_ai/status/2059121691385622761) |
| 9 | Kaoutar Benyahya | 暂不吸收为人物 | 1 | 0 | 1 | 0 | 不符合人物准入：只有 X/聚合/转述线索，缺 strong source。 | [微软Project Mosaic：micro-LED光学互连技术](https://x.com/MSFTResearch/status/2062983588606320714) |

## 证据附录：建议吸收的具体内容（已知人物/组织）Top 30

| 优先级 | 动作 | 去重判断 | 日期 | 版块 | 命中/候选 | 标题 | 来源 | 入库路径 | 理由 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 38 | 补已知人物动态 | 新事件 | 2026-06-19 | 行业动态 | 人物:Noam Shazeer, 组织:谷歌, 组织:OpenAI | [Noam Shazeer 离开 Google 加入 OpenAI](https://x.com/Yuchenj_UW/status/2067401895178817999) | X：Yuchen Jin (@Yuchenj_UW) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：Noam Shazeer |
| 38 | 补已知人物动态 | 新事件 | 2026-06-18 | 行业动态 | 人物:Dario Amodei, 人物:Demis Hassabis, 组织:Anthropic, 组织:谷歌, 组织:谷歌DeepMind | [Anthropic与DeepMind CEO呼吁G7组建AI联盟排除中国](https://x.com/kimmonismus/status/2067310431669223425) | X：Kim (@kimmonismus) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：Dario Amodei、Demis Hassabis |
| 38 | 补已知人物动态 | 新事件 | 2026-06-17 | 行业动态 | 人物:Dario Amodei, 组织:Anthropic, 组织:OpenAI | [五角大楼将大部分日常AI工作流从Anthropic转移，目标9月前完全切断](https://x.com/AYi_AInotes/status/2066679835607412846) | X：阿易 AI Notes (@AYi_AInotes) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：Dario Amodei |
| 38 | 补已知人物动态 | 新事件 | 2026-05-27 | 行业动态 | 人物:李飞飞, 组织:阿里云, 组织:Alibaba | [阿里云CTO阐述从云原生到智能体原生转型](https://x.com/alibaba_cloud/status/2059174528786268669) | X：阿里云 / Alibaba Cloud (@alibaba_cloud) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：李飞飞 |
| 38 | 补已知人物动态 | 新事件 | 2026-05-20 | 行业动态 | 人物:Elon Musk, 组织:Anthropic, 组织:谷歌 | [Andrej加入Anthropic，马斯克也点赞](https://x.com/Yuchenj_UW/status/2056764450712256753) | X：Yuchen Jin (@Yuchenj_UW) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：Elon Musk |
| 38 | 补已知人物动态 | 新事件 | 2026-05-10 | 行业动态 | 人物:梁文锋, 组织:Anthropic, 组织:杭州深度求索人工智能基础技术研究有限公司（深度求索 / DeepSeek）, 组织:OpenAI | [DeepSeek融资70亿美元创纪录，创始人个人出资30亿](https://x.com/rohanpaul_ai/status/2052901878728659037) | X：Rohan Paul (@rohanpaul_ai) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：梁文锋 |
| 38 | 补已知人物动态 | 新事件 | 2026-05-07 | 行业动态 | 人物:Demis Hassabis, 组织:谷歌, 组织:谷歌DeepMind | [Google DeepMind与EVE Online合作研究复杂智能系统](https://x.com/testingcatalog/status/2052149633913139655) | X：Testing Catalog (@testingcatalog) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：Demis Hassabis |
| 38 | 补已知人物动态 | 新事件 | 2026-05-07 | 行业动态 | 人物:梁文锋, 组织:杭州深度求索人工智能基础技术研究有限公司（深度求索 / DeepSeek）, 组织:腾讯 | [国家队领投DeepSeek估值飙升至450亿美元](https://x.com/berryxia/status/2051974536481198511) | X：Berry Xia (@berryxia) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：梁文锋 |
| 38 | 补已知人物动态 | 新事件 | 2026-05-06 | 行业动态 | 人物:Elon Musk, 组织:OpenAI | [奥特曼与布罗克曼被指在OpenAI进行自我交易，涉嫌背叛马斯克](https://x.com/cb_doge/status/2051469347131183130) | X：cb_doge (@cb_doge) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：Elon Musk |
| 37 | 补已知人物动态 | 新事件 | 2026-06-08 | 产品发布/更新 | 人物:黄仁勋, 组织:英伟达 | [NVIDIA 与 KRAFTON、NC、T1 在韩国 PC 房庆祝 RTX Spark 发布](https://blogs.nvidia.com/blog/krafton-nc-t1-korea-gaming-pc-bang-rtx-spark) | NVIDIA AI Blog | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：黄仁勋 |
| 36 | 补已知人物动态 | 新事件 | 2026-06-15 | 技巧与观点 | 人物:Dario Amodei, 人物:黄仁勋, 组织:Anthropic, 组织:OpenAI | [Anthropic 上市前夕](https://x.com/xiaohu/status/2065991805238497732) | X：小互 (@xiaohu) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：Dario Amodei、黄仁勋 |
| 36 | 补已知人物动态 | 新事件 | 2026-06-11 | 技巧与观点 | 人物:Dario Amodei, 组织:Anthropic | [Anthropic CEO Dario Amodei 发文呼吁缩小AI政策差距](https://x.com/AnthropicAI/status/2064783418844762489) | X：Anthropic (@AnthropicAI) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：Dario Amodei |
| 36 | 补已知人物动态 | 新事件 | 2026-06-09 | 技巧与观点 | 人物:Sam Altman, 组织:OpenAI | [OpenAI计划到2028年由AI主导研究](https://x.com/rohanpaul_ai/status/2064096574142390755) | X：Rohan Paul (@rohanpaul_ai) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：Sam Altman |
| 36 | 补已知人物动态 | 新事件 | 2026-06-06 | 技巧与观点 | 人物:萨提亚·纳德拉, 组织:微软 | [微软CEO Satya Nadella最新访谈上线](https://x.com/swyx/status/2062854555562565741) | X：swyx (@swyx) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：萨提亚·纳德拉 |
| 36 | 补已知人物动态 | 新事件 | 2026-06-04 | 产品发布/更新 | 人物:黄仁勋, 组织:微软, 组织:英伟达 | [黄仁勋与纳德拉共议智能体AI时代](https://x.com/nvidia/status/2062228974273716457) | X：NVIDIA (@nvidia) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：黄仁勋 |
| 36 | 补已知人物动态 | 新事件 | 2026-05-26 | 技巧与观点 | 人物:Chris Olah, 组织:Anthropic | [Anthropic联合创始人Chris Olah在教皇通谕发布会上的讲话](https://www.anthropic.com/news/chris-olah-pope-leo-encyclical) | Anthropic：Newsroom（网页） | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：Chris Olah |
| 36 | 补已知人物动态 | 新事件 | 2026-05-18 | 技巧与观点 | 人物:Mustafa Suleyman, 组织:微软, 组织:微软AI | [微软AI CEO预测18个月内AI自动化所有白领工作](https://x.com/kimmonismus/status/2055952702908355012) | X：Kim (@kimmonismus) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：Mustafa Suleyman |
| 36 | 补已知人物动态 | 新事件 | 2026-05-16 | 技巧与观点 | 人物:黄仁勋, 组织:卡内基梅隆大学, 组织:英伟达 | [英伟达CEO称技工前景优于计算机科学毕业生](https://x.com/kimmonismus/status/2055403142913884288) | X：Kim (@kimmonismus) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：黄仁勋 |
| 36 | 补已知人物动态 | 新事件 | 2026-05-15 | 技巧与观点 | 人物:杨植麟, 组织:月之暗面, 组织:Kimi | [Moonshot AI创始人杨植麟最近放出了一个40分钟视频](https://x.com/berryxia/status/2054733412846690443) | X：Berry Xia (@berryxia) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：杨植麟 |
| 36 | 补已知人物动态 | 新事件 | 2026-05-13 | 技巧与观点 | 人物:Andrej Karpathy, 组织:Kimi | [90%的人在白白浪费“Token”！](https://x.com/berryxia/status/2054339265103065156) | X：Berry Xia (@berryxia) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：Andrej Karpathy |
| 36 | 补已知人物动态 | 新事件 | 2026-05-12 | 技巧与观点 | 人物:Sam Altman, 人物:Scott Wu, 组织:Cognition, 组织:Cognition AI, 组织:OpenAI | [传奇总部“Cog House”首度公开：天才创始人Scott Wu与Cognition AI的崛起之路](https://x.com/swyx/status/2053856676969890189) | X：swyx (@swyx) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：Sam Altman、Scott Wu |
| 36 | 补已知人物动态 | 新事件 | 2026-05-08 | 技巧与观点 | 人物:Elon Musk, 人物:Mira Murati, 组织:微软, 组织:OpenAI | [OpenAI 政变之夜内部短信曝光：董事会为何执意赶走 Altman？](https://x.com/dotey/status/2052255174706479349) | X：宝玉 (@dotey) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：Elon Musk、Mira Murati |
| 35 | 补已知人物动态 | 新事件 | 2026-06-19 | 产品发布/更新 | 人物:Greg Brockman, 组织:OpenAI | [OpenAI 联合多国医生：GPT-5.5 Instant 健康问答能力追平前沿 Thinking 模型](https://x.com/gdb/status/2067675030335668270) | X：Greg Brockman (@gdb) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：Greg Brockman |
| 35 | 补已知人物动态 | 新事件 | 2026-06-10 | 行业动态 | 人物:Elon Musk, 组织:英伟达, 组织:SpaceX | [Elon Musk 详解 SpaceX AI1 轨道 AI 数据中心卫星方案](https://x.com/rohanpaul_ai/status/2064165951936094364) | X：Rohan Paul (@rohanpaul_ai) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：Elon Musk |
| 35 | 补已知人物动态 | 新事件 | 2026-06-10 | 产品发布/更新 | 人物:李飞飞, 组织:World Labs | [World Labs与Lore合作打造互动体验](https://x.com/drfeifei/status/2064387365930676695) | X：Fei-Fei Li (@drfeifei, World Labs) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：李飞飞 |
| 35 | 补已知人物动态 | 新事件 | 2026-06-01 | 产品发布/更新 | 人物:Sam Altman, 组织:OpenAI | [OpenAI发布生物防御AI工具Rosalind](https://x.com/sama/status/2061101875303530871) | X：Sam Altman (@sama) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：Sam Altman |
| 35 | 补已知人物动态 | 新事件 | 2026-05-30 | 模型发布/更新 | 人物:Greg Brockman, 组织:OpenAI | [OpenAI推出实时翻译模型，支持70+语言输入](https://x.com/gdb/status/2060452095279415725) | X：Greg Brockman (@gdb) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：Greg Brockman |
| 35 | 补已知人物动态 | 新事件 | 2026-05-28 | 行业动态 | 人物:黄仁勋, 组织:AMD, 组织:英伟达 | [黄仁勋展示英伟达台湾新园区](https://x.com/rohanpaul_ai/status/2059689400267939925) | X：Rohan Paul (@rohanpaul_ai) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：黄仁勋 |
| 35 | 补已知人物动态 | 新事件 | 2026-05-18 | 产品发布/更新 | 人物:Elon Musk, 组织:xAI | [Grok Imagine图像生成功能正式发布](https://x.com/elonmusk/status/2055912040481599793) | X：Elon Musk (@elonmusk, xAI) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：Elon Musk |
| 35 | 补已知人物动态 | 新事件 | 2026-05-09 | 产品发布/更新 | 人物:Elon Musk, 组织:xAI | [Grok 升级推出全平台连接器功能](https://x.com/elonmusk/status/2052856431611941200) | X：Elon Musk (@elonmusk, xAI) | RawPoolItem -> 清洗 -> ActivityEvent/Card 候选 | 命中人物：Elon Musk |

## 证据附录：新实体/主题线索 Top 30

| 优先级 | 动作 | 去重判断 | 日期 | 版块 | 候选词 | 标题 | 来源 | 入库路径 | 理由 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 27 | 建新实体/主题线索 | 新事件 | 2026-06-17 | 模型发布/更新 | Qwen-RobotNav, Qwen, Qwen3-VL, SOTA, VLN-CE RxR | [Qwen-RobotNav：面向智能体导航系统的可扩展导航模型](https://qwen.ai/blog?id=qwen-robotnav) | Qwen：Blog Retrieval（API） | KnowledgeSource 候选；需要实体归属后再进入人物页 | 一手/论文/GitHub 源，适合作为新主题入口。 |
| 27 | 建新实体/主题线索 | 新事件 | 2026-06-16 | 模型发布/更新 | DFlash, Spec V2 Z Lab, Modal, SGLang, Spec V2 | [下一代投机解码：DFlash 与 Spec V2](https://www.lmsys.org/blog/2026-06-15-next-generation-speculative-decoding-dflash-v2) | LMSYS：Blog（Chatbot Arena 团队） | KnowledgeSource 候选；需要实体归属后再进入人物页 | 一手/论文/GitHub 源，适合作为新主题入口。 |
| 27 | 建新实体/主题线索 | 新事件 | 2026-05-21 | 模型发布/更新 | Qwen3.7, Qwen Studio | [Qwen3.7：智能体前沿](https://qwen.ai/blog?id=qwen3.7) | Qwen：Blog Retrieval（API） | KnowledgeSource 候选；需要实体归属后再进入人物页 | 一手/论文/GitHub 源，适合作为新主题入口。 |
| 27 | 建新实体/主题线索 | 新事件 | 2026-05-14 | 产品发布/更新 | Introducing Runway Agent Runway, Runway Agent, Agent | [Introducing Runway Agent](https://runwayml.com/news/introducing-runway-agent) | Runway：News（网页） | KnowledgeSource 候选；需要实体归属后再进入人物页 | 一手/论文/GitHub 源，适合作为新主题入口。 |
| 27 | 建新实体/主题线索 | 新事件 | 2026-05-04 | 产品发布/更新 | Runway Characters, Runway, Characters, GWM-1 | [从单张图像构建实时视频智能体：Runway Characters技术解析](https://runwayml.com/news/building-runway-characters) | Runway：News（网页） | KnowledgeSource 候选；需要实体归属后再进入人物页 | 一手/论文/GitHub 源，适合作为新主题入口。 |
| 26 | 建新实体/主题线索 | 新事件 | 2026-06-12 | 行业动态 | Runway, Lionsgate, Runway AI | [Runway与Lionsgate扩大战略合作](https://runwayml.com/news/runway-and-lionsgate-expand-partnership) | Runway：News（网页） | KnowledgeSource 候选；需要实体归属后再进入人物页 | 一手/论文/GitHub 源，适合作为新主题入口。 |
| 26 | 建新实体/主题线索 | 新事件 | 2026-05-21 | 行业动态 |  | [欧盟委员会发布《欧盟人工智能法》高风险AI系统分类指导草案并开启公众咨询](https://www.dataguidance.com/news/eu-commission-publishes-draft-guidelines-classifying) | DataGuidance：Artificial Intelligence（网页） | KnowledgeSource 候选；需要实体归属后再进入人物页 | 一手/论文/GitHub 源，适合作为新主题入口。 |
| 26 | 建新实体/主题线索 | 新事件 | 2026-05-09 | 行业动态 | Runway, Thorn, C2PA | [我们保护儿童安全的方法](https://runwayml.com/news/our-approach-to-child-safety) | Runway：News（网页） | KnowledgeSource 候选；需要实体归属后再进入人物页 | 一手/论文/GitHub 源，适合作为新主题入口。 |
| 25 | 建新实体/主题线索 | 新事件 | 2026-06-19 | 产品发布/更新 | Claude Code | [Claude Code 现已支持 artifacts](https://claude.com/blog/artifacts-in-claude-code) | Claude：Blog（网页） | KnowledgeSource 候选；需要实体归属后再进入人物页 | 一手/论文/GitHub 源，适合作为新主题入口。 |
| 25 | X 线索待一手验证 | 新事件 | 2026-06-17 | 模型发布/更新 | Cartesia, Sonic, Ink, Artificial Analysis, Sonic 3.5 | [Cartesia 发布 Sonic 3.5 与 Ink 2 实时语音模型](https://x.com/testingcatalog/status/2066773392527655252) | X：Testing Catalog (@testingcatalog) | 先找官方/GitHub/论文原文；找不到再作为 X RawPool 候选 | X 转述信息量高，但入库前要优先找原始来源。 |
| 25 | X 线索待一手验证 | 新事件 | 2026-06-16 | 产品发布/更新 | OpenRouter, Gemma4, Darkbloom, Gemma, oss-20b | [OpenRouter新增免费模型gpt-oss-20b和Gemma4 26B](https://x.com/OpenRouter/status/2066585705581797616) | X：OpenRouter (@OpenRouter) | 先找官方/GitHub/论文原文；找不到再作为 X RawPool 候选 | X 转述信息量高，但入库前要优先找原始来源。 |
| 25 | X 线索待一手验证 | 新事件 | 2026-06-14 | 产品发布/更新 | Fusion API, Fable, Fusion | [Fusion API：半价达Fable级智能](https://x.com/OpenRouter/status/2065856853989270011) | X：OpenRouter (@OpenRouter) | 先找官方/GitHub/论文原文；找不到再作为 X RawPool 候选 | X 转述信息量高，但入库前要优先找原始来源。 |
| 25 | X 线索待一手验证 | 新事件 | 2026-06-12 | 产品发布/更新 | Krea, Krea 2 | [Krea 2 推出生成式滑块控制图像属性](https://x.com/krea_ai/status/2065086662166901114) | X：Krea AI (@krea_ai) | 先找官方/GitHub/论文原文；找不到再作为 X RawPool 候选 | X 转述信息量高，但入库前要优先找原始来源。 |
| 25 | X 线索待一手验证 | 新事件 | 2026-06-12 | 产品发布/更新 | OpenRouter | [OpenRouter 基准探索器：10项帕累托曲线](https://x.com/OpenRouter/status/2065094780271329729) | X：OpenRouter (@OpenRouter) | 先找官方/GitHub/论文原文；找不到再作为 X RawPool 候选 | X 转述信息量高，但入库前要优先找原始来源。 |
| 25 | X 线索待一手验证 | 新事件 | 2026-06-11 | 产品发布/更新 | OpenRouter, Activity, Fable | [OpenRouter 推出 Activity explorer 活动探索器](https://x.com/OpenRouter/status/2064730000956489889) | X：OpenRouter (@OpenRouter) | 先找官方/GitHub/论文原文；找不到再作为 X RawPool 候选 | X 转述信息量高，但入库前要优先找原始来源。 |
| 25 | X 线索待一手验证 | 新事件 | 2026-06-10 | 产品发布/更新 | Luma AI Ray3.2 API, Ray3.2 API | [Luma AI Ray3.2 API：电影级渲染可集成](https://x.com/LumaLabsAI/status/2064389582997897216) | X：Luma AI (@LumaLabsAI) | 先找官方/GitHub/论文原文；找不到再作为 X RawPool 候选 | X 转述信息量高，但入库前要优先找原始来源。 |
| 25 | 建新实体/主题线索 | 新事件 | 2026-06-09 | 产品发布/更新 | Claude, Connector, Claude Code, Cowork, Team | [Claude 为 Connector 开发者推出性能监控仪表盘](https://claude.com/blog/observability-for-developers-building-connectors) | Claude：Blog（网页） | KnowledgeSource 候选；需要实体归属后再进入人物页 | 一手/论文/GitHub 源，适合作为新主题入口。 |
| 25 | X 线索待一手验证 | 新事件 | 2026-06-09 | 产品发布/更新 | Runway Aleph, Aleph, Web, Aleph 2.0 | [Runway Aleph 2.0 编辑模型：一键适配任意视频格式](https://x.com/runwayml/status/2064012425884569627) | X：Runway (@runwayml) | 先找官方/GitHub/论文原文；找不到再作为 X RawPool 候选 | X 转述信息量高，但入库前要优先找原始来源。 |
| 25 | X 线索待一手验证 | 新事件 | 2026-06-09 | 模型发布/更新 | VoxCPM2, OpenBMB, AudioVAE, TTS, SOTA | [VoxCPM2 技术报告发布](https://x.com/OpenBMB/status/2063991963133903317) | X：面壁智能 OpenBMB (@OpenBMB) | 先找官方/GitHub/论文原文；找不到再作为 X RawPool 候选 | X 转述信息量高，但入库前要优先找原始来源。 |
| 25 | X 线索待一手验证 | 新事件 | 2026-06-06 | 模型发布/更新 | Riverflow, OpenRouter, Sourceful, Fast, Pro | [Riverflow 2.5：可控制评分标准的图像模型](https://x.com/OpenRouter/status/2062944965978992935) | X：OpenRouter (@OpenRouter) | 先找官方/GitHub/论文原文；找不到再作为 X RawPool 候选 | X 转述信息量高，但入库前要优先找原始来源。 |
| 25 | X 线索待一手验证 | 新事件 | 2026-06-06 | 产品发布/更新 | MiniCPM-V, AccountingLLM, IPO, PDF, V 4.6 | [社区基于MiniCPM-V 4.6打造财务分析工具AccountingLLM](https://x.com/OpenBMB/status/2062889699056984281) | X：面壁智能 OpenBMB (@OpenBMB) | 先找官方/GitHub/论文原文；找不到再作为 X RawPool 候选 | X 转述信息量高，但入库前要优先找原始来源。 |
| 25 | X 线索待一手验证 | 新事件 | 2026-06-05 | 产品发布/更新 | NotebookLM | [NotebookLM 来源归属功能上线](https://x.com/NotebookLM/status/2062653124326863077) | X：NotebookLM (@NotebookLM) | 先找官方/GitHub/论文原文；找不到再作为 X RawPool 候选 | X 转述信息量高，但入库前要优先找原始来源。 |
| 25 | X 线索待一手验证 | 新事件 | 2026-06-04 | 模型发布/更新 | Grok Imagine, SpaceXAI, Imagine 1.5 | [Grok Imagine 1.5 预览版发布](https://x.com/cb_doge/status/2062242490745594085) | X：cb_doge (@cb_doge) | 先找官方/GitHub/论文原文；找不到再作为 X RawPool 候选 | X 转述信息量高，但入库前要优先找原始来源。 |
| 25 | X 线索待一手验证 | 新事件 | 2026-06-04 | 模型发布/更新 | Ideogram, JSON, Krea, v4.0 | [Ideogram v4.0 发布：2K 分辨率和 JSON 提示支持](https://x.com/krea_ai/status/2062227837130887567) | X：Krea AI (@krea_ai) | 先找官方/GitHub/论文原文；找不到再作为 X RawPool 候选 | X 转述信息量高，但入库前要优先找原始来源。 |
| 25 | X 线索待一手验证 | 新事件 | 2026-06-04 | 产品发布/更新 | NousResearch, Hermes Agent | [NousResearch 发布 Hermes Agent 桌面应用公测版](https://x.com/SiliconFlowAI/status/2062042813852995899) | X：硅基流动 SiliconFlow (@SiliconFlowAI) | 先找官方/GitHub/论文原文；找不到再作为 X RawPool 候选 | X 转述信息量高，但入库前要优先找原始来源。 |
| 25 | X 线索待一手验证 | 新事件 | 2026-06-03 | 产品发布/更新 | Runway API, Aleph, Aleph 2.0 | [Runway API 推出 Aleph 2.0 视频编辑功能](https://x.com/runwayml/status/2061895998545244342) | X：Runway (@runwayml) | 先找官方/GitHub/论文原文；找不到再作为 X RawPool 候选 | X 转述信息量高，但入库前要优先找原始来源。 |
| 25 | X 线索待一手验证 | 新事件 | 2026-06-02 | 产品发布/更新 | Auto Router | [Auto Router 新增成本质量权衡参数](https://x.com/OpenRouter/status/2061476882470580329) | X：OpenRouter (@OpenRouter) | 先找官方/GitHub/论文原文；找不到再作为 X RawPool 候选 | X 转述信息量高，但入库前要优先找原始来源。 |
| 25 | X 线索待一手验证 | 新事件 | 2026-06-02 | 产品发布/更新 | OpenBMB, UltraData, HuggingFace, NLP, Modelbest | [OpenBMB发布UltraData两大开源数据集，登顶HuggingFace趋势榜](https://x.com/OpenBMB/status/2061432928492810535) | X：面壁智能 OpenBMB (@OpenBMB) | 先找官方/GitHub/论文原文；找不到再作为 X RawPool 候选 | X 转述信息量高，但入库前要优先找原始来源。 |
| 25 | X 线索待一手验证 | 新事件 | 2026-05-30 | 产品发布/更新 | ChatGPT | [ChatGPT对话目录功能现已上线](https://x.com/ChatGPTapp/status/2060467129066070182) | X：ChatGPT (@ChatGPTapp) | 先找官方/GitHub/论文原文；找不到再作为 X RawPool 候选 | X 转述信息量高，但入库前要优先找原始来源。 |
| 25 | X 线索待一手验证 | 新事件 | 2026-05-30 | 产品发布/更新 | ComfyUI, OpenRouter, Comfy | [ComfyUI现已支持OpenRouter模型直接调用](https://x.com/OpenRouter/status/2060511136932315259) | X：OpenRouter (@OpenRouter) | 先找官方/GitHub/论文原文；找不到再作为 X RawPool 候选 | X 转述信息量高，但入库前要优先找原始来源。 |

## P0：已知实体的新内容缺口 Top 30（按事件去重）

| 优先级 | 日期 | 版块 | 重复数 | 命中对象 | 标题 | 代表来源 | 其他来源 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 38 | 2026-06-19 | 行业动态 | 1 | 人物:Noam Shazeer, 组织:谷歌, 组织:OpenAI | [Noam Shazeer 离开 Google 加入 OpenAI](https://x.com/Yuchenj_UW/status/2067401895178817999) | X：Yuchen Jin (@Yuchenj_UW) |  |
| 38 | 2026-06-18 | 行业动态 | 1 | 人物:Dario Amodei, 人物:Demis Hassabis, 组织:Anthropic, 组织:谷歌, 组织:谷歌DeepMind | [Anthropic与DeepMind CEO呼吁G7组建AI联盟排除中国](https://x.com/kimmonismus/status/2067310431669223425) | X：Kim (@kimmonismus) |  |
| 38 | 2026-06-17 | 行业动态 | 1 | 人物:Dario Amodei, 组织:Anthropic, 组织:OpenAI | [五角大楼将大部分日常AI工作流从Anthropic转移，目标9月前完全切断](https://x.com/AYi_AInotes/status/2066679835607412846) | X：阿易 AI Notes (@AYi_AInotes) |  |
| 38 | 2026-05-27 | 行业动态 | 1 | 人物:李飞飞, 组织:阿里云, 组织:Alibaba | [阿里云CTO阐述从云原生到智能体原生转型](https://x.com/alibaba_cloud/status/2059174528786268669) | X：阿里云 / Alibaba Cloud (@alibaba_cloud) |  |
| 38 | 2026-05-20 | 行业动态 | 1 | 人物:Elon Musk, 组织:Anthropic, 组织:谷歌 | [Andrej加入Anthropic，马斯克也点赞](https://x.com/Yuchenj_UW/status/2056764450712256753) | X：Yuchen Jin (@Yuchenj_UW) |  |
| 38 | 2026-05-10 | 行业动态 | 1 | 人物:梁文锋, 组织:Anthropic, 组织:杭州深度求索人工智能基础技术研究有限公司（深度求索 / DeepSeek）, 组织:OpenAI | [DeepSeek融资70亿美元创纪录，创始人个人出资30亿](https://x.com/rohanpaul_ai/status/2052901878728659037) | X：Rohan Paul (@rohanpaul_ai) |  |
| 38 | 2026-05-07 | 行业动态 | 1 | 人物:Demis Hassabis, 组织:谷歌, 组织:谷歌DeepMind | [Google DeepMind与EVE Online合作研究复杂智能系统](https://x.com/testingcatalog/status/2052149633913139655) | X：Testing Catalog (@testingcatalog) |  |
| 38 | 2026-05-07 | 行业动态 | 1 | 人物:梁文锋, 组织:杭州深度求索人工智能基础技术研究有限公司（深度求索 / DeepSeek）, 组织:腾讯 | [国家队领投DeepSeek估值飙升至450亿美元](https://x.com/berryxia/status/2051974536481198511) | X：Berry Xia (@berryxia) |  |
| 38 | 2026-05-06 | 行业动态 | 1 | 人物:Elon Musk, 组织:OpenAI | [奥特曼与布罗克曼被指在OpenAI进行自我交易，涉嫌背叛马斯克](https://x.com/cb_doge/status/2051469347131183130) | X：cb_doge (@cb_doge) |  |
| 37 | 2026-06-08 | 产品发布/更新 | 1 | 人物:黄仁勋, 组织:英伟达 | [NVIDIA 与 KRAFTON、NC、T1 在韩国 PC 房庆祝 RTX Spark 发布](https://blogs.nvidia.com/blog/krafton-nc-t1-korea-gaming-pc-bang-rtx-spark) | NVIDIA AI Blog |  |
| 36 | 2026-06-15 | 技巧与观点 | 1 | 人物:Dario Amodei, 人物:黄仁勋, 组织:Anthropic, 组织:OpenAI | [Anthropic 上市前夕](https://x.com/xiaohu/status/2065991805238497732) | X：小互 (@xiaohu) |  |
| 36 | 2026-06-11 | 技巧与观点 | 1 | 人物:Dario Amodei, 组织:Anthropic | [Anthropic CEO Dario Amodei 发文呼吁缩小AI政策差距](https://x.com/AnthropicAI/status/2064783418844762489) | X：Anthropic (@AnthropicAI) |  |
| 36 | 2026-06-09 | 技巧与观点 | 1 | 人物:Sam Altman, 组织:OpenAI | [OpenAI计划到2028年由AI主导研究](https://x.com/rohanpaul_ai/status/2064096574142390755) | X：Rohan Paul (@rohanpaul_ai) |  |
| 36 | 2026-06-06 | 技巧与观点 | 1 | 人物:萨提亚·纳德拉, 组织:微软 | [微软CEO Satya Nadella最新访谈上线](https://x.com/swyx/status/2062854555562565741) | X：swyx (@swyx) |  |
| 36 | 2026-06-04 | 产品发布/更新 | 1 | 人物:黄仁勋, 组织:微软, 组织:英伟达 | [黄仁勋与纳德拉共议智能体AI时代](https://x.com/nvidia/status/2062228974273716457) | X：NVIDIA (@nvidia) |  |
| 36 | 2026-05-26 | 技巧与观点 | 1 | 人物:Chris Olah, 组织:Anthropic | [Anthropic联合创始人Chris Olah在教皇通谕发布会上的讲话](https://www.anthropic.com/news/chris-olah-pope-leo-encyclical) | Anthropic：Newsroom（网页） |  |
| 36 | 2026-05-18 | 技巧与观点 | 1 | 人物:Mustafa Suleyman, 组织:微软, 组织:微软AI | [微软AI CEO预测18个月内AI自动化所有白领工作](https://x.com/kimmonismus/status/2055952702908355012) | X：Kim (@kimmonismus) |  |
| 36 | 2026-05-16 | 技巧与观点 | 1 | 人物:黄仁勋, 组织:卡内基梅隆大学, 组织:英伟达 | [英伟达CEO称技工前景优于计算机科学毕业生](https://x.com/kimmonismus/status/2055403142913884288) | X：Kim (@kimmonismus) |  |
| 36 | 2026-05-15 | 技巧与观点 | 1 | 人物:杨植麟, 组织:月之暗面, 组织:Kimi | [Moonshot AI创始人杨植麟最近放出了一个40分钟视频](https://x.com/berryxia/status/2054733412846690443) | X：Berry Xia (@berryxia) |  |
| 36 | 2026-05-13 | 技巧与观点 | 1 | 人物:Andrej Karpathy, 组织:Kimi | [90%的人在白白浪费“Token”！](https://x.com/berryxia/status/2054339265103065156) | X：Berry Xia (@berryxia) |  |
| 36 | 2026-05-12 | 技巧与观点 | 1 | 人物:Sam Altman, 人物:Scott Wu, 组织:Cognition, 组织:Cognition AI, 组织:OpenAI | [传奇总部“Cog House”首度公开：天才创始人Scott Wu与Cognition AI的崛起之路](https://x.com/swyx/status/2053856676969890189) | X：swyx (@swyx) |  |
| 36 | 2026-05-08 | 技巧与观点 | 1 | 人物:Elon Musk, 人物:Mira Murati, 组织:微软, 组织:OpenAI | [OpenAI 政变之夜内部短信曝光：董事会为何执意赶走 Altman？](https://x.com/dotey/status/2052255174706479349) | X：宝玉 (@dotey) |  |
| 35 | 2026-06-19 | 产品发布/更新 | 1 | 人物:Greg Brockman, 组织:OpenAI | [OpenAI 联合多国医生：GPT-5.5 Instant 健康问答能力追平前沿 Thinking 模型](https://x.com/gdb/status/2067675030335668270) | X：Greg Brockman (@gdb) |  |
| 35 | 2026-06-10 | 行业动态 | 1 | 人物:Elon Musk, 组织:英伟达, 组织:SpaceX | [Elon Musk 详解 SpaceX AI1 轨道 AI 数据中心卫星方案](https://x.com/rohanpaul_ai/status/2064165951936094364) | X：Rohan Paul (@rohanpaul_ai) |  |
| 35 | 2026-06-10 | 产品发布/更新 | 1 | 人物:李飞飞, 组织:World Labs | [World Labs与Lore合作打造互动体验](https://x.com/drfeifei/status/2064387365930676695) | X：Fei-Fei Li (@drfeifei, World Labs) |  |
| 35 | 2026-06-01 | 产品发布/更新 | 1 | 人物:Sam Altman, 组织:OpenAI | [OpenAI发布生物防御AI工具Rosalind](https://x.com/sama/status/2061101875303530871) | X：Sam Altman (@sama) |  |
| 35 | 2026-05-30 | 模型发布/更新 | 1 | 人物:Greg Brockman, 组织:OpenAI | [OpenAI推出实时翻译模型，支持70+语言输入](https://x.com/gdb/status/2060452095279415725) | X：Greg Brockman (@gdb) |  |
| 35 | 2026-05-28 | 行业动态 | 1 | 人物:黄仁勋, 组织:AMD, 组织:英伟达 | [黄仁勋展示英伟达台湾新园区](https://x.com/rohanpaul_ai/status/2059689400267939925) | X：Rohan Paul (@rohanpaul_ai) |  |
| 35 | 2026-05-18 | 产品发布/更新 | 1 | 人物:Elon Musk, 组织:xAI | [Grok Imagine图像生成功能正式发布](https://x.com/elonmusk/status/2055912040481599793) | X：Elon Musk (@elonmusk, xAI) |  |
| 35 | 2026-05-09 | 产品发布/更新 | 1 | 人物:Elon Musk, 组织:xAI | [Grok 升级推出全平台连接器功能](https://x.com/elonmusk/status/2052856431611941200) | X：Elon Musk (@elonmusk, xAI) |  |

## P0：潜在新实体 / 新内容线索 Top 30（按事件去重）

| 优先级 | 日期 | 版块 | 重复数 | 候选词 | 标题 | 代表来源 | 其他来源 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 27 | 2026-06-18 | 产品发布/更新 | 1 | Wolfram, Mathematica, Version, ModelFit, DSolve | [Wolfram 语言和 Mathematica 15 版发布：内置 AI 助手、符号音乐等新功能](https://writings.stephenwolfram.com/2026/06/launching-version-15-of-wolfram-language-mathematica-built-in-useful-ai-lots-of-new-core-functionality) | Hacker News 热门（buzzing.cc 中文翻译） |  |
| 27 | 2026-06-17 | 模型发布/更新 | 1 | Qwen-RobotNav, Qwen, Qwen3-VL, SOTA, VLN-CE RxR | [Qwen-RobotNav：面向智能体导航系统的可扩展导航模型](https://qwen.ai/blog?id=qwen-robotnav) | Qwen：Blog Retrieval（API） |  |
| 27 | 2026-06-16 | 模型发布/更新 | 1 | DFlash, Spec V2 Z Lab, Modal, SGLang, Spec V2 | [下一代投机解码：DFlash 与 Spec V2](https://www.lmsys.org/blog/2026-06-15-next-generation-speculative-decoding-dflash-v2) | LMSYS：Blog（Chatbot Arena 团队） |  |
| 27 | 2026-06-11 | 产品发布/更新 | 1 | Apache Burr, Apache | [Apache Burr：构建可靠的人工智能代理和应用程序](https://burr.apache.org/) | Hacker News 热门（buzzing.cc 中文翻译） |  |
| 27 | 2026-05-21 | 模型发布/更新 | 1 | Qwen3.7, Qwen Studio | [Qwen3.7：智能体前沿](https://qwen.ai/blog?id=qwen3.7) | Qwen：Blog Retrieval（API） |  |
| 27 | 2026-05-18 | 产品发布/更新 | 1 | Zerostack, Rust, Unix, Hacker News | [Zerostack——一款采用纯Rust语言编写、受Unix启发的编程代理](https://crates.io/crates/zerostack/1.0.0) | Hacker News 热门（buzzing.cc 中文翻译） |  |
| 27 | 2026-05-14 | 产品发布/更新 | 1 | Introducing Runway Agent Runway, Runway Agent, Agent | [Introducing Runway Agent](https://runwayml.com/news/introducing-runway-agent) | Runway：News（网页） |  |
| 27 | 2026-05-07 | 产品发布/更新 | 1 | Show HN, Tilde.run, Hacker News | [Show HN: Tilde.run – 具备事务性和版本控制文件系统的代理沙箱](https://tilde.run/) | Hacker News 热门（buzzing.cc 中文翻译） |  |
| 27 | 2026-05-04 | 产品发布/更新 | 1 | Runway Characters, Runway, Characters, GWM-1 | [从单张图像构建实时视频智能体：Runway Characters技术解析](https://runwayml.com/news/building-runway-characters) | Runway：News（网页） |  |
| 26 | 2026-06-12 | 行业动态 | 1 | Runway, Lionsgate, Runway AI | [Runway与Lionsgate扩大战略合作](https://runwayml.com/news/runway-and-lionsgate-expand-partnership) | Runway：News（网页） |  |
| 26 | 2026-05-21 | 行业动态 | 1 |  | [欧盟委员会发布《欧盟人工智能法》高风险AI系统分类指导草案并开启公众咨询](https://www.dataguidance.com/news/eu-commission-publishes-draft-guidelines-classifying) | DataGuidance：Artificial Intelligence（网页） |  |
| 26 | 2026-05-09 | 行业动态 | 1 | Runway, Thorn, C2PA | [我们保护儿童安全的方法](https://runwayml.com/news/our-approach-to-child-safety) | Runway：News（网页） |  |
| 25 | 2026-06-19 | 产品发布/更新 | 1 | Claude Code | [Claude Code 现已支持 artifacts](https://claude.com/blog/artifacts-in-claude-code) | Claude：Blog（网页） |  |
| 25 | 2026-06-17 | 模型发布/更新 | 1 | Cartesia, Sonic, Ink, Artificial Analysis, Sonic 3.5 | [Cartesia 发布 Sonic 3.5 与 Ink 2 实时语音模型](https://x.com/testingcatalog/status/2066773392527655252) | X：Testing Catalog (@testingcatalog) |  |
| 25 | 2026-06-16 | 产品发布/更新 | 1 | OpenRouter, Gemma4, Darkbloom, Gemma, oss-20b | [OpenRouter新增免费模型gpt-oss-20b和Gemma4 26B](https://x.com/OpenRouter/status/2066585705581797616) | X：OpenRouter (@OpenRouter) |  |
| 25 | 2026-06-14 | 产品发布/更新 | 1 | Fusion API, Fable, Fusion | [Fusion API：半价达Fable级智能](https://x.com/OpenRouter/status/2065856853989270011) | X：OpenRouter (@OpenRouter) |  |
| 25 | 2026-06-12 | 产品发布/更新 | 1 | Krea, Krea 2 | [Krea 2 推出生成式滑块控制图像属性](https://x.com/krea_ai/status/2065086662166901114) | X：Krea AI (@krea_ai) |  |
| 25 | 2026-06-12 | 产品发布/更新 | 1 | OpenRouter | [OpenRouter 基准探索器：10项帕累托曲线](https://x.com/OpenRouter/status/2065094780271329729) | X：OpenRouter (@OpenRouter) |  |
| 25 | 2026-06-12 | 论文研究 | 1 |  | [研究模拟显示：LLM 在 95% 的模拟中会使用战术核武器](https://www.kennethpayne.uk/p/shall-we-play-a-game) | Hacker News 热门（buzzing.cc 中文翻译） |  |
| 25 | 2026-06-11 | 产品发布/更新 | 1 | OpenRouter, Activity, Fable | [OpenRouter 推出 Activity explorer 活动探索器](https://x.com/OpenRouter/status/2064730000956489889) | X：OpenRouter (@OpenRouter) |  |
| 25 | 2026-06-10 | 产品发布/更新 | 1 | Luma AI Ray3.2 API, Ray3.2 API | [Luma AI Ray3.2 API：电影级渲染可集成](https://x.com/LumaLabsAI/status/2064389582997897216) | X：Luma AI (@LumaLabsAI) |  |
| 25 | 2026-06-09 | 产品发布/更新 | 1 | Claude, Connector, Claude Code, Cowork, Team | [Claude 为 Connector 开发者推出性能监控仪表盘](https://claude.com/blog/observability-for-developers-building-connectors) | Claude：Blog（网页） |  |
| 25 | 2026-06-09 | 产品发布/更新 | 1 | Runway Aleph, Aleph, Web, Aleph 2.0 | [Runway Aleph 2.0 编辑模型：一键适配任意视频格式](https://x.com/runwayml/status/2064012425884569627) | X：Runway (@runwayml) |  |
| 25 | 2026-06-09 | 模型发布/更新 | 1 | VoxCPM2, OpenBMB, AudioVAE, TTS, SOTA | [VoxCPM2 技术报告发布](https://x.com/OpenBMB/status/2063991963133903317) | X：面壁智能 OpenBMB (@OpenBMB) |  |
| 25 | 2026-06-06 | 模型发布/更新 | 1 | Riverflow, OpenRouter, Sourceful, Fast, Pro | [Riverflow 2.5：可控制评分标准的图像模型](https://x.com/OpenRouter/status/2062944965978992935) | X：OpenRouter (@OpenRouter) |  |
| 25 | 2026-06-06 | 产品发布/更新 | 1 | MiniCPM-V, AccountingLLM, IPO, PDF, V 4.6 | [社区基于MiniCPM-V 4.6打造财务分析工具AccountingLLM](https://x.com/OpenBMB/status/2062889699056984281) | X：面壁智能 OpenBMB (@OpenBMB) |  |
| 25 | 2026-06-05 | 产品发布/更新 | 1 | NotebookLM | [NotebookLM 来源归属功能上线](https://x.com/NotebookLM/status/2062653124326863077) | X：NotebookLM (@NotebookLM) |  |
| 25 | 2026-06-04 | 模型发布/更新 | 1 | Grok Imagine, SpaceXAI, Imagine 1.5 | [Grok Imagine 1.5 预览版发布](https://x.com/cb_doge/status/2062242490745594085) | X：cb_doge (@cb_doge) |  |
| 25 | 2026-06-04 | 模型发布/更新 | 1 | Ideogram, JSON, Krea, v4.0 | [Ideogram v4.0 发布：2K 分辨率和 JSON 提示支持](https://x.com/krea_ai/status/2062227837130887567) | X：Krea AI (@krea_ai) |  |
| 25 | 2026-06-04 | 产品发布/更新 | 1 | NousResearch, Hermes Agent | [NousResearch 发布 Hermes Agent 桌面应用公测版](https://x.com/SiliconFlowAI/status/2062042813852995899) | X：硅基流动 SiliconFlow (@SiliconFlowAI) |  |

## P0：重复事件簇 Top 20

| 重复数 | 日期 | 版块 | 代表标题 | 来源 | 重复标题样例 |
| --- | --- | --- | --- | --- | --- |
| 2 | 2026-05-07, 2026-05-01 | 产品发布/更新 | [代理商现在可以创建 Cloudflare 账户、购买域名并进行部署](https://blog.cloudflare.com/agents-stripe-projects) | Hacker News 热门（buzzing.cc 中文翻译）, Cloudflare Blog | Agents 现可创建 Cloudflare 账户、购买域名并部署 |
| 2 | 2026-05-31, 2026-05-29 | 模型发布/更新 | [Nano Banana Pro与Nano Banana 2正式发布](https://x.com/googleaidevs/status/2060685345738375640) | X：Google AI for Developers (@googleaidevs) |  |
| 2 | 2026-05-10, 2026-05-09 | 论文研究 | [教克劳德“为什么”](https://www.anthropic.com/research/teaching-claude-why) | Hacker News 热门（buzzing.cc 中文翻译）, Anthropic：Research（发表成果 · 网页） | 教导Claude理解“为什么” |
| 2 | 2026-05-12, 2026-05-10 | 产品发布/更新, 模型发布/更新 | [HappyHorse AI视频引擎登陆阿里云](https://x.com/alibaba_cloud/status/2053646520998560033) | X：阿里云 / Alibaba Cloud (@alibaba_cloud) | HappyHorse上线阿里云，AI视频无需等待 |

## P1：一手 / X / GitHub 优先信源 Top 30

| 分数 | 信源 | 类型 | 条数 | 日期数 | 库内域名覆盖 | 建议动作 | 样例 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 166 | Anthropic：Newsroom（网页） | official | 30 | 25 | 13 | 已有信源，补抓新增条目 | [Anthropic Project Fetch 第二阶段：Claude Opus 4.7 自主完成任务，速度比人类团队快约20倍](https://www.anthropic.com/research/project-fetch-phase-two) |
| 157 | X：Kim (@kimmonismus) | x | 30 | 25 | 0 | 新增 X 账号候选源 | [Anthropic与DeepMind CEO呼吁G7组建AI联盟排除中国](https://x.com/kimmonismus/status/2067310431669223425) |
| 149 | X：Rohan Paul (@rohanpaul_ai) | x | 28 | 23 | 0 | 新增 X 账号候选源 | [AI 员工 Viktor 登陆 Microsoft Teams，年化收入达 2000 万美元](https://x.com/rohanpaul_ai/status/2067755504613613699) |
| 141 | X：Berry Xia (@berryxia) | x | 31 | 17 | 0 | 新增 X 账号候选源 | [mlx-vlm v0.6.3 发布，Day-0 支持 Google DeepMind DiffusionGemma 和 Cohere North Mini Code 1.0](https://x.com/berryxia/status/2064875107278098769) |
| 126 | Claude Code：GitHub Releases（RSS） | github | 26 | 21 | 1274 | 已有信源，补抓新增条目 | [Claude Code v2.1.178 发布](https://github.com/anthropics/claude-code/releases/tag/v2.1.178) |
| 119 | X：阿易 AI Notes (@AYi_AInotes) | x | 25 | 19 | 0 | 新增 X 账号候选源 | [Matt Pocock 开源 skills v1：将技能描述 Token 成本降低 63%](https://x.com/AYi_AInotes/status/2067327021005656135) |
| 117 | X：OpenRouter (@OpenRouter) | x | 28 | 23 | 0 | 新增 X 账号候选源 | [OpenRouter新增免费模型gpt-oss-20b和Gemma4 26B](https://x.com/OpenRouter/status/2066585705581797616) |
| 102 | X：阿里云 / Alibaba Cloud (@alibaba_cloud) | x | 18 | 12 | 0 | 新增 X 账号候选源 | [PolarDB-X Zero 上线：30秒全分布式数据库](https://x.com/alibaba_cloud/status/2062781182417490310) |
| 99 | Claude：Blog（网页） | official | 23 | 17 | 7 | 已有信源，补抓新增条目 | [Claude Code 现已支持 artifacts](https://claude.com/blog/artifacts-in-claude-code) |
| 99 | X：Vista (@vista8) | x | 20 | 17 | 0 | 新增 X 账号候选源 | [免费开源乔木画布：AI生图+抠图，一键部署Vercel](https://x.com/vista8/status/2067513484364140994) |
| 98 | X：OpenAI Developers (@OpenAIDevs) | x | 17 | 14 | 0 | 新增 X 账号候选源 | [Codex 推出浏览器开发者模式](https://x.com/OpenAIDevs/status/2065226355495895521) |
| 87 | X：Replit (@Replit) | x | 14 | 13 | 0 | 新增 X 账号候选源 | [Claude Design与Replit联动，设计变应用](https://x.com/Replit/status/2067328501003497684) |
| 84 | xAI：News（网页） | official | 13 | 11 | 0 | 新增官方/一手源候选 | [Grok 现集成 Databricks Agent Bricks](https://x.ai/news/grok-databricks) |
| 80 | X：宝玉 (@dotey) | x | 15 | 12 | 0 | 新增 X 账号候选源 | [baoyu-design 本地动画视频导出功能更新](https://x.com/dotey/status/2067039941960327204) |
| 75 | X：邵猛 (@shao__meng) | x | 14 | 13 | 0 | 新增 X 账号候选源 | [Spec 驱动开发（SDD）的三个 Skills：覆盖 Spec→Implement→Verify 闭环](https://x.com/shao__meng/status/2065234132431675439) |
| 73 | X：商汤 SenseTime (@SenseTime_AI) | x | 11 | 11 | 0 | 新增 X 账号候选源 | [商汤开源SenseNova-Skills AI办公技能套件](https://x.com/SenseTime_AI/status/2061822148076093625) |
| 72 | X：腾讯混元 (@TencentHunyuan) | x | 10 | 10 | 0 | 新增 X 账号候选源 | [腾讯混元联合多家机构发布首个音频编辑基准MMAE](https://x.com/TencentHunyuan/status/2063862263434613237) |
| 70 | X：Microsoft Research (@MSFTResearch) | x | 10 | 10 | 0 | 新增 X 账号候选源 | [微软Project Mosaic：micro-LED光学互连技术](https://x.com/MSFTResearch/status/2062983588606320714) |
| 66 | Cloudflare Blog | official | 9 | 9 | 0 | 新增官方/一手源候选 | [Cloudflare 发布多阶段漏洞发现工具，详解对抗性审查与上下文绕过技术](https://blog.cloudflare.com/build-your-own-vulnerability-harness) |
| 66 | X：OpenAI (@OpenAI) | x | 9 | 8 | 0 | 新增 X 账号候选源 | [OpenAI Codex 推出速率重置攒存功能](https://x.com/OpenAI/status/2065225362544726371) |
| 64 | X：Google AI for Developers (@googleaidevs) | x | 9 | 8 | 0 | 新增 X 账号候选源 | [Google Magenta RealTime 2 (MRT2) 实时音乐模型发布](https://x.com/googleaidevs/status/2062603374789263646) |
| 64 | X：MiniMax (@MiniMax_AI) | x | 9 | 8 | 0 | 新增 X 账号候选源 | [MiniMax M3 开源权重模型发布，已上架 HuggingFace](https://x.com/MiniMax_AI/status/2065436935188058208) |
| 63 | X：Perplexity (@perplexity_ai) | x | 9 | 9 | 0 | 新增 X 账号候选源 | [Perplexity Computer 集成 Deep Research](https://x.com/perplexity_ai/status/2065124930463916317) |
| 60 | GitHub Blog | official | 8 | 7 | 0 | 新增官方/一手源候选 | [GitHub 发布新开源数据集，加速多语言 AI 研究与开发](https://github.blog/ai-and-ml/llms/accelerating-researchers-and-developers-building-multilingual-ai-with-a-new-open-dataset) |
| 59 | X：小互 (@xiaohu) | x | 11 | 11 | 0 | 新增 X 账号候选源 | [Anthropic 上市前夕](https://x.com/xiaohu/status/2065991805238497732) |
| 55 | X：Greg Brockman (@gdb) | x | 8 | 7 | 40 | 已有信源，补抓新增条目 | [OpenAI 联合多国医生：GPT-5.5 Instant 健康问答能力追平前沿 Thinking 模型](https://x.com/gdb/status/2067675030335668270) |
| 55 | X：xAI (@xai) | x | 8 | 7 | 0 | 新增 X 账号候选源 | [Grok TTS 盲测人类感得分96登顶](https://x.com/xai/status/2067654108123910495) |
| 54 | X：Claude Devs (@ClaudeDevs) | x | 10 | 8 | 0 | 新增 X 账号候选源 | [Claude Code GA一周年回顾：验证与自动模式](https://x.com/ClaudeDevs/status/2064032814392352816) |
| 53 | X：Gemini (@GeminiApp) | x | 11 | 9 | 0 | 新增 X 账号候选源 | [Gemini Live 支持实时创建编辑图像](https://x.com/GeminiApp/status/2062936486509785385) |

## P1：全量可沉淀信源 Top 30

| 分数 | 信源 | 类型 | 条数 | 日期数 | 版块 | 库内域名覆盖 | 建议动作 | 样例 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 356 | IT之家（RSS） | rss | 86 | 41 | 行业动态:50, 技巧与观点:13, 产品发布/更新:11, 模型发布/更新:9 | 1 | 已有信源，补抓新增条目 | [DeepSeek 识图模式正式上线 App 和网页端](https://www.ithome.com/0/966/066.htm) |
| 193 | OpenAI：官网动态（RSS · 排除企业/客户案例） | rss | 38 | 28 | 行业动态:18, 论文研究:6, 技巧与观点:6, 产品发布/更新:5 | 74 | 已有信源，补抓新增条目 | [GPT-5.5 Instant提升ChatGPT健康智能](https://openai.com/index/improving-health-intelligence-in-chatgpt) |
| 166 | Hugging Face：Blog（RSS） | rss | 35 | 21 | 技巧与观点:15, 模型发布/更新:10, 论文研究:5, 产品发布/更新:5 | 32 | 已有信源，补抓新增条目 | [MosaicLeaks: 你的研究智能体能保守秘密吗？](https://huggingface.co/blog/ServiceNow/mosaicleaks) |
| 166 | Anthropic：Newsroom（网页） | official | 30 | 25 | 行业动态:11, 论文研究:9, 技巧与观点:4, 产品发布/更新:4 | 13 | 已有信源，补抓新增条目 | [Anthropic Project Fetch 第二阶段：Claude Opus 4.7 自主完成任务，速度比人类团队快约20倍](https://www.anthropic.com/research/project-fetch-phase-two) |
| 157 | X：Kim (@kimmonismus) | x | 30 | 25 | 行业动态:13, 技巧与观点:8, 模型发布/更新:4, 产品发布/更新:4 | 0 | 新增 X 账号候选源 | [Anthropic与DeepMind CEO呼吁G7组建AI联盟排除中国](https://x.com/kimmonismus/status/2067310431669223425) |
| 149 | X：Rohan Paul (@rohanpaul_ai) | x | 28 | 23 | 行业动态:12, 技巧与观点:8, 论文研究:5, 产品发布/更新:2 | 0 | 新增 X 账号候选源 | [AI 员工 Viktor 登陆 Microsoft Teams，年化收入达 2000 万美元](https://x.com/rohanpaul_ai/status/2067755504613613699) |
| 141 | X：Berry Xia (@berryxia) | x | 31 | 17 | 技巧与观点:20, 产品发布/更新:5, 论文研究:4, 模型发布/更新:1 | 0 | 新增 X 账号候选源 | [mlx-vlm v0.6.3 发布，Day-0 支持 Google DeepMind DiffusionGemma 和 Cohere North Mini Code 1.0](https://x.com/berryxia/status/2064875107278098769) |
| 126 | Claude Code：GitHub Releases（RSS） | github | 26 | 21 | 产品发布/更新:17, 技巧与观点:8, 论文研究:1 | 1274 | 已有信源，补抓新增条目 | [Claude Code v2.1.178 发布](https://github.com/anthropics/claude-code/releases/tag/v2.1.178) |
| 119 | X：阿易 AI Notes (@AYi_AInotes) | x | 25 | 19 | 技巧与观点:22, 行业动态:2, 产品发布/更新:1 | 0 | 新增 X 账号候选源 | [Matt Pocock 开源 skills v1：将技能描述 Token 成本降低 63%](https://x.com/AYi_AInotes/status/2067327021005656135) |
| 117 | X：OpenRouter (@OpenRouter) | x | 28 | 23 | 产品发布/更新:14, 技巧与观点:5, 行业动态:5, 模型发布/更新:4 | 0 | 新增 X 账号候选源 | [OpenRouter新增免费模型gpt-oss-20b和Gemma4 26B](https://x.com/OpenRouter/status/2066585705581797616) |
| 102 | X：阿里云 / Alibaba Cloud (@alibaba_cloud) | x | 18 | 12 | 产品发布/更新:7, 行业动态:7, 模型发布/更新:4 | 0 | 新增 X 账号候选源 | [PolarDB-X Zero 上线：30秒全分布式数据库](https://x.com/alibaba_cloud/status/2062781182417490310) |
| 99 | Claude：Blog（网页） | official | 23 | 17 | 产品发布/更新:11, 技巧与观点:11, 行业动态:1 | 7 | 已有信源，补抓新增条目 | [Claude Code 现已支持 artifacts](https://claude.com/blog/artifacts-in-claude-code) |
| 99 | Bloomberg：Technology（RSS） | rss | 20 | 14 | 行业动态:18, 技巧与观点:2 | 32 | 已有信源，补抓新增条目 | [Anthropic 秘密申请上市，估值 9650 亿美元](https://www.bloomberg.com/news/articles/2026-06-13/global-capitalism-bets-it-all-on-ai-future-that-alarms-voters) |
| 99 | X：Vista (@vista8) | x | 20 | 17 | 技巧与观点:18, 产品发布/更新:2 | 0 | 新增 X 账号候选源 | [免费开源乔木画布：AI生图+抠图，一键部署Vercel](https://x.com/vista8/status/2067513484364140994) |
| 98 | X：OpenAI Developers (@OpenAIDevs) | x | 17 | 14 | 产品发布/更新:14, 技巧与观点:3 | 0 | 新增 X 账号候选源 | [Codex 推出浏览器开发者模式](https://x.com/OpenAIDevs/status/2065226355495895521) |
| 96 | TechCrunch：AI（RSS） | rss | 20 | 13 | 行业动态:12, 产品发布/更新:5, 技巧与观点:3 | 44 | 已有信源，补抓新增条目 | [OpenAI IPO前连下两城：招揽Transformer共同作者及前白宫AI政策官员](https://techcrunch.com/2026/06/18/openai-is-bringing-on-some-big-guns-in-the-lead-up-to-its-ipo) |
| 87 | X：Replit (@Replit) | x | 14 | 13 | 产品发布/更新:10, 技巧与观点:3, 行业动态:1 | 0 | 新增 X 账号候选源 | [Claude Design与Replit联动，设计变应用](https://x.com/Replit/status/2067328501003497684) |
| 84 | xAI：News（网页） | official | 13 | 11 | 产品发布/更新:7, 行业动态:3, 模型发布/更新:3 | 0 | 新增官方/一手源候选 | [Grok 现集成 Databricks Agent Bricks](https://x.ai/news/grok-databricks) |
| 83 | Apple Machine Learning Research（RSS） | rss | 15 | 10 | 论文研究:12, 行业动态:2, 模型发布/更新:1 | 0 | 新增外部信源候选 | [苹果发布第三代 Apple Foundation Models（AFM）](https://machinelearning.apple.com/research/introducing-third-generation-of-apple-foundation-models) |
| 82 | 公众号：火山引擎 | web | 18 | 9 | 产品发布/更新:7, 模型发布/更新:5, 行业动态:3, 技巧与观点:2 | 9 | 已有信源，补抓新增条目 | [首个统一科学大模型 LOGOS 正式开源](https://mp.weixin.qq.com/s/50q5uY849FKnBzk1Q04MRg) |
| 80 | X：宝玉 (@dotey) | x | 15 | 12 | 技巧与观点:13, 行业动态:1, 产品发布/更新:1 | 0 | 新增 X 账号候选源 | [baoyu-design 本地动画视频导出功能更新](https://x.com/dotey/status/2067039941960327204) |
| 75 | Gary Marcus：The Road to AI We Can Trust（RSS） | rss | 17 | 16 | 技巧与观点:16, 行业动态:1 | 2 | 已有信源，补抓新增条目 | [埃森哲：昔日与今朝，以及它如何预示未来](https://garymarcus.substack.com/p/accenture-then-and-now-and-how-it) |
| 75 | X：邵猛 (@shao__meng) | x | 14 | 13 | 技巧与观点:11, 产品发布/更新:3 | 0 | 新增 X 账号候选源 | [Spec 驱动开发（SDD）的三个 Skills：覆盖 Spec→Implement→Verify 闭环](https://x.com/shao__meng/status/2065234132431675439) |
| 73 | X：商汤 SenseTime (@SenseTime_AI) | x | 11 | 11 | 模型发布/更新:8, 技巧与观点:2, 行业动态:1 | 0 | 新增 X 账号候选源 | [商汤开源SenseNova-Skills AI办公技能套件](https://x.com/SenseTime_AI/status/2061822148076093625) |
| 72 | X：腾讯混元 (@TencentHunyuan) | x | 10 | 10 | 模型发布/更新:4, 论文研究:2, 行业动态:2, 技巧与观点:1 | 0 | 新增 X 账号候选源 | [腾讯混元联合多家机构发布首个音频编辑基准MMAE](https://x.com/TencentHunyuan/status/2063862263434613237) |
| 70 | X：Microsoft Research (@MSFTResearch) | x | 10 | 10 | 论文研究:6, 行业动态:2, 技巧与观点:1, 模型发布/更新:1 | 0 | 新增 X 账号候选源 | [微软Project Mosaic：micro-LED光学互连技术](https://x.com/MSFTResearch/status/2062983588606320714) |
| 67 | The Verge：AI（RSS） | rss | 13 | 12 | 行业动态:6, 技巧与观点:4, 产品发布/更新:2, 模型发布/更新:1 | 29 | 已有信源，补抓新增条目 | [Skydio CEO Adam Bry：硅谷不应为无人机使用画红线](https://www.theverge.com/podcast/949195/skydio-ceo-adam-bry-autonmous-drones-china-red-lines-military) |
| 66 | The Decoder：AI News（RSS） | rss | 12 | 11 | 行业动态:9, 论文研究:2, 产品发布/更新:1 | 8 | 已有信源，补抓新增条目 | [Adobe 为 Photoshop、Premiere 等多款 Creative Cloud 应用加入 AI 智能体](https://the-decoder.com/adobe-adds-ai-agents-to-photoshop-premiere-and-more-creative-cloud-apps) |
| 66 | Cloudflare Blog | official | 9 | 9 | 产品发布/更新:5, 技巧与观点:2, 行业动态:2 | 0 | 新增官方/一手源候选 | [Cloudflare 发布多阶段漏洞发现工具，详解对抗性审查与上下文绕过技术](https://blog.cloudflare.com/build-your-own-vulnerability-harness) |
| 66 | X：OpenAI (@OpenAI) | x | 9 | 8 | 产品发布/更新:5, 技巧与观点:1, 论文研究:1, 行业动态:1 | 0 | 新增 X 账号候选源 | [OpenAI Codex 推出速率重置攒存功能](https://x.com/OpenAI/status/2065225362544726371) |

## 可复跑命令

```bash
pnpm audit:aihot -- --take=50
```

## 口径

- 精确覆盖：AI HOT `sourceUrl` 与本库 RawPoolItem / ActivityEvent / Card / QAAuditLog / Course / PersonRelation 等 URL 标准化后相同。
- 库内疑似同事件：AI HOT 事件簇与本库已有内容标题共享具体产品/模型/事件词，并达到保守的标题 token 重叠阈值；这类不自动吸收，只进人工复核。
- 已知实体命中：标题、摘要或来源名中出现本库 People 名称/别名，或 Organization / People.organization 名称。
- 事件去重：同 URL 直接归一；不同 URL 需在 3 天内共享人物/组织和具体产品/模型/事件词，避免中英文转述、媒体稿和 X 转述重复进入 P0。
- 信源覆盖：按域名或 X handle 归一；`CompanySource` / `KnowledgeSource` 当前库里不存在，所以未计入。
- 输出是候选审计，不自动入库。
