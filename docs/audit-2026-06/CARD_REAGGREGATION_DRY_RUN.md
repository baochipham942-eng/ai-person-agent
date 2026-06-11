# Card Reaggregation Dry Run

Generated at: 2026-06-10

## Context

Refetch source apply 已新增 417 条 source-backed RawPoolItem，并写入 417 条 QAAuditLog keep。卡片重聚合可以开始做小批量 dry-run，但不宜直接全量 execute。

原因：`scripts/enrich/regenerate_cards.ts` 当前是追加新卡，不替换旧卡，也不会删除旧弱来源生成的卡。直接 execute 可以提升新证据覆盖，但不能自动清理旧污染。

## Script Adjustment

`scripts/enrich/regenerate_cards.ts` 已新增 `--include-active`。旧脚本默认只覆盖 `ready`，但当前库内人物状态为：

| Status | Count |
| --- | ---: |
| active | 136 |
| ready | 94 |

本轮 refetch 覆盖的高增量人物里，周伯文、杨植麟、周明、黄铁军、刘知远等都是 `active`。不加 `--include-active` 会漏掉这批前台人物。

## Dry-run Samples

### 周伯文

Command:

```bash
bun scripts/enrich/regenerate_cards.ts --include-active --person=周伯文 --top-n=8 --min-items=3
```

Result:

- people=1
- raw=65
- audited=21
- usable=21
- existing cards=13
- generated=4
- unique after local dedupe=4

Sample titles:

- 掌舵上海人工智能实验室，开启AI研究新征程
- AI幻觉：从“技术缺陷”向“创造力”的演变
- 垂直大模型的底座逻辑：通用能力是高价值前提
- 智能演进“三化”趋势：体系化、多元化与高阶化

### 李开复

Command:

```bash
bun scripts/enrich/regenerate_cards.ts --person=李开复 --top-n=8 --min-items=3
```

Result:

- people=1
- raw=77
- audited=89
- usable=54
- existing cards=22
- generated=4
- unique after local dedupe=4

Sample titles:

- AI 2.0时代的“Windows系统”定位
- 2000张GPU的“以小博大”训练奇迹
- 三大科技时代的“杀手级应用”演变
- “AI六小虎”的预训练资金底气

### 李飞飞

Command:

```bash
bun scripts/enrich/regenerate_cards.ts --person=李飞飞 --top-n=8 --min-items=3
```

Result:

- people=1
- raw=94
- audited=105
- usable=55
- existing cards=27
- generated=6
- unique after local dedupe=6

Sample titles:

- 跨界产业界：出任谷歌云首席科学家
- 认知启发式AI：借鉴大脑进化的逻辑
- 掌舵斯坦福人工智能实验室（SAIL）
- 跨学科融合的研究范式
- 空间智能是AI完整性的最后拼图

## Decision

样本质量可进入小批量 execute，但需要先明确执行策略：

- 如果目标是快速补强前台内容，可只对 refetch 新增来源最多的 ready/active 人物执行追加卡片。
- 如果目标是内容清洁闭环，需要先做旧 Card 审计和删除/归档策略，再执行更像“重聚合”的替换流程。

本轮不自动全量 execute。
