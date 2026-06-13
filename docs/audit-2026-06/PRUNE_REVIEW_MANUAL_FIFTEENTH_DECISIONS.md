# Prune Review Manual Decisions

Generated at: 2026-06-10T12:18:42.169Z
Input: docs/audit-2026-06/data/prune_candidates_after_fourteenth_manual_review_prune.json

## Counts

| Metric | Value |
| --- | ---: |
| source rows scanned | 227 |
| signal rows | 35 |
| missing RawPoolItem rows | 0 |
| dependency skipped | 19 |
| decisions | 11 |

## By Person

| Person | Count |
| --- | ---: |
| 李莲 | 3 |
| 桑达尔·皮查伊 | 3 |
| 雅各布·乌什科雷特 | 3 |
| 阿希什·瓦斯瓦尼 | 2 |

## Decisions

| Person | Source | Target | Reason |
| --- | --- | --- | --- |
| 李莲 | x | //x.com/lilianweng/status/1863436864411341112 | 内容仅为社交媒体链接，缺乏实质性文本信息。 |
| 李莲 | x | //x.com/lilianweng/status/1973455232341516731 | 仅包含社交媒体链接，无实质性文本内容。 |
| 李莲 | x | Join us if you are interested for a chat at Defcon & the AI Security Forum! 🙌 | 仅为简短的会议社交邀请，缺乏实质性的观点或事实。 |
| 桑达尔·皮查伊 | x | //x.com/sundarpichai/status/1983651375449076215 | 内容仅包含社交媒体链接，缺乏实质性文本信息。 |
| 桑达尔·皮查伊 | x | //x.com/sundarpichai/status/1990812770762215649 | 内容仅包含社交媒体链接，缺乏实质性文本信息。 |
| 桑达尔·皮查伊 | x | //x.com/sundarpichai/status/1990865172152660047 | 内容仅包含社交媒体链接，缺乏实质性文本信息。 |
| 阿希什·瓦斯瓦尼 | x | ** https://x.com/ashVaswani/status/1997210521851027487 | 仅包含社交媒体链接，无实质性文本内容。 |
| 阿希什·瓦斯瓦尼 | youtube | Panel Discussion On Building AI For The World \| Accel AI Summit 2025 | 泛 AI 行业讨论，未明确提及目标人物。 |
| 雅各布·乌什科雷特 | x | //x.com/kyosu/status/1464848539675250691 | 仅包含社交媒体链接，无实质性文本内容。 |
| 雅各布·乌什科雷特 | x | //x.com/kyosu/status/1559457478781374465 | 仅包含社交媒体链接，无实质性文本内容。 |
| 雅各布·乌什科雷特 | x | //x.com/kyosu/status/1582297592691466240 | 仅包含社交媒体链接，无实质性文本内容。 |

## Safety

- Only latest `reject` rows are included by default.
- Rows with active Card.sourceUrl dependencies are skipped.
- Rows whose URL appears in People display/source JSON are skipped.
- This file is a decision queue only; use the manual apply script for dry-run/execute.
