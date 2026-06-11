# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T16:39:51.172Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch10.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch10_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 28 |
| output selected sources | 12 |
| removed selected sources | 16 |
| rows changed | 11 |
| rows deferred to human review | 7 |

## Removed Hosts

| Host | Count |
| --- | --- |
| lennysnewsletter.com | 2 |
| blog.eladgil.com | 1 |
| cnbc.com | 1 |
| developing.dev | 1 |
| en.wikipedia.org | 1 |
| junzhu.chem8.org | 1 |
| mittrchina.com | 1 |
| news.wit.edu.cn | 1 |
| podcasts.apple.com | 1 |
| snowan.gitbook.io | 1 |
| stationf.co | 1 |
| tsinghua.edu.cn | 1 |
| xiaguangshe.com | 1 |
| youtube.com | 1 |
| zh.wikipedia.org | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| 朱军 | augment_source | tsinghua.edu.cn | 生数科技朱军：视频模型下一步是高可控，中国视频大模型引领全球 | same_name_cross_person_risk_does_not_prove_cuhk_shenzhen_target |
| 朱军 | augment_source | news.wit.edu.cn | 香港中文大学（深圳）理工学院朱军教授应邀来校讲学交流-武汉工程大学新闻中心 | same_name_cross_person_risk_does_not_prove_target_person |
| 朱军 | augment_source | junzhu.chem8.org | Contact \| Zhu Group at the Chinese University of Hong Kong, Shenzhen | same_name_cross_person_risk_does_not_prove_target_ai_person |
| 李莲 | augment_source | xiaguangshe.com | 重磅！前 OpenAI 华人副总裁 Lilian Weng 加入Fellows Fund Fellow团队，开启 AI 新征程 – 霞光社ShineGlobal | secondary_career_announcement_needs_primary_confirmation |
| 桑达尔·皮查伊 | replace_source | mittrchina.com | 麻省理工科技评论-独家专访谷歌CEO桑达尔·皮查伊：基于我的个人经历 | interview_does_not_prove_target_quantum_computing_statement |
| 阿希什·瓦斯瓦尼 | augment_source | zh.wikipedia.org | 阿西什·瓦斯瓦尼 - 维基百科，自由的百科全书 | secondary_or_ugc_reference_source |
| 雅各布·乌什科雷特 | replace_source | podcasts.apple.com | The AI Pioneer Developing New Kinds of Medicine - Apple Podcasts | podcast_page_not_needed_when_ted_primary_source_exists |
| 黄仁勋 | replace_source | en.wikipedia.org | Jensen Huang - Wikipedia | secondary_or_ugc_reference_source |
| 黄仁勋 | augment_source | cnbc.com | CNBC Transcript: NVIDIA Co-Founder, President & CEO Jensen Huang Speaks with CNBC’s “Squawk Box” Today | news_transcript_does_not_prove_target_long_form_interview_summary |
| Arthur Mensch | augment_source | blog.eladgil.com | Discussion w Arthur Mensch, CEO of Mistral AI - by Elad Gil | background_interview_does_not_contain_target_quote |
| Arthur Mensch | augment_source | youtube.com | Arthur Mensch: Open vs Closed - Who Wins and Mistral's Position | background_video_does_not_contain_target_quote |
| Boris Cherny | replace_source | snowan.gitbook.io | 10 Tips for Using Claude Code from Its Creator, Boris Cherny \| Study Notes | third_party_notes_not_primary_source_for_target_workflow_quote |
| Boris Cherny | replace_source | stationf.co | Boris Cherny, Anthropic: “I have not written a single line of code since November” \| STATION F | background_interview_does_not_prove_target_quote |
| Boris Cherny | replace_source | lennysnewsletter.com | Head of Claude Code: What happens after coding is solved \| Boris ... | background_interview_does_not_prove_target_quote |
| Boris Cherny | augment_source | lennysnewsletter.com | Head of Claude Code: What happens after coding is solved \| Boris Cherny | background_interview_does_not_prove_target_feature_support_quote |
| Boris Cherny | augment_source | developing.dev | Boris Cherny (Creator of Claude Code) On How His Career Grew | background_interview_does_not_prove_target_feature_support_quote |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| 朱军 | prune-tail:cmjtxjf5802q8rmtb01uhbllu | 朱军\| 香港中文大学（深圳）理工学院 | manual_curated_all_selected_sources_removed |
| 桑达尔·皮查伊 | prune-tail:cmju15rlr0b0qrmtbf5p1e91h | 谷歌CEO 桑达尔·皮查伊（Sundar Pichai） 刚刚发表了一项 ... | manual_curated_all_selected_sources_removed |
| 阿希什·瓦斯瓦尼 | prune-tail:cmjuuiw830go1rmtbafcwnd78 | Attention Is All You Need \| Request PDF | 候选中缺乏阿希什·瓦斯瓦尼的官方个人主页、机构资料页或可靠媒体采访等更权威的来源。; manual_curated_all_selected_sources_removed |
| Arthur Mensch | prune-tail:cmjtvpyur00sermtbo4554ol7 | Complex matters slowly coming together — we actually got surprised ourselves | 未找到直接包含目标引述"Complex matters slowly coming together — we actually got surprised ourselves"的权威来源。; manual_curated_all_selected_sources_removed |
| Boris Cherny | prune-tail:cmjxnlqax000na6eldcwxc7xo | - Each tab has its own git checkout<br>- Claude manages context, I don’t do anything special there | manual_curated_all_selected_sources_removed |
| Boris Cherny | prune-tail:cmjxnlsgo0011a6elum6o9oi4 | It really depends on the language, and each model gets better and better at it. Usually it's things  | manual_curated_all_selected_sources_removed |
| Boris Cherny | prune-tail:cmjxnlr7w000ta6elyolsa1ah | That is well supported, added many months back. Just send a message while Claude is running, and it  | manual_curated_all_selected_sources_removed |
