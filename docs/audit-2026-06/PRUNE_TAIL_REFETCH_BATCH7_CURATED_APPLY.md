# Refetch Source Apply

Generated at: 2026-06-10T15:45:19.046Z
Mode: execute
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch7_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 12 |
| selected source rows | 12 |
| skipped source/decision rows | 11 |
| existing RawPoolItems | 3 |
| raw inserted | 9 |
| raw updated | 3 |
| keep audits inserted | 9 |
| keep audits already existed | 3 |

## Decisions

| Decision | Count |
| --- | --- |
| augment_source | 6 |
| replace_source | 6 |

## Source Types

| Source type | Count |
| --- | --- |
| paper | 1 |
| official | 3 |
| exa | 6 |
| youtube | 1 |
| podcast | 1 |

## Top Hosts

| Host | Count |
| --- | --- |
| bbc.com | 1 |
| blog.google | 1 |
| congress.gov | 1 |
| csis.org | 1 |
| learn.hms.harvard.edu | 1 |
| live.worldbank.org | 1 |
| podcasts.apple.com | 1 |
| proceedings.neurips.cc | 1 |
| ted.com | 1 |
| tedai-sanfrancisco.ted.com | 1 |
| viterbischool.usc.edu | 1 |
| youtube.com | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Arthur Mensch | augment_source | paper | [PDF] Online Sinkhorn: Optimal Transport distances from sample streams | proceedings.neurips.cc | inserted_raw | inserted_keep_audit |
| 埃里克·霍维茨 | augment_source | official | Eric Horvitz | learn.hms.harvard.edu | inserted_raw | inserted_keep_audit |
| 桑达尔·皮查伊 | replace_source | exa | [PDF] Sundar Pichai CEO, Google and Alphabet - Congress.gov | congress.gov | inserted_raw | inserted_keep_audit |
| 桑达尔·皮查伊 | replace_source | exa | Sundar Pichai - World Bank Live | live.worldbank.org | inserted_raw | inserted_keep_audit |
| 桑达尔·皮查伊 | replace_source | exa | Who is Sundar Pichai and what does Alphabet do? | bbc.com | inserted_raw | inserted_keep_audit |
| 科拉伊·卡武克丘奥卢 | replace_source | official | Koray Kavukcuoglu | blog.google | updated_raw | keep_audit_exists |
| 迈克·施罗普费尔 | augment_source | youtube | Why I Left Meta — Exit Interview With Mike Schroepfer | youtube.com | inserted_raw | inserted_keep_audit |
| 阿希什·瓦斯瓦尼 | replace_source | official | USC Alumni Paved Path for ChatGPT - USC Viterbi \| School of Engineering | viterbischool.usc.edu | inserted_raw | inserted_keep_audit |
| 雅各布·乌什科雷特 | augment_source | exa | How AI sidesteps traditional science | ted.com | inserted_raw | inserted_keep_audit |
| 雅各布·乌什科雷特 | augment_source | exa | Jakob Uszkoreit \| TEDAI San Francisco | tedai-sanfrancisco.ted.com | updated_raw | keep_audit_exists |
| 雅各布·乌什科雷特 | augment_source | podcast | The AI Pioneer Developing New … - What's Your Problem? - Apple Podcasts | podcasts.apple.com | updated_raw | keep_audit_exists |
| 黄仁勋 | replace_source | exa | NVIDIA’s Jensen Huang on Securing American Leadership on AI \| CSIS Events | csis.org | inserted_raw | inserted_keep_audit |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
