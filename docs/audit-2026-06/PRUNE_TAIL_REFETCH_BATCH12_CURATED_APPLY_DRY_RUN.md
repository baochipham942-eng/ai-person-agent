# Refetch Source Apply

Generated at: 2026-06-10T17:14:16.218Z
Mode: dry-run
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch12_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 8 |
| selected source rows | 8 |
| skipped source/decision rows | 13 |
| existing RawPoolItems | 5 |
| raw inserted | 3 |
| raw updated | 5 |
| keep audits inserted | 3 |
| keep audits already existed | 5 |

## Decisions

| Decision | Count |
| --- | --- |
| augment_source | 5 |
| replace_source | 3 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 3 |
| official | 4 |
| paper | 1 |

## Top Hosts

| Host | Count |
| --- | --- |
| ai.meta.com | 1 |
| arxiv.org | 1 |
| businessinsider.com | 1 |
| digg.com | 1 |
| engineering.nyu.edu | 1 |
| lexfridman.com | 1 |
| research.google | 1 |
| research.google.com | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Matthew Berman | augment_source | exa | Matthew Berman, Forward Future AI newsletter founder, bans generative AI from w... | digg.com | would_insert_raw | would_insert_keep_audit |
| Oriol Vinyals | augment_source | exa | Oriol Vinyals: DeepMind AlphaStar, StarCraft, Language, and Sequences \| MIT \| A... | lexfridman.com | would_update_raw | keep_audit_exists |
| Oriol Vinyals | replace_source | official | Oriol Vinyals - Google Research | research.google | would_update_raw | keep_audit_exists |
| Oriol Vinyals | augment_source | official | Oriol Vinyals - Research at Google | research.google.com | would_update_raw | keep_audit_exists |
| Oriol Vinyals | augment_source | paper | [PDF] Sequence to Sequence Learning with Neural Networks - arXiv | arxiv.org | would_insert_raw | would_insert_keep_audit |
| Sam Altman | augment_source | exa | Sam Altman: Cost of Using AI Will Drop by 10 Times Every Year - Business Insider | businessinsider.com | would_insert_raw | would_insert_keep_audit |
| Yann LeCun | replace_source | official | Yann LeCun - AI at Meta | ai.meta.com | would_update_raw | keep_audit_exists |
| Yann LeCun | replace_source | official | Yann LeCun \| NYU Tandon School of Engineering | engineering.nyu.edu | would_update_raw | keep_audit_exists |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
