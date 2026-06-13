# Refetch Source by Search + MiMo

Generated at: 2026-06-10T18:21:52.497Z
Remediation input: docs/audit-2026-06/data/prune_tail_refetch_queue.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch16.jsonl
Search provider: tavily
Model: mimo-v2.5-pro

## Counts

| Metric | Value |
| --- | --- |
| selected tasks | 20 |
| existing rows reused | 0 |
| pending tasks | 0 |
| refetch results | 20 |
| source candidates | 197 |
| selected sources | 25 |

## Decisions

| Decision | Count |
| --- | --- |
| replace_source | 13 |
| augment_source | 3 |
| human_review | 3 |
| no_good_source | 1 |

## Selected Hosts

| Host | Count |
| --- | --- |
| hwchung2.github.io | 10 |
| x.com | 7 |
| jan.leike.name | 2 |
| 80000hours.org | 1 |
| alignment.anthropic.com | 1 |
| aclanthology.org | 1 |
| en.wikipedia.org | 1 |
| microsoft.com | 1 |
| research.google | 1 |

## Sample Results

| Person | Target | Decision | Sources | Reason |
| --- | --- | --- | --- | --- |
| Hyung Won Chung | //x.com/hwchung27/status/1800676312916656592 | replace_source | Hyung Won Chung (hwchung2.github.io)<br>Hyung Won Chung on X: "After a great time at OpenAI, we (@EdwardSun0909, @_jasonwei) recently joined @Meta Superintelligence Labs..." (x.com) | 原始来源（一条仅含链接的推文）缺乏具体内容，无法有效证明人物信息。候选来源中，个人官方主页（hwchung2.github.io）提供了最权威、全面的职位和贡献信息，可作为主要替换来源。另一条本人推文明确宣布了最新职位变动，可作为补充。 |
| Hyung Won Chung | //x.com/hwchung27/status/1836842717302943774 | replace_source | Hyung Won Chung (hwchung2.github.io) | 原始来源仅为一条X链接，缺乏具体内容。候选中的个人官方主页（hwchung2.github.io）提供了权威、可访问的职位和贡献信息，能直接证明人物身份与工作关系，是理想的替换来源。 |
| Hyung Won Chung | //x.com/hwchung27/status/1844705450635509802 | replace_source | Hyung Won Chung (hwchung2.github.io)<br>Superintelligence Labs. - Hyung Won Chung (x.com) | 原来源为一条仅含链接的推文，缺乏具体内容。候选来源中，本人官方主页（hwchung2.github.io）提供了最权威的职位、研究贡献和机构信息，可直接替换。另一条推文（加入Meta）可作为职位变动的补充证据。 |
| Hyung Won Chung | //x.com/hwchung27/status/1886221344662299022 | replace_source | Hyung Won Chung (hwchung2.github.io) | 原来源为X帖子链接，缺乏具体内容。候选中的个人官方主页（hwchung2.github.io）是权威、可访问的一手来源，直接证明了人物身份、职位及与o1等工作的关联，是理想的替换来源。 |
| Hyung Won Chung | //x.com/hwchung27/status/1923105639343313074 | replace_source | Hyung Won Chung (hwchung2.github.io)<br>Superintelligence Labs. - Hyung Won Chung (x.com) | 原始来源仅为推文链接，无实质内容。候选来源中，个人官方主页（hwchung2.github.io）提供了最权威、全面的个人信息和贡献证明。另一条本人推文直接证明其最新职位变动。两者可有效替换原始弱来源。 |
| Hyung Won Chung | //x.com/hwchung27/status/1923474783259553846 | replace_source | Hyung Won Chung (hwchung2.github.io)<br>Hyung Won Chung on X: "Happy to share what I’ve been working on at @OpenAI : Codex mini..." (x.com) | 候选来源中，个人官方主页（hwchung2.github.io）和原始推文（x.com/hwchung27/status/1923474783259553846）均能直接、权威地证明Hyung Won Chung在OpenAI的工作及具体... |
| Hyung Won Chung | //x.com/hwchung27/status/1932865185636847757 | replace_source | Hyung Won Chung (hwchung2.github.io)<br>Superintelligence Labs. - Hyung Won Chung (x.com) | 原来源仅为推文链接，缺乏具体文本。候选中，本人官方主页（hwchung2.github.io）提供了最权威、全面的职位与贡献信息，可直接替换。另一条推文证明其最新职位变动，可作为补充。其他来源或权威性不足，或信息相关性较弱。 |
| Hyung Won Chung | //x.com/hwchung27/status/1940147264175186050 | replace_source | Hyung Won Chung (hwchung2.github.io) | 原始来源（一条推文链接）信息密度不足。候选中的个人官方主页（hwchung2.github.io）是权威、可访问的来源，直接证明了Hyung Won Chung的职位、研究贡献和职业经历，完全满足证据要求，可作为高质量替换来源。 |
| Hyung Won Chung | //x.com/hwchung27/status/1943395653738287429 | replace_source | Hyung Won Chung (hwchung2.github.io)<br>Superintelligence Labs. - Hyung Won Chung (x.com) | 原始来源仅为推文链接，缺乏实质内容。候选中的个人官方主页（hwchung2.github.io）提供了最权威的职位、研究贡献和职业经历信息，可直接替换。另一条本人推文明确宣布加入Meta Superintelligence Labs，可作... |
| Hyung Won Chung | //x.com/hwchung27/status/1945355238187393257 | replace_source | Hyung Won Chung (hwchung2.github.io)<br>Superintelligence Labs. - Hyung Won Chung (x.com) | 原始来源（推文链接）信息不足。候选中的官方个人主页（hwchung2.github.io）是证明其职位、研究贡献（如o1）的最佳权威来源。另一条推文（加入Meta）可作为其最新职业变动的直接证据。两者均优于原始来源。 |
| Jan Leike | Ha it would be easy to train a model that's misaligned and evil | augment_source | Jan Leike (jan.leike.name)<br>Jan Leike on OpenAI's massive push to make superintelligence safe in 4 years or less \| 80,000 Hours (80000hours.org) | 原推文过于简短，缺乏背景。候选来源中，本人官方主页可确认其职位和研究领域，80,000 Hours播客采访直接讨论对齐挑战，可为原推文提供权威背景和深度，适合作为补强来源。 |
| Jan Leike | More progress on Claude's alignment! | augment_source | Jan Leike (jan.leike.name)<br>Teaching Claude Why - Alignment Science Blog - Anthropic (alignment.anthropic.com) | 原始来源（一条简短的推文）过于单薄，无法充分支撑人物页面。候选来源中，Jan Leike 的官方个人主页和 Anthropic 官方博客文章是更权威、可访问且能直接证明其职位与工作的来源，适合作为补强。 |
| Jeremy Howard | 2017 Pre-training (ULMFiT) 😊 | replace_source | Universal Language Model Fine-tuning for Text Classification (aclanthology.org) | 原始来源（推文）信息密度低。候选中的ACL Anthology论文页面是ULMFiT研究的原始、权威发布渠道，明确将Jeremy Howard列为作者，能直接、有力地证明其在该领域的核心贡献，是理想的替换来源。 |
| Lukasz Kaiser | It will think even longer and that's great because it'll do things for you :) | no_good_source |  | 候选来源均未提供与原始推文内容直接相关的证据。原始推文内容简短且具体，可能为个人社交媒体发言，难以找到权威的替代或补强来源。建议进行更精确的搜索，或考虑将此条目标记为需要人工审核。 |
| Lukasz Kaiser | Just use o3. It's worth the wait. Try o4-mini if in a hurry. | human_review |  | 候选来源中，没有直接证明Lukasz Kaiser发表过“Just use o3. It's worth the wait. Try o4-mini if in a hurry.”这一具体建议的权威来源。LinkedIn主页和YouTub... |
| Lukasz Kaiser | Please add your own work if you use GPT5 for science. | human_review |  | 候选来源均未直接证明‘Please add your own work if you use GPT5 for science.’这一具体建议出自Lukasz Kaiser。多数为个人资料页、活动页面或第三方分享，缺乏直接引用或官方声明。... |
| Mira Murati | //openai.com/index/introducing-the-model-spec/ | augment_source | Mira Murati - Wikipedia (en.wikipedia.org) | 候选来源均未直接证明Mira Murati与“//openai.com/index/introducing-the-model-spec/”的关联。维基百科可作为人物背景的辅助来源，但无法替代原始链接。需要更直接的官方来源或采访记录。 |
| Mira Murati | //openai.com/index/navigating-the-challenges-and-opportunities-of-synthetic-voices/ | replace_source | Mira Murati, Chief Technology Officer, OpenAI - Behind the Tech ... (microsoft.com) | 原来源仅为推文链接，缺乏实质内容。微软官方播客页面直接关联Mira Murati与OpenAI的CTO职位，权威且可访问，能有效补强人物与职位的关联。其他候选来源权威性不足或为辅助信息。 |
| Oriol Vinyals | //x.com/OriolVinyalsML/status/1919770619182215440 | replace_source | Oriol Vinyals - Google Research (research.google) | 原始来源仅为一个推文地址，缺乏具体内容。候选中的谷歌官方研究者页面（research.google/people/oriolvinyals）是权威的机构资料页，能直接证明Oriol Vinyals的职位和研究身份，完全符合替换要求。 |
| Oriol Vinyals | Classic LLM dilemma: smart vs fast. The new reality with Gemini 3 Flash: Why not both? Th... | human_review |  | 候选来源均未能直接证明Oriol Vinyals关于Gemini 3 Flash的原始声明。播客和视频内容不匹配，官方页面未提及个人，Wikipedia为辅助线索。需要更具体的采访、官方公告或转录来建立人物与声明的权威关联。 |

## Execution Rule

- This workflow is read-only and does not write RawPoolItem, QAAuditLog, cards, products, roles, or People fields.
- `replace_source` / `augment_source` rows are source candidates for the next human or scripted apply step.
- `no_good_source` and `human_review` stay out of automated rewrite and card regeneration.
