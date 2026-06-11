# Refetch Source by Search + MiMo

Generated at: 2026-06-10T18:36:46.736Z
Remediation input: docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch17.jsonl
Search provider: tavily
Model: mimo-v2.5-pro

## Counts

| Metric | Value |
| --- | --- |
| selected tasks | 20 |
| existing rows reused | 0 |
| pending tasks | 0 |
| refetch results | 20 |
| source candidates | 195 |
| selected sources | 24 |

## Decisions

| Decision | Count |
| --- | --- |
| augment_source | 7 |
| replace_source | 7 |
| human_review | 4 |
| no_good_source | 2 |

## Selected Hosts

| Host | Count |
| --- | --- |
| ai.meta.com | 2 |
| jyothirsv.github.io | 1 |
| atcold.github.io | 1 |
| cdn.openai.com | 1 |
| essential.ai | 1 |
| zh.wikipedia.org | 1 |
| papers.neurips.cc | 1 |
| cs.stanford.edu | 1 |
| karpathy.ai | 1 |
| time.com | 1 |
| polytechnique.edu | 1 |
| colah.github.io | 1 |
| digg.com | 1 |
| x.com | 1 |
| news.berkeley.edu | 1 |
| cnbc.com | 1 |
| lexfridman.com | 1 |
| cs.mcgill.ca | 1 |
| en.wikipedia.org | 1 |
| lerandom.art | 1 |
| youtube.com | 1 |
| hai.stanford.edu | 1 |
| developer.volcengine.com | 1 |

## Sample Results

| Person | Target | Decision | Sources | Reason |
| --- | --- | --- | --- | --- |
| Oriol Vinyals | I spent many (unsuccessful) hours trying this just 6 months ago. Feeling the AGY. | human_review |  | 候选来源均未直接提及“尝试此方法”或“AGY”等具体表述，无法替换或补强原始推文。原始推文来自官方账号，但表述模糊，信息密度低。需要更具体的采访、播客转录或文章来证明该言论。 |
| Quoc Le | To feel the AGI, I prompted Gemini 3 Deep Think | no_good_source |  | 候选来源均未直接提及Quoc Le，无法证明“To feel the AGI, I prompted Gemini 3 Deep Think”这一陈述与其个人关联。需要寻找能明确将Quoc Le与该陈述或其对Gemini Deep Thi... |
| Richard Socher | What calculus was for physics, AI is for biology. | human_review |  | 所有候选来源均未在文本预览中包含目标引语的具体内容，无法直接证明该比喻出自Richard Socher之口或其权威性。需要更精确的搜索以找到包含此引语的原始出处（如采访、演讲转录）。 |
| Yann LeCun | A stack of log(n)/2 layers convolutions with two complex features maps with kernel size 2... | human_review |  | 候选来源均为 LeCun 的权威资料或相关主题文章，但无一能直接证明目标推文中描述的具体架构（log(n)/2层、两个复杂特征图、核大小2、变量重排）属于 LeCun 的工作或观点。需要更精确的匹配来源或人工评估推文内容是否值得入库。 |
| Yann LeCun | Gradient-based planning works if you do it right 😁 | augment_source | [PDF] Gradient-based Planning with World Models - Jyothir S V (jyothirsv.github.io) | 候选来源中，一篇关于梯度规划的论文PDF直接包含Yann LeCun作为作者，能权威地支持其观点。其他来源要么内容不直接相关，要么未明确提及目标陈述。建议用此论文来源补强原推文。 |
| Yann LeCun | True story. I've been co-teaching the graduate-level Deep Learning class with Alfredo eve... | augment_source | DEEP LEARNING · Deep Learning (atcold.github.io)<br>Yann LeCun - AI at Meta (ai.meta.com) | 原来源为推文，信息简短。候选中NYU课程官方页面直接证明合教关系，Meta官方页面提供职位背景，两者结合可有效补强证据链，提升信息权威性与完整性。 |
| 亚历克·拉德福德 | These are 8-grams of the byte-level bpe tokens and are probably closer to 5-6 grams 'norm... | augment_source | [PDF] Language Models are Unsupervised Multitask Learners \| OpenAI (cdn.openai.com) | 原始来源为本人推文，内容碎片化。候选中OpenAI官方论文是权威来源，明确列出亚历克·拉德福德为作者，可补强其与GPT-2及BPE技术关联的上下文，提升来源质量。 |
| 埃里克·霍维茨 | The 2026 Microsoft Research Fellowship program is now open for submissions. Calling for p... | human_review |  | 候选来源均为奖学金项目的官方或转载页面，但均未提及埃里克·霍维茨本人。无法确认其在该项目中的具体角色（如发起人、负责人）。需要寻找能明确证明其个人与该项目关联的权威来源，如机构任命公告、本人官方声明或可靠媒体报道。 |
| 桑达尔·皮查伊 | AI-powered calling to local businesses, rolling out to all users in the US. | no_good_source |  | 所有候选来源均未能直接证明桑达尔·皮查伊与“AI-powered calling to local businesses”功能的具体关联。通用人物传记页面未提及此功能，而产品功能报道均未提及皮查伊本人。原始来源（推特）虽为官方发布，但内容... |
| 阿希什·瓦斯瓦尼 | //www.essential.ai/research/rnj-1 | replace_source | Announcing Rnj-1: Building Instruments of Intelligence (essential.ai) | 候选来源中，essential.ai/research/rnj-1 是官方博客，由阿希什·瓦斯瓦尼本人署名，直接证明其与 Rnj-1 模型的关系，符合权威、可访问、直接证明的要求。其他来源如 Wikipedia 或新闻文章可作为辅助，但不... |
| 阿希什·瓦斯瓦尼 | //x.com/ashVaswani/status/1935136323565928967 | augment_source | 阿西什·瓦斯瓦尼 - 维基百科，自由的百科全书 (zh.wikipedia.org)<br>[PDF] Attention is All you Need - NIPS (papers.neurips.cc) | 原始来源仅为一个X/Twitter链接，缺乏实质内容。候选来源中，维基百科和原始论文PDF能有效补强人物背景和核心贡献。维基百科作为辅助背景信息，论文PDF作为直接证据。其他候选来源权威性不足或内容不完整。 |
| Andrej Karpathy | Andrej Karpathy | replace_source | Andrej Karpathy Academic Website - Stanford Computer Science (cs.stanford.edu)<br>Andrej Karpathy (karpathy.ai) | 原始来源仅为GitHub主页，缺乏实质信息。候选中的斯坦福学术页面和个人官网是权威、可访问的直接来源，能明确证明其职位和贡献，适合替换。 |
| Arthur Mensch | Arthur Mensch arthurmensch | replace_source | Arthur Mensch: The 100 Most Influential People in AI 2024 (time.com)<br>Arthur Mensch, CEO of Mistral, acting as a big brother at École Polytechnique, on AI and entrepreneurship - École polytechnique (polytechnique.edu) | 原始来源（GitHub页面）缺乏实质内容。候选来源中，TIME的专题报道和巴黎综合理工学院的官方新闻页面均能权威、直接地证明Arthur Mensch作为Mistral AI CEO兼联合创始人的身份，且内容可访问、信息明确，适合作为替换... |
| Chris Olah | About Me \| Christopher Olah's Blog - WordPress.com | replace_source | Christopher Olah - colah's blog (colah.github.io) | 原始来源（WordPress博客的“关于我”页面）内容过时且与AI/ML关联弱。colah.github.io/about.html是Chris Olah的官方个人主页，清晰阐述其当前职位、研究领域和职业经历，是权威且直接的替代来源。 |
| Chris Olah | Christopher Olah colah | augment_source | Chris Olah (@ch402) · Digg (digg.com)<br>Chris Olah (@ch402) / Posts / X - Twitter (x.com) | 原始来源（GitHub主页）信息不足。候选中，Digg和X的页面提供了Chris Olah的官方简介和职位信息，可作为补充来源。其他候选或因内容不相关，或因缺少关键信息（如转录、人物姓名）而被拒绝。 |
| John Schulman | John Schulman joschu | replace_source | ChatGPT architect, Berkeley alum John Schulman on his journey with AI - Berkeley News (news.berkeley.edu)<br>OpenAI co-founder John Schulman says he will join rival Anthropic (cnbc.com) | 原始来源（GitHub页面）仅显示登录状态，无实质内容。候选来源中，伯克利大学官方新闻和CNBC报道均权威、可访问，且直接确认了John Schulman作为OpenAI联合创始人的身份和最新职业动向，能有效替换原始来源。其他来源要么权威... |
| Wojciech Zaremba | wojzaremba - Overview | replace_source | #215 - Wojciech Zaremba: OpenAI Codex, GPT-3, Robotics, and the Future of AI (lexfridman.com) | 原来源仅为GitHub个人主页，缺乏实质性信息。候选中Lex Fridman播客页面是权威访谈来源，标题和描述明确证明Wojciech Zaremba作为OpenAI联合创始人的身份，符合证据要求。其他候选或权威性不足，或证据不够直接。 |
| 乔尔·皮诺 | Joelle Pineau - Deep learning models for natural language ... | replace_source | Joelle Pineau - AI at Meta (ai.meta.com)<br>Joelle Pineau's Home - McGill School Of Computer Science (cs.mcgill.ca) | 原始来源（YouTube视频）缺乏实质内容。候选中，Meta官方主页和麦吉尔大学个人主页是权威、可访问的来源，能直接证明乔尔·皮诺的职位、机构及研究领域（包括自然语言处理相关方向），适合作为替换来源。其他候选或主题不匹配，或信息不足。 |
| 亚历克·拉德福德 | Alec Radford Newmu | augment_source | Alec Radford - Wikipedia (en.wikipedia.org)<br>THE PEOPLE ARE IN THE COMPUTER—PART I - Le Random (lerandom.art)<br>L11 Language Models -- guest instructor: Alec Radford (OpenAI) (youtube.com) | 候选来源中，维基百科提供了权威的生平概述，Le Random文章提供了详细的人物故事和贡献描述，YouTube视频直接证明了其专家身份。这些来源共同补强了原始来源的不足，建立了人物与OpenAI、GPT等关键作品的明确关联。社交媒体来源虽... |
| 吴恩达 | A personal message from Co-founder Andrew Ng | augment_source | Andrew Ng \| Stanford HAI (hai.stanford.edu)<br>AI人物传：DeepLearning.AI创始人吴恩达Andrew Ng - 文章 - 开发者社区 - 火山引擎 (developer.volcengine.com) | 原始来源抓取失败，无正文内容。候选中，斯坦福HAI页面和火山引擎人物传记均能权威证明吴恩达与Coursera的关联及个人背景，可补强证据。其他候选或权威性不足，或内容不相关。 |

## Execution Rule

- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.
- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.
- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.
