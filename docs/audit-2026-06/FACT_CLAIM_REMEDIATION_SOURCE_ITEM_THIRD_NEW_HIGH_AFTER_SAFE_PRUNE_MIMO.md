# Fact Claim Remediation by MiMo

Generated at: 2026-06-09T15:28:17.567Z
Model: mimo-v2.5-pro

Total problem issues: 27
Selected issues: 27
Remediations: 27

## Actions

| Action | Count |
| --- | --- |
| delete_raw_pool_item | 22 |
| refetch_source | 5 |

## Safety

| Safety bucket | Count |
| --- | --- |
| safe_auto_apply | 22 |
| manual_or_source_required | 5 |

## Top People

| Person | Total | Safe | Actions | Samples |
| --- | --- | --- | --- | --- |
| 丁洁 | 9 | 9 | {"delete_raw_pool_item":9} | source_item_belongs_to_person/delete_raw_pool_item: 审核判定为错误人物。链接指向上海交通大学计算机学院人员详情页，与人物丁洁（明尼苏达大学副教授）的当前职位和背景不符，极可能是同名的其他人。属于高置信删除候选。<br>source_item_belongs_to_person/delete_raw_pool_item: 审核判定为错误人物。链接指向1688企业查询页面，与人物丁洁（AI安全研究者）的专业领域和身份不符，极可能是同名的其他人。属于高置信删除候选。<br>source_item_belongs_to_person/delete_raw_pool_item: 审核判定为错误人物。文章讨论AI辅助学术写作的伦理，与人物丁洁（AI安全研究者）的专业领域不符，且未在摘要中找到其作为作者的证据。属于高置信删除候选。 |
| 姚顺雨 | 6 | 6 | {"delete_raw_pool_item":6} | source_item_belongs_to_person/delete_raw_pool_item: 内容明确属于东南大学医学院研究员姚玉宇，与目标人物姚顺雨（AI领域）在姓名、机构、研究领域上均不匹配，属于错误归因，可安全删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容是上海交通大学医学院胸外科医生YE Bo的页面，与目标人物姚顺雨（AI领域）在姓名、专业领域、机构上均不匹配，属于错误归因，可安全删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容是上海交通大学医学院教师YAO Xiaoying的页面，与目标人物姚顺雨（AI领域）在姓名、专业领域、机构上均不匹配，属于错误归因，可安全删除。 |
| 肖弘 | 3 | 3 | {"delete_raw_pool_item":3} | source_item_belongs_to_person/delete_raw_pool_item: GitHub仓库属于用户‘charliezcr’，项目描述为‘Shenhao's humanoid robot Xiaohao’，与页面人物肖弘（Manus AI创始人）无直接关...<br>source_item_belongs_to_person/delete_raw_pool_item: 网站是‘Xiao-i’公司的官方页面，与页面人物肖弘（Manus AI创始人）在姓名拼写、公司和业务领域上均不匹配，属于不同实体，可安全删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 新闻稿是关于‘Xiao-I Corporation’的财务业绩，其CEO为‘Hui Yuan’，与页面人物肖弘（Manus AI创始人）在姓名、公司和职位上均不匹配，属于不同实体... |
| 刘知远 | 2 | 2 | {"delete_raw_pool_item":2} | source_item_belongs_to_person/delete_raw_pool_item: 审核判定为错误人物。维基百科页面描述的是五代十国时期的后汉开国皇帝刘知远，与人物刘知远（清华大学副教授）完全不符，属于同名的历史人物。属于高置信删除候选。<br>source_item_belongs_to_person/delete_raw_pool_item: 审核确认论文作者列表中无刘知远，内容与人物不匹配，属于高置信度的错误归属，应直接删除。 |
| 周明 | 2 | 0 | {"refetch_source":2} | source_item_belongs_to_person/refetch_source: 文章标题提及人物，但摘要为空，无法确认内容归属。需重抓来源以获取全文或摘要进行验证。<br>source_item_belongs_to_person/refetch_source: 文章标题提及人物及产品，但摘要为空，无法确认内容归属。需重抓来源以获取全文或摘要进行验证。 |
| 朱军 | 1 | 1 | {"delete_raw_pool_item":1} | source_item_belongs_to_person/delete_raw_pool_item: 内容为中国政府门户网站关于黄菊副总理的页面，与朱军教授无关，属于错误挂载，高置信删除。 |
| 汤姆·布朗 | 1 | 1 | {"delete_raw_pool_item":1} | source_item_belongs_to_person/delete_raw_pool_item: LinkedIn资料描述的是半导体行业的Tom Brown，与页面人物（Anthropic联合创始人）在职业领域、公司和经历上完全不符，属于同名不同人，可安全删除。 |
| Jaana Dogan | 1 | 0 | {"refetch_source":1} | source_item_belongs_to_person/refetch_source: 审核判定需要来源。当前内容为Medium主页粉丝列表页面，作为“代表成果”展示价值较低。需要重抓来源以获取其代表性文章或确认平台价值。 |
| 布莱恩·卡坦扎罗 | 1 | 0 | {"refetch_source":1} | source_item_belongs_to_person/refetch_source: 当前摘要仅为网站导航元素，无法确认内容归属。需重抓来源以获取论文作者信息，验证是否与人物相关。 |
| 戴文渊 | 1 | 0 | {"refetch_source":1} | source_item_belongs_to_person/refetch_source: 当前摘要为空，无法确认内容归属。需重抓来源以获取文章正文，验证是否为戴文渊本人撰写或相关报道。 |

## Safe Auto-Apply Candidates

| Person | Type | Target | Action | Reason |
| --- | --- | --- | --- | --- |
| 朱军 | source_item_belongs_to_person | The Chinese Central Government's Official Web Portal | delete_raw_pool_item | 内容为中国政府门户网站关于黄菊副总理的页面，与朱军教授无关，属于错误挂载，高置信删除。 |
| 姚顺雨 | source_item_belongs_to_person | 东南大学姚玉宇导师主页 | delete_raw_pool_item | 内容明确属于东南大学医学院研究员姚玉宇，与目标人物姚顺雨（AI领域）在姓名、机构、研究领域上均不匹配，属于错误归因，可安全删除。 |
| 姚顺雨 | source_item_belongs_to_person | YE Bo-Shanghai Jiao Tong University School of Medicine | delete_raw_pool_item | 内容是上海交通大学医学院胸外科医生YE Bo的页面，与目标人物姚顺雨（AI领域）在姓名、专业领域、机构上均不匹配，属于错误归因，可安全删除。 |
| 姚顺雨 | source_item_belongs_to_person | YAO Xiaoying-Shanghai Jiao Tong University School of Medicine | delete_raw_pool_item | 内容是上海交通大学医学院教师YAO Xiaoying的页面，与目标人物姚顺雨（AI领域）在姓名、专业领域、机构上均不匹配，属于错误归因，可安全删除。 |
| 汤姆·布朗 | source_item_belongs_to_person | Tom Brown - LinkedIn | delete_raw_pool_item | LinkedIn资料描述的是半导体行业的Tom Brown，与页面人物（Anthropic联合创始人）在职业领域、公司和经历上完全不符，属于同名不同人，可安全删除。 |
| 肖弘 | source_item_belongs_to_person | GitHub - charliezcr/Xiaohao: The embodied intelligence of Shenhao's humanoid robot Xiaohao | delete_raw_pool_item | GitHub仓库属于用户‘charliezcr’，项目描述为‘Shenhao's humanoid robot Xiaohao’，与页面人物肖弘（Manus AI创始人）无直接关联，属于不同实体，可安全删除。 |
| 肖弘 | source_item_belongs_to_person | Cognitive Intelligence AI Solution Provider | delete_raw_pool_item | 网站是‘Xiao-i’公司的官方页面，与页面人物肖弘（Manus AI创始人）在姓名拼写、公司和业务领域上均不匹配，属于不同实体，可安全删除。 |
| 肖弘 | source_item_belongs_to_person | Xiao-I Corporation Reports Unaudited Full Year 2023 Financial Results | delete_raw_pool_item | 新闻稿是关于‘Xiao-I Corporation’的财务业绩，其CEO为‘Hui Yuan’，与页面人物肖弘（Manus AI创始人）在姓名、公司和职位上均不匹配，属于不同实体，可安全删除。 |
| 姚顺雨 | source_item_belongs_to_person | Large Language Models for UAVs: Current State and Pathways to the Future | delete_raw_pool_item | 论文作者为Shumaila Javaid, Nasir Saeed, Bin He，与姚顺雨无关，内容被错误归因，可安全删除。 |
| 丁洁 | source_item_belongs_to_person | SJTU Computer Science & Engineering | delete_raw_pool_item | 审核判定为错误人物。链接指向上海交通大学计算机学院人员详情页，与人物丁洁（明尼苏达大学副教授）的当前职位和背景不符，极可能是同名的其他人。属于高置信删除候选。 |
| 丁洁 | source_item_belongs_to_person | 丁洁- 88查 | delete_raw_pool_item | 审核判定为错误人物。链接指向1688企业查询页面，与人物丁洁（AI安全研究者）的专业领域和身份不符，极可能是同名的其他人。属于高置信删除候选。 |
| 刘知远 | source_item_belongs_to_person | Liu Zhiyuan | delete_raw_pool_item | 审核判定为错误人物。维基百科页面描述的是五代十国时期的后汉开国皇帝刘知远，与人物刘知远（清华大学副教授）完全不符，属于同名的历史人物。属于高置信删除候选。 |
| 丁洁 | source_item_belongs_to_person | Expert Consensus on the Ethical Requirements for ... | delete_raw_pool_item | 审核判定为错误人物。文章讨论AI辅助学术写作的伦理，与人物丁洁（AI安全研究者）的专业领域不符，且未在摘要中找到其作为作者的证据。属于高置信删除候选。 |
| 丁洁 | source_item_belongs_to_person | 家族性渗出性玻璃体视网膜病变的筛查与诊断 | delete_raw_pool_item | 审核判定为错误人物。文章属于眼科医学领域，与人物丁洁（计算机科学/AI研究者）的专业领域完全不符，且文末引用显示作者为“丁洁, 龚健杨”，但此“丁洁”极大概率是同名的眼科医生。属于高置信删除候选。 |
| 姚顺雨 | source_item_belongs_to_person | 两位清华天才Yao Shunyu投身大模型，跨学科人才或将成为 ... | delete_raw_pool_item | 审核判定为错误人物。文章主要讨论物理系的姚顺宇（加入Anthropic），与目标人物姚顺雨（计算机系，OpenAI研究员）不符。属于高置信删除候选。 |
| 姚顺雨 | source_item_belongs_to_person | 姚舜禹-计算机科学与技术 | delete_raw_pool_item | 审核判定为错误人物。内容是关于北师港浸大校友姚舜禹，其姓名、毕业院校和当前就读学校均与目标人物姚顺雨（清华毕业，OpenAI研究员）不符。属于高置信删除候选。 |
| 刘知远 | source_item_belongs_to_person | Rethinking machine unlearning for large language models | delete_raw_pool_item | 审核确认论文作者列表中无刘知远，内容与人物不匹配，属于高置信度的错误归属，应直接删除。 |
| 丁洁 | source_item_belongs_to_person | 我用AI“复活”了爷爷 | delete_raw_pool_item | 审核确认内容与人物丁洁（AI安全研究者）的专业领域和身份不符，极可能是同名的其他人，属于高置信度错误归属。 |
| 丁洁 | source_item_belongs_to_person | 文学院卓越班赴武汉市光谷实验中学金融港校区观摩丁洁 ... | delete_raw_pool_item | 审核确认内容描述的是语文名师工作室活动，与人物丁洁（AI安全研究者）的专业领域和身份不符，属于同名的其他人。 |
| 丁洁 | source_item_belongs_to_person | 丁洁- 佰仟金融- 催收员 | delete_raw_pool_item | 审核确认LinkedIn档案显示为金融催收员，与人物丁洁（AI安全研究者）的专业领域和身份不符，属于同名的其他人。 |
| 丁洁 | source_item_belongs_to_person | 法学期刊文章-中国法学期刊大全-北大法宝V6官网 | delete_raw_pool_item | 审核确认链接指向法学期刊作者页面，与人物丁洁（AI安全研究者）的专业领域不符，极可能是同名的法学研究者。 |
| 丁洁 | source_item_belongs_to_person | 5下《5 草船借箭》-第1课时-丁洁-有PPT 51备课部编版小学语文 | delete_raw_pool_item | 审核确认B站视频为小学语文备课内容，与人物丁洁（AI安全研究者）的专业领域和身份不符，属于同名的其他人。 |

## Manual / Source Required Queue

| Person | Type | Target | Action | Queries | Reason |
| --- | --- | --- | --- | --- | --- |
| 布莱恩·卡坦扎罗 | source_item_belongs_to_person | View Generalization for Single Image Textured 3D Models ... | refetch_source | 布莱恩·卡坦扎罗 View Generalization for Single Image Textured 3D Models 论文作者 | 当前摘要仅为网站导航元素，无法确认内容归属。需重抓来源以获取论文作者信息，验证是否与人物相关。 |
| 戴文渊 | source_item_belongs_to_person | 戴文渊解读第四范式财报：AI大模型在回归商业本质算经济账 | refetch_source | 戴文渊 第四范式 财报 解读 知乎 | 当前摘要为空，无法确认内容归属。需重抓来源以获取文章正文，验证是否为戴文渊本人撰写或相关报道。 |
| Jaana Dogan | source_item_belongs_to_person | 10610 followers - Jaana Dogan - Medium | refetch_source | Jaana Dogan Medium 代表性文章<br>Jaana Dogan rakyll.medium.com 主要作品 | 审核判定需要来源。当前内容为Medium主页粉丝列表页面，作为“代表成果”展示价值较低。需要重抓来源以获取其代表性文章或确认平台价值。 |
| 周明 | source_item_belongs_to_person | 对话AI顶尖大牛周明老师：GPT时代，感觉自己跟不上了 | refetch_source | 周明 澜舟科技 对话AI顶尖大牛周明老师 GPT时代 | 文章标题提及人物，但摘要为空，无法确认内容归属。需重抓来源以获取全文或摘要进行验证。 |
| 周明 | source_item_belongs_to_person | AI大牛周明发布MChat：生成可控，参数规模可负担 | refetch_source | 周明 澜舟科技 MChat 生成可控 参数规模可负担 | 文章标题提及人物及产品，但摘要为空，无法确认内容归属。需重抓来源以获取全文或摘要进行验证。 |
