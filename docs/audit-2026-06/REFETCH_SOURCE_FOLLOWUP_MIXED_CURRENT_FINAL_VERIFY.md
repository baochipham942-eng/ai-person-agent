# Refetch Source Apply

Generated at: 2026-06-11T02:24:20.984Z
Mode: dry-run
Input: docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_followup_mixed_mimo.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 78 |
| eligible source rows | 68 |
| selected source rows | 68 |
| skipped source/decision rows | 31 |
| existing RawPoolItems | 68 |
| raw inserted | 0 |
| raw updated | 68 |
| keep audits inserted | 0 |
| keep audits already existed | 68 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 55 |
| augment_source | 13 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 45 |
| official | 19 |
| paper | 3 |
| youtube | 1 |

## Top Hosts

| Host | Count |
| --- | --- |
| hub.baai.ac.cn | 5 |
| arxiv.org | 3 |
| ainext.tw | 2 |
| blogs.microsoft.com | 2 |
| cnbc.com | 2 |
| cs.tsinghua.edu.cn | 2 |
| mp.weixin.qq.com | 2 |
| nature.com | 2 |
| singjupost.com | 2 |
| ycombinator.com | 2 |
| about.fb.com | 1 |
| aiforgood.itu.int | 1 |
| baai.ac.cn | 1 |
| baike.baidu.com | 1 |
| cdn.openai.com | 1 |
| cdss.berkeley.edu | 1 |
| chuangxin.com | 1 |
| cifar.ca | 1 |
| cims.nyu.edu | 1 |
| cloud.tencent.com | 1 |
| cs.stanford.edu | 1 |
| cs.toronto.edu | 1 |
| devpress.csdn.net | 1 |
| dwarkesh.com | 1 |
| finance.ifeng.com | 1 |
| fortunechina.com | 1 |
| innovatorsunder35.com | 1 |
| inspirehep.net | 1 |
| isc.org.cn | 1 |
| karpathy.ai | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Andrej Karpathy | replace_source | exa | Andrej Karpathy | karpathy.ai | would_update_raw | keep_audit_exists |
| Andrej Karpathy | augment_source | exa | Andrej Karpathy: Software Is Changing (Again) : YC Startup Library \| Y Combinat... | ycombinator.com | would_update_raw | keep_audit_exists |
| Andrej Karpathy | replace_source | official | Andrej Karpathy Academic Website - Stanford Computer Science | cs.stanford.edu | would_update_raw | keep_audit_exists |
| Elon Musk | replace_source | exa | Elon Musk, AI and the antichrist: the biggest tech stories of 2025 \| Technology... | theguardian.com | would_update_raw | keep_audit_exists |
| Ilya Sutskever | replace_source | official | Ilya Sutskever's home page | cs.toronto.edu | would_update_raw | keep_audit_exists |
| John Schulman | augment_source | exa | John Schulman (OpenAI Cofounder) - Reasoning, RLHF, & Plan for ... | dwarkesh.com | would_update_raw | keep_audit_exists |
| John Schulman | augment_source | official | ChatGPT architect, Berkeley alum John Schulman on his journey ... | cdss.berkeley.edu | would_update_raw | keep_audit_exists |
| John Schulman | augment_source | official | ChatGPT architect, Berkeley alum John Schulman on his journey with AI - Berkele... | news.berkeley.edu | would_update_raw | keep_audit_exists |
| Mustafa Suleyman | replace_source | exa | Mustafa Suleyman | mustafa-suleyman.ai | would_update_raw | keep_audit_exists |
| Mustafa Suleyman | replace_source | official | Announcing Copilot leadership update - The Official Microsoft Blog | blogs.microsoft.com | would_update_raw | keep_audit_exists |
| Mustafa Suleyman | replace_source | official | Mustafa Suleyman, DeepMind and Inflection Co-founder, joins Microsoft to lead C... | blogs.microsoft.com | would_update_raw | keep_audit_exists |
| Shane Legg | replace_source | exa | Shane Legg \| Speaker \| TED | ted.com | would_update_raw | keep_audit_exists |
| Shane Legg | replace_source | exa | Shane Legg \| TEDAI San Francisco | tedai-sanfrancisco.ted.com | would_update_raw | keep_audit_exists |
| Wojciech Zaremba | replace_source | exa | #215 - Wojciech Zaremba: OpenAI Codex, GPT-3, Robotics, and the Future of AI | lexfridman.com | would_update_raw | keep_audit_exists |
| Wojciech Zaremba | replace_source | official | Alumni Q&A with Wojciech Zaremba, Co-Founder of OpenAI | cims.nyu.edu | would_update_raw | keep_audit_exists |
| Yoshua Bengio | replace_source | exa | ‘It keeps me awake at night’: machine-learning pioneer on AI’s threat to humani... | nature.com | would_update_raw | keep_audit_exists |
| Yoshua Bengio | replace_source | exa | ‘Malicious use is already happening’: machine-learning pioneer on making AI saf... | nature.com | would_update_raw | keep_audit_exists |
| Yoshua Bengio | replace_source | exa | Transcript of The Catastrophic Risks of AI — and a Safer Path: Yoshua Bengio – ... | singjupost.com | would_update_raw | keep_audit_exists |
| Yoshua Bengio | augment_source | exa | Yoshua Bengio - AI for Good Global Summit | aiforgood.itu.int | would_update_raw | keep_audit_exists |
| Yoshua Bengio | replace_source | exa | Yoshua Bengio – CIFAR | cifar.ca | would_update_raw | keep_audit_exists |
| Yoshua Bengio | augment_source | exa | Yoshua Bengio: Home | yoshuabengio.org | would_update_raw | keep_audit_exists |
| 丁洁 | replace_source | exa | 丁洁 | piaofang.maoyan.com | would_update_raw | keep_audit_exists |
| 亚历克·拉德福德 | augment_source | exa | Alec Radford - Inspire HEP | inspirehep.net | would_update_raw | keep_audit_exists |
| 亚历克·拉德福德 | replace_source | official | [PDF] Improving Language Understanding by Generative Pre-Training | cdn.openai.com | would_update_raw | keep_audit_exists |
| 亚历克·拉德福德 | replace_source | paper | [PDF] Fine-Tuning Language Models from Human Preferences - arXiv | arxiv.org | would_update_raw | keep_audit_exists |
| 亚历克·拉德福德 | replace_source | youtube | L11 Language Models -- guest instructor: Alec Radford (OpenAI) --- Deep Unsuper... | youtube.com | would_update_raw | keep_audit_exists |
| 刘知远 | replace_source | exa | 刘知远 | lzy.thunlp.org | would_update_raw | keep_audit_exists |
| 刘知远 | augment_source | official | xLLM Technical Report - ADS | ui.adsabs.harvard.edu | would_update_raw | keep_audit_exists |
| 刘知远 | replace_source | official | 刘知远 - 清华大学计算机科学与技术系 | cs.tsinghua.edu.cn | would_update_raw | keep_audit_exists |
| 吴恩达 | replace_source | exa | Andrew Ng: Building Faster with AI : YC Startup Library \| Y Combinator | ycombinator.com | would_update_raw | keep_audit_exists |
| 吴恩达 | replace_source | exa | Andrew Ng: Building Faster with AI (Transcript) - The Singju Post | singjupost.com | would_update_raw | keep_audit_exists |
| 周明 | replace_source | exa | AI大牛周明发布MChat：生成可控，参数规模可负担，顺便官宣了新融资-腾讯云开发者社区-腾讯云 | cloud.tencent.com | would_update_raw | keep_audit_exists |
| 周明 | replace_source | exa | 周明博士 - 澜舟科技 | langboat.com | would_update_raw | keep_audit_exists |
| 周明 | augment_source | exa | 大模型迎落地元年 澜舟科技周明提出成功“九字诀” - 21世纪经济报道 | m.21jingji.com | would_update_raw | keep_audit_exists |
| 周明 | replace_source | exa | 首席科学家 - 创新工场 | chuangxin.com | would_update_raw | keep_audit_exists |
| 周明 | augment_source | official | 澜舟科技创始人兼CEO周明博士：大语言模型的前世今生 - 智源社区 | hub.baai.ac.cn | would_update_raw | keep_audit_exists |
| 季逸超 | replace_source | exa | How Yichao “Peak” Ji became a global AI app hitmaker \| MIT Technology Review | technologyreview.com | would_update_raw | keep_audit_exists |
| 季逸超 | replace_source | exa | Yichao “Peak” Ji \| Innovators Under 35 | innovatorsunder35.com | would_update_raw | keep_audit_exists |
| 季逸超 | replace_source | official | FrontierCS: Evolving Challenges for Evolving Intelligence - 智源社区论文 | hub.baai.ac.cn | would_update_raw | keep_audit_exists |
| 戴文渊 | replace_source | exa | 从“实验室”到“生产线” 看AI如何赋能千行百业——“同心之旅·复兴有我 ... | wap.chinanews.com | would_update_raw | keep_audit_exists |
| 戴文渊 | replace_source | exa | 北京市委统战部“同心之旅”走进范式智能共话人工智能赋能首都高质量 ... | finance.ifeng.com | would_update_raw | keep_audit_exists |
| 戴文渊 | replace_source | exa | 对话第四范式戴文渊：大模型已到回归商业本质的时候，要算得清经济账_腾讯新闻 | news.qq.com | would_update_raw | keep_audit_exists |
| 朱军 | replace_source | exa | 姜大昕、朱军现场激辩，国产AI巨头对o1模型和行业的深度思考-36氪 | m.36kr.com | would_update_raw | keep_audit_exists |
| 朱军 | replace_source | official | 朱军 - 清华大学计算机科学与技术系 | cs.tsinghua.edu.cn | would_update_raw | keep_audit_exists |
| 朱军 | replace_source | official | 朱军的个人主页-智源社区 | hub.baai.ac.cn | would_update_raw | keep_audit_exists |
| 李飞飞 | replace_source | exa | Fei-Fei Li: The 100 Most Influential People in AI 2023 - TIME | time.com | would_update_raw | keep_audit_exists |
| 杨植麟 | replace_source | exa | 和杨植麟时隔一年的独家对话：“站在无限的开端” | mp.weixin.qq.com | would_update_raw | keep_audit_exists |
| 杨植麟 | replace_source | exa | 对话月之暗面杨植麟：开源开放是中国AI的独特价值，智能体或将百倍提升生产力 | thepaper.cn | would_update_raw | keep_audit_exists |
| 杨植麟 | replace_source | exa | 月之暗面杨植麟专访：AI不是接下来一两年找到PMF，而是接下来十到二十年如何改变世界 | mp.weixin.qq.com | would_update_raw | keep_audit_exists |
| 杨植麟 | replace_source | official | 月之暗面杨植麟：大模型需要新的组织范式，场景摩尔定律能催生 Super App - 智源社区 | hub.baai.ac.cn | would_update_raw | keep_audit_exists |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
