# Card Reaggregation Apply

Generated at: 2026-06-10T08:41:02.002Z
Mode: execute
Plan: docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_plan.json
Review: docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_plan_mimo_review.json

## Counts

| Metric | Value |
| --- | --- |
| people considered | 1 |
| people eligible | 1 |
| existing cards | 18 |
| replacement cards | 3 |
| skipped people | 0 |

## People

| Person | Status | Existing Cards | Replacement Cards | Skipped |
| --- | --- | --- | --- | --- |
| 周明 | active | 18 | 3 |  |

## Replacement Samples

### 周明

- insight/4: 2024大模型落地元年的双重驱动 — 周明指出，2024年是大模型落地元年。这一趋势由双重因素驱动：一方面，大模型技术经过快速迭代，已具备了实际落地的能力；另一方面，企业面临降本增效的迫切需求，在业务实践中积累了丰富的数据和落地场景，为大模型的商业化应用提供了土壤。
- fact/4: 担任创新工场首席科学家 — 周明博士担任创新工场首席科学家。他是世界顶级的AI科学家，自然语言处理领域的代表性人物，曾任微软亚洲研究院副院长、国际计算语言学协会（ACL）主席。
- insight/3: NLP技术演进的三大历史阶段 — 周明在ACL 2019大会演讲中指出，ACL的历史几乎就是NLP的历史。NLP技术的发展经历了三个主要起伏阶段：早期基于规则的方法、随后基于统计学习的方法，以及当前基于深度神经网络（DNN）的方法。经过几代人的努力，NLP已形成扎实的理论...

## Execution Rule

- Dry-run only unless --execute is passed.
- Execute mode requires --person and hard-replaces that person's Card rows.
- Archive JSON contains the current cards and replacement cards for rollback/review.
