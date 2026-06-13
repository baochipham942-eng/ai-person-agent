# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T19:56:30.162Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch22.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch22_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 27 |
| output selected sources | 23 |
| removed selected sources | 4 |
| rows changed | 3 |
| rows deferred to human review | 2 |

## Removed Hosts

| Host | Count |
| --- | --- |
| mustafa-suleyman.ai | 1 |
| news.sina.cn | 1 |
| noamshazeer.com | 1 |
| themarque.com | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| 黄仁勋 | augment_source | news.sina.cn | 黄仁勋最新访谈：英伟达要用AI造一台“时间机器”，看好人形机器人\|ChatGPT\|注意力机制\|计算平台\|主持人\|电脑_手机新浪网 | secondary_news_or_repost_not_primary_source |
| Mustafa Suleyman | replace_source | mustafa-suleyman.ai | Mustafa Suleyman | profile_page_does_not_prove_target_youtube_video |
| Noam Shazeer | augment_source | noamshazeer.com | Noam Shazeer \| AI Scientist, Google Gemini Co-Lead | profile_page_does_not_prove_target_gemini_blog_claim |
| Noam Shazeer | augment_source | themarque.com | Noam Shazeer \| Gemini Co-Lead & VP Engineering, Google | profile_page_does_not_prove_target_gemini_blog_claim |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| Mustafa Suleyman | prune-tail:cmjtvo1lb00gfrmtbskffm0kl | //www.youtube.com/watch?v=XWGnWcmns_M | manual_curated_all_selected_sources_removed |
| Noam Shazeer | prune-tail:cmjtxhufw02cgrmtbsysq54rm | //blog.google/products/gemini/gemini-3-deep-think/ | manual_curated_all_selected_sources_removed |
