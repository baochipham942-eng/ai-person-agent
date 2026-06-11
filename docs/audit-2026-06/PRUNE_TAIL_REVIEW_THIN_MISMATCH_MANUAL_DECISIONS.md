# Prune Tail Review Manual Decisions

Generated at: 2026-06-10T21:51:54.899Z
Input: docs/audit-2026-06/data/prune_tail_review_unresolved_rows.json
Decision filter: explicit ids (7)

## Counts

| Metric | Value |
| --- | ---: |
| input rows | 38 |
| dependency skipped | 0 |
| decision rows | 7 |

## Source Type

| Source | Count |
| --- | ---: |
| x | 3 |
| exa | 2 |
| openalex | 1 |
| podcast | 1 |

## People

| Person | Count |
| --- | ---: |
| 李飞飞 | 2 |
| Arthur Mensch | 1 |
| Elon Musk | 1 |
| Shane Legg | 1 |
| Yann LeCun | 1 |
| 亚历克·拉德福德 | 1 |

## Decisions

| Person | Source | Refetch | Target | Reason |
| --- | --- | --- | --- | --- |
| 亚历克·拉德福德 | exa | human_review | Alec Radford - OpenAI;Indico Data Solutions \| 人才画像 | 学术画像页面，但抓取内容包含大量系统菜单，实质性介绍较少。 |
| Yann LeCun | podcast | human_review | #397 - Yann Le Cun - Chief AI Scientist chez Meta - L'Intelligence Artificielle Générale ... | 标题提及Yann LeCun和AI观点，但内容仅显示播客名称，缺乏实质信息，需人工判断。 |
| 李飞飞 | exa | human_review | The 100 Most Influential People in AI 2025 | 属于TIME 100 AI榜单页面，但正文片段主要显示其他人物，需确认其具体入选内容。 |
| Shane Legg | x | human_review | //www.youtube.com/watch?v=8IUIGVVLbCg | 官方发布的视频链接，虽大概率高度相关但缺乏文本描述，需人工确认视频内容。 |
| Elon Musk | openalex | human_review | I Hope Artificial Intelligence Is Nice to Us | 标题提及人工智能，但内容主要讨论物理、生物学和自组织理论，未明确指向Elon Musk，需人工判断。 |
| Arthur Mensch | x | human_review | Complex matters slowly coming together — we actually got surprised ourselves | 虽然是官方言论，但内容过于简略且含糊，信息密度较低。 |
| 李飞飞 | x | human_review | Beginning of an exciting journey! 🤖🤩 | 疑似新项目启动的官方宣告，虽内容简练但具有时效价值，需人工确认背景。 |

## Safety

- This file only converts already-exported review rows into an explicit manual decision queue.
- Rows with active Card.sourceUrl or People display/source JSON dependencies are skipped.
- Apply with `apply_hard_tail_manual_decisions.mjs`; default mode there is dry-run.
