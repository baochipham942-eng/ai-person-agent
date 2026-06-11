# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T20:27:58.881Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch24.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch24_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 13 |
| output selected sources | 10 |
| removed selected sources | 3 |
| rows changed | 2 |
| rows deferred to human review | 1 |

## Removed Hosts

| Host | Count |
| --- | --- |
| en.wikipedia.org | 1 |
| m.36kr.com | 1 |
| openreview.net | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| Oriol Vinyals | augment_source | en.wikipedia.org | Oriol Vinyals - Wikipedia | secondary_or_ugc_reference_source |
| 布莱恩·卡坦扎罗 | augment_source | m.36kr.com | 英伟达副总裁：除了围棋，人工智能下一个让人惊讶的领域是什么-36氪 | background_interview_does_not_prove_target_project |
| 布莱恩·卡坦扎罗 | augment_source | openreview.net | Bryan Catanzaro \| OpenReview | profile_page_does_not_prove_target_project |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| 布莱恩·卡坦扎罗 | prune-tail:cmju0ydra09idrmtb55d062e6 | Thank you for your partnership 🙏 | manual_curated_all_selected_sources_removed |
