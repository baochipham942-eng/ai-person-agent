# Manual RawPool Apply

Generated at: 2026-06-10T10:27:54.851Z
Mode: dry-run
Input: docs/audit-2026-06/data/prune_review_manual_decisions_second_2026_06_10.json
Archive: docs/audit-2026-06/data/prune_review_manual_second_dry_run_archive.json
Stage: manual_prune_tail

## Counts

| Metric | Value |
| --- | ---: |
| decisions | 12 |
| existing targets | 12 |
| missing targets | 0 |
| audit rows to insert | 12 |
| RawPoolItem rows to delete | 12 |

## Actions

| Action | Count |
| --- | ---: |
| delete_raw_pool_item | 12 |

## Rows

| Person | Target | Action | Exists | Reason |
| --- | --- | --- | --- | --- |
| Aidan Gomez | Aidan Gomez's Playlists \| Computer Science & Mathematics | delete_raw_pool_item | yes | Personal music playlist page; not AI, career, research, or product evidence for Aidan Gomez. |
| Aidan Gomez | Cpp-AES | delete_raw_pool_item | yes | Generic AES implementation; not useful AI/person evidence for the profile. |
| Aidan Gomez | pygorithmic | delete_raw_pool_item | yes | QuestTrade/API trading utility; non-core and not AI evidence for Aidan Gomez. |
| Aidan Gomez | RandKit | delete_raw_pool_item | yes | Generic random-number Swift utility; non-core and not AI evidence for the profile. |
| Aidan Gomez | welcome | delete_raw_pool_item | yes | Generic welcome-message project; low-information and not AI/person evidence. |
| Alexandr Wang | Alexandr Wang Says He's Waiting to have a Kid, Until Tech Like Neuralink is Ready | delete_raw_pool_item | yes | Personal-life video headline; low-value for AI profile evidence and not a representative professional source. |
| Demis Hassabis | About Google DeepMind | delete_raw_pool_item | yes | Generic organization about page; not a person-specific Hassabis source. |
| Greg Brockman | OpenAI API | delete_raw_pool_item | yes | OpenAI product announcement page; not person-specific evidence for Greg Brockman. |
| Greg Brockman | Introducing GPT-4.5 | delete_raw_pool_item | yes | OpenAI product release; not person-specific evidence for Greg Brockman and already handled by conservative attribution. |
| Elon Musk | xAI throws great parties | delete_raw_pool_item | yes | Casual company-party post; no substantive AI, product, or career evidence. |
| Daniela Amodei | Inside Anthropic, the AI Company Betting That Safety Can Be a Winning Strategy | delete_raw_pool_item | yes | Company-level Anthropic article; not person-specific evidence for Daniela Amodei. |
| Hyung Won Chung | People | delete_raw_pool_item | yes | POSTECH lab people page with no substantive person-specific evidence for Hyung Won Chung. |
