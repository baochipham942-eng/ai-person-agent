# Refetch Source by Search + MiMo

Generated at: 2026-06-10T16:02:15.521Z
Remediation input: docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch8.jsonl
Search provider: tavily
Model: mimo-v2.5-pro

## Counts

| Metric | Value |
| --- | --- |
| selected tasks | 20 |
| existing rows reused | 7 |
| pending tasks | 0 |
| refetch results | 20 |
| source candidates | 191 |
| selected sources | 33 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 14 |
| augment_source | 5 |
| human_review | 1 |

## Selected Hosts

| Host | Count |
| --- | --- |
| forbes.com | 4 |
| nobelprize.org | 3 |
| time.com | 2 |
| polytechnique.edu | 2 |
| allamericanspeakers.com | 2 |
| stability.ai | 2 |
| aidangomez.ca | 1 |
| alexw.substack.com | 1 |
| mastersofscale.com | 1 |
| docs.getunbound.ai | 1 |
| linkedin.com | 1 |
| youtube.com | 1 |
| dwarkesh.com | 1 |
| anthropic.com | 1 |
| 80000hours.org | 1 |
| colah.github.io | 1 |
| nlp.stanford.edu | 1 |
| corporate-awards.ieee.org | 1 |
| darioamodei.com | 1 |
| achievement.org | 1 |
| isomorphiclabs.com | 1 |
| podcasts.apple.com | 1 |
| discover.research.utoronto.ca | 1 |
| cs.toronto.edu | 1 |

## Sample Results

| Person | Target | Decision | Sources | Reason |
| --- | --- | --- | --- | --- |
| Aidan Gomez | Contact Aidan Gomez \| Computer Science & Mathematics | replace_source | Aidan Gomez \| Computer Science & Mathematics (aidangomez.ca)<br>Aidan Gomez: The 100 Most Influential People in AI 2023 - TIME (time.com) | 原始来源仅包含联系方式，信息密度低。候选来源中，个人官方网站（aidangomez.ca）提供了最权威、完整的个人背景信息，直接证明其身份和职业。TIME的报道作为权威媒体补充，进一步确认其Transformer论文作者身份。两者结合可有... |
| Alexandr Wang | Alexandr Wang \| Substack: Rational in the Fullness of Time | augment_source | Archive - Rational in the Fullness of Time (alexw.substack.com) | 原始来源（Substack主页）抓取内容不足，但其存档页（archive）明确列出了Alexandr Wang的多篇署名文章，直接、权威地证明了该Substack是其个人写作平台，符合证据要求。其他候选来源要么是单一文章，要么是外部平台，... |
| Alexandr Wang | Alexandr Wang on Masters of Scale | replace_source | Alexandr Wang on Masters of Scale (mastersofscale.com) | 原始来源页面因cookie提示和导航导致内容未加载，无法验证。候选中的mastersofscale.com官方人物页面内容完整，明确显示Alexandr Wang的职位、公司及与Masters of Scale节目的关联，符合权威、可访问... |
| Andrej Karpathy | Andrej Karpathy's LLM COUNCIL \| Fully Explained \| by NSAI | augment_source | Andrej Karpathy's LLM Council - Unbound Security (docs.getunbound.ai)<br>Andrej Karpathy (OpenAI co-founder) just open-sourced something that changes how you should be making business decisions. It's called LLM Council. Here's what it does: Forces ChatGPT, Claude… \| Nicholas Puruczky (linkedin.com) | 原始来源是第三方解读文章，权威性不足。候选中，Unbound Security的官方文档页面明确将LLM Council归功于Karpathy，是权威补充。LinkedIn帖子也提供了直接归因，可作为辅助。其他候选与LLM Council... |
| Andrej Karpathy | Why an AI Pioneer Says LLMs Are Like ‘People Spirits’ Trapped in Your Computer | augment_source | Andrej Karpathy — “We're summoning ghosts, not building animals” (youtube.com)<br>Andrej Karpathy — AGI is still a decade away - Dwarkesh Podcast (dwarkesh.com) | 原始来源为Medium文章，权威性不足。候选中Dwarkesh Podcast的官方页面和YouTube视频（标题和描述明确）可作为权威补充，证明Andrej Karpathy本人参与并讨论相关观点。其他候选多为社媒、博客或第三方转录，权... |
| Arthur Mensch | Arthur Mensch | replace_source | Arthur Mensch, CEO of Mistral, acting as a big brother at École ... (polytechnique.edu)<br>Arthur Mensch \| Speaking Fee \| Booking Agent (allamericanspeakers.com) | 原始来源（Wikidata）信息密度低，需替换。候选中有两个权威来源：École Polytechnique官方页面和专业演讲者资料页，均明确证明Arthur Mensch是Mistral AI的联合创始人兼CEO，符合证据要求。 |
| Arthur Mensch | Arthur Mensch \| | replace_source | Arthur Mensch \| Speaking Fee \| Booking Agent (allamericanspeakers.com)<br>Arthur Mensch, CEO of Mistral, acting as a big brother at École ... (polytechnique.edu) | 候选来源中，All American Speakers页面和École Polytechnique官方新闻页面均直接、权威地证明了Arthur Mensch作为Mistral AI联合创始人兼CEO的身份，信息完整且可访问，适合作为替换来... |
| Chris Olah | Christopher Olah - ACL Anthology | augment_source | Anthropic co-founder Chris Olah's remarks on Pope Leo XIV's encyclical "Magnifica humanitas" (anthropic.com)<br>Chris Olah on what the hell is going on inside neural networks (80000hours.org) | 原始ACL Anthology页面仅列论文元数据，信息薄弱。候选中Anthropic官方页和80,000 Hours播客页能直接证明Chris Olah的职位（联合创始人）和研究观点，可补强来源。其他候选或为辅助线索，或证据不足。 |
| Chris Olah | Christopher Olah - Member Of Technical Staff at Anthropic | replace_source | Christopher Olah - colah's blog (colah.github.io)<br>Chris Olah: The 100 Most Influential People in AI 2024 - TIME (time.com) | 原LinkedIn来源信息薄弱。候选中，本人官方博客（colah.github.io）是最佳替代，直接证明其Anthropic联合创始人身份。TIME文章作为权威媒体补充，增强可信度。其他来源或因权威性不足，或因证据不直接而被拒绝。 |
| Christopher Manning | Chris Manning – Stanford Artificial Intelligence Laboratory | replace_source | Christopher Manning, Stanford NLP (nlp.stanford.edu)<br>Christopher Manning \| IEEE Awards (corporate-awards.ieee.org) | 原始来源（斯坦福AI实验室主页）抓取内容信息密度低。候选中的NLP官方个人主页和IEEE奖项页面均为权威机构来源，能直接、清晰地证明Christopher Manning与斯坦福人工智能实验室（SAIL）的职位关系，是理想的替换来源。 |
| Dario Amodei | Dario Amodei (1983-) - GM-RKB | replace_source | Dario Amodei (darioamodei.com) | 候选来源中，darioamodei.com 是本人官方主页，提供了最权威、直接的生平、教育和职业信息，完全符合证据要求，可完美替换原GM-RKB页面。其他来源要么权威性不足，要么信息不够核心。 |
| Demis Hassabis | Demis Hassabis | replace_source | Demis Hassabis – Interview - NobelPrize.org (nobelprize.org)<br>Sir Demis Hassabis \| Academy of Achievement (achievement.org) | 原始维基百科来源抓取失败，仅含导航栏。候选中诺贝尔奖官网和成就学院页面权威性高，能直接证明人物身份（诺贝尔奖得主、DeepMind联合创始人兼CEO），适合作为替换来源。其他候选要么权威性不足，要么抓取内容不完整。 |
| Demis Hassabis | Sir Demis Hassabis | replace_source | Transcript from an interview with Demis Hassabis (nobelprize.org)<br>Sir Demis Hassabis, PhD - Isomorphic Labs (isomorphiclabs.com) | 候选来源中，诺贝尔奖官方采访转录和其创立公司的官方人物页面是权威、可访问且能直接证明人物身份与成就（包括“Sir”头衔和诺贝尔奖）的最佳来源。其他来源或权威性不足，或存在访问障碍，或内容不直接相关。 |
| Elon Musk | I Hope Artificial Intelligence Is Nice to Us | human_review |  | 所有候选来源都证实了Elon Musk对人工智能的公开评论和担忧，但没有任何一个来源提及或关联到标题为 'I Hope Artificial Intelligence Is Nice to Us' 的特定论文或作品。原始来源的标题与内容不... |
| Emad Mostaque | Emad Mostaque | augment_source | Stability AI Founder Emad Mostaque Tanked His Billion-Dollar Startup (forbes.com)<br>Stable Diffusion's AI Benefactor Has A History Of Exaggeration (forbes.com)<br>EP 46: Emad Mostaque (Founder/… – The Logan Bartlett Show – Apple Podcasts (podcasts.apple.com) | 候选来源中，Forbes的两篇深度报道和Apple Podcasts的播客页面能有效补强原维基百科来源信息密度低的问题。这些来源权威性高，明确提及人物身份、职位和贡献，符合证据要求。其他来源权威性不足或信息有限，予以拒绝。 |
| Emad Mostaque | Emad Mostaque — Stability AI Founder - Gabriel Varela - Medium | replace_source | Stability AI Announcement (stability.ai)<br>Stability AI Founder Emad Mostaque Tanked His Billion-Dollar Startup (forbes.com) | 原始Medium来源质量低，缺乏实质内容。候选中，Stability AI官方公告和福布斯报道均权威、可访问，且直接证明Emad Mostaque作为Stability AI创始人及CEO的身份，适合作为替换来源。 |
| Emad Mostaque | Kenrick Cai on LinkedIn: Stability AI Founder Emad Mostaque Plans To Resign As CEO, Sourc... | replace_source | Stability AI Founder Emad Mostaque Plans To Resign As CEO, Sources Say (forbes.com) | 原始来源为LinkedIn登录墙页面，质量低。候选中的Forbes文章由原作者Kenrick Cai撰写，权威报道了Emad Mostaque计划辞职的消息，内容完整可访问，是理想的替换来源。 |
| Emad Mostaque | TechMarketView | replace_source | Stability AI Announcement (stability.ai) | 原始来源TechMarketView页面信息不完整，无法可靠证明人物与职位关系。候选来源中，Stability AI官方公告直接、权威地确认了Emad Mostaque的CEO身份及辞职事实，是理想的替换来源。 |
| Geoffrey Hinton | Geoffrey Hinton | replace_source | Transcript from an interview with Geoffrey Hinton - NobelPrize.org (nobelprize.org)<br>Geoffrey E Hinton \| About \| University of Toronto (discover.research.utoronto.ca) | 原始维基百科来源内容不足。候选来源中，诺贝尔奖官网的采访转录和多伦多大学官方研究资料页是权威、可访问且直接证明人物身份与成就的优质来源，可有效替换或补强。 |
| Geoffrey Hinton | Rectified Linear Units Improve Restricted Boltzmann Machines | replace_source | [PDF] Rectified Linear Units Improve Restricted Boltzmann Machines (cs.toronto.edu) | 原始来源（OpenAlex）未直接提及作者姓名。候选中，多伦多大学官方托管的论文PDF明确列出了Geoffrey Hinton作为作者，是证明其与该论文关系的权威、可访问的一手来源，可直接替换原始来源。 |

## Execution Rule

- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.
- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.
- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.
