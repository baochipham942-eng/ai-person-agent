# Refetch Source Apply

Generated at: 2026-06-10T07:07:54.104Z
Mode: dry-run
Input: docs/audit-2026-06/data/exa_source_quality_review_dir/refetch_source_followup_tavily_mimo.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 48 |
| eligible source rows | 39 |
| selected source rows | 39 |
| skipped source/decision rows | 19 |
| existing RawPoolItems | 39 |
| raw inserted | 0 |
| raw updated | 39 |
| keep audits inserted | 0 |
| keep audits already existed | 39 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 29 |
| augment_source | 10 |

## Source Types

| Source type | Count |
| --- | --- |
| exa | 25 |
| official | 12 |
| paper | 1 |
| youtube | 1 |

## Top Hosts

| Host | Count |
| --- | --- |
| blogs.microsoft.com | 2 |
| hub.baai.ac.cn | 2 |
| nature.com | 2 |
| singjupost.com | 2 |
| ycombinator.com | 2 |
| aiforgood.itu.int | 1 |
| arxiv.org | 1 |
| cdn.openai.com | 1 |
| cdss.berkeley.edu | 1 |
| chuangxin.com | 1 |
| cifar.ca | 1 |
| cims.nyu.edu | 1 |
| cloud.tencent.com | 1 |
| cs.stanford.edu | 1 |
| cs.toronto.edu | 1 |
| cs.tsinghua.edu.cn | 1 |
| dwarkesh.com | 1 |
| innovatorsunder35.com | 1 |
| inspirehep.net | 1 |
| karpathy.ai | 1 |
| langboat.com | 1 |
| lexfridman.com | 1 |
| lzy.thunlp.org | 1 |
| m.21jingji.com | 1 |
| mustafa-suleyman.ai | 1 |
| news.berkeley.edu | 1 |
| piaofang.maoyan.com | 1 |
| technologyreview.com | 1 |
| ted.com | 1 |
| tedai-sanfrancisco.ted.com | 1 |

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

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
