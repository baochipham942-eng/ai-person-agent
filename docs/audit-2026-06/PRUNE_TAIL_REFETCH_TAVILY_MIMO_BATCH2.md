# Refetch Source by Search + MiMo

Generated at: 2026-06-10T13:45:27.115Z
Remediation input: docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch2.jsonl
Search provider: tavily
Model: mimo-v2.5-pro

## Counts

| Metric | Value |
| --- | --- |
| selected tasks | 20 |
| existing rows reused | 0 |
| pending tasks | 0 |
| refetch results | 20 |
| source candidates | 190 |
| selected sources | 25 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 12 |
| augment_source | 5 |
| human_review | 2 |
| no_good_source | 1 |

## Selected Hosts

| Host | Count |
| --- | --- |
| tsinghua.edu.cn | 4 |
| fortune.com | 2 |
| forbes.com | 2 |
| microsoft.com | 2 |
| singjupost.com | 2 |
| lexfridman.com | 2 |
| technologyreview.com | 2 |
| blog.southparkcommons.com | 1 |
| distributed.blog | 1 |
| nlp.stanford.edu | 1 |
| aclanthology.org | 1 |
| ai.meta.com | 1 |
| research.google | 1 |
| blog.google | 1 |
| meta.com | 1 |
| linkedin.com | 1 |

## Sample Results

| Person | Target | Decision | Sources | Reason |
| --- | --- | --- | --- | --- |
| Dylan Field | Figma’s CEO went from college dropout to 33-year-old billionaire #Figma #billionaire | replace_source | Figma’s CEO is now worth $5 billion after IPO—like Mark Zuckerberg, Larry Ellison, and Bill Gates, he’s another college-dropout billionaire \| Fortune (fortune.com)<br>Dylan Field - Forbes (forbes.com) | 候选来源中，Fortune和Forbes的页面提供了最直接、权威的证据，支持Dylan Field作为Figma CEO从大学辍学到亿万富翁的叙事。Fortune文章明确讨论了其辍学经历和财富，Forbes资料页确认了其身份和公司背景。其... |
| Dylan Field | How They Made a Billion Dollars - Dylan Field, Figma | replace_source | Dylan Field - Forbes (forbes.com) | 原始来源为YouTube视频，信息密度低且侧重商业成功学。福布斯资料页是权威、可访问的官方人物资料，直接证明Dylan Field与Figma的创始人兼CEO关系，适合作为替换来源。 |
| Dylan Field | Unlocking Global Talent Embracing Remote Work for Success - Dylan Field | augment_source | Accessible Design for a Remote World: In Conversation w/Dylan ... (blog.southparkcommons.com)<br>Episode 29: Dylan Field, Figma Co-founder, Talks Design, Digital Economy, and Remote Culture with Host Connie Yang – Distributed.blog (distributed.blog) | 原始声明主题为远程工作和全球人才，但原始来源（YouTube视频）缺乏可访问的转录或明确证据。候选来源中，South Park Commons文章和Distributed播客转录直接包含Dylan Field关于远程工作和设计的对话，可补... |
| Elon Musk | 埃隆·马斯克：世界上最危险的病人——朕即国家｜Elon Musk｜川普｜特朗普｜Donald John Trump｜马斯克采访｜马斯克新冠病毒｜马斯克为什么支持特朗普｜马斯克自传... | human_review |  | 候选来源多为通用传记、冲突报道或无关采访转录，均未直接证明原始声明中“世界上最危险的病人——朕即国家”等主观评价或政治立场内容。缺乏权威来源（如官方主页、可靠媒体采访转录）直接支持该声明，需进一步人工审核以确认是否存在相关证据。 |
| Mira Murati | Mira Murati on why she works at OpenAi | augment_source | Behind the Tech Podcast with Kevin Scott - Microsoft (microsoft.com)<br>Who is Mira Murati? The OpenAI executive who played a crucial role in the company’s soaring ascent \| Fortune (fortune.com) | 原始来源为YouTube短视频，信息价值有限。候选中的微软官方播客页面和Fortune专访均能权威证明Mira Murati在OpenAI的职位及工作动机，可补强或替换原始来源。Wikipedia等仅作辅助线索。 |
| Richard Socher | Deep Learning for NLP (without Magic) - Part 11 | replace_source | [PDF] Deep Learning for NLP (without Magic) (nlp.stanford.edu)<br>Deep Learning for NLP (without Magic) - ACL Anthology (aclanthology.org) | 原始来源为YouTube视频，内容空洞。候选中有两个权威PDF来源直接证明Richard Socher是“Deep Learning for NLP (without Magic)”教程的作者，且来自斯坦福大学和ACL Anthology... |
| Sam Altman | OpenAI恐怖的終局預判｜山姆奧特曼和ChatGPT的故事 | augment_source | Transcript: Sam Altman on AGI, GPT-5, And What’s Next -- the OpenAI Podcast Ep. 1 – The Singju Post (singjupost.com)<br>Transcript for Sam Altman: OpenAI, GPT-5, Sora, Board Saga, Elon Musk, Ilya, Power & AGI \| Lex Fridman Podcast #419 - Lex Fridman (lexfridman.com) | 原始来源为YouTube视频，标题有营销倾向，内容可能为泛泛的商业分析。候选来源中，OpenAI官方播客和Lex Fridman播客的文字转录是权威、可访问且直接包含Sam Altman本人访谈的来源，能有效补强或替换原始来源，证明其观点... |
| Yann LeCun | Yann's 60th Birthday video from his padawans. | replace_source | Yann LeCun - AI at Meta (ai.meta.com) | 原始来源（庆生视频）缺乏AI技术实质内容，且为私人社交性质。Meta官方页面能权威证明Yann LeCun的职位和所属机构，适合作为人物页面的补充或替换来源，以强化其专业身份。 |
| 唐杰 | 中國首個人工智能學生「華智冰」 將入讀清華大學-TVB News-20210604 | replace_source | 清华大学迎来国内首个原创虚拟学生“华智冰”-清华大学 (tsinghua.edu.cn) | 清华大学官网新闻稿是关于“华智冰”项目的最权威来源，明确指出唐杰教授是该项目的导师，直接证明了人物与作品/观点/职位的关系，符合替换要求。其他候选源要么权威性较低，要么涉及同名不同人。 |
| 唐杰 | 小冰团队再次声明：清华虚拟学生华智冰演唱视频并非仅AI换脸 | replace_source | 清华大学迎来国内首个原创虚拟学生“华智冰” (tsinghua.edu.cn) | 清华大学官网新闻直接、权威地证明了唐杰教授是虚拟学生华智冰的导师，完美匹配证据要求，可替换原YouTube来源。其他候选来源虽提及唐杰，但权威性或直接性稍逊。 |
| 唐杰 | 清华首个AI学生华智冰首次露正脸唱歌 面容姣好 声音甜美 | replace_source | 中国首个原创“虚拟学生”入读清华大学 (tsinghua.edu.cn)<br>清华大学迎来国内首个原创虚拟学生“华智冰” (tsinghua.edu.cn) | 原YouTube来源未直接提及唐杰。候选来源中，清华大学官网的两篇新闻稿是权威的一手信息，明确将唐杰教授与华智冰项目关联，直接支持了该条目。其他来源权威性较低或无法访问，故选择官网新闻作为替换来源。 |
| 埃里克·霍维茨 | Behind the Code with Eric Horvitz | replace_source | Behind the Code with Eric Horvitz - Microsoft Research (microsoft.com) | 候选来源中，微软研究院官方视频页面（microsoft.com）明确包含‘Behind the Code with Eric Horvitz’的标题、埃里克·霍维茨的姓名和职位，以及访谈背景描述，是原始YouTube链接的权威替代。其他来... |
| 杰夫·迪恩 | Jeffrey Dean: The Visionary Architect of AI&#39;s Future | replace_source | Jeffrey Dean (research.google) | 原始来源（YouTube视频）质量一般且非官方。谷歌官方研究页面直接、权威地证明了杰夫·迪恩作为谷歌首席科学家的身份，符合“AI未来架构师”的描述，是理想的替换来源。 |
| 桑达尔·皮查伊 | Sundar Pichai&#39;s Personal Journey to Google CEO✨✨ | augment_source | Transcript for Sundar Pichai: CEO of Google and Alphabet (lexfridman.com)<br>Transcript of Sundar Pichai's Interview on The All-In Podcast (singjupost.com) | 原始来源（YouTube视频）缺乏权威性且内容不明确。候选中，Lex Fridman和All-In Podcast的访谈转录页面权威性较高，能直接证明皮查伊的CEO身份和观点，可作为补强来源。其他候选因权威性不足或证据不直接而被拒绝。 |
| 科拉伊·卡武克丘奥卢 | Google&#39;ın Yapay Zekası Türklere Emanet! Koray Kavukçuoğlu&#39;nu tebrik ediyoruz. | replace_source | Koray Kavukcuoglu (blog.google) | 原始来源为社交媒体祝贺视频，信息密度低。候选中的谷歌官方博客作者页是权威、可访问的一手来源，直接证明了科拉伊·卡武克丘奥卢在谷歌的职位，完全符合证据要求，可作为替换来源。 |
| 迈克·施罗普费尔 | Hyperscaling Climate Innovation \| Mike Schroepfer | replace_source | From Meta CTO to climate tech investor: Mike Schroepfer on his big pivot \| MIT Technology Review (technologyreview.com) | 候选来源中，MIT Technology Review的专访是权威媒体，直接证明迈克·施罗普费尔从Meta CTO转型为气候科技投资者的身份，与‘Hyperscaling Climate Innovation’主题高度相关，可替换原You... |
| 迈克·施罗普费尔 | Mike Schroepfer, Leading Facebook &amp; Scaling Up Climate Tech | replace_source | Mike Schroepfer, Senior Fellow (meta.com) | Meta官方页面直接证明了迈克·施罗普费尔在Meta的职位（高级研究员）及其与AI投资和技术人才发展的关联，权威性高，可直接替换原始来源。其他候选来源要么证据不足，要么主要聚焦气候科技，与AI/科技行业关联较弱。 |
| 迈克·施罗普费尔 | Mike Schroepfer, Partner at Gigascale Capital, on sustainability in emerging tech | augment_source | From Meta CTO to climate tech investor: Mike Schroepfer on his big ... (technologyreview.com)<br>Mike Schroepfer, Partner at Gigascale Capital, on sustainability in emerging tech #podcast \| Mike Schroepfer (linkedin.com) | 原始来源为YouTube播客，缺乏转录或明确描述。候选中MIT Technology Review的采访权威性高，直接支持人物身份与观点。本人LinkedIn帖子可作为辅助。其他候选或缺乏人物姓名，或权威性不足，无法单独作为替换来源。 |
| Arthur Mensch | deep-fmri | human_review |  | Expected double-quoted property name in JSON at position 2045 (line 34 column 3) |
| Arthur Mensch | hcp_builder | no_good_source |  | 候选来源均未涉及 'hcp_builder' 项目，无法补强或替换原始来源。原始来源虽为 GitHub 仓库，但缺乏人物与项目关联的明确证据。需要更直接的来源，如项目文档、论文或官方个人资料中提及该项目。 |

## Execution Rule

- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.
- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.
- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.
