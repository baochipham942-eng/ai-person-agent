# Refetch Source Apply

Generated at: 2026-06-10T19:12:20.736Z
Mode: dry-run
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch19_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 15 |
| selected source rows | 15 |
| skipped source/decision rows | 6 |
| existing RawPoolItems | 12 |
| raw inserted | 3 |
| raw updated | 12 |
| keep audits inserted | 3 |
| keep audits already existed | 12 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 14 |
| augment_source | 1 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 8 |
| official | 7 |

## Top Hosts

| Host | Count |
| --- | --- |
| time.com | 2 |
| yann.lecun.com | 2 |
| ai.meta.com | 1 |
| businessinsider.com | 1 |
| cims.nyu.edu | 1 |
| cis.upenn.edu | 1 |
| engineering.nyu.edu | 1 |
| lexfridman.com | 1 |
| pdfs.semanticscholar.org | 1 |
| profiles.stanford.edu | 1 |
| research.google | 1 |
| simons.berkeley.edu | 1 |
| theatlantic.com | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Noam Shazeer | replace_source | exa | Noam Shazeer - TIME | time.com | would_update_raw | keep_audit_exists |
| Oriol Vinyals | replace_source | official | Oriol Vinyals - Google Research | research.google | would_update_raw | keep_audit_exists |
| Percy Liang | replace_source | official | Percy Liang's Profile \| Stanford Profiles | profiles.stanford.edu | would_update_raw | keep_audit_exists |
| Sam Altman | replace_source | exa | Does Sam Altman Know What He's Creating? - The Atlantic | theatlantic.com | would_update_raw | keep_audit_exists |
| Sam Altman | replace_source | exa | Sam Altman: The 100 Most Influential People in AI 2025 - TIME | time.com | would_update_raw | keep_audit_exists |
| Sam Altman | replace_source | exa | Transcript for Sam Altman: OpenAI, GPT-5, Sora, Board Saga, Elon ... | lexfridman.com | would_update_raw | keep_audit_exists |
| Wojciech Zaremba | augment_source | official | Alumni Q&A with Wojciech Zaremba, Co-Founder of OpenAI | cims.nyu.edu | would_update_raw | keep_audit_exists |
| Yann LeCun | replace_source | exa | [bib2web] Yann LeCun's Publications | yann.lecun.com | would_update_raw | keep_audit_exists |
| Yann LeCun | replace_source | exa | [PDF] Gradient-based Learning Applied to Document Recognition | pdfs.semanticscholar.org | would_update_raw | keep_audit_exists |
| Yann LeCun | replace_source | exa | Yann LeCun's Home Page | yann.lecun.com | would_update_raw | keep_audit_exists |
| Yann LeCun | replace_source | official | Yann LeCun - AI at Meta | ai.meta.com | would_update_raw | keep_audit_exists |
| Yann LeCun | replace_source | official | Yann LeCun \| NYU Tandon School of Engineering | engineering.nyu.edu | would_update_raw | keep_audit_exists |
| Yoshua Bengio | replace_source | official | [PDF] Markovian Models for Sequential Data - UPenn CIS | cis.upenn.edu | would_insert_raw | would_insert_keep_audit |
| Yoshua Bengio | replace_source | official | Superintelligent Agents Pose Catastrophic Risks — Can Scientist AI Offer a Safe... | simons.berkeley.edu | would_insert_raw | would_insert_keep_audit |
| 乔尔·皮诺 | replace_source | exa | Meta AI Research Head Leaves As AI Investment Soars Into the Billions - Busines... | businessinsider.com | would_insert_raw | would_insert_keep_audit |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
