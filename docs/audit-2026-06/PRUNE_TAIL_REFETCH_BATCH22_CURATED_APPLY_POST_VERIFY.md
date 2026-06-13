# Refetch Source Apply

Generated at: 2026-06-10T19:57:47.843Z
Mode: dry-run
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch22_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 20 |
| selected source rows | 20 |
| skipped source/decision rows | 8 |
| existing RawPoolItems | 20 |
| raw inserted | 0 |
| raw updated | 20 |
| keep audits inserted | 0 |
| keep audits already existed | 20 |

## Decisions

| Decision | Count |
| --- | --- |
| augment_source | 4 |
| replace_source | 16 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 14 |
| official | 5 |
| youtube | 1 |

## Top Hosts

| Host | Count |
| --- | --- |
| blogs.nvidia.cn | 2 |
| ai.meta.com | 1 |
| blog.google | 1 |
| blogs.microsoft.com | 1 |
| britannica.com | 1 |
| cnbc.com | 1 |
| cs.mcgill.ca | 1 |
| forbes.com | 1 |
| lennysnewsletter.com | 1 |
| lri.fr | 1 |
| mila.quebec | 1 |
| montgomerysummit.com | 1 |
| mustafa-suleyman.ai | 1 |
| nbcsandiego.com | 1 |
| newsletter.pragmaticengineer.com | 1 |
| noamshazeer.com | 1 |
| ted.com | 1 |
| viterbischool.usc.edu | 1 |
| youtube.com | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Boris Cherny | augment_source | exa | Building Claude Code with Boris Cherny - by Gergely Orosz | newsletter.pragmaticengineer.com | would_update_raw | keep_audit_exists |
| Boris Cherny | augment_source | exa | Head of Claude Code: What happens after coding is solved \| Boris ... | lennysnewsletter.com | would_update_raw | keep_audit_exists |
| Mustafa Suleyman | replace_source | exa | Mustafa Suleyman | mustafa-suleyman.ai | would_update_raw | keep_audit_exists |
| Mustafa Suleyman | replace_source | official | Mustafa Suleyman, DeepMind and Inflection Co-founder, joins Microsoft to lead C... | blogs.microsoft.com | would_update_raw | keep_audit_exists |
| Noam Shazeer | replace_source | exa | Ex-Google engineers who founded Character.AI re-join company with new AI partne... | nbcsandiego.com | would_update_raw | keep_audit_exists |
| Noam Shazeer | replace_source | exa | Noam Shazeer \| AI Scientist, Google Gemini Co-Lead | noamshazeer.com | would_update_raw | keep_audit_exists |
| Sam Altman | replace_source | exa | Sam Altman - Forbes | forbes.com | would_update_raw | keep_audit_exists |
| Sam Altman | replace_source | exa | Sam Altman \| Biography, OpenAI, ChatGPT, & Microsoft - Britannica | britannica.com | would_update_raw | keep_audit_exists |
| Yann LeCun | replace_source | exa | [PDF] THE MNIST DATABASE of handwritten digits | lri.fr | would_update_raw | keep_audit_exists |
| Yann LeCun | replace_source | official | Yann LeCun - AI at Meta | ai.meta.com | would_update_raw | keep_audit_exists |
| 乔尔·皮诺 | replace_source | exa | Joelle Pineau - Mila - Quebec Artificial Intelligence Institute | mila.quebec | would_update_raw | keep_audit_exists |
| 乔尔·皮诺 | replace_source | exa | Joelle Pineau: What's inside the "black box" of AI? \| TED Talk | ted.com | would_update_raw | keep_audit_exists |
| 乔尔·皮诺 | replace_source | official | Joelle Pineau's Home - McGill School Of Computer Science | cs.mcgill.ca | would_update_raw | keep_audit_exists |
| 科拉伊·卡武克丘奥卢 | replace_source | official | Koray Kavukcuoglu | blog.google | would_update_raw | keep_audit_exists |
| 阿希什·瓦斯瓦尼 | replace_source | exa | Ashish Vaswani - The Montgomery Summit | montgomerysummit.com | would_update_raw | keep_audit_exists |
| 阿希什·瓦斯瓦尼 | replace_source | official | USC Alumni Paved Path for ChatGPT - USC Viterbi \| School of Engineering | viterbischool.usc.edu | would_update_raw | keep_audit_exists |
| 雅各布·乌什科雷特 | replace_source | exa | Inceptive CEO Jakob Uszkoreit says AI will transform pharmaceuticals | cnbc.com | would_update_raw | keep_audit_exists |
| 雅各布·乌什科雷特 | replace_source | youtube | Inceptive CEO Jakob Uszkoreit On Transformers And Using AI To Make New Drugs | youtube.com | would_update_raw | keep_audit_exists |
| 黄仁勋 | augment_source | exa | NVIDIA CEO 黄仁勋与全球技术领导者在GTC 2026 大会共话AI 时代 | blogs.nvidia.cn | would_update_raw | keep_audit_exists |
| 黄仁勋 | augment_source | exa | NVIDIA CEO：“我们创造了为生成式 AI 时代而生的处理器” \| NVIDIA 英伟达博客 | blogs.nvidia.cn | would_update_raw | keep_audit_exists |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
