# Fact Claim Remediation by MiMo

Generated at: 2026-06-09T15:06:54.745Z
Model: mimo-v2.5-pro

Total problem issues: 113
Selected issues: 113
Remediations: 113

## Actions

| Action | Count |
| --- | --- |
| delete_raw_pool_item | 75 |
| refetch_source | 25 |
| rewrite_conservative | 12 |
| hold | 1 |

## Safety

| Safety bucket | Count |
| --- | --- |
| safe_auto_apply | 68 |
| manual_or_source_required | 45 |

## Top People

| Person | Total | Safe | Actions | Samples |
| --- | --- | --- | --- | --- |
| 周明 | 10 | 6 | {"delete_raw_pool_item":6,"refetch_source":4} | source_item_belongs_to_person/delete_raw_pool_item: 审核确认该个人主页属于卡内基梅隆大学博士生周铭洵，与目标人物周明（澜舟科技）并非同一人，属于错误挂载，应直接删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 审核确认该文章是关于缅怀周新民教授，与人物周明无关，属于错误挂载，应直接删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 审核确认该内容是联合早报记者陈明耀的体育新闻文章，与人物周明无关，属于错误挂载，应直接删除。 |
| 丁洁 | 9 | 9 | {"delete_raw_pool_item":9} | source_item_belongs_to_person/delete_raw_pool_item: 页面为西南交通大学教师，与目标人物明尼苏达大学丁洁姓名、机构、领域均不匹配，属于人名错配，高置信删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 页面为上海交通大学Xianting Ding教授，与目标人物明尼苏达大学丁洁姓名、机构、领域均不匹配，属于人名错配，高置信删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 页面为天津大学丁虎教授，与目标人物明尼苏达大学丁洁姓名、机构、领域均不匹配，属于人名错配，高置信删除。 |
| 姚顺雨 | 8 | 5 | {"delete_raw_pool_item":5,"refetch_source":3} | source_item_belongs_to_person/delete_raw_pool_item: 内容仅为Facebook的临时访问限制提示，与姚顺雨本人无关，属于无意义内容的高置信删除候选。<br>source_item_belongs_to_person/refetch_source: 个人网站显示其当前职位为Google DeepMind研究科学家，与人物库中‘Researcher @ OpenAI’的职位信息冲突，可能过时。需要重抓来源以确认最新职位。<br>source_item_belongs_to_person/refetch_source: 个人网站显示其当前职位为Google DeepMind研究科学家，与人物库中‘Researcher @ OpenAI’的职位信息冲突，可能过时。需要重抓来源以确认最新职位。 |
| 刘知远 | 6 | 2 | {"delete_raw_pool_item":4,"refetch_source":2} | source_item_belongs_to_person/delete_raw_pool_item: 内容是关于历史人物“劉贇”的维基页面，与AI学者刘知远无关，属于人名错配。高置信删除候选。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容明确关于历史人物张辽，与AI学者刘知远无关，属于人名错配，置信度高，可安全自动删除。<br>source_item_belongs_to_person/refetch_source: 标题提及刘知远团队，但摘要为空，无法确认。需重抓来源以获取完整内容进行验证。 |
| Jaana Dogan | 5 | 4 | {"delete_raw_pool_item":4,"refetch_source":1} | source_item_belongs_to_person/delete_raw_pool_item: 内容是Jan AI产品介绍，与Jaana Dogan个人无关，属于错误归因。根据策略，高置信度的错误归因可安全自动删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容是Jan AI官方文档，与Jaana Dogan个人无关，属于错误归因。根据策略，高置信度的错误归因可安全自动删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 技术报告作者为Alan Dao和Dinh Bach Vu，属于Menlo Research团队，与Jaana Dogan个人无关，属于错误归因。根据策略，高置信度的错误归因可安全... |
| 布莱恩·卡坦扎罗 | 5 | 4 | {"delete_raw_pool_item":4,"refetch_source":1} | source_item_belongs_to_person/delete_raw_pool_item: 审核确认文章作者列表不包含布莱恩·卡坦扎罗，属于错误归属。符合安全自动删除条件。<br>source_item_belongs_to_person/delete_raw_pool_item: 审核确认arXiv列表页面与布莱恩·卡坦扎罗无直接关联，属于错误归属。符合安全自动删除条件。<br>source_item_belongs_to_person/delete_raw_pool_item: 审核确认arXiv列表页面与布莱恩·卡坦扎罗无直接关联，属于错误归属。符合安全自动删除条件。 |
| 周伯文 | 5 | 1 | {"delete_raw_pool_item":2,"refetch_source":2,"hold":1} | source_item_belongs_to_person/delete_raw_pool_item: 内容明确关于中国古代人物杜伯，与AI从业者周伯文无关，属于人名错配，置信度高，可安全自动删除。<br>source_item_belongs_to_person/refetch_source: 审核指出作者列表中未出现周伯文，但置信度不高。需重抓来源以获取完整作者列表进行确认。<br>source_item_belongs_to_person/refetch_source: 提供的文本为模板占位符，无法确认内容。需重抓来源以获取文章实际内容进行验证。 |
| 朱军 | 4 | 4 | {"delete_raw_pool_item":4} | source_item_belongs_to_person/delete_raw_pool_item: 内容明确指向厦门大学朱呈祥教授，与清华大学AI教授朱军无关，属于高置信度人名错配，应直接删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容明确指向南华大学核科学技术学院的朱健，与清华大学AI教授朱军无关，属于高置信度人名错配，应直接删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容明确指向武汉大学经济与管理学院的讲师刘军，与清华大学AI教授朱军无关，属于高置信度人名错配，应直接删除。 |
| 李莲 | 4 | 4 | {"delete_raw_pool_item":4} | source_item_belongs_to_person/delete_raw_pool_item: 内容明确指向Lilian Weng（翁荔）的离职新闻，与人物“李莲”不符，属于高置信度人名错配，应直接删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容明确指向Lilian Weng（翁荔）成为Fellows Fund研究员的新闻，与人物“李莲”不符，属于高置信度人名错配，应直接删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容明确指向Lillian Liu（刘文萱）的个人网站，与人物“李莲”不符，属于高置信度人名错配，应直接删除。 |
| 肖弘 | 4 | 3 | {"refetch_source":1,"delete_raw_pool_item":3} | source_item_belongs_to_person/refetch_source: 视频标题提及人物，但提供的摘要为频道介绍，无法确认视频内容是否相关。需要重新抓取源内容以验证。<br>source_item_belongs_to_person/delete_raw_pool_item: 该主页属于浙江大学博士生肖书宏，与目标人物（Manus创始人肖弘）是不同的人，属于明确的错误匹配，可安全删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 该论文作者单位为小米，与目标人物（Manus创始人肖弘）无关，属于明确的错误匹配，可安全删除。 |
| 季逸超 | 3 | 3 | {"delete_raw_pool_item":3} | source_item_belongs_to_person/delete_raw_pool_item: 审核确认播客内容与季逸超无关，属于错误归属。符合安全自动删除条件。<br>source_item_belongs_to_person/delete_raw_pool_item: 审核确认播客内容与季逸超无关，属于错误归属。符合安全自动删除条件。<br>source_item_belongs_to_person/delete_raw_pool_item: 播客《一份报纸40年里的兴衰》的摘要为“削峰填谷 PEAK CUT”，但内容未提及季逸超，且播客主题与人物专业领域（AI）无关。属于高置信删除候选。 |
| 杰夫·迪恩 | 3 | 3 | {"delete_raw_pool_item":3} | source_item_belongs_to_person/delete_raw_pool_item: 内容是关于肯塔基大学工程学院院长名单，与谷歌首席科学家杰夫·迪恩无关，属于同名实体错配，高置信删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容是密苏里州立大学院长办公室教职工页面，与谷歌首席科学家杰夫·迪恩无关，属于同名实体错配，高置信删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 论文作者列表中无杰夫·迪恩，内容与他无关，属于错误归因，高置信删除。 |
| Elon Musk | 3 | 2 | {"delete_raw_pool_item":3} | source_item_belongs_to_person/delete_raw_pool_item: 论文作者列表中无Elon Musk，内容为医学研究，与人物背景不符，属于人名错配。根据策略，此类高置信删除候选可安全自动执行。<br>source_item_belongs_to_person/delete_raw_pool_item: 论文作者列表中无Elon Musk，内容为SpaceX团队项目成果，不应归因于个人，属于过度归因。根据策略，此类高置信删除候选可安全自动执行。<br>source_item_belongs_to_person/delete_raw_pool_item: 论文作者列表中无Elon Musk，内容为新冠疫苗免疫学研究，与人物无关，属于人名错配。根据策略，此类高置信删除候选可安全自动执行。 |
| 唐杰 | 3 | 2 | {"delete_raw_pool_item":2,"refetch_source":1} | source_item_belongs_to_person/delete_raw_pool_item: 内容指向浙江大学化学与生物工程学院的Jianbin Tang，与人物唐杰（清华大学）无关，属于人名错配的高置信删除候选。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容指向苏州大学的Zecheng Tang（汤泽成），与人物唐杰（清华大学）无关，属于人名错配的高置信删除候选。<br>source_item_belongs_to_person/refetch_source: 文章未明确提及唐杰，需重抓来源确认其是否被提及或关联，避免错误归因。 |
| 汤姆·布朗 | 3 | 2 | {"delete_raw_pool_item":2,"refetch_source":1} | source_item_belongs_to_person/delete_raw_pool_item: 内容明确关于前DeepMind AI未来学家Steve Brown，与汤姆·布朗（Tom Brown）无关，属于人名错配，高置信删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容为同名人物讣告，与目标人物（Anthropic联合创始人）背景完全不符，属于明确的错误匹配，可安全删除。<br>source_item_belongs_to_person/refetch_source: 帖子标题提及人物，但摘要为空，无法确认内容相关性。需要重新抓取源内容以验证。 |
| Guillaume Lample | 3 | 0 | {"rewrite_conservative":3} | source_item_belongs_to_person/rewrite_conservative: LLaMA是团队成果，个人作为作者之一。审核建议重写，保守改写以明确其作者身份，避免将整个模型归为个人成果。<br>source_item_belongs_to_person/rewrite_conservative: LLaMA是团队成果，个人作为作者之一。审核建议重写，保守改写以明确其作者身份，避免将整个模型归为个人成果。<br>source_item_belongs_to_person/rewrite_conservative: 内容是维基百科页面，属于团队成果。审核建议重写，保守改写以明确其作者身份，避免过度归因。 |
| Lukasz Kaiser | 3 | 0 | {"rewrite_conservative":2,"refetch_source":1} | source_item_belongs_to_person/rewrite_conservative: 文章将GPT-4、GPT-5等具体模型版本的开发归因于Lukasz Kaiser个人，属于团队成果的过度归因。需要保守改写以准确反映其贡献。<br>source_item_belongs_to_person/rewrite_conservative: 文章标题称Lukasz Kaiser为“Transformer的发明者”，过度归因了团队成果。需要保守改写以准确反映其作为论文作者之一的角色。<br>source_item_belongs_to_person/refetch_source: 当前摘要未提及Lukasz Kaiser，需重抓来源以确认其是否为论文作者。若确认非作者，则应删除。 |
| Boris Cherny | 2 | 2 | {"delete_raw_pool_item":2} | source_item_belongs_to_person/delete_raw_pool_item: 内容为Stack Overflow技术问题，提问者和回答者均为“Barmar”，与Boris Cherny无关，属于人名错配。根据策略，此类高置信删除候选可安全自动执行。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容为GPT Workspace博客文章，未署名且未提及Boris Cherny，与其背景无关，属于人名错配。根据策略，此类高置信删除候选可安全自动执行。 |
| Jan Leike | 2 | 2 | {"delete_raw_pool_item":2} | source_item_belongs_to_person/delete_raw_pool_item: 内容是第三方Danilo T.在LinkedIn上关于Jan Leike的帖子，并非Jan Leike本人的原创内容，属于错误归因。根据策略，高置信度的错误归因可安全自动删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容作者与人物无关，属于人名错配。审核建议删除，高置信度，符合安全自动应用条件。 |
| Rob Bensinger | 2 | 2 | {"delete_raw_pool_item":2} | source_item_belongs_to_person/delete_raw_pool_item: GitHub仓库作者用户名为TetraspaceW，与Rob Bensinger无关联，属于人名错配，高置信删除。<br>source_item_belongs_to_person/delete_raw_pool_item: GitHub仓库作者用户名为TetraspaceW，与Rob Bensinger无关联，属于人名错配，高置信删除。 |
| 戴文渊 | 2 | 2 | {"delete_raw_pool_item":2} | source_item_belongs_to_person/delete_raw_pool_item: 审核确认HunyuanDiT是腾讯项目，与戴文渊或第四范式无关，属于人名错配。符合安全自动删除条件。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容明确指向Binyuan Hui的个人主页，与戴文渊无关，属于高置信度人名错配，应直接删除。 |
| 桑达尔·皮查伊 | 2 | 2 | {"delete_raw_pool_item":2} | source_item_belongs_to_person/delete_raw_pool_item: 视频由用户'Jaspal'上传，是关于皮查伊的建议汇编，并非皮查伊本人发布或参与的访谈，属于人名错配，高置信删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 视频由Yahoo Finance制作，是关于如何发音皮查伊名字的分析，并非皮查伊本人发布或参与的访谈，属于人名错配，高置信删除。 |
| Oriol Vinyals | 2 | 1 | {"rewrite_conservative":1,"delete_raw_pool_item":1} | source_item_belongs_to_person/rewrite_conservative: 内容过度关联加密货币市场，夸大了人物在金融领域的角色，需保守改写以聚焦其AI研究身份。<br>source_item_belongs_to_person/delete_raw_pool_item: 论文作者列表中无Oriol Vinyals，内容与人物无关，属于错误归因，可安全删除。 |
| Daniela Amodei | 2 | 0 | {"refetch_source":1,"delete_raw_pool_item":1} | source_item_belongs_to_person/refetch_source: 当前抓取内容仅为LinkedIn登录页面，无法验证帖子真实性。需要重新抓取以获取帖子正文，确认其归属和内容相关性。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容为新闻网站标签页，是聚合页面而非个人原创或代表成果，属于过度归因。根据策略，此类高置信删除候选可安全自动执行。 |
| Percy Liang | 2 | 0 | {"rewrite_conservative":1,"refetch_source":1} | source_item_belongs_to_person/rewrite_conservative: 视频主讲人为Yann Dubois，Percy Liang仅作为导师被提及，将整个视频归为其代表成果属于过度归因，需保守改写。<br>source_item_belongs_to_person/refetch_source: 当前摘要为通用趋势页面，未显示Percy Liang相关内容，需重抓来源以获取准确信息。 |
| Quoc Le | 2 | 0 | {"rewrite_conservative":1,"delete_raw_pool_item":1} | source_item_belongs_to_person/rewrite_conservative: Quoc Le是LaMDA论文众多作者之一，并非第一作者或负责人，将单篇论文作为个人代表成果可能过度归因，需保守改写。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容为Transformer架构的通用维基百科页面，并非Quoc Le的个人成果或专属内容，归因层级错误，应删除。 |
| Wojciech Zaremba | 2 | 0 | {"rewrite_conservative":2} | source_item_belongs_to_person/rewrite_conservative: 文章将ChatGPT成功过度归因于个人，需保守改写以强调其领导角色而非具体产品创造者。<br>source_item_belongs_to_person/rewrite_conservative: 文章将GPT-3等产品过度归因于个人，需保守改写以强调其作为研究负责人的贡献。 |
| Jason Wei | 1 | 1 | {"delete_raw_pool_item":1} | source_item_belongs_to_person/delete_raw_pool_item: GitHub页面显示用户名为'wei'，但个人资料明确显示为'Wei He'，与目标人物Jason Wei不符，属于人名错配。根据策略，高置信度的错误归因可安全自动删除。 |
| Marc Andreessen | 1 | 1 | {"delete_raw_pool_item":1} | source_item_belongs_to_person/delete_raw_pool_item: 视频主讲人明确为Marc Andrusko等人，与Marc Andreessen无关，属于错误归因，可安全删除。 |
| 黄铁军 | 1 | 1 | {"delete_raw_pool_item":1} | source_item_belongs_to_person/delete_raw_pool_item: 文章作者为中兴通讯员工，内容未提及目标人物黄铁军，属于明确的错误匹配，可安全删除。 |
| Arthur Mensch | 1 | 0 | {"refetch_source":1} | source_item_belongs_to_person/refetch_source: 当前抓取内容仅为YouTube页面框架，无法确认视频具体内容。需要重新抓取以验证Arthur Mensch的参与和内容相关性。 |
| Emad Mostaque | 1 | 0 | {"rewrite_conservative":1} | source_item_belongs_to_person/rewrite_conservative: 内容是公司官方博客，非个人代表成果。审核建议重写，保守改写以反映其CEO角色，避免过度归因。 |
| Greg Brockman | 1 | 0 | {"rewrite_conservative":1} | source_item_belongs_to_person/rewrite_conservative: 内容是公司产品发布，未提及个人贡献。审核建议重写，保守改写以反映其领导角色，或移除。 |
| Hyung Won Chung | 1 | 0 | {"refetch_source":1} | source_item_belongs_to_person/refetch_source: 内容是arXiv搜索结果页面，非具体论文。审核建议重抓来源，以获取其个人作者页面或具体论文列表。 |
| Santiago Valdarrama | 1 | 0 | {"refetch_source":1} | source_item_belongs_to_person/refetch_source: 视频为公司产品宣传，未明确个人角色，需重抓来源确认其具体职位或贡献。 |
| 凯文·斯科特 | 1 | 0 | {"refetch_source":1} | source_item_belongs_to_person/refetch_source: Reddit帖子标题提及凯文·斯科特，但摘要为空，无法确认内容是否直接相关或为转载，需进一步核实。 |
| 科拉伊·卡武克丘奥卢 | 1 | 0 | {"delete_raw_pool_item":1} | source_item_belongs_to_person/delete_raw_pool_item: 论文作者为OpenAI团队，未显示科拉伊·卡武克丘奥卢为作者，属于团队成果过度归因给个人，保守删除。 |
| 迈克·施罗普费尔 | 1 | 0 | {"refetch_source":1} | source_item_belongs_to_person/refetch_source: 文章报道的是2021年的历史事件，其职位已更新。需要重新抓取当前来源以确认最新状态或补充历史背景。 |
| 雅各布·乌什科雷特 | 1 | 0 | {"refetch_source":1} | source_item_belongs_to_person/refetch_source: 内容描述其为谷歌柏林团队负责人，但审核指出其已离开谷歌。当前职位信息过时，需重抓最新来源以确认其现状，再决定是否更新或删除。 |

## Safe Auto-Apply Candidates

| Person | Type | Target | Action | Reason |
| --- | --- | --- | --- | --- |
| Jaana Dogan | source_item_belongs_to_person | Jan - Open-source ChatGPT alternative that runs 100% offline | delete_raw_pool_item | 内容是Jan AI产品介绍，与Jaana Dogan个人无关，属于错误归因。根据策略，高置信度的错误归因可安全自动删除。 |
| Jaana Dogan | source_item_belongs_to_person | What is Jan? | delete_raw_pool_item | 内容是Jan AI官方文档，与Jaana Dogan个人无关，属于错误归因。根据策略，高置信度的错误归因可安全自动删除。 |
| Jaana Dogan | source_item_belongs_to_person | Jan-nano Technical Report | delete_raw_pool_item | 技术报告作者为Alan Dao和Dinh Bach Vu，属于Menlo Research团队，与Jaana Dogan个人无关，属于错误归因。根据策略，高置信度的错误归因可安全自动删除。 |
| Jaana Dogan | source_item_belongs_to_person | What Is Generative AI? | delete_raw_pool_item | 内容是Neo4j公司博客文章，作者为Enzo，与Jaana Dogan个人无关，属于错误归因。根据策略，高置信度的错误归因可安全自动删除。 |
| Jan Leike | source_item_belongs_to_person | Jan Leike (@janleike) on X \| Danilo T. | delete_raw_pool_item | 内容是第三方Danilo T.在LinkedIn上关于Jan Leike的帖子，并非Jan Leike本人的原创内容，属于错误归因。根据策略，高置信度的错误归因可安全自动删除。 |
| Jason Wei | source_item_belongs_to_person | wei - Overview | delete_raw_pool_item | GitHub页面显示用户名为'wei'，但个人资料明确显示为'Wei He'，与目标人物Jason Wei不符，属于人名错配。根据策略，高置信度的错误归因可安全自动删除。 |
| Marc Andreessen | source_item_belongs_to_person | How AI Agents Will Transform in 2026 (a16z Big Ideas) | delete_raw_pool_item | 视频主讲人明确为Marc Andrusko等人，与Marc Andreessen无关，属于错误归因，可安全删除。 |
| Oriol Vinyals | source_item_belongs_to_person | Probing Visual Language Priors in VLMs | delete_raw_pool_item | 论文作者列表中无Oriol Vinyals，内容与人物无关，属于错误归因，可安全删除。 |
| Boris Cherny | source_item_belongs_to_person | I keep getting [object Object] as the data passed instead of ... | delete_raw_pool_item | 内容为Stack Overflow技术问题，提问者和回答者均为“Barmar”，与Boris Cherny无关，属于人名错配。根据策略，此类高置信删除候选可安全自动执行。 |
| Boris Cherny | source_item_belongs_to_person | The Context Window: Your AI's "Memory" | delete_raw_pool_item | 内容为GPT Workspace博客文章，未署名且未提及Boris Cherny，与其背景无关，属于人名错配。根据策略，此类高置信删除候选可安全自动执行。 |
| Elon Musk | source_item_belongs_to_person | Epidemiological and immunological features of obesity and SARS-CoV-2 | delete_raw_pool_item | 论文作者列表中无Elon Musk，内容为医学研究，与人物背景不符，属于人名错配。根据策略，此类高置信删除候选可安全自动执行。 |
| Elon Musk | source_item_belongs_to_person | Resilient Fc-Effector Functions Across SARS-CoV-2 Variants of Concern Following mRNA-1273 Vaccination | delete_raw_pool_item | 论文作者列表中无Elon Musk，内容为新冠疫苗免疫学研究，与人物无关，属于人名错配。根据策略，此类高置信删除候选可安全自动执行。 |
| Jan Leike | source_item_belongs_to_person | From task structures to world models: what do LLMs know? | delete_raw_pool_item | 内容作者与人物无关，属于人名错配。审核建议删除，高置信度，符合安全自动应用条件。 |
| Rob Bensinger | source_item_belongs_to_person | TetraspaceW/AFungus | delete_raw_pool_item | GitHub仓库作者用户名为TetraspaceW，与Rob Bensinger无关联，属于人名错配，高置信删除。 |
| Rob Bensinger | source_item_belongs_to_person | TetraspaceW/tcatcc-backend | delete_raw_pool_item | GitHub仓库作者用户名为TetraspaceW，与Rob Bensinger无关联，属于人名错配，高置信删除。 |
| 丁洁 | source_item_belongs_to_person | 西南交通大学教师主页 dingjing--Home--Published Books | delete_raw_pool_item | 页面为西南交通大学教师，与目标人物明尼苏达大学丁洁姓名、机构、领域均不匹配，属于人名错配，高置信删除。 |
| 丁洁 | source_item_belongs_to_person | School of biomedical engineering, Shanghai jiaotong university | delete_raw_pool_item | 页面为上海交通大学Xianting Ding教授，与目标人物明尼苏达大学丁洁姓名、机构、领域均不匹配，属于人名错配，高置信删除。 |
| 丁洁 | source_item_belongs_to_person | 天津大学教师个人主页系统 丁虎 Home Home | delete_raw_pool_item | 页面为天津大学丁虎教授，与目标人物明尼苏达大学丁洁姓名、机构、领域均不匹配，属于人名错配，高置信删除。 |
| 丁洁 | source_item_belongs_to_person | 天津大学教师个人主页系统 丁辉 Hui Ding*, Lingxiao Xue, Jiahao Cui, Yongqiang Wang*, Dan Zhao, Xing Zhi, Rui Liu, Jianfeng Fu, Shejiang Liu, Bingfeng Fu, Jiahui Shi, Ximeng Xu, Gang Kevin Li*. Catalytic degradation of benzene at room temperature over FeN4O2 sites embedded in porous carbon[J]. Journal of Hazardous Materials, 2023, 460: 1-9. Personal Profile | delete_raw_pool_item | 内容明确指向天津大学的丁辉（Hui Ding），其研究领域为环境化学，与目标人物丁洁（AI安全、大语言模型）的研究领域完全不同，属于人名错配。高置信删除候选。 |
| 丁洁 | source_item_belongs_to_person | 天津大学教师个人主页系统 丁士元 Home Personal Profile | delete_raw_pool_item | 内容明确指向天津大学的丁士元（Ding Shiyuan），其研究领域为环境有机化学，与目标人物丁洁（AI安全、大语言模型）的研究领域完全不同，属于人名错配。高置信删除候选。 |
| 丁洁 | source_item_belongs_to_person | DING Kemi - Faculty - SUSTech | delete_raw_pool_item | 内容明确指向南方科技大学的丁可米（Kemi Ding），其研究领域为电子与计算机工程，与目标人物丁洁（AI安全、大语言模型）的研究领域完全不同，属于人名错配。高置信删除候选。 |
| 丁洁 | source_item_belongs_to_person | DING Weiping-西南交通大学-机械工程学院 | delete_raw_pool_item | 内容明确指向西南交通大学的丁卫平（Ding Weiping），其研究领域为机械工程、汽车NVH，与目标人物丁洁（AI安全、大语言模型）的研究领域完全不同，属于人名错配。高置信删除候选。 |
| 丁洁 | source_item_belongs_to_person | 讲讲我所认识的医生们 | delete_raw_pool_item | 文章中的“丁洁”是北大医院的儿科医生，与目标人物丁洁（明尼苏达大学副教授，研究AI安全）的职业和领域完全不同，属于同名错配。高置信删除候选。 |
| 丁洁 | source_item_belongs_to_person | The Illusion of China’s AI Prowess: Regulating AI Will Not Set America Back in the Technology Race | delete_raw_pool_item | 文章作者之一是Jeffrey Ding（乔治华盛顿大学助理教授），与目标人物丁洁（明尼苏达大学副教授）姓名不同，属于人名错配。高置信删除候选。 |
| 刘知远 | source_item_belongs_to_person | 劉贇 - Chinese Text Project | delete_raw_pool_item | 内容是关于历史人物“劉贇”的维基页面，与AI学者刘知远无关，属于人名错配。高置信删除候选。 |
| 刘知远 | source_item_belongs_to_person | 張遼 - Chinese Text Project | delete_raw_pool_item | 内容明确关于历史人物张辽，与AI学者刘知远无关，属于人名错配，置信度高，可安全自动删除。 |
| 周伯文 | source_item_belongs_to_person | 杜伯 - 中國哲學書電子化計劃 | delete_raw_pool_item | 内容明确关于中国古代人物杜伯，与AI从业者周伯文无关，属于人名错配，置信度高，可安全自动删除。 |
| 周明 | source_item_belongs_to_person | Mingxun Zhou (周铭洵) | delete_raw_pool_item | 审核确认该个人主页属于卡内基梅隆大学博士生周铭洵，与目标人物周明（澜舟科技）并非同一人，属于错误挂载，应直接删除。 |
| 周明 | source_item_belongs_to_person | 寄托哀思：缅怀周新民教授 | delete_raw_pool_item | 审核确认该文章是关于缅怀周新民教授，与人物周明无关，属于错误挂载，应直接删除。 |
| 周明 | source_item_belongs_to_person | 陈明耀 作者的文章 \| 联合早报 | delete_raw_pool_item | 审核确认该内容是联合早报记者陈明耀的体育新闻文章，与人物周明无关，属于错误挂载，应直接删除。 |
| 周明 | source_item_belongs_to_person | 王文明-Zhejiang University Personal homepage | delete_raw_pool_item | 审核确认该内容是浙江大学王文明教授的个人主页，与人物周明无关，属于错误挂载，应直接删除。 |
| 周明 | source_item_belongs_to_person | The AI Agent Era Requires a New Kind of Game Theory | delete_raw_pool_item | 文章明确关于Zico Kolter，与人物周明无关，属于人名错配的高置信删除候选。 |
| 周明 | source_item_belongs_to_person | Ming Ming Sun - BIMSA | delete_raw_pool_item | 内容明确指向BIMSA的Mingming Sun，与人物周明无关，属于人名错配的高置信删除候选。 |
| 唐杰 | source_item_belongs_to_person | Jianbin Tang-Zhejiang University Personal homepage | delete_raw_pool_item | 内容指向浙江大学化学与生物工程学院的Jianbin Tang，与人物唐杰（清华大学）无关，属于人名错配的高置信删除候选。 |
| 唐杰 | source_item_belongs_to_person | Zecheng Tang \| Homepage | delete_raw_pool_item | 内容指向苏州大学的Zecheng Tang（汤泽成），与人物唐杰（清华大学）无关，属于人名错配的高置信删除候选。 |
| 姚顺雨 | source_item_belongs_to_person | Log in or sign up to view | delete_raw_pool_item | 内容仅为Facebook的临时访问限制提示，与姚顺雨本人无关，属于无意义内容的高置信删除候选。 |
| 季逸超 | source_item_belongs_to_person | 第十三集：每个人都有要跨越的山峰！Everyone has their own peaks to reach！ | delete_raw_pool_item | 审核确认播客内容与季逸超无关，属于错误归属。符合安全自动删除条件。 |
| 季逸超 | source_item_belongs_to_person | 1986年北京女文青的三轮挎斗进藏之旅 | delete_raw_pool_item | 审核确认播客内容与季逸超无关，属于错误归属。符合安全自动删除条件。 |
| 布莱恩·卡坦扎罗 | source_item_belongs_to_person | What We Learned from a Year of Building with LLMs (Part I) | delete_raw_pool_item | 审核确认文章作者列表不包含布莱恩·卡坦扎罗，属于错误归属。符合安全自动删除条件。 |
| 布莱恩·卡坦扎罗 | source_item_belongs_to_person | Computer Science Jul 2024 | delete_raw_pool_item | 审核确认arXiv列表页面与布莱恩·卡坦扎罗无直接关联，属于错误归属。符合安全自动删除条件。 |
| 布莱恩·卡坦扎罗 | source_item_belongs_to_person | Computer Science May 2024 | delete_raw_pool_item | 审核确认arXiv列表页面与布莱恩·卡坦扎罗无直接关联，属于错误归属。符合安全自动删除条件。 |
| 布莱恩·卡坦扎罗 | source_item_belongs_to_person | Computer Science Mar 2024 | delete_raw_pool_item | 审核确认arXiv列表页面与布莱恩·卡坦扎罗无直接关联，属于错误归属。符合安全自动删除条件。 |
| 戴文渊 | source_item_belongs_to_person | HunyuanDiT | delete_raw_pool_item | 审核确认HunyuanDiT是腾讯项目，与戴文渊或第四范式无关，属于人名错配。符合安全自动删除条件。 |
| 姚顺雨 | source_item_belongs_to_person | Yushan Yao | delete_raw_pool_item | 内容明确指向明尼苏达大学金融数学专业的‘Yushan Yao’，与AI研究员姚顺雨（Shunyu Yao）并非同一人。属于高置信删除候选。 |
| 姚顺雨 | source_item_belongs_to_person | EP06-AI产业链25年巡礼总结和26年展望(GPU ASIC 谷歌 ... | delete_raw_pool_item | 播客内容为AI产业分析，仅在讨论腾讯时提及‘姚舜禹’（可能为姚顺雨的误写），但未提供其本人参与或贡献的证据，无法确认归属。属于高置信删除候选。 |
| 姚顺雨 | source_item_belongs_to_person | About Me | delete_raw_pool_item | 内容明确指向字节跳动研究员‘Yu Bao (鲍宇)’，与AI研究员姚顺雨（Shunyu Yao）并非同一人。属于高置信删除候选。 |
| 姚顺雨 | source_item_belongs_to_person | shuyao95 - Overview | delete_raw_pool_item | GitHub 用户 'shuyao95' 的个人资料显示其为 Yao SHU，隶属于香港科技大学（广州），与目标人物姚顺雨（OpenAI 研究员）不符。属于高置信删除候选。 |
| 季逸超 | source_item_belongs_to_person | 一份报纸40年里的兴衰 | delete_raw_pool_item | 播客《一份报纸40年里的兴衰》的摘要为“削峰填谷 PEAK CUT”，但内容未提及季逸超，且播客主题与人物专业领域（AI）无关。属于高置信删除候选。 |
| 戴文渊 | source_item_belongs_to_person | Binyuan Hui | delete_raw_pool_item | 内容明确指向Binyuan Hui的个人主页，与戴文渊无关，属于高置信度人名错配，应直接删除。 |
| 朱军 | source_item_belongs_to_person | 朱呈祥-航空航天学院 | delete_raw_pool_item | 内容明确指向厦门大学朱呈祥教授，与清华大学AI教授朱军无关，属于高置信度人名错配，应直接删除。 |
| 朱军 | source_item_belongs_to_person | 朱健-南华大学-核科学技术学院 | delete_raw_pool_item | 内容明确指向南华大学核科学技术学院的朱健，与清华大学AI教授朱军无关，属于高置信度人名错配，应直接删除。 |
| 朱军 | source_item_belongs_to_person | LIU Jun-武汉大学经济与管理学院 | delete_raw_pool_item | 内容明确指向武汉大学经济与管理学院的讲师刘军，与清华大学AI教授朱军无关，属于高置信度人名错配，应直接删除。 |
| 朱军 | source_item_belongs_to_person | 朱燕民-上海交通大学计算机学院（网络空间安全学院、密码学院） | delete_raw_pool_item | 内容明确指向上海交通大学计算机学院的朱燕民，与清华大学AI教授朱军无关，属于高置信度人名错配，应直接删除。 |
| 李莲 | source_item_belongs_to_person | Lilian Weng departs OpenAI in latest shift among AI safety researchers | delete_raw_pool_item | 内容明确指向Lilian Weng（翁荔）的离职新闻，与人物“李莲”不符，属于高置信度人名错配，应直接删除。 |
| 李莲 | source_item_belongs_to_person | Fellows Fund Welcomes Lilian Weng as New Distinguished Fellow | delete_raw_pool_item | 内容明确指向Lilian Weng（翁荔）成为Fellows Fund研究员的新闻，与人物“李莲”不符，属于高置信度人名错配，应直接删除。 |
| 李莲 | source_item_belongs_to_person | Welcome to my logbook! | delete_raw_pool_item | 内容明确指向Lillian Liu（刘文萱）的个人网站，与人物“李莲”不符，属于高置信度人名错配，应直接删除。 |
| 李莲 | source_item_belongs_to_person | OpenAI safety exec calls for responsible AI development at Bilibili event | delete_raw_pool_item | 内容明确关于Lilian Weng Li（翁荔），与人物“李莲”不符，属于人名错配，高置信删除候选。 |
| 杰夫·迪恩 | source_item_belongs_to_person | Fall 2022 Dean's List Includes 1,034 Engineering Students | delete_raw_pool_item | 内容是关于肯塔基大学工程学院院长名单，与谷歌首席科学家杰夫·迪恩无关，属于同名实体错配，高置信删除。 |
| 杰夫·迪恩 | source_item_belongs_to_person | CNAS Dean's Office Faculty and Staff - College of Natural and Applied Sciences | delete_raw_pool_item | 内容是密苏里州立大学院长办公室教职工页面，与谷歌首席科学家杰夫·迪恩无关，属于同名实体错配，高置信删除。 |
| 杰夫·迪恩 | source_item_belongs_to_person | The AI Agent Index | delete_raw_pool_item | 论文作者列表中无杰夫·迪恩，内容与他无关，属于错误归因，高置信删除。 |
| 汤姆·布朗 | source_item_belongs_to_person | Former DeepMind AI Futurist Steve Brown Explains Why AI is a Teammate, Not Just a Tool, on Digital Disruption Podcast | delete_raw_pool_item | 内容明确关于前DeepMind AI未来学家Steve Brown，与汤姆·布朗（Tom Brown）无关，属于人名错配，高置信删除。 |
| 桑达尔·皮查伊 | source_item_belongs_to_person | Sundar Pichai's advice for all entrepreneurs! | delete_raw_pool_item | 视频由用户'Jaspal'上传，是关于皮查伊的建议汇编，并非皮查伊本人发布或参与的访谈，属于人名错配，高置信删除。 |
| 桑达尔·皮查伊 | source_item_belongs_to_person | Alphabet CEO: How do you pronounce Sundar Pichai? | delete_raw_pool_item | 视频由Yahoo Finance制作，是关于如何发音皮查伊名字的分析，并非皮查伊本人发布或参与的访谈，属于人名错配，高置信删除。 |
| 汤姆·布朗 | source_item_belongs_to_person | Obituary information for Tom Brown | delete_raw_pool_item | 内容为同名人物讣告，与目标人物（Anthropic联合创始人）背景完全不符，属于明确的错误匹配，可安全删除。 |
| 肖弘 | source_item_belongs_to_person | Xiao Shuhong's Home Page | delete_raw_pool_item | 该主页属于浙江大学博士生肖书宏，与目标人物（Manus创始人肖弘）是不同的人，属于明确的错误匹配，可安全删除。 |
| 肖弘 | source_item_belongs_to_person | MiMo: Unlocking the Reasoning Potential of Language Model – From Pretraining to Posttraining | delete_raw_pool_item | 该论文作者单位为小米，与目标人物（Manus创始人肖弘）无关，属于明确的错误匹配，可安全删除。 |
| 肖弘 | source_item_belongs_to_person | All-in-One AI Tools for RedNote Content Creators | delete_raw_pool_item | 该内容是关于小红书平台规则的博客，与目标人物（Manus创始人肖弘）无关，属于明确的错误匹配，可安全删除。 |
| 黄铁军 | source_item_belongs_to_person | 人工智能技术与应用前沿 | delete_raw_pool_item | 文章作者为中兴通讯员工，内容未提及目标人物黄铁军，属于明确的错误匹配，可安全删除。 |

## Manual / Source Required Queue

| Person | Type | Target | Action | Queries | Reason |
| --- | --- | --- | --- | --- | --- |
| Lukasz Kaiser | source_item_belongs_to_person | From Transformer to GPT-5: Hear "First-Principles Thinking ... | rewrite_conservative |  | 文章将GPT-4、GPT-5等具体模型版本的开发归因于Lukasz Kaiser个人，属于团队成果的过度归因。需要保守改写以准确反映其贡献。 |
| Lukasz Kaiser | source_item_belongs_to_person | "First Principles Thinking of Large Models": A Record of the Conversation between LI Jianzhong, GPT-5, and Lukasz Kaiser, the Inventor of Transformer | rewrite_conservative |  | 文章标题称Lukasz Kaiser为“Transformer的发明者”，过度归因了团队成果。需要保守改写以准确反映其作为论文作者之一的角色。 |
| Lukasz Kaiser | source_item_belongs_to_person | Perceiver AR: general-purpose, long-context autoregressive generation | refetch_source | Lukasz Kaiser Perceiver AR author<br>Perceiver AR paper authors list | 当前摘要未提及Lukasz Kaiser，需重抓来源以确认其是否为论文作者。若确认非作者，则应删除。 |
| Oriol Vinyals | source_item_belongs_to_person | OriolVinyalsML Flash News List | rewrite_conservative |  | 内容过度关联加密货币市场，夸大了人物在金融领域的角色，需保守改写以聚焦其AI研究身份。 |
| Percy Liang | source_item_belongs_to_person | Stanford CS229 I Machine Learning I Building Large ... | rewrite_conservative |  | 视频主讲人为Yann Dubois，Percy Liang仅作为导师被提及，将整个视频归为其代表成果属于过度归因，需保守改写。 |
| Percy Liang | source_item_belongs_to_person | Papers with Code - Percy Liang | refetch_source | Percy Liang papers with code<br>site:paperswithcode.com Percy Liang | 当前摘要为通用趋势页面，未显示Percy Liang相关内容，需重抓来源以获取准确信息。 |
| Quoc Le | source_item_belongs_to_person | LaMDA: Language Models for Dialog Applications | rewrite_conservative |  | Quoc Le是LaMDA论文众多作者之一，并非第一作者或负责人，将单篇论文作为个人代表成果可能过度归因，需保守改写。 |
| Quoc Le | source_item_belongs_to_person | Transformer (deep learning architecture) | delete_raw_pool_item |  | 内容为Transformer架构的通用维基百科页面，并非Quoc Le的个人成果或专属内容，归因层级错误，应删除。 |
| Daniela Amodei | source_item_belongs_to_person | Claude for Education is here! We believe AI will have a profound impact on… \| Daniela Amodei \| 12 comments | refetch_source | Daniela Amodei LinkedIn post Claude for Education | 当前抓取内容仅为LinkedIn登录页面，无法验证帖子真实性。需要重新抓取以获取帖子正文，确认其归属和内容相关性。 |
| Daniela Amodei | source_item_belongs_to_person | Tag: Daniela Amodei | delete_raw_pool_item |  | 内容为新闻网站标签页，是聚合页面而非个人原创或代表成果，属于过度归因。根据策略，此类高置信删除候选可安全自动执行。 |
| Arthur Mensch | source_item_belongs_to_person | Jensen Huang & Arthur Mensch: Why Every Nation Needs Its ... | refetch_source | Arthur Mensch Jensen Huang YouTube interview | 当前抓取内容仅为YouTube页面框架，无法确认视频具体内容。需要重新抓取以验证Arthur Mensch的参与和内容相关性。 |
| Elon Musk | source_item_belongs_to_person | Adapting Disease Prevention Protocols for Human Spaceflight During COVID-19 | delete_raw_pool_item |  | 论文作者列表中无Elon Musk，内容为SpaceX团队项目成果，不应归因于个人，属于过度归因。根据策略，此类高置信删除候选可安全自动执行。 |
| Emad Mostaque | source_item_belongs_to_person | Expanding Our Leadership Team: Meet Some Of Our New Team Members — Stability AI | rewrite_conservative |  | 内容是公司官方博客，非个人代表成果。审核建议重写，保守改写以反映其CEO角色，避免过度归因。 |
| Guillaume Lample | source_item_belongs_to_person | [PDF] LLaMA: Open and Efficient Foundation Language Models \| Semantic Scholar | rewrite_conservative |  | LLaMA是团队成果，个人作为作者之一。审核建议重写，保守改写以明确其作者身份，避免将整个模型归为个人成果。 |
| Guillaume Lample | source_item_belongs_to_person | LLaMA: Open and Efficient Foundation Language Models \| Research | rewrite_conservative |  | LLaMA是团队成果，个人作为作者之一。审核建议重写，保守改写以明确其作者身份，避免将整个模型归为个人成果。 |
| Greg Brockman | source_item_belongs_to_person | Introducing GPT-4.5 | rewrite_conservative |  | 内容是公司产品发布，未提及个人贡献。审核建议重写，保守改写以反映其领导角色，或移除。 |
| Guillaume Lample | source_item_belongs_to_person | Llama (language model) | rewrite_conservative |  | 内容是维基百科页面，属于团队成果。审核建议重写，保守改写以明确其作者身份，避免过度归因。 |
| Hyung Won Chung | source_item_belongs_to_person | Search \| arXiv e-print repository | refetch_source | Hyung Won Chung arXiv author page<br>Hyung Won Chung publications Meta | 内容是arXiv搜索结果页面，非具体论文。审核建议重抓来源，以获取其个人作者页面或具体论文列表。 |
| Jaana Dogan | source_item_belongs_to_person | priorities | refetch_source | jaan.info owner<br>Jaana Dogan blog | 内容来源域名与人物名相似，但缺乏直接作者证据。审核建议重抓来源，以确认网站归属或文章作者。 |
| Santiago Valdarrama | source_item_belongs_to_person | Developer-Friendly Machine Learning Platform \| Telepath | refetch_source | Santiago Valdarrama Telepath founder role<br>Santiago Valdarrama Telepath CEO CTO | 视频为公司产品宣传，未明确个人角色，需重抓来源确认其具体职位或贡献。 |
| Wojciech Zaremba | source_item_belongs_to_person | Who is Wojciech Zaremba? The Man Leading OpenAI’s Research | rewrite_conservative |  | 文章将ChatGPT成功过度归因于个人，需保守改写以强调其领导角色而非具体产品创造者。 |
| Wojciech Zaremba | source_item_belongs_to_person | Who’s Wojciech Zaremba? The Man Main OpenAI’s Analysis | rewrite_conservative |  | 文章将GPT-3等产品过度归因于个人，需保守改写以强调其作为研究负责人的贡献。 |
| 凯文·斯科特 | source_item_belongs_to_person | Microsoft CTO Kevin Scott says what he's seeing in early ... | refetch_source | Kevin Scott Microsoft CTO AI early | Reddit帖子标题提及凯文·斯科特，但摘要为空，无法确认内容是否直接相关或为转载，需进一步核实。 |
| 刘知远 | source_item_belongs_to_person | 清华刘知远团队：高质量LLM 训练数据获取原创 | refetch_source | 刘知远 清华大学 高质量LLM 训练数据 | 标题提及刘知远团队，但摘要为空，无法确认。需重抓来源以获取完整内容进行验证。 |
| 刘知远 | source_item_belongs_to_person | Scaling Latent Reasoning via Looped Language Models | delete_raw_pool_item | 刘知远 Scaling Latent Reasoning via Looped Language Models 作者 | 审核指出刘知远未出现在作者列表，属于过度归因。保守处理为删除该条目，避免错误归因。 |
| 刘知远 | source_item_belongs_to_person | Thinker: Training LLMs in Hierarchical Thinking for Deep Search via Multi-Turn Interaction | delete_raw_pool_item | 刘知远 Thinker: Training LLMs in Hierarchical Thinking for Deep Search via Multi-Turn Interaction 作者 | 审核指出刘知远未出现在作者列表，属于过度归因。保守处理为删除该条目，避免错误归因。 |
| 刘知远 | source_item_belongs_to_person | Improving Power Management and Usage with AI (IJCAI2019 video 887) | refetch_source | 刘知远 IJCAI 2019 Power Management AI 演讲者 | 视频标题和摘要未提及刘知远，无法确认关联。需重抓来源以获取视频描述或演讲者信息。 |
| 周伯文 | source_item_belongs_to_person | ViPER: Empowering the Self-Evolution of Visual Perception Abilities in Vision-Language Models | refetch_source | 周伯文 ViPER: Empowering the Self-Evolution of Visual Perception Abilities in Vision-Language Models 作者 | 审核指出作者列表中未出现周伯文，但置信度不高。需重抓来源以获取完整作者列表进行确认。 |
| 周伯文 | source_item_belongs_to_person | 周伯文提出AGI4S六问：AI拓展知识边界，但探索的罗盘始终 ... | refetch_source | 周伯文 AGI4S 六问 上观新闻 | 提供的文本为模板占位符，无法确认内容。需重抓来源以获取文章实际内容进行验证。 |
| 周伯文 | source_item_belongs_to_person | Web-CogReasoner: Towards Knowledge-Induced Cognitive Reasoning for Web Agents | delete_raw_pool_item |  | 审核确认该论文作者列表中未包含周伯文，属于外部内容错挂到人物名下的高置信错误，应直接删除。 |
| 周伯文 | source_item_belongs_to_person | 【早报】网易有道将于12月31日终止义务教育阶段学科培训业务；京东AI发起人周伯文离职 | hold | 周伯文 上海人工智能实验室 主任 首席科学家 最新职位 | 播客内容提及周伯文从京东离职，但其当前职位已更新。信息可能过时，需人工复核是否应保留或关闭展示。 |
| 周明 | source_item_belongs_to_person | Ming Zhang - ACL Anthology | refetch_source | 周明 澜舟科技 Ming Zhou ACL 论文<br>Ming Zhang ACL Anthology 周明 | ACL Anthology页面列出了名为Ming Zhang的作者，但未提供足够信息确认此Ming Zhang即为人物周明。需要重抓来源以核实身份。 |
| 周明 | source_item_belongs_to_person | Ming-Omni: A Unified Multimodal Model for Perception and Generation | refetch_source | 周明 Ming-Omni 论文 作者 角色<br>Ming-Omni: A Unified Multimodal Model for Perception and Generation 作者列表 | 论文《Ming-Omni》作者列表为Inclusion AI等多人，未明确显示周明为作者或核心贡献者。需要重抓来源以核实其具体角色。 |
| 周明 | source_item_belongs_to_person | Ming-UniVision: Joint Image Understanding and Generation with a Unified Continuous Tokenizer | refetch_source | 周明 Ming-UniVision 作者 角色 贡献 | 论文作者列表未明确显示周明，需重抓来源确认其是否参与及具体角色，避免错误归因。 |
| 周明 | source_item_belongs_to_person | Ming Zhu - ACL Anthology | refetch_source | 周明 Ming Zhu ACL Anthology 身份确认 | ACL Anthology页面作者名与人物周明英文名可能不一致，需重抓来源确认身份匹配。 |
| 唐杰 | source_item_belongs_to_person | What We Get Wrong About AI & China—Asterisk | refetch_source | 唐杰 What We Get Wrong About AI & China 访谈 提及 | 文章未明确提及唐杰，需重抓来源确认其是否被提及或关联，避免错误归因。 |
| 布莱恩·卡坦扎罗 | source_item_belongs_to_person | AI Unplugged: The Brains Behind the Operation | refetch_source | 布莱恩·卡坦扎罗 AI Unplugged The Brains Behind the Operation | LinkedIn文章提及人物但需登录查看全文，无法确认关联性。需重抓来源以获取完整内容进行判断。 |
| 姚顺雨 | source_item_belongs_to_person | Shunyu Yao - Personal Website | refetch_source | 姚顺雨 当前职位 官方<br>Shunyu Yao current position Google DeepMind | 个人网站显示其当前职位为Google DeepMind研究科学家，与人物库中‘Researcher @ OpenAI’的职位信息冲突，可能过时。需要重抓来源以确认最新职位。 |
| 姚顺雨 | source_item_belongs_to_person | Dr. Shunyu Yao | refetch_source | 姚顺雨 当前职位 官方<br>Shunyu Yao current position Google DeepMind | 个人网站显示其当前职位为Google DeepMind研究科学家，与人物库中‘Researcher @ OpenAI’的职位信息冲突，可能过时。需要重抓来源以确认最新职位。 |
| 姚顺雨 | source_item_belongs_to_person | OpenAI expert Yao Shunyu appointed as Chief AI Scientist at Tencent | refetch_source | 姚顺雨 腾讯 首席AI科学家 官方<br>Shunyu Yao Tencent Chief AI Scientist | 新闻称其被任命为腾讯首席AI科学家，与人物库中‘Researcher @ OpenAI’的职位信息严重冲突，职位状态可能已过时。需要重抓来源以确认最新职位。 |
| 雅各布·乌什科雷特 | source_item_belongs_to_person | Jakob Uszkoreit - Rise of AI | refetch_source | 雅各布·乌什科雷特 当前职位 Inceptive CEO<br>Jakob Uszkoreit current role Inceptive | 内容描述其为谷歌柏林团队负责人，但审核指出其已离开谷歌。当前职位信息过时，需重抓最新来源以确认其现状，再决定是否更新或删除。 |
| 科拉伊·卡武克丘奥卢 | source_item_belongs_to_person | gpt-oss-120b & gpt-oss-20b Model Card | delete_raw_pool_item |  | 论文作者为OpenAI团队，未显示科拉伊·卡武克丘奥卢为作者，属于团队成果过度归因给个人，保守删除。 |
| 汤姆·布朗 | source_item_belongs_to_person | Tom Brown co-founded Anthropic after helping build GPT ... | refetch_source | 汤姆·布朗 Anthropic 联合创始人 Instagram 帖子 | 帖子标题提及人物，但摘要为空，无法确认内容相关性。需要重新抓取源内容以验证。 |
| 肖弘 | source_item_belongs_to_person | Manus创始人肖弘：中国90后AI天才逆袭！凭一己之力改变全球 ... | refetch_source | 肖弘 Manus 创始人 YouTube 视频 内容 | 视频标题提及人物，但提供的摘要为频道介绍，无法确认视频内容是否相关。需要重新抓取源内容以验证。 |
| 迈克·施罗普费尔 | source_item_belongs_to_person | Facebook Chief Technology Officer Mike Schroepfer to step down | refetch_source | 迈克·施罗普费尔 当前职位 Meta 高级研究员 | 文章报道的是2021年的历史事件，其职位已更新。需要重新抓取当前来源以确认最新状态或补充历史背景。 |
