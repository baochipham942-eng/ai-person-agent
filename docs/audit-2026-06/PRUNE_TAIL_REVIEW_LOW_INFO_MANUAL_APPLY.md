# Manual RawPool Apply

Generated at: 2026-06-10T21:32:57.868Z
Mode: execute
Input: docs/audit-2026-06/data/prune_tail_review_low_info_manual_decisions.json
Archive: docs/audit-2026-06/data/prune_tail_review_low_info_manual_apply_archive.json
Stage: manual_prune_tail_review_low_info

## Counts

| Metric | Value |
| --- | ---: |
| decisions | 37 |
| existing targets | 37 |
| missing targets | 0 |
| audit rows inserted | 37 |
| RawPoolItem rows deleted | 37 |

## Actions

| Action | Count |
| --- | ---: |
| delete_raw_pool_item | 37 |

## Rows

| Person | Target | Action | Exists | Reason |
| --- | --- | --- | --- | --- |
| Dylan Field | 20 Under 20 Thiel Fellow: Dylan Field | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：关于Thiel Fellowship的早期背景介绍，偏向个人历史而非当前科技趋势。 Refetch curation 判为 human_review，原因：维基百科页面明确、权威地记载了Dylan Field作为Thiel Fellow的身份及其与Figma创立的关系... |
| Elon Musk | 埃隆·马斯克：世界上最危险的病人——朕即国家｜Elon   Musk｜川普｜特朗普｜Donald John Trump｜马斯克采访｜马斯克新冠病毒｜马斯克为什么支持特朗普｜马斯克自传｜马斯克国际开发署 | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：侧重政治立场与个人评价，科技相关性较低且带有主观色彩。 Refetch curation 判为 human_review，原因：候选来源多为通用传记、冲突报道或无关采访转录，均未直接证明原始声明中“世界上最危险的病人——朕即国家”等主观评价或政治立场内容。缺乏权威来源... |
| Emad Mostaque | Emad Mostaque on the End of Capitalism | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：标题高度相关但正文仅包含网页页脚和导航链接，缺乏实质性论述。 Refetch curation 判为 human_review，原因：原来源仅含网页页脚，缺乏实质内容。候选中的Singju Post转录页面提供了Emad Mostaque在Impact Theory播... |
| 亚历克·拉德福德 | A Comprehensive Guide To Alec Radford: The Innovator ... | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：标题为关于亚历克·拉德福德的指南，但内容为网站导航和订阅信息，缺乏实质内容需人工审核。 Refetch curation 判为 human_review，原因：原始来源缺乏实质内容。维基百科页面提供了权威的生平概述，可作为补充。Le Random文章直接以亚历克·拉德... |
| 亚历克·拉德福德 | L11 Language Models -- guest instructor: Alec Radford ... | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：标题提到亚历克·拉德福德作为客座讲师，但内容为YouTube登录页面，信息不完整需人工判断。 Refetch curation 判为 human_review，原因：候选来源中，OpenAI官方论文PDF能直接证明Alec Radford的研究者身份，可作为补强来源。... |
| 马克·扎克伯格 | Meta's Mark Zuck announces new AI model Mango to ... | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：标题提及扎克伯格和AI模型，但内容被交易所广告和链接淹没，信息密度极低，需人工判断是否有效。 Refetch curation 判为 human_review，原因：原始来源信息密度低且被广告淹没。候选来源中，马凯特大学存档的扎克伯格Facebook帖子转录是直接、权... |
| Mira Murati | Mira Murati's Open Source AI Breakthrough at Thinking ... | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：标题提及Mira Murati和AI突破，但内容被截断且包含大量无关链接文本，质量存疑需人工判断。 Refetch curation 判为 human_review，原因：Expected double-quoted property name in JSON at ... |
| Yoshua Bengio | &quot;I CREATED AI AND I&#39;M HERE TO WARN YOU&quot; | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：标题具有强烈的标题党倾向，且正文未明确提及 Bengio 姓名，需确认是否为本人访谈。 Refetch curation 判为 human_review，原因：所有候选来源均未直接提及原标题“I CREATED AI AND I'M HERE TO WARN YOU”... |
| 桑达尔·皮查伊 | 谷歌CEO桑达尔.皮查伊：Gemini浪潮、全栈AI与未来十年布局 | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：标题明确提及皮查伊和Gemini，但内容为加密乱码，无法判断实际质量，需人工审查。 Refetch curation 判为 human_review，原因：Expected double-quoted property name in JSON at position... |
| 阿希什·瓦斯瓦尼 | Ashish Vaswani on Essential AI's Journey with MI300X ... | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：YouTube视频标题提及Ashish Vaswani，但内容仅为页面框架，缺乏具体信息，需人工判断。 Refetch curation 判为 human_review，原因：原始YouTube视频缺乏具体内容，需替换。候选中的Montgomery Summit页面是... |
| Chris Olah | Valuable synthesis across labs! Make sure to check out the tutorial video - https://www.youtube.com/watch?v=ruLcDtr_cGo | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：仅为推荐视频的转发语，缺乏具体的实质性内容。 Refetch curation 判为 human_review，原因：原始声明仅为推荐视频的转发语，缺乏实质性内容。候选来源中，TIME的人物简介和Chris Olah的官方博客能直接证明其身份、职位和贡献，是权威且可访... |
| 唐杰 | 4.7 is coming, one of your best coding partners. https://z.ai/blog/glm-4.7 | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方发布的模型更新预热，内容较为简短，信息量有限。 Refetch curation 判为 human_review，原因：原始来源为唐杰个人社交媒体发布的简短预告，信息量有限。候选中智源社区的文章明确关联唐杰与GLM-4模型，可作为补充来源，增强其与GLM系列模型关... |
| 杰夫·迪恩 | Awesome to see this overview of work done by many, many people in @GoogleResearch over the past year.   Learn about advances in: Advances in generative models Generative user interfaces Quantum Computing AI for Scientific Discovery Biomedical & Neuroscience Research Climate & Sustainability Privacy & Security Novel Model Architectures ...and more... Read the blog post at https://t.co/Hdj73HMEkg | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：杰夫·迪恩转发Google Research年度总结，虽与AI相关但内容泛泛，信息价值较低。 Refetch curation 判为 human_review，原因：原推文是杰夫·迪恩转发谷歌研究年度总结，需证明其身份与谷歌研究的关联。谷歌官方研究页面直接确认其首席科... |
| Jaana Dogan | Jaana Dogan :unverified:: "I don't know if AI is going to…" - Mastodon | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：内容为简短引用，缺乏上下文和深度，信息密度低，需人工判断是否值得入库。 Refetch curation 判为 human_review，原因：原始来源为Mastodon帖子，缺乏上下文。新浪新闻文章提供了权威媒体对同一事件的详细报道，直接引用并解释了Jaana Do... |
| Yoshua Bengio | Yoshua Bengio - A Potential Path to Safer AI Development | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：标题高度相关，但正文内容主要为LinkedIn登录提示和网页导航，信息密度极低。 Refetch curation 判为 human_review，原因：原LinkedIn来源信息密度低，无法有效证明人物与观点。TIME作者页和TED演讲转录均为权威、可访问的来源，能... |
| 桑达尔·皮查伊 | 谷歌CEO 桑达尔·皮查伊（Sundar Pichai） 刚刚发表了一项 ... | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：标题提及皮查伊发表关于科技未来的声明，但内容仅为Facebook登录页片段，无实质信息，需人工判断。 Refetch curation 判为 human_review，原因：原始来源为Facebook登录页片段，无实质信息。候选中麻省理工科技评论的专访文章权威性高，直... |
| 阿希什·瓦斯瓦尼 | Attention Is All You Need \| Request PDF | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：内容是关于Attention论文的请求页面，虽提及Ashish Vaswani为作者，但信息密度低，仅展示元数据。 Refetch curation 判为 human_review，原因：原始来源（ResearchGate请求页面）信息密度低。候选中的中文维基百科页面... |
| Dylan Field | Grateful to be a seed investor in Sunday! Just a few minutes into meeting @tonyzzhao and @chichengcc it was clear this would be a very special company. Their pace and progress has exceeded every expectation and they are just getting started! | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：涉及个人投资动态，虽与科技行业相关但内容偏向社交礼仪。 Refetch curation 判为 human_review，原因：候选来源中，只有Tony Zhao的LinkedIn帖子明确提到Dylan Field是Sunday的天使投资人，但这是UGC内容，权威性不... |
| Ilya Sutskever | Congratulations to @geoffreyhinton for winning the Nobel Prize in physics!! | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方发布的社交祝贺动态，属于礼仪性内容，缺乏深度观点。 Refetch curation 判为 human_review，原因：候选来源均未直接证明Ilya Sutskever对Geoffrey Hinton获得诺贝尔奖的祝贺。原始来源为推特动态，属于社交礼仪内容，缺... |
| Richard Socher | A new dimension of creativity unlocked by AI.  Given that the games industry is larger than movies. | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：泛泛评论AI与游戏行业，缺乏具体观点或事实，质量偏低。 Refetch curation 判为 human_review，原因：所有候选来源均未直接提及目标声明（AI解锁创造力新维度，游戏行业比电影大）。需要更精确的搜索来找到Richard Socher本人发表此观点... |
| Sam Altman | It is a very smart model, and we have come a long way since GPT-5.1: | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：对模型进步的泛泛评价，内容较为简短且缺乏具体细节。 Refetch curation 判为 human_review，原因：原始来源（推文）内容简短，缺乏上下文。候选中的播客转录和官方视频能提供更权威、更详细的背景，证明 Sam Altman 对模型进展的评价，适合作... |
| Zoubin Ghahramani | Predicting weather accurately is a fantastic use of AI that helps everyone in the world. @GoogleDeep | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：内容属于泛泛而谈的宏观愿景，信息密度较低，仅表达对 AI 气象预测的认可。 Refetch curation 判为 human_review，原因：原推文内容泛泛，缺乏具体信息。候选中的Google Research官方资料页能权威证明Zoubin Ghahraman... |
| 亚历克·拉德福德 | recentBeen AI meaning-focused to posts check as this of - late thanks December @ Thom202_W5olf. ! Alec RandomRad speculation tends: to the post bit sporad ofically weird,ness so going the on dates in span BERT several's months position. embeddings Let compared me to know GPT if is you'd due like to deeper the analysis sentence of similarity any task of. these I'd! guess a version of BERT trained without that aux loss would have pos embds similar to GPT. | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：内容混乱但提及亚历克·拉德福德和BERT/GPT比较，需人工判断是否有效。 Refetch curation 判为 human_review，原因：原始来源内容混乱，但提及人物与BERT/GPT比较。候选中Dataconomy文章提供了权威的职业背景信息，可补强人物页... |
| 唐杰 | for GLM-4.6, which features do you want most? Speed up to 100t/s? Stability? Lower price? | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方账号发布的互动调研，信息密度较低，属于产品反馈收集。 Refetch curation 判为 human_review，原因：原始来源为唐杰在X平台的互动调研，信息密度低。候选来源中，智源社区文章能权威证明唐杰与GLM模型的关联，可作为补强来源。但该文章未直接提及... |
| 埃里克·霍维茨 | When AI Meets Biology | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：标题式推文，虽然主题相关但信息密度极低，需人工确认是否保留。 Refetch curation 判为 human_review，原因：原始来源为推文，信息密度低。候选中仅微软官方页面提及埃里克·霍维茨及其观点，可作为权威补充，但未直接关联“When AI Meets ... |
| 布莱恩·卡坦扎罗 | //x.com/ctnzr/status/1957504768156561413 | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：虽为官方账号链接，但缺乏具体文本内容，需人工确认链接价值。 Refetch curation 判为 human_review，原因：原始来源为推文链接，缺乏具体内容。候选中有两个来源（yeeyi和36氪）明确提及人物姓名、职位和贡献，可作为补充证据。其他候选来源要么无... |
| 阿希什·瓦斯瓦尼 | Thank you! This work was led by @ishaankshah , @ampolloreno , Karl and Philip! | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：感谢推文，提及他人工作，但内容简短，信息价值有限。 Refetch curation 判为 human_review，原因：原推文内容简短，信息价值有限。维基百科页面提供了人物权威背景和主要贡献，可作为补充来源，增强信息深度。但维基百科为二级来源，不能完全替代原推文，... |
| 阿希什·瓦斯瓦尼 | Thanks to @Divyasmansingka for operational support. | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：仅感谢某人，与AI相关性模糊，质量低，需人工审核。 Refetch curation 判为 human_review，原因：候选来源中，维基百科页面提供了人物背景信息，但属于辅助线索，不能作为替换来源。其他页面要么与人物无关，要么权威性不足。原始来源（推文）内容过于简... |
| 阿希什·瓦斯瓦尼 | Tremendous effort by the @essential_ai team! | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：仅称赞团队努力，缺乏具体信息，AI相关性模糊，需人工判断。 Refetch curation 判为 human_review，原因：原始推文缺乏上下文，维基百科页面能补强阿希什·瓦斯瓦尼与Essential AI的创办人关系，从而解释他为何称赞该团队。但维基百科是辅助... |
| Chris Olah | The Anthropic Interpretability Team is planning a virtual Q&A... | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：仅提及Anthropic可解释性团队活动，信息量低，需确认是否本人发布。 Refetch curation 判为 human_review，原因：原声明仅提及Anthropic可解释性团队计划虚拟Q&A，信息模糊。候选中的Anthropic官方新闻稿明确将Chris ... |
| Guillaume Lample | Devstral 2 looking good ! | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：内容过于简短，仅表达对模型的正面看法，信息密度低，需人工判断。 Refetch curation 判为 human_review，原因：候选来源中，VentureBeat和iThome的报道虽未直接提及Guillaume Lample，但作为权威科技媒体对Mistra... |
| Lukasz Kaiser | Just use o3. It's worth the wait. Try o4-mini if in a hurry. | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方推文，但内容简短，仅为建议使用o3模型，信息密度低，需人工判断。 Refetch curation 判为 human_review，原因：候选来源中，没有直接证明Lukasz Kaiser发表过“Just use o3. It's worth the wait. ... |
| Lukasz Kaiser | Please add your own work if you use GPT5 for science. | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：官方推文，内容简短，建议使用GPT5进行科学研究，信息密度低，需人工判断。 Refetch curation 判为 human_review，原因：候选来源均未直接证明‘Please add your own work if you use GPT5 for scie... |
| Mira Murati | //openai.com/index/introducing-the-model-spec/ | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：仅含链接无实质内容，需人工判断是否关于Mira Murati或AI。 Refetch curation 判为 human_review，原因：候选来源均未直接证明Mira Murati与“//openai.com/index/introducing-the-model... |
| Mira Murati | //openai.com/index/navigating-the-challenges-and-opportunities-of-synthetic-voices/ | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：仅含链接无实质内容，需人工判断是否关于Mira Murati或AI。 Refetch curation 判为 human_review，原因：原来源仅为推文链接，缺乏实质内容。微软官方播客页面直接关联Mira Murati与OpenAI的CTO职位，权威且可访问，能有... |
| Oriol Vinyals | I spent many (unsuccessful) hours trying this just 6 months ago. Feeling the AGY. | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：内容来自官方账号，提及AGI相关尝试，但表述模糊，信息密度低，需人工判断。 Refetch curation 判为 human_review，原因：候选来源均未直接提及“尝试此方法”或“AGY”等具体表述，无法替换或补强原始推文。原始推文来自官方账号，但表述模糊，信息... |
| 埃里克·霍维茨 | The 2026 Microsoft Research Fellowship program is now open for submissions. Calling for passionate collaborators on pressing technical & sociotechnical challenges @MSFTResearch | delete_raw_pool_item | yes | 删除。 该行原始 QA verdict 为 review，未进入自动删除。 原始复核原因：宣布微软研究奖学金项目，虽与AI相关但内容较官方和泛泛，信息密度低，需人工判断。 Refetch curation 判为 human_review，原因：候选来源均为奖学金项目的官方或转载页面，但均未提及埃里克·霍维茨本人。无法确认其在该项目中的具体角色（如发起人、负... |
