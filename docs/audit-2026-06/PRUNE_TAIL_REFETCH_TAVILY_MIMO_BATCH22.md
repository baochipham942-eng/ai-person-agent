# Refetch Source by Search + MiMo

Generated at: 2026-06-10T19:55:02.746Z
Remediation input: docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch22.jsonl
Search provider: tavily
Model: mimo-v2.5-pro

## Counts

| Metric | Value |
| --- | --- |
| selected tasks | 20 |
| existing rows reused | 0 |
| pending tasks | 0 |
| refetch results | 20 |
| source candidates | 194 |
| selected sources | 27 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 11 |
| augment_source | 4 |
| no_good_source | 4 |
| human_review | 1 |

## Selected Hosts

| Host | Count |
| --- | --- |
| mustafa-suleyman.ai | 2 |
| noamshazeer.com | 2 |
| britannica.com | 2 |
| cs.mcgill.ca | 2 |
| blogs.nvidia.cn | 2 |
| blogs.microsoft.com | 1 |
| nbcsandiego.com | 1 |
| forbes.com | 1 |
| ai.meta.com | 1 |
| lri.fr | 1 |
| mila.quebec | 1 |
| ted.com | 1 |
| blog.google | 1 |
| viterbischool.usc.edu | 1 |
| montgomerysummit.com | 1 |
| cnbc.com | 1 |
| youtube.com | 1 |
| m.zhidx.com | 1 |
| news.sina.cn | 1 |
| themarque.com | 1 |
| lennysnewsletter.com | 1 |
| newsletter.pragmaticengineer.com | 1 |

## Sample Results

| Person | Target | Decision | Sources | Reason |
| --- | --- | --- | --- | --- |
| Mustafa Suleyman | Mustafa Suleyman | replace_source | Mustafa Suleyman, DeepMind and Inflection Co-founder, joins Microsoft to lead Copilot (blogs.microsoft.com)<br>Mustafa Suleyman (mustafa-suleyman.ai) | 原始来源（Greylock个人主页）内容过薄，已被拒绝。候选中有两个高质量来源：微软官方博客（权威机构来源，证明其当前职位）和个人官网（本人官方主页，信息全面）。两者均可作为替换来源，优先选择微软官方博客以体现机构权威性。 |
| Noam Shazeer | Google appoints former Character. AI founder as co-lead of its AI models | replace_source | Noam Shazeer \| AI Scientist, Google Gemini Co-Lead (noamshazeer.com)<br>Ex-Google engineers who founded Character.AI re-join company with new AI partnership – NBC 7 San Diego (nbcsandiego.com) | 候选来源中，本人官方主页（noamshazeer.com）直接证明其职位，是最权威的替换来源。NBC的报道提供了事件背景，可作为补充。其他来源要么权威性不足，要么内容不完整，不符合替换标准。 |
| Sam Altman | OpenAI | replace_source | Sam Altman \| Biography, OpenAI, ChatGPT, & Microsoft - Britannica (britannica.com) | 原始来源仅为OpenAI产品导航页，缺乏人物信息。Britannica页面是权威百科全书，明确提供Sam Altman的传记及其作为OpenAI CEO的职位，直接满足证据要求，可作为可靠替换来源。 |
| Sam Altman | Sam Altman | replace_source | Sam Altman \| Biography, OpenAI, ChatGPT, & Microsoft - Britannica (britannica.com)<br>Sam Altman - Forbes (forbes.com) | 原始来源（维基百科）因抓取问题无效。候选中Britannica和Forbes的资料页提供了权威、可访问、直接证明Sam Altman与OpenAI、Y Combinator等机构关系的传记信息，符合替换要求。其他候选来源权威性不足或不符合... |
| Yann LeCun | Index of /exdb/mnist | replace_source | Yann LeCun - AI at Meta (ai.meta.com)<br>[PDF] THE MNIST DATABASE of handwritten digits (lri.fr) | 原始来源（MNIST索引页）缺乏实质内容。候选中，Meta官方页面能权威证明其职位，MNIST官方文档能直接证明其与数据集的关系。两者结合可有效补强或替换原始来源。 |
| 乔尔·皮诺 | Joelle Pineau | replace_source | Joelle Pineau's Home (cs.mcgill.ca)<br>Joelle Pineau - Mila - Quebec Artificial Intelligence Institute (mila.quebec) | 原来源（Meta AI官网）内容过薄。候选中，麦吉尔大学个人主页和Mila研究所名录页面均为权威官方来源，直接证明了乔尔·皮诺的职位、所属机构及研究领域，可有效替换原来源。 |
| 乔尔·皮诺 | Joelle Pineau \| TEDAI San Francisco - TED Talks | replace_source | Joelle Pineau: What's inside the "black box" of AI? \| TED Talk (ted.com)<br>Joelle Pineau's Home - McGill School Of Computer Science (cs.mcgill.ca) | 原始来源仅为会议导航链接，缺乏实质内容。候选中，TED官方演讲页面和麦吉尔大学个人主页均直接、权威地证明了人物身份、职位及与TEDAI演讲的关联，可有效替换或补强。 |
| 科拉伊·卡武克丘奥卢 | koray kavukcuoglu | replace_source | Koray Kavukcuoglu (blog.google) | 原始来源（谷歌学术页面）加载错误，无实质内容。候选中的Google官方博客作者页（blog.google）是权威、可访问的官方来源，明确列出了人物姓名、职位和职责，完全符合证据要求，可直接替换原始来源。 |
| 阿希什·瓦斯瓦尼 | Ashish Vaswani | replace_source | USC Alumni Paved Path for ChatGPT - USC Viterbi \| School of Engineering (viterbischool.usc.edu)<br>Ashish Vaswani - The Montgomery Summit (montgomerysummit.com) | 原来源（谷歌学术页面）加载错误且信息密度低。候选来源中，USC Viterbi工程学院的新闻稿和Montgomery Summit的演讲者页面均为权威机构发布，直接、明确地证明了阿希什·瓦斯瓦尼的身份、职位及其在Transformer模型... |
| 雅各布·乌什科雷特 | After leaving Google, Jakob Uszkoreit started Inceptive to apply AI to… \| CNBC | replace_source | Inceptive CEO Jakob Uszkoreit says AI will transform pharmaceuticals (cnbc.com)<br>Inceptive CEO Jakob Uszkoreit On Transformers And Using AI To Make New Drugs (youtube.com) | 原始LinkedIn来源因登录墙被拒。候选中的CNBC官方文章和YouTube视频均直接、权威地证明了人物离开谷歌后创立Inceptive并应用AI的核心事实，且标题/描述明确包含人物姓名和职位，符合替换要求。 |
| 黄仁勋 | GPU计算时代：无尽创意、无处不在 | augment_source | NVIDIA CEO 黄仁勋与全球技术领导者在GTC 2026 大会共话AI 时代 (blogs.nvidia.cn)<br>NVIDIA CEO：“我们创造了为生成式 AI 时代而生的处理器” \| NVIDIA 英伟达博客 (blogs.nvidia.cn) | 原来源（OpenAlex论文）未直接提及黄仁勋。候选中的NVIDIA官方博客文章明确记载了黄仁勋在GTC大会上的演讲，内容直接关联GPU计算与AI时代，能有效补强并证明其观点与领导角色。这些来源权威、可访问，且包含直接引述。 |
| 黄仁勋 | 黄仁勋最新访谈：英伟达要用AI造一台“时间机器” | augment_source | 黄仁勋访谈：英伟达要用AI造一台“时间机器”，看好人形机器人 - 智东西 (m.zhidx.com)<br>黄仁勋最新访谈：英伟达要用AI造一台“时间机器”，看好人形机器人\|ChatGPT\|注意力机制\|计算平台\|主持人\|电脑_手机新浪网 (news.sina.cn) | 原始声明因缺乏访谈细节被拒。候选中，智东西和新浪新闻的文章直接、详细地报道了黄仁勋接受Cleo Abram专访并提及“时间机器”的内容，与声明高度匹配，可作为权威补充来源。其他候选内容主题不符或证据不足。 |
| Lukasz Kaiser | I'm starting to feel sacred about some of my older theory papers... Maybe time to proacti... | human_review |  | 所有候选来源均未直接证明或关联原始推文中关于“older theory papers”和“proactively push them through myself”的个人情绪表达。它们要么是关于AI技术的讨论，要么是标准简历，要么权威性不... |
| Mustafa Suleyman | //www.youtube.com/watch?v=XWGnWcmns_M | replace_source | Mustafa Suleyman (mustafa-suleyman.ai) | 候选来源中，本人官方主页（mustafa-suleyman.ai）最权威，直接证明其职位、作品及观点，可完美替换原无效来源。其他来源权威性不足或证据不直接。 |
| Noam Shazeer | //blog.google/products/gemini/gemini-3-deep-think/ | augment_source | Noam Shazeer \| AI Scientist, Google Gemini Co-Lead (noamshazeer.com)<br>Noam Shazeer \| Gemini Co-Lead & VP Engineering, Google (themarque.com) | 候选来源中，本人官方主页和权威机构资料页能直接证明Noam Shazeer作为Google Gemini Co-Lead的职位，可补强原来源缺失的实质描述。其他来源或为辅助线索，或未直接关联目标。 |
| 科拉伊·卡武克丘奥卢 | //blog.google/technology/ai/google-gemini-ai/ | no_good_source |  | 所有候选来源均未提及科拉伊·卡武克丘奥卢，无法建立其与Gemini博客文章的直接关联。需要更具体的来源，如个人官方简介、论文作者页或明确提及人物角色的采访。 |
| Andrej Karpathy | The top comment on all of these is usually “ai” with 3000 likes | no_good_source |  | 所有候选来源均未直接证明或支持原始推文内容。原始推文是关于社交媒体评论现象的随感，缺乏专业技术含量，且候选来源中无权威页面（如官方主页、机构资料页、论文详情页、作者页、可靠媒体采访或有转录/描述的播客视频）能直接证明该推文与人物的关系或提... |
| Boris Cherny | Both can be invoked both by the model and by a person | augment_source | Head of Claude Code: What happens after coding is solved \| Boris ... (lennysnewsletter.com)<br>Building Claude Code with Boris Cherny - by Gergely Orosz (newsletter.pragmaticengineer.com) | 原始来源为孤立的推文，缺乏上下文。候选中有多个权威访谈/播客转录页面，明确提及Boris Cherny是Claude Code的创造者和负责人，可补强其职位与贡献，但未直接证明原始主张中的具体句子。因此选择补强来源，而非替换。 |
| Boris Cherny | No. I just keep thinking on by default | no_good_source |  | 所有候选来源均未直接包含或证明目标陈述“No. I just keep thinking on by default”。它们多为播客转述、博客文章或社交媒体帖子，缺乏原始、权威的直接证据。目标陈述信息密度低，且未找到可替换的权威来源。 |
| Boris Cherny | Same repo, separate git checkouts | no_good_source |  | 所有候选来源均未直接证明Boris Cherny与‘Same repo, separate git checkouts’这一具体主张的关联。它们要么是社交媒体帖子，要么是讨论更广泛工作流的文章，缺乏权威、直接的证据。因此，无法替换或补强原... |

## Execution Rule

- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.
- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.
- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.
