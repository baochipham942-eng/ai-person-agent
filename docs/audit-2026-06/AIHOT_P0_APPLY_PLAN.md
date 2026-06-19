# AI HOT P0 Apply Plan

Generated: 2026-06-19T01:55:06.361Z

## Scope

- Mode: read-only apply plan; no business database writes.
- CompanySource P0 only uses existing Organization rows and company-owned source evidence.
- New companies, new people, X/social-only evidence, media/curator evidence, and semantic duplicates stay review-only.

## Summary

- P0 CompanySource ready: 36
- P0 existing people ready: 2
- Eligible CompanySource backlog: 80
- Blocked company examples in report: 80
- Existing people review examples in report: 38
- Candidate review-only items: 60

### Company Ready By Organization

| Organization | Count |
| --- | --- |
| Alibaba DAMO Academy | 4 |
| Anthropic | 4 |
| xAI | 4 |
| 英伟达 | 4 |
| Cloudflare | 3 |
| Hugging Face | 3 |
| Mistral AI | 3 |
| OpenAI | 3 |
| 苹果公司 | 3 |
| 谷歌 | 3 |
| MiniMax | 1 |
| 杭州深度求索人工智能基础技术研究有限公司（深度求索 / DeepSeek） | 1 |

### Company Ready By Source Kind

| Source Kind | Count |
| --- | --- |
| official | 23 |
| rss | 12 |
| github | 1 |

### Company Ready By Role

| Role | Count |
| --- | --- |
| technical_thread_link | 15 |
| product_release | 11 |
| hiring_team_signal | 5 |
| partnership_signal | 5 |

## P0 CompanySource Ready

| Company | Role | Kind | Date | Title | URL |
| --- | --- | --- | --- | --- | --- |
| 英伟达 | partnership_signal | official | 2026-06-08 | NVIDIA 与 KRAFTON、NC、T1 在韩国 PC 房庆祝 RTX Spark 发布 | https://blogs.nvidia.com/blog/krafton-nc-t1-korea-gaming-pc-bang-rtx-spark |
| Anthropic | technical_thread_link | official | 2026-05-26 | Anthropic联合创始人Chris Olah在教皇通谕发布会上的讲话 | https://www.anthropic.com/news/chris-olah-pope-leo-encyclical |
| xAI | technical_thread_link | official | 2026-06-18 | Grok 4.3 在 Amazon Bedrock 正式可用 | https://x.ai/news/grok-amazon-bedrock |
| Alibaba DAMO Academy | product_release | official | 2026-06-17 | Qwen-RobotManip：对齐解锁机器人操作基础模型的规模化能力 | https://qwen.ai/blog?id=qwen-robotmanip |
| xAI | technical_thread_link | official | 2026-06-17 | Grok for PowerPoint 发布：在 Microsoft PowerPoint 内直接生成和编辑幻灯片 | https://x.ai/news/introducing-powerpoint-addin |
| xAI | product_release | official | 2026-06-16 | Grok Build 推出 Agent Dashboard 管理多个编码会话 | https://x.ai/news/agent-dashboard |
| xAI | product_release | official | 2026-06-02 | xAI发布Composer 2.5 | https://x.ai/news/composer-2-5 |
| Anthropic | hiring_team_signal | official | 2026-06-18 | Claude Design 更新：跨项目保持品牌一致，与Claude Code协同 | https://claude.com/blog/claude-design-stays-on-brand-for-daily-work |
| Anthropic | technical_thread_link | official | 2026-06-10 | Claude Fable 5 和 Claude Mythos 5 | https://www.anthropic.com/news/claude-fable-5-mythos-5 |
| Anthropic | technical_thread_link | official | 2026-05-29 | Claude Opus 4.8 发布：在编码、智能体技能与推理方面实现全面升级 | https://www.anthropic.com/news/claude-opus-4-8 |
| 英伟达 | product_release | official | 2026-06-02 | NVIDIA 发布工厂运营蓝图，为工厂提供自主智能管理智能体 | https://blogs.nvidia.com/blog/factory-operations-fox-blueprint-ai-brain |
| 英伟达 | partnership_signal | official | 2026-06-09 | NVIDIA与LG集团合作建设AI工厂，加速物理AI与自动驾驶 | https://blogs.nvidia.com/blog/nvidia-and-lg-group-ai-factory |
| 英伟达 | technical_thread_link | official | 2026-06-09 | 英国借助 NVIDIA 技术将主权 AI 雄心转化为行动 | https://blogs.nvidia.com/blog/uk-sovereign-ai-advancements |
| 苹果公司 | partnership_signal | rss | 2026-06-09 | 苹果发布第三代 Apple Foundation Models（AFM） | https://machinelearning.apple.com/research/introducing-third-generation-of-apple-foundation-models |
| 谷歌 | product_release | rss | 2026-06-06 | Google Colab CLI 发布 | https://developers.googleblog.com/introducing-the-google-colab-cli |
| 谷歌 | product_release | rss | 2026-05-29 | 使用 Google Pay & Wallet Developer MCP server 加速你的集成工作流 | https://developers.googleblog.com/supercharge-your-integration-workflow-with-the-google-pay-wallet-developer-mcp-server |
| 谷歌 | product_release | rss | 2026-05-22 | 发布 Kotlin版ADK与Android版ADK 0.1.0：在Android及其他平台构建AI Agent | https://developers.googleblog.com/adk-kotlin-android-building-ai-agents |
| Alibaba DAMO Academy | technical_thread_link | official | 2026-06-17 | Qwen-RobotNav：面向智能体导航系统的可扩展导航模型 | https://qwen.ai/blog?id=qwen-robotnav |
| Alibaba DAMO Academy | product_release | official | 2026-05-21 | Qwen3.7：智能体前沿 | https://qwen.ai/blog?id=qwen3.7 |
| 苹果公司 | hiring_team_signal | rss | 2026-05-09 | 苹果隐私保护机器学习与AI研讨会2026 | https://machinelearning.apple.com/updates/ppml-2026 |
| 苹果公司 | technical_thread_link | rss | 2026-05-01 | 国际声学、语音与信号处理会议 (ICASSP) 2026 | https://machinelearning.apple.com/updates/apple-at-icassp-2026 |
| OpenAI | product_release | rss | 2026-06-19 | GPT-5.5 Instant提升ChatGPT健康智能 | https://openai.com/index/improving-health-intelligence-in-chatgpt |
| OpenAI | technical_thread_link | rss | 2026-06-19 | OpenAI 强化学习实现广泛且持久的有益模型 | https://alignment.openai.com/beneficial-rl |
| Hugging Face | technical_thread_link | rss | 2026-06-18 | MolmoMotion：语言引导的3D运动预测模型 | https://huggingface.co/blog/allenai/molmomotion |
| Hugging Face | product_release | rss | 2026-06-18 | Strands Robots SDK：用单一智能体打通 Hugging Face Hub 到物理机器人 | https://huggingface.co/blog/amazon/strands-lerobot-hub-to-hardware |
| OpenAI | technical_thread_link | rss | 2026-06-17 | 公开聊天数据能否预测真实世界AI失调？ | https://alignment.openai.com/validating-public-evals |
| Hugging Face | technical_thread_link | rss | 2026-06-13 | olmo-eval：面向模型开发循环的评估工作台 | https://huggingface.co/blog/allenai/olmo-eval |
| Alibaba DAMO Academy | technical_thread_link | official | 2026-06-17 | Qwen-RobotWorld：具身智能体的无界世界 | https://qwen.ai/blog?id=qwen-robotworld |
| MiniMax | technical_thread_link | official | 2026-06-02 | MiniMax M3：前沿编码、100万token上下文与原生多模态一体模型 | https://www.minimax.io/blog/minimax-m3 |
| Cloudflare | hiring_team_signal | official | 2026-06-16 | Cloudflare 引入 Ensemble AI 团队，加速 AI 基础设施研发 | https://blog.cloudflare.com/ensemble-ai-talent-joins-cloudflare |
| Mistral AI | hiring_team_signal | official | 2026-05-29 | 发布 Search Toolkit | https://mistral.ai/news/search-toolkit |
| Cloudflare | technical_thread_link | official | 2026-06-19 | Cloudflare 发布多阶段漏洞发现工具，详解对抗性审查与上下文绕过技术 | https://blog.cloudflare.com/build-your-own-vulnerability-harness |
| Cloudflare | product_release | official | 2026-06-06 | 你的AI账单失控了。Cloudflare现在可以解决这个问题。 | https://blog.cloudflare.com/ai-gateway-spend-limits |
| Mistral AI | partnership_signal | official | 2026-05-29 | AI Now Summit 2026 | https://mistral.ai/news/ai-now-summit-2026 |
| Mistral AI | partnership_signal | official | 2026-05-24 | 加倍投入科学以赢得工业AI | https://mistral.ai/news/science-to-win-industrial-ai |
| 杭州深度求索人工智能基础技术研究有限公司（深度求索 / DeepSeek） | hiring_team_signal | github | 2026-05-01 | DeepSeek团队提出“视觉基元思维”新范式，解决多模态模型空间推理指代鸿沟 | https://github.com/deepseek-ai/Thinking-with-Visual-Primitives |

## P0 Existing People Ready

| Person | Date | Officialness | Title | Canonical URL |
| --- | --- | --- | --- | --- |
| 黄仁勋 | 2026-06-08 | official_blog | NVIDIA 与 KRAFTON、NC、T1 在韩国 PC 房庆祝 RTX Spark 发布 | https://blogs.nvidia.com/blog/krafton-nc-t1-korea-gaming-pc-bang-rtx-spark |
| Chris Olah | 2026-05-26 | official_blog | Anthropic联合创始人Chris Olah在教皇通谕发布会上的讲话 | https://www.anthropic.com/news/chris-olah-pope-leo-encyclical |

## Review-Only Queues

| Queue | Count |
| --- | --- |
| new_organization | 8 |
| alias_merge | 3 |
| new_person_candidate | 1 |
| person_deferred | 48 |

### new_organization

| Name | Kind | Decision | Evidence | Reason |
| --- | --- | --- | --- | --- |
| OpenRouter | x | fresh_new_organization_candidate | https://x.com/OpenRouter/status/2063504950429147376 | AI HOT 中反复出现，但本库 Organization 未命中。 |
| Runway | official | fresh_new_organization_candidate | https://runwayml.com/news/mcp | AI HOT 中反复出现，但本库 Organization 未命中。 |
| Replit | x | fresh_new_organization_candidate | https://x.com/Replit/status/2062594881625940379 | AI HOT 中反复出现，但本库 Organization 未命中。 |
| 小米 | x | fresh_new_organization_candidate | https://x.com/XiaomiMiMo/status/2064772356443394441 | AI HOT 中反复出现，但本库 Organization 未命中。 |
| Luma AI | x | fresh_new_organization_candidate | https://x.com/LumaLabsAI/status/2064389582997897216 | AI HOT 中反复出现，但本库 Organization 未命中。 |
| OpenBMB | x | fresh_new_organization_candidate | https://x.com/rohanpaul_ai/status/2057833050692800926 | AI HOT 中反复出现，但本库 Organization 未命中。 |
| LMSYS | official | fresh_new_organization_candidate | https://www.lmsys.org/blog/2026-05-28-mori | AI HOT 中反复出现，但本库 Organization 未命中。 |
| Krea | x | fresh_new_organization_candidate | https://x.com/krea_ai/status/2065086662166901114 | AI HOT 中反复出现，但本库 Organization 未命中。 |

### alias_merge

| Name | Kind | Decision | Evidence | Reason |
| --- | --- | --- | --- | --- |
| 月之暗面 | x | alias_merge_existing_organization | https://x.com/berryxia/status/2054733412846690443 | Treat Kimi as a product/account alias of Moonshot AI. Do not create a separate Organization row from AI HOT mentions alone. |
| Alibaba DAMO Academy | x | alias_merge_existing_organization | https://x.com/alibaba_cloud/status/2059174528786268669 | Bind Qwen and qwen.ai events to the Alibaba canonical organization for company-source work. Keep Qwen as product/source vocabulary. |
| 杭州深度求索人工智能基础技术研究有限公司（深度求索 / DeepSeek） | x | alias_merge_existing_organization | https://x.com/rohanpaul_ai/status/2052901878728659037 | Map DeepSeek shorthand to the existing Chinese legal/canonical Organization row. Do not create duplicate DeepSeek rows. |

### new_person_candidate

| Name | Kind | Decision | Evidence | Reason |
| --- | --- | --- | --- | --- |
| Travis Bryant | official | fresh_person_candidate_for_review | https://claude.com/blog/how-an-anthropic-sales-leader-uses-claude-cowork-to-run-a-4-000-account-book | Meets generated person review fields with a non-social/non-media source; still not importable until enrichment is built. |

### person_deferred

| Name | Kind | Decision | Evidence | Reason |
| --- | --- | --- | --- | --- |
| Nathan Lambert | x | deferred_not_importable | https://x.com/natolambert/status/2052067048206090610 | Blocked by x_only, missing_roleCategory, missing_currentTitle. Audit reason: 有 strong source 和职位/组织语境，满足 candidate 级复核入口。 |
| Aaron Levie | rss | deferred_not_importable | https://techcrunch.com/video/what-happens-when-companies-become-too-ai-pilled | Blocked by media_or_commentary_source, missing_roleCategory, missing_organization, missing_currentTitle. Audit reason: 有 strong source 和职位/组织语境，满足 candidate 级复核入口。 |
| Adam Bry | rss | deferred_not_importable | https://www.theverge.com/podcast/949195/skydio-ceo-adam-bry-autonmous-drones-china-red-lines-military | Blocked by media_or_commentary_source. Audit reason: 有 strong source 和职位/组织语境，满足 candidate 级复核入口。 |
| Alexis Lanternier | rss | deferred_not_importable | https://www.theverge.com/ai-artificial-intelligence/948153/deezer-ai-music-detector-spotify-apple | Blocked by media_or_commentary_source, missing_roleCategory, missing_organization, missing_currentTitle. Audit reason: 有 strong source 和职位/组织语境，满足 candidate 级复核入口。 |
| Dean Ball | rss | deferred_not_importable | https://techcrunch.com/2026/06/18/openai-is-bringing-on-some-big-guns-in-the-lead-up-to-its-ipo | Blocked by media_or_commentary_source. Audit reason: 有 strong source 和职位/组织语境，满足 candidate 级复核入口。 |
| Emily Chang | rss | deferred_not_importable | https://www.bloomberg.com/news/videos/2026-06-10/inside-anthropic-the-965-billion-ai-juggernaut-video | Blocked by media_or_commentary_source, missing_roleCategory, missing_currentTitle. Audit reason: 有 strong source 和职位/组织语境，满足 candidate 级复核入口。 |
| Jack Dorsey | rss | deferred_not_importable | https://techcrunch.com/2026/06/15/the-ai-layoff-wave-is-becoming-a-powder-keg | Blocked by media_or_commentary_source, missing_roleCategory, missing_currentTitle. Audit reason: 有 strong source 和职位/组织语境，满足 candidate 级复核入口。 |
| Salvatore Sanfilippo | web | deferred_not_importable | https://simonwillison.net/2026/May/4/redis-array | Blocked by media_or_commentary_source, missing_roleCategory, missing_currentTitle. Audit reason: 有 strong source 和职位/组织语境，满足 candidate 级复核入口。 |
| Gary Marcus | rss | deferred_not_importable | https://garymarcus.substack.com/p/breaking-trump-asks-the-impossible | Blocked by audit_deferred, media_or_commentary_source, missing_roleCategory, missing_currentTitle. Audit reason: 不符合人物准入：缺 roleCategory / organization / currentTitle 级别证据。 |
| Berry Xia | x | deferred_not_importable | https://x.com/berryxia/status/2051974536481198511 | Blocked by audit_deferred, x_only, missing_roleCategory, missing_currentTitle. Audit reason: 更像内容源作者或转述者，先作为内容源观察。 |
| Jonathan Jaffe | web | deferred_not_importable | https://www.tomtunguz.com/jonathan-jaffe-office-hours | Blocked by audit_deferred, media_or_commentary_source, missing_roleCategory, missing_organization, missing_currentTitle. Audit reason: 不符合人物准入：缺 roleCategory / organization / currentTitle 级别证据。 |
| Garry Tan | x | deferred_not_importable | https://x.com/berryxia/status/2053136924244836455 | Blocked by audit_deferred, x_only. Audit reason: 不符合人物准入：只有 X/聚合/转述线索，缺 strong source。 |

## Backlog And Blocked Examples

### Eligible CompanySource Later

| Company | Role | Kind | Date | Title | URL |
| --- | --- | --- | --- | --- | --- |
| xAI | product_release | official | 2026-05-29 | Grok Build 0.1 on API | https://x.ai/news/grok-build-0-1 |
| xAI | technical_thread_link | official | 2026-05-16 | 将Grok接入Hermes智能体 | https://x.ai/news/grok-hermes |
| xAI | product_release | official | 2026-05-15 | xAI 推出 Grok Build 早期测试版 | https://x.ai/news/grok-build-cli |
| xAI | hiring_team_signal | official | 2026-05-07 | Grok Imagine API 推出“Quality Mode”图像生成与编辑功能 | https://x.ai/news/grok-imagine-quality-mode |
| xAI | product_release | official | 2026-05-07 | Grok Web 正式推出 Connectors 功能，实现与日常应用深度集成 | https://x.ai/news/grok-connectors |
| xAI | hiring_team_signal | official | 2026-05-01 | 自定义语音与语音库 | https://x.ai/news/grok-custom-voices |
| xAI | partnership_signal | official | 2026-06-19 | Grok 现集成 Databricks Agent Bricks | https://x.ai/news/grok-databricks |
| xAI | product_release | official | 2026-06-16 | xAI 宣布 Grok 集成至 Warp 终端开发环境 | https://x.ai/news/grok-warp |
| xAI | partnership_signal | official | 2026-06-11 | eToro AI 智能体 Tori 集成 SpaceXAI 文本模型实现实时市场情绪分析 | https://x.ai/news/grok-etoro |
| Anthropic | hiring_team_signal | official | 2026-05-29 | 在Claude Code中引入动态工作流 | https://claude.com/blog/introducing-dynamic-workflows-in-claude-code |
| Anthropic | partnership_signal | official | 2026-05-20 | Claude智能体托管平台新增自托管沙箱与MCP隧道功能 | https://claude.com/blog/claude-managed-agents-updates |
| Anthropic | product_release | official | 2026-05-14 | Anthropic推出面向小型企业的Claude服务包 | https://www.anthropic.com/news/claude-for-small-business |
| Anthropic | hiring_team_signal | official | 2026-05-14 | ExploitGym：AI智能体能否将安全漏洞转化为真实攻击？ | https://rdi.berkeley.edu/blog/exploitgym |
| Anthropic | partnership_signal | official | 2026-05-13 | Claude进军法律行业 | https://claude.com/blog/claude-for-the-legal-industry |
| Anthropic | product_release | official | 2026-05-12 | Anthropic在AWS上正式推出Claude平台 | https://claude.com/blog/claude-platform-on-aws |
| Anthropic | technical_thread_link | official | 2026-05-08 | 捐赠开源对齐工具 Petri | https://www.anthropic.com/research/donating-open-source-petri |
| Anthropic | partnership_signal | official | 2026-05-07 | Claude使用限制提升及与SpaceX达成算力合作 | https://www.anthropic.com/news/higher-limits-spacex |
| Anthropic | partnership_signal | official | 2026-05-06 | 金融与保险智能体解决方案 | https://www.anthropic.com/news/finance-agents |
| Anthropic | partnership_signal | official | 2026-06-18 | Anthropic 在首尔开设办公室并宣布多项韩国AI生态合作 | https://www.anthropic.com/news/seoul-office-partnerships-korean-ai-ecosystem |
| Anthropic | product_release | official | 2026-06-18 | Claude Opus 4.8 Build Day黑客马拉松获奖项目揭晓 | https://claude.com/blog/meet-the-winners-of-our-claude-opus-4-8-build-day-hackathon |
| Anthropic | partnership_signal | official | 2026-06-13 | TCS与Anthropic合作，将Claude引入受监管行业 | https://www.anthropic.com/news/tcs-anthropic-partnership |
| Anthropic | partnership_signal | official | 2026-06-12 | Anthropic 启动 Claude Corps 全国奖学金项目 | https://www.anthropic.com/news/claude-corps |
| Anthropic | partnership_signal | official | 2026-06-12 | Anthropic与DXC达成全球联盟，将Claude引入关键行业系统 | https://www.anthropic.com/news/dxc-anthropic-alliance |
| Anthropic | partnership_signal | official | 2026-06-03 | Anthropic扩展Project Glasswing计划 | https://www.anthropic.com/news/expanding-project-glasswing |
| Anthropic | financial_signal | official | 2026-06-02 | Anthropic 保密向 SEC 提交 S-1 草案 | https://www.anthropic.com/news/confidential-draft-s1-sec |
| Anthropic | financial_signal | official | 2026-05-29 | Anthropic 完成 650 亿美元 H 轮融资，估值达 9650 亿美元 | https://www.anthropic.com/news/series-h |
| Anthropic | hiring_team_signal | official | 2026-05-27 | Anthropic任命KiYoung Choi为韩国代表董事 | https://www.anthropic.com/news/kiyoung-choi-representative-director-anthropic-korea |
| Anthropic | partnership_signal | official | 2026-05-23 | Project Glasswing：初步更新 | https://www.anthropic.com/research/glasswing-initial-update |
| Anthropic | financial_signal | official | 2026-05-15 | Anthropic与盖茨基金会达成2亿美元合作，聚焦全球健康与教育 | https://www.anthropic.com/news/gates-foundation-partnership |
| Anthropic | partnership_signal | official | 2026-05-05 | Anthropic联合多家顶级投资机构成立新公司，专注企业AI服务 | https://www.anthropic.com/news/enterprise-ai-services-company |
| Anthropic | hiring_team_signal | official | 2026-06-19 | Anthropic Project Fetch 第二阶段：Claude Opus 4.7 自主完成任务，速度比人类团队快约20倍 | https://www.anthropic.com/research/project-fetch-phase-two |
| Anthropic | technical_thread_link | official | 2026-06-17 | Anthropic：智能体编码中专业知识回报持续存在 | https://www.anthropic.com/research/claude-code-expertise |
| Anthropic | hiring_team_signal | official | 2026-06-09 | 为生物学AI智能体铺路 | https://www.anthropic.com/research/agents-in-biology |
| Anthropic | partnership_signal | official | 2026-06-06 | Anthropic：让Claude成为化学家 | https://www.anthropic.com/research/making-claude-a-chemist |
| Anthropic | technical_thread_link | official | 2026-05-28 | 社会科学中的编码智能体 | https://www.anthropic.com/research/coding-agents-social-sciences |
| Anthropic | technical_thread_link | official | 2026-05-09 | 教导Claude理解“为什么” | https://www.anthropic.com/research/teaching-claude-why |
| Anthropic | partnership_signal | official | 2026-05-08 | 自然语言自编码器：将Claude的“想法”解码为文本 | https://www.anthropic.com/research/natural-language-autoencoders |
| Anthropic | technical_thread_link | official | 2026-05-28 | AI智能体的零信任安全框架 | https://claude.com/blog/zero-trust-for-ai-agents |
| Anthropic | technical_thread_link | official | 2026-05-27 | 我们如何对不同产品中的Claude进行隔离控制 | https://www.anthropic.com/engineering/how-we-contain-claude |
| 谷歌 | partnership_signal | rss | 2026-05-22 | 推出 Gemini for Home 赋能服务提供商与硬件合作伙伴 | https://developers.googleblog.com/empowering-service-providers-and-hardware-partners-with-gemini-for-home |

### CompanySource Blocked Examples

| Company | Kind | Reason | Title | URL |
| --- | --- | --- | --- | --- |
| Alibaba DAMO Academy | x | source_kind_x_review_only | 阿里云CTO阐述从云原生到智能体原生转型 | https://x.com/alibaba_cloud/status/2059174528786268669 |
| Anthropic | x | source_kind_x_review_only | Anthropic CEO Dario Amodei 发文呼吁缩小AI政策差距 | https://x.com/AnthropicAI/status/2064783418844762489 |
| 英伟达 | x | source_kind_x_review_only | 黄仁勋与纳德拉共议智能体AI时代 | https://x.com/nvidia/status/2062228974273716457 |
| xAI | x | source_kind_x_review_only | Grok TTS 盲测人类感得分96登顶 | https://x.com/xai/status/2067654108123910495 |
| OpenAI | x | source_kind_x_review_only | Codex 推出浏览器开发者模式 | https://x.com/OpenAIDevs/status/2065226355495895521 |
| OpenAI | x | source_kind_x_review_only | OpenAI Codex 推出速率重置攒存功能 | https://x.com/OpenAI/status/2065225362544726371 |
| 谷歌 | x | source_kind_x_review_only | Gemini 3.5 Live Translate 发布 | https://x.com/GoogleDeepMind/status/2064366504745828689 |
| 谷歌 | x | source_kind_x_review_only | Google AI 本周产品更新：Nano Banana 2、Co-Scientist、dreambeans、Gemma 4 等 | https://x.com/GoogleAI/status/2062942864288387430 |
| OpenAI | x | source_kind_x_review_only | Codex 推出 iOS 应用构建插件 | https://x.com/OpenAIDevs/status/2062599291479478275 |
| 谷歌 | x | source_kind_x_review_only | Google Magenta RealTime 2 (MRT2) 实时音乐模型发布 | https://x.com/googleaidevs/status/2062603374789263646 |
| xAI | x | source_kind_x_review_only | Grok模型登陆Cloudflare AI Gateway | https://x.com/xai/status/2062294202625696081 |
| xAI | x | source_kind_x_review_only | xAI Grok语音模型上线Vapi平台 | https://x.com/xai/status/2062209374039499178 |
| 英伟达 | x | source_kind_x_review_only | OpenShell v0.0.55 发布：新增 Vertex AI 推理支持 | https://x.com/NVIDIAAI/status/2062210034109677665 |
| 谷歌 | x | source_kind_x_review_only | Google DeepMind 开源科学智能体工具包 | https://x.com/googleaidevs/status/2061924472245153863 |
| 英伟达 | x | source_kind_x_review_only | Nemotron 3 Ultra 本周即将发布 | https://x.com/NVIDIAAI/status/2061305524700758050 |
| 英伟达 | x | source_kind_x_review_only | DynoSim：模拟驱动推理堆栈优化 | https://x.com/NVIDIAAI/status/2060781385686659416 |
| 谷歌 | x | source_kind_x_review_only | Nano Banana Pro与Nano Banana 2正式发布 | https://x.com/googleaidevs/status/2060685345738375640 |
| Alibaba DAMO Academy | x | source_kind_x_review_only | MuleRun登陆阿里云市场，提供全天候AI劳动力 | https://x.com/alibaba_cloud/status/2059821825140367565 |
| 谷歌 | x | source_kind_x_review_only | Nano Banana Pro与Nano Banana 2正式发布 | https://x.com/googleaidevs/status/2060049962356916377 |
| OpenAI | x | source_kind_x_review_only | OpenAI产品支持私有MCP服务器安全连接 | https://x.com/OpenAIDevs/status/2059703536825565499 |
| Alibaba DAMO Academy | x | source_kind_x_review_only | Qwen3.7-Max 成为全球第二AI编程模型 | https://x.com/alibaba_cloud/status/2059163881361048011 |
| xAI | x | source_kind_x_review_only | Grok Build Beta版向SuperGrok用户开放 | https://x.com/xai/status/2058973760708091907 |
| OpenAI | x | source_kind_x_review_only | 新增差异标记样式设置选项 | https://x.com/OpenAIDevs/status/2057918624841728349 |
| 谷歌 | x | source_kind_x_review_only | Project Genie与谷歌街景合作推出交互式世界 | https://x.com/GoogleDeepMind/status/2057842131142590512 |
| 谷歌 | x | source_kind_x_review_only | 谷歌I/O大会发布AI代理全套开发工具链 | https://x.com/GoogleAI/status/2057871583843135978 |
| 谷歌 | x | source_kind_x_review_only | Google Stitch更新：AI设计助手实现全流程构建 | https://x.com/googleaidevs/status/2057209295763300785 |
| 谷歌 | x | source_kind_x_review_only | Gemini Omni助力Google Flow创作电影级故事 | https://x.com/GoogleDeepMind/status/2056804306653794336 |
| 谷歌 | x | source_kind_x_review_only | Gemini Omni发布：多模态生成新突破 | https://x.com/GoogleDeepMind/status/2056786446636212467 |
| 谷歌 | x | source_kind_x_review_only | 谷歌推出全新AI智能搜索框，支持多模态交互 | https://x.com/GoogleAI/status/2056845506601718271 |
| Alibaba DAMO Academy | x | source_kind_x_review_only | 阿里云推出HappyHorse视频生成模型 | https://x.com/alibaba_cloud/status/2056182152681644176 |
| OpenAI | x | source_kind_x_review_only | Codex推出自动化钩子与程序化令牌 | https://x.com/OpenAIDevs/status/2055032115964870838 |
| 微软 | x | source_kind_x_review_only | 材料科学AI多任务模型突破 | https://x.com/MSFTResearch/status/2054191008091418998 |
| Alibaba DAMO Academy | x | source_kind_x_review_only | 阿里云推出Smart Studio，一站式自托管AI模型平台 | https://x.com/alibaba_cloud/status/2052680300803596574 |
| OpenAI | x | source_kind_x_review_only | Agents SDK TypeScript版更新发布 | https://x.com/OpenAIDevs/status/2051725072873001338 |
| xAI | x | source_kind_x_review_only | Grok 4.3正式上线API 速度与智能双突破 | https://x.com/xai/status/2051703217697010103 |
| OpenAI | x | source_kind_x_review_only | GPT-5.5发布一周创营收新高 | https://x.com/OpenAI/status/2050250926888468929 |
| Alibaba DAMO Academy | x | source_kind_x_review_only | Wan2.7-Image实现精准色彩控制 | https://x.com/alibaba_cloud/status/2049668561208045904 |
| Alibaba DAMO Academy | x | source_kind_x_review_only | 阿里云发布HappyHorse，实现秒级AI视频生成 | https://x.com/alibaba_cloud/status/2049736035173629993 |
| OpenAI | x | source_kind_x_review_only | Codex简化日常办公流程 | https://x.com/OpenAI/status/2049928776147230886 |
| Alibaba DAMO Academy | x | source_kind_x_review_only | 宏利香港与阿里云达成AI战略合作 | https://x.com/alibaba_cloud/status/2062006591377829922 |

### Existing People Needs Primary Source

| Person | Category | Kind | Title | Reason |
| --- | --- | --- | --- | --- |
| Greg Brockman | needs_manual_review | x | OpenAI 联合多国医生：GPT-5.5 Instant 健康问答能力追平前沿 Thinking 模型 | find_primary_source |
| Noam Shazeer | needs_manual_review | x | Noam Shazeer 离开 Google 加入 OpenAI | find_primary_source |
| Dario Amodei | needs_manual_review | x | Anthropic与DeepMind CEO呼吁G7组建AI联盟排除中国 | find_primary_source |
| 吉姆·范 | needs_manual_review | x | NVIDIA GEAR实验室发布ENPIRE：8个Codex智能体自主控制机器人完成物理实验 | find_primary_source |
| Dario Amodei | needs_manual_review | x | 五角大楼将大部分日常AI工作流从Anthropic转移，目标9月前完全切断 | find_primary_source |
| 萨提亚·纳德拉 | discard_duplicate_or_low_value | web | AI 应用黄金时代已至：Fable 被禁、Nadella 的护城河论点与 Salesforce 收购 Fin | discard_low_value |
| Dario Amodei | discard_duplicate_or_low_value | x | Anthropic 上市前夕 | discard_low_value |
| 萨提亚·纳德拉 | needs_manual_review | x | Satya Nadella：没有生态的前沿不稳定 | find_primary_source |
| Dario Amodei | needs_manual_review | x | Anthropic CEO Dario Amodei 发文呼吁缩小AI政策差距 | find_primary_source |
| Elon Musk | needs_manual_review | x | Elon Musk 详解 SpaceX AI1 轨道 AI 数据中心卫星方案 | find_primary_source |
| 李飞飞 | needs_manual_review | x | World Labs与Lore合作打造互动体验 | find_primary_source |
| Sam Altman | needs_manual_review | x | OpenAI计划到2028年由AI主导研究 | find_primary_source |
| 萨提亚·纳德拉 | needs_manual_review | x | 微软CEO Satya Nadella最新访谈上线 | find_primary_source |
| Mustafa Suleyman | discard_duplicate_or_low_value | rss | 微软与OpenAI分道扬镳——如今双方准备正面交锋 | discard_low_value |
| 黄仁勋 | needs_manual_review | x | 黄仁勋与纳德拉共议智能体AI时代 | find_primary_source |
| Sam Altman | needs_manual_review | x | OpenAI发布生物防御AI工具Rosalind | find_primary_source |
| Sam Altman | needs_manual_review | x | OpenAI正式进军机器人领域并启动招聘 | find_primary_source |
| Greg Brockman | needs_manual_review | x | OpenAI推出实时翻译模型，支持70+语言输入 | find_primary_source |
| 李飞飞 | needs_manual_review | x | GPIC：大规模视觉生成基准数据集发布 | find_primary_source |
| Chris Olah | discard_duplicate_or_low_value | rss | 教皇没对AGI上头 | discard_duplicate_candidate |
| 黄仁勋 | needs_manual_review | x | 黄仁勋展示英伟达台湾新园区 | find_primary_source |
| 李飞飞 | needs_manual_review | x | 阿里云CTO阐述从云原生到智能体原生转型 | find_primary_source |
| Elon Musk | needs_manual_review | x | SpaceX与Anthropic合作提供大规模AI算力服务 | find_primary_source |
| Elon Musk | discard_duplicate_or_low_value | x | Andrej加入Anthropic，马斯克也点赞 | discard_low_value |
| Dario Amodei | needs_manual_review | x | Anthropic CEO预言软件免费化与职业结构巨变 | find_primary_source |
| Elon Musk | needs_manual_review | x | Grok Imagine图像生成功能正式发布 | find_primary_source |
| Mustafa Suleyman | discard_duplicate_or_low_value | x | 微软AI CEO预测18个月内AI自动化所有白领工作 | discard_low_value |
| 黄仁勋 | needs_manual_review | x | 英伟达CEO称技工前景优于计算机科学毕业生 | find_primary_source |
| 杨植麟 | needs_manual_review | x | Moonshot AI创始人杨植麟最近放出了一个40分钟视频 | find_primary_source |
| Andrej Karpathy | discard_duplicate_or_low_value | x | 90%的人在白白浪费“Token”！ | discard_low_value |
| Sam Altman | needs_manual_review | x | 传奇总部“Cog House”首度公开：天才创始人Scott Wu与Cognition AI的崛起之路 | find_primary_source |
| 梁文锋 | discard_duplicate_or_low_value | x | DeepSeek融资70亿美元创纪录，创始人个人出资30亿 | discard_low_value |
| Elon Musk | needs_manual_review | x | Grok 升级推出全平台连接器功能 | find_primary_source |
| Thariq Shihipar | needs_manual_review | web | Claude Code实践：HTML输出格式的卓越效果 | find_primary_source |
| Elon Musk | discard_duplicate_or_low_value | x | OpenAI 政变之夜内部短信曝光：董事会为何执意赶走 Altman？ | discard_low_value |
| Demis Hassabis | needs_manual_review | x | Google DeepMind与EVE Online合作研究复杂智能系统 | find_primary_source |
| 梁文锋 | needs_manual_review | x | 国家队领投DeepSeek估值飙升至450亿美元 | find_primary_source |
| Elon Musk | discard_duplicate_or_low_value | x | 奥特曼与布罗克曼被指在OpenAI进行自我交易，涉嫌背叛马斯克 | discard_low_value |

## Next Execution Boundary

1. Generate per-company `company-source-seed/v1` dry-run packs only from `p0CompanySourceReady`.
2. Run `pnpm company:preflight -- --check-db` on each pack before any materialization.
3. Convert the two `p0ExistingPeopleReady` rows through RawPoolItem backfill only after exact URL and person binding re-check.
4. Keep review-only queues out of materialization until they get canonical company/person decisions and primary-source URLs.
