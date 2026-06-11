# Refetch Source Apply

Generated at: 2026-06-10T19:42:59.005Z
Mode: execute
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch21_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 18 |
| selected source rows | 18 |
| skipped source/decision rows | 7 |
| existing RawPoolItems | 5 |
| raw inserted | 13 |
| raw updated | 5 |
| keep audits inserted | 13 |
| keep audits already existed | 5 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 12 |
| augment_source | 6 |

## Source Types

| Source type | Count |
| --- | --- |
| official | 2 |
| exa | 14 |
| youtube | 1 |
| podcast | 1 |

## Top Hosts

| Host | Count |
| --- | --- |
| artefact.com | 1 |
| britannica.com | 1 |
| cbsnews.com | 1 |
| cs.stanford.edu | 1 |
| cs.toronto.edu | 1 |
| every.to | 1 |
| forbes.com | 1 |
| fortune.com | 1 |
| howborisusesclaudecode.com | 1 |
| imobench.github.io | 1 |
| infoq.cn | 1 |
| latent.space | 1 |
| nvidia.cn | 1 |
| podcasts.apple.com | 1 |
| royalsociety.org | 1 |
| thepaper.cn | 1 |
| time.com | 1 |
| youtube.com | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Andrej Karpathy | replace_source | official | [PDF] Deep Visual-Semantic Alignments for Generating Image Descriptions | cs.stanford.edu | inserted_raw | inserted_keep_audit |
| Arthur Mensch | replace_source | exa | Arthur Mensch, CEO and cofounder of MISTRAL AI at the Adopt AI ... | artefact.com | inserted_raw | inserted_keep_audit |
| Arthur Mensch | replace_source | exa | Arthur Mensch: The 100 Most Influential People in AI 2024 - TIME | time.com | updated_raw | keep_audit_exists |
| Boris Cherny | augment_source | exa | Claude Code: Anthropic's Agent in Your Terminal - Latent.Space | latent.space | inserted_raw | inserted_keep_audit |
| Boris Cherny | augment_source | exa | How Boris Uses Claude Code | howborisusesclaudecode.com | inserted_raw | inserted_keep_audit |
| Boris Cherny | augment_source | exa | How to Use Claude Code Like the People Who Built It - Every | every.to | inserted_raw | inserted_keep_audit |
| Dario Amodei | replace_source | exa | Why Anthropic CEO Dario Amodei spends so much time warning of AI's potential da... | cbsnews.com | updated_raw | keep_audit_exists |
| Elon Musk | replace_source | exa | Elon Musk \| SpaceX, Tesla, xAI, X, & PayPal \| Britannica Money | britannica.com | updated_raw | keep_audit_exists |
| Elon Musk | replace_source | youtube | Making Humans a Multiplanetary Species | youtube.com | inserted_raw | inserted_keep_audit |
| Emad Mostaque | augment_source | exa | Stable Diffusion’s AI Benefactor Has A History Of Exaggeration | forbes.com | updated_raw | keep_audit_exists |
| Emad Mostaque | augment_source | podcast | Emad Mostaque — Stable Diffusi... - Gradient Dissent: Conversations on AI - App... | podcasts.apple.com | inserted_raw | inserted_keep_audit |
| Ilya Sutskever | replace_source | exa | Dr Ilya Sutskever FRS \| Royal Society Fellow | royalsociety.org | inserted_raw | inserted_keep_audit |
| Ilya Sutskever | replace_source | official | Ilya Sutskever's home page | cs.toronto.edu | updated_raw | keep_audit_exists |
| Mustafa Suleyman | replace_source | exa | Microsoft boss says its new AI-infused web browsing experience is like ‘a littl... | fortune.com | inserted_raw | inserted_keep_audit |
| Quoc Le | augment_source | exa | IMO-Bench: Towards Robust Mathematical Reasoning \| Google DeepMind | imobench.github.io | inserted_raw | inserted_keep_audit |
| 黄仁勋 | replace_source | exa | Jensen Huang | nvidia.cn | inserted_raw | inserted_keep_audit |
| 黄仁勋 | replace_source | exa | 直击 CES 2026！黄仁勋最新演讲：Rubin芯片今年上市，计算能力是Blackwell 的5倍、Cursor 彻底改变了英伟达的软件开发方式、开源模型落... | infoq.cn | inserted_raw | inserted_keep_audit |
| 黄仁勋 | replace_source | exa | 黄仁勋CES 2026宣告：AI正式接管物理世界！_澎湃号·湃客_澎湃新闻-The Paper | thepaper.cn | inserted_raw | inserted_keep_audit |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
