# Fact Claim Remediation by MiMo

Generated at: 2026-06-09T15:49:39.270Z
Model: mimo-v2.5-pro

Total problem issues: 2
Selected issues: 2
Remediations: 2

## Actions

| Action | Count |
| --- | --- |
| delete_raw_pool_item | 2 |

## Safety

| Safety bucket | Count |
| --- | --- |
| safe_auto_apply | 2 |

## Top People

| Person | Total | Safe | Actions | Samples |
| --- | --- | --- | --- | --- |
| 姚顺雨 | 2 | 2 | {"delete_raw_pool_item":2} | source_item_belongs_to_person/delete_raw_pool_item: 审核确认内容指向标普全球矿业经济分析师姚舜禹，与目标人物姚顺雨（OpenAI研究员）职业、领域、身份均不匹配，属于同名不同人，应直接删除该错误关联。<br>source_item_belongs_to_person/delete_raw_pool_item: 审核确认内容指向河海大学硕士研究生姚舜禹，其教育背景、研究方向与目标人物姚顺雨（普林斯顿/OpenAI研究员）完全不同，属于同名不同人，应直接删除该错误关联。 |

## Safe Auto-Apply Candidates

| Person | Type | Target | Action | Reason |
| --- | --- | --- | --- | --- |
| 姚顺雨 | source_item_belongs_to_person | Shunyu Yao （姚舜禹） - Mine Economics Analyst at S&P ... | delete_raw_pool_item | 审核确认内容指向标普全球矿业经济分析师姚舜禹，与目标人物姚顺雨（OpenAI研究员）职业、领域、身份均不匹配，属于同名不同人，应直接删除该错误关联。 |
| 姚顺雨 | source_item_belongs_to_person | 姚舜禹 - AIM Group | delete_raw_pool_item | 审核确认内容指向河海大学硕士研究生姚舜禹，其教育背景、研究方向与目标人物姚顺雨（普林斯顿/OpenAI研究员）完全不同，属于同名不同人，应直接删除该错误关联。 |

## Manual / Source Required Queue

| Person | Type | Target | Action | Queries | Reason |
| --- | --- | --- | --- | --- | --- |
