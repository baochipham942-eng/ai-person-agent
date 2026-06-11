# Fact Claim Remediation by MiMo

Generated at: 2026-06-09T14:41:35.838Z
Model: mimo-v2.5-pro

Total problem issues: 2340
Selected issues: 2340
Remediations: 2340

## Actions

| Action | Count |
| --- | --- |
| refetch_source | 1121 |
| rewrite_conservative | 703 |
| delete_raw_pool_item | 267 |
| human_review | 71 |
| delete_official_link | 50 |
| close_historical_role | 46 |
| delete_role | 27 |
| delete_product | 26 |
| rewrite_product_family | 15 |
| delete_card | 12 |
| hold | 2 |

## Safety

| Safety bucket | Count |
| --- | --- |
| manual_or_source_required | 2130 |
| safe_auto_apply | 210 |

## Top People

| Person | Total | Safe | Actions | Samples |
| --- | --- | --- | --- | --- |
| 丁洁 | 31 | 15 | {"refetch_source":5,"delete_card":8,"delete_official_link":3,"delete_raw_pool_item":15} | current_title/refetch_source: 当前职位信息缺少来源验证，需重抓权威来源以确认其真实性及是否为最新状态。<br>learning_card/delete_card: 卡片描述的是南京邮电大学副教授丁洁，与当前人物（明尼苏达大学副教授丁洁）是同名不同人，属于人名错配。高置信删除候选。<br>learning_card/delete_card: 卡片描述的是南京邮电大学副教授丁洁的教学成果，与当前人物（明尼苏达大学副教授丁洁）是同名不同人，属于人名错配。高置信删除候选。 |
| 黄铁军 | 27 | 3 | {"refetch_source":11,"delete_official_link":3,"rewrite_conservative":5,"delete_raw_pool_item":7,"human_review":1} | career_role/refetch_source: 审核标记为需要来源，职位信息来自LLM提取，缺乏权威佐证，需重抓来源确认准确性及当前状态。<br>career_role/refetch_source: 该职位当前状态（now）缺乏可靠来源支持，且其当前主要身份为智源研究院院长。需要重抓来源以确认其当前任职状态。<br>career_role/refetch_source: 该职位当前状态（now）缺乏可靠来源支持，且其当前主要身份为智源研究院院长。需要重抓来源以确认其当前任职状态。 |
| 周明 | 26 | 12 | {"delete_role":1,"rewrite_conservative":3,"refetch_source":9,"delete_raw_pool_item":13} | career_role/delete_role: 高置信度人名错配。该履历与周明（澜舟科技创始人）无关，属于错误数据，应安全删除。<br>career_role/rewrite_conservative: 历史履历被错误标记为当前状态。需保守改写为历史履历，并补充结束时间。改写需人工确认。<br>current_title/refetch_source: 当前职位声称是怡和集团管理培训生，但缺少来源验证，且与AI领域关联较弱。需要重抓来源以确认其真实性及是否为最新职位。 |
| 布莱恩·卡坦扎罗 | 26 | 9 | {"refetch_source":5,"rewrite_conservative":11,"delete_raw_pool_item":9,"human_review":1} | current_title/refetch_source: 当前职位信息缺少来源，无法确认真实性与时效性。需重抓权威来源进行核实。<br>learning_card/rewrite_conservative: 原卡片将公司战略转型过度归因于个人。根据审核建议，保守改写为聚焦其个人在关键技术上的具体贡献，避免夸大。<br>learning_card/refetch_source: 卡片内容（个人背景、cuDNN诞生）的来源为Medium文章，权威性不足。需重抓更可靠的官方来源进行验证。 |
| Mustafa Suleyman | 26 | 0 | {"delete_role":4,"refetch_source":9,"rewrite_conservative":12,"delete_official_link":1} | career_role/delete_role: 该职位'writer'可能不准确或非其主要角色，且当前状态可能过时。在缺乏可靠来源支持的情况下，建议删除该条目。<br>career_role/delete_role: 根据公开信息，Greylock Partners并非由Mustafa Suleyman创立，该归因可能错误。在缺乏可靠来源支持的情况下，建议删除该条目。<br>career_role/refetch_source: 该职位结束日期显示为'now'，但根据上下文，其已离开Greylock Partners。需要重抓来源以确认准确的结束日期。 |
| Greg Brockman | 24 | 6 | {"rewrite_conservative":8,"refetch_source":2,"delete_card":3,"rewrite_product_family":1,"delete_raw_pool_item":10} | career_role/rewrite_conservative: 该履历描述的是高中期间的学习经历，但结束时间显示为“now”，明显已过时。需保守改写，添加结束日期。<br>current_title/refetch_source: 当前职位‘Co-founder & President @ OpenAI’缺乏来源验证，需重抓来源以确认其是否为最新状态（例如，他可能已离职）。<br>learning_card/rewrite_conservative: 卡片内容描述的是公司级成果，未明确个人贡献。审核建议保守改写，需重抓来源确认其领导角色。 |
| Wojciech Zaremba | 23 | 2 | {"close_historical_role":3,"refetch_source":9,"rewrite_conservative":9,"delete_raw_pool_item":2} | career_role/close_historical_role: 履历显示为当前，但人物当前状态是OpenAI联合创始人。该职位已过时，应关闭当前展示并重抓来源确认时间段。<br>career_role/close_historical_role: 履历显示为当前，但人物当前状态是OpenAI联合创始人。该职位已过时，应关闭当前展示并重抓来源确认时间段。<br>career_role/close_historical_role: 履历显示为当前，但人物当前状态是Co-founder。该职位已过时，应关闭当前展示并重抓来源确认时间段。 |
| Mira Murati | 23 | 1 | {"rewrite_conservative":15,"refetch_source":6,"delete_official_link":1,"delete_raw_pool_item":1} | career_role/rewrite_conservative: 人物已离开OpenAI，创立并领导Thinking Machines Lab。此职位信息已过时，保守改写以反映历史任职期。<br>career_role/rewrite_conservative: 根据上下文，人物当前职位是思维机器实验室的创始人兼CEO，暗示已离开OpenAI。该条目显示为OpenAI的首席技术官且结束日期为‘now’，信息过时。保守改写以反映历史任职期。<br>career_role/refetch_source: 该职位结束日期显示为'now'，但根据上下文，其当前职位是思维机器实验室创始人兼CEO，信息可能过时。需要重抓来源以确认准确的结束日期。 |
| Elon Musk | 22 | 9 | {"rewrite_conservative":7,"refetch_source":3,"delete_official_link":1,"delete_raw_pool_item":11} | career_role/rewrite_conservative: Elon Musk 已于 2023 年卸任特斯拉 CEO，该职位不应显示为当前。需保守改写，添加结束日期。<br>career_role/rewrite_conservative: Elon Musk 在 PayPal 的职位是历史角色，早已离任，不应显示为当前。需保守改写，添加结束日期。<br>career_role/rewrite_conservative: Elon Musk 已于 2023 年卸任 Twitter/X Corp. CEO，该职位不应显示为当前。需保守改写，添加结束日期。 |
| 朱军 | 21 | 9 | {"close_historical_role":1,"rewrite_conservative":5,"refetch_source":5,"delete_official_link":1,"delete_raw_pool_item":9} | career_role/close_historical_role: 学生履历显示‘now’，但人物当前为清华大学教授，表明该履历已过时。需要关闭历史角色，设置合理的结束日期。<br>learning_card/rewrite_conservative: 原卡片将团队成果（‘珠算’库、UniCardio框架）过度归因于个人。根据审核建议，保守改写为描述其团队的研究成果，避免个人化归因。<br>learning_card/rewrite_conservative: 原句将公司级产品发布归因于个人，属于过度归因。采用审核建议的保守改写，明确其领导角色，避免夸大个人贡献。 |
| 季逸超 | 21 | 4 | {"close_historical_role":1,"refetch_source":7,"rewrite_conservative":8,"delete_official_link":1,"delete_raw_pool_item":4} | career_role/close_historical_role: 人物当前头衔为‘Co-founder & Chief Scientist @ Peak Labs’，与履历声称的‘创始人兼CEO @ Peak Labs’且状态为‘now’冲突。...<br>current_title/refetch_source: 当前职位声称无来源支持，需重抓来源以验证真实性及时效性。<br>learning_card/rewrite_conservative: 原claim将公司产品归因于个人并包含未经证实的收购传闻。采用保守改写，明确领导角色，移除夸大断言，等待证据。 |
| Hyung Won Chung | 20 | 4 | {"refetch_source":6,"rewrite_conservative":9,"delete_product":1,"delete_raw_pool_item":4} | current_title/refetch_source: 当前职位信息需要可靠来源验证，需重抓来源以确认其最新职务。<br>learning_card/refetch_source: 来源为社交媒体帖子，权威性不足。需重抓更可靠来源以证实观点归属。<br>learning_card/rewrite_conservative: 将具体产品版本归因给个人属过度归因。审核建议保守改写，需重抓来源确认其具体角色。 |
| 周伯文 | 20 | 3 | {"rewrite_conservative":7,"refetch_source":5,"delete_official_link":3,"delete_raw_pool_item":5} | career_role/rewrite_conservative: 履历显示为当前状态，但人物已离任。需保守改写为历史履历，并补充结束时间。改写需人工确认。<br>current_title/refetch_source: 当前职位声称是上海人工智能实验室主任兼首席科学家，但缺少来源验证。需要重抓来源以确认其真实性及是否为最新职位。<br>learning_card/rewrite_conservative: 卡片将机构成果过度归因给个人。根据审核建议进行保守改写，明确其领导角色而非直接归因。 |
| 杨植麟 | 20 | 2 | {"human_review":2,"refetch_source":7,"rewrite_conservative":5,"delete_official_link":3,"delete_raw_pool_item":3} | career_role/human_review: 当前职位与履历冲突，状态可能过时，需人工确认其离职时间。<br>current_title/refetch_source: 职位信息可能正确，但缺乏直接来源文本支持其当前状态，无法确认是否过时，需重抓来源。<br>learning_card/rewrite_conservative: 原句将公司战略定位（最坚定且只做To C产品）归因于个人，属于公司战略层面的描述。采用保守改写，明确为公司行为。 |
| 乔尔·皮诺 | 20 | 1 | {"refetch_source":10,"rewrite_conservative":4,"human_review":2,"delete_raw_pool_item":2,"hold":2} | career_role/refetch_source: 信息可能过时，人物可能已于2023年离开FAIR。需要重抓来源确认当前状态。<br>career_role/rewrite_conservative: 信息明显过时，博士学位于2012年完成。保守改写为历史学生身份，添加结束时间。<br>current_title/refetch_source: 当前职位信息缺少来源验证，需重抓权威来源以确认其真实性及是否为最新状态。 |
| 亚历克·拉德福德 | 20 | 1 | {"human_review":3,"rewrite_conservative":5,"refetch_source":10,"delete_raw_pool_item":2} | career_role/human_review: 履历显示自2012年12月31日起任职至今，时间跨度异常，且人物更知名的履历在OpenAI，此条信息可能过时或不准确，需人工核实。<br>current_title/human_review: 该人物以在OpenAI的工作闻名，当前职位显示为Indico Data Solutions可能已过时或非主要身份，需人工审核确认其当前主要职位。<br>learning_card/rewrite_conservative: 原内容将OpenAI所有重大突破归因于个人，属于过度归因。保守改写以明确其为核心贡献者之一，而非唯一或主导者。 |
| 李飞飞 | 20 | 0 | {"close_historical_role":5,"refetch_source":11,"rewrite_conservative":4} | career_role/close_historical_role: 李飞飞已离开该大学，履历显示结束时间为'now'，与当前状态不符，需关闭当前展示并标记为历史角色。<br>career_role/close_historical_role: 李飞飞已创立World Labs，履历显示结束时间为'now'，与当前状态不符，需关闭当前展示并标记为历史角色。<br>career_role/close_historical_role: 李飞飞已离开斯坦福大学，履历显示结束时间为'now'，与当前状态不符，需关闭当前展示并标记为历史角色。 |
| 徐立 | 19 | 0 | {"delete_role":2,"refetch_source":9,"human_review":1,"delete_official_link":1,"delete_product":1,"rewrite_conservative":5} | career_role/delete_role: 审核判定为 wrong_person，置信度高。该履历（中央戏剧学院表演系毕业）与人物徐立（计算机视觉领域）背景严重不符，属于人名错配，应直接删除。<br>career_role/delete_role: 审核判定为 wrong_person，置信度高。该履历（爱乐团成员）与人物徐立（计算机视觉领域）背景严重不符，属于人名错配，应直接删除。<br>career_role/refetch_source: 审核判定为 needs_source。来源标注为'baike-fix'但无具体证据，且人物上下文存在计算机视觉与影视制片人信息冲突，需重抓来源核实。 |
| 沈向洋 | 19 | 0 | {"rewrite_conservative":8,"refetch_source":9,"delete_official_link":2} | career_role/rewrite_conservative: 审核指出沈向洋已于2019年11月离职，当前履历显示为‘now’，属于过时信息。需保守改写，将结束时间设为2019年11月。<br>career_role/rewrite_conservative: 审核指出学历是已完成事件，结束时间不应为‘now’。需保守改写，将结束时间设为1984年12月。<br>career_role/rewrite_conservative: 审核指出学历是已完成事件，结束时间不应为‘now’。需保守改写，将结束时间设为1998年12月。 |
| 肖弘 | 18 | 7 | {"refetch_source":8,"delete_raw_pool_item":7,"rewrite_conservative":3} | career_role/refetch_source: 信息来源仅为LLM提取，缺乏公开可验证的权威资料来确认肖弘是武汉夜莺科技的创始人，需重抓来源验证。<br>career_role/refetch_source: 职位“联创团队副队长”为学生时期职务，当前状态“now”与人物当前职业身份不符，信息过时。需重抓来源以获取准确结束时间。<br>current_title/refetch_source: Manus AI可能是一个初创公司，但未提供任何来源证明肖弘当前担任其创始人兼CEO。需要重抓来源以确认。 |
| 唐杰 | 18 | 6 | {"delete_role":1,"rewrite_conservative":5,"refetch_source":6,"delete_raw_pool_item":6} | career_role/delete_role: 高置信度人名错配。该履历与唐杰（清华大学教授、智谱AI联合创始人）无关，属于错误数据，应安全删除。<br>career_role/rewrite_conservative: 历史学生经历被错误标记为当前状态。需保守改写为历史履历。改写需人工确认。<br>current_title/refetch_source: 当前职位声称是清华大学教授，但缺少来源验证。需要重抓来源以确认其真实性及是否为最新职位。 |
| 姚顺雨 | 18 | 6 | {"close_historical_role":1,"refetch_source":7,"rewrite_conservative":1,"delete_product":3,"delete_raw_pool_item":6} | career_role/close_historical_role: 人物当前职位为 Researcher @ OpenAI，与履历声称的‘首席AI科学家 @ 腾讯’且状态为‘now’冲突。该履历信息已过时，应关闭其‘当前’状态。<br>current_title/refetch_source: 当前职位声称无来源支持，需重抓来源以验证真实性及时效性。<br>learning_card/rewrite_conservative: 原claim将公司产品成果过度归因于个人。采用保守改写，移除具体模型应用断言，聚焦个人研究方向，等待角色证据。 |
| 马克·扎克伯格 | 18 | 1 | {"rewrite_conservative":11,"refetch_source":3,"delete_official_link":1,"delete_raw_pool_item":3} | career_role/rewrite_conservative: 履历显示其在哈佛大学本科阶段学习，结束时间为now，但人物早已毕业，状态过时。保守改写以更新结束时间。<br>current_title/refetch_source: 作为Meta CEO是广为人知的事实，但任务要求严格，仍需来源文本支持其当前职位状态。<br>learning_card/rewrite_conservative: 收购是Meta公司的行为，将公司级并购直接归为个人代表成果，归因层级过高。需保守改写，将主体从个人改为公司。 |
| Alexandr Wang | 18 | 0 | {"rewrite_conservative":3,"refetch_source":14,"delete_raw_pool_item":1} | learning_card/rewrite_conservative: 内容描述的是Scale AI公司的方法论和核心竞争力，而非Alexandr Wang个人的具体贡献。保守改写为强调其领导角色。<br>learning_card/refetch_source: 内容提及2025年6月加入Meta担任首席AI官，属于未来事件，当前无法验证。需要重抓来源以核实此信息是否已发生或为预测。<br>learning_card/refetch_source: 内容提及2025年6月Meta对Scale AI的投资，属于未来事件，当前无法验证。需要重抓来源以核实此信息是否已发生或为预测。 |
| Haofan Wang | 18 | 0 | {"refetch_source":7,"human_review":5,"rewrite_conservative":6} | career_role/refetch_source: 职位当前状态不明确，且与人物主要身份关联性存疑，需重抓来源确认其当前任职情况。<br>career_role/human_review: 履历显示为当前职位，但人物当前主要身份已变化，可能已离任。需人工审核以确认当前状态并决定是否添加结束时间。<br>career_role/human_review: 访问职位开始于2020年，且人物当前身份已变化，该职位可能已结束。需人工审核以确认结束时间。 |
| 吴恩达 | 18 | 0 | {"rewrite_conservative":7,"refetch_source":11} | career_role/rewrite_conservative: 该履历显示为当前状态可能过时，需保守改写以反映其历史角色，避免误导。<br>career_role/rewrite_conservative: 该履历显示为当前状态可能过时，需保守改写以反映其历史角色，避免误导。<br>career_role/rewrite_conservative: 该履历显示为当前状态明显过时，需保守改写以反映其历史教育经历，避免误导。 |
| Boris Cherny | 17 | 10 | {"rewrite_conservative":5,"refetch_source":2,"delete_raw_pool_item":10} | career_role/rewrite_conservative: 职位显示为当前，但其当前头衔显示已离开Anthropic，现任Anysphere (Cursor)。需保守改写履历，将结束日期更新为历史日期。<br>current_title/refetch_source: 当前职位声称是Anysphere (Cursor)的Claude Code集成负责人，但缺少来源验证。需重抓其LinkedIn或公司官方页面以确认职位真实性及当前状态。<br>official_link/refetch_source: 个人网站链接缺乏直接证据证明归属，需要重抓来源以验证网站内容和权威关联。 |
| Chris Olah | 17 | 3 | {"refetch_source":7,"rewrite_conservative":5,"delete_raw_pool_item":4,"human_review":1} | career_role/refetch_source: 职位信息来源为AI_RECRAWL，缺少具体时间且无法确认当前状态。需要更可靠的来源来验证职位、机构和时间信息。<br>career_role/refetch_source: 职位信息来源为AI_RECRAWL，缺少具体时间且无法确认当前状态。需要更可靠的来源来验证职位、机构和时间信息。<br>career_role/refetch_source: 职位信息来源为AI_RECRAWL，缺少具体时间且无法确认当前状态。需要更可靠的来源来验证职位、机构和时间信息。 |
| Jan Leike | 17 | 3 | {"close_historical_role":1,"refetch_source":4,"rewrite_conservative":7,"delete_raw_pool_item":4,"human_review":1} | career_role/close_historical_role: 本科学位早已完成，不应标记为‘now’。需重抓来源确认就读年份，然后关闭历史角色。<br>career_role/refetch_source: 职位状态为‘now’但已知人物已离职，需重抓来源确认结束日期，以便保守改写。<br>current_title/refetch_source: 当前职位描述为过时的教育背景，与人物上下文中的 OpenAI 研究员身份不符。需要重抓来源以获取准确的当前职位信息。 |
| Lukasz Kaiser | 17 | 2 | {"close_historical_role":1,"refetch_source":6,"rewrite_conservative":6,"delete_product":1,"delete_raw_pool_item":3} | career_role/close_historical_role: 人物当前在OpenAI任职，此历史职位显示为‘now’，信息过时。保守关闭该历史角色，需重抓来源确认结束时间。<br>current_title/refetch_source: 职位描述具体，但未提供任何来源链接或证据，无法验证其真实性。需要重抓来源以确认当前职位状态。<br>learning_card/refetch_source: 卡片描述的早期学术背景细节（巴黎第七大学、CNRS终身研究员）缺乏足够权威来源支持，需要重抓来源进行核实。 |
| Aidan Gomez | 17 | 1 | {"refetch_source":8,"rewrite_conservative":5,"rewrite_product_family":2,"human_review":1,"delete_raw_pool_item":1} | career_role/refetch_source: 履历显示结束时间为 now，但人物当前已是 CEO，信息明显过时。需要重抓来源以确认具体结束年份，然后才能进行保守改写。<br>career_role/refetch_source: 履历显示结束时间为 now，但人物已毕业并创业，信息过时。需要重抓来源以确认具体毕业年份，然后才能进行保守改写。<br>career_role/refetch_source: 该履历缺乏来源支持，且与人物当前主要身份不符。需要重抓来源以核实该职位是否存在及具体细节。 |
| 科拉伊·卡武克丘奥卢 | 17 | 1 | {"close_historical_role":2,"delete_role":1,"refetch_source":6,"rewrite_conservative":4,"delete_raw_pool_item":4} | career_role/close_historical_role: “研究科学家”是早期职位，当前职位已晋升。履历显示“至今”为过时信息。应关闭该历史角色，添加结束时间。<br>career_role/delete_role: 该履历与已知事实冲突，人物当前职位为谷歌首席AI架构师兼高级副总裁，非谷歌DeepMind首席技术官。属于高置信删除候选。<br>career_role/close_historical_role: 该职位为历史职位，但显示为当前状态。需重抓来源确认其晋升为首席AI架构师的具体时间，以关闭该历史角色。 |
| 闫俊杰 | 17 | 0 | {"rewrite_conservative":9,"refetch_source":7,"delete_raw_pool_item":1} | career_role/rewrite_conservative: 本科教育通常已结束，当前状态‘now’可能过时。保守改写为历史履历并添加推测性时间范围，需人工确认。<br>current_title/refetch_source: 当前职位声称是MiniMax创始人兼CEO，但审核指出缺少来源支持。需要重抓来源以验证该职位是否仍然有效且是最新的。<br>learning_card/refetch_source: 卡片内容涉及具体历史细节（共同实习、领悟Scaling Law），现有来源可能无法充分验证，需重抓更权威来源确认。 |
| 刘知远 | 16 | 8 | {"refetch_source":5,"rewrite_conservative":1,"delete_raw_pool_item":10} | current_title/refetch_source: 职位信息可能正确，但缺乏具体来源验证其当前状态和时效性。需要重抓来源以确认。<br>learning_card/rewrite_conservative: 内容将公司产品和技术归因给个人，属于团队/公司成果过度归因。保守改写以明确其领导角色和团队贡献。<br>source_item_belongs_to_person/refetch_source:  |
| Jaana Dogan | 16 | 6 | {"delete_role":2,"refetch_source":4,"rewrite_conservative":3,"delete_raw_pool_item":7} | career_role/delete_role: 履历显示为当前状态，但人物当前职位为 Google 的 Principal Engineer，信息过时或冲突。需删除此过时履历条目。<br>career_role/delete_role: 履历显示为当前状态，但人物当前职位为 Google 的 Principal Engineer，信息过时或冲突。需删除此过时履历条目。<br>current_title/refetch_source: 当前职位信息需要可靠来源支持，需重抓来源以确认其最新职务。 |
| Guillaume Lample | 16 | 4 | {"delete_official_link":1,"rewrite_conservative":7,"refetch_source":2,"delete_raw_pool_item":6} | official_link/delete_official_link: 链接指向NVIDIA博客文章，非个人主页或官方账号，属于错误归因，应删除。<br>representative_achievement/rewrite_conservative: Mistral 7B 是 Mistral AI 公司级产品，Guillaume Lample 作为首席科学家，其角色是领导公司，而非具体模型的共同创建者。保守改写角色为“领导”以...<br>representative_achievement/rewrite_conservative: Mixtral 8x7B 是 Mistral AI 公司级产品，Guillaume Lample 作为首席科学家，其角色是领导公司，而非具体模型的共同创建者。保守改写角色为“领导... |
| Jason Wei | 16 | 4 | {"refetch_source":9,"rewrite_conservative":3,"delete_raw_pool_item":4} | career_role/refetch_source: 职位状态为‘now’但当前上下文显示已加入DeepMind，需重抓来源确认结束日期，以便保守改写。<br>current_title/rewrite_conservative: 信息已过时，根据审核建议进行保守改写，更新为已知的最新职位信息。<br>learning_card/refetch_source: 现有来源（langcopilot.com）可能非权威或一手来源，需要更可靠的证据（如其个人博客或正式发表的文章）来支持这一归因。 |
| John Schulman | 16 | 3 | {"refetch_source":4,"rewrite_conservative":7,"human_review":2,"delete_raw_pool_item":3} | career_role/refetch_source: 人物已加入Anthropic，当前职位状态“now”可能不准确，需重抓来源核实最新职位。<br>current_title/refetch_source: 当前职位信息缺乏直接证据支持，需重抓来源以验证其时效性。<br>learning_card/rewrite_conservative: 卡片将“领导ChatGPT开发”归因于个人，属于过度归因。保守改写为“扮演关键角色”，更符合大型团队成果的表述，同时保留其联合创始人身份。 |
| 李莲 | 16 | 1 | {"close_historical_role":1,"refetch_source":9,"human_review":1,"rewrite_conservative":4,"delete_raw_pool_item":1} | career_role/close_historical_role: 人物当前为公司联合创始人，学生履历可能已过时，需关闭当前展示并标记为历史角色。<br>current_title/refetch_source: 该具体职位缺乏足够来源支持，需要可靠来源确认其真实性和时效性。<br>learning_card/human_review: 原句将公司级产品（微调API、嵌入API）交付归因于个人，可能过度。审核建议需要具体贡献证明，当前无足够证据，需人工复核。 |
| 桑达尔·皮查伊 | 16 | 1 | {"rewrite_conservative":7,"refetch_source":4,"delete_official_link":1,"delete_raw_pool_item":4} | career_role/rewrite_conservative: 已确认职位变更，保守更新结束时间，需人工复核后应用。<br>current_title/refetch_source: 职位信息可能正确，但缺乏直接来源文本支持其当前状态，无法确认是否过时，需重抓来源。<br>learning_card/rewrite_conservative: 原卡片将公司级财务决策过度归因于CEO个人。保守改写为强调其领导下的公司行为，保留财务数据事实。 |

## Safe Auto-Apply Candidates

| Person | Type | Target | Action | Reason |
| --- | --- | --- | --- | --- |
| Aidan Gomez | source_item_belongs_to_person | Damien Nicks: Getting your work-life balance right, starting a business and why the next 10 years are crucial | delete_raw_pool_item | 播客标题和摘要明确指向Damien Nicks，与Aidan Gomez无关，属于人名错配的高置信删除候选。 |
| Aakash Gupta | source_item_belongs_to_person | Main Aur Mumbai \| Aakash Gupta \| Stand-up Comedy | delete_raw_pool_item | YouTube视频是关于脱口秀演员Aakash Gupta，与产品副总裁Aakash Gupta无关，属于同名错配的高置信删除候选。 |
| Andrej Karpathy | source_item_belongs_to_person | ImageNet Large Scale Visual Recognition Challenge | delete_raw_pool_item | 论文作者列表中未包含Andrej Karpathy，属于错误归因。这是高置信度的外部内容错挂，符合安全自动删除条件。 |
| Arthur Mensch | source_item_belongs_to_person | Machine Learning Apr 2025 | delete_raw_pool_item | 内容为arXiv论文列表页面，作者列表中未包含Arthur Mensch，无法证明相关性。属于错误归因，符合安全自动删除条件。 |
| Arthur Mensch | source_item_belongs_to_person | From Academia to Industry: The Journey of Arthur Mench | delete_raw_pool_item | 文章标题明确拼写为'Arthur Mench'，与目标人物'Arthur Mensch'不符，属于人名错配，高置信删除候选。 |
| Boris Cherny | source_item_belongs_to_person | Error saving GPT - [object Object] when I update my custom ... | delete_raw_pool_item | 内容作者为Jiaqing_Zhang，与Boris Cherny无关，属于外部内容错挂，高置信删除候选。 |
| Boris Cherny | source_item_belongs_to_person | Object Object Error when using AI outputs - Questions | delete_raw_pool_item | 内容作者为匿名用户，与Boris Cherny无关，属于外部内容错挂，高置信删除候选。 |
| Boris Cherny | source_item_belongs_to_person | LLM object must define bindTools method when using ... | delete_raw_pool_item | 内容报告者为sid-js，与Boris Cherny无关，属于外部内容错挂，高置信删除候选。 |
| Boris Cherny | source_item_belongs_to_person | File upload failed: [object Object] - Google AI Studio | delete_raw_pool_item | 内容作者为Yi_Lu，与Boris Cherny无关，属于外部内容错挂，高置信删除候选。 |
| Boris Cherny | source_item_belongs_to_person | [object Object] - Microsoft Q&A | delete_raw_pool_item | 内容提问者为Anthony Pineda，与Boris Cherny无关，属于外部内容错挂，高置信删除候选。 |
| Boris Cherny | source_item_belongs_to_person | GPT-4 Technical Report | delete_raw_pool_item | 内容为OpenAI团队的技术报告，未提及Boris Cherny，属于人名错配，高置信删除候选。 |
| Boris Cherny | source_item_belongs_to_person | Introduction to Large Language Models | delete_raw_pool_item | 内容为Google官方资源，与Boris Cherny无关，属于错误归因，应直接删除。 |
| Boris Cherny | source_item_belongs_to_person | ChatGPT | delete_raw_pool_item | 内容为ChatGPT的维基百科页面，属于通用知识，与Boris Cherny无关，应直接删除。 |
| Boris Cherny | source_item_belongs_to_person | Large language model | delete_raw_pool_item | 内容为大型语言模型的维基百科页面，属于通用知识，与Boris Cherny无关，应直接删除。 |
| Boris Cherny | source_item_belongs_to_person | Large Language Models Explained | delete_raw_pool_item | 内容为Couchbase官方博客文章，作者为Couchbase团队，与Boris Cherny无关，应直接删除。 |
| Chris Olah | source_item_belongs_to_person | Unsolved problems in AI \| Chris Olah and Lex Fridman | delete_raw_pool_item | 视频主要嘉宾为Dario Amodei和Amanda Askell，Chris Olah仅为嘉宾之一，内容非其主导，归因不准确，应删除。 |
| Chris Olah | source_item_belongs_to_person | Large language models, explained with a minimum of math and jargon | delete_raw_pool_item | 文章作者为Timothy B. Lee和Sean Trott，内容为通用科普，并非Chris Olah的作品，归因错误，应删除。 |
| Chris Olah | source_item_belongs_to_person | 06.20: It's Romance Science! | delete_raw_pool_item | 播客内容与Chris Olah的AI研究员身份完全无关，属于同名或错误归因，置信度高，符合安全自动删除条件。 |
| Christopher Manning | source_item_belongs_to_person | Steelers' Aaron Rodgers on Similar Career Path as Tom Brady w/Buccaneers, Peyton Manning w/Broncos? | delete_raw_pool_item | 播客内容涉及美式橄榄球运动员Peyton Manning，与计算机科学家Christopher Manning无关，属于同名实体错误归因，置信度高，符合安全自动删除条件。 |
| Christopher Manning | source_item_belongs_to_person | NFFC Average Draft Position - QBs | delete_raw_pool_item | 播客内容为幻想橄榄球，与计算机科学家Christopher Manning无关，属于同名实体错误归因，置信度高，符合安全自动删除条件。 |
| Christopher Manning | source_item_belongs_to_person | PPP 295 - Starting Pitcher Update & Streamers - 6-28-23 | delete_raw_pool_item | 播客内容为棒球幻想体育，与计算机科学家Christopher Manning无关，属于同名实体错误归因，置信度高，符合安全自动删除条件。 |
| Daniela Amodei | source_item_belongs_to_person | Daniela Amadori | delete_raw_pool_item | 内容明确关于欧洲大学研究所的 Daniela Amadori，与目标人物 Daniela Amodei 姓名不匹配，属于错误人物，应直接删除。 |
| Daniela Amodei | source_item_belongs_to_person | Dario Amodei — The Urgency of Interpretability | delete_raw_pool_item | 内容明确关于 Dario Amodei，与目标人物 Daniela Amodei 不匹配，属于错误人物，应直接删除。 |
| Dylan Field | source_item_belongs_to_person | Tips For Your Pokemon Sword and Shield Adventure\| PUCL #416 | delete_raw_pool_item | 内容是关于宝可梦游戏的播客，与 Dylan Field（Figma CEO）无关，属于人名错配，应直接删除。 |
| Dylan Field | source_item_belongs_to_person | Postcards from Pearl - Ep. 100A - Silly Scoop Stakeout | delete_raw_pool_item | 内容为儿童冒险播客，与Figma CEO Dylan Field无关，属于人名错配，高置信度删除。 |
| Elon Musk | source_item_belongs_to_person | mRNA-1273 and BNT162b2 COVID-19 vaccines elicit antibodies with differences in Fc-mediated effector functions | delete_raw_pool_item | 论文作者列表中无Elon Musk，内容为COVID-19疫苗免疫学研究，与其领域无关，属于人名错配，高置信度删除。 |
| Elon Musk | source_item_belongs_to_person | mRNA-1273 vaccine-induced antibodies maintain Fc effector functions across SARS-CoV-2 variants of concern | delete_raw_pool_item | 论文作者列表中无Elon Musk，内容为COVID-19疫苗免疫学研究，与其领域无关，属于人名错配，高置信度删除。 |
| Elon Musk | source_item_belongs_to_person | Discrete SARS-CoV-2 antibody titers track with functional humoral stability | delete_raw_pool_item | 论文作者列表中无Elon Musk，内容为COVID-19抗体研究，与其领域无关，属于人名错配，高置信度删除。 |
| Elon Musk | source_item_belongs_to_person | Early cross-coronavirus reactive signatures of humoral immunity against COVID-19 | delete_raw_pool_item | 论文作者列表中无Elon Musk，内容为COVID-19免疫学研究，与其领域无关，属于人名错配，高置信度删除。 |
| Elon Musk | source_item_belongs_to_person | SARS-CoV-2 antibodies protect against reinfection for at least 6 months in a multicentre seroepidemiological workplace cohort | delete_raw_pool_item | 论文作者列表中无Elon Musk，内容为COVID-19抗体保护研究，与其领域无关，属于人名错配，高置信度删除。 |
| Elon Musk | source_item_belongs_to_person | Subtle immunological differences in mRNA-1273 and BNT162b2 COVID-19 vaccine induced Fc-functional profiles | delete_raw_pool_item | 论文作者列表中无Elon Musk，内容为COVID-19疫苗免疫学差异研究，与其领域无关，属于人名错配，高置信度删除。 |
| Elon Musk | source_item_belongs_to_person | Early cross-coronavirus reactive signatures of protective humoral immunity against COVID-19 | delete_raw_pool_item | 论文作者列表中无Elon Musk，内容为COVID-19免疫学研究，与人物身份和领域完全无关，属于错误归因，应直接删除。 |
| Elon Musk | source_item_belongs_to_person | Serological Markers of SARS-CoV-2 Reinfection | delete_raw_pool_item | 论文作者列表中无Elon Musk，内容为医学研究，与人物公开身份和领域不符，属于错误归因，应直接删除。 |
| Elon Musk | source_item_belongs_to_person | SARS-CoV-2 infection and reinfection in a seroepidemiological workplace cohort in the United States | delete_raw_pool_item | 论文作者列表中无Elon Musk，内容为流行病学研究，与人物公开身份和领域不符，属于错误归因，应直接删除。 |
| Emad Mostaque | source_item_belongs_to_person | The Evolution of LLMs: From T5 and GPT to Mixtral, o1, Claude 3.7, and Grok 3.5 — A Journey Through Completion, Reasoning, and First Principles | delete_raw_pool_item | 文章作者为Roberto Infante，内容是关于LLM技术演进的综述，与Emad Mostaque无直接关联，属于错误归因，应直接删除。 |
| Geoffrey Hinton | source_item_belongs_to_person | Job Predictions Collide, RTO Tightens, Workweeks Shift, and Consulting Gets Rebuilt | delete_raw_pool_item | 播客标题和摘要未提及Geoffrey Hinton，内容主题为职场预测和管理，与该人物无关，属于错误归因，应直接删除。 |
| Greg Brockman | source_item_belongs_to_person | [Closed] Request for proposals: benchmarking LLM agents on consequential real-world tasks \| Open Philanthropy | delete_raw_pool_item | 内容为Open Philanthropy机构提案征集，与Greg Brockman个人无直接关联，属于机构级内容，符合高置信删除条件。 |
| Greg Brockman | source_item_belongs_to_person | Kernels of selfhood: GPT-4o shows humanlike patterns of cognitive dissonance moderated by free choice | delete_raw_pool_item | PNAS论文作者列表未包含Greg Brockman，属于团队/机构成果，与个人无直接关联，符合高置信删除条件。 |
| Greg Brockman | source_item_belongs_to_person | 337. Are personality tests legit? | delete_raw_pool_item | 播客内容与 Greg Brockman 的专业领域（AI、OpenAI）完全无关，标题和摘要均未提及他，属于错误归因。 |
| Greg Brockman | source_item_belongs_to_person | 873. Luke takes the MBTI Personality Test | delete_raw_pool_item | 播客内容是关于英语学习和性格测试，与 Greg Brockman 无关，属于错误归因。 |
| Greg Brockman | source_item_belongs_to_person | #112: Personality Tests | delete_raw_pool_item | 播客内容是关于英语学习，与 Greg Brockman 无关，属于错误归因。 |
| Greg Brockman | source_item_belongs_to_person | 209. Who Are You Really? On Personality and Flourishing with Professor Brian Little | delete_raw_pool_item | 播客内容是关于学习科学和性格，与 Greg Brockman 无关，属于错误归因。 |
| Guillaume Lample | source_item_belongs_to_person | A Careful Examination of Large Language Model Performance on Grade School Arithmetic | delete_raw_pool_item | 论文作者列表中没有 Guillaume Lample，内容与目标人物无关，属于错误归因。 |
| Guillaume Lample | source_item_belongs_to_person | Posts | delete_raw_pool_item | 博客作者是 Guillaume Laforge，与 Guillaume Lample 是不同的人，属于错误归因。 |
| Guillaume Lample | source_item_belongs_to_person | Daily Papers - Hugging Face | delete_raw_pool_item | Hugging Face Daily Papers 页面是通用论文列表，未提及 Guillaume Lample，内容与目标人物无直接关联，属于无支持证据。 |
| Guillaume Lample | source_item_belongs_to_person | NLIR: Natural Language Intermediate Representation for Mechanized Theorem Proving | delete_raw_pool_item | 论文作者列表中无 Guillaume Lample，内容与目标人物无关，属于高置信删除候选。 |
| Hyung Won Chung | source_item_belongs_to_person | 小扎煲汤挖人，马斯克直呼疯狂！吴恩达揭秘AI人才“亿级 ... | delete_raw_pool_item | 文章主要关于吴恩达，仅提及 Hyung Won Chung 为被挖角研究员，并非其个人作品，属于高置信删除候选。 |
| Hyung Won Chung | source_item_belongs_to_person | Large Language Model-Based Autonomous Agent for Prognostics and Health Management | delete_raw_pool_item | 论文作者为 Joon-Young Kim，与 Hyung Won Chung 无关，属于错误归因的高置信删除候选。 |
| Hyung Won Chung | source_item_belongs_to_person | K League 1 R32 and K League 2 R31 Recap | delete_raw_pool_item | 播客为韩国足球联赛回顾，与 AI 研究员 Hyung Won Chung 无关，属于人名错配的高置信删除候选。 |
| Hyung Won Chung | source_item_belongs_to_person | Titillating Sports with Rick Tittle - August 15, 2025 | delete_raw_pool_item | 播客为体育节目，与 AI 研究员 Hyung Won Chung 无关，属于人名错配的高置信删除候选。 |
| Jaana Dogan | source_item_belongs_to_person | Building AI Tools: LLM Integration, Dependence, and the Path to LLM-Agnostic Applications | delete_raw_pool_item | 文章作者是Akanksha Sinha，内容是关于LLM应用开发的通用技术文章，与Jaana Dogan无关。属于外部内容错挂到人物名下，高置信删除候选。 |
| Jaana Dogan | source_item_belongs_to_person | AI Agents in Data Engineering: The Next Evolution in Automated Pipelines | delete_raw_pool_item | 文章作者是Navya Jammalamadaka，内容是关于数据工程中AI代理的技术文章，与Jaana Dogan无关。属于外部内容错挂到人物名下，高置信删除候选。 |
| Jaana Dogan | source_item_belongs_to_person | Llamaindex vs Langchain: What's the difference? | delete_raw_pool_item | 文章作者是Ivan Belcic和Cole Stryker，内容是关于LlamaIndex与LangChain的技术对比，与Jaana Dogan无关。属于外部内容错挂到人物名下，高置信删除候选。 |
| Jaana Dogan | source_item_belongs_to_person | Building Enterprise Solutions with LLMs - GoPenAI | delete_raw_pool_item | 文章作者是Greger Ottosson，内容是关于企业LLM解决方案的技术文章，与Jaana Dogan无关。属于外部内容错挂到人物名下，高置信删除候选。 |
| Jaana Dogan | source_item_belongs_to_person | Intelligence Brief on Artificial Intelligence 2025 | delete_raw_pool_item | 文章作者是Panu Hentunen，内容是关于2025年人工智能的综合报告，与Jaana Dogan无关。属于外部内容错挂到人物名下，高置信删除候选。 |
| Jaana Dogan | source_item_belongs_to_person | Jan: Open source ChatGPT-alternative that runs 100% offline - Jan | delete_raw_pool_item | 内容为Jan项目官网，与Jaana Dogan无关，属于错误归因，应直接删除。 |
| Jan Leike | source_item_belongs_to_person | cmju143rk0amhrmtbi2obhskz | delete_raw_pool_item | 内容为LLM推理综述论文，作者列表未包含Jan Leike，属于错误归因，应直接删除。 |
| Jan Leike | source_item_belongs_to_person | Risks from power-seeking AI systems - Problem profile | delete_raw_pool_item | 内容为80,000 Hours的通用问题概述，未提及Jan Leike，属于错误归因，应直接删除。 |
| Jan Leike | source_item_belongs_to_person | AI, Robot | delete_raw_pool_item | 内容为Google DeepMind播客，未提及Jan Leike，属于错误归因，应直接删除。 |
| Jason Wei | source_item_belongs_to_person | About – Wei Yi – Medium | delete_raw_pool_item | 该Medium页面属于Wei Yi（AstraZeneca数据科学家），与目标人物Jason Wei（AI研究科学家）完全不符，属于错误归因，可安全删除。 |
| Jason Wei | source_item_belongs_to_person | 西电，西安电子科技大学，导师信息，教师，个人主页 | delete_raw_pool_item | 该页面是西安电子科技大学教师魏峰的个人主页，内容涉及微波工程，与目标人物Jason Wei（AI研究科学家）完全无关，属于错误归因，可安全删除。 |
| Jason Wei | source_item_belongs_to_person | Papers with Code - Jerry Wei | delete_raw_pool_item | 该页面是Papers with Code上作者Jerry Wei的论文列表，与目标人物Jason Wei姓名不符，属于错误归因，可安全删除。 |
| Jason Wei | source_item_belongs_to_person | Do you make plans for your weekends(新)你为周末做规划吗 | delete_raw_pool_item | 播客内容为雅思口语学习，与Jason Wei的研究领域（大语言模型、推理、NLP）完全无关，且无证据表明他参与此内容，属于错误归因，可安全删除。 |
| John Schulman | source_item_belongs_to_person | Mindstorms in Natural Language-Based Societies of Mind | delete_raw_pool_item | 论文作者列表未包含John Schulman，属于错误归因，高置信删除候选。 |
| John Schulman | source_item_belongs_to_person | DeJohn/Cashay | delete_raw_pool_item | 播客内容与John Schulman身份完全无关，属于人名错配，高置信删除。 |
| John Schulman | source_item_belongs_to_person | Episode 926 Behind the Seams featuring GA Tech Baseball's Josh Schulman hosted by John Stuper with Dave Dagostino | delete_raw_pool_item | 播客明确提及嘉宾为Josh Schulman，与John Schulman无关，属于人名错配，高置信删除。 |
| Lukasz Kaiser | source_item_belongs_to_person | Petr Mrazek, Chicago Blackhawks stifle Blues \| CHGO Blackhawks Postgame Podcast | delete_raw_pool_item | 播客内容为冰球比赛，与AI研究员Lukasz Kaiser无关，属于同名实体错配，高置信删除。 |
| Lukasz Kaiser | source_item_belongs_to_person | Lukasz Kaiser | delete_raw_pool_item | 内容为DBLP网站运营公告，与Lukasz Kaiser个人无关，属于网站信息错挂，高置信删除。 |
| Marc Andreessen | source_item_belongs_to_person | This is how startups quietly pull ahead | delete_raw_pool_item | 视频明确为Ben Horowitz内容，与Marc Andreessen无关，属于人名错配，高置信删除。 |
| Marc Andreessen | source_item_belongs_to_person | How AI Will Transform Fintech In 2026 | delete_raw_pool_item | 视频明确为David Haber和Zach Perret内容，与Marc Andreessen无关，属于人名错配，高置信删除。 |
| Mira Murati | source_item_belongs_to_person | Trevor Highlights Arizona's Ultra-MAGA Governor Candidate Kari Lake \| Mira Murati & Ralph Macchio | delete_raw_pool_item | 播客标题包含Mira Murati，但内容摘要仅为节目名称，无任何相关证据，极可能是同名或无关内容。属于高置信错误归因，可安全删除。 |
| Noam Shazeer | source_item_belongs_to_person | BBC Learning Zone | delete_raw_pool_item | 内容为BBC Learning Zone的维基百科页面，与Noam Shazeer完全无关，属于人名错配。高置信错误归因，可安全删除。 |
| Noam Shazeer | source_item_belongs_to_person | Continuity announcers in the United Kingdom | delete_raw_pool_item | 内容为英国 continuity announcers 的维基百科页面，与 Noam Shazeer 无关，属于人名错配，置信度高，可安全自动删除。 |
| Noam Shazeer | source_item_belongs_to_person | List of former BBC newsreaders and journalists | delete_raw_pool_item | 内容是关于BBC前新闻主播和记者的列表，与 Noam Shazeer（AI研究员）无关，属于人名错配，置信度高，可安全自动删除。 |
| Oriol Vinyals | source_item_belongs_to_person | 3 Common Misunderstandings About AI in 2025 | delete_raw_pool_item | 文章作者是 Nikita Ostrovsky，Oriol Vinyals 仅在文中被引用。将整篇文章归于 Oriol Vinyals 名下属于人名错配，置信度高，可安全自动删除。 |
| Percy Liang | source_item_belongs_to_person | DISC: Dynamic Decomposition Improves LLM Inference Scaling | delete_raw_pool_item | 论文作者列表中未包含 Percy Liang，内容与人物不匹配，属于错误挂载，可安全自动删除。 |
| Percy Liang | source_item_belongs_to_person | Papers with Code - Percy Liang | delete_raw_pool_item | 链接指向聚合搜索页面，并非Percy Liang本人发布或拥有的内容，属于错误挂载，可安全自动删除。 |
| Quoc Le | source_item_belongs_to_person | Inside the Billion-Dollar Startup Bringing AI Into the Physical World | delete_raw_pool_item | 审核确认内容与Quoc Le无关（文章关于Physical Intelligence公司，CEO为Karol Hausman），属于外部内容错挂，高置信删除候选。 |
| Quoc Le | source_item_belongs_to_person | BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding - ACL Anthology | delete_raw_pool_item | 审核确认BERT论文作者列表不包含Quoc Le，内容与他无关，属于外部内容错挂，高置信删除候选。 |
| Quoc Le | source_item_belongs_to_person | Một số ca khúc hát về quê hương của dân tộc thiểu số Trung Quốc | delete_raw_pool_item | 审核确认播客内容（关于中国少数民族歌曲）与计算机科学家Quoc Le无关，可能是同名实体，属于外部内容错挂，高置信删除候选。 |

## Manual / Source Required Queue

| Person | Type | Target | Action | Queries | Reason |
| --- | --- | --- | --- | --- | --- |
| Aidan Gomez | career_role | 研究科学家 @ Cohere | refetch_source | Aidan Gomez Cohere Research Scientist end date<br>Aidan Gomez Cohere career timeline | 履历显示结束时间为 now，但人物当前已是 CEO，信息明显过时。需要重抓来源以确认具体结束年份，然后才能进行保守改写。 |
| Aidan Gomez | career_role | Undergraduate Student @ 多伦多大学 | refetch_source | Aidan Gomez University of Toronto graduation year<br>Aidan Gomez undergraduate student end date | 履历显示结束时间为 now，但人物已毕业并创业，信息过时。需要重抓来源以确认具体毕业年份，然后才能进行保守改写。 |
| Aidan Gomez | career_role | Research Group Lead @ For.ai | refetch_source | Aidan Gomez For.ai Research Group Lead<br>Aidan Gomez For.ai role | 该履历缺乏来源支持，且与人物当前主要身份不符。需要重抓来源以核实该职位是否存在及具体细节。 |
| Alexander Amini | career_role | AI/tech professional @ Efficient AI | refetch_source | Alexander Amini Efficient AI role<br>Alexander Amini Efficient AI career | 该履历缺乏来源支持，职位描述模糊，且与人物当前主要身份不符。需要重抓来源以核实该职位是否存在及具体细节。 |
| Arthur Mensch | career_role | Staff Research Scientist @ 谷歌DeepMind | refetch_source | Arthur Mensch Google DeepMind end date<br>Arthur Mensch Mistral AI founding date | 履历显示结束时间为 now，但人物已创立 Mistral AI 并担任 CEO，信息过时。需要重抓来源以确认具体结束日期，然后才能进行保守改写。 |
| Arvind Krishna | career_role | Joined Company @ IBM | refetch_source | Arvind Krishna IBM join date and initial role<br>Arvind Krishna IBM career start | 履历显示结束时间为 now，但“Joined Company”是历史事件，不应标记为当前。需要重抓来源以确认具体日期和初始职位，然后才能进行保守改写。 |
| Arvind Krishna | career_role | General Manager, Systems and Technology Group's Development and Manufacturing Organization @ IBM | refetch_source | Arvind Krishna IBM General Manager Systems and Technology Group end date | 履历显示结束时间为 now，但该职位是历史职位，不应标记为当前。需要重抓来源以确认具体结束日期，然后才能进行保守改写。 |
| Arvind Krishna | career_role | Senior Vice President, Cloud and Cognitive Software @ IBM | refetch_source | Arvind Krishna IBM Senior Vice President Cloud and Cognitive Software end date | 履历显示结束时间为 now，但该职位是历史职位，不应标记为当前。需要重抓来源以确认具体结束日期，然后才能进行保守改写。 |
| Bob McGrew | career_role | Lieutenant Colonel @ Detachment 201 (Executive Innovation Corps) | refetch_source | Bob McGrew Detachment 201 Executive Innovation Corps Lieutenant Colonel | 该军事履历缺乏权威来源，且与当前职业背景关联性不明确，需重抓来源以确认其真实性。 |
| Christopher Manning | career_role | Student @ 斯坦福大学 | close_historical_role | Christopher Manning Stanford University graduation year | 学生身份已过时，当前为教授，应标记为历史角色并关闭当前展示。 |
| Cristiano Amon | career_role | Leadership Position @ Velocom | refetch_source | Cristiano Amon Velocom leadership position | 领导职位信息来源不足，无法确认准确性，需重抓来源以验证。 |
| Cristiano Amon | career_role | Engineer @ Qualcomm | close_historical_role | Cristiano Amon Qualcomm engineer end date | 工程师职位已过时，当前为总裁兼CEO，应标记为历史角色并关闭当前展示。 |
| Demis Hassabis | career_role | 副总裁 @ 谷歌DeepMind | rewrite_conservative | Demis Hassabis Google DeepMind current title | 职位描述不准确，当前为联合创始人兼CEO，应保守改写以反映当前状态。 |
| Demis Hassabis | career_role | Postdoctoral researcher @ 哈佛大学 | close_historical_role | Demis Hassabis Harvard postdoc end date | 博士后研究是过去经历，不应标记为“至今”，应关闭当前展示并标记为历史角色。 |
| Dylan Field | career_role | Fellow @ Thiel Fellowship | close_historical_role | Dylan Field Thiel Fellowship end date | Thiel Fellowship 是为期两年的项目，已结束，应关闭当前展示并标记为历史角色。 |
| Dylan Field | career_role | President/CEO/Co-Founder @ Figma Inc | rewrite_conservative | Dylan Field Figma current title | 职位描述过于冗长且不精确，应保守改写为更清晰的当前头衔。 |
| Bob McGrew | career_role | Engineer @ PayPal | refetch_source | Bob McGrew PayPal engineer current role<br>Bob McGrew LinkedIn PayPal | 当前履历来源仅为LLM提取，缺乏可靠证据。需重抓来源以确认其当前在PayPal担任工程师的职位、起止时间及状态。 |
| Bob McGrew | career_role | Chief Research Officer (CRO) @ OpenAI | rewrite_conservative | Bob McGrew left OpenAI 2024<br>Bob McGrew OpenAI departure announcement | 职位显示为当前，但根据公开信息，Bob McGrew已于2024年离开OpenAI。需保守改写履历，将结束日期更新为历史日期。 |
| Boris Cherny | career_role | Member of Technical Staff @ Anthropic | rewrite_conservative | Boris Cherny left Anthropic<br>Boris Cherny Anysphere Cursor role | 职位显示为当前，但其当前头衔显示已离开Anthropic，现任Anysphere (Cursor)。需保守改写履历，将结束日期更新为历史日期。 |
| Boris Power | career_role | 专家/研究员 @ OpenAI | rewrite_conservative | Boris Power OpenAI role change<br>Boris Power Head of Applied Research OpenAI | 职位显示为当前，但其当前头衔为Head of Applied Research @ OpenAI，表明职位已变更。需保守改写履历，将结束日期更新为历史日期。 |
| Chamath Palihapitiya | career_role | Founder and CEO @ 社会资本 | rewrite_conservative | Chamath Palihapitiya left Social Capital CEO<br>Chamath Palihapitiya 8090 CEO | 职位显示为当前，但其当前头衔显示已离开Social Capital的CEO职位。需保守改写履历，将结束日期更新为历史日期。 |
| Arvind Krishna | career_role | Director @ Federal Reserve Bank of New York | refetch_source | Arvind Krishna Federal Reserve Bank of New York director<br>Arvind Krishna board director Fed New York | 履历需要更权威的来源来确认其当前状态和起始时间。需重抓来源以验证该职位信息。 |
| Arvind Krishna | career_role | Director @ Northrop Grumman Corporation | refetch_source | Arvind Krishna Northrop Grumman director<br>Arvind Krishna board director Northrop Grumman | 履历需要更权威的来源来确认其当前状态和起始时间。需重抓来源以验证该职位信息。 |
| Ashok Elluswamy | career_role | Director of Autopilot Software @ 特斯拉 | rewrite_conservative | Ashok Elluswamy Tesla role change<br>Ashok Elluswamy VP of AI Tesla | 职位显示为当前，但其当前职位为AI副总裁，表明此职位可能已过时。需保守改写履历，将结束日期更新为历史日期。 |
| Chamath Palihapitiya | career_role | Co-founder and CEO @ 8090 | refetch_source | Chamath Palihapitiya 8090 co-founder CEO official announcement LinkedIn | 职位信息来源为AI_RECRAWL，缺少具体时间且无法确认当前状态。需要更可靠的来源来验证职位、机构和时间信息。 |
| Chip Huyen | career_role | ML Tooling @ Snorkel AI | refetch_source | Chip Huyen Snorkel AI ML Tooling official announcement LinkedIn | 职位信息来源为AI_RECRAWL，缺少具体时间且无法确认当前状态。需要更可靠的来源来验证职位、机构和时间信息。 |
| Chip Huyen | career_role | ML Tooling @ Netflix | rewrite_conservative | Chip Huyen Netflix ML Tooling end date departure announcement | 职位开始日期为2021年12月31日，但当前职位为Snorkel AI的ML Tooling。该Netflix职位可能已结束，但未提供结束日期，导致状态过时。需要保守改写以反映不确定性。 |
| Chip Huyen | career_role | Founder @ AI infrastructure startup | refetch_source | Chip Huyen AI infrastructure startup founder official announcement LinkedIn | 职位信息来源为AI_RECRAWL，缺少具体时间且无法确认当前状态。需要更可靠的来源来验证职位、机构和时间信息。 |
| Chris Olah | career_role | Co-founder @ Anthropic | refetch_source | Chris Olah Anthropic co-founder official announcement LinkedIn | 职位信息来源为AI_RECRAWL，缺少具体时间且无法确认当前状态。需要更可靠的来源来验证职位、机构和时间信息。 |
| Chris Olah | career_role | Interpretability @ Anthropic | refetch_source | Chris Olah Anthropic Interpretability official announcement LinkedIn | 职位信息来源为AI_RECRAWL，缺少具体时间且无法确认当前状态。需要更可靠的来源来验证职位、机构和时间信息。 |
| Chris Olah | career_role | Co-founder @ Distill | refetch_source | Chris Olah Distill co-founder official announcement LinkedIn | 职位信息来源为AI_RECRAWL，缺少具体时间且无法确认当前状态。需要更可靠的来源来验证职位、机构和时间信息。 |
| Daniel Gross | career_role | AI Product Development @ Meta | human_review | Daniel Gross Meta AI Product Development current role confirmation | 当前职位是 AI Product Development @ Meta，但个人上下文显示主要关联 Cue 公司，且开始日期（2024-12-31）异常。信息可能过时或错误，需要人工审核确认。 |
| Daniel Gross | career_role | Partner @ Y Combinator公司 | refetch_source | Daniel Gross Y Combinator partner end date<br>Daniel Gross current role Meta AI | 该职位显示为当前，但人物当前职位为 Meta AI 产品开发，且上下文未提及 Y Combinator，高度疑似已离任。需重抓来源确认结束日期。 |
| Daniela Amodei | career_role | Vice President of Safety and Policy @ OpenAI | refetch_source | Daniela Amodei OpenAI departure date<br>Daniela Amodei Anthropic co-founder | 该职位显示为当前，但人物当前职位为 Anthropic 总裁兼联合创始人，高度疑似已离任。需重抓来源确认结束日期。 |
| Elon Musk | career_role | 首席执行官 @ 特斯拉 | rewrite_conservative | Elon Musk Tesla CEO resignation 2023 | Elon Musk 已于 2023 年卸任特斯拉 CEO，该职位不应显示为当前。需保守改写，添加结束日期。 |
| Elon Musk | career_role | 联合创始人兼首席执行官 @ PayPal | rewrite_conservative | Elon Musk PayPal CEO tenure end date | Elon Musk 在 PayPal 的职位是历史角色，早已离任，不应显示为当前。需保守改写，添加结束日期。 |
| Greg Brockman | career_role | 高中期间大学课程学习 @ 北达科他大学 | rewrite_conservative | Greg Brockman University of North Dakota coursework end date | 该履历描述的是高中期间的学习经历，但结束时间显示为“now”，明显已过时。需保守改写，添加结束日期。 |
| Hamel Husain | career_role | Staff Machine Learning Engineer @ GitHub | refetch_source | Hamel Husain GitHub departure date<br>Hamel Husain current role independent AI consultant | 该职位显示为当前，但人物当前职位为独立 AI 顾问，高度疑似已离任。需重抓来源确认结束日期。 |
| Elon Musk | career_role | Owner & CEO @ Twitter, Inc. / X Corp. | rewrite_conservative | Elon Musk Twitter X Corp CEO resignation 2023 | Elon Musk 已于 2023 年卸任 Twitter/X Corp. CEO，该职位不应显示为当前。需保守改写，添加结束日期。 |
| Emad Mostaque | career_role | CEO of Stability AI @ Stability AI 首席执行官 | rewrite_conservative | Emad Mostaque Stability AI CEO resignation March 2024 | Emad Mostaque 已于 2024 年 3 月辞去 Stability AI CEO 职位，该职位不应显示为当前。需保守改写，添加结束日期。 |
| Fidji Simo | career_role | Chief Executive Officer and Chair @ Instacart | rewrite_conservative | Fidji Simo 离开Instacart 官方公告<br>Fidji Simo Instacart CEO tenure end date | 信息过时，需保守改写履历结束时间。根据审核建议，将结束时间设为2023年底，并需外部来源确认。 |
| Fidji Simo | career_role | Founder @ Metrodora Institute | refetch_source | Fidji Simo Metrodora Institute founder<br>Metrodora Institute founding date Fidji Simo | 履历开始时间和当前状态缺乏可靠来源，需重抓来源以确认创始人身份及时间线。 |
| Haofan Wang | career_role | Researcher @ InstantX Team | refetch_source | Haofan Wang InstantX Team researcher<br>InstantX Team Haofan Wang current role | 职位当前状态不明确，且与人物主要身份关联性存疑，需重抓来源确认其当前任职情况。 |
| Haofan Wang | career_role | 研究科学家 @ Kuaishou (MMU, Kolors Team) | human_review | Haofan Wang Kuaishou Kolors Team tenure<br>Haofan Wang Kuaishou research scientist end date | 履历显示为当前职位，但人物当前主要身份已变化，可能已离任。需人工审核以确认当前状态并决定是否添加结束时间。 |
| Haofan Wang | career_role | Visiting Researcher @ KAUST, Image and Video Understanding Laboratory (IVUL) | human_review | Haofan Wang KAUST IVUL visiting researcher end date | 访问职位开始于2020年，且人物当前身份已变化，该职位可能已结束。需人工审核以确认结束时间。 |
| Haofan Wang | career_role | Visiting Researcher @ Texas A&M University, DATA Lab | human_review | Haofan Wang Texas A&M DATA Lab visiting researcher end date | 访问职位开始于2019年，且人物当前身份已变化，该职位可能已结束。需人工审核以确认结束时间。 |
| Haofan Wang | career_role | Visiting Student @ 加州大学伯克利分校 | human_review | Haofan Wang UC Berkeley visiting student end date | 访问学生身份开始于2017年，且人物当前身份已变化，该身份可能已结束。需人工审核以确认结束时间。 |
| Haofan Wang | career_role | 首席技术官 @ OpenMined | human_review | Haofan Wang OpenMined CTO tenure<br>Haofan Wang OpenMined chief technology officer end date | 履历显示为当前职位，但人物当前主要身份已变化，可能已离任。需人工审核以确认当前状态并决定是否添加结束时间。 |
| James Manyika | career_role | 商业伙伴 @ 麦肯锡公司 | refetch_source | James Manyika McKinsey end date<br>James Manyika leave McKinsey 2021 | 职位状态为‘now’但已知人物已离职，需重抓来源确认结束日期，以便保守改写。 |
| Jan Leike | career_role | Undergraduate Degree @ University of Freiburg | close_historical_role | Jan Leike University of Freiburg undergraduate years | 本科学位早已完成，不应标记为‘now’。需重抓来源确认就读年份，然后关闭历史角色。 |
| Jan Leike | career_role | Research Scientist @ 谷歌DeepMind | refetch_source | Jan Leike Google DeepMind end date<br>Jan Leike leave DeepMind 2024 | 职位状态为‘now’但已知人物已离职，需重抓来源确认结束日期，以便保守改写。 |
| Jason Liu | career_role | Software Engineer @ Bloomberg | refetch_source | Jason Liu Bloomberg Software Engineer dates<br>Jason Liu Bloomberg tenure | 履历信息缺少具体时间段和来源佐证，无法确认准确性或当前状态，需重抓来源。 |
| Jason Liu | career_role | AI Consultant @ Independent | refetch_source | Jason Liu independent AI consultant end date<br>Jason Liu 567 Studios founder start | 职位状态为‘now’但当前上下文显示已为创始人，需重抓来源确认结束日期，以便保守改写。 |
| Jason Wei | career_role | Research Scientist @ OpenAI | refetch_source | Jason Wei OpenAI end date<br>Jason Wei join Google DeepMind 2024 | 职位状态为‘now’但当前上下文显示已加入DeepMind，需重抓来源确认结束日期，以便保守改写。 |
| Jay Alammar | career_role | Investor / Team Member (funding and accelerating tech companies) @ STV | refetch_source | Jay Alammar STV investor dates<br>Jay Alammar STV role timeline | 履历信息缺少具体时间段和来源佐证，无法确认准确性或当前状态，需重抓来源。 |
| Jay Alammar | career_role | Founder @ Unnamed Startup | refetch_source | Jay Alammar founder startup dates<br>Jay Alammar unnamed startup timeline | 履历信息缺少具体时间段和来源佐证，无法确认准确性或当前状态，需重抓来源。 |
| Haofan Wang | career_role | 首席技术官 @ RealAI | refetch_source | Haofan Wang RealAI CTO tenure<br>Haofan Wang RealAI employment history | 职位标记为当前，但人物当前主要身份是InstantID CEO，存在冲突。需要重抓来源确认其在RealAI的任职状态和时间。 |
| Haofan Wang | career_role | 首席技术官 @ Everspry | refetch_source | Haofan Wang Everspry CTO tenure<br>Haofan Wang Everspry employment history | 职位标记为当前，但人物当前主要身份是InstantID CEO，存在冲突。需要重抓来源确认其在Everspry的任职状态和时间。 |
| Haofan Wang | career_role | 首席技术官 @ Horizon Robotics | refetch_source | Haofan Wang Horizon Robotics CTO<br>Haofan Wang Horizon Robotics employment | 职位标记为当前，但人物当前上下文无Horizon Robotics背景，信息冲突。需要可靠来源确认其是否曾担任该职位。 |
| Haofan Wang | career_role | 首席技术官 @ Institute of Software, Chinese Academy of Sciences | refetch_source | Haofan Wang Institute of Software CAS CTO<br>Haofan Wang Chinese Academy of Sciences employment | 职位标记为当前，但人物当前上下文无中科院软件所背景，信息冲突。需要可靠来源确认其是否曾担任该职位。 |
| Harrison Chase | career_role | Member @ Databricks | refetch_source | Harrison Chase Databricks employment<br>Harrison Chase Databricks tenure | 职位标记为当前，但人物当前主要身份是LangChain CEO，存在冲突。需要重抓来源确认其在Databricks的任职状态和时间。 |
| Harrison Chase | career_role | Instructor @ Coursera | refetch_source | Harrison Chase Coursera instructor<br>Harrison Chase Coursera tenure | 职位标记为当前，但人物当前主要身份是LangChain CEO，存在冲突。需要重抓来源确认其在Coursera的任职状态和时间。 |
| Hugo Larochelle | career_role | Member @ 蒙特利尔大学 | refetch_source | Hugo Larochelle Université de Montréal current role<br>Hugo Larochelle University of Montreal employment | 职位标记为当前，但人物当前主要身份是Google DeepMind研究总监，且“Member”角色模糊。需要重抓来源确认其当前职位。 |
| Hugo Larochelle | career_role | Member @ Google Brain | refetch_source | Hugo Larochelle Google Brain DeepMind current role<br>Hugo Larochelle Google Brain tenure | 职位标记为当前，但Google Brain已并入DeepMind，人物当前职位是研究总监。需要重抓来源确认其当前职位和任期。 |
| Ilya Sutskever | career_role | 首席科学家 @ OpenAI | rewrite_conservative | Ilya Sutskever 离开 OpenAI 官方公告<br>Ilya Sutskever OpenAI end date | 履历显示为当前状态，但人物已离任。需保守改写，添加结束日期，将状态从 'now' 改为历史职位。 |
| Ilya Sutskever | career_role | mathematician @ Safe Superintelligence Inc. | rewrite_conservative | Safe Superintelligence Inc. 官方网站 Ilya Sutskever<br>Ilya Sutskever SSI co-founder chief scientist | 职位描述 'mathematician' 未能准确反映其领导角色，属于归因层级错误。需保守改写为更准确的头衔。 |
| Ilya Sutskever | career_role | computer scientist @ Safe Superintelligence Inc. | rewrite_conservative | Safe Superintelligence Inc. 官方网站 Ilya Sutskever<br>Ilya Sutskever SSI co-founder chief scientist | 职位描述 'computer scientist' 未能准确反映其领导角色，属于归因层级错误。需保守改写为更准确的头衔。 |
| Ilya Sutskever | career_role | artificial intelligence researcher @ Safe Superintelligence Inc. | rewrite_conservative | Safe Superintelligence Inc. 官方网站 Ilya Sutskever<br>Ilya Sutskever SSI co-founder chief scientist | 职位描述 'artificial intelligence researcher' 未能准确反映其领导角色，属于归因层级错误。需保守改写为更准确的头衔。 |
| Jaana Dogan | career_role | Software Engineer @ Tikle | delete_role | Jaana Dogan Tikle employment dates<br>Jaana Dogan Tikle software engineer | 履历显示为当前状态，但人物当前职位为 Google 的 Principal Engineer，信息过时或冲突。需删除此过时履历条目。 |
| Jaana Dogan | career_role | Software Engineer @ 微软 | delete_role | Jaana Dogan Microsoft employment dates<br>Jaana Dogan Microsoft software engineer | 履历显示为当前状态，但人物当前职位为 Google 的 Principal Engineer，信息过时或冲突。需删除此过时履历条目。 |
| Jakub Pachocki | career_role | Advisor @ deepsense.ai | refetch_source | Jakub Pachocki deepsense.ai advisor<br>Jakub Pachocki deepsense.ai start date | 来源显示 Jakub Pachocki 是 deepsense.ai 的顾问，但未提供开始日期，且其当前主要职位是 OpenAI 首席科学家，此顾问职位是否为当前状态存疑。需要重抓来源以确认。 |
| James Manyika | career_role | 高级合伙人 @ 麦肯锡公司 | rewrite_conservative | James Manyika McKinsey end date<br>James Manyika joined Google date | James Manyika 自 2021 年起已加入谷歌担任高级副总裁，其麦肯锡高级合伙人的职位很可能已结束，但来源未提供结束日期。需保守改写，添加结束日期。 |
| Jeremy Howard | career_role | Digital Fellow @ Stanford Digital Economy Lab | refetch_source | Jeremy Howard Stanford Digital Economy Lab Digital Fellow current status | 职位状态为“now”但可能已过时，需重抓来源确认当前状态。 |
| Joanne Jang | career_role | 总经理，OpenAI Labs @ OpenAI | refetch_source | Joanne Jang OpenAI Labs General Manager | 职位和起始时间仅基于LLM提取，需可靠来源验证。 |
| Joanne Jang | career_role | 模型行为负责人 @ OpenAI | refetch_source | Joanne Jang OpenAI Model Behavior Lead | 职位和起始时间仅基于LLM提取，需可靠来源验证。 |
| Joanne Jang | career_role | 计算机科学硕士 @ 斯坦福大学 | refetch_source | Joanne Jang Stanford University MS Computer Science | 学历信息与上下文一致但来源仅为LLM提取，需可靠来源验证细节。 |
| Joanne Jang | career_role | 理学学士，数学与计算科学 @ 斯坦福大学 | refetch_source | Joanne Jang Stanford University BS Mathematics and Computational Science | 学历信息仅基于LLM提取，需可靠来源验证。 |
| Joanne Jang | career_role | Product Lead for DALL·E, Model Behavior @ OpenAI | refetch_source | Joanne Jang OpenAI DALL·E Product Lead | 职位和起始时间来源为“ai-knowledge”，具体性不足，需可靠来源验证。 |
| John Giannandrea | career_role | Co-founder @ Metaweb | rewrite_conservative | John Giannandrea Metaweb co-founder tenure end date | Metaweb已被收购，联合创始人角色已结束，当前状态“now”不准确，需保守改写结束时间。 |
| John Schulman | career_role | 研究科学家 @ 思维机器实验室 | refetch_source | John Schulman Thinking Machines Lab current position | 人物已加入Anthropic，当前职位状态“now”可能不准确，需重抓来源核实最新职位。 |
