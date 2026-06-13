# Refetch Source Apply

Generated at: 2026-06-10T20:13:01.175Z
Mode: execute
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch23_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 2 |
| selected source rows | 2 |
| skipped source/decision rows | 18 |
| existing RawPoolItems | 0 |
| raw inserted | 2 |
| raw updated | 0 |
| keep audits inserted | 2 |
| keep audits already existed | 0 |

## Decisions

| Decision | Count |
| --- | --- |
| augment_source | 2 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 2 |

## Top Hosts

| Host | Count |
| --- | --- |
| dwarkesh.com | 1 |
| wired.com | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Ilya Sutskever | augment_source | exa | Ilya Sutskever (OpenAI Chief Scientist) - Building AGI, Alignment ... | dwarkesh.com | inserted_raw | inserted_keep_audit |
| Mira Murati | augment_source | exa | Exclusive: Mira Murati’s Stealth AI Lab Launches Its First Product | wired.com | inserted_raw | inserted_keep_audit |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
