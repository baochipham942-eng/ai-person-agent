# Refetch Source Apply

Generated at: 2026-06-10T18:09:18.265Z
Mode: execute
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch15_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 13 |
| selected source rows | 13 |
| skipped source/decision rows | 10 |
| existing RawPoolItems | 3 |
| raw inserted | 10 |
| raw updated | 3 |
| keep audits inserted | 10 |
| keep audits already existed | 3 |

## Decisions

| Decision | Count |
| --- | --- |
| augment_source | 8 |
| replace_source | 5 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 11 |
| podcast | 1 |
| official | 1 |

## Top Hosts

| Host | Count |
| --- | --- |
| answer.ai | 2 |
| abcnews.com | 1 |
| americanbazaaronline.com | 1 |
| blog.samaltman.com | 1 |
| fast.ai | 1 |
| forbes.com | 1 |
| latent.space | 1 |
| lilianweng.github.io | 1 |
| nvidianews.nvidia.com | 1 |
| podcasts.apple.com | 1 |
| technologyreview.com | 1 |
| ycombinator.com | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Guillaume Lample | augment_source | exa | Guillaume Lample | forbes.com | updated_raw | keep_audit_exists |
| Jeremy Howard | replace_source | exa | A New Chapter for fast.ai: How To Solve It With Code – Answer.AI | answer.ai | inserted_raw | inserted_keep_audit |
| Jeremy Howard | augment_source | exa | AI Magic: Shipping 1000s of successful products with no managers ... | latent.space | inserted_raw | inserted_keep_audit |
| Jeremy Howard | replace_source | exa | fast.ai - How to Solve it With Code course now available | fast.ai | inserted_raw | inserted_keep_audit |
| Jeremy Howard | augment_source | exa | FastHTML: Modern web applications in pure Python – Answer.AI | answer.ai | inserted_raw | inserted_keep_audit |
| Marc Andreessen | augment_source | podcast | Marc Andreessen's 2026 Outlook… - The a16z Show - Apple Podcasts | podcasts.apple.com | inserted_raw | inserted_keep_audit |
| Oriol Vinyals | replace_source | exa | Oriol Vinyals \| MIT Technology Review | technologyreview.com | inserted_raw | inserted_keep_audit |
| Sam Altman | augment_source | exa | OpenAI CEO Sam Altman says AI will reshape society ... - ABC News | abcnews.com | inserted_raw | inserted_keep_audit |
| Sam Altman | augment_source | exa | Reflections - Sam Altman | blog.samaltman.com | inserted_raw | inserted_keep_audit |
| Sam Altman | augment_source | exa | Sam Altman: The Future of OpenAI, ChatGPT's Origins, and Building ... | ycombinator.com | updated_raw | keep_audit_exists |
| 李莲 | replace_source | exa | LLM Powered Autonomous Agents \| Lil'Log | lilianweng.github.io | updated_raw | keep_audit_exists |
| 桑达尔·皮查伊 | augment_source | exa | Sundar Pichai on Elon Musk: Google CEO shares high praise | americanbazaaronline.com | inserted_raw | inserted_keep_audit |
| 黄仁勋 | replace_source | official | Jensen Huang \| NVIDIA Newsroom | nvidianews.nvidia.com | inserted_raw | inserted_keep_audit |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
