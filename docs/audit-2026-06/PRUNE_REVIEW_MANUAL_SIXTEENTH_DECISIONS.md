# Prune Review Manual Decisions

Generated at: 2026-06-10T12:20:17.571Z
Input: docs/audit-2026-06/data/prune_candidates_after_fifteenth_manual_review_prune.json

## Counts

| Metric | Value |
| --- | ---: |
| source rows scanned | 216 |
| signal rows | 24 |
| missing RawPoolItem rows | 0 |
| dependency skipped | 19 |
| decisions | 5 |

## By Person

| Person | Count |
| --- | ---: |
| 桑达尔·皮查伊 | 3 |
| 雅各布·乌什科雷特 | 2 |

## Decisions

| Person | Source | Target | Reason |
| --- | --- | --- | --- |
| 桑达尔·皮查伊 | x | //x.com/sundarpichai/status/1993509460577583300 | 内容仅包含社交媒体链接，缺乏实质性文本信息。 |
| 桑达尔·皮查伊 | x | //x.com/sundarpichai/status/2001326061787942957 | 内容仅包含社交媒体链接，缺乏实质性文本信息。 |
| 桑达尔·皮查伊 | x | //x.com/sundarpichai/status/2001360295726584072 | 内容仅包含社交媒体链接，缺乏实质性文本信息。 |
| 雅各布·乌什科雷特 | x | //x.com/kyosu/status/1664546855013736449 | 仅包含社交媒体链接，无实质性文本内容。 |
| 雅各布·乌什科雷特 | youtube | Inceptive CEO Jakob Uszkoreit On Transformers And Using AI ... | 抓取内容仅为YouTube页面页脚法律信息，无实质人物内容。 |

## Safety

- Only latest `reject` rows are included by default.
- Rows with active Card.sourceUrl dependencies are skipped.
- Rows whose URL appears in People display/source JSON are skipped.
- This file is a decision queue only; use the manual apply script for dry-run/execute.
