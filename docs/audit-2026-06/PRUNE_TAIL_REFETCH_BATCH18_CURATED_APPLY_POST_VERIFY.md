# Refetch Source Apply

Generated at: 2026-06-10T18:55:32.770Z
Mode: dry-run
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch18_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 18 |
| selected source rows | 18 |
| skipped source/decision rows | 4 |
| existing RawPoolItems | 18 |
| raw inserted | 0 |
| raw updated | 18 |
| keep audits inserted | 0 |
| keep audits already existed | 18 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 17 |
| augment_source | 1 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 16 |
| official | 1 |
| paper | 1 |

## Top Hosts

| Host | Count |
| --- | --- |
| forbes.com | 3 |
| jasonwei.net | 2 |
| lilianweng.github.io | 2 |
| bbc.com | 1 |
| bloomberg.com | 1 |
| britannica.com | 1 |
| cbsnews.com | 1 |
| cifar.ca | 1 |
| fortune.com | 1 |
| montgomerysummit.com | 1 |
| openai.com | 1 |
| openreview.net | 1 |
| possible.fm | 1 |
| stability.ai | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Aidan Gomez | replace_source | exa | Aidan Gomez - The Montgomery Summit | montgomerysummit.com | would_update_raw | keep_audit_exists |
| Daniela Amodei | replace_source | exa | Daniela Amodei - Forbes | forbes.com | would_update_raw | keep_audit_exists |
| Dario Amodei | replace_source | exa | Why Anthropic CEO Dario Amodei spends so much time warning of ... | cbsnews.com | would_update_raw | keep_audit_exists |
| Demis Hassabis | augment_source | exa | Demis Hassabis on AI, game theory, multimodality, and the nature of ... | possible.fm | would_update_raw | keep_audit_exists |
| Elon Musk | replace_source | exa | Elon Musk | forbes.com | would_update_raw | keep_audit_exists |
| Elon Musk | replace_source | exa | Elon Musk \| SpaceX, Tesla, xAI, X, & PayPal \| Britannica Money | britannica.com | would_update_raw | keep_audit_exists |
| Elon Musk | replace_source | exa | Elon Musk's wealth has soared past $600 billion—he's now worth double the next ... | fortune.com | would_update_raw | keep_audit_exists |
| Elon Musk | replace_source | exa | SpaceX Tender Offer Pushes Musk’s Net Worth To Record $677 Billion | forbes.com | would_update_raw | keep_audit_exists |
| Elon Musk | replace_source | exa | The Bloomberg Billionaires Index is a daily ranking of the world’s richest peop... | bloomberg.com | would_update_raw | keep_audit_exists |
| Elon Musk | replace_source | exa | Who is Elon Musk and what is his net worth? - BBC | bbc.com | would_update_raw | keep_audit_exists |
| Emad Mostaque | replace_source | exa | Stability AI Announcement | stability.ai | would_update_raw | keep_audit_exists |
| Geoffrey Hinton | replace_source | exa | Reach 2025: Geoffrey Hinton – CIFAR | cifar.ca | would_update_raw | keep_audit_exists |
| Greg Brockman | replace_source | official | GPT-4 contributions - OpenAI | openai.com | would_update_raw | keep_audit_exists |
| Jason Wei | replace_source | exa | Jason Wei | jasonwei.net | would_update_raw | keep_audit_exists |
| Jason Wei | replace_source | exa | Papers - Jason Wei | jasonwei.net | would_update_raw | keep_audit_exists |
| 李莲 | replace_source | exa | An Overview of Deep Learning for Curious People \| Lil'Log | lilianweng.github.io | would_update_raw | keep_audit_exists |
| 李莲 | replace_source | exa | LLM Powered Autonomous Agents \| Lil'Log | lilianweng.github.io | would_update_raw | keep_audit_exists |
| 李莲 | replace_source | paper | Lilian Weng \| OpenReview | openreview.net | would_update_raw | keep_audit_exists |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
