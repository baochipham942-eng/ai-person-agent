# Prune Tail Refetch Tavily MiMo Curated

Generated at: 2026-06-10T18:54:21.630Z
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch18.jsonl
Output: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch18_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| output rows | 20 |
| input selected sources | 24 |
| output selected sources | 20 |
| removed selected sources | 4 |
| rows changed | 4 |
| rows deferred to human review | 2 |

## Removed Hosts

| Host | Count |
| --- | --- |
| achievement.org | 1 |
| inabr.com | 1 |
| nobelprize.org | 1 |
| y2doc.com | 1 |

## Removed Sources

| Person | Decision before | Host | Title | Reason |
| --- | --- | --- | --- | --- |
| Demis Hassabis | augment_source | achievement.org | Sir Demis Hassabis \| Academy of Achievement | background_profile_not_needed_when_interview_source_exists |
| Elon Musk | replace_source | inabr.com | 马斯克当选美国国家工程院院士 | low_authority_secondary_article_needs_primary_confirmation |
| Geoffrey Hinton | replace_source | nobelprize.org | Geoffrey Hinton – Podcast - NobelPrize.org | background_podcast_page_not_needed_when_cifar_source_exists |
| Greg Brockman | augment_source | y2doc.com | Transcript & Notes: Greg Brockman on OpenAI's Road to AGI \| Y2Doc | transcript_aggregator_not_primary_source |

## Deferred Rows

| Person | Claim | Target | Blockers |
| --- | --- | --- | --- |
| Elon Musk | prune-tail:cmjrzl7kn0027b28truliiusg | 美国国家工程院新增院士名单出炉，马斯克入选，张宏江、方岱宁等入选外籍院士！ | manual_curated_all_selected_sources_removed |
| Greg Brockman | prune-tail:cmjv15pbj0044ftmgenov1xog | GPT-4o System Card | 候选中无直接证明Greg Brockman参与GPT-4o System Card撰写的权威来源。; manual_curated_all_selected_sources_removed |
