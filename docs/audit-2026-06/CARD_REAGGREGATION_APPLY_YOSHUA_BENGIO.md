# Card Reaggregation Apply

Generated at: 2026-06-10T08:40:46.611Z
Mode: execute
Plan: docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_plan.json
Review: docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_plan_mimo_review.json

## Counts

| Metric | Value |
| --- | --- |
| people considered | 1 |
| people eligible | 1 |
| existing cards | 12 |
| replacement cards | 5 |
| skipped people | 0 |

## People

| Person | Status | Existing Cards | Replacement Cards | Skipped |
| --- | --- | --- | --- | --- |
| Yoshua Bengio | ready | 12 | 5 |  |

## Replacement Samples

### Yoshua Bengio

- fact/4: 联合国科学咨询委员会成员与多国最高荣誉勋衔 — Yoshua Bengio 不仅是 2018 年图灵奖得主，还担任联合国秘书长科学咨询委员会成员，为突破性技术提供独立建议。他先后获得加拿大勋章（Officer of the Order of Canada）、法国荣誉军团勋章（Knigh...
- insight/5: 利用分布式表示攻克语言建模中的“维度灾难” — Bengio 在 2003 年提出，传统 n-gram 模型因“维度灾难”难以处理未见过的词序列。他的核心洞见是：通过学习词的分布式表示（词向量），可以让模型在连续空间中捕捉语义相似性。这意味着一个训练句子可以向模型提供关于指数级数量的、...
- quote/5: “AI 的恶意利用已经成为正在发生的现实” — 在 2025 年接受《Nature》采访时，Bengio 强调：“恶意利用已经发生了。”他认为 AI 安全不再是一个遥远的理论问题，而是迫在眉睫的威胁。他指出，随着 AI 能力的飞速提升，如果不采取强有力的监管和安全措施，技术被滥用所带来...
- story/4: 与杨立昆（Yann LeCun）关于 AI 风险的公开辩论 — 尽管 Bengio 与 Yann LeCun 是长期的好友且共同获得图灵奖，但两人在 AI 安全监管上持有截然不同的立场。Bengio 积极参与多次公开辩论，反驳那些认为不应严肃对待 AI 安全的观点。他深入研究了反对监管的游说力量，并坚...
- method/5: 通过多层抽象构建复杂函数的深度学习框架 — Bengio 提出了一种通过多层次抽象来学习复杂函数的方法。该方法受大脑启发，利用分布式表示和反向传播算法训练多层神经网络。其核心在于：增加网络深度不仅是为了增加参数，更是为了让模型能够解耦数据的变化因素，从而在视觉、语音和自然语言处理等...

## Execution Rule

- Dry-run only unless --execute is passed.
- Execute mode requires --person and hard-replaces that person's Card rows.
- Archive JSON contains the current cards and replacement cards for rollback/review.
