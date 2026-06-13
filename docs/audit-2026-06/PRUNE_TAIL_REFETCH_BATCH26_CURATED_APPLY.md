# Refetch Source Apply

Generated at: 2026-06-10T20:54:23.479Z
Mode: execute
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch26_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 15 |
| eligible source rows | 8 |
| selected source rows | 8 |
| skipped source/decision rows | 5 |
| existing RawPoolItems | 4 |
| raw inserted | 4 |
| raw updated | 4 |
| keep audits inserted | 4 |
| keep audits already existed | 4 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 8 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 5 |
| official | 3 |

## Top Hosts

| Host | Count |
| --- | --- |
| ai.meta.com | 2 |
| aisfoundation.ai | 1 |
| bbc.com | 1 |
| blog.google | 1 |
| meta.com | 1 |
| mustafa-suleyman.ai | 1 |
| tedai-sanfrancisco.ted.com | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Mustafa Suleyman | replace_source | exa | Mustafa Suleyman | mustafa-suleyman.ai | updated_raw | keep_audit_exists |
| Mustafa Suleyman | replace_source | exa | The Interview \| Mustafa Suleyman, Artificial Intelligence pioneer - BBC | bbc.com | inserted_raw | inserted_keep_audit |
| Shane Legg | replace_source | exa | Shane Legg - Nominating Committee - The AI Safety Foundation | aisfoundation.ai | inserted_raw | inserted_keep_audit |
| Shane Legg | replace_source | exa | Shane Legg \| TEDAI San Francisco | tedai-sanfrancisco.ted.com | updated_raw | keep_audit_exists |
| Yann LeCun | replace_source | official | V-JEPA: The next step toward advanced machine intelligence | ai.meta.com | inserted_raw | inserted_keep_audit |
| Yann LeCun | replace_source | official | Yann LeCun - AI at Meta | ai.meta.com | updated_raw | keep_audit_exists |
| 科拉伊·卡武克丘奥卢 | replace_source | official | Koray Kavukcuoglu - Google Blog | blog.google | updated_raw | keep_audit_exists |
| 马克·扎克伯格 | replace_source | exa | Mark Zuckerberg, Founder, Chairman and Chief Executive Officer | meta.com | inserted_raw | inserted_keep_audit |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
