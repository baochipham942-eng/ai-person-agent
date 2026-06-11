# Prune Tail Review Manual Decisions

Generated at: 2026-06-10T21:32:16.830Z
Input: docs/audit-2026-06/data/prune_tail_review_unresolved_rows.json
Decision filter: explicit ids (37)

## Counts

| Metric | Value |
| --- | ---: |
| input rows | 83 |
| dependency skipped | 0 |
| decision rows | 37 |

## Source Type

| Source | Count |
| --- | ---: |
| x | 23 |
| exa | 10 |
| youtube | 4 |

## People

| Person | Count |
| --- | ---: |
| 阿希什·瓦斯瓦尼 | 5 |
| Mira Murati | 3 |
| 亚历克·拉德福德 | 3 |
| Chris Olah | 2 |
| Dylan Field | 2 |
| Lukasz Kaiser | 2 |
| Yoshua Bengio | 2 |
| 唐杰 | 2 |
| 埃里克·霍维茨 | 2 |
| 桑达尔·皮查伊 | 2 |
| Elon Musk | 1 |
| Emad Mostaque | 1 |
| Guillaume Lample | 1 |
| Ilya Sutskever | 1 |
| Jaana Dogan | 1 |
| Oriol Vinyals | 1 |
| Richard Socher | 1 |
| Sam Altman | 1 |
| Zoubin Ghahramani | 1 |
| 布莱恩·卡坦扎罗 | 1 |
| 杰夫·迪恩 | 1 |
| 马克·扎克伯格 | 1 |

## Decisions

| Person | Source | Refetch | Target | Reason |
| --- | --- | --- | --- | --- |
| Dylan Field | youtube | human_review | 20 Under 20 Thiel Fellow: Dylan Field | 关于Thiel Fellowship的早期背景介绍，偏向个人历史而非当前科技趋势。 |
| Elon Musk | youtube | human_review | 埃隆·马斯克：世界上最危险的病人——朕即国家｜Elon Musk｜川普｜特朗普｜Donald John Trump｜马斯克采访｜马斯克新冠病毒｜马斯克为什么支持特朗普｜马斯克自传... | 侧重政治立场与个人评价，科技相关性较低且带有主观色彩。 |
| Emad Mostaque | exa | human_review | Emad Mostaque on the End of Capitalism | 标题高度相关但正文仅包含网页页脚和导航链接，缺乏实质性论述。 |
| 亚历克·拉德福德 | exa | human_review | A Comprehensive Guide To Alec Radford: The Innovator ... | 标题为关于亚历克·拉德福德的指南，但内容为网站导航和订阅信息，缺乏实质内容需人工审核。 |
| 亚历克·拉德福德 | exa | human_review | L11 Language Models -- guest instructor: Alec Radford ... | 标题提到亚历克·拉德福德作为客座讲师，但内容为YouTube登录页面，信息不完整需人工判断。 |
| 马克·扎克伯格 | exa | human_review | Meta's Mark Zuck announces new AI model Mango to ... | 标题提及扎克伯格和AI模型，但内容被交易所广告和链接淹没，信息密度极低，需人工判断是否有效。 |
| Mira Murati | exa | human_review | Mira Murati's Open Source AI Breakthrough at Thinking ... | 标题提及Mira Murati和AI突破，但内容被截断且包含大量无关链接文本，质量存疑需人工判断。 |
| Yoshua Bengio | youtube | human_review | &quot;I CREATED AI AND I&#39;M HERE TO WARN YOU&quot; | 标题具有强烈的标题党倾向，且正文未明确提及 Bengio 姓名，需确认是否为本人访谈。 |
| 桑达尔·皮查伊 | exa | human_review | 谷歌CEO桑达尔.皮查伊：Gemini浪潮、全栈AI与未来十年布局 | 标题明确提及皮查伊和Gemini，但内容为加密乱码，无法判断实际质量，需人工审查。 |
| 阿希什·瓦斯瓦尼 | youtube | human_review | Ashish Vaswani on Essential AI's Journey with MI300X ... | YouTube视频标题提及Ashish Vaswani，但内容仅为页面框架，缺乏具体信息，需人工判断。 |
| Chris Olah | x | human_review | Valuable synthesis across labs! Make sure to check out the tutorial video - https://www.y... | 仅为推荐视频的转发语，缺乏具体的实质性内容。 |
| 唐杰 | x | human_review | 4.7 is coming, one of your best coding partners. https://z.ai/blog/glm-4.7 | 官方发布的模型更新预热，内容较为简短，信息量有限。 |
| 杰夫·迪恩 | x | human_review | Awesome to see this overview of work done by many, many people in @GoogleResearch over th... | 杰夫·迪恩转发Google Research年度总结，虽与AI相关但内容泛泛，信息价值较低。 |
| Jaana Dogan | exa | human_review | Jaana Dogan :unverified:: "I don't know if AI is going to…" - Mastodon | 内容为简短引用，缺乏上下文和深度，信息密度低，需人工判断是否值得入库。 |
| Yoshua Bengio | exa | human_review | Yoshua Bengio - A Potential Path to Safer AI Development | 标题高度相关，但正文内容主要为LinkedIn登录提示和网页导航，信息密度极低。 |
| 桑达尔·皮查伊 | exa | human_review | 谷歌CEO 桑达尔·皮查伊（Sundar Pichai） 刚刚发表了一项 ... | 标题提及皮查伊发表关于科技未来的声明，但内容仅为Facebook登录页片段，无实质信息，需人工判断。 |
| 阿希什·瓦斯瓦尼 | exa | human_review | Attention Is All You Need \| Request PDF | 内容是关于Attention论文的请求页面，虽提及Ashish Vaswani为作者，但信息密度低，仅展示元数据。 |
| Dylan Field | x | human_review | Grateful to be a seed investor in Sunday! Just a few minutes into meeting @tonyzzhao and ... | 涉及个人投资动态，虽与科技行业相关但内容偏向社交礼仪。 |
| Ilya Sutskever | x | human_review | Congratulations to @geoffreyhinton for winning the Nobel Prize in physics!! | 官方发布的社交祝贺动态，属于礼仪性内容，缺乏深度观点。 |
| Richard Socher | x | human_review | A new dimension of creativity unlocked by AI. Given that the games industry is larger tha... | 泛泛评论AI与游戏行业，缺乏具体观点或事实，质量偏低。 |
| Sam Altman | x | human_review | It is a very smart model, and we have come a long way since GPT-5.1: | 对模型进步的泛泛评价，内容较为简短且缺乏具体细节。 |
| Zoubin Ghahramani | x | human_review | Predicting weather accurately is a fantastic use of AI that helps everyone in the world. ... | 内容属于泛泛而谈的宏观愿景，信息密度较低，仅表达对 AI 气象预测的认可。 |
| 亚历克·拉德福德 | x | human_review | recentBeen AI meaning-focused to posts check as this of - late thanks December @ Thom202_... | 内容混乱但提及亚历克·拉德福德和BERT/GPT比较，需人工判断是否有效。 |
| 唐杰 | x | human_review | for GLM-4.6, which features do you want most? Speed up to 100t/s? Stability? Lower price? | 官方账号发布的互动调研，信息密度较低，属于产品反馈收集。 |
| 埃里克·霍维茨 | x | human_review | When AI Meets Biology | 标题式推文，虽然主题相关但信息密度极低，需人工确认是否保留。 |
| 布莱恩·卡坦扎罗 | x | human_review | //x.com/ctnzr/status/1957504768156561413 | 虽为官方账号链接，但缺乏具体文本内容，需人工确认链接价值。 |
| 阿希什·瓦斯瓦尼 | x | human_review | Thank you! This work was led by @ishaankshah , @ampolloreno , Karl and Philip! | 感谢推文，提及他人工作，但内容简短，信息价值有限。 |
| 阿希什·瓦斯瓦尼 | x | human_review | Thanks to @Divyasmansingka for operational support. | 仅感谢某人，与AI相关性模糊，质量低，需人工审核。 |
| 阿希什·瓦斯瓦尼 | x | human_review | Tremendous effort by the @essential_ai team! | 仅称赞团队努力，缺乏具体信息，AI相关性模糊，需人工判断。 |
| Chris Olah | x | human_review | The Anthropic Interpretability Team is planning a virtual Q&A... | 仅提及Anthropic可解释性团队活动，信息量低，需确认是否本人发布。 |
| Guillaume Lample | x | human_review | Devstral 2 looking good ! | 内容过于简短，仅表达对模型的正面看法，信息密度低，需人工判断。 |
| Lukasz Kaiser | x | human_review | Just use o3. It's worth the wait. Try o4-mini if in a hurry. | 官方推文，但内容简短，仅为建议使用o3模型，信息密度低，需人工判断。 |
| Lukasz Kaiser | x | human_review | Please add your own work if you use GPT5 for science. | 官方推文，内容简短，建议使用GPT5进行科学研究，信息密度低，需人工判断。 |
| Mira Murati | x | human_review | //openai.com/index/introducing-the-model-spec/ | 仅含链接无实质内容，需人工判断是否关于Mira Murati或AI。 |
| Mira Murati | x | human_review | //openai.com/index/navigating-the-challenges-and-opportunities-of-synthetic-voices/ | 仅含链接无实质内容，需人工判断是否关于Mira Murati或AI。 |
| Oriol Vinyals | x | human_review | I spent many (unsuccessful) hours trying this just 6 months ago. Feeling the AGY. | 内容来自官方账号，提及AGI相关尝试，但表述模糊，信息密度低，需人工判断。 |
| 埃里克·霍维茨 | x | human_review | The 2026 Microsoft Research Fellowship program is now open for submissions. Calling for p... | 宣布微软研究奖学金项目，虽与AI相关但内容较官方和泛泛，信息密度低，需人工判断。 |

## Safety

- This file only converts already-exported review rows into an explicit manual decision queue.
- Rows with active Card.sourceUrl or People display/source JSON dependencies are skipped.
- Apply with `apply_hard_tail_manual_decisions.mjs`; default mode there is dry-run.
