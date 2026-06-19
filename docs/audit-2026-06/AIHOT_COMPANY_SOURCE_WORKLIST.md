# AI HOT 公司属性源 Worklist

生成时间：2026-06-19T01:15:43.220Z
目标模型：CompanySource
模式：只生成候选，不写正式库。

## 结论

- CompanySource 候选行：463
- 公司维度候选：22
- 公司自有信源候选：21
- 非公司属性源拦截样例：80
- 缺 organizationId 的候选：68
- 去重冲突组：0

## 去重键

`canonicalUrl + urlHash + organizationId + role + titleHash/eventHash`。

## 公司维度 Top 20

| 公司 | 动作 | 候选行 | 新事件 | 源归属事件 | 角色 | 主要源 |
| --- | --- | ---: | ---: | ---: | --- | --- |
| Anthropic | 补公司属性源 | 70 | 237 | 84 | product_release:72, technical_thread_link:48, hiring_team_signal:34 | anthropic.com:30, claude.com:22, ithome.com:17 |
| OpenAI | 补公司属性源 | 66 | 177 | 79 | product_release:62, technical_thread_link:33, financial_signal:28 | openai.com:38, ithome.com:20, x:openaidevs:17 |
| 谷歌 | 补公司属性源 | 47 | 132 | 60 | product_release:62, technical_thread_link:25, partnership_signal:17 | ithome.com:14, x:geminiapp:11, developers.googleblog.com:10 |
| Hugging Face | 补公司属性源 | 35 | 42 | 35 | product_release:17, technical_thread_link:17, hiring_team_signal:5 | huggingface.co:35, x:sensetime_ai:4, x:alibaba_cloud:1 |
| 微软 | 补公司属性源 | 10 | 51 | 13 | technical_thread_link:15, partnership_signal:12, product_release:9 | x:msftresearch:10, ithome.com:5, anthropic.com:3 |
| Alibaba DAMO Academy | 补公司属性源 | 27 | 37 | 26 | product_release:22, technical_thread_link:7, hiring_team_signal:5 | x:alibaba_cloud:18, qwen.ai:6, huggingface.co:4 |
| xAI | 补公司属性源 | 21 | 39 | 21 | product_release:21, technical_thread_link:7, hiring_team_signal:4 | x.ai:13, x:xai:8, x:cb_doge:4 |
| 英伟达 | 补公司属性源 | 14 | 42 | 14 | technical_thread_link:12, partnership_signal:9, hiring_team_signal:7 | blogs.nvidia.com:5, ithome.com:5, x:nvidiaai:5 |
| 苹果公司 | 补公司属性源 | 19 | 29 | 21 | technical_thread_link:10, hiring_team_signal:8, product_release:8 | machinelearning.apple.com:15, apple.com:5, x:berryxia:2 |
| 杭州深度求索人工智能基础技术研究有限公司（深度求索 / DeepSeek） | 补公司属性源 | 1 | 34 | 4 | product_release:15, technical_thread_link:8, financial_signal:6 | ithome.com:4, github.com:3, x:openrouter:3 |
| 腾讯 | 补公司属性源 | 11 | 21 | 11 | technical_thread_link:7, financial_signal:5, product_release:5 | x:tencenthunyuan:10, ithome.com:6, mp.weixin.qq.com:2 |
| MiniMax | 补公司属性源 | 12 | 16 | 12 | product_release:6, technical_thread_link:4, hiring_team_signal:3 | x:minimax_ai:9, mp.weixin.qq.com:2, lmsys.org:1 |
| Meta | 补公司属性源 | 1 | 21 | 2 | product_release:11, technical_thread_link:3, financial_signal:2 | ithome.com:5, techcrunch.com:4, x:ayi_ainotes:2 |
| 商汤科技 | 补公司属性源 | 11 | 11 | 11 | product_release:5, technical_thread_link:4, financial_signal:1 | x:sensetime_ai:11 |
| Cloudflare | 补公司属性源 | 8 | 12 | 9 | product_release:5, hiring_team_signal:2, official_strategy:2 | blog.cloudflare.com:9, anthropic.com:1, wsj.com:1 |
| 亚马逊 | 补公司属性源 | 0 | 15 | 3 | technical_thread_link:4, financial_signal:3, partnership_signal:3 | ithome.com:3, claude.com:2, x:kling_ai:2 |
| Perplexity | 补公司属性源 | 9 | 9 | 9 | technical_thread_link:5, product_release:3, hiring_team_signal:1 | x:perplexity_ai:9 |
| 百度 | 补公司属性源 | 6 | 6 | 6 | product_release:3, official_strategy:1, partnership_signal:1 | x:baidu_inc:5, mp.weixin.qq.com:1 |
| 阶跃星辰 | 补公司属性源 | 6 | 6 | 6 | product_release:3, technical_thread_link:3 | x:stepfun_ai:5, mp.weixin.qq.com:1 |
| 华为云 | 补公司属性源 | 1 | 7 | 1 | product_release:3, technical_thread_link:3, financial_signal:1 | ithome.com:4, the-decoder.com:1, x:huaweicloud1:1 |

## 公司自有信源 Top 20

| 信源 | Owner | 类型 | 建议 | 新事件 | 角色 |
| --- | --- | --- | --- | ---: | --- |
| OpenAI：官网动态（RSS · 排除企业/客户案例） | OpenAI | official | 沉淀为公司属性源 | 38 | technical_thread_link:13, product_release:11, partnership_signal:9 |
| Hugging Face：Blog（RSS） | Hugging Face | rss | 沉淀为公司属性源 | 35 | technical_thread_link:16, product_release:12, hiring_team_signal:4 |
| Anthropic：Newsroom（网页） | Anthropic | official | 沉淀为公司属性源 | 29 | technical_thread_link:11, partnership_signal:11, hiring_team_signal:4 |
| Claude Code：GitHub Releases（RSS） | Anthropic | github | 沉淀为公司属性源 | 26 | product_release:17, technical_thread_link:5, hiring_team_signal:2 |
| Claude：Blog（网页） | Anthropic | official | 沉淀为公司属性源 | 22 | hiring_team_signal:10, product_release:4, technical_thread_link:4 |
| X：OpenAI Developers (@OpenAIDevs) | OpenAI | x | 沉淀为公司属性源 | 17 | product_release:13, hiring_team_signal:2, official_strategy:2 |
| X：阿里云 / Alibaba Cloud (@alibaba_cloud) | Alibaba DAMO Academy | x | 沉淀为公司属性源 | 17 | product_release:11, hiring_team_signal:2, partnership_signal:2 |
| Apple Machine Learning Research（RSS） | 苹果公司 | rss | 沉淀为公司属性源 | 15 | hiring_team_signal:7, technical_thread_link:7, partnership_signal:1 |
| xAI：News（网页） | xAI | official | 沉淀为公司属性源 | 13 | product_release:6, technical_thread_link:3, hiring_team_signal:2 |
| X：Microsoft Research (@MSFTResearch) | 微软 | x | 沉淀为公司属性源 | 10 | technical_thread_link:9, hiring_team_signal:1 |
| X：OpenAI (@OpenAI) | OpenAI | x | 沉淀为公司属性源 | 9 | product_release:5, technical_thread_link:3, financial_signal:1 |
| Google Developers Blog（RSS） | 谷歌 | rss | 沉淀为公司属性源 | 10 | product_release:4, technical_thread_link:3, hiring_team_signal:2 |
| X：Google AI for Developers (@googleaidevs) | 谷歌 | x | 沉淀为公司属性源 | 8 | product_release:6, partnership_signal:2, official_strategy:1 |
| X：Gemini (@GeminiApp) | 谷歌 | x | 沉淀为公司属性源 | 11 | product_release:9, technical_thread_link:1, official_strategy:1 |
| X：OpenRouter (@OpenRouter) | OpenRouter | x | 沉淀为公司属性源 | 28 | product_release:15, technical_thread_link:6, official_strategy:4 |
| X：Replit (@Replit) | Replit | x | 沉淀为公司属性源 | 14 | product_release:7, partnership_signal:2, hiring_team_signal:2 |
| X：商汤 SenseTime (@SenseTime_AI) | 商汤科技 | x | 沉淀为公司属性源 | 11 | product_release:5, technical_thread_link:4, hiring_team_signal:1 |
| X：腾讯混元 (@TencentHunyuan) | 腾讯 | x | 沉淀为公司属性源 | 10 | technical_thread_link:5, product_release:3, partnership_signal:1 |
| X：Perplexity (@perplexity_ai) | Perplexity | x | 沉淀为公司属性源 | 9 | technical_thread_link:5, product_release:3, hiring_team_signal:1 |
| X：MiniMax (@MiniMax_AI) | MiniMax | x | 沉淀为公司属性源 | 9 | product_release:5, technical_thread_link:1, partnership_signal:1 |

## CompanySource 候选 Top 40

| 日期 | 公司 | 角色 | 类型 | 标题 | 去重键片段 |
| --- | --- | --- | --- | --- | --- |
| 2026-05-27 | Alibaba DAMO Academy | product_release | x | [阿里云CTO阐述从云原生到智能体原生转型](https://x.com/alibaba_cloud/status/2059174528786268669) | 2f050a47 / a2fbe767a2774051 |
| 2026-06-08 | 英伟达 | partnership_signal | official | [NVIDIA 与 KRAFTON、NC、T1 在韩国 PC 房庆祝 RTX Spark 发布](https://blogs.nvidia.com/blog/krafton-nc-t1-korea-gaming-pc-bang-rtx-spark) | 03de06ba / 38640bd877f8c419 |
| 2026-06-11 | Anthropic | technical_thread_link | x | [Anthropic CEO Dario Amodei 发文呼吁缩小AI政策差距](https://x.com/AnthropicAI/status/2064783418844762489) | ff61c0ef / fde69c8d33f2e154 |
| 2026-06-04 | 英伟达 | product_release | x | [黄仁勋与纳德拉共议智能体AI时代](https://x.com/nvidia/status/2062228974273716457) | 998b2388 / 99fd85a226b7e705 |
| 2026-05-26 | Anthropic | technical_thread_link | official | [Anthropic联合创始人Chris Olah在教皇通谕发布会上的讲话](https://www.anthropic.com/news/chris-olah-pope-leo-encyclical) | d80db832 / d9d990489fef67db |
| 2026-06-18 | xAI | technical_thread_link | official | [Grok 4.3 在 Amazon Bedrock 正式可用](https://x.ai/news/grok-amazon-bedrock) | 91340a05 / 0af85eb145f581b7 |
| 2026-06-17 | Alibaba DAMO Academy | product_release | official | [Qwen-RobotManip：对齐解锁机器人操作基础模型的规模化能力](https://qwen.ai/blog?id=qwen-robotmanip) | 3caabb4a / 04fbb04c81141b0c |
| 2026-06-17 | xAI | technical_thread_link | official | [Grok for PowerPoint 发布：在 Microsoft PowerPoint 内直接生成和编辑幻灯片](https://x.ai/news/introducing-powerpoint-addin) | 6a713714 / b0b7bd6a4dcccb96 |
| 2026-06-16 | xAI | product_release | official | [Grok Build 推出 Agent Dashboard 管理多个编码会话](https://x.ai/news/agent-dashboard) | ceb6aac7 / 96c51262b9967244 |
| 2026-06-02 | xAI | product_release | official | [xAI发布Composer 2.5](https://x.ai/news/composer-2-5) | 9136a0e7 / 701ac96f92b5bf3c |
| 2026-05-29 | xAI | product_release | official | [Grok Build 0.1 on API](https://x.ai/news/grok-build-0-1) | c60c4a6b / e5ee2ed4932dc0a2 |
| 2026-05-16 | xAI | technical_thread_link | official | [将Grok接入Hermes智能体](https://x.ai/news/grok-hermes) | f10d936a / 94dd8947acf6ce8c |
| 2026-05-15 | xAI | product_release | official | [xAI 推出 Grok Build 早期测试版](https://x.ai/news/grok-build-cli) | 7c9e6db4 / 8b097cf7a0a57109 |
| 2026-05-07 | xAI | hiring_team_signal | official | [Grok Imagine API 推出“Quality Mode”图像生成与编辑功能](https://x.ai/news/grok-imagine-quality-mode) | 66179aed / b071ac64e5c3c0b7 |
| 2026-05-07 | xAI | product_release | official | [Grok Web 正式推出 Connectors 功能，实现与日常应用深度集成](https://x.ai/news/grok-connectors) | b72f345c / c254add514157be1 |
| 2026-05-01 | xAI | hiring_team_signal | official | [自定义语音与语音库](https://x.ai/news/grok-custom-voices) | bdc3ad0f / 48641d13003e8059 |
| 2026-06-19 | xAI | partnership_signal | official | [Grok 现集成 Databricks Agent Bricks](https://x.ai/news/grok-databricks) | c7dd7ee5 / c53e30dc29934bf3 |
| 2026-06-16 | xAI | product_release | official | [xAI 宣布 Grok 集成至 Warp 终端开发环境](https://x.ai/news/grok-warp) | 285d752e / 157301bbf806cbee |
| 2026-06-11 | xAI | partnership_signal | official | [eToro AI 智能体 Tori 集成 SpaceXAI 文本模型实现实时市场情绪分析](https://x.ai/news/grok-etoro) | f0962c3b / 594cc8810d2bffc4 |
| 2026-06-19 | xAI | product_release | x | [Grok TTS 盲测人类感得分96登顶](https://x.com/xai/status/2067654108123910495) | 99bfd46f / c0de63d860c2bd2f |
| 2026-06-18 | Anthropic | hiring_team_signal | official | [Claude Design 更新：跨项目保持品牌一致，与Claude Code协同](https://claude.com/blog/claude-design-stays-on-brand-for-daily-work) | 9b47ed4b / ba63e8670915e8a0 |
| 2026-06-13 | OpenAI | product_release | x | [Codex 推出浏览器开发者模式](https://x.com/OpenAIDevs/status/2065226355495895521) | a8a23dfe / 2185bae1cc8c9049 |
| 2026-06-13 | OpenAI | product_release | x | [OpenAI Codex 推出速率重置攒存功能](https://x.com/OpenAI/status/2065225362544726371) | ed5e7818 / 1d7bbc90f770b8cd |
| 2026-06-10 | Anthropic | technical_thread_link | official | [Claude Fable 5 和 Claude Mythos 5](https://www.anthropic.com/news/claude-fable-5-mythos-5) | c4349107 / 94e296f550dff68a |
| 2026-06-10 | 谷歌 | product_release | x | [Gemini 3.5 Live Translate 发布](https://x.com/GoogleDeepMind/status/2064366504745828689) | cc2d14a3 / d6114b931d729051 |
| 2026-06-06 | 谷歌 | product_release | x | [Google AI 本周产品更新：Nano Banana 2、Co-Scientist、dreambeans、Gemma 4 等](https://x.com/GoogleAI/status/2062942864288387430) | 40068099 / 9ee34566f4130316 |
| 2026-06-05 | OpenAI | product_release | x | [Codex 推出 iOS 应用构建插件](https://x.com/OpenAIDevs/status/2062599291479478275) | 39f7e473 / 198ec30c5e17c58d |
| 2026-06-05 | 谷歌 | product_release | x | [Google Magenta RealTime 2 (MRT2) 实时音乐模型发布](https://x.com/googleaidevs/status/2062603374789263646) | 6e4b178b / 7af06cc1ab1ba855 |
| 2026-06-04 | xAI | product_release | x | [Grok模型登陆Cloudflare AI Gateway](https://x.com/xai/status/2062294202625696081) | be945ea4 / 4b1cf4085ac31db5 |
| 2026-06-04 | xAI | product_release | x | [xAI Grok语音模型上线Vapi平台](https://x.com/xai/status/2062209374039499178) | 26ceb96b / 862d60bb8e65709e |
| 2026-06-04 | 英伟达 | technical_thread_link | x | [OpenShell v0.0.55 发布：新增 Vertex AI 推理支持](https://x.com/NVIDIAAI/status/2062210034109677665) | c497f1fa / efce3898eb67b536 |
| 2026-06-03 | 谷歌 | product_release | x | [Google DeepMind 开源科学智能体工具包](https://x.com/googleaidevs/status/2061924472245153863) | 99f66dbf / ee92a4255c41d673 |
| 2026-06-02 | 英伟达 | product_release | x | [Nemotron 3 Ultra 本周即将发布](https://x.com/NVIDIAAI/status/2061305524700758050) | 37f16d31 / 1a17ac77989bea17 |
| 2026-05-31 | 英伟达 | hiring_team_signal | x | [DynoSim：模拟驱动推理堆栈优化](https://x.com/NVIDIAAI/status/2060781385686659416) | b21401c8 / f94b12c1e849eabb |
| 2026-05-31 | 谷歌 | product_release | x | [Nano Banana Pro与Nano Banana 2正式发布](https://x.com/googleaidevs/status/2060685345738375640) | db50bb46 / 025cfb042adaeefd |
| 2026-05-29 | Alibaba DAMO Academy | hiring_team_signal | x | [MuleRun登陆阿里云市场，提供全天候AI劳动力](https://x.com/alibaba_cloud/status/2059821825140367565) | 9e0f9702 / 6753528ed7e99ad8 |
| 2026-05-29 | Anthropic | hiring_team_signal | official | [在Claude Code中引入动态工作流](https://claude.com/blog/introducing-dynamic-workflows-in-claude-code) | cdc1ceeb / 7451bd6962ba22c4 |
| 2026-05-29 | Anthropic | technical_thread_link | official | [Claude Opus 4.8 发布：在编码、智能体技能与推理方面实现全面升级](https://www.anthropic.com/news/claude-opus-4-8) | 0bd12818 / 8aeee400adc88496 |
| 2026-05-29 | 谷歌 | product_release | x | [Nano Banana Pro与Nano Banana 2正式发布](https://x.com/googleaidevs/status/2060049962356916377) | 3a239051 / c92eba4cd11fb660 |
| 2026-05-28 | OpenAI | hiring_team_signal | x | [OpenAI产品支持私有MCP服务器安全连接](https://x.com/OpenAIDevs/status/2059703536825565499) | 2ba8eb2c / 34a3867f09c5833c |

## 拦截口径

- `discovery_only_source`：只做发现源，回抓原始来源后再判断。
- `standalone_signal_source`：独立或个人 X 信号源，不写 CompanySource。
- `candidate_content_source`：内容源候选，先走 KnowledgeSource 或源复核。
