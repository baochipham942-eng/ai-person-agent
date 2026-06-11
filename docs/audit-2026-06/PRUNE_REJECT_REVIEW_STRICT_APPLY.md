# Prune Reject / Review Strict Apply

Generated at: 2026-06-10T08:48:42.883Z
Mode: execute
Input: docs/audit-2026-06/data/prune_reject_review_buckets.json
Archive: docs/audit-2026-06/data/prune_reject_review_strict_archive.json

## Counts

| Metric | Value |
| --- | ---: |
| strict candidates | 266 |
| existing targets | 266 |
| missing targets | 0 |
| RawPoolItem rows deleted | 266 |

## Buckets

| Bucket | Count |
| --- | ---: |
| empty_or_unusable_capture | 126 |
| author_or_direct_evidence_missing | 114 |
| wrong_person_or_same_name | 25 |
| non_ai_domain_mismatch | 1 |

## Top People

| Person | Count |
| --- | ---: |
| 亚历克·拉德福德 | 14 |
| Oriol Vinyals | 12 |
| Percy Liang | 11 |
| Greg Brockman | 10 |
| Guillaume Lample | 10 |
| Mira Murati | 10 |
| Dylan Field | 9 |
| Aakash Gupta | 8 |
| Alexandr Wang | 8 |
| Mustafa Suleyman | 8 |
| Wojciech Zaremba | 7 |
| 阿希什·瓦斯瓦尼 | 7 |
| Dario Amodei | 6 |
| Demis Hassabis | 6 |
| Elon Musk | 6 |
| Geoffrey Hinton | 6 |
| John Schulman | 6 |
| 埃里克·霍维茨 | 6 |
| 李开复 | 6 |
| Andrej Karpathy | 5 |
| Chris Olah | 5 |
| Noam Shazeer | 5 |
| 乔尔·皮诺 | 5 |
| 李莲 | 5 |
| 杰夫·迪恩 | 5 |

## Samples

| Person | Bucket | Source | Title | Reason | Exists |
| --- | --- | --- | --- | --- | --- |
| Aakash Gupta | wrong_person_or_same_name | youtube | School \| Aakash Gupta \| Stand-up Comedy | 同名者，内容为关于校园生活的脱口秀表演。 | yes |
| Aakash Gupta | wrong_person_or_same_name | youtube | Aakash Gupta \| Angry Young Man \| Full Stand-up Comedy Special | 同名者，内容为脱口秀专场视频。 | yes |
| Aakash Gupta | wrong_person_or_same_name | youtube | Summer is coming \| Aakash Gupta \| Stand-up Comedy | 同名者，内容为脱口秀表演，非目标产品增长专家。 | yes |
| Aakash Gupta | wrong_person_or_same_name | youtube | My Corporate Job \| Aakash Gupta \| Stand-up comedy | 该内容属于同名印度脱口秀演员，而非从事 Product Growth 的目标人物，且内容为纯娱乐脱口秀。 | yes |
| Aakash Gupta | wrong_person_or_same_name | github | Acash512/Aris | 同名开发者，内容为针对特定学校的新闻应用。 | yes |
| Aakash Gupta | wrong_person_or_same_name | github | Acash512/TicTacToe_DesktopApp | 同名开发者，内容为基础的Java练习项目。 | yes |
| Aakash Gupta | wrong_person_or_same_name | github | Acash512/COVID-19_Tracker_India | 同名开发者，内容为普通的疫情追踪应用，与目标人物无关。 | yes |
| Aakash Gupta | wrong_person_or_same_name | github | Acash512/GoogleLensClone | 同名开发者，虽涉及机器学习技术但并非目标人物。 | yes |
| Aidan Gomez | empty_or_unusable_capture | exa | Aidan Gomez | 内容为加载失败的Google Scholar页面片段，无有效信息，无法判断是否关于Aidan Gomez本人。 | yes |
| Aidan Gomez | empty_or_unusable_capture | exa | Inside the Paper That Changed AI Forever - Cohere CEO ... | 内容仅显示标题和空数据，无有效信息，无法判断是否关于Aidan Gomez。 | yes |
| Aidan Gomez | wrong_person_or_same_name | exa | Aidan Gomez – Medium | 内容涉及区块链和云技术且风格不符，推测为同名者的文章。 | yes |
| Alexandr Wang | wrong_person_or_same_name | github | alexandr/layer-identity-token-nodejs | GitHub仓库名为alexandr，但内容为通用Node.js代码，与目标人物无关。 | yes |
| Alexandr Wang | wrong_person_or_same_name | github | alexandr/simpletextserver | GitHub仓库名为alexandr，但内容为简单Flask服务器，与目标人物无关。 | yes |
| Alexandr Wang | wrong_person_or_same_name | github | alexandr/6882demos | GitHub仓库名为alexandr，但内容为MIT课程演示，与目标人物无关。 | yes |
| Alexandr Wang | wrong_person_or_same_name | x | This is just a preview of where Meta AI is headed — can’t wait to see how peopl... | 内容讨论 Meta AI 的发展方向，非目标人物的相关信息。 | yes |
| Alexandr Wang | wrong_person_or_same_name | x | //aidemos.meta.com/segment-anything | 仅为 Meta AI 项目的外部链接，与目标人物无关。 | yes |
| Alexandr Wang | wrong_person_or_same_name | x | 1/ Today we’re proud to announce a partnership with @midjourney, to license the... | 内容提及“美学”与“美丽”，极大概率为同名时尚设计师Alexander Wang，而非Scale AI创始人。 | yes |
| Alexandr Wang | empty_or_unusable_capture | exa | 5 things to know about tech mogul Alexandr Wang, world’s youngest self-made bil... | 抓取内容主要为网页导航和菜单，缺乏关于人物的实质性描述。 | yes |
| Alexandr Wang | empty_or_unusable_capture | exa | Who is Alexandr Wang, AI pioneer, world's youngest self-made billionaire? | 内容几乎全是网页UI元素和登录链接，无有效信息密度。 | yes |
| Andrej Karpathy | empty_or_unusable_capture | x | //x.com/karpathy/status/1887211193099825254 | 内容仅为链接，无法判断其技术价值。 | yes |
| Andrej Karpathy | empty_or_unusable_capture | x | //x.com/karpathy/status/1935518272667217925 | 内容仅为链接，无有效信息密度。 | yes |
| Andrej Karpathy | empty_or_unusable_capture | exa | karpathy’s gists | 仅为 GitHub Gists 的列表入口或登录页面，无具体代码或技术描述。 | yes |
| Andrej Karpathy | empty_or_unusable_capture | exa | Andrej Karpathy - Home | 仅包含网站Cookie政策说明，无人物相关信息。 | yes |
| Andrej Karpathy | empty_or_unusable_capture | exa | Andrej Karpathy | 仅包含YouTube网页页脚导航信息，无实质内容。 | yes |
| Arthur Mensch | non_ai_domain_mismatch | github | covidom_analysis | 这是他的GitHub仓库，关于分析Covidom数据，与AI/机器学习相关性低且内容简略。 | yes |
| Arthur Mensch | empty_or_unusable_capture | x | AI needs to be connected to the physical world, proud to be supporting ! | 内容过于简短，仅为一句口号，没有具体信息，且无法确认是否关于Arthur Mensch本人。 | yes |
| Arthur Mensch | empty_or_unusable_capture | exa | Jensen Huang & Arthur Mensch: Why Every Nation Needs Its ... | 内容仅为YouTube登录页面，无有效信息，无法判断质量。 | yes |
| Chamath Palihapitiya | author_or_direct_evidence_missing | x | Google DeepMind introduced AlphaEvolve, an AI coding agent that uses language m... | 内容仅介绍Google DeepMind的AlphaEvolve，未提及Chamath本人。 | yes |
| Chamath Palihapitiya | author_or_direct_evidence_missing | x | What I read this week... 1) Meta will cut roughly 600 roles across its AI divis... | 内容为Meta AI部门新闻，未提及Chamath本人。 | yes |
| Chamath Palihapitiya | author_or_direct_evidence_missing | x | What I read this week... 1) @Google announced Gemini 3 on November 18, 2025, ca... | 内容关于Google Gemini 3，未提及Chamath本人。 | yes |
| Chris Olah | wrong_person_or_same_name | github | ByronTrialNotes | 关于法律诉讼的个人笔记，与 AI 职业背景完全无关。 | yes |
| Chris Olah | empty_or_unusable_capture | x | Honestly, these are quite touching. | 内容过于简短且缺乏上下文，无法判断与 AI 的相关性。 | yes |
| Chris Olah | empty_or_unusable_capture | exa | Christopher Olah | 内容为Google Scholar加载失败页面，无实际信息，不相关且低质。 | yes |
| Chris Olah | empty_or_unusable_capture | x | //x.com/ch402/status/1922372355197669612 | 仅提供X链接，无实质内容，无法判断相关性 | yes |
| Chris Olah | empty_or_unusable_capture | x | //x.com/ch402/status/1948903300457529387 | 仅提供X链接，无实质内容，无法判断相关性 | yes |
| Christopher Manning | wrong_person_or_same_name | github | manning/17-Image-Processing | 仅为同名账号下的基础课程代码库，无法确认是本人且信息价值极低。 | yes |
| Christopher Manning | author_or_direct_evidence_missing | exa | Christopher D Manning | 页面内容加载失败，未包含实质性的学术引用数据或有效信息。 | yes |
| Christopher Manning | author_or_direct_evidence_missing | exa | Industrial applications of large language models | 内容仅为学术期刊的导航和标题信息，未提及目标人物。 | yes |
| Daniela Amodei | empty_or_unusable_capture | exa | Daniela Amodei: Co-founder of Anthropic, AI Safety Pioneer | 内容仅为LinkedIn的Cookie同意页面，无实际人物或AI相关内容。 | yes |
| Dario Amodei | author_or_direct_evidence_missing | exa | Papers with Code - Dario Amodei | 页面标题虽有其名，但正文内容为通用的论文趋势列表，与本人无直接关联。 | yes |
| Dario Amodei | empty_or_unusable_capture | exa | Dario Amodei. The Urgency of Interpretability. April 2025 | 内容仅为网页导航链接和资源列表，缺乏关于人物的实质性描述。 | yes |
| Dario Amodei | empty_or_unusable_capture | exa | The Making Of Anthropic CEO Dario Amodei | 抓取内容仅为Medium网页导航和登录提示，缺乏核心文章内容。 | yes |
| Dario Amodei | empty_or_unusable_capture | exa | Dario Amodei | 页面加载失败，内容仅为 Google Scholar 的模板占位符，无实质信息。 | yes |
| Dario Amodei | author_or_direct_evidence_missing | exa | AI jobs danger: Sleepwalking into a white-collar bloodbath | 内容讨论 AI 对就业的影响，完全未提及目标人物 Dario Amodei。 | yes |
| Dario Amodei | author_or_direct_evidence_missing | exa | Dario Amodei on why he left OpenAI \| Lex Fridman Podcast Clips | 抓取内容仅为 YouTube 的页脚法律条款和导航，未包含访谈实质内容。 | yes |
| Demis Hassabis | empty_or_unusable_capture | exa | Demis Hassabis \| Stanford HAI | 虽然标题包含姓名，但正文内容仅为网页导航和订阅信息的抓取，无实质信息。 | yes |
| Demis Hassabis | author_or_direct_evidence_missing | exa | Strengthening our partnership with the UK government to support prosperity and ... | 内容仅为 Google DeepMind 机构层面的合作公告，未提及 Demis Hassabis 本人。 | yes |
| Demis Hassabis | empty_or_unusable_capture | exa | Google DeepMind won a Nobel prize for AI: can it produce the next big breakthro... | 内容主要为网页导航和元数据，缺乏关于 Hassabis 本人的实质性信息。 | yes |
| Demis Hassabis | empty_or_unusable_capture | exa | DeepMind unveils ‘spectacular’ general-purpose science AI | 内容侧重于DeepMind的科研成果发布，而非针对哈萨比斯本人的报道或访谈。 | yes |
| Demis Hassabis | empty_or_unusable_capture | exa | Demis Hassabis | 页面加载失败，未获取到实质性的学术引用或个人信息。 | yes |
| Demis Hassabis | empty_or_unusable_capture | exa | Chemistry Nobel goes to developers of AlphaFold AI that predicts protein struct... | 抓取内容多为浏览器兼容性提示，且侧重于科学奖项而非人物刻画。 | yes |
| Dylan Field | empty_or_unusable_capture | exa | Dylan Field | 仅为网页导航和分类链接，没有任何关于人物的实质性内容。 | yes |
| Dylan Field | empty_or_unusable_capture | exa | Lessons from Figma CEO Dylan Field \| by Zhang Liwei | 抓取内容仅为网页导航和元数据，缺乏实质性的正文信息。 | yes |
| Dylan Field | author_or_direct_evidence_missing | exa | Figma CEO Dylan Field: “I like the investors, but what ... | 内容主要由网站菜单和标签组成，未包含有效的访谈或观点细节。 | yes |
| Dylan Field | empty_or_unusable_capture | exa | Why Figma CEO Dylan Field is optimistic about AI and the future of design | 抓取内容仅包含网页导航和社交链接，无实质性正文内容。 | yes |
| Dylan Field | empty_or_unusable_capture | exa | Dylan Field, Figma’s nice guy becomes tech’s new billionaire | 抓取内容主要为网页导航和订阅提示，缺乏实质性正文信息。 | yes |
| Dylan Field | empty_or_unusable_capture | exa | Dylan Field \| TechCrunch | 内容仅为科技媒体的页面标签和导航菜单，无有效信息密度。 | yes |
| Dylan Field | author_or_direct_evidence_missing | x | Yes. I’m hoping we can identify great people to run against him in upcoming pri... | 纯政治选举讨论，与科技或AI行业无直接关联。 | yes |
| Dylan Field | empty_or_unusable_capture | exa | dfield - Overview | 仅为 GitHub 个人主页的元数据和导航信息，无实质内容。 | yes |
| Dylan Field | empty_or_unusable_capture | exa | Dylan Field \| LinkedIn | 仅为 LinkedIn 的 Cookie 隐私提示页面，无任何个人价值信息。 | yes |

## Safety

- Only `strictDeleteCandidates` from the read-only bucket analysis are targeted.
- This deletes RawPoolItem rows only. QAAuditLog, People, Card, products, roles, and relations are not deleted.
- Review rows and non-strict reject buckets are deferred.
