# Fact Claim Remediation by MiMo

Generated at: 2026-06-09T15:46:41.954Z
Model: mimo-v2.5-pro

Total problem issues: 4
Selected issues: 4
Remediations: 4

## Actions

| Action | Count |
| --- | --- |
| delete_raw_pool_item | 4 |

## Safety

| Safety bucket | Count |
| --- | --- |
| safe_auto_apply | 4 |

## Top People

| Person | Total | Safe | Actions | Samples |
| --- | --- | --- | --- | --- |
| 姚顺雨 | 4 | 4 | {"delete_raw_pool_item":4} | source_item_belongs_to_person/delete_raw_pool_item: 内容明确指向艺术家姚舜禹，与AI研究员姚顺雨姓名相似但领域完全不同，属于高置信人名错配，应直接删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容指向音乐人姚舜禹，与AI研究员姚顺雨姓名相似但领域完全不同，属于高置信人名错配，应直接删除。<br>source_item_belongs_to_person/delete_raw_pool_item: 内容指向艺术组合，与AI研究员姚顺雨姓名相似但领域完全不同，属于高置信人名错配，应直接删除。 |

## Safe Auto-Apply Candidates

| Person | Type | Target | Action | Reason |
| --- | --- | --- | --- | --- |
| 姚顺雨 | source_item_belongs_to_person | 姚舜禹中国当代前瞻型艺术家 | delete_raw_pool_item | 内容明确指向艺术家姚舜禹，与AI研究员姚顺雨姓名相似但领域完全不同，属于高置信人名错配，应直接删除。 |
| 姚顺雨 | source_item_belongs_to_person | 姚舜禹 | delete_raw_pool_item | 内容指向音乐人姚舜禹，与AI研究员姚顺雨姓名相似但领域完全不同，属于高置信人名错配，应直接删除。 |
| 姚顺雨 | source_item_belongs_to_person | 林家賢,馬曉晴,姚舜禹Lin Chia-Hsien , Ma Xiao-Qing, Yao ... | delete_raw_pool_item | 内容指向艺术组合，与AI研究员姚顺雨姓名相似但领域完全不同，属于高置信人名错配，应直接删除。 |
| 姚顺雨 | source_item_belongs_to_person | 姚舜禹(@ashunyeshunye) • Instagram photos and videos | delete_raw_pool_item | 内容指向艺术家姚舜禹的Instagram账号，与AI研究员姚顺雨姓名相似但领域完全不同，属于高置信人名错配，应直接删除。 |

## Manual / Source Required Queue

| Person | Type | Target | Action | Queries | Reason |
| --- | --- | --- | --- | --- | --- |
