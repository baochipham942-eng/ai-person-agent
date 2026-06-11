# Refetch Source by Search + MiMo

Generated at: 2026-06-10T14:37:47.265Z
Remediation input: docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch4.jsonl
Search provider: tavily
Model: mimo-v2.5-pro

## Counts

| Metric | Value |
| --- | --- |
| selected tasks | 20 |
| existing rows reused | 0 |
| pending tasks | 0 |
| refetch results | 20 |
| source candidates | 181 |
| selected sources | 30 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 15 |
| augment_source | 5 |

## Selected Hosts

| Host | Count |
| --- | --- |
| singjupost.com | 2 |
| arxiv.org | 2 |
| noamshazeer.com | 2 |
| en.wikipedia.org | 2 |
| cdn.openai.com | 2 |
| cbsnews.com | 1 |
| digitaleconomy.stanford.edu | 1 |
| darioamodei.com | 1 |
| forbes.com | 1 |
| fr.linkedin.com | 1 |
| ai.meta.com | 1 |
| jan.leike.name | 1 |
| ml-summit.org | 1 |
| linkedin.com | 1 |
| ted.com | 1 |
| a16z.com | 1 |
| podcasts.apple.com | 1 |
| ycombinator.com | 1 |
| lerandom.art | 1 |
| research.google | 1 |
| montgomerysummit.com | 1 |
| papers.neurips.cc | 1 |
| epublications.marquette.edu | 1 |
| transformer-circuits.pub | 1 |
| semanticscholar.org | 1 |

## Sample Results

| Person | Target | Decision | Sources | Reason |
| --- | --- | --- | --- | --- |
| Dario Amodei | DARIO AMODEI LIFE: A Comprehensive Biography Of the co-founder and CEO of Anthropic AI & ... | replace_source | Read the full transcript of our interview with Anthropic CEO Dario Amodei - CBS News (cbsnews.com)<br>Dario Amodei - Stanford Digital Economy Lab (digitaleconomy.stanford.edu)<br>Dario Amodei (darioamodei.com) | 原来源为电商书籍页面，信息密度低。候选来源中，CBS News采访转录、斯坦福大学资料页及本人官方主页均能直接、权威地证明Dario Amodei作为Anthropic CEO的身份及背景，符合替换要求。 |
| Emad Mostaque | Emad Mostaque on the End of Capitalism | replace_source | Transcript: Emad Mostaque - Why GDP & Capitalism Is Obsolete in an AI World - Impact Theory (singjupost.com) | 原来源仅含网页页脚，缺乏实质内容。候选中的Singju Post转录页面提供了Emad Mostaque在Impact Theory播客中关于AI终结资本主义的完整访谈，直接、权威地支持了该主张，是理想的替换来源。 |
| Guillaume Lample | Guillaume Lample - Co-founder Chief Scientist \| Prog. ... | augment_source | Guillaume Lample (forbes.com)<br>Guillaume Lample - Mistral AI (fr.linkedin.com) | 原来源内容缺失，需替换或补强。福布斯资料页权威且直接证明其联合创始人身份，LinkedIn主页可作为辅助。两者均符合要求，可共同补强证据。 |
| Guillaume Lample | Guillaume Lample glample | replace_source | [PDF] arXiv:1901.07291v1 [cs.CL] 22 Jan 2019 (arxiv.org) | 原始来源GitHub主页抓取内容不足。候选中的arXiv论文页面是权威的学术来源，明确列出了Guillaume Lample作为作者及其所属机构，能有效证明其研究身份，适合作为替换来源。其他候选来源权威性不足或属于受限页面。 |
| Guillaume Lample | Paper page - LLaMA: Open and Efficient Foundation Language Models | replace_source | LLaMA: Open and Efficient Foundation Language Models - Meta AI (ai.meta.com) | Meta AI官方论文页面是LLaMA论文的权威发布源，明确列出Guillaume Lample为作者，直接证明其与论文的关系，符合证据要求。其他候选来源要么权威性不足，要么无法直接证明作者身份。 |
| Jan Leike | Jan Leike - OpenAI \| 人才画像 | replace_source | Jan Leike (jan.leike.name) | 候选来源中，jan.leike.name是本人官方主页，明确证明其职位和贡献，权威性高，可直接替换原低质量来源。其他来源多为新闻或社区讨论，权威性不足。 |
| Lukasz Kaiser | Lukasz Kaiser lukaszkaiser | augment_source | Lukasz Kaiser \| 2021 Machine Learning Summit (ml-summit.org)<br>Lukasz Kaiser - OpenAI (linkedin.com) | 原GitHub主页信息不足，需补充权威来源。ML Summit页面提供详实的职位、贡献和背景信息，LinkedIn主页确认当前身份。两者结合可有效补强人物资料。 |
| Mustafa Suleyman | What Is an AI Anyway? \| Mustafa Suleyman \| TED | replace_source | Mustafa Suleyman (ted.com)<br>What Is An AI Anyway? - Mustafa Suleyman (Transcript) – The Singju Post (singjupost.com) | 原始来源为YouTube登录页面，无法访问。候选来源中，TED官方演讲者页面直接证明人物身份，演讲转录页面提供完整内容证据，两者结合可有效替换原始来源。 |
| Noam Shazeer | EP 31 Noam Shazeer - Google veteran and AI inventor on future of AI | replace_source | Noam Shazeer \| AI Scientist, Google Gemini Co-Lead (noamshazeer.com)<br>Universally Accessible Intelligence \| Andreessen Horowitz (a16z.com) | 原来源（ListenNotes播客页面）信息密度低，主要为导航链接。候选中的官方主页（noamshazeer.com）和a16z访谈页面均直接、权威地证明了Noam Shazeer的身份、职位和贡献，符合证据要求，可有效替换原弱来源。 |
| Noam Shazeer | Noam Shazeer returns to Google to co-lead Gemini AI project | replace_source | Noam Shazeer \| AI Scientist, Google Gemini Co-Lead (noamshazeer.com) | 候选来源中，本人官方主页（noamshazeer.com）直接、权威地证明了Noam Shazeer作为Google Gemini联合负责人的身份，完全符合证据要求，可替换原始抓取不完整的来源。 |
| Sam Altman | Where is AI Taking Us? \| Sam Altman & Vinod Khosla | augment_source | #107 - Vinod Khosla and Sam Al… – Y Combinator Startup Podcast – Apple Podcasts (podcasts.apple.com)<br>Sam Altman: The Future of OpenAI, ChatGPT's Origins, and Building AI Hardware : YC Startup Library \| Y Combinator (ycombinator.com) | 原始YouTube视频抓取失败，但候选中有两个Y Combinator官方来源（播客和资料库）能直接证明Sam Altman与Vinod Khosla的对话关系，权威且可访问。可作为补强来源，但无法完全替代原始视频。 |
| 亚历克·拉德福德 | A Comprehensive Guide To Alec Radford: The Innovator ... | augment_source | Alec Radford - Wikipedia (en.wikipedia.org)<br>THE PEOPLE ARE IN THE COMPUTER—PART I - Le Random (lerandom.art) | 原始来源缺乏实质内容。维基百科页面提供了权威的生平概述，可作为补充。Le Random文章直接以亚历克·拉德福德为主角，讲述其贡献，可作为强关联来源。两者结合可补强人物信息。 |
| 亚历克·拉德福德 | Alec Radford \| OpenAI \| 41 Publications \| 15057 Citations \| Related Authors | replace_source | [PDF] Language Models are Unsupervised Multitask Learners \| OpenAI (cdn.openai.com)<br>Alec Radford - Wikipedia (en.wikipedia.org) | 原始来源（SciSpace）信息密度低。OpenAI官方PDF直接证明其作者身份，是权威的一手来源。维基百科提供补充背景。两者结合可有效替换并补强原来源。 |
| 亚历克·拉德福德 | L11 Language Models -- guest instructor: Alec Radford ... | augment_source | Improving Language Understanding by Generative Pre-Training (cdn.openai.com) | 候选来源中，OpenAI官方论文PDF能直接证明Alec Radford的研究者身份，可作为补强来源。原始YouTube链接因登录墙无法访问，需替换或补充。其他候选来源要么证据不足，要么不符合权威性要求。 |
| 杰夫·迪恩 | Jeff Dean | replace_source | Jeffrey Dean - Google Research (research.google) | 原始来源（Google博客作者页）内容缺失。候选中的Google Research官方页面直接、权威地证明了杰夫·迪恩在谷歌的职位和角色，符合证据要求，可作为高质量替换来源。 |
| 阿希什·瓦斯瓦尼 | Ashish Vaswani - People in AI | replace_source | Ashish Vaswani - The Montgomery Summit (montgomerysummit.com)<br>[PDF] Attention is All you Need - NIPS (papers.neurips.cc) | 原来源为AI生成的简介，信息密度低。候选中，蒙哥马利峰会官网提供了权威的职位和贡献描述，原始论文PDF直接证明其学术身份，两者结合可有效替换并补强原来源。 |
| 阿希什·瓦斯瓦尼 | Paper page - Attention Is All You Need | replace_source | [1706.03762] Attention Is All You Need - arXiv (arxiv.org) | 原始来源（Hugging Face论文页面）内容薄弱。arXiv页面是论文的权威预印本，明确列出作者Ashish Vaswani，直接证明其贡献，是理想的替换来源。 |
| 马克·扎克伯格 | Meta's Mark Zuck announces new AI model Mango to ... | replace_source | "Zuckerberg Facebook post announcing a new Meta AI model, Muse" by Mark Zuckerberg (epublications.marquette.edu) | 原始来源信息密度低且被广告淹没。候选来源中，马凯特大学存档的扎克伯格Facebook帖子转录是直接、权威的证据，明确证明扎克伯格本人宣布了新AI模型Muse，可有效替换原始来源。其他候选来源要么未直接提及扎克伯格，要么未提供具体宣布内容的... |
| Chris Olah | A Mathematical Framework for Transformer Circuits | replace_source | A Mathematical Framework for Transformer Circuits (transformer-circuits.pub) | 原始来源（transformer-circuits.pub）的论文作者列表明确包含Chris Olah，并标注其为通讯作者，直接证明其参与和贡献。此来源权威、可访问，且直接满足证据要求，可替换原弱匹配来源。 |
| Chris Olah | In-context Learning and Induction Heads | replace_source | In-context Learning and Induction Heads - Semantic Scholar (semanticscholar.org) | 候选来源中，Semantic Scholar页面明确列出Chris Olah为论文作者，是权威的学术来源，可直接证明其与作品的关系。其他来源要么未提及人物，要么权威性不足或信息不直接。 |

## Execution Rule

- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.
- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.
- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.
