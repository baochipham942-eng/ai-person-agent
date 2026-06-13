# Refetch Source Apply

Generated at: 2026-06-10T13:28:54.332Z
Mode: dry-run
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 19 |
| selected source rows | 19 |
| skipped source/decision rows | 4 |
| existing RawPoolItems | 5 |
| raw inserted | 14 |
| raw updated | 5 |
| keep audits inserted | 14 |
| keep audits already existed | 5 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 13 |
| augment_source | 6 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 15 |
| official | 4 |

## Top Hosts

| Host | Count |
| --- | --- |
| time.com | 3 |
| bloomberg.com | 2 |
| forbes.com | 2 |
| apnews.com | 1 |
| blogs.microsoft.com | 1 |
| corpgov.law.harvard.edu | 1 |
| cs.stanford.edu | 1 |
| figma.com | 1 |
| finance.sina.com.cn | 1 |
| freshdialogues.com | 1 |
| jbd.dev | 1 |
| lilianweng.github.io | 1 |
| noamshazeer.com | 1 |
| profiles.stanford.edu | 1 |
| wired.com | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Andrej Karpathy | replace_source | exa | Andrej Karpathy - TIME | time.com | would_insert_raw | would_insert_keep_audit |
| Andrej Karpathy | replace_source | official | Andrej Karpathy Academic Website - Stanford Computer Science | cs.stanford.edu | would_update_raw | keep_audit_exists |
| Daniela Amodei | replace_source | exa | Anthropic’s Daniela Amodei Believes the Market Will Reward Safe AI \| WIRED | wired.com | would_insert_raw | would_insert_keep_audit |
| Daniela Amodei | replace_source | exa | Bloomberg Billionaires Index - Daniela Amodei | bloomberg.com | would_insert_raw | would_insert_keep_audit |
| Demis Hassabis | replace_source | exa | Google's AI leader says learning how to learn is key human skill of the future ... | apnews.com | would_insert_raw | would_insert_keep_audit |
| Dylan Field | replace_source | exa | Dylan Field - Forbes | forbes.com | would_insert_raw | would_insert_keep_audit |
| Dylan Field | replace_source | exa | Dylan Field and Garry Tan on design, AI, and the power of “locking in” | figma.com | would_insert_raw | would_insert_keep_audit |
| Elon Musk | augment_source | exa | Elon Musk: The Reluctant CEO of Tesla Motors (Interview Transcript) | freshdialogues.com | would_insert_raw | would_insert_keep_audit |
| Elon Musk | augment_source | official | Elon Musk and the Control of Tesla | corpgov.law.harvard.edu | would_insert_raw | would_insert_keep_audit |
| Jaana Dogan | replace_source | exa | About · jbd.dev | jbd.dev | would_insert_raw | would_insert_keep_audit |
| Mira Murati | replace_source | exa | Murati’s Thinking Machines Raises Cash at $10 Billion Valuation - Bloomberg | bloomberg.com | would_insert_raw | would_insert_keep_audit |
| Mustafa Suleyman | replace_source | official | Mustafa Suleyman, DeepMind and Inflection Co-founder, joins Microsoft to lead C... | blogs.microsoft.com | would_update_raw | keep_audit_exists |
| Noam Shazeer | replace_source | exa | Noam Shazeer \| AI Scientist, Google Gemini Co-Lead | noamshazeer.com | would_update_raw | keep_audit_exists |
| Shane Legg | augment_source | exa | Shane Legg: The 100 Most Influential People in AI 2023 | time.com | would_update_raw | keep_audit_exists |
| 李莲 | augment_source | exa | Lilian Weng最新对话：首谈离开OpenAI创业，以及AI研究的现实扭曲场\|AI_新浪财经_新浪网 | finance.sina.com.cn | would_insert_raw | would_insert_keep_audit |
| 李莲 | augment_source | exa | LLM Powered Autonomous Agents \| Lil'Log | lilianweng.github.io | would_insert_raw | would_insert_keep_audit |
| 李飞飞 | replace_source | official | Fei-Fei Li - Stanford Profiles | profiles.stanford.edu | would_insert_raw | would_insert_keep_audit |
| 桑达尔·皮查伊 | augment_source | exa | Sundar Pichai - Forbes | forbes.com | would_update_raw | keep_audit_exists |
| 黄仁勋 | replace_source | exa | The Architects of AI: Person of the Year 2025 - TIME | time.com | would_insert_raw | would_insert_keep_audit |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
