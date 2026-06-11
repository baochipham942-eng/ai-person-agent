# Refetch Source by Search + MiMo

Generated at: 2026-06-10T15:00:18.422Z
Remediation input: docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch5.jsonl
Search provider: tavily
Model: mimo-v2.5-pro

## Counts

| Metric | Value |
| --- | --- |
| selected tasks | 20 |
| existing rows reused | 0 |
| pending tasks | 0 |
| refetch results | 20 |
| source candidates | 184 |
| selected sources | 34 |

## Decisions

| Decision | Count |
| --- | --- |
| augment_source | 11 |
| replace_source | 8 |
| human_review | 1 |

## Selected Hosts

| Host | Count |
| --- | --- |
| en.wikipedia.org | 3 |
| time.com | 3 |
| stvp.stanford.edu | 2 |
| forbes.com | 2 |
| hwchung2.github.io | 2 |
| podcasts.happyscribe.com | 1 |
| britannica.com | 1 |
| npr.org | 1 |
| theguardian.com | 1 |
| space50.caltech.edu | 1 |
| bbc.com | 1 |
| podcasts.apple.com | 1 |
| openuk.uk | 1 |
| stability.ai | 1 |
| nature.com | 1 |
| technologyreview.com | 1 |
| wbur.org | 1 |
| nobelprize.org | 1 |
| wired.com | 1 |
| linkedin.com | 1 |
| jbd.dev | 1 |
| spanner.fyi | 1 |
| tedai-vienna.ted.com | 1 |
| ted.com | 1 |
| cnbc.com | 1 |
| blogs.microsoft.com | 1 |
| mustafa-suleyman.ai | 1 |

## Sample Results

| Person | Target | Decision | Sources | Reason |
| --- | --- | --- | --- | --- |
| Daniela Amodei | Daniela Amodei - President And Co-founder at Anthropic \| The Org | augment_source | Daniela Amodei - Wikipedia (en.wikipedia.org) | 原始来源The Org页面信息基础，质量一般。维基百科页面作为权威的二级来源，明确确认了Daniela Amodei作为Anthropic总裁兼联合创始人的身份，符合证据要求，可作为可靠替换。 |
| Daniela Amodei | Daniela Amodei - President at Anthropic | replace_source | Daniela Amodei - Wikipedia (en.wikipedia.org)<br>Daniela Amodei (Anthropic) – 'Helpful, Honest, Harmless' AI (stvp.stanford.edu) | 候选来源中，维基百科和斯坦福大学页面能直接、权威地证明Daniela Amodei作为Anthropic总裁的身份，符合证据要求。其他来源要么权威性不足，要么为社交媒体/UGC，或文本预览未提供关键信息。 |
| Daniela Amodei | Daniela Amodei (Anthropic) - ‘Helpful, Honest, Harmless’ AI | augment_source | Daniela Amodei (Anthropic) – 'Helpful, Honest, Harmless' AI (stvp.stanford.edu)<br>Daniela Amodei - Wikipedia (en.wikipedia.org) | 斯坦福官方页面直接匹配主题且权威，可作为主要补充来源；维基百科提供人物背景和职位信息，增强来源多样性。其他候选因缺乏可访问内容或权威性不足被拒绝。 |
| Elon Musk | Elon Musk (Isaacson book) | augment_source | Walter Isaacson On Musk's Legacy and His Biography (time.com)<br>Introducing: On Musk with Walter Isaacson — On Musk with Walter Isaacson Transcript (podcasts.happyscribe.com) | 原Wikipedia来源权威性不足。候选中，《时代》采访和播客转录均直接涉及传记作者艾萨克森及其关于马斯克的著作，可作为书籍存在的可靠旁证，补强原来源。但两者均非书籍官方主页或出版商页面，故作为补强而非替换。 |
| Elon Musk | Elon Musk runs X, Tesla, SpaceX, and DOGE, and has become one of DC's most powerful playe... | augment_source | Elon Musk \| SpaceX, Tesla, xAI, X, & PayPal \| Britannica Money (britannica.com)<br>Who is part of Elon Musk’s DOGE, and what are they doing? : NPR (npr.org) | 候选来源中，Britannica和NPR能有效补强原始来源。Britannica作为权威百科，明确列出马斯克在多家公司的领导角色；NPR作为可靠媒体，直接报道其与DOGE的关联。两者结合可全面支持原始主张，且符合证据要求。 |
| Elon Musk | Elon Musk Tops Forbes’ 39th Annual Billionaires List | replace_source | Elon Musk (forbes.com) | 原始来源链接失效，需替换。福布斯官方个人资料页（forbes.com/profile/elon-musk）是权威来源，能直接证明Elon Musk与福布斯富豪榜的关系，符合证据要求。其他候选来源要么权威性不足，要么内容不直接相关。 |
| Elon Musk | Elon Musk, AI and the antichrist: the biggest tech stories of ... | augment_source | Elon Musk, AI and the antichrist: the biggest tech stories of 2025 \| Technology \| The Guardian (theguardian.com)<br>50 Years in Space - Elon Musk (space50.caltech.edu) | 原始卫报文章标题直接关联Elon Musk和AI，可作为主要来源。加州理工页面提供了权威的机构背景，证明其职位和公司。其他候选来源要么是社媒，要么权威性不足或内容不直接相关。建议用这两个来源补强，以支持Elon Musk与AI及科技故事的... |
| Elon Musk | Open letter on artificial intelligence | replace_source | Elon Musk Signs Open Letter Urging AI Labs to Pump the Brakes (time.com)<br>Elon Musk among experts urging a halt to AI training (bbc.com) | 原始来源（维基百科）内容薄弱，未直接证明马斯克与公开信的关系。候选中的Time和BBC报道标题明确，权威性高，能直接替换原始来源，证明马斯克是签署者。 |
| Emad Mostaque | The Future of Work in 2025 \| Emad Mostaque | augment_source | AI Will End Human Jobs: Emad M…–Digital Disruption with Geoff Nielson – Apple Podcasts (podcasts.apple.com)<br>Stability AI Founder Emad Mostaque Tanked His Billion-Dollar Startup (forbes.com) | 原始YouTube来源信息密度低，需补充权威来源。Forbes报道和Apple Podcasts描述均直接关联Emad Mostaque本人及其观点，可补强人物与未来工作主题的关联。LinkedIn等社交媒体来源仅作辅助。 |
| Emad Mostaque | The UK organisation for the business of Open Technology | augment_source | Emad Mostaque, Founder, Stability AI from State of Open: The UK in 2024 Phase One - OpenUK (openuk.uk)<br>Stability AI Announcement — Stability AI (stability.ai) | 原始来源（OpenUK页面）质量偏低，但候选中OpenUK官方活动页面和Stability AI官方公告可补强。前者直接证明人物参与OpenUK活动，后者权威证明其CEO职位。两者结合可增强人物与组织/职位关联的证据链。 |
| Geoffrey Hinton | Deep learning for AI | augment_source | Deep learning \| Nature (nature.com)<br>AI pioneer Geoff Hinton: “Deep learning is going to be able to do ... (technologyreview.com) | 原始来源未明确提及Hinton本人。候选中，MIT Technology Review的专访直接引用Hinton关于深度学习的观点，是强匹配来源。Nature综述虽未提Hinton，但作为深度学习领域的权威背景，可作为技术补充。两者结合可... |
| Geoffrey Hinton | Geoffrey Hinton: AI Is the Next Industrial Revolution | replace_source | Geoffrey Hinton: AI Is the Next Industrial Revolution (time.com) | 原始来源time.com文章标题与claim完全一致，且明确标注作者为Geoffrey Hinton本人，内容直接阐述其观点，是权威、可访问的首选替换来源。其他候选来源要么观点不完全匹配，要么权威性不足。 |
| Geoffrey Hinton | The ‘Godfather of AI’ says we can’t afford to get it wrong | augment_source | The ‘Godfather of AI’ says we can’t afford to get it wrong \| On Point with Meghna Chakrabarti (wbur.org)<br>Transcript from an interview with Geoffrey Hinton - NobelPrize.org (nobelprize.org) | 原始来源为播客页面，缺乏实质内容。候选中WBUR页面标题完全匹配且为权威媒体，诺贝尔奖官方转录权威性最高，两者均可补强来源。其他候选要么权威性不足，要么内容不直接匹配。 |
| Hyung Won Chung | Hyung Won Chung - AI research at Meta Superintelligence ... | augment_source | Hyung Won Chung (hwchung2.github.io)<br>Another High-Profile OpenAI Researcher Departs for Meta \| WIRED (wired.com) | 原LinkedIn来源信息简略。个人主页（hwchung2.github.io）是权威官方来源，详细列出其职位、研究贡献和经历。Wired报道直接证实其从OpenAI加入Meta的关键变动。两者结合可有效补强和替换原来源。 |
| Hyung Won Chung | 突发｜思维链开山作者Jason Wei被曝加入Meta，机器之心独家证实 | replace_source | Hyung Won Chung's Post - LinkedIn (linkedin.com)<br>Hyung Won Chung (hwchung2.github.io) | 候选来源中，Hyung Won Chung的LinkedIn帖子是本人官方声明，直接证实其与Jason Wei一同加入Meta超级智能实验室，是替换原始弱匹配来源的最佳选择。其GitHub主页可作为补充权威背景信息。 |
| Jaana Dogan | Bio - jbd.dev | augment_source | About · jbd.dev (jbd.dev)<br>About · spanner.fyi (spanner.fyi) | 原来源jbd.dev/bio页面缺少明确人物姓名和贡献描述，证据不足。候选中有两个官方“关于”页面（jbd.dev/about和spanner.fyi/about）明确作者为Jaana Dogan并介绍其背景，可作为权威补充来源，增强人物... |
| Lukasz Kaiser | Lukasz Kaiser - TEDAI 2025 | replace_source | TEDAI 2026 (tedai-vienna.ted.com)<br>Lukasz Kaiser: What if AI stops guessing and starts reasoning? (ted.com) | 原始来源（TEDAI 2025演讲者页面）信息较泛，但候选中提供了更权威的官方页面（TEDAI 2025小组成员页面和TED演讲页面），能直接证明Lukasz Kaiser与TEDAI 2025的关联及其角色，适合作为替换来源。其他候选来... |
| Mira Murati | Former OpenAI technology chief Mira Murati launches rival start-up | replace_source | Ex-OpenAI CTO Mira Murati raises $2 billion for new AI startup - CNBC (cnbc.com) | 原始来源因付费墙无法验证。CNBC文章标题直接、权威，明确支持Mira Murati创办竞争对手公司的核心主张，符合证据要求，可作为可靠替换。 |
| Mira Murati | Mira Murati's Open Source AI Breakthrough at Thinking ... | human_review |  | Expected double-quoted property name in JSON at position 1380 (line 24 column 3) |
| Mustafa Suleyman | Microsoft AI CEO, Mustafa Suleyman, On the Most Powerful, Exponential Technology in Human... | replace_source | Mustafa Suleyman, DeepMind and Inflection Co-founder, joins Microsoft to lead Copilot (blogs.microsoft.com)<br>Mustafa Suleyman (mustafa-suleyman.ai) | 原始来源仅为播客标题，缺乏实质内容。候选中，微软官方博客和本人官方网站均直接、权威地证明了Mustafa Suleyman现任微软AI CEO的职位，符合证据要求，可有效替换或补强原始来源。 |

## Execution Rule

- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.
- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.
- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.
