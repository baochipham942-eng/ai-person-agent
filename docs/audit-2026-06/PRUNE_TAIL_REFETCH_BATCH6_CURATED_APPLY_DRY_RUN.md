# Refetch Source Apply

Generated at: 2026-06-10T15:24:54.584Z
Mode: dry-run
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch6_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 14 |
| selected source rows | 14 |
| skipped source/decision rows | 9 |
| existing RawPoolItems | 6 |
| raw inserted | 8 |
| raw updated | 6 |
| keep audits inserted | 8 |
| keep audits already existed | 6 |

## Decisions

| Decision | Count |
| --- | --- |
| augment_source | 7 |
| replace_source | 7 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 5 |
| podcast | 2 |
| official | 7 |

## Top Hosts

| Host | Count |
| --- | --- |
| podcasts.apple.com | 2 |
| cdn.openai.com | 1 |
| cifar.ca | 1 |
| cs.mcgill.ca | 1 |
| cs.stanford.edu | 1 |
| hai.stanford.edu | 1 |
| newyorker.com | 1 |
| profiles.stanford.edu | 1 |
| research.google.com | 1 |
| simons.berkeley.edu | 1 |
| ted.com | 1 |
| thetwentyminutevc.com | 1 |
| wandb.ai | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Mustafa Suleyman | augment_source | exa | Mustafa Suleyman \| Speaker - TED Talks | ted.com | would_update_raw | keep_audit_exists |
| Mustafa Suleyman | augment_source | podcast | What is an AI anyway? \| Mustaf… - TED Talks Daily - Apple Podcasts | podcasts.apple.com | would_insert_raw | would_insert_keep_audit |
| Oriol Vinyals | replace_source | official | Oriol Vinyals - Research at Google | research.google.com | would_insert_raw | would_insert_keep_audit |
| Percy Liang | replace_source | official | Jacob Steinhardt | simons.berkeley.edu | would_insert_raw | would_insert_keep_audit |
| Percy Liang | replace_source | official | Percy Liang - Stanford Computer Science | cs.stanford.edu | would_update_raw | keep_audit_exists |
| Percy Liang | replace_source | official | Percy Liang - Stanford HAI | hai.stanford.edu | would_update_raw | keep_audit_exists |
| Percy Liang | replace_source | official | Percy Liang - Stanford Profiles | profiles.stanford.edu | would_insert_raw | would_insert_keep_audit |
| Sam Altman | augment_source | exa | Sam Altman May Control Our Future—Can He Be Trusted? | newyorker.com | would_insert_raw | would_insert_keep_audit |
| Wojciech Zaremba | augment_source | exa | Wojciech Zaremba — What Could Make AI Conscious? \| gradient-dissent – Weights &... | wandb.ai | would_insert_raw | would_insert_keep_audit |
| Wojciech Zaremba | augment_source | podcast | Wojciech Zaremba — What Could Make AI Conscious? - Gradient Dissent: Conversati... | podcasts.apple.com | would_insert_raw | would_insert_keep_audit |
| Yann LeCun | replace_source | exa | 20VC: Yann LeCun on Why Artificial Intelligence Will Not Dominate Humanity, Why... | thetwentyminutevc.com | would_insert_raw | would_insert_keep_audit |
| 乔尔·皮诺 | augment_source | exa | Joelle Pineau – CIFAR | cifar.ca | would_update_raw | keep_audit_exists |
| 乔尔·皮诺 | augment_source | official | Joelle Pineau's Home | cs.mcgill.ca | would_update_raw | keep_audit_exists |
| 亚历克·拉德福德 | replace_source | official | [PDF] Language Models are Unsupervised Multitask Learners \| OpenAI | cdn.openai.com | would_update_raw | keep_audit_exists |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
