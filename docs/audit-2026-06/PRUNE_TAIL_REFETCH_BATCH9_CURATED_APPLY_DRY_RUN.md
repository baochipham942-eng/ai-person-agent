# Refetch Source Apply

Generated at: 2026-06-10T16:19:54.099Z
Mode: dry-run
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch9_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 20 |
| selected source rows | 20 |
| skipped source/decision rows | 3 |
| existing RawPoolItems | 8 |
| raw inserted | 12 |
| raw updated | 8 |
| keep audits inserted | 12 |
| keep audits already existed | 8 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 14 |
| augment_source | 6 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 16 |
| paper | 1 |
| official | 2 |
| youtube | 1 |

## Top Hosts

| Host | Count |
| --- | --- |
| aiforvietnam.org | 1 |
| arxiv.org | 1 |
| blog.samaltman.com | 1 |
| blogs.microsoft.com | 1 |
| cifar.ca | 1 |
| dwarkesh.com | 1 |
| forbes.com | 1 |
| fortune.com | 1 |
| forum.openai.com | 1 |
| fulbright.edu.vn | 1 |
| hwchung2.github.io | 1 |
| jan.leike.name | 1 |
| madrona.com | 1 |
| mila.quebec | 1 |
| ted.com | 1 |
| tedai-sanfrancisco.ted.com | 1 |
| thebulletin.org | 1 |
| theverge.com | 1 |
| time.com | 1 |
| youtube.com | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Greg Brockman | replace_source | exa | Meet the power broker of the AI age: OpenAI's 'builder-in-chief' helping to tur... | fortune.com | would_insert_raw | would_insert_keep_audit |
| Guillaume Lample | augment_source | exa | Guillaume Lample - Forbes | forbes.com | would_update_raw | keep_audit_exists |
| Guillaume Lample | replace_source | paper | [PDF] arXiv:1901.07291v1 [cs.CL] 22 Jan 2019 | arxiv.org | would_update_raw | keep_audit_exists |
| Hyung Won Chung | replace_source | exa | Hyung Won Chung | hwchung2.github.io | would_update_raw | keep_audit_exists |
| Jan Leike | replace_source | exa | Jan Leike | jan.leike.name | would_insert_raw | would_insert_keep_audit |
| Lukasz Kaiser | augment_source | exa | Lukasz Kaiser: What if AI stops guessing and starts reasoning? | ted.com | would_update_raw | keep_audit_exists |
| Lukasz Kaiser | augment_source | official | Virtual Event: Learning Powerful Models: From Transformers to Reasoners and Bey... | forum.openai.com | would_insert_raw | would_insert_keep_audit |
| Mustafa Suleyman | augment_source | exa | IA Summit 2024: From SaaS to Agents With Mustafa Suleyman | madrona.com | would_insert_raw | would_insert_keep_audit |
| Mustafa Suleyman | augment_source | exa | Microsoft AI chief walks back comments about AI taking over white-collar work \|... | theverge.com | would_insert_raw | would_insert_keep_audit |
| Mustafa Suleyman | replace_source | official | Mustafa Suleyman, DeepMind and Inflection Co-founder, joins Microsoft to lead C... | blogs.microsoft.com | would_update_raw | keep_audit_exists |
| Percy Liang | replace_source | exa | Percy Liang \| TEDAI San Francisco | tedai-sanfrancisco.ted.com | would_insert_raw | would_insert_keep_audit |
| Quoc Le | replace_source | exa | Dr. Quoc Le and Ben Wilkinson join Fulbright University Vietnam Board | fulbright.edu.vn | would_insert_raw | would_insert_keep_audit |
| Quoc Le | replace_source | exa | Dr. Quoc V. Le – Senior Advisor \| AI for Vietnam | aiforvietnam.org | would_insert_raw | would_insert_keep_audit |
| Sam Altman | replace_source | exa | The Gentle Singularity - Sam Altman | blog.samaltman.com | would_update_raw | keep_audit_exists |
| Shane Legg | augment_source | exa | Shane Legg (DeepMind Founder) — 2028 AGI, superhuman ... | dwarkesh.com | would_insert_raw | would_insert_keep_audit |
| Yoshua Bengio | replace_source | exa | ‘AI Godfather’ Yoshua Bengio: We need a humanity defense organization - Bulleti... | thebulletin.org | would_insert_raw | would_insert_keep_audit |
| Yoshua Bengio | replace_source | exa | Yoshua Bengio - Mila - Quebec Artificial Intelligence Institute | mila.quebec | would_update_raw | keep_audit_exists |
| Yoshua Bengio | replace_source | exa | Yoshua Bengio – CIFAR | cifar.ca | would_update_raw | keep_audit_exists |
| Yoshua Bengio | replace_source | exa | Yoshua Bengio \| TIME | time.com | would_insert_raw | would_insert_keep_audit |
| Yoshua Bengio | replace_source | youtube | Interview with Yoshua Bengio on Mila's Major Scientific and Social Impact | youtube.com | would_insert_raw | would_insert_keep_audit |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
