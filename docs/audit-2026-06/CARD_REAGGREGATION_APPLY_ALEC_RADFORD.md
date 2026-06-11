# Card Reaggregation Apply

Generated at: 2026-06-10T08:41:45.056Z
Mode: execute
Plan: docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_plan.json
Review: docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_plan_mimo_review.json

## Counts

| Metric | Value |
| --- | --- |
| people considered | 1 |
| people eligible | 1 |
| existing cards | 14 |
| replacement cards | 5 |
| skipped people | 0 |

## People

| Person | Status | Existing Cards | Replacement Cards | Skipped |
| --- | --- | --- | --- | --- |
| 亚历克·拉德福德 | ready | 14 | 5 |  |

## Replacement Samples

### 亚历克·拉德福德

- method/5: k-稀疏自编码器（k-SAE）方法论 — 拉德福德在探索模型可解释性时，提出使用 k-稀疏自编码器来直接控制稀疏性。这种方法通过固定激活神经元的数量（k），简化了超参数调优过程，并显著改善了重建质量与稀疏性之间的平衡边界（Frontier）。此外，他通过改进技术解决了“死神经元”...
- insight/5: 可解释性工具也遵循“规模法则” — 拉德福德的研究指出，不仅语言模型本身遵循规模法则，用于理解它们的工具（如 SAE）也存在清晰的 Scaling Laws。实验表明，特征质量（如解释性指标和下游效应稀疏度）会随着自编码器规模的扩大而持续提升。这意味着要彻底破解复杂模型的“...
- fact/5: CLIP：利用4亿对互联网数据重塑视觉监督 — 在 CLIP 的研究中，拉德福德证明了通过预测 4 亿对来自互联网的（图像，文本）组合，可以从零开始学习到最先进的视觉表示。这种方法彻底摆脱了传统计算机视觉对人工标注固定类别的依赖，通过自然语言的广泛监督，实现了视觉模型在 30 多个不同...
- insight/5: GPT-2论文揭示语言模型的零样本任务迁移能力 — 在GPT-2论文中，拉德福德等人展示了语言模型在WebText数据集上训练后，无需显式监督即可开始执行问答、翻译等任务。论文指出，随着模型规模增大，其在多个任务上的零样本性能得到提升，这为后续更大规模模型的研发提供了方向。
- fact/5: 教育背景：MIT 计算机科学与工程学士 — 尽管拉德福德常被视为“无博士学位”改变 AI 界的典范，但他拥有麻省理工学院（MIT）计算机科学与工程专业的学士学位。他在 1989 年出生于波士顿，在加入 OpenAI 之前，曾作为联合创始人兼首席研究员创办了 Indico。他的职业生...

## Execution Rule

- Dry-run only unless --execute is passed.
- Execute mode requires --person and hard-replaces that person's Card rows.
- Archive JSON contains the current cards and replacement cards for rollback/review.
