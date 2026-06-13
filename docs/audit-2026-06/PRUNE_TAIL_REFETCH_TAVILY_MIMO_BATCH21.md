# Refetch Source by Search + MiMo

Generated at: 2026-06-10T19:40:56.827Z
Remediation input: docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch21.jsonl
Search provider: tavily
Model: mimo-v2.5-pro

## Counts

| Metric | Value |
| --- | --- |
| selected tasks | 20 |
| existing rows reused | 0 |
| pending tasks | 0 |
| refetch results | 20 |
| source candidates | 191 |
| selected sources | 25 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 9 |
| augment_source | 7 |
| no_good_source | 3 |
| human_review | 1 |

## Selected Hosts

| Host | Count |
| --- | --- |
| infoq.cn | 1 |
| thepaper.cn | 1 |
| nvidia.cn | 1 |
| getpushtoprod.substack.com | 1 |
| howborisusesclaudecode.com | 1 |
| latent.space | 1 |
| chatgptiseatingtheworld.com | 1 |
| every.to | 1 |
| fortune.com | 1 |
| x.com | 1 |
| imobench.github.io | 1 |
| cdn.openai.com | 1 |
| news.qq.com | 1 |
| cs.stanford.edu | 1 |
| time.com | 1 |
| artefact.com | 1 |
| cbsnews.com | 1 |
| britannica.com | 1 |
| youtube.com | 1 |
| podcasts.apple.com | 1 |
| forbes.com | 1 |
| cs.toronto.edu | 1 |
| royalsociety.org | 1 |
| en.wikipedia.org | 1 |
| speakersassociates.com | 1 |

## Sample Results

| Person | Target | Decision | Sources | Reason |
| --- | --- | --- | --- | --- |
| 黄仁勋 | CES 2026：当黄仁勋谈论“物理AI”，未来的确定性在哪里？ | replace_source | 直击 CES 2026！黄仁勋最新演讲：Rubin芯片今年上市，计算能力是Blackwell 的5倍、Cursor 彻底改变了英伟达的软件开发方式、开源模型落后于先进模型约六个月 - InfoQ (infoq.cn)<br>黄仁勋CES 2026宣告：AI正式接管物理世界！_澎湃号·湃客_澎湃新闻-The Paper (thepaper.cn) | 原始来源（雪球）内容为乱码，无法使用。候选中，InfoQ和澎湃新闻的报道均明确、详细地描述了黄仁勋在CES 2026上关于“物理AI”的演讲，权威性高，可直接替换原来源。其他来源或权威性不足，或未明确提及人物，或需进一步验证。 |
| 黄仁勋 | Jen-Hsun “Jensen” Huang | replace_source | Jensen Huang (nvidia.cn) | NVIDIA官方传记页面（nvidia.cn）是权威、可访问的一手来源，明确包含黄仁勋的姓名、职位、创立公司及主要成就，完全满足证据要求，可直接替换原弱匹配来源。 |
| Boris Cherny | I hope this was helpful! What are your tips for using Claude Code? What do you want to he... | augment_source | How the Creator of Claude Code Actually Uses Claude Code (getpushtoprod.substack.com)<br>How Boris Uses Claude Code (howborisusesclaudecode.com) | 原始来源是社交媒体互动，缺乏实质性信息。候选来源中，Substack文章和专用网站明确将Boris Cherny与Claude Code的创造和使用技巧关联起来，提供了更权威、更详细的信息，可作为补充来源。其他候选来源要么权威性不足，要么... |
| Boris Cherny | No, Claude knows about hooks | augment_source | Claude Code: Anthropic's Agent in Your Terminal - Latent.Space (latent.space)<br>Is Anthropic's Boris Cherny just abandoning copyright for computer ... (chatgptiseatingtheworld.com)<br>How to Use Claude Code Like the People Who Built It - Every (every.to) | 原始来源（推文）信息过薄，被QA拒绝。候选来源中，有多个权威媒体/播客明确将Boris Cherny与Claude Code关联，可补强其身份与贡献。选择这些来源作为augment_source，以提供更权威的背景信息。 |
| Geoffrey Hinton | Researchgate sent me a fake paper called | no_good_source |  | 候选来源均未涉及原始声明中'ResearchGate发送虚假论文'的具体事件。这些来源主要关注Hinton的AI风险警告、离职、学术贡献或访谈，无法证明该事件。需要更直接的来源，如原始推文、采访或可靠报道。 |
| Mustafa Suleyman | //blogs.windows.com/msedgedev/2025/11/18/edge-for-business-presents-the-worlds-first-secu... | replace_source | Microsoft boss says its new AI-infused web browsing experience is like ‘a little angel on your shoulder doing the boring hard work’ \| Fortune (fortune.com) | 原始来源（产品博客）未提及人物，属于弱匹配。Fortune文章是权威媒体，明确将Mustafa Suleyman与微软Edge浏览器的AI功能（Copilot）直接关联，提供了人物、职位和产品的清晰证据，适合作为替换来源。 |
| Mustafa Suleyman | We just dropped what we believe is the world's largest study of AI conversations + it fou... | human_review |  | 候选来源均为第三方内容或通用页面，未直接证明Mustafa Suleyman本人与原始声明中提到的Copilot使用报告研究的关系。需要更直接的官方来源，如微软AI官方博客、人物本人的官方声明或可靠媒体对报告发布的采访。 |
| Oriol Vinyals | //blog.google/products/gemini/gemini-2-5-pro-latest-preview/ | augment_source | Oriol Vinyals on X: "Introducing the new Gemini 2.5 Pro preview..." (x.com) | 原始来源（X帖子）是本人官方账号发布，直接链接并介绍了目标博客文章，是证明该内容与Oriol Vinyals关联的权威、直接证据。其他候选来源均未提及目标博客，无法替代或补强。 |
| Quoc Le | //deepmind.google/blog/advanced-version-of-gemini-with-deep-think-officially-achieves-gol... | augment_source | IMO-Bench: Towards Robust Mathematical Reasoning \| Google DeepMind (imobench.github.io) | 候选来源中，仅IMO-Bench页面明确将Quoc V. Le列为作者，并关联了IMO 2025的成就，可作为补强来源。其他来源要么未提及本人，要么信息过时或权威性不足，无法替换或补强原始声明。 |
| 亚历克·拉德福德 | All samples shown are complete generations with no human editing. No stitching together o... | augment_source | [PDF] Improving Language Understanding by Generative Pre-Training (cdn.openai.com)<br>GPT论文主要作者、OpenAI高级研究员亚历克·雷德福离职_腾讯新闻 (news.qq.com) | 原始来源（推文）未明确提及亚历克·拉德福德本人，导致关于Person的断言弱。候选来源中，OpenAI官方论文和可靠媒体报道能直接证明其作为GPT研究核心作者的身份，可补强其技术贡献背景，但无法直接证明关于GPT-2生成样本的具体技术声明... |
| 亚历克·拉德福德 | Appendix of paper computes 8 gram overlap metrics for samples with training data. Of cour... | no_good_source |  | 所有候选来源均未直接证明亚历克·拉德福德本人提出了“论文附录计算8-gram重叠指标”这一具体观点。虽然有他的论文，但内容不匹配。其他论文作者不包含他。需要更直接的来源，如他的个人主页、明确包含此观点的论文或访谈。 |
| 布莱恩·卡坦扎罗 | //blogs.nvidia.com/blog/open-models-data-ai/ | no_good_source |  | 候选来源均为英伟达官方博客或相关页面，但均未在文本预览中提及布莱恩·卡坦扎罗，无法建立人物与作品的直接关联。LinkedIn页面虽提及人物，但未显示其与该博客的具体贡献关系，不符合权威来源要求。 |
| Andrej Karpathy | Deep Visual-Semantic Alignments for Generating Image Descriptions | replace_source | [PDF] Deep Visual-Semantic Alignments for Generating Image Descriptions (cs.stanford.edu) | 斯坦福大学官方托管的论文PDF是证明Andrej Karpathy作者身份的最权威、最直接来源。它明确列出了作者姓名和所属机构，完全符合证据要求，可替换原始的DOI链接。 |
| Arthur Mensch | Arthur Mensch - 人工智能 | replace_source | Arthur Mensch: The 100 Most Influential People in AI 2024 - TIME (time.com)<br>Arthur Mensch, CEO and cofounder of MISTRAL AI at the Adopt AI ... (artefact.com) | 原始来源页面内容空泛，无法证明人物身份。候选来源中，TIME的专题报道和Artefact的活动页面均提供了权威、可访问的证据，明确说明了Arthur Mensch作为Mistral AI CEO兼联合创始人的身份及其在AI领域的角色，符合... |
| Dario Amodei | Why this leading AI CEO is warning the tech could cause ... | replace_source | Why Anthropic CEO Dario Amodei spends so much time warning of AI's potential dangers (cbsnews.com) | 原始CNN来源因正文缺失被拒绝。CBS News的60分钟节目转录是权威媒体对Dario Amodei本人观点的直接报道，明确包含其关于AI潜在危险的警告，能有效替换并补强原始声明。其他候选来源要么权威性不足，要么与原始声明的直接关联性较... |
| Elon Musk | Elon Reeve Musk Book (BIOGRAPHY): Elon's Early Life ... | replace_source | Elon Musk \| SpaceX, Tesla, xAI, X, & PayPal \| Britannica Money (britannica.com) | 原来源为低信息密度的传记书籍，与AI/科技行业关联弱。Britannica页面是权威百科全书，直接提供马斯克的传记信息，包括早期生活、职业生涯和主要成就，可作为高质量替代来源。 |
| Elon Musk | Making Life Multi-Planetary | replace_source | Making Humans a Multiplanetary Species (youtube.com) | 原始来源（学术论文）未明确提及Elon Musk，无法建立人物与作品的直接关联。候选中的YouTube视频是SpaceX官方频道发布的Elon Musk演讲，标题和描述直接关联人物与主题，且包含完整转录，是权威、可访问且能直接证明关系的优... |
| Emad Mostaque | Emad Mostaque: The Visionary Behind Stable Diffusion and the Future of Decentralized AI (... | augment_source | Emad Mostaque — Stable Diffusi... - Gradient Dissent: Conversations on AI - Apple Podcasts (podcasts.apple.com)<br>Stable Diffusion’s AI Benefactor Has A History Of Exaggeration (forbes.com) | 原始来源缺乏实质内容。候选来源中，Apple Podcasts页面和福布斯报道均明确、权威地证实了Emad Mostaque作为Stability AI创始人/CEO以及与Stable Diffusion的核心关联，可有效补强人物传记信息... |
| Ilya Sutskever | Ilya Sutskever | replace_source | Ilya Sutskever's home page (cs.toronto.edu)<br>Dr Ilya Sutskever FRS \| Royal Society Fellow (royalsociety.org) | 原始维基百科来源因缺乏正文被拒绝。候选中，多伦多大学官方主页和英国皇家学会研究员页面是权威、可访问的官方或机构资料页，能直接证明Ilya Sutskever的职位、经历和贡献，符合替换要求。其他候选来源权威性不足或内容不直接相关。 |
| Mira Murati | Mira Murati, Chief Technology Officer, OpenAI - Behind the ... | augment_source | Mira Murati - Wikipedia (en.wikipedia.org)<br>[PDF] Mira Murati - Speakers Associates (speakersassociates.com) | 原始来源因内容无关被拒绝。维基百科和演讲者简介PDF均明确、权威地证实了Mira Murati在OpenAI的CTO职位，可作为补充或替换来源。其他候选来源要么权威性不足，要么缺乏直接证据。 |

## Execution Rule

- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.
- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.
- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.
