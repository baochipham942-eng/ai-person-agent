# Card Reaggregation Apply

Generated at: 2026-06-10T08:41:16.011Z
Mode: execute
Plan: docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_plan.json
Review: docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_plan_mimo_review.json

## Counts

| Metric | Value |
| --- | --- |
| people considered | 1 |
| people eligible | 1 |
| existing cards | 15 |
| replacement cards | 5 |
| skipped people | 0 |

## People

| Person | Status | Existing Cards | Replacement Cards | Skipped |
| --- | --- | --- | --- | --- |
| 杨植麟 | active | 15 | 5 |  |

## Replacement Samples

### 杨植麟

- insight/4: 训练模型本质上是在创造世界观 — 杨植麟提出，做模型的过程本质上是在创造一种世界观，它体现了团队对于“一个好的AI应该是什么样、应该追求何种价值观”的理解。在他看来，每个token都是独一无二的，因此训练出来的每个模型也都是独一无二的，这决定了AI的底色。
- fact/5: 账面现金超百亿且短期内不急于上市 — 2025年底，月之暗面完成5亿美元C轮融资，估值达43亿美元。创始人杨植麟在内部信中透露，公司账面现金储备已突破100亿元人民币。他明确表示，由于可以从一级市场募集更大量资金，公司短期内不着急上市，资金将用于更激进地扩增AI芯片及研发下一...
- story/4: 早期参与Transformer语言模型研发并回国 — 2017年Transformer架构提出后，杨植麟于2018年在Google Brain与同事开始训练基于Transformer的语言模型，成为全球最早探索该方向的研究者之一。2019年，看好国内政策、风投及人才环境的他，毅然选择回国创业...
- method/4: 2025年Kimi的两大技术进化主线 — 为应对Agentic智能时代对长程任务处理的需求，杨植麟团队确立了两大技术进化主线：一是提升“Token Efficiency”（Token效率），以在有限数据下冲击更高的智能上限；二是持续扩展“长上下文”能力，满足智能体长程记忆的需求。
- fact/3: 师从多位AI巨擘的顶尖学术履历 — 杨植麟拥有极强的学术背景，他在清华大学本科期间师从唐杰教授；在卡内基梅隆大学（CMU）攻读博士期间，导师为机器学习泰斗 Ruslan Salakhutdinov 和 William W. Cohen。此后，他还在 Meta AI 与 Ja...

## Execution Rule

- Dry-run only unless --execute is passed.
- Execute mode requires --person and hard-replaces that person's Card rows.
- Archive JSON contains the current cards and replacement cards for rollback/review.
