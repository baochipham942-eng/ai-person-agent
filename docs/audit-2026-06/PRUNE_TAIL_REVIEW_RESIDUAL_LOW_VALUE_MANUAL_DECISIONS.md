# Prune Tail Review Manual Decisions

Generated at: 2026-06-10T22:05:29.288Z
Input: docs/audit-2026-06/data/prune_tail_review_unresolved_rows.json
Decision filter: explicit ids (5)

## Counts

| Metric | Value |
| --- | ---: |
| input rows | 19 |
| dependency skipped | 0 |
| decision rows | 5 |

## Source Type

| Source | Count |
| --- | ---: |
| x | 4 |
| exa | 1 |

## People

| Person | Count |
| --- | ---: |
| Andrej Karpathy | 1 |
| Chris Olah | 1 |
| Demis Hassabis | 1 |
| Noam Shazeer | 1 |
| 杰夫·迪恩 | 1 |

## Decisions

| Person | Source | Refetch | Target | Reason |
| --- | --- | --- | --- | --- |
| Andrej Karpathy | exa | human_review | About | 官方“关于”页面，但内容过于简略，仅作为个人主页的跳转链接。 |
| Chris Olah | x | human_review | Our interpretability team is planning to mentor more fellows this cycle! | 属于团队招募和导师计划的公告，非技术观点分享。 |
| Demis Hassabis | x | human_review | announcing Gemini 3 speed/performance advancements) | 官方发布的 Gemini 3 性能更新简讯，信息密度较低。 |
| Noam Shazeer | x | human_review | As a friendly competitor in the AI space, we share a core mission of building AI technolo... | 虽然来自官方账号，但内容属于泛泛而谈的愿景陈述，信息密度较低。 |
| 杰夫·迪恩 | x | human_review | It has been a productive 2025! It's wonderful working with such amazing colleagues at @Go... | 官方账号发布，提及个人工作感受，但内容较泛，需人工判断是否值得入库。 |

## Safety

- This file only converts already-exported review rows into an explicit manual decision queue.
- Rows with active Card.sourceUrl or People display/source JSON dependencies are skipped.
- Apply with `apply_hard_tail_manual_decisions.mjs`; default mode there is dry-run.
