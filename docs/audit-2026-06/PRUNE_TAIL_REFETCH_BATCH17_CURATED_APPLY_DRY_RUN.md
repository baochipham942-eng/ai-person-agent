# Refetch Source Apply

Generated at: 2026-06-10T18:40:43.082Z
Mode: dry-run
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch17_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 15 |
| selected source rows | 15 |
| skipped source/decision rows | 8 |
| existing RawPoolItems | 10 |
| raw inserted | 5 |
| raw updated | 10 |
| keep audits inserted | 5 |
| keep audits already existed | 10 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 10 |
| augment_source | 5 |

## Source Types

| Source type | Count |
| --- | --- |
| official | 7 |
| exa | 7 |
| paper | 1 |

## Top Hosts

| Host | Count |
| --- | --- |
| ai.meta.com | 1 |
| atcold.github.io | 1 |
| cdn.openai.com | 1 |
| cnbc.com | 1 |
| colah.github.io | 1 |
| cs.mcgill.ca | 1 |
| cs.stanford.edu | 1 |
| essential.ai | 1 |
| hai.stanford.edu | 1 |
| jyothirsv.github.io | 1 |
| lexfridman.com | 1 |
| news.berkeley.edu | 1 |
| papers.neurips.cc | 1 |
| polytechnique.edu | 1 |
| time.com | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Andrej Karpathy | replace_source | official | Andrej Karpathy Academic Website - Stanford Computer Science | cs.stanford.edu | would_update_raw | keep_audit_exists |
| Arthur Mensch | replace_source | exa | Arthur Mensch: The 100 Most Influential People in AI 2024 | time.com | would_insert_raw | would_insert_keep_audit |
| Arthur Mensch | replace_source | official | Arthur Mensch, CEO of Mistral, acting as a big brother at École Polytechnique, ... | polytechnique.edu | would_update_raw | keep_audit_exists |
| Chris Olah | replace_source | exa | Christopher Olah - colah's blog | colah.github.io | would_update_raw | keep_audit_exists |
| John Schulman | replace_source | exa | OpenAI co-founder John Schulman says he will join rival Anthropic | cnbc.com | would_insert_raw | would_insert_keep_audit |
| John Schulman | replace_source | official | ChatGPT architect, Berkeley alum John Schulman on his journey with AI - Berkele... | news.berkeley.edu | would_update_raw | keep_audit_exists |
| Wojciech Zaremba | replace_source | exa | #215 - Wojciech Zaremba: OpenAI Codex, GPT-3, Robotics, and the Future of AI | lexfridman.com | would_update_raw | keep_audit_exists |
| Yann LeCun | augment_source | exa | [PDF] Gradient-based Planning with World Models - Jyothir S V | jyothirsv.github.io | would_insert_raw | would_insert_keep_audit |
| Yann LeCun | augment_source | exa | DEEP LEARNING · Deep Learning | atcold.github.io | would_insert_raw | would_insert_keep_audit |
| 乔尔·皮诺 | replace_source | official | Joelle Pineau - AI at Meta | ai.meta.com | would_update_raw | keep_audit_exists |
| 乔尔·皮诺 | replace_source | official | Joelle Pineau's Home - McGill School Of Computer Science | cs.mcgill.ca | would_update_raw | keep_audit_exists |
| 亚历克·拉德福德 | augment_source | official | [PDF] Language Models are Unsupervised Multitask Learners \| OpenAI | cdn.openai.com | would_update_raw | keep_audit_exists |
| 吴恩达 | augment_source | official | Andrew Ng \| Stanford HAI | hai.stanford.edu | would_insert_raw | would_insert_keep_audit |
| 阿希什·瓦斯瓦尼 | replace_source | exa | Announcing Rnj-1: Building Instruments of Intelligence | essential.ai | would_update_raw | keep_audit_exists |
| 阿希什·瓦斯瓦尼 | augment_source | paper | [PDF] Attention is All you Need - NIPS | papers.neurips.cc | would_update_raw | keep_audit_exists |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
