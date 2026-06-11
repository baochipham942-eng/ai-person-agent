# Refetch Source Apply

Generated at: 2026-06-10T18:24:13.920Z
Mode: dry-run
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch16_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 6 |
| selected source rows | 6 |
| skipped source/decision rows | 6 |
| existing RawPoolItems | 6 |
| raw inserted | 0 |
| raw updated | 6 |
| keep audits inserted | 0 |
| keep audits already existed | 6 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 3 |
| augment_source | 3 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 3 |
| official | 2 |
| paper | 1 |

## Top Hosts

| Host | Count |
| --- | --- |
| 80000hours.org | 1 |
| aclanthology.org | 1 |
| alignment.anthropic.com | 1 |
| hwchung2.github.io | 1 |
| jan.leike.name | 1 |
| research.google | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Hyung Won Chung | replace_source | exa | Hyung Won Chung | hwchung2.github.io | would_update_raw | keep_audit_exists |
| Jan Leike | augment_source | exa | Jan Leike | jan.leike.name | would_update_raw | keep_audit_exists |
| Jan Leike | augment_source | exa | Jan Leike on OpenAI's massive push to make superintelligence safe in 4 years or... | 80000hours.org | would_update_raw | keep_audit_exists |
| Jan Leike | augment_source | official | Teaching Claude Why - Alignment Science Blog - Anthropic | alignment.anthropic.com | would_update_raw | keep_audit_exists |
| Jeremy Howard | replace_source | paper | Universal Language Model Fine-tuning for Text Classification | aclanthology.org | would_update_raw | keep_audit_exists |
| Oriol Vinyals | replace_source | official | Oriol Vinyals - Google Research | research.google | would_update_raw | keep_audit_exists |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
