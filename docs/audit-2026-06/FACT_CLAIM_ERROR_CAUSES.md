# Fact Claim Error Causes

Generated at: 2026-06-09T13:07:12.923Z

Reviewed claims: 5044
Problem claims: 2340

## Root Causes

| Root cause | Matched | Top claim types | Top verdicts | Prevention rule |
| --- | --- | --- | --- | --- |
| 缺少来源但直接展示 | 976 | official_link:194, topic_contribution:169, current_title:161, career_role:152 | needs_source:976 | LLM 生成的事实必须携带 evidenceUrl/sourceText/sourceType。没有来源的 currentTitle、role、officialLink、course、whyImportant 只能进待审队列，不能进入 ready 展示。 |
| 历史经历被显示成当前状态 | 653 | career_role:351, current_title:167, source_item_belongs_to_person:40, topic_contribution:28 | needs_source:316, stale:312, over_attributed:13, wrong_person:10 | PersonRole.endDate 为空不能自动等于 now；教育、早期雇主、旧职位、过往创业都要有 current-source 才能当前展示。currentTitle 只允许来自近期官方/本人/权威来源。 |
| 公司/团队成果过度归因到个人 | 608 | representative_achievement:236, topic_contribution:207, learning_card:108, why_important:57 | over_attributed:608 | 代表成果、学习卡片、whyImportant、topicDetails 必须写清 personProductRole：founder/CEO/lead/author/contributor/observer。没有角色证据时只能写组织级，不写个人“打造/推出/核心贡献”。 |
| 同名人物/账号混淆 | 330 | source_item_belongs_to_person:197, official_link:91, career_role:18, topic_contribution:9 | wrong_person:271, needs_source:57, over_attributed:2 | 同名人物必须使用 name + org/topic/country/source 三要素匹配；短中文名、常见英文名、官方链接、履历来源都要先进入 needs_review，不能直接提升为展示内容。 |
| 官方链接身份弱校验 | 255 | official_link:255 | needs_source:194, wrong_person:35, over_attributed:16, unsupported:6 | officialLinks 需要 profile name、handle、bio、cross-link 任一强证据；GitHub/YouTube/X 的同名账号不能只靠 URL 或 handle 推断。 |
| 外部内容挂错人 | 214 | source_item_belongs_to_person:214 | wrong_person:196, unsupported:18 | RawPoolItem 入库前必须做实体归属门禁：论文核作者，GitHub 核 owner，视频/播客核本人或明确访谈对象，中文短名和常见英文名必须加机构/领域 disambiguation。 |
| 单个版本/API/SDK/商业入口粒度过细 | 204 | representative_achievement:131, topic_contribution:37, learning_card:19, source_item_belongs_to_person:10 | over_attributed:204 | 单个模型版本、API、SDK、商店、营销入口默认折叠到上层产品族；除非来源证明此人就是该入口 owner，否则不要放到个人代表成果。 |
| 履历字段被塞进学位/产品/泛职业标签 | 35 | career_role:35 | stale:22, over_attributed:9, needs_source:3, wrong_person:1 | PersonRole.role 只存职位或履历事件；学位进入 education，产品进入 products，宽泛职业进入 occupation，不能用 role 承载“Gemini”“计算机科学硕士”“AI/tech professional”这类混合字段。 |

## Samples

| Root cause | Person | Type | Object | Verdict | Action | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| 缺少来源但直接展示 | Aidan Gomez | career_role | Research Group Lead @ For.ai | needs_source | needs_source | Aidan Gomez 在 For.ai 担任 Research Group Lead 的履历缺乏足够来源支持，且其当前主要身份为 Cohere CEO，此条信息需要核实。 |
| 缺少来源但直接展示 | Alexander Amini | career_role | AI/tech professional @ Efficient AI | needs_source | needs_source | Alexander Amini 当前主要身份是 Liquid AI 的联合创始人兼首席科学家，此条在 Efficient AI 的履历缺乏足够来源支持，且职位描述模糊。 |
| 缺少来源但直接展示 | Bob McGrew | career_role | Engineer @ PayPal | needs_source | needs_source | 来源仅为LLM提取，缺乏可靠证据支持其当前在PayPal担任工程师。人物上下文显示其当前头衔为Engineer @ PayPal，但无具体时间或来源佐证。 |
| 缺少来源但直接展示 | Arvind Krishna | career_role | Director @ Federal Reserve Bank of New York | needs_source | needs_source | Arvind Krishna 担任纽约联邦储备银行董事的履历需要更权威的来源（如官方公告或权威媒体报道）来确认其当前状态和起始时间。 |
| 历史经历被显示成当前状态 | Aidan Gomez | career_role | 研究科学家 @ Cohere | stale | rewrite | Aidan Gomez 当前职位是 CEO & Co-founder，但此条履历显示其仍为研究科学家，且结束时间为 now，与当前状态不符，信息可能过时。 |
| 历史经历被显示成当前状态 | Aidan Gomez | career_role | Undergraduate Student @ 多伦多大学 | stale | rewrite | Aidan Gomez 已从多伦多大学毕业并创业，此条履历显示其仍为本科生且结束时间为 now，与当前状态不符，信息过时。 |
| 历史经历被显示成当前状态 | Aidan Gomez | career_role | Research Group Lead @ For.ai | needs_source | needs_source | Aidan Gomez 在 For.ai 担任 Research Group Lead 的履历缺乏足够来源支持，且其当前主要身份为 Cohere CEO，此条信息需要核实。 |
| 历史经历被显示成当前状态 | Alexander Amini | career_role | AI/tech professional @ Efficient AI | needs_source | needs_source | Alexander Amini 当前主要身份是 Liquid AI 的联合创始人兼首席科学家，此条在 Efficient AI 的履历缺乏足够来源支持，且职位描述模糊。 |
| 公司/团队成果过度归因到个人 | Aidan Gomez | learning_card | 推出针对企业应用的Command系列模型 | over_attributed | rewrite | Command系列模型是Cohere公司的产品，将具体模型版本（如Command R+、Command A）的推出归因于个人领导，属于将公司级产品过度归因给个人。 |
| 公司/团队成果过度归因到个人 | Alexandr Wang | learning_card | 激光般聚焦于数据质量与精度 | over_attributed | rewrite | 内容描述的是Scale AI公司的方法论和核心竞争力，而非Alexandr Wang个人的具体贡献或观点。将公司级战略归因于个人，属于过度归因。 |
| 公司/团队成果过度归因到个人 | Arthur Mensch | learning_card | 混合开源策略：在开放与商业间寻找平衡 | over_attributed | rewrite | claim描述的是Mistral AI公司的混合开源策略，而非Arthur Mensch个人的方法论。将公司策略归因给个人属于过度归因。 |
| 公司/团队成果过度归因到个人 | Arthur Mensch | learning_card | Mistral AI的快速崛起与核心成就 | over_attributed | rewrite | 卡片将公司（Mistral AI）的成就（发布模型、合作项目）归因于个人领导，但未明确说明其个人具体贡献角色，存在过度归因风险。 |
| 同名人物/账号混淆 | Rachel Thomas | career_role | 首席执行官 @ Canberra Symphony Orchestra | wrong_person | remove | 该职位（交响乐团CEO）与Rachel Thomas（AI教育者、fast.ai联合创始人）的公开背景严重不符，极可能是同名他人。 |
| 同名人物/账号混淆 | Rachel Thomas | career_role | 城市记录员 @ City of Newberg | wrong_person | remove | 该职位（城市记录员）与Rachel Thomas（AI教育者、fast.ai联合创始人）的公开背景严重不符，极可能是同名他人。 |
| 同名人物/账号混淆 | 丹·克莱因 | career_role | Member @ Mt. Lebanon High School | wrong_person | remove | 丹·克莱因（Dan Klein）是知名计算机科学家，与 Mt. Lebanon High School（一所高中）的关联极不可能，更可能属于同名的其他人。 |
| 同名人物/账号混淆 | 伊恩·J·古德费洛 | career_role | Member @ San Dieguito High School Academy | wrong_person | remove | 履历显示伊恩·J·古德费洛为San Dieguito高中学院成员，这与他作为谷歌DeepMind研究主任和AI研究员的身份严重不符，极可能是同名或数据错误。 |
| 官方链接身份弱校验 | Amanda Askell | official_link | website | needs_source | needs_source | 链接指向一篇关于AI意识的文章，但无法仅凭URL确认这是该人物的官方主页或主要个人网站。 |
| 官方链接身份弱校验 | Aravind Srinivas | official_link | website | over_attributed | rewrite | 链接指向Perplexity公司官网，而非Aravind Srinivas的个人官方主页。这是公司业务入口，不应作为个人官方链接。 |
| 官方链接身份弱校验 | Aakash Gupta | official_link | twitter | needs_source | needs_source | 链接指向X平台账号，但缺乏足够证据证明该账号是Aakash Gupta本人的官方账号，而非同名或粉丝账号。 |
| 官方链接身份弱校验 | Aakash Gupta | official_link | website | needs_source | needs_source | 链接指向一个子域名下的文章页面，缺乏足够证据证明这是Aakash Gupta的官方个人网站或主页。 |
| 外部内容挂错人 | Aidan Gomez | source_item_belongs_to_person | Damien Nicks: Getting your work-life balance right, starting a business and why the next 10 years are crucial | wrong_person | remove | 播客标题和摘要均指向 'Damien Nicks'，与人物 'Aidan Gomez' 无关，属于人名错配。 |
| 外部内容挂错人 | Aakash Gupta | source_item_belongs_to_person | Main Aur Mumbai \| Aakash Gupta \| Stand-up Comedy | wrong_person | remove | 该YouTube视频是关于一位名为Aakash Gupta的脱口秀演员，内容是孟买生活喜剧，与人物库中作为Apollo.io产品副总裁的Aakash Gupta（产品增长、大语言模型领域）无关。属于同名错配。 |
| 外部内容挂错人 | Andrej Karpathy | source_item_belongs_to_person | ImageNet Large Scale Visual Recognition Challenge | wrong_person | remove | 论文作者列表中未包含 Andrej Karpathy，该成果属于其他研究者，不应归因于他。 |
| 外部内容挂错人 | Arthur Mensch | source_item_belongs_to_person | Machine Learning Apr 2025 | unsupported | remove | 内容为arXiv论文列表页面，作者列表中未包含Arthur Mensch，无法证明其相关性。 |
| 单个版本/API/SDK/商业入口粒度过细 | 罗福莉 | career_role | Senior AI Leader / Chief Architect for MIMO-v2-Flash (inferred from reports) @ Xiaomi (Large Model / AI Team) | over_attributed | rewrite | 职位描述‘Chief Architect for MIMO-v2-Flash’将具体产品型号归因于个人，属于过度归因。 |
| 单个版本/API/SDK/商业入口粒度过细 | Aidan Gomez | learning_card | 推出针对企业应用的Command系列模型 | over_attributed | rewrite | Command系列模型是Cohere公司的产品，将具体模型版本（如Command R+、Command A）的推出归因于个人领导，属于将公司级产品过度归因给个人。 |
| 单个版本/API/SDK/商业入口粒度过细 | Arthur Mensch | learning_card | 混合开源策略：在开放与商业间寻找平衡 | over_attributed | rewrite | claim描述的是Mistral AI公司的混合开源策略，而非Arthur Mensch个人的方法论。将公司策略归因给个人属于过度归因。 |
| 单个版本/API/SDK/商业入口粒度过细 | Brett Adcock | learning_card | Figure AI: Brett Adcock 的代表成果线索 | over_attributed | rewrite | 将公司Figure AI整体作为个人“代表成果线索”过于笼统，未明确其创始人/CEO的具体贡献角色。 |
| 履历字段被塞进学位/产品/泛职业标签 | Aidan Gomez | career_role | Undergraduate Student @ 多伦多大学 | stale | rewrite | Aidan Gomez 已从多伦多大学毕业并创业，此条履历显示其仍为本科生且结束时间为 now，与当前状态不符，信息过时。 |
| 履历字段被塞进学位/产品/泛职业标签 | Alexander Amini | career_role | AI/tech professional @ Efficient AI | needs_source | needs_source | Alexander Amini 当前主要身份是 Liquid AI 的联合创始人兼首席科学家，此条在 Efficient AI 的履历缺乏足够来源支持，且职位描述模糊。 |
| 履历字段被塞进学位/产品/泛职业标签 | Christopher Manning | career_role | Student @ 斯坦福大学 | stale | rewrite | Christopher Manning 当前是斯坦福大学教授，其学生身份已过时，应标记为历史角色。 |
| 履历字段被塞进学位/产品/泛职业标签 | Dylan Field | career_role | President/CEO/Co-Founder @ Figma Inc | over_attributed | rewrite | 职位描述“President/CEO/Co-Founder”过于冗长且不精确，将多个头衔合并为一个条目，可能造成混淆。 |

## Prevention Checklist

- 外部内容挂错人: RawPoolItem 入库前必须做实体归属门禁：论文核作者，GitHub 核 owner，视频/播客核本人或明确访谈对象，中文短名和常见英文名必须加机构/领域 disambiguation。
- 同名人物/账号混淆: 同名人物必须使用 name + org/topic/country/source 三要素匹配；短中文名、常见英文名、官方链接、履历来源都要先进入 needs_review，不能直接提升为展示内容。
- 历史经历被显示成当前状态: PersonRole.endDate 为空不能自动等于 now；教育、早期雇主、旧职位、过往创业都要有 current-source 才能当前展示。currentTitle 只允许来自近期官方/本人/权威来源。
- 公司/团队成果过度归因到个人: 代表成果、学习卡片、whyImportant、topicDetails 必须写清 personProductRole：founder/CEO/lead/author/contributor/observer。没有角色证据时只能写组织级，不写个人“打造/推出/核心贡献”。
- 单个版本/API/SDK/商业入口粒度过细: 单个模型版本、API、SDK、商店、营销入口默认折叠到上层产品族；除非来源证明此人就是该入口 owner，否则不要放到个人代表成果。
- 缺少来源但直接展示: LLM 生成的事实必须携带 evidenceUrl/sourceText/sourceType。没有来源的 currentTitle、role、officialLink、course、whyImportant 只能进待审队列，不能进入 ready 展示。
- 官方链接身份弱校验: officialLinks 需要 profile name、handle、bio、cross-link 任一强证据；GitHub/YouTube/X 的同名账号不能只靠 URL 或 handle 推断。
- 履历字段被塞进学位/产品/泛职业标签: PersonRole.role 只存职位或履历事件；学位进入 education，产品进入 products，宽泛职业进入 occupation，不能用 role 承载“Gemini”“计算机科学硕士”“AI/tech professional”这类混合字段。
