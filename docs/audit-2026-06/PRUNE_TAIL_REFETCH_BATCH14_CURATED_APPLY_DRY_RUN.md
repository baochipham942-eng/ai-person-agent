# Refetch Source Apply

Generated at: 2026-06-10T17:51:55.528Z
Mode: dry-run
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch14_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 17 |
| selected source rows | 17 |
| skipped source/decision rows | 10 |
| existing RawPoolItems | 7 |
| raw inserted | 10 |
| raw updated | 7 |
| keep audits inserted | 10 |
| keep audits already existed | 7 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 11 |
| augment_source | 6 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 11 |
| official | 4 |
| paper | 1 |
| podcast | 1 |

## Top Hosts

| Host | Count |
| --- | --- |
| fortune.com | 2 |
| nlp.stanford.edu | 2 |
| ainext.tw | 1 |
| cloudwars.com | 1 |
| cs.mcgill.ca | 1 |
| deepmind.google | 1 |
| entrepreneur.com | 1 |
| forbes.com | 1 |
| greylock.com | 1 |
| mila.quebec | 1 |
| papers.nips.cc | 1 |
| podcasts.apple.com | 1 |
| stability.ai | 1 |
| time.com | 1 |
| voicebot.ai | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Chris Olah | replace_source | exa | Chris Olah: The 100 Most Influential People in AI 2024 - TIME | time.com | would_update_raw | keep_audit_exists |
| Christopher Manning | replace_source | official | Christopher Manning, Stanford NLP | nlp.stanford.edu | would_update_raw | keep_audit_exists |
| Christopher Manning | replace_source | official | Christopher Manning: Papers and publications | nlp.stanford.edu | would_insert_raw | would_insert_keep_audit |
| Demis Hassabis | replace_source | official | AlphaFold reveals the structure of the protein universe — Google DeepMind | deepmind.google | would_insert_raw | would_insert_keep_audit |
| Emad Mostaque | augment_source | exa | Stability AI Announcement — Stability AI | stability.ai | would_update_raw | keep_audit_exists |
| Mustafa Suleyman | replace_source | exa | DeepMind and LinkedIn Co-Founders Unveil New Conversational AI Startup Inflecti... | voicebot.ai | would_insert_raw | would_insert_keep_audit |
| Mustafa Suleyman | replace_source | exa | Microsoft, freed from reliance on OpenAI, joins the race for ‘superintelligence... | fortune.com | would_insert_raw | would_insert_keep_audit |
| Mustafa Suleyman | replace_source | exa | Mustafa Suleyman - Greylock Partners | greylock.com | would_insert_raw | would_insert_keep_audit |
| Mustafa Suleyman | replace_source | exa | Mustafa Suleyman Outlines Microsoft’s Vision for Human-Centered Superintelligen... | cloudwars.com | would_insert_raw | would_insert_keep_audit |
| 乔尔·皮诺 | replace_source | exa | Joelle Pineau \| Mila | mila.quebec | would_insert_raw | would_insert_keep_audit |
| 乔尔·皮诺 | replace_source | official | Joelle Pineau's Home | cs.mcgill.ca | would_update_raw | keep_audit_exists |
| 桑达尔·皮查伊 | augment_source | exa | Google CEO Sundar Pichai Is a Billionaire for the First Time | entrepreneur.com | would_insert_raw | would_insert_keep_audit |
| 桑达尔·皮查伊 | augment_source | exa | Google CEO Sundar Pichai's $692M pay package hinges on two Google moonshots \| F... | fortune.com | would_insert_raw | would_insert_keep_audit |
| 桑达尔·皮查伊 | augment_source | exa | Sundar Pichai | forbes.com | would_update_raw | keep_audit_exists |
| 阿希什·瓦斯瓦尼 | replace_source | paper | Attention is All you Need | papers.nips.cc | would_insert_raw | would_insert_keep_audit |
| 雅各布·乌什科雷特 | augment_source | exa | 雅各布・烏茲科雷特Jakob Uszkoreit - AINEXT | ainext.tw | would_update_raw | keep_audit_exists |
| 雅各布·乌什科雷特 | augment_source | podcast | The AI Pioneer Developing New Kinds of Medicine - Apple Podcasts | podcasts.apple.com | would_update_raw | keep_audit_exists |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
