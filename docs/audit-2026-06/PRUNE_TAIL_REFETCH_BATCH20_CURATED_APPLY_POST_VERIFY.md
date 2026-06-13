# Refetch Source Apply

Generated at: 2026-06-10T19:27:28.293Z
Mode: dry-run
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch20_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 14 |
| selected source rows | 14 |
| skipped source/decision rows | 11 |
| existing RawPoolItems | 14 |
| raw inserted | 0 |
| raw updated | 14 |
| keep audits inserted | 0 |
| keep audits already existed | 14 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 7 |
| augment_source | 7 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 9 |
| official | 2 |
| paper | 3 |

## Top Hosts

| Host | Count |
| --- | --- |
| coursera.org | 2 |
| deeplearning.ai | 2 |
| blog.google | 1 |
| cs.tsinghua.edu.cn | 1 |
| hkforum.com | 1 |
| lilianweng.github.io | 1 |
| lingyiwanwu.com | 1 |
| mittrchina.com | 1 |
| openreview.net | 1 |
| papers.neurips.cc | 1 |
| semanticscholar.org | 1 |
| time.com | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| 吴恩达 | replace_source | exa | Generative AI for Everyone - DeepLearning.AI | deeplearning.ai | would_update_raw | keep_audit_exists |
| 吴恩达 | replace_source | exa | Generative AI for Everyone \| Coursera | coursera.org | would_update_raw | keep_audit_exists |
| 吴恩达 | replace_source | exa | Machine Learning \| Coursera | coursera.org | would_update_raw | keep_audit_exists |
| 吴恩达 | replace_source | exa | Machine Learning Specialization - DeepLearning.AI | deeplearning.ai | would_update_raw | keep_audit_exists |
| 唐杰 | replace_source | official | 唐杰-清华大学计算机科学与技术系 | cs.tsinghua.edu.cn | would_update_raw | keep_audit_exists |
| 李开复 | augment_source | exa | 李开复 - 香港中美论坛 | hkforum.com | would_update_raw | keep_audit_exists |
| 李开复 | augment_source | exa | 零一万物-AI2.0大模型技术和应用的全球公司 | lingyiwanwu.com | would_update_raw | keep_audit_exists |
| 李莲 | augment_source | exa | Why We Think \| Lil'Log | lilianweng.github.io | would_update_raw | keep_audit_exists |
| 李莲 | augment_source | paper | Lilian Weng \| OpenReview | openreview.net | would_update_raw | keep_audit_exists |
| 桑达尔·皮查伊 | augment_source | exa | How Sundar Pichai Pushed Google To the Front of the AI Race - TIME | time.com | would_update_raw | keep_audit_exists |
| 桑达尔·皮查伊 | augment_source | exa | 麻省理工科技评论-独家专访谷歌CEO桑达尔·皮查伊：基于我的个人经历 | mittrchina.com | would_update_raw | keep_audit_exists |
| 桑达尔·皮查伊 | replace_source | official | Sundar Pichai \| Google Blog | blog.google | would_update_raw | keep_audit_exists |
| 贾里德·卡普兰 | augment_source | paper | [PDF] Scaling Laws for Autoregressive Generative Modeling \| Semantic Scholar | semanticscholar.org | would_update_raw | keep_audit_exists |
| 阿希什·瓦斯瓦尼 | replace_source | paper | [PDF] Attention is All you Need - NIPS | papers.neurips.cc | would_update_raw | keep_audit_exists |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
