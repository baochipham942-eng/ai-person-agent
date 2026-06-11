# Prune Tail Remaining Manual Decisions

Generated at: 2026-06-10T21:02:12.141Z
Queue: docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl
Batches: 26

## Counts

| Metric | Value |
| --- | ---: |
| unresolved rows scanned | 96 |
| latest reject rows | 96 |
| missing RawPoolItem rows | 0 |
| dependency skipped | 7 |
| decisions | 89 |

## By Source Type

| Source | Count |
| --- | ---: |
| x | 59 |
| exa | 25 |
| youtube | 5 |

## By Person

| Person | Count |
| --- | ---: |
| Elon Musk | 10 |
| Mustafa Suleyman | 6 |
| 桑达尔·皮查伊 | 5 |
| Ilya Sutskever | 4 |
| Oriol Vinyals | 4 |
| 亚历克·拉德福德 | 4 |
| 杰夫·迪恩 | 4 |
| 科拉伊·卡武克丘奥卢 | 4 |
| 阿希什·瓦斯瓦尼 | 4 |
| Andrej Karpathy | 3 |
| Boris Cherny | 3 |
| Emad Mostaque | 3 |
| Greg Brockman | 3 |
| 埃里克·霍维茨 | 3 |
| 布莱恩·卡坦扎罗 | 3 |
| 李开复 | 3 |
| 李飞飞 | 3 |
| Lukasz Kaiser | 2 |
| Marc Andreessen | 2 |
| Quoc Le | 2 |
| Sam Altman | 2 |
| 黄仁勋 | 2 |
| David Ha | 1 |
| Demis Hassabis | 1 |
| Geoffrey Hinton | 1 |
| Hyung Won Chung | 1 |
| Jan Leike | 1 |
| Mira Murati | 1 |
| Noam Shazeer | 1 |
| Shane Legg | 1 |
| 吴恩达 | 1 |
| 李莲 | 1 |

## Decisions

| Person | Source | Refetch | Target | Reason |
| --- | --- | --- | --- | --- |
| Andrej Karpathy | exa | human_review | LLM Council: Andrej Karpathy’s AI for Reliable Answers | 内容带有明显的营销和课程推广性质，片段中有效信息密度极低。 |
| Demis Hassabis | exa | human_review | A new era of intelligence with Gemini 3 | 谷歌产品发布公告，与 Hassabis 个人关联度极低且内容空洞。 |
| Elon Musk | exa | no_good_source | Elon Musk's record $447 billion fortune means he's nearly $200 billion ahead of Jeff Bezo... | 内容为财富比较的新闻，虽涉及Elon Musk但缺乏AI/科技相关性且质量低。 |
| Greg Brockman | exa | human_review | Summarizing books with human feedback | 内容为 OpenAI 机构的研究发布，未直接提及或关于 Greg Brockman 本人。 |
| Greg Brockman | exa | no_good_source | They are admitting[1] that the new model is the gpt2- ... | Hacker News 的讨论帖网页片段，内容破碎且未指向目标人物。 |
| Hyung Won Chung | youtube | human_review | Cornell AI history lecture | 标题为Cornell AI历史讲座，内容未明确提及Hyung Won Chung，可能为他人。 |
| 李开复 | youtube | no_good_source | 2015.03.16中天青年論壇完整版【李開復－人生變奏曲】 | 侧重于人生理想与创业经验的泛泛谈论，缺乏 AI 领域的专业价值。 |
| 李开复 | youtube | no_good_source | 曾向得罪过的人道歉！李开复：患病后整个价值观改变了[大咖一日行第7期精彩看点] | 内容侧重于个人患病经历和人生感悟，与AI/科技行业相关性较低。 |
| 科拉伊·卡武克丘奥卢 | youtube | no_good_source | Under the hood with Google AI | 内容泛指谷歌领导层和 Gemini 产品，未直接关联到 Koray 个人。 |
| 阿希什·瓦斯瓦尼 | youtube | human_review | Lessons Learned From the Early Innings of AI | 泛论 AI 发展趋势，内容中未出现目标人物。 |
| Elon Musk | exa | no_good_source | Four takeaways from Walter Isaacson’s biography of Elon Musk \| CNN Business | 内容是关于马斯克传记的总结，但未突出AI/科技相关主题，信息偏传记性质。 |
| Elon Musk | exa | human_review | 美国国家工程院新增院士名单出炉，马斯克入选，张宏江、方岱宁等入选外籍院士！ | 内容报道马斯克入选美国国家工程院院士，属于荣誉事件，但与AI/科技行业关联不直接。 |
| Greg Brockman | exa | human_review | GPT-4o System Card | 这是 GPT-4o 的技术系统卡文档，不涉及 Greg Brockman 的个人信息。 |
| Mustafa Suleyman | exa | human_review | The AI Friend Zone | 标题提及Greylock的AI内容，但未明确关联Mustafa Suleyman本人。 |
| Mustafa Suleyman | exa | human_review | The Coming Wave Book | 内容是关于《The Coming Wave》这本书的推广，并非直接关于Mustafa Suleyman本人。 |
| Quoc Le | exa | no_good_source | Sang Michael Xie - Stanford Computer Science | 内容关于另一位研究员Sang Michael Xie，属于抓取错误。 |
| Quoc Le | exa | human_review | Transformer (deep learning architecture) | 通用的维基百科词条，并非专门针对 Quoc Le 本人的介绍或特定贡献。 |
| Sam Altman | exa | human_review | https://www.cnn.com/2023/05/16/tech/sam-altman-openai-congress | 内容为CNN市场新闻摘要，完全不涉及Sam Altman或AI。 |
| Sam Altman | exa | human_review | The Case That A.I. Is Thinking | 内容为《纽约客》关于 AI 思考能力的通用深度报道，未聚焦于 Sam Altman 本人。 |
| 布莱恩·卡坦扎罗 | exa | human_review | Bryan Catanzaro | 内容描述的是UC Berkeley的博士生Bryan Catanzaro，与目标人物（英伟达副总裁）不是同一人。 |
| 李飞飞 | exa | no_good_source | Artificial Intelligence Index Report 2025 | 内容为2025年AI指数报告的通用介绍，并非关于李飞飞个人的信息。 |
| 桑达尔·皮查伊 | exa | human_review | 750亿美元的豪赌：谷歌是否在为Gemini项目赌上自己的帝国？ | 内容主要讨论谷歌的Gemini项目投资，未明确聚焦皮查伊本人，属于机构层面话题。 |
| 桑达尔·皮查伊 | exa | no_good_source | DeepMind CEO为谷歌攻关AI杀手级应用 | 标题和内容聚焦DeepMind CEO，而非桑达尔·皮查伊，属于抓错人。 |
| 桑达尔·皮查伊 | exa | human_review | Google launches Gemini, the AI model it hopes will take down GPT-4 | 内容主要关于谷歌 Gemini 产品发布，未直接涉及皮查伊本人的观点或动态。 |
| 桑达尔·皮查伊 | exa | human_review | Who Is Sundar Pichai? | 标题虽提及皮查伊，但内容为投资理财文章，完全不相关。 |
| 桑达尔·皮查伊 | exa | no_good_source | 谷歌CEO桑达尔·皮查伊：从穷小子到完美总裁 | 内容主要讲述皮查伊的成长故事，未涉及AI或科技行业相关话题，且质量较低。 |
| 科拉伊·卡武克丘奥卢 | exa | no_good_source | AlphaFold | 内容为 AlphaFold 的维基百科词条，未直接提及目标人物。 |
| 科拉伊·卡武克丘奥卢 | exa | no_good_source | Convolutional neural network | 通用的维基百科词条，未聚焦于目标人物。 |
| 阿希什·瓦斯瓦尼 | exa | no_good_source | Generating Long Sequences with Sparse Transformers | 该论文的作者名单中并不包含目标人物。 |
| Geoffrey Hinton | x | no_good_source | Researchgate sent me a fake paper called | 内容残缺不全，无法获取有效信息。 |
| Mustafa Suleyman | x | human_review | We just dropped what we believe is the world's largest study of AI conversations + it fou... | 官方账号发布的公司研究报告，与人物本人的背景或动态无关。 |
| Oriol Vinyals | x | human_review | //blog.google/products/gemini/gemini-2-5-pro-latest-preview/ | 内容是关于Gemini产品的博客，非关于Oriol Vinyals本人。 |
| 亚历克·拉德福德 | x | human_review | All samples shown are complete generations with no human editing. No stitching together o... | 内容讨论GPT-2生成样本的技术细节，但未明确提及亚历克·拉德福德本人，aboutPerson不达标。 |
| 亚历克·拉德福德 | x | no_good_source | Appendix of paper computes 8 gram overlap metrics for samples with training data. Of cour... | 内容涉及论文中n-gram重叠指标，但未指向亚历克·拉德福德个人，aboutPerson不达标。 |
| 布莱恩·卡坦扎罗 | x | no_good_source | //blogs.nvidia.com/blog/open-models-data-ai/ | 英伟达关于开源模型与数据的官方博客，不属于人物个人信息。 |
| Mira Murati | exa | human_review | Mira Murati, Chief Technology Officer, OpenAI - Behind the ... | 内容主要为微软促销广告，仅标题提及Mira Murati，实际无关。 |
| Lukasz Kaiser | x | human_review | I'm starting to feel sacred about some of my older theory papers... Maybe time to proacti... | 内容为个人情绪表达，未涉及AI或科技相关话题，信息密度低。 |
| Mustafa Suleyman | x | human_review | //www.youtube.com/watch?v=XWGnWcmns_M | 仅包含视频链接，无任何实质性文本内容。 |
| Noam Shazeer | x | human_review | //blog.google/products/gemini/gemini-3-deep-think/ | 仅包含官方博客链接，无本人原创观点或实质描述。 |
| 科拉伊·卡武克丘奥卢 | x | no_good_source | //blog.google/technology/ai/google-gemini-ai/ | 仅包含一个指向 Gemini 的官方链接，无正文描述。 |
| Andrej Karpathy | x | no_good_source | The top comment on all of these is usually “ai” with 3000 likes | 社交媒体随感，主要讨论评论区现象，缺乏专业技术含量或行业深度。 |
| Boris Cherny | x | no_good_source | No. I just keep thinking on by default | 关于个人习惯的简短回复，信息密度极低。 |
| Boris Cherny | x | no_good_source | Same repo, separate git checkouts | 关于 Git 操作的简短技术回复，缺乏背景信息。 |
| David Ha | x | no_good_source | In the end Yann couldn’t show up 😢 but we still had a blast. Here is the recording: | 属于活动花絮和录像发布，缺乏具体的观点或技术事实。 |
| Elon Musk | x | no_good_source | Over 4 billion visits per month | 泛指平台流量数据，缺乏对人物或AI技术的深度关联。 |
| Elon Musk | x | no_good_source | Share Grok links with friends! | 纯粹的社交分享引导，无任何实质性信息。 |
| Elon Musk | x | no_good_source | Try Grok image edit and video edit | 纯粹的产品功能推广短语，缺乏信息价值。 |
| Elon Musk | x | no_good_source | Yeah, and the scheme was working too | 语境不明的短句，无任何有效信息价值。 |
| Emad Mostaque | x | no_good_source | Almost looks like there should be an e to the minus 4 pi next eh | 随意的数学公式调侃，信息密度极低，无入库价值。 |
| Emad Mostaque | x | no_good_source | New wave in a few weeks | 模糊的预告性言论，缺乏具体信息和实质内容。 |
| Ilya Sutskever | x | no_good_source | Human culture is critical civilization-enabling infrastructure. One that’s hard to improv... | 虽为本人言论，但属于泛泛的文化哲学思考，与AI领域无关。 |
| Ilya Sutskever | x | no_good_source | Real progress in AI can only be achieved through a very intense work ethic | 属于泛泛而谈的成功学言论，缺乏具体的技术或行业深度。 |
| Ilya Sutskever | x | no_good_source | seeing reality as it is and not the way we want it to be is hard work, actually | 简短的哲学感悟，缺乏与AI或科技行业相关的实质内容。 |
| Lukasz Kaiser | x | no_good_source | Sara is an amazing researcher and personal attacks should have no place in our community. | 内容为对他人研究者的辩护，不涉及Lukasz Kaiser本人，且无AI相关实质内容。 |
| Marc Andreessen | x | no_good_source | My email app and my texting app are now both amazing at AI-auto-summarizing all of the sp... | 关于个人应用体验的琐碎吐槽，信息密度过低。 |
| Marc Andreessen | x | no_good_source | The new American credentialing system: Degree from MIT < Drop out of MIT before graduatin... | 属于社交媒体上的段子或调侃，缺乏严肃的行业洞察。 |
| Mustafa Suleyman | x | human_review | Copilot just got smarter! Starting today, we're rolling out the latest GPT-5.2 model from... | 官方账号发布的产品技术升级通告，缺乏人物相关性。 |
| Mustafa Suleyman | x | human_review | The team just added a little extra holiday spirit to @Copilot! Meet Eggnog Mode Mico - li... | 官方账号发布的节日营销活动，无人物价值。 |
| Oriol Vinyals | x | no_good_source | AND world-class leadership & strategy 😉 | 内容为模糊的称赞，与AI/科技无关，低质。 |
| Oriol Vinyals | x | no_good_source | Create an image at 41.4036° N, 2.1744° E, January 1st, 1983, 15:00 hours. | 内容为坐标和时间指令，与Oriol Vinyals无关。 |
| Oriol Vinyals | x | no_good_source | Visual Retweeting powered by Nano Banana Pro 🍌 Prompt used: Create a clever infographic ... | 内容为转发营销工具，与人物本人及AI无关，低质。 |
| 亚历克·拉德福德 | x | no_good_source | Dynamic eval improves an AWD-LSTM baseline by 0.11 nats. Can't be sure it'd have equal si... | 讨论动态评估和模型性能，未涉及亚历克·拉德福德本人。 |
| 亚历克·拉德福德 | x | no_good_source | The jump from o3-mini to o3 feels surprisingly large for just a reasoning model. Makes me... | 讨论o3-mini到o3的模型能力提升，未涉及亚历克·拉德福德，不相关。 |
| 吴恩达 | x | no_good_source | OpenReview is one of the most important pillars supporting AI research and knowledge shar... | 内容是关于OpenReview的捐赠呼吁，虽然与AI相关，但并非关于吴恩达本人。 |
| 埃里克·霍维茨 | x | human_review | Upcoming panel at the @GalienFdn Patient Summit: | 仅提及即将参加一个患者峰会，未涉及AI或科技相关内容，与目标人物关联弱。 |
| 布莱恩·卡坦扎罗 | x | human_review | Thank you for your partnership 🙏 | 纯礼貌性回复，无任何科技或行业相关信息。 |
| 李开复 | x | no_good_source | More decks to go, but has designing beautiful slides been a pain point? Upgrades from our... | 属于公司旗下 AI 产品的营销推广，缺乏李开复个人的实质性内容。 |
| 李莲 | x | no_good_source | We have various teams working on AI safety at OpenAI. Let us know if you are interested! | 内容为OpenAI招聘宣传，泛泛而谈，缺乏具体信息价值。 |
| 李飞飞 | x | no_good_source | Omg… you did it @martin_casado !🤩❤️‍🔥 | 社交媒体上的私人互动感叹，缺乏专业相关性或信息密度。 |
| 李飞飞 | x | human_review | Whoa! Love this wormhole experience of teleporting between Marble worlds! 🤩 | 对特定技术体验的感性评价，缺乏具体的事实或深度观点。 |
| 杰夫·迪恩 | x | no_good_source | Gemini 3 Flash ranks #3 in the LMArena leaderboard (which is especially notable given its... | 内容为排行榜信息，未体现杰夫·迪恩个人贡献或观点。 |
| 杰夫·迪恩 | x | no_good_source | Nice comparison of Gemini 3 Flash versus Gemini 3 Pro (two bars on the left). Gemini 3 Fl... | 内容为模型性能比较，无杰夫·迪恩个人观点或信息。 |
| 杰夫·迪恩 | x | human_review | Waymo's system, fueled by careful collection of a large volume of fully autonomous data, ... | 内容关于Waymo和AI系统，但未聚焦杰夫·迪恩，属于机构宣传而非个人相关。 |
| 阿希什·瓦斯瓦尼 | x | no_good_source | Thank you, Aurko. Our collaborations were really fun. | 社交礼仪性互动，不包含有效的个人观点或事实。 |
| 阿希什·瓦斯瓦尼 | x | no_good_source | Thanks for the notes, @HannaHajishirzi . The team is looking into it and we'll get back w... | 社交媒体上的日常工作回复，信息密度极低。 |
| 黄仁勋 | x | human_review | Another share of Jensen Huang's quote on resilience and hardship. | 内容仅涉及通用的挫折教育语录，缺乏 AI 或科技行业相关性。 |
| 黄仁勋 | x | human_review | Biography and family details of Jensen Huang, emphasizing his background and values. | 侧重于个人传记和家庭背景描述，缺乏AI技术或行业洞察。 |
| Andrej Karpathy | x | no_good_source | Yeah it wrote a script to start the pairing process and then told me | 官方推文片段，内容过于简短且缺乏上下文，无法提供有效的技术或行业信息。 |
| Boris Cherny | x | no_good_source | I haven’t found that to be an issue, since glancing at the convo usually gives me the con... | 碎片化社交媒体回复，信息密度低且缺乏上下文。 |
| Elon Musk | x | no_good_source | //x.com/elonmusk/status/2003989532111413332 | 内容仅包含推文链接，无任何实质性文本内容。 |
| Elon Musk | x | no_good_source | //x.com/elonmusk/status/2006108047609930069 | 内容仅包含链接，无任何实质性文字信息。 |
| Elon Musk | x | no_good_source | Hopefully, 60 Minutes reports on it soon | 内容极其简短且无背景信息，属于无意义的碎片化信息。 |
| Emad Mostaque | x | no_good_source | Yes let’s upgrade math lib first | 内容过于简短且缺乏上下文，属于琐碎的日常技术回复。 |
| Ilya Sutskever | x | no_good_source | Really cool project!! | 内容过于简短且泛泛而谈，缺乏具体信息价值。 |
| Jan Leike | x | human_review | //arxiv.org/abs/2505.05410 | 仅包含一个论文链接，缺乏具体内容描述，信息密度过低。 |
| Shane Legg | x | human_review | //x.com/ShaneLegg/status/1994438350262898713 | 仅包含链接，无任何文本内容。 |
| 埃里克·霍维茨 | x | human_review | //arxiv.org/abs/2511.02687 | 仅包含论文预印本链接，缺乏对内容的描述或观点。 |
| 埃里克·霍维茨 | x | human_review | //edhub.ama-assn.org/jn-learning/audio-player/19019635 | 仅包含外部音频链接，缺乏背景介绍或实质性观点。 |
| 杰夫·迪恩 | x | no_good_source | An exciting new approach for doing continual learning, using nested optimization for enha... | 内容仅提及一种新方法，未明确指向杰夫·迪恩本人，且信息密度低。 |

## Safety

- Default scope only includes rows whose latest QA verdict was `reject`.
- Rows with active Card.sourceUrl dependencies are skipped.
- Rows whose URL appears in People display/source JSON are skipped.
- This file is a decision queue only; use `apply_hard_tail_manual_decisions.mjs` for dry-run/execute.
