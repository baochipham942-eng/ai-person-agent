# Refetch Source Apply

Generated at: 2026-06-10T16:04:58.349Z
Mode: dry-run
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch8_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 24 |
| selected source rows | 24 |
| skipped source/decision rows | 3 |
| existing RawPoolItems | 24 |
| raw inserted | 0 |
| raw updated | 24 |
| keep audits inserted | 0 |
| keep audits already existed | 24 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 19 |
| augment_source | 5 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 19 |
| youtube | 1 |
| official | 3 |
| podcast | 1 |

## Top Hosts

| Host | Count |
| --- | --- |
| forbes.com | 3 |
| nobelprize.org | 3 |
| time.com | 2 |
| achievement.org | 1 |
| aidangomez.ca | 1 |
| colah.github.io | 1 |
| corporate-awards.ieee.org | 1 |
| cs.toronto.edu | 1 |
| darioamodei.com | 1 |
| discover.research.utoronto.ca | 1 |
| docs.getunbound.ai | 1 |
| dwarkesh.com | 1 |
| isomorphiclabs.com | 1 |
| mastersofscale.com | 1 |
| nlp.stanford.edu | 1 |
| podcasts.apple.com | 1 |
| polytechnique.edu | 1 |
| stability.ai | 1 |
| youtube.com | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Aidan Gomez | replace_source | exa | Aidan Gomez \| Computer Science & Mathematics | aidangomez.ca | would_update_raw | keep_audit_exists |
| Aidan Gomez | replace_source | exa | Aidan Gomez: The 100 Most Influential People in AI 2023 - TIME | time.com | would_update_raw | keep_audit_exists |
| Alexandr Wang | replace_source | exa | Alexandr Wang on Masters of Scale | mastersofscale.com | would_update_raw | keep_audit_exists |
| Andrej Karpathy | augment_source | exa | Andrej Karpathy — AGI is still a decade away - Dwarkesh Podcast | dwarkesh.com | would_update_raw | keep_audit_exists |
| Andrej Karpathy | augment_source | exa | Andrej Karpathy's LLM Council - Unbound Security | docs.getunbound.ai | would_update_raw | keep_audit_exists |
| Andrej Karpathy | augment_source | youtube | Andrej Karpathy — “We're summoning ghosts, not building animals” | youtube.com | would_update_raw | keep_audit_exists |
| Arthur Mensch | replace_source | official | Arthur Mensch, CEO of Mistral, acting as a big brother at École ... | polytechnique.edu | would_update_raw | keep_audit_exists |
| Chris Olah | replace_source | exa | Chris Olah: The 100 Most Influential People in AI 2024 - TIME | time.com | would_update_raw | keep_audit_exists |
| Chris Olah | replace_source | exa | Christopher Olah - colah's blog | colah.github.io | would_update_raw | keep_audit_exists |
| Christopher Manning | replace_source | exa | Christopher Manning \| IEEE Awards | corporate-awards.ieee.org | would_update_raw | keep_audit_exists |
| Christopher Manning | replace_source | official | Christopher Manning, Stanford NLP | nlp.stanford.edu | would_update_raw | keep_audit_exists |
| Dario Amodei | replace_source | exa | Dario Amodei | darioamodei.com | would_update_raw | keep_audit_exists |
| Demis Hassabis | replace_source | exa | Demis Hassabis – Interview - NobelPrize.org | nobelprize.org | would_update_raw | keep_audit_exists |
| Demis Hassabis | replace_source | exa | Sir Demis Hassabis \| Academy of Achievement | achievement.org | would_update_raw | keep_audit_exists |
| Demis Hassabis | replace_source | exa | Sir Demis Hassabis, PhD - Isomorphic Labs | isomorphiclabs.com | would_update_raw | keep_audit_exists |
| Demis Hassabis | replace_source | exa | Transcript from an interview with Demis Hassabis | nobelprize.org | would_update_raw | keep_audit_exists |
| Emad Mostaque | replace_source | exa | Stability AI Announcement | stability.ai | would_update_raw | keep_audit_exists |
| Emad Mostaque | replace_source | exa | Stability AI Founder Emad Mostaque Plans To Resign As CEO, Sources Say | forbes.com | would_update_raw | keep_audit_exists |
| Emad Mostaque | replace_source | exa | Stability AI Founder Emad Mostaque Tanked His Billion-Dollar Startup | forbes.com | would_update_raw | keep_audit_exists |
| Emad Mostaque | augment_source | exa | Stable Diffusion's AI Benefactor Has A History Of Exaggeration | forbes.com | would_update_raw | keep_audit_exists |
| Emad Mostaque | augment_source | podcast | EP 46: Emad Mostaque (Founder/… – The Logan Bartlett Show – Apple Podcasts | podcasts.apple.com | would_update_raw | keep_audit_exists |
| Geoffrey Hinton | replace_source | exa | Geoffrey E Hinton \| About \| University of Toronto | discover.research.utoronto.ca | would_update_raw | keep_audit_exists |
| Geoffrey Hinton | replace_source | exa | Transcript from an interview with Geoffrey Hinton - NobelPrize.org | nobelprize.org | would_update_raw | keep_audit_exists |
| Geoffrey Hinton | replace_source | official | [PDF] Rectified Linear Units Improve Restricted Boltzmann Machines | cs.toronto.edu | would_update_raw | keep_audit_exists |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
