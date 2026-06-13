# Refetch Source Apply

Generated at: 2026-06-10T16:58:10.562Z
Mode: dry-run
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch11_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 5 |
| selected source rows | 5 |
| skipped source/decision rows | 13 |
| existing RawPoolItems | 2 |
| raw inserted | 3 |
| raw updated | 2 |
| keep audits inserted | 3 |
| keep audits already existed | 2 |

## Decisions

| Decision | Count |
| --- | --- |
| augment_source | 3 |
| replace_source | 2 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 3 |
| official | 2 |

## Top Hosts

| Host | Count |
| --- | --- |
| anthropic.com | 1 |
| fortune.com | 1 |
| hwchung2.github.io | 1 |
| nbcnews.com | 1 |
| stvp.stanford.edu | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Daniela Amodei | augment_source | exa | Anthropic cofounder says studying the humanities will be 'more important than e... | fortune.com | would_insert_raw | would_insert_keep_audit |
| Daniela Amodei | augment_source | official | Anthropic raises $124 million to build more reliable, general AI systems \ Anth... | anthropic.com | would_insert_raw | would_insert_keep_audit |
| Daniela Amodei | augment_source | official | Daniela Amodei (Anthropic) – ‘Helpful, Honest, Harmless’ AI \| Stanford Technolo... | stvp.stanford.edu | would_update_raw | keep_audit_exists |
| Elon Musk | replace_source | exa | Elon Musk launches Grokipedia as an alternative to 'woke' Wikipedia | nbcnews.com | would_insert_raw | would_insert_keep_audit |
| Hyung Won Chung | replace_source | exa | Hyung Won Chung | hwchung2.github.io | would_update_raw | keep_audit_exists |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
