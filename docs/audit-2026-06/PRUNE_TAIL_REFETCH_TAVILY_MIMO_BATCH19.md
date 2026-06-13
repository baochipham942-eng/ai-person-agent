# Refetch Source by Search + MiMo

Generated at: 2026-06-10T19:08:54.198Z
Remediation input: docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch19.jsonl
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
| selected sources | 24 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 14 |
| augment_source | 3 |
| human_review | 2 |
| no_good_source | 1 |

## Selected Hosts

| Host | Count |
| --- | --- |
| time.com | 2 |
| profiles.stanford.edu | 2 |
| cims.nyu.edu | 2 |
| ai.meta.com | 2 |
| yann.lecun.com | 2 |
| en.wikipedia.org | 1 |
| erictopol.substack.com | 1 |
| research.google | 1 |
| forbes.com | 1 |
| britannica.com | 1 |
| theatlantic.com | 1 |
| lexfridman.com | 1 |
| deepai.org | 1 |
| gspeakers.com | 1 |
| engineering.nyu.edu | 1 |
| pdfs.semanticscholar.org | 1 |
| cis.upenn.edu | 1 |
| simons.berkeley.edu | 1 |
| businessinsider.com | 1 |

## Sample Results

| Person | Target | Decision | Sources | Reason |
| --- | --- | --- | --- | --- |
| Mustafa Suleyman | The Coming Wave Book | augment_source | Mustafa Suleyman - Wikipedia (en.wikipedia.org)<br>My review of THE COMING WAVE - by Eric Topol (erictopol.substack.com) | 原始来源（the-coming-wave.com）内容过于推广，缺乏直接证明作者身份的权威信息。维基百科页面提供了关键证据，明确将该网站列为Mustafa Suleyman的官方网站。Eric Topol的评论文章作为可靠媒体来源，进一步... |
| Noam Shazeer | Character.ai | replace_source | Noam Shazeer - TIME (time.com) | 原来源（Character.ai维基百科页面）是公司页面，未直接关联人物。候选中的TIME报道是权威媒体，明确说明Noam Shazeer是Character.AI的联合创始人兼CEO，满足证据要求，可作为替换来源。 |
| Oriol Vinyals | Natural Language Understanding | replace_source | Oriol Vinyals - Google Research (research.google) | 原始来源未提及个人，候选中谷歌官方个人资料页最权威，能直接证明其职位与研究领域，适合作为替换来源。其他候选要么内容不足，要么非官方或需额外验证。 |
| Percy Liang | Faculty by Research Focus \| Computer Science - CS Stanford | replace_source | Percy Liang's Profile \| Stanford Profiles (profiles.stanford.edu) | 原始来源是斯坦福教职列表片段，未直接包含Percy Liang的具体信息。候选中的斯坦福官方个人资料页（profiles.stanford.edu）直接、权威地证明了其职位和研究焦点，是理想的替换来源。其他候选要么非官方，要么证据不完整。 |
| Percy Liang | Percy Liang | replace_source | Percy Liang - Stanford Profiles (profiles.stanford.edu) | 原始来源（DBLP）内容为空，无法提供有效信息。候选来源中，斯坦福大学官方个人资料页（profiles.stanford.edu）是权威、可访问且直接证明Percy Liang职位、研究方向和所属机构的最佳来源，完全符合证据要求，可直接替... |
| Quoc Le | Sang Michael Xie - Stanford Computer Science | no_good_source |  | 候选来源均为Sang Michael Xie的个人资料、论文列表或社交媒体，未提及Quoc Le。无法证明Quoc Le与Sang Michael Xie的关联，因此无法替换或补强原始来源。 |
| Quoc Le | Transformer (deep learning architecture) | human_review |  | 候选来源中，YouTube视频提及Quoc Le但主题不直接相关；论文详情页未显示作者信息或作者列表不含Quoc Le。缺乏权威来源直接证明Quoc Le对Transformer架构的贡献。需要更明确的官方资料或可靠采访。 |
| Sam Altman | https://www.cnn.com/2023/05/16/tech/sam-altman-openai-congress | replace_source | Sam Altman - Forbes (forbes.com)<br>Sam Altman \| Biography, OpenAI, ChatGPT, & Microsoft \| Britannica Money (britannica.com) | 原来源CNN文章经QA判定不涉及Sam Altman，需替换。候选中Forbes和Britannica的官方资料页权威性高，直接证明其职位和与OpenAI、Y Combinator的关系，符合证据要求。其他候选多为事件报道、转录或社交媒体... |
| Sam Altman | How We Chose the TIME100 Most Influential People in AI | replace_source | Sam Altman: The 100 Most Influential People in AI 2025 - TIME (time.com) | 原始来源内容与Sam Altman无关，需替换。候选中的TIME官方页面直接列出Sam Altman为2025年TIME100 AI影响力人物，权威且相关，可作为替换来源。 |
| Sam Altman | Research | replace_source | Does Sam Altman Know What He's Creating? - The Atlantic (theatlantic.com)<br>Transcript for Sam Altman: OpenAI, GPT-5, Sora, Board Saga, Elon ... (lexfridman.com) | 原来源（OpenAI研究页面）未聚焦Sam Altman个人。候选中，《大西洋月刊》深度报道和Lex Fridman播客转录均直接、权威地证明了Sam Altman作为OpenAI CEO在AI研究领域的核心角色与观点，符合证据要求，可有... |
| Sam Altman | The Case That A.I. Is Thinking | human_review |  | 所有候选来源均未直接提及或关联目标作品《The Case That A.I. Is Thinking》。它们主要是Sam Altman的其他访谈、报道或社交媒体内容，无法证明该作品与他的关系。需要进一步搜索以确认该作品是否确实与Sam A... |
| Wojciech Zaremba | https://arxiv.org/pdf/2310.01405 | augment_source | Alumni Q&A with Wojciech Zaremba, Co-Founder of OpenAI (cims.nyu.edu)<br>Wojciech Zaremba \| DeepAI (deepai.org) | 原来源为arXiv拦截页面，完全无效。候选中NYU校友访谈和DeepAI资料页能直接证明其教育背景、OpenAI联合创始人及机器人团队负责人身份，可作为权威补充来源。其他候选因权威性不足或证据不直接而被拒绝。 |
| Wojciech Zaremba | GPT-4 contributions | augment_source | Alumni Q&A with Wojciech Zaremba, Co-Founder of OpenAI (cims.nyu.edu)<br>Wojciech Zaremba - keynote speaker (gspeakers.com) | 原始来源（GPT-4贡献者名单）未在文本中提及目标人物，无法直接证明其贡献。候选来源中，NYU校友访谈和演讲者资料页均权威且明确提及Zaremba作为OpenAI联合创始人的身份，可补强其与OpenAI及核心项目的关联，但未直接证明其对G... |
| Yann LeCun | Convolutional networks for images, speech, and time series | replace_source | Yann LeCun - AI at Meta (ai.meta.com)<br>[bib2web] Yann LeCun's Publications (yann.lecun.com) | 原始来源（HAL存档）缺乏具体人物信息。候选中的Meta官方页面和个人出版物页面能权威证明Yann LeCun的身份及其与卷积网络研究的关联，可有效替换或补强。 |
| Yann LeCun | Deep learning | replace_source | Yann LeCun - AI at Meta (ai.meta.com)<br>Yann LeCun \| NYU Tandon School of Engineering (engineering.nyu.edu) | 原来源为一般性深度学习文章，未专门关联Yann LeCun。候选中Meta官方页面和NYU教员页面均直接证明其职位与AI研究角色，权威且可访问，适合作为替换来源以支持人物与深度学习的关联。 |
| Yann LeCun | Gradient-based learning applied to document recognition | replace_source | [PDF] Gradient-based Learning Applied to Document Recognition (pdfs.semanticscholar.org) | 原始来源因内容乱码被拒绝。候选中，Semantic Scholar的PDF是权威学术来源，标题和作者列表明确包含Yann LeCun，可直接证明其是论文作者，满足证据要求。其他候选要么内容不可读，要么权威性不足。 |
| Yann LeCun | Yann LeCun's Music Page | replace_source | Yann LeCun's Home Page (yann.lecun.com) | 原始音乐页面是Yann LeCun个人网站的一部分，其官方主页（yann.lecun.com）的导航栏明确包含“MUSIC”链接，这直接证明了该音乐页面是其个人兴趣的官方展示，符合权威、可访问的要求。 |
| Yoshua Bengio | Markovian Models for Sequential Data Yoshua Bengio > ... | replace_source | [PDF] Markovian Models for Sequential Data - UPenn CIS (cis.upenn.edu) | 原始来源为乱码PDF，无法使用。候选中UPenn的PDF是同一论文的清晰版本，直接证明Yoshua Bengio是作者，且内容可读，符合权威、可访问、直接证明的要求。 |
| Yoshua Bengio | Superintelligent Agents Pose Catastrophic Risks: Can Scientist AI Offer a Safer Path? | replace_source | Superintelligent Agents Pose Catastrophic Risks — Can Scientist AI Offer a Safer Path? \| Richard M. Karp Distinguished Lecture (simons.berkeley.edu) | 候选来源中，伯克利西蒙斯研究所的官方活动页是最佳选择。它直接、权威地证明了Yoshua Bengio就该主题进行了演讲，完全符合证据要求，可替换原始的arXiv占位符页面。 |
| 乔尔·皮诺 | Meta AI Research Head Joelle Pineau resigns amid AI race | replace_source | Meta AI Research Head Leaves As AI Investment Soars Into the Billions - Business Insider (businessinsider.com) | 候选来源中，Business Insider的文本预览明确包含乔尔·皮诺的职位、离职原因及LinkedIn声明，是权威媒体且证据充分，可直接替换原失效来源。其他候选来源的文本预览多为网站导航或登录墙，无法确认内容。 |

## Execution Rule

- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.
- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.
- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.
