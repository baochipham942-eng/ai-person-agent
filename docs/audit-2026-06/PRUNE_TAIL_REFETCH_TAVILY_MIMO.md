# Refetch Source by Search + MiMo

Generated at: 2026-06-10T13:25:49.883Z
Remediation input: docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo.jsonl
Search provider: tavily
Model: mimo-v2.5-pro

## Counts

| Metric | Value |
| --- | --- |
| selected tasks | 20 |
| existing rows reused | 15 |
| pending tasks | 0 |
| refetch results | 20 |
| source candidates | 189 |
| selected sources | 28 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 13 |
| augment_source | 6 |
| human_review | 1 |

## Selected Hosts

| Host | Count |
| --- | --- |
| time.com | 3 |
| karpathy.ai | 2 |
| bloomberg.com | 2 |
| forbes.com | 2 |
| podcasts.musixmatch.com | 2 |
| cs.stanford.edu | 1 |
| figma.com | 1 |
| corpgov.law.harvard.edu | 1 |
| freshdialogues.com | 1 |
| jbd.dev | 1 |
| blogs.microsoft.com | 1 |
| noamshazeer.com | 1 |
| lerandom.art | 1 |
| artificial-intelligence.blog | 1 |
| x.com | 1 |
| finance.sina.com.cn | 1 |
| lilianweng.github.io | 1 |
| profiles.stanford.edu | 1 |
| singjupost.com | 1 |
| wired.com | 1 |
| apnews.com | 1 |
| en.wikipedia.org | 1 |

## Sample Results

| Person | Target | Decision | Sources | Reason |
| --- | --- | --- | --- | --- |
| Andrej Karpathy | About | replace_source | Andrej Karpathy (karpathy.ai) | 原来源karpathy.github.io/about过于简略，仅作为跳转链接。候选中的karpathy.ai是Andrej Karpathy的官方个人主页，内容直接展示其身份、兴趣和当前活动，是权威且可访问的替代来源，能有效补强人物信息。 |
| Andrej Karpathy | b'Andrej Karpathy' | replace_source | Andrej Karpathy (karpathy.ai)<br>Andrej Karpathy Academic Website - Stanford Computer Science (cs.stanford.edu)<br>Andrej Karpathy - TIME (time.com) | 原来源为第三方平台简介页，夹杂营销内容。候选中，karpathy.ai为本人官方主页，斯坦福页面为权威学术资料，TIME报道为可靠媒体专题，三者均直接证明人物身份与贡献，可替换原来源。 |
| Daniela Amodei | Daniela Amodei - Net Worth, Career Highlights & More \| BusinessWomen | replace_source | Bloomberg Billionaires Index - Daniela Amodei (bloomberg.com) | 原始来源（businesswomen.com）内容空洞且权威性低。彭博亿万富翁指数页面提供了权威的净资产、职位和公司背景信息，直接证明其身份与成就，可作为可靠替换。其他候选来源要么权威性不足，要么缺乏直接证据。 |
| Dylan Field | Dylan Field - Figma | replace_source | Dylan Field and Garry Tan on design, AI, and the power of “locking in” (figma.com) | 原来源Forbes简介未明确提及AI，需替换。Figma官方博客文章直接证明Dylan Field作为CEO讨论AI与设计，权威且相关。其他候选来源多为第三方平台或缺乏明确AI内容，不符合优先标准。 |
| Dylan Field | Dylan Field, Figma Inc: Profile and Biography | replace_source | Dylan Field - Forbes (forbes.com) | 原来源（Bloomberg）抓取内容信息密度低。候选中的福布斯资料页是权威的官方人物简介，直接、清晰地证明了Dylan Field与Figma的职位关系及关键背景，完全符合证据要求，可作为高质量替换来源。 |
| Elon Musk | Elon Musk - Tesla | augment_source | Elon Musk and the Control of Tesla (corpgov.law.harvard.edu)<br>Elon Musk: The Reluctant CEO of Tesla Motors (Interview Transcript) (freshdialogues.com) | 原始来源（Forbes）内容模糊，AI相关性弱。候选中哈佛大学法学院文章和马斯克本人访谈转录能直接、权威地证明其与特斯拉的控制权及CEO角色，适合作为补强来源。其他候选或权威性不足，或关联性不强。 |
| Jaana Dogan | About - jbd.dev | replace_source | About · jbd.dev (jbd.dev) | 原始来源（jbd.dev/about）是Jaana Dogan的个人网站官方关于页面，直接证明了她作为作者的身份和网站内容范围，符合权威、可访问、能直接证明人物与作品关系的要求。候选中的其他来源要么是社交媒体讨论，要么是第三方页面，权威性... |
| Mira Murati | Murati’s Thinking Machines Raises Cash at $10 Billion Valuation | replace_source | Murati’s Thinking Machines Raises Cash at $10 Billion Valuation - Bloomberg (bloomberg.com) | 原始来源（Bloomberg）的预览文本已包含足够证据，直接关联Mira Murati与公司融资事实，符合权威、可访问、直接证明的要求。其他候选来源要么权威性不足，要么证据不明确。 |
| Mustafa Suleyman | Microsoft's AI division head wants to create a lasting relationship between chatbots and ... | replace_source | Mustafa Suleyman, DeepMind and Inflection Co-founder, joins Microsoft to lead Copilot (blogs.microsoft.com) | 原始来源（SRN News）信息密度一般。候选中的微软官方博客是权威的一手来源，直接确认了Mustafa Suleyman在微软的职位（领导Copilot），完美满足证据要求，可作为替换来源。其他候选要么权威性不足，要么内容重复。 |
| Noam Shazeer | About – Noam Shazeer | replace_source | Noam Shazeer \| AI Scientist, Google Gemini Co-Lead (noamshazeer.com) | 候选来源中，noamshazeer.com 是本人官方主页，明确列出了其当前职位（Google Gemini Co-Lead & VP Engineering）和主要贡献（如Transformer发明），完全满足证据要求，可直接替换原Me... |
| Shane Legg | Taking a responsible path to AGI | augment_source | Shane Legg: The 100 Most Influential People in AI 2023 (time.com)<br>The Arrival of AGI with Shane Legg (co-founder of DeepMind) Transcript - Google DeepMind: The Podcast (podcasts.musixmatch.com) | 原来源（DeepMind官方博客）未突出Shane Legg个人贡献。候选中的TIME专题和官方播客转录能直接证明其职位、观点及与AGI路径的关联，可有效补强。其他候选或权威性不足，或非直接证据。 |
| 亚历克·拉德福德 | Alec Radford - OpenAI;Indico Data Solutions \| 人才画像 | human_review |  | 候选来源均未能直接、权威地证明亚历克·拉德福德与OpenAI或Indico Data Solutions的具体职位或贡献关系。Wikipedia和公司博客等二级来源证据不足，社交页面信息有限。需要更权威的官方资料、论文作者页或可靠媒体采访... |
| 亚历克·拉德福德 | Alec Radford: Latest Posts | augment_source | THE PEOPLE ARE IN THE COMPUTER—PART I (lerandom.art)<br>Alec Radford - People in AI - AI Blog (artificial-intelligence.blog)<br>Alec Radford (@AlecRad) / X (x.com) | 原始来源内容为空，需补充权威来源。候选中，lerandom.art文章和artificial-intelligence.blog页面提供了人物背景信息，X账号是官方社交媒体主页，三者可共同补强人物页面。其他候选因权威性不足、内容不可访问或... |
| 李莲 | 🚀 Lilian Weng (前OpenAI 應用研究VP) 深度解析LLM 「思考 ... | augment_source | Lilian Weng最新对话：首谈离开OpenAI创业，以及AI研究的现实扭曲场\|AI_新浪财经_新浪网 (finance.sina.com.cn)<br>LLM Powered Autonomous Agents \| Lil'Log (lilianweng.github.io) | 原始来源为Facebook帖子，信息不完整。候选中新浪财经的对话实录和Lilian Weng的个人博客可作为权威补充，分别证明其身份和研究贡献。其他候选要么无关，要么权威性不足。 |
| 李飞飞 | Dr Fei-Fei Li | replace_source | Fei-Fei Li - Stanford Profiles (profiles.stanford.edu) | 原始来源为个人博客，信息密度低。斯坦福大学官方资料页是权威、可访问的直接来源，能有效证明李飞飞的职位与学术身份，符合替换要求。 |
| 桑达尔·皮查伊 | Sundar Pichai, Alphabet Inc: Profile and Biography | augment_source | Sundar Pichai - Forbes (forbes.com)<br>A special interview with Google CEO Sundar Pichai Transcript (podcasts.musixmatch.com)<br>Transcript of Sundar Pichai's Interview on The All-In Podcast (singjupost.com) | 原彭博来源信息过薄。候选中福布斯资料页和两个权威播客访谈转录能直接、可靠地证明皮查伊的职位、背景及AI相关观点，可有效补强。其他来源因权威性、可访问性或证据明确性不足被拒。 |
| 黄仁勋 | The Architects of AI Are TIME’s 2025 Person of the Year | replace_source | The Architects of AI: Person of the Year 2025 - TIME (time.com) | TIME官方文章是原始报道，明确将黄仁勋列为“AI架构师”之一，并详细描述其个人角色与贡献，完全满足证据要求。其他媒体来源虽提及，但权威性和直接性较弱，因此选择TIME原文作为替换来源。 |
| Daniela Amodei | Anthropic&#39;s President Daniela Amodei on AI Safety Focus vs OpenAI | replace_source | Anthropic’s Daniela Amodei Believes the Market Will Reward Safe AI \| WIRED (wired.com) | 原始来源为YouTube视频，信息密度不足。候选中的WIRED采访是权威媒体对Daniela Amodei的直接访谈，明确讨论AI安全与监管，能有效替换并补强声明。其他候选或权威性不足，或主题不直接匹配。 |
| Demis Hassabis | Google’s top AI scientist says ‘learning how to learn’ will be next generation’s most nee... | replace_source | Google's AI leader says learning how to learn is key human skill of the future of work \| AP News (apnews.com) | AP新闻是权威通讯社，其报道直接记录了Demis Hassabis在雅典的公开活动，并明确引用了其关于‘学习如何学习’是下一代最需要技能的观点。该来源直接、权威，且可访问，完美替代了原低质量播客来源。 |
| Dylan Field | 20 Under 20 Thiel Fellow: Dylan Field | augment_source | Dylan Field - Wikipedia (en.wikipedia.org) | 维基百科页面明确、权威地记载了Dylan Field作为Thiel Fellow的身份及其与Figma创立的关系，完全满足证据要求，可替换原始YouTube视频。其他候选来源虽提及，但权威性或直接性不足。 |

## Execution Rule

- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.
- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.
- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.
