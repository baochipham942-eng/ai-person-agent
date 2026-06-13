# Refetch Source Apply

Generated at: 2026-06-10T20:41:31.894Z
Mode: execute
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch25_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 4 |
| selected source rows | 4 |
| skipped source/decision rows | 16 |
| existing RawPoolItems | 2 |
| raw inserted | 2 |
| raw updated | 2 |
| keep audits inserted | 2 |
| keep audits already existed | 2 |

## Decisions

| Decision | Count |
| --- | --- |
| augment_source | 2 |
| replace_source | 2 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 3 |
| official | 1 |

## Top Hosts

| Host | Count |
| --- | --- |
| cnbc.com | 1 |
| cs.toronto.edu | 1 |
| essential.ai | 1 |
| every.to | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Boris Cherny | augment_source | exa | Transcript: 'How to Use Claude Code Like the People Who Built It' | every.to | inserted_raw | inserted_keep_audit |
| Ilya Sutskever | replace_source | official | Ilya Sutskever's home page | cs.toronto.edu | updated_raw | keep_audit_exists |
| 阿希什·瓦斯瓦尼 | augment_source | exa | Essential AI | essential.ai | updated_raw | keep_audit_exists |
| 黄仁勋 | replace_source | exa | Nvidia CEO Huang at Stanford: Pain and suffering breeds success | cnbc.com | inserted_raw | inserted_keep_audit |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
