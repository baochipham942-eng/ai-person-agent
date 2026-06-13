# Fact Claim Remediation by MiMo

Generated at: 2026-06-09T15:19:34.357Z
Model: mimo-v2.5-pro

Total problem issues: 43
Selected issues: 43
Remediations: 43

## Actions

| Action | Count |
| --- | --- |
| delete_raw_pool_item | 34 |
| refetch_source | 8 |
| human_review | 1 |

## Safety

| Safety bucket | Count |
| --- | --- |
| safe_auto_apply | 31 |
| manual_or_source_required | 12 |

## Top People

| Person | Total | Safe | Actions | Samples |
| --- | --- | --- | --- | --- |
| 丁洁 | 9 | 5 | {"delete_raw_pool_item":5,"refetch_source":4} | source_item_belongs_to_person/delete_raw_pool_item: 内容为上海交通大学BBLAB课题组的硕士生“Jinjie Ding”，研究方向为光交换网络，与人物库中的“丁洁”（AI安全研究员）不符，属于同名实体。属于高置信删除候选。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容明确指向南京工程学院的陈洁，与目标人物丁洁（明尼苏达大学副教授）无关，属于人名错配，应直接删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容明确指向大连化学物理研究所的JIN Jing，与目标人物丁洁（明尼苏达大学副教授）无关，属于人名错配，应直接删除。 |
| 姚顺雨 | 6 | 5 | {"delete_raw_pool_item":5,"human_review":1} | source_item_belongs_to_person/delete_raw_pool_item: 审核确认该内容描述的是另一位Shunyu Yao（Google DeepMind、理论物理背景），与目标人物姚顺雨（OpenAI）不符，属于外部内容错挂，符合安全自动删除条件。<br>source_item_belongs_to_person/delete_raw_pool_item: 审核确认该内容描述的是中国人民大学助理教授YAO Shuang（藏学研究），与目标人物姚顺雨（AI研究者）完全不同，属于外部内容错挂，符合安全自动删除条件。<br>source_item_belongs_to_person/human_review: 该新闻声称姚顺雨已加入腾讯，但其当前公开职位仍为OpenAI研究员。信息可能过时或未经证实，与已知状态冲突，需人工核实最新情况。 |
| 朱军 | 4 | 4 | {"delete_raw_pool_item":4} | source_item_belongs_to_person/delete_raw_pool_item: 内容明确指向北京大学计算机学院的贾惠柱，与人物朱军无关，属于人名错配，应直接删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容是关于刘云山的新闻报道，与人物朱军完全无关，属于严重人名错配，应直接删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容指向北京大学计算机学院的Lu, Junlin，与人物朱军无关，属于人名错配，应直接删除。 |
| 布莱恩·卡坦扎罗 | 3 | 3 | {"delete_raw_pool_item":3} | source_item_belongs_to_person/delete_raw_pool_item: 审核确认内容描述的是斯坦福大学研究生Bryan J. Cannon，与英伟达副总裁布莱恩·卡坦扎罗不是同一人，属于外部内容错挂，符合安全自动删除条件。<br>source_item_belongs_to_person/delete_raw_pool_item: 审核确认内容未提及布莱恩·卡坦扎罗，且研究领域不符，属于外部内容错挂，符合安全自动删除条件。<br>source_item_belongs_to_person/delete_raw_pool_item: 审核确认论文作者列表中无布莱恩·卡坦扎罗，且主题不匹配，属于外部内容错挂，符合安全自动删除条件。 |
| 肖弘 | 3 | 3 | {"delete_raw_pool_item":3} | source_item_belongs_to_person/delete_raw_pool_item: 审核确认该LinkedIn页面属于Xiao-i公司，与人物肖弘无关，属于公司实体错配。高置信删除候选。<br>source_item_belongs_to_person/delete_raw_pool_item: 审核确认该个人主页属于清华大学博士生Changrong Xiao，与人物肖弘无关，属于人名错配。高置信删除候选。<br>source_item_belongs_to_person/delete_raw_pool_item: 审核确认该论文作者列表中无肖弘，且内容涉及小红书公司，与人物肖弘无关。高置信删除候选。 |
| 周明 | 3 | 2 | {"delete_raw_pool_item":2,"refetch_source":1} | source_item_belongs_to_person/delete_raw_pool_item: 论文作者列表中未包含周明，该内容与周明无关。属于高置信删除候选。<br>source_item_belongs_to_person/refetch_source: 提供的摘要文本为空，无法确认内容归属。需要重新抓取完整来源以核实。<br>source_item_belongs_to_person/delete_raw_pool_item: 审核确认ACL Anthology页面作者为Ming Zhang，与周明（Zhou Ming）人名错配，属于外部内容错挂，符合安全自动删除条件。 |
| 刘知远 | 2 | 2 | {"delete_raw_pool_item":2} | source_item_belongs_to_person/delete_raw_pool_item: 审核确认论文作者列表中无刘知远，内容与其无直接关联，属于外部内容错挂，符合安全自动删除条件。<br>source_item_belongs_to_person/delete_raw_pool_item: 审核确认论文作者列表中无刘知远，内容与其无直接关联，属于外部内容错挂，符合安全自动删除条件。 |
| Jaana Dogan | 2 | 1 | {"delete_raw_pool_item":2} | source_item_belongs_to_person/delete_raw_pool_item: 内容为Medium平台粉丝数页面，属于平台数据而非个人创作或贡献，不适合作为代表成果展示。属于高置信删除候选。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容来自jaan.info，作者是Jaan Tallinn，与Jaana Dogan是不同的人，属于人名错配。属于高置信删除候选。 |
| 李莲 | 2 | 1 | {"delete_raw_pool_item":2} | source_item_belongs_to_person/delete_raw_pool_item: 内容明确指向武汉纺织大学的李文莉，与人物李莲（Lilian Weng）的姓名、机构、研究领域均不匹配，应直接删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容是第三方博主对Lilian Weng博客的学习笔记，而非本人原创，属于过度归因。虽应删除，但需人工确认是否保留为参考资料。 |
| Jason Wei | 1 | 1 | {"delete_raw_pool_item":1} | source_item_belongs_to_person/delete_raw_pool_item: 内容为“WEI LAB”网站，研究方向为生物医学工程，与Jason Wei（AI研究员）的研究领域不符，属于同名实体。属于高置信删除候选。 |
| 唐杰 | 1 | 1 | {"delete_raw_pool_item":1} | source_item_belongs_to_person/delete_raw_pool_item: 该内容为北京糖塔科技有限公司官网，与唐杰教授无关。属于高置信删除候选。 |
| 戴文渊 | 1 | 1 | {"delete_raw_pool_item":1} | source_item_belongs_to_person/delete_raw_pool_item: 审核确认内容是MBZUAI新闻，未提及戴文渊，且职位关联不符，属于外部内容错挂，符合安全自动删除条件。 |
| 杰夫·迪恩 | 1 | 1 | {"delete_raw_pool_item":1} | source_item_belongs_to_person/delete_raw_pool_item: 论文作者为Adrian de Wynter和Tangming Yuan，与杰夫·迪恩无关，属于人名错配，应直接删除。 |
| 汤姆·布朗 | 1 | 1 | {"delete_raw_pool_item":1} | source_item_belongs_to_person/delete_raw_pool_item: 内容是关于俄亥俄州立大学Steven Brown的访谈，与汤姆·布朗（Tom B Brown）无关，属于人名错配，应直接删除。 |
| Jan Leike | 1 | 0 | {"refetch_source":1} | source_item_belongs_to_person/refetch_source: 内容显示Jan Leike是Google DeepMind研究员，但根据最新信息他已加入Anthropic，职位信息过时。需要重抓最新来源以确认当前职位。 |
| Oriol Vinyals | 1 | 0 | {"delete_raw_pool_item":1} | source_item_belongs_to_person/delete_raw_pool_item: 论文作者列表中未包含Oriol Vinyals，将其作为个人代表成果展示属于过度归因。属于高置信删除候选。 |
| 周伯文 | 1 | 0 | {"refetch_source":1} | source_item_belongs_to_person/refetch_source: 提供的摘要文本不完整，无法确认作者归属。需要重新抓取完整来源以核实。 |
| 黄铁军 | 1 | 0 | {"refetch_source":1} | source_item_belongs_to_person/refetch_source: 审核指出URL无法访问，无法确认内容归属。需要重新抓取来源以验证内容是否确实关于黄铁军。 |

## Safe Auto-Apply Candidates

| Person | Type | Target | Action | Reason |
| --- | --- | --- | --- | --- |
| Jaana Dogan | source_item_belongs_to_person | priorities | delete_raw_pool_item | 内容来自jaan.info，作者是Jaan Tallinn，与Jaana Dogan是不同的人，属于人名错配。属于高置信删除候选。 |
| Jason Wei | source_item_belongs_to_person | WEI LAB | delete_raw_pool_item | 内容为“WEI LAB”网站，研究方向为生物医学工程，与Jason Wei（AI研究员）的研究领域不符，属于同名实体。属于高置信删除候选。 |
| 丁洁 | source_item_belongs_to_person | Jingjie Ding - 上海交通大学BBLAB课题组 | delete_raw_pool_item | 内容为上海交通大学BBLAB课题组的硕士生“Jinjie Ding”，研究方向为光交换网络，与人物库中的“丁洁”（AI安全研究员）不符，属于同名实体。属于高置信删除候选。 |
| 周明 | source_item_belongs_to_person | Offline Training of Language Model Agents with Functions as Learnable Weights | delete_raw_pool_item | 论文作者列表中未包含周明，该内容与周明无关。属于高置信删除候选。 |
| 唐杰 | source_item_belongs_to_person | Beijing Tangta-technology Co.,Ltd | delete_raw_pool_item | 该内容为北京糖塔科技有限公司官网，与唐杰教授无关。属于高置信删除候选。 |
| 刘知远 | source_item_belongs_to_person | Applications of natural language processing and large language models in materials discovery | delete_raw_pool_item | 审核确认论文作者列表中无刘知远，内容与其无直接关联，属于外部内容错挂，符合安全自动删除条件。 |
| 刘知远 | source_item_belongs_to_person | Computer Science > Computation and Language | delete_raw_pool_item | 审核确认论文作者列表中无刘知远，内容与其无直接关联，属于外部内容错挂，符合安全自动删除条件。 |
| 周明 | source_item_belongs_to_person | Ming Zhang - ACL Anthology | delete_raw_pool_item | 审核确认ACL Anthology页面作者为Ming Zhang，与周明（Zhou Ming）人名错配，属于外部内容错挂，符合安全自动删除条件。 |
| 姚顺雨 | source_item_belongs_to_person | Dr. Shunyu Yao | delete_raw_pool_item | 审核确认该内容描述的是另一位Shunyu Yao（Google DeepMind、理论物理背景），与目标人物姚顺雨（OpenAI）不符，属于外部内容错挂，符合安全自动删除条件。 |
| 姚顺雨 | source_item_belongs_to_person | YAO Shuang | delete_raw_pool_item | 审核确认该内容描述的是中国人民大学助理教授YAO Shuang（藏学研究），与目标人物姚顺雨（AI研究者）完全不同，属于外部内容错挂，符合安全自动删除条件。 |
| 丁洁 | source_item_belongs_to_person | 南京工程学院主页平台管理系统 chenjie--Home--Home | delete_raw_pool_item | 内容明确指向南京工程学院的陈洁，与目标人物丁洁（明尼苏达大学副教授）无关，属于人名错配，应直接删除。 |
| 丁洁 | source_item_belongs_to_person | JIN Jing | delete_raw_pool_item | 内容明确指向大连化学物理研究所的JIN Jing，与目标人物丁洁（明尼苏达大学副教授）无关，属于人名错配，应直接删除。 |
| 丁洁 | source_item_belongs_to_person | 喜报！华筑科技总经理丁洁获评2025年度上海市劳动模范！ | delete_raw_pool_item | 内容明确指向华筑科技总经理丁洁，与目标人物丁洁（明尼苏达大学副教授）在职业、机构和研究领域上均不匹配，属于人名错配，应直接删除。 |
| 丁洁 | source_item_belongs_to_person | cmjuvgqhz0izormtb586qcyi5 | delete_raw_pool_item | 内容明确指向西交利物浦大学的Dr. Lifeng Ding，与目标人物丁洁（明尼苏达大学副教授）在姓名、机构和研究领域上均不匹配，属于人名错配，应直接删除。 |
| 姚顺雨 | source_item_belongs_to_person | Bridging AI and Science: Implications from a Large-Scale Literature Analysis of AI4Science | delete_raw_pool_item | 审核确认论文作者列表中无姚顺雨，内容与人物无关，属于外部内容错挂，符合安全自动删除条件。 |
| 姚顺雨 | source_item_belongs_to_person | RuAG: Learned-rule-augmented Generation for Large Language Models | delete_raw_pool_item | 审核确认论文作者列表中无姚顺雨，内容与人物无关，属于外部内容错挂，符合安全自动删除条件。 |
| 姚顺雨 | source_item_belongs_to_person | Exploring the Role of Large Language Models in Cybersecurity: A Systematic Survey | delete_raw_pool_item | 审核确认论文作者列表中无姚顺雨，内容与人物无关，属于外部内容错挂，符合安全自动删除条件。 |
| 布莱恩·卡坦扎罗 | source_item_belongs_to_person | Browse Stanford University \| Stanford Profiles | delete_raw_pool_item | 审核确认内容描述的是斯坦福大学研究生Bryan J. Cannon，与英伟达副总裁布莱恩·卡坦扎罗不是同一人，属于外部内容错挂，符合安全自动删除条件。 |
| 布莱恩·卡坦扎罗 | source_item_belongs_to_person | Honour Roll 2022 \| University of Canterbury | delete_raw_pool_item | 审核确认内容未提及布莱恩·卡坦扎罗，且研究领域不符，属于外部内容错挂，符合安全自动删除条件。 |
| 布莱恩·卡坦扎罗 | source_item_belongs_to_person | Survey of Computerized Adaptive Testing: A Machine Learning Perspective | delete_raw_pool_item | 审核确认论文作者列表中无布莱恩·卡坦扎罗，且主题不匹配，属于外部内容错挂，符合安全自动删除条件。 |
| 戴文渊 | source_item_belongs_to_person | A mystery fit for a DetectAIve: Classifying machine involvement in writing | delete_raw_pool_item | 审核确认内容是MBZUAI新闻，未提及戴文渊，且职位关联不符，属于外部内容错挂，符合安全自动删除条件。 |
| 肖弘 | source_item_belongs_to_person | Xiao-i \| LinkedIn | delete_raw_pool_item | 审核确认该LinkedIn页面属于Xiao-i公司，与人物肖弘无关，属于公司实体错配。高置信删除候选。 |
| 肖弘 | source_item_belongs_to_person | Changrong Xiao | delete_raw_pool_item | 审核确认该个人主页属于清华大学博士生Changrong Xiao，与人物肖弘无关，属于人名错配。高置信删除候选。 |
| 肖弘 | source_item_belongs_to_person | Cross-Scenario Unified Modeling of User Interests at Billion Scale | delete_raw_pool_item | 审核确认该论文作者列表中无肖弘，且内容涉及小红书公司，与人物肖弘无关。高置信删除候选。 |
| 朱军 | source_item_belongs_to_person | 贾惠柱-北京大学计算机学院 | delete_raw_pool_item | 内容明确指向北京大学计算机学院的贾惠柱，与人物朱军无关，属于人名错配，应直接删除。 |
| 朱军 | source_item_belongs_to_person | 新华社刊发刘云山系列照片（图）--新闻报道-人民网 | delete_raw_pool_item | 内容是关于刘云山的新闻报道，与人物朱军完全无关，属于严重人名错配，应直接删除。 |
| 朱军 | source_item_belongs_to_person | Lu, Junlin-北京大学计算机学院 | delete_raw_pool_item | 内容指向北京大学计算机学院的Lu, Junlin，与人物朱军无关，属于人名错配，应直接删除。 |
| 朱军 | source_item_belongs_to_person | CUDRT: Benchmarking the Detection of Human vs. Large Language Models Generated Texts | delete_raw_pool_item | 论文作者列表中未出现朱军，内容与人物无关，属于错误归因，应直接删除。 |
| 李莲 | source_item_belongs_to_person | Wenli Li 李文莉（Associate Professor）-武汉纺织大学-管理学院 | delete_raw_pool_item | 内容明确指向武汉纺织大学的李文莉，与人物李莲（Lilian Weng）的姓名、机构、研究领域均不匹配，应直接删除。 |
| 杰夫·迪恩 | source_item_belongs_to_person | The Thin Line Between Comprehension and Persuasion in LLMs | delete_raw_pool_item | 论文作者为Adrian de Wynter和Tangming Yuan，与杰夫·迪恩无关，属于人名错配，应直接删除。 |
| 汤姆·布朗 | source_item_belongs_to_person | Q&A with Steven Brown \| Office of Academic Affairs | delete_raw_pool_item | 内容是关于俄亥俄州立大学Steven Brown的访谈，与汤姆·布朗（Tom B Brown）无关，属于人名错配，应直接删除。 |

## Manual / Source Required Queue

| Person | Type | Target | Action | Queries | Reason |
| --- | --- | --- | --- | --- | --- |
| Jaana Dogan | source_item_belongs_to_person | 10610 followers - Jaana Dogan - Medium | delete_raw_pool_item |  | 内容为Medium平台粉丝数页面，属于平台数据而非个人创作或贡献，不适合作为代表成果展示。属于高置信删除候选。 |
| Jan Leike | source_item_belongs_to_person | Jan Leike - H+Pedia | refetch_source | Jan Leike Anthropic current position | 内容显示Jan Leike是Google DeepMind研究员，但根据最新信息他已加入Anthropic，职位信息过时。需要重抓最新来源以确认当前职位。 |
| Oriol Vinyals | source_item_belongs_to_person | Best Practices and Lessons Learned on Synthetic Data for Language Models | delete_raw_pool_item |  | 论文作者列表中未包含Oriol Vinyals，将其作为个人代表成果展示属于过度归因。属于高置信删除候选。 |
| 周伯文 | source_item_belongs_to_person | WenyanGPT: A Large Language Model for Classical Chinese Tasks | refetch_source | 周伯文 WenyanGPT arxiv 作者 | 提供的摘要文本不完整，无法确认作者归属。需要重新抓取完整来源以核实。 |
| 周明 | source_item_belongs_to_person | 对话AI顶尖大牛周明老师：GPT时代，感觉自己跟不上了 | refetch_source | 周明 对话AI顶尖大牛 GPT时代 跟不上 CSDN | 提供的摘要文本为空，无法确认内容归属。需要重新抓取完整来源以核实。 |
| 姚顺雨 | source_item_belongs_to_person | OpenAI expert Yao Shunyu appointed as Chief AI Scientist at Tencent | human_review | 姚顺雨 腾讯 首席AI科学家 最新职位 | 该新闻声称姚顺雨已加入腾讯，但其当前公开职位仍为OpenAI研究员。信息可能过时或未经证实，与已知状态冲突，需人工核实最新情况。 |
| 丁洁 | source_item_belongs_to_person | 我用AI“复活”了爷爷 | refetch_source | 丁洁 "我用AI复活了爷爷" site:cyzone.cn | 内容摘要为空，无法判断是否与目标人物相关。需要重新抓取来源内容以确认作者或关联性。 |
| 丁洁 | source_item_belongs_to_person | 5下《5 草船借箭》-第1课时-丁洁-有PPT 51备课部编版小学语文 | refetch_source | 丁洁 "草船借箭" site:bilibili.com | 内容摘要为空，无法判断是否与目标人物相关。需要重新抓取来源内容以确认主讲人身份。 |
| 丁洁 | source_item_belongs_to_person | SJTU Computer Science & Engineering | refetch_source | 丁洁 site:cs.sjtu.edu.cn | 内容为上海交通大学计算机学院主页，未提及目标人物丁洁，无法确认关联性。需要重新抓取来源以查找丁洁相关信息。 |
| 丁洁 | source_item_belongs_to_person | 丁洁- 88查 | refetch_source | 丁洁 site:1688.com | 内容为1688企业查询页面，摘要为空，无法判断是否与目标人物相关。需要重新抓取来源内容以确认关联性。 |
| 黄铁军 | source_item_belongs_to_person | 黄铁军对大模型的四个预判：洗牌、安全核爆、GPT-5与再造 ... | refetch_source | 黄铁军 大模型 预判 洗牌 安全核爆 GPT-5 再造 | 审核指出URL无法访问，无法确认内容归属。需要重新抓取来源以验证内容是否确实关于黄铁军。 |
| 李莲 | source_item_belongs_to_person | 【学习笔记】博客Lilian Weng - LLM Powered Autonomous ... | delete_raw_pool_item |  | 内容是第三方博主对Lilian Weng博客的学习笔记，而非本人原创，属于过度归因。虽应删除，但需人工确认是否保留为参考资料。 |
