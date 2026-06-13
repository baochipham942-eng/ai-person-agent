# Fact Claim Remediation by MiMo

Generated at: 2026-06-09T15:42:41.077Z
Model: mimo-v2.5-pro

Total problem issues: 6
Selected issues: 6
Remediations: 6

## Actions

| Action | Count |
| --- | --- |
| delete_raw_pool_item | 5 |
| refetch_source | 1 |

## Safety

| Safety bucket | Count |
| --- | --- |
| safe_auto_apply | 5 |
| manual_or_source_required | 1 |

## Top People

| Person | Total | Safe | Actions | Samples |
| --- | --- | --- | --- | --- |
| 姚顺雨 | 5 | 4 | {"delete_raw_pool_item":4,"refetch_source":1} | source_item_belongs_to_person/delete_raw_pool_item: 内容标题为“姚舜禹”，与目标人物“姚顺雨”姓名不符，且背景信息（悉尼大学学生）与目标人物（OpenAI研究员）不符，属于明确的人名错配，应删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容显示机构为“Chinese Academy of Sciences, Institute of Geographic Sciences and Natural Resourc...<br>source_item_belongs_to_person/delete_raw_pool_item: 内容为“Learning Rust Camp S1”训练营页面，未提及目标人物“姚顺雨”，且内容与AI研究无关，属于无关内容被错误关联，应删除。 |
| 肖弘 | 1 | 1 | {"delete_raw_pool_item":1} | source_item_belongs_to_person/delete_raw_pool_item: 内容为音乐人“肖红”的个人资料页面，显示其为歌手，与目标人物“肖弘”（Manus AI创始人兼CEO）姓名、职业均不符，属于人名错配，应删除。 |

## Safe Auto-Apply Candidates

| Person | Type | Target | Action | Reason |
| --- | --- | --- | --- | --- |
| 姚顺雨 | source_item_belongs_to_person | 姚舜禹- 澳大利亚悉尼大学学生 | delete_raw_pool_item | 内容标题为“姚舜禹”，与目标人物“姚顺雨”姓名不符，且背景信息（悉尼大学学生）与目标人物（OpenAI研究员）不符，属于明确的人名错配，应删除。 |
| 姚顺雨 | source_item_belongs_to_person | Yao SHUNYU \| Doctor of Philosophy | delete_raw_pool_item | 内容显示机构为“Chinese Academy of Sciences, Institute of Geographic Sciences and Natural Resources”，研究领域为遥感、地理信息，与目标人物（OpenAI研究员，研究大语言模型）不符，属于同名不同... |
| 姚顺雨 | source_item_belongs_to_person | Stage 2: Professional - Learning Rust Camp S1 (Data ... | delete_raw_pool_item | 内容为“Learning Rust Camp S1”训练营页面，未提及目标人物“姚顺雨”，且内容与AI研究无关，属于无关内容被错误关联，应删除。 |
| 姚顺雨 | source_item_belongs_to_person | WELCOME TO SHU YAO’s HOMEPAGE | delete_raw_pool_item | 内容为“Shu Yao (舒瑶)”的个人主页，显示其为广东人工智能与数字经济实验室研究员，研究方向为优化理论、AutoML等，与目标人物“姚顺雨”姓名、机构、研究方向均不符，应删除。 |
| 肖弘 | source_item_belongs_to_person | 肖红 | delete_raw_pool_item | 内容为音乐人“肖红”的个人资料页面，显示其为歌手，与目标人物“肖弘”（Manus AI创始人兼CEO）姓名、职业均不符，属于人名错配，应删除。 |

## Manual / Source Required Queue

| Person | Type | Target | Action | Queries | Reason |
| --- | --- | --- | --- | --- | --- |
| 姚顺雨 | source_item_belongs_to_person | 我们还能研究什么？——OpenAI姚顺雨《AI 的下半场》 | refetch_source | 姚顺雨 AI 的下半场 演讲 文章 | 标题明确指向目标人物，但提供的摘要为空，无法确认内容是否确实关于该人物及其观点，需要重新抓取来源以核实。 |
