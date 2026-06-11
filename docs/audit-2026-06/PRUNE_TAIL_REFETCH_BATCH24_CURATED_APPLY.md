# Refetch Source Apply

Generated at: 2026-06-10T20:28:56.643Z
Mode: execute
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch24_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 9 |
| selected source rows | 9 |
| skipped source/decision rows | 12 |
| existing RawPoolItems | 5 |
| raw inserted | 4 |
| raw updated | 5 |
| keep audits inserted | 4 |
| keep audits already existed | 5 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 5 |
| augment_source | 4 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 3 |
| official | 3 |
| podcast | 1 |
| youtube | 2 |

## Top Hosts

| Host | Count |
| --- | --- |
| research.google | 2 |
| youtube.com | 2 |
| engineering.stanford.edu | 1 |
| innovatorsunder35.com | 1 |
| noamshazeer.com | 1 |
| podcasts.apple.com | 1 |
| technologyreview.com | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Noam Shazeer | replace_source | exa | Noam Shazeer \| AI Scientist, Google Gemini Co-Lead | noamshazeer.com | updated_raw | keep_audit_exists |
| Noam Shazeer | replace_source | official | Noam Shazeer | research.google | updated_raw | keep_audit_exists |
| Oriol Vinyals | augment_source | exa | Oriol Vinyals \| Innovators Under 35 | innovatorsunder35.com | inserted_raw | inserted_keep_audit |
| Oriol Vinyals | augment_source | exa | Oriol Vinyals \| MIT Technology Review | technologyreview.com | updated_raw | keep_audit_exists |
| Oriol Vinyals | augment_source | podcast | Gemini 2.0 and the Evolution o… - Google DeepMind: The Podcast - Apple Podcasts | podcasts.apple.com | inserted_raw | inserted_keep_audit |
| Oriol Vinyals | augment_source | youtube | Gemini 2.0 and the evolution of agentic AI \| Oriol Vinyals | youtube.com | inserted_raw | inserted_keep_audit |
| Percy Liang | replace_source | official | Percy Liang \| Stanford University School of Engineering | engineering.stanford.edu | updated_raw | keep_audit_exists |
| 杰夫·迪恩 | replace_source | official | Jeffrey Dean - Google Research | research.google | updated_raw | keep_audit_exists |
| 杰夫·迪恩 | replace_source | youtube | Gemini co-leads on project origins and what's next | youtube.com | inserted_raw | inserted_keep_audit |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
