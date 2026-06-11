# Agent Neo 全量人物内容审查 Workflow

生成时间：2026-06-09

收尾状态（2026-06-11）：本文的基线数字是 2026-06-09 的审查快照。后续 Neo/MiMo 主线已完成 prune/refetch/manual decision、保守改写 dry-run 复核、top 5 卡片重聚合内容级复核、career/relation/org 防回流口径确认；旧数据层当前以 `PRUNE_TAIL_REVIEW_UNRESOLVED.md` 为准，`reviewUnresolvedRows=0` / `dependencyRows=0`。

## 入口与配置

Agent Neo CLI 可用入口：

```bash
set -a; source /Users/linchen/.code-agent/.env; set +a
CODE_AGENT_DATA_DIR=/tmp/agent-neo-cli-clean \
CODE_AGENT_HOME=/tmp/agent-neo-home-clean \
node /Users/linchen/Downloads/ai/code-agent/dist/cli/index.cjs \
  --project /Users/linchen/Downloads/ai/ai-person-agent \
  --provider xiaomi \
  --model mimo-v2.5-pro
```

配置注意：当前项目根目录有 `.env`，Agent Neo CLI 会优先读取项目 `.env`，且不会继续读取 `~/.code-agent/.env`。因此直接运行时 MIMO key 可能为空或落到旧配置，表现为 401。显式 source 全局 env 后，MIMO 最小请求已验证可用。

## 2026-06-09 审查基线（历史快照）

全量报告：`docs/audit-2026-06/data/full_person_content_review.json`

事实声明审查：

- 导出：`docs/audit-2026-06/data/fact_claims.jsonl`
- 聚合报告：`docs/audit-2026-06/FACT_CLAIM_REVIEW_STATUS.md`
- 错误根因：`docs/audit-2026-06/FACT_CLAIM_ERROR_CAUSES.md`
- MIMO 修复队列：`docs/audit-2026-06/FACT_CLAIM_REMEDIATION_MIMO.md`
- Codex/Tibo 名册缺口：`docs/audit-2026-06/CODEX_ROSTER_GAPS_MIMO.md`

覆盖范围：

- 人物：230
- 卡片：1095
- 履历：1114
- 关系：207
- RawPool 覆盖人物：112
- RawPool 疑似污染命中：49

当时 P0 重跑后的剩余问题，已由后续批次继续处理：

- 总问题：422
- 高优先级：58
- 中优先级：208
- 低优先级：156
- 产品决策：153
- 模型复核：145
- 人工复核：124
- 自动安全修复：0

高优先级事实声明审查已覆盖 5,044 / 12,376 条。当前不是只看结构异常，而是逐条检查前端可见 claim 是否事实成立。Agent Neo CLI 仍存在项目 `.env` 覆盖 `~/.code-agent/.env` 的工具链问题，因此现阶段脚本直接读取 `~/.code-agent/.env` 调用 Xiaomi MiMo，避免 key/base URL 被项目 env 误导。

问题 claim 已用 MIMO 生成 2,340 条 remediation 队列：

- `refetch_source`：1,121
- `rewrite_conservative`：703
- `delete_raw_pool_item`：267，其中 210 条满足 safe auto-apply 门禁
- `human_review`：71
- `delete_official_link`：50
- `close_historical_role`：46
- `delete_role`：27
- `delete_product`：26
- `rewrite_product_family`：15
- `delete_card`：12
- `hold`：2

safe auto-apply 只允许外部内容错挂：`source_item_belongs_to_person` 且 verdict 为 `wrong_person` / `unsupported`，action 必须是 `delete_raw_pool_item`，confidence 必须 >= 0.85。其他所有改写、履历、产品、官方链接、卡片和关系处理都需要来源或人工确认。

Source Item 安全删除闭环：

- 状态报告：`docs/audit-2026-06/SOURCE_ITEM_SAFE_PRUNE_STATUS.md`
- 汇总数据：`docs/audit-2026-06/data/source_item_safe_prune_status.json`
- 已安全删除 `RawPoolItem`：364 条
- 最终 source claims：4,266 条
- 最终高优先级 source claims：1,428 条
- 高优先级 source claims 已审：1,428 条
- 高优先级 source claims 未审：0 条
- 最终高优先级判定：`supported` 1,185，`needs_source` 102，`over_attributed` 103，`stale` 35，`wrong_person` 1，`unclear` 2

这轮一直出现新补位的原因是 source 展示窗口按 `sourceRank` 取前 N 条，删掉前排错挂后，后排 `RawPoolItem` 会补进高优先级窗口。尾部污染高度集中在 `exa`，主要是同名/近名页面、空摘要、搜索结果页、目录/个人资料页、公司/团队页。后续应在 source fetch 阶段加入人物消歧和弱来源降权，不应只靠事后 prune。

## 阶段安排

### P0 Topic 一致性修复

状态：已完成。

输入：`queues.autoFixCandidates`

处理：删除不在 `topics` 中的 `topicRanks` 孤儿 key；将可映射的 `topicDetails.topic` 规范到现有 topic。

输出：`docs/audit-2026-06/data/topic_alignment_safe_apply_log.json`

验收：重跑 `node scripts/audit/audit_all_person_content.mjs` 后，`auto_fix_safe` 队列归零。

### P1 源污染复核

状态：高优先级可见 source 窗口已完成一轮闭环。

输入：`possible_polluted_raw_pool_item`、`source_item_belongs_to_person` 高优先级 fact claims。

处理：按 person + raw item 送模型做 `KEEP / PRUNE / REASSIGN / UNSURE` 判定。只允许高置信 `PRUNE` 自动执行，`REASSIGN` 必须产品确认。

输出：

- `docs/audit-2026-06/SOURCE_ITEM_SAFE_PRUNE_STATUS.md`
- `docs/audit-2026-06/data/source_item_safe_prune_status.json`
- `docs/audit-2026-06/data/fact_claims_source_items_after_ninth_safe_prune.jsonl`

验收：最终高优先级 source claims 1,428 条，MIMO 审查覆盖 1,428 条，未审补位 0 条。高置信外部内容错挂已按门禁安全删除 364 条；低置信、缺来源、过度归因、过时信息进入来源重抓 / 保守改写 / 人工复核队列。

### P1.5 事实 Claim 级回收与重抓

输入：

- `docs/audit-2026-06/data/fact_claim_review_aggregate_summary.json`
- `docs/audit-2026-06/data/fact_claim_error_causes.json`

处理：

- `remove` / `wrong_person`：默认进删除候选，不做模型改写。
- `over_attributed`：重新生成更保守口径，必须带 `personProductRole`；没有角色来源时降为组织级描述或移出代表成果。
- `stale`：重新获取 current source；无当前来源时结束历史 role 的 `now` 展示。
- `needs_source`：只补来源，不直接重写事实。

验收：

- 没有来源的 MIMO 建议不得直接写库。
- 任何新增/更新人物必须有 `sourceUrls`。
- 单个模型版本、API、SDK、商店、商业入口默认折叠到产品族，除非来源证明此人是该具体入口 owner。

### P1.6 Codex/Tibo 名册补洞

输入：`docs/audit-2026-06/codex_roster_source_pack.json`

输出：`docs/audit-2026-06/data/codex_roster_gaps_mimo.json`

当前结论：

- P0 add：Thibault Sottiaux，Codex engineering lead / Head of Codex @ OpenAI。
- P0 add：Alexander Embiricos，Product Lead, Codex @ OpenAI。
- P1 add：Ed Bayes，Codex Product Designer @ OpenAI。
- 已有记录仅在有 sourceUrls 时更新；Boris Power、Joanne Jang、Fidji Simo 当前仍是 needs_source，不自动改。

### P2 卡片污染与占位符

输入：`possible_polluted_card_content` 8 条，`placeholder_or_unknown_copy_in_card` 4 条。

处理：占位符可按规则删除或重写；污染卡片需要模型判断和人工抽检。

输出建议：`docs/audit-2026-06/data/card_cleanup_decisions.json`

产品确认：卡片删除影响前端展示，需要确认删除口径。

### P3 Current Title 与机构对齐

输入：`current_title_org_not_in_people_orgs`，alias 降噪后剩余 58 条。

处理：继续扩充 org alias；可确认同义名的自动补 `People.organization`，疑似 currentTitle 过期或错误的进入产品确认。

输出建议：`docs/audit-2026-06/data/org_alignment_result.json`

产品确认：currentTitle 来源错误、过时职位、教育经历误作当前职位。

### P4 whyImportant 补全

输入：`missing_or_thin_why_important`，当前 66 条。

处理：聚合 cards、roles、topics、products 生成 50-100 字贡献说明，保留来源名。先出草稿，不直接写库。

输出建议：`docs/audit-2026-06/data/why_important_drafts.json`

产品确认：外显文案语调和事实准确性，建议抽检后批量写入。

### P5 代表成果分类

输入：

- `product_row_is_specific_model_version`：43
- `product_row_is_api_or_sdk_channel`：12
- `product_row_may_belong_to_open_source_tab`：16
- `research_artifact_labeled_as_product`：10
- `opensource_topic_without_visible_signal`：23

处理：沿用“代表成果”口径，版本号/API 不直接当代表成果；开源和研究产物可保留，但需要归到合适分类。

产品确认：product / research / open source 的边界规则。

### P6 模糊履历角色

输入：`generic_low_confidence_role`，当前 18 条。

处理：模型生成候选角色名和证据；低置信不自动写库。

产品确认：角色中文标准用语。

## 未来防回流优先级

1. 新抓取或新导入后先复跑 prune/review export，确认 `reviewUnresolvedRows=0` / `dependencyRows=0` 没有回升。
2. 代表成果、卡片和官方链接只接受 source-backed 更新；`over_attributed` 继续走保守改写，`needs_source` 只补来源。
3. career、relation、org 新数据继续走 normalization / validation / boundary review，不让职位型机构、泛化 role、弱 relation 回流。
