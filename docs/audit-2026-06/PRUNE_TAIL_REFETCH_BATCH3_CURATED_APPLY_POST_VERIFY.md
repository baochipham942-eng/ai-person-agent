# Refetch Source Apply

Generated at: 2026-06-10T14:24:03.457Z
Mode: dry-run
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch3_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 8 |
| selected source rows | 8 |
| skipped source/decision rows | 13 |
| existing RawPoolItems | 8 |
| raw inserted | 0 |
| raw updated | 8 |
| keep audits inserted | 0 |
| keep audits already existed | 8 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 8 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 6 |
| official | 2 |

## Top Hosts

| Host | Count |
| --- | --- |
| colah.github.io | 1 |
| events.wired.com | 1 |
| forbes.com | 1 |
| meta.com | 1 |
| profiles.stanford.edu | 1 |
| static.sched.com | 1 |
| stvp.stanford.edu | 1 |
| thetwentyminutevc.com | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Aidan Gomez | replace_source | exa | Aidan Gomez, Co-founder & CEO @Cohere: What No One Understands About Foundation... | thetwentyminutevc.com | would_update_raw | keep_audit_exists |
| Alexandr Wang | replace_source | exa | Alexandr Wang | forbes.com | would_update_raw | keep_audit_exists |
| Alexandr Wang | replace_source | exa | Alexandr Wang, Chief AI Officer | meta.com | would_update_raw | keep_audit_exists |
| Chris Olah | replace_source | exa | [PDF] Chris Olah – - colah's blog | colah.github.io | would_update_raw | keep_audit_exists |
| Christopher Manning | replace_source | official | Christopher Manning's Profile \| Stanford Profiles | profiles.stanford.edu | would_update_raw | keep_audit_exists |
| Daniela Amodei | replace_source | exa | Speaker Details: WIRED: The Big Interview | events.wired.com | would_update_raw | keep_audit_exists |
| Daniela Amodei | replace_source | official | Daniela Amodei (Anthropic) – 'Helpful, Honest, Harmless' AI | stvp.stanford.edu | would_update_raw | keep_audit_exists |
| Han Xiao | replace_source | exa | [PDF] Generic Neural Elastic Search - Sched | static.sched.com | would_update_raw | keep_audit_exists |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
