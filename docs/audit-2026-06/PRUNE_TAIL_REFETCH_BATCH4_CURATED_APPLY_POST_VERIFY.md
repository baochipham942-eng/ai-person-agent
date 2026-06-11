# Refetch Source Apply

Generated at: 2026-06-10T14:41:19.759Z
Mode: dry-run
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch4_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 18 |
| selected source rows | 18 |
| skipped source/decision rows | 6 |
| existing RawPoolItems | 18 |
| raw inserted | 0 |
| raw updated | 18 |
| keep audits inserted | 0 |
| keep audits already existed | 18 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 15 |
| augment_source | 3 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 10 |
| official | 4 |
| paper | 3 |
| podcast | 1 |

## Top Hosts

| Host | Count |
| --- | --- |
| arxiv.org | 2 |
| a16z.com | 1 |
| ai.meta.com | 1 |
| cbsnews.com | 1 |
| cdn.openai.com | 1 |
| darioamodei.com | 1 |
| digitaleconomy.stanford.edu | 1 |
| forbes.com | 1 |
| jan.leike.name | 1 |
| montgomerysummit.com | 1 |
| noamshazeer.com | 1 |
| papers.neurips.cc | 1 |
| podcasts.apple.com | 1 |
| research.google | 1 |
| ted.com | 1 |
| transformer-circuits.pub | 1 |
| ycombinator.com | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Chris Olah | replace_source | exa | A Mathematical Framework for Transformer Circuits | transformer-circuits.pub | would_update_raw | keep_audit_exists |
| Dario Amodei | replace_source | exa | Dario Amodei | darioamodei.com | would_update_raw | keep_audit_exists |
| Dario Amodei | replace_source | exa | Read the full transcript of our interview with Anthropic CEO Dario Amodei - CBS... | cbsnews.com | would_update_raw | keep_audit_exists |
| Dario Amodei | replace_source | official | Dario Amodei - Stanford Digital Economy Lab | digitaleconomy.stanford.edu | would_update_raw | keep_audit_exists |
| Guillaume Lample | augment_source | exa | Guillaume Lample | forbes.com | would_update_raw | keep_audit_exists |
| Guillaume Lample | replace_source | official | LLaMA: Open and Efficient Foundation Language Models - Meta AI | ai.meta.com | would_update_raw | keep_audit_exists |
| Guillaume Lample | replace_source | paper | [PDF] arXiv:1901.07291v1 [cs.CL] 22 Jan 2019 | arxiv.org | would_update_raw | keep_audit_exists |
| Jan Leike | replace_source | exa | Jan Leike | jan.leike.name | would_update_raw | keep_audit_exists |
| Mustafa Suleyman | replace_source | exa | Mustafa Suleyman | ted.com | would_update_raw | keep_audit_exists |
| Noam Shazeer | replace_source | exa | Noam Shazeer \| AI Scientist, Google Gemini Co-Lead | noamshazeer.com | would_update_raw | keep_audit_exists |
| Noam Shazeer | replace_source | exa | Universally Accessible Intelligence \| Andreessen Horowitz | a16z.com | would_update_raw | keep_audit_exists |
| Sam Altman | augment_source | exa | Sam Altman: The Future of OpenAI, ChatGPT's Origins, and Building AI Hardware :... | ycombinator.com | would_update_raw | keep_audit_exists |
| Sam Altman | augment_source | podcast | #107 - Vinod Khosla and Sam Al… – Y Combinator Startup Podcast – Apple Podcasts | podcasts.apple.com | would_update_raw | keep_audit_exists |
| 亚历克·拉德福德 | replace_source | official | [PDF] Language Models are Unsupervised Multitask Learners \| OpenAI | cdn.openai.com | would_update_raw | keep_audit_exists |
| 杰夫·迪恩 | replace_source | official | Jeffrey Dean - Google Research | research.google | would_update_raw | keep_audit_exists |
| 阿希什·瓦斯瓦尼 | replace_source | exa | Ashish Vaswani - The Montgomery Summit | montgomerysummit.com | would_update_raw | keep_audit_exists |
| 阿希什·瓦斯瓦尼 | replace_source | paper | [1706.03762] Attention Is All You Need - arXiv | arxiv.org | would_update_raw | keep_audit_exists |
| 阿希什·瓦斯瓦尼 | replace_source | paper | [PDF] Attention is All you Need - NIPS | papers.neurips.cc | would_update_raw | keep_audit_exists |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
