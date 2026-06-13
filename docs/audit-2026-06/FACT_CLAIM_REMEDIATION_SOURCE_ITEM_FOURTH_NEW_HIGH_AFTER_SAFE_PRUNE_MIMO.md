# Fact Claim Remediation by MiMo

Generated at: 2026-06-09T15:34:15.263Z
Model: mimo-v2.5-pro

Total problem issues: 19
Selected issues: 19
Remediations: 19

## Actions

| Action | Count |
| --- | --- |
| delete_raw_pool_item | 15 |
| refetch_source | 3 |
| rewrite_conservative | 1 |

## Safety

| Safety bucket | Count |
| --- | --- |
| safe_auto_apply | 15 |
| manual_or_source_required | 4 |

## Top People

| Person | Total | Safe | Actions | Samples |
| --- | --- | --- | --- | --- |
| 丁洁 | 8 | 6 | {"delete_raw_pool_item":6,"refetch_source":2} | source_item_belongs_to_person/delete_raw_pool_item: 内容为复旦大学研究复杂网络的丁洁，与明尼苏达大学研究AI安全的丁洁非同一人，属于人名错配，高置信删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容明确描述南京邮电大学的丁洁，研究方向（控制科学与工程）与目标人物（AI安全、大语言模型）不符，属于错误挂载，应删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容描述华中科技大学新闻学院的丁洁，研究方向（广播电视）与目标人物（AI安全）不符，属于错误挂载，应删除。 |
| 姚顺雨 | 6 | 5 | {"delete_raw_pool_item":5,"refetch_source":1} | source_item_belongs_to_person/delete_raw_pool_item: 内容为研究智能电网的Shuhan YAO的Google Scholar主页，与AI研究者姚顺雨无关，属于人名错配，高置信删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容为上海交通大学生物医学工程学院王耀副研究员页面，与OpenAI研究员姚顺雨无关，属于人名错配，高置信删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容为研究无人机控制的Yushu Yu的Google Scholar主页，与AI研究者姚顺雨无关，属于人名错配，高置信删除。 |
| 肖弘 | 3 | 2 | {"rewrite_conservative":1,"delete_raw_pool_item":2} | source_item_belongs_to_person/rewrite_conservative: 审核认为该页面是团队介绍，直接归于个人名下属于过度归因。需保守改写文案，明确区分团队成果与个人关联，并需补充证据。<br>source_item_belongs_to_person/delete_raw_pool_item: 审核确认该页面是解奉龙（Feng-Long Xie）的个人学术主页，与人物肖弘（Manus AI创始人）完全不符，属于错误归因，应直接删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容明确关于小i机器人创始人朱频频，与肖弘无关，属于外部内容错挂，高置信删除。 |
| 刘知远 | 1 | 1 | {"delete_raw_pool_item":1} | source_item_belongs_to_person/delete_raw_pool_item: 内容为上海交通大学Ziyu Liu的个人主页，与清华大学刘知远无关，属于人名错配，高置信删除。 |
| 汤姆·布朗 | 1 | 1 | {"delete_raw_pool_item":1} | source_item_belongs_to_person/delete_raw_pool_item: 审核确认该内容属于另一位Tom Brown（Burford Capital高级副总裁），与AI人物汤姆·布朗（Anthropic联合创始人）完全不符，属于错误归因，应直接删除。 |

## Safe Auto-Apply Candidates

| Person | Type | Target | Action | Reason |
| --- | --- | --- | --- | --- |
| 汤姆·布朗 | source_item_belongs_to_person | Tom Brown \| Senior Vice President at Burford Capital in ... | delete_raw_pool_item | 审核确认该内容属于另一位Tom Brown（Burford Capital高级副总裁），与AI人物汤姆·布朗（Anthropic联合创始人）完全不符，属于错误归因，应直接删除。 |
| 肖弘 | source_item_belongs_to_person | Academic | delete_raw_pool_item | 审核确认该页面是解奉龙（Feng-Long Xie）的个人学术主页，与人物肖弘（Manus AI创始人）完全不符，属于错误归因，应直接删除。 |
| 肖弘 | source_item_belongs_to_person | Big Data Institute of HKUST | delete_raw_pool_item | 内容明确关于小i机器人创始人朱频频，与肖弘无关，属于外部内容错挂，高置信删除。 |
| 刘知远 | source_item_belongs_to_person | Ziyu Liu | delete_raw_pool_item | 内容为上海交通大学Ziyu Liu的个人主页，与清华大学刘知远无关，属于人名错配，高置信删除。 |
| 姚顺雨 | source_item_belongs_to_person | Shuhan YAO | delete_raw_pool_item | 内容为研究智能电网的Shuhan YAO的Google Scholar主页，与AI研究者姚顺雨无关，属于人名错配，高置信删除。 |
| 姚顺雨 | source_item_belongs_to_person | 上海交通大学生物医学工程学院 | delete_raw_pool_item | 内容为上海交通大学生物医学工程学院王耀副研究员页面，与OpenAI研究员姚顺雨无关，属于人名错配，高置信删除。 |
| 姚顺雨 | source_item_belongs_to_person | Yushu Yu | delete_raw_pool_item | 内容为研究无人机控制的Yushu Yu的Google Scholar主页，与AI研究者姚顺雨无关，属于人名错配，高置信删除。 |
| 姚顺雨 | source_item_belongs_to_person | Yu Bao | delete_raw_pool_item | 内容为字节跳动Yu Bao的Google Scholar主页，与OpenAI研究员姚顺雨无关，属于人名错配，高置信删除。 |
| 丁洁 | source_item_belongs_to_person | 丁洁- 师资队伍 | delete_raw_pool_item | 内容为复旦大学研究复杂网络的丁洁，与明尼苏达大学研究AI安全的丁洁非同一人，属于人名错配，高置信删除。 |
| 丁洁 | source_item_belongs_to_person | 丁洁 | delete_raw_pool_item | 内容明确描述南京邮电大学的丁洁，研究方向（控制科学与工程）与目标人物（AI安全、大语言模型）不符，属于错误挂载，应删除。 |
| 丁洁 | source_item_belongs_to_person | 专家介绍--丁洁 - 优秀成果奖 | delete_raw_pool_item | 内容描述华中科技大学新闻学院的丁洁，研究方向（广播电视）与目标人物（AI安全）不符，属于错误挂载，应删除。 |
| 丁洁 | source_item_belongs_to_person | 河北工业大学丁洁 | delete_raw_pool_item | 内容描述河北工业大学的丁洁，研究方向（激光技术）与目标人物（AI安全）不符，属于错误挂载，应删除。 |
| 丁洁 | source_item_belongs_to_person | 丁洁介绍_图片_作品 | delete_raw_pool_item | 内容描述演员丁洁，职业（演员）与目标人物（研究员、教授）不符，属于错误挂载，应删除。 |
| 丁洁 | source_item_belongs_to_person | 丁洁博士 - 分子科学公共实验平台 | delete_raw_pool_item | 内容描述西湖大学的丁洁博士，研究方向（微流控、体外诊断）与目标人物（AI安全）不符，属于错误挂载，应删除。 |
| 姚顺雨 | source_item_belongs_to_person | Yuanshun (Kevin) Yao | delete_raw_pool_item | 该Google Scholar页面属于Yuanshun (Kevin) Yao，机构为Meta GenAI，与目标人物姚顺雨（OpenAI研究员）不符，属于错误挂载，应删除。 |

## Manual / Source Required Queue

| Person | Type | Target | Action | Queries | Reason |
| --- | --- | --- | --- | --- | --- |
| 肖弘 | source_item_belongs_to_person | FireRed | rewrite_conservative | 肖弘 FireRed 团队 角色 贡献 | 审核认为该页面是团队介绍，直接归于个人名下属于过度归因。需保守改写文案，明确区分团队成果与个人关联，并需补充证据。 |
| 姚顺雨 | source_item_belongs_to_person | PharmAgents: Building a Virtual Pharma with Large Language Model Agents | refetch_source | Shunyu Yao PharmAgents author<br>PharmAgents: Building a Virtual Pharma with Large Language Model Agents author list | 论文作者列表未显示姚顺雨，需重抓来源以核实其是否为作者或贡献者，无法直接删除。 |
| 丁洁 | source_item_belongs_to_person | 丁洁 - 罕见病分会- 北京医学会 | refetch_source | 丁洁 罕见病分会 北京医学会 | 内容摘要为空，无法判断是否为目标人物。需要重新抓取页面内容以核实。 |
| 丁洁 | source_item_belongs_to_person | 丁洁 (@jieding) | refetch_source | 丁洁 Instagram jieding | 内容摘要为空，无法判断Instagram账号是否为目标人物。需要重新抓取账号内容以核实。 |
