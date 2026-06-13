# 机构名册缺口核查

日期：2026-06-11

范围：生产站 `https://people.llmxy.xyz` 的机构筛选结果、当前数据库人物去重状态、公开来源可验证的人选。本文件先产出审计和新人预检数据；2026-06-11 已执行 11 位高置信候选入库、富化和 current role 修复。

## 结论

当前最该补的不是一口气扩全量名册，而是分三层处理：

1. 先修现有人物的机构关系。Aravind Srinivas 已在库里，但 Perplexity 只命中 profile；Joelle Pineau 已在库里，但现任仍显示 McGill/Facebook AI 旧信息；Guillaume Lample 标题是 Mistral，但 profile organization 仍偏向 Facebook。这类不应重复建新人。
2. 可以直接进入新人 preflight 的高置信候选有 11 位：Nick Frosst、Ivan Zhang、Phil Blunsom、Timothee Lacroix，以及 Anthropic 的 Evan Hubinger、Tamera Lanham、Catherine Olsson、Nicholas Joseph、Trenton Bricken、Tristan Hume、Thariq Shihipar。Cohere / Mistral / Anthropic / Claude 官方页、Transformer Circuits、arXiv 和 Thariq 自站能支撑角色和贡献归属。
3. Perplexity、Hugging Face、xAI、字节 Seed 需要补来源后再入种子文件。它们有明显缺口，但当前公开 team/role 证据还不够稳定，不能和可执行新人混在一起。

## 生产覆盖快照

| 类型 | 机构 | 线上结果数 | 匹配结构 | 判断 |
| --- | --- | ---: | --- | --- |
| 前沿模型实验室 | OpenAI | 37 | past 17 / role 6 / current 13 / profile 1 | 覆盖够，但历史关系很多，展示已能解释 |
| 前沿模型实验室 | Anthropic | 14 | current 8 / role 3 / profile 3 | 可用，少量 profile 关系待核 |
| 前沿模型实验室 | DeepMind | 25 | past 3 / current 7 / role 4 / profile 11 | profile 偏多，需要后续补关系来源 |
| 前沿模型实验室 | xAI | 2 | current 1 / profile 1 | 明显偏薄，先补证据 |
| 前沿模型实验室 | Mistral | 2 | current 2 | 缺 Timothee Lacroix |
| 前沿模型实验室 | Cohere | 2 | current 2 | 缺 Nick Frosst / Ivan Zhang / Phil Blunsom，Joelle Pineau 是已有记录修复 |
| 前沿模型实验室 | Perplexity | 1 | profile 1 | Aravind 已存在但缺 role 关系；其他联合创始人先补证据 |
| 前沿模型实验室 | Hugging Face | 1 | current 1 | 缺 Thomas Wolf / Julien Chaumond，但需更硬角色来源 |
| 中国模型公司 | DeepSeek | 2 | past 1 / role 1 | 数量偏少，且当前关系解释不够清楚 |
| 中国模型公司 | Kimi | 1 | profile 1 | 杨植麟已存在，缺 role 关系 |
| 中国模型公司 | 智谱AI | 2 | profile 2 | 张鹏/唐杰可见，但关系质量偏 profile |
| 中国模型公司 | 百川智能 | 1 | current 1 | 基本可用，可后续补技术负责人 |
| 中国模型公司 | MiniMax | 1 | profile 1 | 闫俊杰已存在，缺 role 关系 |
| 中国模型公司 | 阿里巴巴 | 1 | profile 1 | 覆盖过薄，且命中样本不理想 |
| 中国模型公司 | 腾讯 | 2 | role 1 / current 1 | 覆盖偏薄 |
| 中国模型公司 | 字节跳动 | 0 | 无 | 明显缺口，优先找 Seed/豆包官方来源 |
| 中国模型公司 | 百度 | 2 | past 2 | 缺当前大模型人物和关系 |
| 大厂与平台 | Google | 71 | past 27 / current 21 / role 13 / profile 10 | 覆盖充足，后续重在降 profile 噪音 |
| 大厂与平台 | Microsoft | 14 | profile 1 / past 3 / current 5 / role 5 | 基本可用 |
| 大厂与平台 | Meta | 16 | current 6 / past 8 / profile 2 | 基本可用 |
| 大厂与平台 | Apple | 1 | profile 1 | 可后置，不是当前 AI 人物库主缺口 |
| 高校与研究机构 | Stanford | 48 | past 20 / role 21 / current 7 | 覆盖充足 |
| 高校与研究机构 | MIT | 9 | role 5 / profile 4 | 可用，需降低 profile 关系 |
| 高校与研究机构 | Berkeley | 28 | past 10 / profile 1 / current 6 / role 11 | 覆盖充足 |
| 高校与研究机构 | CMU | 16 | past 8 / profile 3 / current 3 / role 2 | 可用 |
| 高校与研究机构 | 清华大学 | 11 | role 4 / profile 3 / past 3 / current 1 | 可用，和中国公司关系有交叉待清 |
| 高校与研究机构 | 北京大学 | 2 | current 1 / role 1 | 偏薄但不是最先补 |
| 硬件与机器人 | Nvidia | 6 | current 2 / role 1 / profile 2 / past 1 | 可用 |
| 硬件与机器人 | Tesla | 4 | past 1 / role 2 / current 1 | 可用 |

## 可执行新人候选

这 11 位已放入 `roster_gap_seeds.json` 和 `roster_gap_enrichment.json`，可跑 newcomer preflight。

| 姓名 | 机构 | 建议角色 | 为什么补 | 来源 |
| --- | --- | --- | --- | --- |
| Nick Frosst | Cohere | founder | Cohere 当前只显示 Aidan Gomez 和 Jay Alammar，缺另一位联合创始人 | `https://cohere.com/about` |
| Ivan Zhang | Cohere | founder | Cohere 联合创始人，补齐公司创始层 | `https://cohere.com/about` |
| Phil Blunsom | Cohere | engineer | Cohere CTO，补工程/技术领导层 | `https://cohere.com/about` |
| Timothee Lacroix | Mistral | founder | Mistral 只显示 Arthur Mensch / Guillaume Lample，缺第三位联合创始人兼 CTO | `https://mistral.ai/company` |
| Evan Hubinger | Anthropic | researcher | Anthropic 对齐研究代表人物，补安全/对齐研究层 | `https://arxiv.org/abs/2401.05566` |
| Tamera Lanham | Anthropic | researcher | Sleeper Agents 作者之一，补对齐和安全研究层 | `https://arxiv.org/abs/2401.05566` |
| Catherine Olsson | Anthropic | researcher | transformer circuits / induction heads 代表人物 | `https://transformer-circuits.pub/2022/in-context-learning-and-induction-heads/index.html` |
| Nicholas Joseph | Anthropic | researcher | induction heads 作者之一，补机械可解释性研究层 | `https://transformer-circuits.pub/2022/in-context-learning-and-induction-heads/index.html` |
| Trenton Bricken | Anthropic | researcher | Towards Monosemanticity 作者之一，补 sparse autoencoder / dictionary learning 方向 | `https://transformer-circuits.pub/2023/monosemantic-features/index.html` |
| Tristan Hume | Anthropic | engineer | Toy Models / Monosemanticity 作者之一，补可解释性工程人物 | `https://transformer-circuits.pub/2023/monosemantic-features/index.html` |
| Thariq Shihipar | Anthropic | engineer | Claude Code 团队工程师，围绕 skills、dynamic workflows、HTML 输出和 agent 工程实践的开发者影响力高 | `https://www.thariq.io` / `https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code` / `https://x.com/trq212` |

## 现有人物优先修复

| 人物 | 当前问题 | 建议动作 |
| --- | --- | --- |
| Aravind Srinivas | 已有 `organization=["Perplexity"]`，但 Perplexity 筛选只显示 profile | 补 `PersonRole`：Co-founder & CEO @ Perplexity，状态 current |
| Joelle Pineau | 已有别名 Joelle/Joelle Pineau，但当前职位还停在 McGill/Facebook AI | 用 Cohere 官方来源更新现任为 Chief AI Officer @ Cohere，并保留旧履历 |
| Guillaume Lample | 当前 title 是 Mistral，profile organization 仍是 Facebook | 统一 profile organization 或补更清楚的 current role |
| Yang Zhilin / 杨植麟 | Kimi 只命中 profile | 补 Moonshot/Kimi current role 来源 |
| 闫俊杰 | MiniMax 只命中 profile | 补 MiniMax current role 来源 |
| 张鹏 / 唐杰 | 智谱AI 只命中 profile | 补 Zhipu/GLM 角色来源 |

## 需要补证据的人选

这些人可以作为下一轮新人候选，但还不进可执行 seed。

| 机构 | 人选 | 当前判断 |
| --- | --- | --- |
| Perplexity | Denis Yarats / Johnny Ho / Andy Konwinski | 高优先，但官方页抓取不稳定，需补公司页、新闻稿或可复核来源 |
| Hugging Face | Thomas Wolf / Julien Chaumond / Omar Sanseviero / Philipp Schmid | 高优先，官方 profile 可辅助身份，但角色和当前职位需更硬来源 |
| xAI | Igor Babuschkin / Jimmy Ba / Christian Szegedy / Ross Nordeen | xAI 公开 team 信息不稳定；Jimmy Ba 已在库，应先补关系而不是建人 |
| Anthropic | Jack Clark | 重要但偏政策/公共事务，本轮先不和工程/研究候选混入 |
| 字节跳动 | Seed/豆包核心技术负责人 | 线上为 0，优先补官方 Seed 站、技术报告作者页或发布稿证据 |
| DeepSeek | DeepSeek 核心研究/工程成员 | 线上关系弱，先补可靠来源再决定新人或关系修复 |

## 执行边界

- `roster_gap_seeds.json` 只放高置信新人，不放已有记录修复。
- `roster_gap_enrichment.json` 只做最小资料补全，不暗示已经 ready。
- 执行前跑 `node scripts/audit/preflight_newcomer_intake.mjs --seeds=docs/audit-2026-06/roster_gap_seeds.json --enrichment=docs/audit-2026-06/roster_gap_enrichment.json --verbose`。
- 通过 preflight 后仍只会插入或更新 candidate/profile 数据；晋级 ready 要走现有 readiness、source、card 和 avatar 门槛。

## 验证结果

已跑：

```bash
node scripts/audit/preflight_newcomer_intake.mjs --seeds=docs/audit-2026-06/roster_gap_seeds.json --enrichment=docs/audit-2026-06/roster_gap_enrichment.json --verbose
```

结果：

- 静态输入通过：seeds 11，enrichment 11，policy `2026-06-11`。
- candidate dry-run 通过：would insert 11，would update 0，ambiguous 0。
- 初次 enrichment dry-run 的 missing 11 是预期，因为 dry-run 阶段新人还未真实插入。
- content guard 通过：prune / career / relation / cards / conservative rewrite 均未发现回流。

已执行：

```bash
bun scripts/enrich/apply_roster_candidates.ts --seeds=docs/audit-2026-06/roster_gap_seeds.json --execute
bun scripts/enrich/apply_roster_enrichment.ts --seeds=docs/audit-2026-06/roster_gap_enrichment.json --execute
bun scripts/enrich/apply_candidate_deep_enrichment.ts --seeds=docs/audit-2026-06/roster_gap_enrichment.json --execute
node scripts/fix/apply_roster_gap_role_repairs.mjs --in=docs/audit-2026-06/data/roster_gap_role_repairs.json --execute
```

执行结果：

- 业务库新增 11 位 `candidate`：Cohere 3 位、Mistral 1 位、Anthropic 7 位。
- 富化更新 11 位：新增 official links、topics、products、topicDetails。
- 深度富化新增 16 条 `RawPoolItem`、16 条 QA keep 记录、24 张 starter cards。
- current role 修复新增 11 条 `PersonRole`，0 个缺人，0 个新建机构。
- 生产 API 验证：Anthropic 21 人且 Thariq Shihipar 为 `current`；Cohere 5 人；Mistral 3 人。
- readiness 验证：11 位仍在 `needs_source_depth`，保持 candidate，不晋级 ready。
