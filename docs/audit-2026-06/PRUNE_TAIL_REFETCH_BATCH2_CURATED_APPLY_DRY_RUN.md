# Refetch Source Apply

Generated at: 2026-06-10T13:46:59.965Z
Mode: dry-run
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch2_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 18 |
| selected source rows | 18 |
| skipped source/decision rows | 3 |
| existing RawPoolItems | 5 |
| raw inserted | 13 |
| raw updated | 5 |
| keep audits inserted | 13 |
| keep audits already existed | 5 |

## Decisions

| Decision | Count |
| --- | --- |
| augment_source | 7 |
| replace_source | 11 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 9 |
| official | 8 |
| paper | 1 |

## Top Hosts

| Host | Count |
| --- | --- |
| fortune.com | 2 |
| lexfridman.com | 2 |
| microsoft.com | 2 |
| tsinghua.edu.cn | 2 |
| aclanthology.org | 1 |
| ai.meta.com | 1 |
| blog.google | 1 |
| blog.southparkcommons.com | 1 |
| distributed.blog | 1 |
| forbes.com | 1 |
| meta.com | 1 |
| nlp.stanford.edu | 1 |
| research.google | 1 |
| technologyreview.com | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Dylan Field | augment_source | exa | Accessible Design for a Remote World: In Conversation w/Dylan ... | blog.southparkcommons.com | would_insert_raw | would_insert_keep_audit |
| Dylan Field | replace_source | exa | Dylan Field - Forbes | forbes.com | would_update_raw | keep_audit_exists |
| Dylan Field | augment_source | exa | Episode 29: Dylan Field, Figma Co-founder, Talks Design, Digital Economy, and R... | distributed.blog | would_update_raw | keep_audit_exists |
| Dylan Field | replace_source | exa | Figma’s CEO is now worth $5 billion after IPO—like Mark Zuckerberg, Larry Ellis... | fortune.com | would_insert_raw | would_insert_keep_audit |
| Mira Murati | augment_source | exa | Who is Mira Murati? The OpenAI executive who played a crucial role in the compa... | fortune.com | would_insert_raw | would_insert_keep_audit |
| Mira Murati | augment_source | official | Behind the Tech Podcast with Kevin Scott - Microsoft | microsoft.com | would_insert_raw | would_insert_keep_audit |
| Richard Socher | replace_source | official | [PDF] Deep Learning for NLP (without Magic) | nlp.stanford.edu | would_insert_raw | would_insert_keep_audit |
| Richard Socher | replace_source | paper | Deep Learning for NLP (without Magic) - ACL Anthology | aclanthology.org | would_insert_raw | would_insert_keep_audit |
| Sam Altman | augment_source | exa | Transcript for Sam Altman: OpenAI, GPT-5, Sora, Board Saga, Elon Musk, Ilya, Po... | lexfridman.com | would_insert_raw | would_insert_keep_audit |
| Yann LeCun | replace_source | official | Yann LeCun - AI at Meta | ai.meta.com | would_update_raw | keep_audit_exists |
| 唐杰 | replace_source | official | 中国首个原创“虚拟学生”入读清华大学 | tsinghua.edu.cn | would_insert_raw | would_insert_keep_audit |
| 唐杰 | replace_source | official | 清华大学迎来国内首个原创虚拟学生“华智冰”-清华大学 | tsinghua.edu.cn | would_insert_raw | would_insert_keep_audit |
| 埃里克·霍维茨 | replace_source | official | Behind the Code with Eric Horvitz - Microsoft Research | microsoft.com | would_insert_raw | would_insert_keep_audit |
| 杰夫·迪恩 | replace_source | official | Jeffrey Dean | research.google | would_update_raw | keep_audit_exists |
| 桑达尔·皮查伊 | augment_source | exa | Transcript for Sundar Pichai: CEO of Google and Alphabet | lexfridman.com | would_insert_raw | would_insert_keep_audit |
| 科拉伊·卡武克丘奥卢 | replace_source | official | Koray Kavukcuoglu | blog.google | would_update_raw | keep_audit_exists |
| 迈克·施罗普费尔 | augment_source | exa | From Meta CTO to climate tech investor: Mike Schroepfer on his big ... | technologyreview.com | would_insert_raw | would_insert_keep_audit |
| 迈克·施罗普费尔 | replace_source | exa | Mike Schroepfer, Senior Fellow | meta.com | would_insert_raw | would_insert_keep_audit |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
