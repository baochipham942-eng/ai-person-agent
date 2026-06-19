# AI HOT 已有库人物动态 Backfill Worklist

生成时间：2026-06-19T01:20:12.899Z
审计时间：2026-06-19T00:42:14.021Z

## 口径

- 只处理 `peopleExistingCandidates` 命中的已有库人物，不新增 People。
- X 和媒体转述只保留为发现证据；候选写入前优先补官方、GitHub、论文或其他一手 URL。
- 去重拦截同 URL，以及同人物 + 同公司 + 同产品/动作 + 近日期的重复候选。
- 本文件只是 dry-run worklist，不写数据库。

## Counts

| Metric | Value |
| --- | --- |
| people | 30 |
| peopleWithCandidates | 16 |
| candidateEvents | 40 |
| primaryReadyEvents | 2 |
| needsPrimarySourceEvents | 38 |
| duplicateEventsSkipped | 4 |

## Candidates

| Person | Date | Title | Main source | Discovery | Policy |
| --- | --- | --- | --- | --- | --- |
| Sam Altman | 2026-06-09 | OpenAI计划到2028年由AI主导研究 | 待补一手源 | https://x.com/rohanpaul_ai/status/2064096574142390755 | needs_primary_source_before_apply |
| Sam Altman | 2026-06-01 | OpenAI发布生物防御AI工具Rosalind | 待补一手源 | https://x.com/sama/status/2061101875303530871 | needs_primary_source_before_apply |
| Sam Altman | 2026-06-01 | OpenAI正式进军机器人领域并启动招聘 | 待补一手源 | https://x.com/sama/status/2061117302528188712 | needs_primary_source_before_apply |
| Sam Altman | 2026-05-12 | 传奇总部“Cog House”首度公开：天才创始人Scott Wu与Cognition AI的崛起之路 | 待补一手源 | https://x.com/swyx/status/2053856676969890189 | needs_primary_source_before_apply |
| Elon Musk | 2026-06-10 | Elon Musk 详解 SpaceX AI1 轨道 AI 数据中心卫星方案 | 待补一手源 | https://x.com/rohanpaul_ai/status/2064165951936094364 | needs_primary_source_before_apply |
| Elon Musk | 2026-05-21 | SpaceX与Anthropic合作提供大规模AI算力服务 | 待补一手源 | https://x.com/elonmusk/status/2057228707606196434 | needs_primary_source_before_apply |
| Elon Musk | 2026-05-20 | Andrej加入Anthropic，马斯克也点赞 | 待补一手源 | https://x.com/Yuchenj_UW/status/2056764450712256753 | needs_primary_source_before_apply |
| Elon Musk | 2026-05-18 | Grok Imagine图像生成功能正式发布 | 待补一手源 | https://x.com/elonmusk/status/2055912040481599793 | needs_primary_source_before_apply |
| Elon Musk | 2026-05-09 | Grok 升级推出全平台连接器功能 | 待补一手源 | https://x.com/elonmusk/status/2052856431611941200 | needs_primary_source_before_apply |
| Elon Musk | 2026-05-08 | OpenAI 政变之夜内部短信曝光：董事会为何执意赶走 Altman？ | 待补一手源 | https://x.com/dotey/status/2052255174706479349 | needs_primary_source_before_apply |
| Elon Musk | 2026-05-06 | 奥特曼与布罗克曼被指在OpenAI进行自我交易，涉嫌背叛马斯克 | 待补一手源 | https://x.com/cb_doge/status/2051469347131183130 | needs_primary_source_before_apply |
| Greg Brockman | 2026-06-19 | OpenAI 联合多国医生：GPT-5.5 Instant 健康问答能力追平前沿 Thinking 模型 | 待补一手源 | https://x.com/gdb/status/2067675030335668270 | needs_primary_source_before_apply |
| Greg Brockman | 2026-05-30 | OpenAI推出实时翻译模型，支持70+语言输入 | 待补一手源 | https://x.com/gdb/status/2060452095279415725 | needs_primary_source_before_apply |
| 黄仁勋 | 2026-06-08 | NVIDIA 与 KRAFTON、NC、T1 在韩国 PC 房庆祝 RTX Spark 发布 | https://blogs.nvidia.com/blog/krafton-nc-t1-korea-gaming-pc-bang-rtx-spark | https://blogs.nvidia.com/blog/krafton-nc-t1-korea-gaming-pc-bang-rtx-spark | primary_source_selected; X/media kept only as discovery evidence |
| 黄仁勋 | 2026-06-04 | 黄仁勋与纳德拉共议智能体AI时代 | 待补一手源 | https://x.com/nvidia/status/2062228974273716457 | needs_primary_source_before_apply |
| 黄仁勋 | 2026-05-28 | 黄仁勋展示英伟达台湾新园区 | 待补一手源 | https://x.com/rohanpaul_ai/status/2059689400267939925 | needs_primary_source_before_apply |
| 黄仁勋 | 2026-05-16 | 英伟达CEO称技工前景优于计算机科学毕业生 | 待补一手源 | https://x.com/kimmonismus/status/2055403142913884288 | needs_primary_source_before_apply |
| Dario Amodei | 2026-06-18 | Anthropic与DeepMind CEO呼吁G7组建AI联盟排除中国 | 待补一手源 | https://x.com/kimmonismus/status/2067310431669223425 | needs_primary_source_before_apply |
| Dario Amodei | 2026-06-17 | 五角大楼将大部分日常AI工作流从Anthropic转移，目标9月前完全切断 | 待补一手源 | https://x.com/AYi_AInotes/status/2066679835607412846 | needs_primary_source_before_apply |
| Dario Amodei | 2026-06-15 | Anthropic 上市前夕 | 待补一手源 | https://x.com/xiaohu/status/2065991805238497732 | needs_primary_source_before_apply |
| Dario Amodei | 2026-06-11 | Anthropic CEO Dario Amodei 发文呼吁缩小AI政策差距 | 待补一手源 | https://x.com/AnthropicAI/status/2064783418844762489 | needs_primary_source_before_apply |
| Dario Amodei | 2026-05-18 | Anthropic CEO预言软件免费化与职业结构巨变 | 待补一手源 | https://x.com/rohanpaul_ai/status/2055841486714147177 | needs_primary_source_before_apply |
| Demis Hassabis | 2026-05-07 | Google DeepMind与EVE Online合作研究复杂智能系统 | 待补一手源 | https://x.com/testingcatalog/status/2052149633913139655 | needs_primary_source_before_apply |
| 梁文锋 | 2026-05-10 | DeepSeek融资70亿美元创纪录，创始人个人出资30亿 | 待补一手源 | https://x.com/rohanpaul_ai/status/2052901878728659037 | needs_primary_source_before_apply |
| 梁文锋 | 2026-05-07 | 国家队领投DeepSeek估值飙升至450亿美元 | 待补一手源 | https://x.com/berryxia/status/2051974536481198511 | needs_primary_source_before_apply |
| 萨提亚·纳德拉 | 2026-06-16 | AI 应用黄金时代已至：Fable 被禁、Nadella 的护城河论点与 Salesforce 收购 Fin | 待补一手源 | https://www.tomtunguz.com/golden-age-of-applications | needs_primary_source_before_apply |
| 萨提亚·纳德拉 | 2026-06-15 | Satya Nadella：没有生态的前沿不稳定 | 待补一手源 | https://x.com/satyanadella/status/2066182223213293753 | needs_primary_source_before_apply |
| 萨提亚·纳德拉 | 2026-06-06 | 微软CEO Satya Nadella最新访谈上线 | 待补一手源 | https://x.com/swyx/status/2062854555562565741 | needs_primary_source_before_apply |
| Andrej Karpathy | 2026-05-13 | 90%的人在白白浪费“Token”！ | 待补一手源 | https://x.com/berryxia/status/2054339265103065156 | needs_primary_source_before_apply |
| Mustafa Suleyman | 2026-06-04 | 微软与OpenAI分道扬镳——如今双方准备正面交锋 | 待补一手源 | https://www.theverge.com/ai-artificial-intelligence/942242/microsoft-build-ai-agents-openai-competition | needs_primary_source_before_apply |
| Mustafa Suleyman | 2026-05-18 | 微软AI CEO预测18个月内AI自动化所有白领工作 | 待补一手源 | https://x.com/kimmonismus/status/2055952702908355012 | needs_primary_source_before_apply |
| 李飞飞 | 2026-06-10 | World Labs与Lore合作打造互动体验 | 待补一手源 | https://x.com/drfeifei/status/2064387365930676695 | needs_primary_source_before_apply |
| 李飞飞 | 2026-05-30 | GPIC：大规模视觉生成基准数据集发布 | 待补一手源 | https://x.com/drfeifei/status/2060404846734512205 | needs_primary_source_before_apply |
| 李飞飞 | 2026-05-27 | 阿里云CTO阐述从云原生到智能体原生转型 | 待补一手源 | https://x.com/alibaba_cloud/status/2059174528786268669 | needs_primary_source_before_apply |
| Chris Olah | 2026-05-28 | 教皇没对AGI上头 | 待补一手源 | https://www.theverge.com/ai-artificial-intelligence/937933/pope-ai-encyclical-tech-industry-reactions | needs_primary_source_before_apply |
| Chris Olah | 2026-05-26 | Anthropic联合创始人Chris Olah在教皇通谕发布会上的讲话 | https://www.anthropic.com/news/chris-olah-pope-leo-encyclical | https://www.anthropic.com/news/chris-olah-pope-leo-encyclical | primary_source_selected; X/media kept only as discovery evidence |
| Noam Shazeer | 2026-06-19 | Noam Shazeer 离开 Google 加入 OpenAI | 待补一手源 | https://x.com/Yuchenj_UW/status/2067401895178817999 | needs_primary_source_before_apply |
| Thariq Shihipar | 2026-05-09 | Claude Code实践：HTML输出格式的卓越效果 | 待补一手源 | https://simonwillison.net/2026/May/8/unreasonable-effectiveness-of-html | needs_primary_source_before_apply |
| 吉姆·范 | 2026-06-18 | NVIDIA GEAR实验室发布ENPIRE：8个Codex智能体自主控制机器人完成物理实验 | 待补一手源 | https://x.com/DrJimFan/status/2067283904986517866 | needs_primary_source_before_apply |
| 杨植麟 | 2026-05-15 | Moonshot AI创始人杨植麟最近放出了一个40分钟视频 | 待补一手源 | https://x.com/berryxia/status/2054733412846690443 | needs_primary_source_before_apply |

## People Summary

| Person | Audit events | Worklist | Primary ready | Needs primary |
| --- | ---: | ---: | ---: | ---: |
| Sam Altman | 11 | 4 | 0 | 4 |
| Elon Musk | 10 | 7 | 0 | 7 |
| Greg Brockman | 9 | 2 | 0 | 2 |
| 黄仁勋 | 6 | 4 | 1 | 3 |
| Dario Amodei | 6 | 5 | 0 | 5 |
| Demis Hassabis | 5 | 1 | 0 | 1 |
| Ethan Mollick | 5 | 0 | 0 | 0 |
| 梁文锋 | 5 | 2 | 0 | 2 |
| 萨提亚·纳德拉 | 5 | 3 | 0 | 3 |
| Andrej Karpathy | 4 | 1 | 0 | 1 |
| Mustafa Suleyman | 4 | 2 | 0 | 2 |
| 李飞飞 | 4 | 3 | 0 | 3 |
| Geoffrey Hinton | 3 | 0 | 0 | 0 |
| Chris Olah | 2 | 2 | 1 | 1 |
| Marc Andreessen | 2 | 0 | 0 | 0 |
| Mira Murati | 2 | 0 | 0 | 0 |
| Noam Shazeer | 2 | 1 | 0 | 1 |
| Scott Wu | 2 | 0 | 0 | 0 |
| Thariq Shihipar | 2 | 1 | 0 | 1 |
| Boris Cherny | 2 | 0 | 0 | 0 |
| 吴恩达 | 2 | 0 | 0 | 0 |
| 马克·扎克伯格 | 2 | 0 | 0 | 0 |
| Daniela Amodei | 1 | 0 | 0 | 0 |
| Emad Mostaque | 1 | 0 | 0 | 0 |
| Michael Truell | 1 | 0 | 0 | 0 |
| Yann LeCun | 1 | 0 | 0 | 0 |
| Yoshua Bengio | 1 | 0 | 0 | 0 |
| 吉姆·范 | 1 | 1 | 0 | 1 |
| 杨植麟 | 1 | 1 | 0 | 1 |
| 桑达尔·皮查伊 | 1 | 0 | 0 | 0 |
