# Refetch Source Apply

Generated at: 2026-06-10T17:34:40.359Z
Mode: execute
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch13_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 4 |
| selected source rows | 4 |
| skipped source/decision rows | 13 |
| existing RawPoolItems | 1 |
| raw inserted | 3 |
| raw updated | 1 |
| keep audits inserted | 3 |
| keep audits already existed | 1 |

## Decisions

| Decision | Count |
| --- | --- |
| augment_source | 4 |

## Source Types

| Source type | Count |
| --- | --- |
| official | 2 |
| exa | 2 |

## Top Hosts

| Host | Count |
| --- | --- |
| essential.ai | 1 |
| nvidia.com | 1 |
| research.google | 1 |
| wewic.com | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| 布莱恩·卡坦扎罗 | augment_source | official | Fireside Chat with David Luan and Bryan Catanzaro: The Future of AI and the Pat... | nvidia.com | inserted_raw | inserted_keep_audit |
| 杰夫·迪恩 | augment_source | exa | 谷歌首席科学家迪恩：AI专用硬件的进步，将会促进更多科学发现，以及更强大的智能体-世界创新大会（WIC）官网 | wewic.com | inserted_raw | inserted_keep_audit |
| 杰夫·迪恩 | augment_source | official | Jeffrey Dean | research.google | updated_raw | keep_audit_exists |
| 阿希什·瓦斯瓦尼 | augment_source | exa | Essential AI | essential.ai | inserted_raw | inserted_keep_audit |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
