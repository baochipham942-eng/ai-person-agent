# Fact Claim Remediation by MiMo

Generated at: 2026-06-09T15:38:45.026Z
Model: mimo-v2.5-pro

Total problem issues: 11
Selected issues: 11
Remediations: 11

## Actions

| Action | Count |
| --- | --- |
| delete_raw_pool_item | 7 |
| refetch_source | 4 |

## Safety

| Safety bucket | Count |
| --- | --- |
| safe_auto_apply | 7 |
| manual_or_source_required | 4 |

## Top People

| Person | Total | Safe | Actions | Samples |
| --- | --- | --- | --- | --- |
| 姚顺雨 | 5 | 4 | {"delete_raw_pool_item":4,"refetch_source":1} | source_item_belongs_to_person/delete_raw_pool_item: 审核确认该内容属于刘凡教授的实验室，与姚顺雨无关，属于错误挂载，应直接删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 审核确认该Google Scholar主页属于大连理工大学的同名研究者，与OpenAI的姚顺雨无关，属于错误挂载，应直接删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 审核确认该论文作者列表中无姚顺雨，主要作者来自清华大学和北京大学，属于错误挂载，应直接删除。 |
| 肖弘 | 2 | 2 | {"delete_raw_pool_item":2} | source_item_belongs_to_person/delete_raw_pool_item: 内容为Character.AI上的虚构角色，与人物“肖弘”（Manus AI创始人）无关。高置信删除候选。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容为Character.AI上的虚构角色，与人物“肖弘”（Manus AI创始人）无关。高置信删除候选。 |
| 丁洁 | 2 | 1 | {"delete_raw_pool_item":1,"refetch_source":1} | source_item_belongs_to_person/delete_raw_pool_item: 内容指向北京医学会罕见病分会的丁洁，与AI领域的丁洁（明尼苏达大学副教授）不符，属于同名不同人。高置信删除候选。<br>source_item_belongs_to_person/refetch_source: Instagram账号可能属于该人物，但页面内容为空，无法确认其身份及与AI领域的关联性。需要重抓来源或人工审核。 |
| 刘知远 | 1 | 0 | {"refetch_source":1} | source_item_belongs_to_person/refetch_source: 标题提及“清华刘知远团队”，但摘要和正文内容缺失，无法核实具体论文、作者列表及刘知远的具体贡献。需要重抓来源。 |
| 汤姆·布朗 | 1 | 0 | {"refetch_source":1} | source_item_belongs_to_person/refetch_source: 论文处于匿名评审状态，作者信息未公开。需要等待或重抓来源以获取最终作者列表。 |

## Safe Auto-Apply Candidates

| Person | Type | Target | Action | Reason |
| --- | --- | --- | --- | --- |
| 姚顺雨 | source_item_belongs_to_person | 多模态人工智能实验室 - AIM Group | delete_raw_pool_item | 审核确认该内容属于刘凡教授的实验室，与姚顺雨无关，属于错误挂载，应直接删除。 |
| 姚顺雨 | source_item_belongs_to_person | Shunyu Yao | delete_raw_pool_item | 审核确认该Google Scholar主页属于大连理工大学的同名研究者，与OpenAI的姚顺雨无关，属于错误挂载，应直接删除。 |
| 姚顺雨 | source_item_belongs_to_person | PharmAgents: Building a Virtual Pharma with Large Language Model Agents | delete_raw_pool_item | 审核确认该论文作者列表中无姚顺雨，主要作者来自清华大学和北京大学，属于错误挂载，应直接删除。 |
| 姚顺雨 | source_item_belongs_to_person | 论“互联网+”商业模式专利保护的制度设计 | delete_raw_pool_item | 论文作者为“姚舜禹”，与人物“姚顺雨”姓名不符，属于人名错配。高置信删除候选。 |
| 肖弘 | source_item_belongs_to_person | Chat with Red Xiao and Xiao | delete_raw_pool_item | 内容为Character.AI上的虚构角色，与人物“肖弘”（Manus AI创始人）无关。高置信删除候选。 |
| 肖弘 | source_item_belongs_to_person | Chat with Red Xiao | delete_raw_pool_item | 内容为Character.AI上的虚构角色，与人物“肖弘”（Manus AI创始人）无关。高置信删除候选。 |
| 丁洁 | source_item_belongs_to_person | 丁洁 - 罕见病分会- 北京医学会 | delete_raw_pool_item | 内容指向北京医学会罕见病分会的丁洁，与AI领域的丁洁（明尼苏达大学副教授）不符，属于同名不同人。高置信删除候选。 |

## Manual / Source Required Queue

| Person | Type | Target | Action | Queries | Reason |
| --- | --- | --- | --- | --- | --- |
| 姚顺雨 | source_item_belongs_to_person | 我们还能研究什么？——OpenAI姚顺雨《AI 的下半场》 | refetch_source | 姚顺雨 OpenAI AI 的下半场 博客 | 内容文本为空，无法确认是否与姚顺雨相关。需要重新抓取来源以获取完整内容进行验证。 |
| 汤姆·布朗 | source_item_belongs_to_person | cmjuuzofb0ihmrmtbt5nlseeo | refetch_source | Tom Brown Anthropic ICLR 2025 Scaling Multimodal Theory-of-Mind | 论文处于匿名评审状态，作者信息未公开。需要等待或重抓来源以获取最终作者列表。 |
| 丁洁 | source_item_belongs_to_person | 丁洁 (@jieding) | refetch_source | 丁洁 jieding Instagram AI researcher | Instagram账号可能属于该人物，但页面内容为空，无法确认其身份及与AI领域的关联性。需要重抓来源或人工审核。 |
| 刘知远 | source_item_belongs_to_person | LLM最大能力密度100天翻一倍！清华刘知远团队提出 ... | refetch_source | 刘知远 清华 LLM 能力密度 论文 | 标题提及“清华刘知远团队”，但摘要和正文内容缺失，无法核实具体论文、作者列表及刘知远的具体贡献。需要重抓来源。 |
