# Refetch Source Apply

Generated at: 2026-06-10T16:40:47.781Z
Mode: execute
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch10_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 11 |
| selected source rows | 11 |
| skipped source/decision rows | 9 |
| existing RawPoolItems | 4 |
| raw inserted | 7 |
| raw updated | 4 |
| keep audits inserted | 7 |
| keep audits already existed | 4 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 8 |
| augment_source | 3 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 8 |
| official | 3 |

## Top Hosts

| Host | Count |
| --- | --- |
| cs.tsinghua.edu.cn | 1 |
| erichorvitz.com | 1 |
| goldmansachs.com | 1 |
| hkforum.com | 1 |
| lilianweng.github.io | 1 |
| m.36kr.com | 1 |
| microsoft.com | 1 |
| ted.com | 1 |
| troweprice.com | 1 |
| tsinghua.edu.cn | 1 |
| wired.com | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| 唐杰 | replace_source | exa | 清华大学唐杰：从GPT到GPT Zero会是今年重大阶段性成果-36氪 | m.36kr.com | updated_raw | keep_audit_exists |
| 唐杰 | replace_source | official | 计算机系教授唐杰做客荷声讲坛阐释生成式人工智能大模型 ... | tsinghua.edu.cn | updated_raw | keep_audit_exists |
| 埃里克·霍维茨 | replace_source | exa | Artificial Intelligence in the Open World - AAAI Presidential Address | erichorvitz.com | inserted_raw | inserted_keep_audit |
| 埃里克·霍维茨 | replace_source | official | Eric Horvitz, Chief Scientific Officer - Microsoft | microsoft.com | inserted_raw | inserted_keep_audit |
| 朱军 | replace_source | official | 朱军-清华大学计算机科学与技术系 | cs.tsinghua.edu.cn | updated_raw | keep_audit_exists |
| 李开复 | replace_source | exa | 李开复- 香港中美论坛 | hkforum.com | inserted_raw | inserted_keep_audit |
| 李莲 | augment_source | exa | Thinking about High-Quality Human Data \| Lil'Log | lilianweng.github.io | inserted_raw | inserted_keep_audit |
| 雅各布·乌什科雷特 | replace_source | exa | Jakob Uszkoreit: How AI sidesteps traditional science \| TED Talk | ted.com | updated_raw | keep_audit_exists |
| 黄仁勋 | replace_source | exa | Nvidia CEO Jensen Huang Is Powering the AI Revolution - WIRED | wired.com | inserted_raw | inserted_keep_audit |
| 黄仁勋 | augment_source | exa | Nvidia’s Jensen Huang dissects the AI revolution \| Goldman Sachs | goldmansachs.com | inserted_raw | inserted_keep_audit |
| 黄仁勋 | augment_source | exa | The Long View: Interview with Jensen Huang, Founder and CEO of Nvidia Corporati... | troweprice.com | inserted_raw | inserted_keep_audit |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
