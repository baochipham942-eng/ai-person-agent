# Refetch Source Apply

Generated at: 2026-06-10T08:14:04.782Z
Mode: execute
Input: docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_tertiary_tavily_mimo.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 27 |
| eligible source rows | 6 |
| selected source rows | 6 |
| skipped source/decision rows | 23 |
| existing RawPoolItems | 1 |
| raw inserted | 5 |
| raw updated | 1 |
| keep audits inserted | 5 |
| keep audits already existed | 1 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 4 |
| augment_source | 2 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 4 |
| podcast | 1 |
| official | 1 |

## Top Hosts

| Host | Count |
| --- | --- |
| amazon.com.au | 1 |
| chuangxin.com | 1 |
| edge.org | 1 |
| hub.baai.ac.cn | 1 |
| podcasts.apple.com | 1 |
| sohu.com | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| 凯文·斯科特 | replace_source | exa | Amazon.com.au: Kevin Scott: books, biography, latest update | amazon.com.au | inserted_raw | inserted_keep_audit |
| 凯文·斯科特 | replace_source | podcast | Behind The Tech with Kevin Scott - 播客 - Apple 播客 | podcasts.apple.com | inserted_raw | inserted_keep_audit |
| 周明 | replace_source | exa | 首席科学家 - 创新工场 | chuangxin.com | updated_raw | keep_audit_exists |
| 李开复 | replace_source | exa | We Are Here To Create \| Edge.org | edge.org | inserted_raw | inserted_keep_audit |
| 李飞飞 | augment_source | exa | 产业之声 \| 斯坦福HAI《2025年人工智能指数报告》解读_模型_Qwen-VL-Max_全球 | sohu.com | inserted_raw | inserted_keep_audit |
| 李飞飞 | augment_source | official | 刚刚，李飞飞团队发布《2025年人工智能指数报告》：12大趋势证明，AI不再只是关于可能性的故事 - 智源社区 | hub.baai.ac.cn | inserted_raw | inserted_keep_audit |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
